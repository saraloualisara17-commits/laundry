import client from './client';

export const auditApi = {
  /**
   * Get audit logs for a specific entity
   */
  getLogs: (entityType: string, entityId: number | string) =>
    client.get(`/api/admin/audit/${entityType}/${entityId}`),

  /**
   * Get recent system-wide audit logs
   */
  getRecentLogs: (limit: number = 20) =>
    client.get('/api/admin/audit/recent', { params: { limit } }),
};

export default auditApi;
