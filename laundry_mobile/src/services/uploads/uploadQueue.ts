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
  errorMessage?: string;
  createdAt: number;
}

const UPLOAD_QUEUE_FILE = `${FileSystem.documentDirectory}upload_queue.json`;
const UPLOAD_QUEUE_TMP  = `${FileSystem.documentDirectory}upload_queue.json.tmp`;
const DEAD_TASK_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

class UploadQueue {
  private tasks: UploadTask[] = [];
  private isLoaded = false;

  private async load() {
    if (this.isLoaded) return;
    try {
      const info = await FileSystem.getInfoAsync(UPLOAD_QUEUE_FILE);
      if (info.exists) {
        const content = await FileSystem.readAsStringAsync(UPLOAD_QUEUE_FILE);
        const parsed: UploadTask[] = JSON.parse(content);
        // Purge failed tasks older than 7 days to avoid unbounded disk growth.
        const cutoff = Date.now() - DEAD_TASK_MAX_AGE_MS;
        this.tasks = parsed.filter((t) => t.status !== 'failed' || t.createdAt > cutoff);
      }
    } catch (e) {
      log.error('Load failed — archiving corrupt file', { err: String(e) });
      try {
        await FileSystem.moveAsync({
          from: UPLOAD_QUEUE_FILE,
          to: `${FileSystem.documentDirectory}upload_queue.corrupt.${Date.now()}.json`,
        });
      } catch {}
      this.tasks = [];
    }
    this.isLoaded = true;
  }

  private async save() {
    try {
      // Atomic write: write to .tmp then rename so a crash mid-write never
      // produces a corrupt queue file that locks uploads permanently.
      await FileSystem.writeAsStringAsync(UPLOAD_QUEUE_TMP, JSON.stringify(this.tasks));
      await FileSystem.moveAsync({ from: UPLOAD_QUEUE_TMP, to: UPLOAD_QUEUE_FILE });
    } catch (e) {
      log.error('Save failed', { err: String(e) });
    }
  }

  public async enqueue(task: Omit<UploadTask, 'id' | 'status' | 'progress' | 'attempts' | 'createdAt'>) {
    await this.load();
    const newTask: UploadTask = {
      ...task,
      id: Math.random().toString(36).substring(7),
      status: 'pending',
      progress: 0,
      attempts: 0,
      createdAt: Date.now(),
    };
    this.tasks.push(newTask);
    await this.save();
    return newTask;
  }

  public async updateTask(id: string, updates: Partial<UploadTask>) {
    await this.load();
    this.tasks = this.tasks.map(t => t.id === id ? { ...t, ...updates } : t);
    await this.save();
  }

  public async removeTask(id: string) {
    await this.load();
    this.tasks = this.tasks.filter(t => t.id !== id);
    await this.save();
  }

  public async getPendingTasks() {
    await this.load();
    return this.tasks.filter(t => t.status === 'pending' || t.status === 'failed');
  }

  public async getAllTasks() {
    await this.load();
    return [...this.tasks];
  }
}

export const uploadQueue = new UploadQueue();
