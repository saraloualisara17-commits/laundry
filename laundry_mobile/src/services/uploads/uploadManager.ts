import { uploadQueue, UploadTask } from './uploadQueue';
import { compressImage } from './imageCompression';
import { uploadsApi, ordersApi } from '../api';
import { connectivity } from '../offline/connectivity';

class UploadManager {
  private isProcessing = false;

  constructor() {
    connectivity.subscribe((state) => {
      if (state.isConnected && state.isInternetReachable) {
        this.processQueue();
      }
    });
  }

  /**
   * Adds an image to the upload queue and starts processing
   */
  public async addImage(uri: string, orderId: string | number, photoType: string) {
    console.log(`[UploadManager] Adding image to queue for order ${orderId}`);
    
    // 1. Initial compression to save space in the queue/storage
    const compressedUri = await compressImage(uri);
    
    const task = await uploadQueue.enqueue({
      uri: compressedUri,
      originalUri: uri,
      orderId,
      photoType,
    });

    // 2. Start processing
    this.processQueue();
    
    return task;
  }

  /**
   * Processes all pending tasks in the queue
   */
  public async processQueue() {
    if (this.isProcessing || !connectivity.isConnected) return;

    this.isProcessing = true;
    console.log('[UploadManager] Processing queue...');

    try {
      const pendingTasks = await uploadQueue.getPendingTasks();
      
      for (const task of pendingTasks) {
        if (!connectivity.isConnected) break;
        await this.processTask(task);
      }
    } catch (e) {
      console.error('[UploadManager] Queue processing failed', e);
    } finally {
      this.isProcessing = false;
      console.log('[UploadManager] Finished processing queue.');
    }
  }

  private async processTask(task: UploadTask) {
    console.log(`[UploadManager] Processing task ${task.id} for order ${task.orderId}`);
    
    try {
      await uploadQueue.updateTask(task.id, { 
        status: 'uploading', 
        attempts: task.attempts + 1 
      });

      // 1. Upload to storage
      const uploadRes = await uploadsApi.uploadFile({
        uri: task.uri,
        name: `order_${task.orderId}_${Date.now()}.jpg`,
        type: 'image/jpeg',
      });

      const imageUrl = uploadRes.data;

      // 2. Link to order
      if (task.orderId) {
        await ordersApi.addImages(task.orderId, [imageUrl], task.photoType);
      }

      // 3. Mark as completed and remove from queue
      await uploadQueue.removeTask(task.id);
      console.log(`[UploadManager] Successfully uploaded task ${task.id}`);
      
    } catch (e: any) {
      console.error(`[UploadManager] Task ${task.id} failed`, e);
      
      const errorMessage = e.message || 'Upload failed';
      await uploadQueue.updateTask(task.id, { 
        status: 'failed',
        errorMessage 
      });

      // If we've tried too many times (e.g., 5), we might want to stop retrying automatically
      if (task.attempts >= 5) {
        console.warn(`[UploadManager] Task ${task.id} reached max attempts.`);
      }
    }
  }
}

export const uploadManager = new UploadManager();
