/**
 * SyncManager — drains the offline queue when connectivity is restored.
 *
 * Queue execution rules:
 *  - Tasks execute in FIFO order (preserves causal ordering: create before pay).
 *  - If a task fails it is moved to the back of the queue (round-robin retry)
 *    so subsequent independent tasks are not blocked.
 *  - After MAX_ATTEMPTS failures the task is dropped (dead-letter) so the queue
 *    never grows forever.
 *  - All mutable operations carry an idempotencyKey in their payload so that
 *    replaying a task after a transient server-side failure is safe.
 */

import { offlineQueue } from './offlineQueue';
import { connectivity } from './connectivity';
import { TaskType, OfflineTask } from './types';
import { uploadManager } from '../uploads/uploadManager';
import { logger } from '../../lib/logger';

const MAX_ATTEMPTS = 3;

// API imports are lazy (inside processTask) to avoid circular deps.
// The modules are small so the dynamic require cost is negligible.

class SyncManager {
  private isSyncing = false;
  private unsubscribe: (() => void) | null = null;

  public start() {
    this.unsubscribe = connectivity.subscribe((state) => {
      if (state.isConnected && state.isInternetReachable) {
        this.sync();
      }
    });
  }

  public stop() {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  public async sync() {
    if (this.isSyncing || !connectivity.isConnected) return;

    this.isSyncing = true;
    logger.sync.info('Sync started');

    // Track tasks seen in this session to avoid re-processing requeued failures
    // in the same run (prevents an infinite loop if every task fails).
    const seenIds = new Set<string>();

    try {
      // Start upload drain first. If there are pending uploads they must complete
      // before we process API tasks that may depend on the uploaded URLs
      // (e.g. POST /commandes/{id}/images queued offline right after an upload).
      await uploadManager.processQueue();

      // Bail if an upload is still in progress (processQueue returned while
      // isProcessing was already true — another drain was already running).
      if (uploadManager.active) {
        logger.sync.info('Upload in progress — deferring queue drain');
        this.isSyncing = false;
        return;
      }

      let task = await offlineQueue.peek();

      while (task && !seenIds.has(task.id)) {
        seenIds.add(task.id);
        const success = await this.processTask(task);

        if (success) {
          await offlineQueue.removeTask(task.id);
          logger.sync.info('Task completed', { id: task.id, type: task.type });
        } else {
          const attempts = (task.metadata?.attempts ?? 0) + 1;
          await offlineQueue.removeTask(task.id);

          if (attempts >= MAX_ATTEMPTS) {
            logger.sync.error('Task exceeded max attempts — dropping', { id: task.id, type: task.type });
          } else {
            // Move to the back of the queue so independent tasks can still run.
            // enqueue() assigns a new ID, so we omit the old one.
            await offlineQueue.enqueue({
              type: task.type,
              payload: task.payload,
              metadata: { ...(task.metadata ?? { timestamp: Date.now(), attempts: 0 }), attempts },
            });
            logger.sync.warn('Task failed, moved to back of queue', { id: task.id, attempts });
          }
        }

        task = await offlineQueue.peek();
      }
    } catch (e) {
      logger.sync.error('Sync crashed', { err: String(e) });
    } finally {
      this.isSyncing = false;
      logger.sync.info('Sync finished');
    }
  }

  private async processTask(task: OfflineTask): Promise<boolean> {
    logger.sync.debug('Processing task', { id: task.id, type: task.type });

    try {
      switch (task.type) {
        case TaskType.UPDATE_ORDER_STATUS: {
          const { ordersApi } = require('../api/ordersApi');
          await ordersApi.updateStatus(task.payload.id, task.payload.data);
          break;
        }

        case TaskType.RECORD_PAYMENT: {
          const { adminApi } = require('../adminApi');
          await adminApi.addOrderPayment(
            String(task.payload.id),
            task.payload.amount,
            task.payload.note,
            task.payload.modePaiement,
            task.payload.idempotencyKey
          );
          break;
        }

        case TaskType.DELIVERY_CONFIRMATION: {
          const { ordersApi } = require('../api/ordersApi');
          await ordersApi.updateStatus(task.payload.orderId, {
            status: task.payload.status,
            amount: task.payload.amount,
            notesPaiement: task.payload.notesPaiement,
            paymentIdempotencyKey: task.payload.paymentIdempotencyKey,
          });
          break;
        }

        case TaskType.CREATE_CLIENT: {
          const { adminApi } = require('../adminApi');
          await adminApi.createClient(task.payload.data);
          break;
        }

        case TaskType.UPLOAD_IMAGE:
          // Handled by uploadManager.processQueue() above — no-op here
          break;

        default:
          logger.sync.warn('Unknown task type — skipping', { type: task.type });
      }

      return true;
    } catch (e) {
      logger.sync.error('Task failed', { id: task.id, err: String(e) });
      return false;
    }
  }
}

export const syncManager = new SyncManager();
