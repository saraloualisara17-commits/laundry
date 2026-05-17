import { offlineQueue } from './offlineQueue';
import { connectivity } from './connectivity';
import { TaskType, OfflineTask } from './types';

import { uploadManager } from '../uploads/uploadManager';

class SyncManager {
  private isSyncing = false;

  constructor() {
    connectivity.subscribe((state) => {
      if (state.isConnected && state.isInternetReachable) {
        this.sync();
      }
    });
  }

  public async sync() {
    if (this.isSyncing || !connectivity.isConnected) return;
    
    this.isSyncing = true;
    console.log('[SyncManager] Starting synchronization...');

    try {
      // Trigger background uploads as well
      uploadManager.processQueue();

      let task = await offlineQueue.peek();
      while (task) {
        const success = await this.processTask(task);
        if (success) {
          await offlineQueue.removeTask(task.id);
          task = await offlineQueue.peek();
        } else {
          // If task failed, we might want to retry later or move it to a dead letter queue
          // For now, let's stop sync to avoid infinite loops on failing tasks
          console.warn(`[SyncManager] Task ${task.id} failed, stopping sync.`);
          break;
        }
      }
    } catch (e) {
      console.error('[SyncManager] Sync failed', e);
    } finally {
      this.isSyncing = false;
      console.log('[SyncManager] Sync finished.');
    }
  }

  private async processTask(task: OfflineTask): Promise<boolean> {
    console.log(`[SyncManager] Processing task ${task.id} (${task.type})`);
    
    try {
      // Future implementation: Import specific API services and call them based on task.type
      // switch(task.type) {
      //   case TaskType.UPDATE_ORDER_STATUS:
      //     await ordersApi.updateStatus(task.payload.id, task.payload.data);
      //     break;
      //   ...
      // }
      
      // For now, we simulate success for the foundation
      return true;
    } catch (e) {
      console.error(`[SyncManager] Failed to process task ${task.id}`, e);
      return false;
    }
  }
}

export const syncManager = new SyncManager();
