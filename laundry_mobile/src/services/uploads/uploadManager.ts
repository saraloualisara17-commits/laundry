import { uploadQueue, UploadTask } from './uploadQueue';
import { compressImage, CompressionProfile } from './imageCompression';
import { uploadsApi, ordersApi } from '../api';
import { connectivity } from '../offline/connectivity';
import { logger } from '../../lib/logger';
import * as FileSystem from 'expo-file-system/legacy';

const log = logger.ns('upload');

// Maximum number of images uploading simultaneously.
// 3 is the sweet spot: saturates a typical mobile connection without
// overwhelming the Railway free-tier backend or causing OOM on older devices.
const MAX_CONCURRENT = 3;

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB source file hard limit

// ─── Progress tracking ────────────────────────────────────────────────────────

type ProgressListener = (done: number, total: number) => void;
const progressListeners = new Map<string, ProgressListener>();

// ─── Upload Manager ───────────────────────────────────────────────────────────

class UploadManager {
  private activeCount = 0;

  constructor() {
    connectivity.subscribe((state) => {
      if (state.isConnected && state.isInternetReachable) {
        this.processQueue();
      }
    });
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Compress + enqueue a single image for background upload.
   * Returns immediately after compression — upload happens in background.
   */
  public async addImage(
    uri: string,
    orderId: string | number,
    photoType: string,
    profile: CompressionProfile = 'standard',
  ): Promise<UploadTask> {
    // Reject oversized source files before wasting time compressing
    try {
      const info = await FileSystem.getInfoAsync(uri, { size: true });
      if (info.exists && (info as any).size > MAX_UPLOAD_BYTES) {
        throw new Error('Image exceeds the 10 MB size limit.');
      }
    } catch (e: any) {
      if (e.message?.includes('10 MB')) throw e;
    }

    const compressedUri = await compressImage(uri, profile);

    const task = await uploadQueue.enqueue({
      uri: compressedUri,
      originalUri: uri,
      orderId,
      photoType,
    });

    log.info('Queued', { taskId: task.id, orderId: String(orderId) });
    this.processQueue();
    return task;
  }

  /**
   * Compress + enqueue multiple images in parallel, then kick off uploads.
   * All compressions run simultaneously so the user waits for the slowest
   * one rather than the sum of all.
   */
  public async addImages(
    uris: string[],
    orderId: string | number,
    photoType: string,
    profile: CompressionProfile = 'standard',
    onProgress?: ProgressListener,
  ): Promise<UploadTask[]> {
    if (uris.length === 0) return [];

    // Register progress listener keyed by orderId+photoType
    const listenerKey = `${orderId}:${photoType}`;
    if (onProgress) progressListeners.set(listenerKey, onProgress);

    // Compress all in parallel — independent work, no reason to serialize
    const compressedUris = await Promise.all(
      uris.map(async (uri) => {
        try {
          const info = await FileSystem.getInfoAsync(uri, { size: true });
          if (info.exists && (info as any).size > MAX_UPLOAD_BYTES) {
            log.warn('Skipping oversized file', { uri });
            return null;
          }
        } catch { /* non-fatal */ }
        return compressImage(uri, profile);
      }),
    );

    // Enqueue valid results
    const tasks = await Promise.all(
      compressedUris
        .filter((u): u is string => u !== null)
        .map(async (compressedUri, i) =>
          uploadQueue.enqueue({
            uri: compressedUri,
            originalUri: uris[i],
            orderId,
            photoType,
          }),
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

    // Kick off up to MAX_CONCURRENT tasks simultaneously
    const slots = MAX_CONCURRENT - this.activeCount;
    if (slots <= 0) return;

    const batch = pending.slice(0, slots);
    batch.forEach(task => this.processTask(task));
  }

  private async processTask(task: UploadTask) {
    this.activeCount++;
    log.debug('Starting task', { id: task.id, orderId: String(task.orderId) });

    try {
      await uploadQueue.updateTask(task.id, {
        status: 'uploading',
        attempts: task.attempts + 1,
      });

      // Upload file to server
      const uploadRes = await uploadsApi.uploadFile({
        uri: task.uri,
        name: `order_${task.orderId}_${Date.now()}.jpg`,
        type: 'image/jpeg',
      });

      const imageUrl = uploadRes.data.imageUrl;

      // Attach URL to the order
      if (task.orderId) {
        await ordersApi.addImages(task.orderId, [imageUrl], task.photoType);
      }

      await uploadQueue.removeTask(task.id);
      log.info('Task done', { id: task.id });

      // Notify progress listeners
      this.notifyProgress(task);

    } catch (e: any) {
      log.error('Task failed', { id: task.id, err: e?.message });
      await uploadQueue.updateTask(task.id, {
        status: 'failed',
        errorMessage: e?.message ?? 'Upload failed',
      });

      if (task.attempts >= 5) {
        log.warn('Max attempts reached — dropping task', { id: task.id });
        await uploadQueue.removeTask(task.id);
      }
    } finally {
      this.activeCount = Math.max(0, this.activeCount - 1);
      // Drain remaining queue — a slot just freed up
      this.processQueue();
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
    const total = relevant.length;
    const done = relevant.filter(t => t.status === 'completed').length;
    listener(done, total);

    if (done >= total) progressListeners.delete(key);
  }
}

export const uploadManager = new UploadManager();
