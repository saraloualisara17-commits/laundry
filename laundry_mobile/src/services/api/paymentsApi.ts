import client from './client';

export const paymentsApi = {
  /**
   * Get payment history for an order
   */
  getOrderPayments: (orderId: number | string) =>
    client.get(`/api/commandes/${orderId}/payments`),

  /**
   * Add a payment to an order.
   * idempotencyKey must be a per-attempt UUID — the server deduplicates on it
   * so a network retry never creates a second payment record.
   */
  addPayment: (
    orderId: number | string,
    data: { amount: number; note?: string; modePaiement?: string; idempotencyKey?: string }
  ) => client.post(`/api/commandes/${orderId}/payments`, data),

  /**
   * Get overall unpaid debt overview
   */
  getUnpaidOverview: () =>
    client.get('/api/admin/unpaid/overview'),

  /**
   * Get list of clients with outstanding debt
   */
  getClientDebtList: () =>
    client.get('/api/admin/unpaid/clients'),
};

export default paymentsApi;
