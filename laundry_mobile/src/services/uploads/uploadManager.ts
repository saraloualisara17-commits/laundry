import { uploadQueue, UploadTask } from './uploadQueue';
import { compressImage, CompressionProfile } from './imageCompression';
import { uploadsApi, ordersApi } from '../api';
import { connectivity } from '../offline/connectivity';
import { logger } from '../../lib/logger';
import * as FileSystem from 'expo-file-system/legacy';

const log = logger.ns('upload');

// 3 simultaneous uploads: saturates a typical 4G connection without OOM on
// mid-range devices. Railway free tier handles 3 concurrent multipart requests
// comfortably. Do not raise above 4 without load testing.
const MAX_CONCURRENT = 3;

// Hard reject source files above this size before compression runs.
// Compressing a 30 MB RAW export would spike JS-thread memory badly.
const MAX_SOURCE_BYTES = 10 * 1024 * 1024; // 10 MB

// If a task has been 'uploading' for longer than this, it is considered stalled
// (network dropped mid-stream, Axios timeout didn't fire). Reset to 'pending'.
const STALL_TIMEOUT_MS = 90_000; // 90 seconds

// ─── Progress tracking ────────────────────────────────────────────────────────

type ProgressListener = (done: number, total: number) => void;
const progressListeners = new Map<string, ProgressListener>();

// ─── Upload Manager ───────────────────────────────────────────────────────────

class UploadManager {
  private activeCount = 0;
  // Track when each task started uploading — for stall detection
  private uploadStartTimes = new Map<string, number>();

  constructor() {
    // Drain queue whenever connectivity is restored
    connectivity.subscribe((state) => {
      if (state.isConnected && state.isInternetReachable) {
        this.recoverStalledTasks().then(() => this.processQueue());
      }
    });
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Compress + enqueue a single image. Returns immediately — upload is async.
   */
  public async addImage(
    uri: string,
    orderId: string | number,
    photoType: string,
    profile: CompressionProfile = 'standard',
  ): Promise<UploadTask> {
    await this.validateSourceSize(uri);
    const compressedUri = await compressImage(uri, profile);
    const task = await uploadQueue.enqueue({ uri: compressedUri, originalUri: uri, orderId, photoType });
    log.info('Queued', { taskId: task.id, orderId: String(orderId) });
    this.processQueue();
    return task;
  }

  /**
   * Compress + enqueue multiple images in parallel, then kick off uploads.
   * All compressions run simultaneously — total wait is max(t), not sum(t).
   */
  public async addImages(
    uris: string[],
    orderId: string | number,
    photoType: string,
    profile: CompressionProfile = 'standard',
    onProgress?: ProgressListener,
  ): Promise<UploadTask[]> {
    if (uris.length === 0) return [];

    const key = `${orderId}:${photoType}`;
    if (onProgress) progressListeners.set(key, onProgress);

    const compressedUris = await Promise.all(
      uris.map(async (uri) => {
        try {
          await this.validateSourceSize(uri);
        } catch {
          log.warn('Skipping oversized file', { uri });
          return null;
        }
        return compressImage(uri, profile);
      }),
    );

    const tasks = await Promise.all(
      compressedUris
        .filter((u): u is string => u !== null)
        .map((compressedUri, i) =>
          uploadQueue.enqueue({ uri: compressedUri, originalUri: uris[i], orderId, photoType }),
        ),
    );

    log.info('Queued batch', { count: tasks.length, orderId: String(orderId) });
    this.processQueue();
    return tasks;
  }

  public get active() {
    return this.activeCount > 0;
  }

  // ── Queue Processing ───────────────────────────────────────────────────────

  public async processQueue() {
    if (!connectivity.isConnected) return;

    const pending = await uploadQueue.getPendingTasks();
    if (pending.length === 0) return;

    const slots = MAX_CONCURRENT - this.activeCount;
    if (slots <= 0) return;

    pending.slice(0, slots).forEach(task => this.processTask(task));
  }

  /**
   * Reset tasks that have been stuck in 'uploading' state beyond STALL_TIMEOUT_MS.
   * This happens when the app is backgrounded mid-upload or the socket closes
   * without an error event (common on weak 3G).
   */
  private async recoverStalledTasks() {
    const all = await uploadQueue.getAllTasks();
    const now = Date.now();
    for (const task of all) {
      if (task.status !== 'uploading') continue;
      const startedAt = this.uploadStartTimes.get(task.id);
      const elapsed = startedAt ? now - startedAt : STALL_TIMEOUT_MS + 1;
      if (elapsed > STALL_TIMEOUT_MS) {
        log.warn('Recovering stalled task', { id: task.id });
        this.uploadStartTimes.delete(task.id);
        await uploadQueue.updateTask(task.id, {
          status: 'pending',
          nextRetryAt: computeNextRetryAt(task.attempts),
        });
      }
    }
  }

  // ── Task Execution ─────────────────────────────────────────────────────────

  private async processTask(task: UploadTask) {
    this.activeCount++;
    this.uploadStartTimes.set(task.id, Date.now());
    log.debug('Starting task', { id: task.id, orderId: String(task.orderId) });

    await uploadQueue.updateTask(task.id, {
      status: 'uploading',
      attempts: task.attempts + 1,
    });

    try {
      const uploadRes = await uploadsApi.uploadFile({
        uri: task.uri,
        name: `order_${task.orderId}_${Date.now()}.${task.uri.endsWith('.webp') ? 'webp' : 'jpg'}`,
        type: task.uri.endsWith('.webp') ? 'image/webp' : 'image/jpeg',
      });

      const imageUrl = uploadRes.data.imageUrl;

      if (task.orderId) {
        await ordersApi.addImages(task.orderId, [imageUrl], task.photoType);
      }

      await uploadQueue.removeTask(task.id);
      this.uploadStartTimes.delete(task.id);
      log.info('Task done', { id: task.id });
      this.notifyProgress(task);

    } catch (e: any) {
      this.uploadStartTimes.delete(task.id);
      const updatedAttempts = task.attempts + 1;
      log.error('Task failed', { id: task.id, attempt: updatedAttempts, err: e?.message });

      if (updatedAttempts >= MAX_ATTEMPTS) {
        log.warn('Max attempts reached — dropping task', { id: task.id });
        await uploadQueue.removeTask(task.id);
      } else {
        const retryAt = computeNextRetryAt(updatedAttempts);
        log.info('Will retry', { id: task.id, inMs: retryAt - Date.now() });
        await uploadQueue.updateTask(task.id, {
          status: 'failed',
          errorMessage: e?.message ?? 'Upload failed',
          nextRetryAt: retryAt,
        });
      }
    } finally {
      this.activeCount = Math.max(0, this.activeCount - 1);
      // A slot just freed — drain remaining queue immediately
      this.processQueue();
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async validateSourceSize(uri: string) {
    try {
      const info = await FileSystem.getInfoAsync(uri, { size: true });
      if (info.exists && (info as any).size > MAX_SOURCE_BYTES) {
        throw new Error('Image exceeds the 10 MB size limit.');
      }
    } catch (e: any) {
      if (e.message?.includes('10 MB')) throw e;
    }
  }

  private async notifyProgress(completedTask: UploadTask) {
    const key = `${completedTask.orderId}:${completedTask.photoType}`;
    const listener = progressListeners.get(key);
    if (!listener) return;

    const all = await uploadQueue.getAllTasks();
    const relevant = all.filter(
      t => t.orderId === completedTask.orderId && t.photoType === completedTask.photoType,
    );
    const done = relevant.filter(t => t.status === 'completed').length;
    listener(done, relevant.length);
    if (done >= relevant.length) progressListeners.delete(key);
  }
}

// Backoff table — duplicated here to avoid a circular import between manager→queue→manager.
// Keep in sync with RETRY_DELAYS in uploadQueue.ts.
const RETRY_DELAYS_MS = [0, 5_000, 30_000, 120_000, 600_000];
const MAX_ATTEMPTS = RETRY_DELAYS_MS.length;

function computeNextRetryAt(attempts: number): number {
  const idx = Math.min(attempts, RETRY_DELAYS_MS.length - 1);
  return Date.now() + RETRY_DELAYS_MS[idx];
}

export const uploadManager = new UploadManager();
