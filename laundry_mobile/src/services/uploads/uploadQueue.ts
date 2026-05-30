import * as FileSystem from 'expo-file-system/legacy';
import { logger } from '../../lib/logger';

const log = logger.ns('upload-queue');

export type UploadStatus = 'pending' | 'uploading' | 'completed' | 'failed';

export interface UploadTask {
  id: string;
  uri: string;
  originalUri: string;
  orderId?: string | number;
  photoType: string;
  status: UploadStatus;
  progress: number;
  attempts: number;
  nextRetryAt: number;   // epoch ms — task is not eligible until this time passes
  errorMessage?: string;
  createdAt: number;
}

// documentDirectory is guaranteed non-null after app launch, but typed as
// string | null — fall back to a safe no-op path so writes fail gracefully.
const _rawDir    = FileSystem.documentDirectory ?? '';
const DOC_DIR    = _rawDir.endsWith('/') ? _rawDir : _rawDir ? `${_rawDir}/` : '';
const QUEUE_FILE = `${DOC_DIR}upload_queue.json`;
const DEAD_TASK_AGE  = 7 * 24 * 60 * 60 * 1000; // 7 days — stale task cleanup

// Exponential backoff schedule (ms). Index = attempt number (0-based).
// attempt 0 → immediate
// attempt 1 → 5s
// attempt 2 → 30s
// attempt 3 → 2m
// attempt 4 → 10m  (then dropped)
const RETRY_DELAYS = [0, 5_000, 30_000, 120_000, 600_000];
const MAX_ATTEMPTS = RETRY_DELAYS.length; // 5 total attempts, then drop

// ─── ID generation ───────────────────────────────────────────────────────────
// Math.random() produces ~10^9 values — real collision risk in a persistent
// queue. Use timestamp + random suffix: collision probability < 1 in 10^15.
function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

// ─── Queue ───────────────────────────────────────────────────────────────────

class UploadQueue {
  private tasks: UploadTask[] = [];
  private isLoaded = false;

  private async load() {
    if (this.isLoaded) return;
    try {
      const info = await FileSystem.getInfoAsync(QUEUE_FILE);
      if (info.exists) {
        const content = await FileSystem.readAsStringAsync(QUEUE_FILE);
        const parsed: UploadTask[] = JSON.parse(content);
        const cutoff = Date.now() - DEAD_TASK_AGE;
        // Purge dead tasks and re-arm any tasks stuck in 'uploading' from a
        // previous session (app was killed mid-upload — reset them to 'pending')
        this.tasks = parsed
          .filter(t => t.status !== 'failed' || t.createdAt > cutoff)
          .map(t => t.status === 'uploading' ? { ...t, status: 'pending' as UploadStatus } : t);
      }
    } catch (e) {
      log.error('Load failed — archiving corrupt file', { err: String(e) });
      try {
        await FileSystem.moveAsync({
          from: QUEUE_FILE,
          to: `${DOC_DIR}upload_queue.corrupt.${Date.now()}.json`,
        });
      } catch {}
      this.tasks = [];
    }
    this.isLoaded = true;
  }

  private async save() {
    if (!DOC_DIR) return;
    try {
      // writeAsStringAsync is atomic on both iOS and Android (O_WRONLY|O_CREAT|O_TRUNC)
      // so a direct write is safe — no .tmp rename needed, and avoids the Android
      // FileSystem.moveAsync bug where a missing destination is treated as a directory.
      await FileSystem.writeAsStringAsync(QUEUE_FILE, JSON.stringify(this.tasks));
    } catch (e) {
      log.error('Save failed', { err: String(e) });
    }
  }

  public async enqueue(
    task: Omit<UploadTask, 'id' | 'status' | 'progress' | 'attempts' | 'nextRetryAt' | 'createdAt'>,
  ): Promise<UploadTask> {
    await this.load();

    // Deduplication: if an identical (orderId + photoType + originalUri) task is
    // already pending or uploading, don't enqueue a duplicate. This guards
    // against the user tapping a button twice quickly.
    const isDuplicate = this.tasks.some(
      t =>
        t.originalUri === task.originalUri &&
        t.orderId === task.orderId &&
        t.photoType === task.photoType &&
        (t.status === 'pending' || t.status === 'uploading'),
    );
    if (isDuplicate) {
      log.warn('Skipping duplicate task', { orderId: String(task.orderId) });
      return this.tasks.find(
        t => t.originalUri === task.originalUri && t.orderId === task.orderId,
      )!;
    }

    const newTask: UploadTask = {
      ...task,
      id: generateId(),
      status: 'pending',
      progress: 0,
      attempts: 0,
      nextRetryAt: 0,   // eligible immediately
      createdAt: Date.now(),
    };
    this.tasks.push(newTask);
    await this.save();
    return newTask;
  }

  public async updateTask(id: string, updates: Partial<UploadTask>) {
    await this.load();
    this.tasks = this.tasks.map(t => (t.id === id ? { ...t, ...updates } : t));
    await this.save();
  }

  public async removeTask(id: string) {
    await this.load();
    this.tasks = this.tasks.filter(t => t.id !== id);
    await this.save();
  }

  /**
   * Returns tasks that are eligible to run right now.
   * A failed task with a future `nextRetryAt` is NOT returned until that
   * time has passed — this enforces exponential backoff without a timer.
   */
  public async getPendingTasks(): Promise<UploadTask[]> {
    await this.load();
    const now = Date.now();
    return this.tasks.filter(
      t => (t.status === 'pending' || t.status === 'failed') && t.nextRetryAt <= now,
    );
  }

  public async getAllTasks(): Promise<UploadTask[]> {
    await this.load();
    return [...this.tasks];
  }

}

export const uploadQueue = new UploadQueue();
