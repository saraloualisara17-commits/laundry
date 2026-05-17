import * as FileSystem from 'expo-file-system';
import { OfflineTask } from './types';

const QUEUE_FILE = `${FileSystem.documentDirectory}offline_queue.json`;

class OfflineQueue {
  private queue: OfflineTask[] = [];
  private isLoaded: boolean = false;

  public async load() {
    if (this.isLoaded) return;
    try {
      const info = await FileSystem.getInfoAsync(QUEUE_FILE);
      if (info.exists) {
        const content = await FileSystem.readAsStringAsync(QUEUE_FILE);
        this.queue = JSON.parse(content);
      }
    } catch (e) {
      console.error('Failed to load offline queue', e);
      this.queue = [];
    }
    this.isLoaded = true;
  }

  public async save() {
    try {
      await FileSystem.writeAsStringAsync(QUEUE_FILE, JSON.stringify(this.queue));
    } catch (e) {
      console.error('Failed to save offline queue', e);
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
