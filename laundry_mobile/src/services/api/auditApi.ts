import client from './client';

export const auditApi = {
  getLogs: (entityType: string, entityId: number | string, page = 0, size = 50) =>
    client.get(`/api/admin/audit/${entityType}/${entityId}`, { params: { page, size } }),

  getRecentLogs: (page = 0, size = 50) =>
    client.get('/api/admin/audit/recent', { params: { page, size } }),

  getOrderTimeline: (orderId: number | string) =>
    client.get<TimelineEntry[]>(`/api/admin/audit/order/${orderId}/timeline`),
};

export interface TimelineEntry {
  type: 'STATUS_CHANGE' | 'PAYMENT' | 'ATTEMPT_FAILED' | 'AUDIT';
  timestamp: string;
  actor: string;
  description: string;
  commentaire?: string;
  note?: string;
  notes?: string;
  previousValue?: string;
  newValue?: string;
  metadata?: string;
}

export interface AuditLogEntry {
  id: number;
  actionType: string;
  entityType: string;
  entityId: number;
  previousValue?: string;
  newValue?: string;
  metadata?: string;
  userName?: string;
  timestamp: string;
  ipAddress?: string;
  requestId?: string;
}

export default auditApi;
