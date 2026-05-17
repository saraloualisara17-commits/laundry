import * as FileSystem from 'expo-file-system';

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

class UploadQueue {
  private tasks: UploadTask[] = [];
  private isLoaded = false;

  private async load() {
    if (this.isLoaded) return;
    try {
      const info = await FileSystem.getInfoAsync(UPLOAD_QUEUE_FILE);
      if (info.exists) {
        const content = await FileSystem.readAsStringAsync(UPLOAD_QUEUE_FILE);
        this.tasks = JSON.parse(content);
      }
    } catch (e) {
      console.error('[UploadQueue] Load failed', e);
      this.tasks = [];
    }
    this.isLoaded = true;
  }

  private async save() {
    try {
      await FileSystem.writeAsStringAsync(UPLOAD_QUEUE_FILE, JSON.stringify(this.tasks));
    } catch (e) {
      console.error('[UploadQueue] Save failed', e);
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
