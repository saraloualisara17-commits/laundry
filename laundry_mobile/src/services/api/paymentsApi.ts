import client from './client';

export const paymentsApi = {
  /**
   * Get payment history for an order
   */
  getOrderPayments: (orderId: number | string) =>
    client.get(`/api/commandes/${orderId}/payments`),

  /**
   * Add a payment to an order
   */
  addPayment: (orderId: number | string, data: { amount: number; note?: string; modePaiement?: string }) =>
    client.post(`/api/commandes/${orderId}/payments`, data),

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
