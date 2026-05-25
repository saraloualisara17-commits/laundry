import * as FileSystem from 'expo-file-system/legacy';
import { OfflineTask } from './types';
import { logger } from '../../lib/logger';

const log = logger.ns('offline-queue');

const QUEUE_FILE = `${FileSystem.documentDirectory}offline_queue.json`;
const QUEUE_TMP  = `${FileSystem.documentDirectory}offline_queue.json.tmp`;
const DEAD_LETTER_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

class OfflineQueue {
  private queue: OfflineTask[] = [];
  private isLoaded: boolean = false;

  public async load() {
    if (this.isLoaded) return;
    try {
      const info = await FileSystem.getInfoAsync(QUEUE_FILE);
      if (info.exists) {
        const content = await FileSystem.readAsStringAsync(QUEUE_FILE);
        const parsed: OfflineTask[] = JSON.parse(content);
        // Purge tasks that have been dead-lettered (max attempts reached) for
        // more than 7 days — prevents indefinite disk accumulation.
        const cutoff = Date.now() - DEAD_LETTER_MAX_AGE_MS;
        this.queue = parsed.filter(
          (t) => !t.metadata?.timestamp || t.metadata.timestamp > cutoff || (t.metadata?.attempts ?? 0) < 3
        );
      }
    } catch (e) {
      // Corrupt file — archive it and start with an empty queue rather than
      // leaving the system permanently broken.
      log.error('Failed to load offline queue — archiving corrupt file', { err: String(e) });
      try {
        await FileSystem.moveAsync({
          from: QUEUE_FILE,
          to: `${FileSystem.documentDirectory}offline_queue.corrupt.${Date.now()}.json`,
        });
      } catch {}
      this.queue = [];
    }
    this.isLoaded = true;
  }

  public async save() {
    try {
      const serialized = JSON.stringify(this.queue);
      await FileSystem.writeAsStringAsync(QUEUE_TMP, serialized);

      // Verify the tmp file was written completely before replacing the live
      // file. On Android API 26-28, moveAsync can succeed but leave a
      // zero-byte destination when storage is nearly full — the read-back
      // catches this before we destroy the original queue file.
      const written = await FileSystem.readAsStringAsync(QUEUE_TMP);
      if (!written || written.length !== serialized.length) {
        log.error('Offline queue tmp write verification failed — keeping existing queue file');
        try { await FileSystem.deleteAsync(QUEUE_TMP, { idempotent: true }); } catch {}
        return;
      }

      await FileSystem.moveAsync({ from: QUEUE_TMP, to: QUEUE_FILE });
    } catch (e) {
      log.error('Failed to save offline queue', { err: String(e) });
    }
  }

  public async enqueue(task: Omit<OfflineTask, 'id'>) {
    await this.load();
    const newTask: OfflineTask = {
      ...task,
      id: Math.random().toString(36).substring(7),
    };
    this.queue.push(newTask);
    await this.save();
    return newTask;
  }

  public async dequeue() {
    await this.load();
    const task = this.queue.shift();
    await this.save();
    return task;
  }

  public async peek() {
    await this.load();
    return this.queue[0];
  }

  public async clear() {
    this.queue = [];
    await this.save();
  }

  public get length() {
    return this.queue.length;
  }

  public async getAll() {
    await this.load();
    return [...this.queue];
  }

  public async removeTask(id: string) {
    await this.load();
    this.queue = this.queue.filter(t => t.id !== id);
    await this.save();
  }
}

export const offlineQueue = new OfflineQueue();
