import client from './client';
import { PaginationParams, PaginatedResponse } from './types';

export interface OrderFilters extends PaginationParams {
  status?: string;
  search?: string;
  dateDebut?: string;
  dateFin?: string;
  livreurId?: number | string;
}

export const ordersApi = {
  /**
   * Get paginated orders with filters
   */
  getOrders: (params: OrderFilters) =>
    client.get<PaginatedResponse<any>>('/api/admin/commandes', { params }),

  /**
   * Get a single order by ID
   */
  getOrder: (id: number | string) =>
    client.get(`/api/admin/commandes/${id}`),

  /**
   * Create a new order
   */
  createOrder: (data: any) =>
    client.post('/api/admin/commandes', data),

  /**
   * Update an existing order
   */
  updateOrder: (id: number | string, data: any) =>
    client.put(`/api/admin/commandes/${id}`, data),

  /**
   * Update order status.
   * For DELIVERED transitions that include a payment amount, pass
   * `paymentIdempotencyKey` — the server stores it on the Paiement record so
   * a retry after a network drop never creates a duplicate payment.
   */
  updateStatus: (
    id: number | string,
    data: { status: string; amount?: number; notesPaiement?: string; paymentIdempotencyKey?: string; [key: string]: any }
  ) => client.patch(`/api/commandes/${id}/status`, data),

  /**
   * Delete an order
   */
  deleteOrder: (id: number | string) =>
    client.delete(`/api/commandes/${id}`),

  /**
   * Assign a delivery driver to an order
   */
  assignDeliveryDriver: (id: number | string, deliveryDriverId: string | number, scheduledDeliveryDate?: string) =>
    client.patch(`/api/admin/commandes/${id}/delivery-driver`, { deliveryDriverId, scheduledDeliveryDate }),

  /**
   * Get order status history
   */
  getHistory: (id: number | string) =>
    client.get(`/api/commandes/${id}/history`),

  /**
   * Add images to an order
   */
  addImages: (id: number | string, imageUrls: string[], photoType: string) =>
    client.post(`/api/commandes/${id}/images`, { imageUrls, photoType }),

  /**
   * Get orders for map visualization
   */
  getOrdersForMap: (livreurId?: number | string) =>
    client.get('/api/admin/commandes/map', { params: { livreurId } }),

  // --- LIVREUR SPECIFIC ---

  getReadyDeliveries: () =>
    client.get('/api/livreur/commandes/ready-for-delivery'),

  getPendingPickups: () =>
    client.get('/api/livreur/commandes/pending-pickup'),

  getPastDeliveries: () =>
    client.get('/api/livreur/commandes/past-deliveries'),

  cancelDelivery: (id: number | string) =>
    client.put(`/api/livreur/commandes/${id}/cancel`),

  returnToWorkplace: (id: number | string) =>
    client.patch(`/api/livreur/commandes/${id}/return`),

  // --- RECEIPTS ---

  getOrderPdfUrl: (id: number | string) =>
    `${client.defaults.baseURL}/api/commandes/${id}/receipt/order/pdf`,

  getDeliveryPdfUrl: (id: number | string) =>
    `${client.defaults.baseURL}/api/commandes/${id}/receipt/delivery/pdf`,

  getOrderReceiptWhatsapp: (id: number | string) =>
    client.get(`/api/commandes/${id}/receipt/order/whatsapp`),

  getDeliveryReceiptWhatsapp: (id: number | string) =>
    client.get(`/api/commandes/${id}/receipt/delivery/whatsapp`),

  getDeliveryThermal: (id: number | string) =>
    client.get<string>(`/api/commandes/${id}/receipt/delivery/thermal`, {
      responseType: 'text',
    }),

  assignPickupDriver: (id: number | string, livreurId: string | number) =>
    client.put(`/api/admin/commandes/${id}`, { livreurId }),

  updateOrderItemsByDriver: (id: number | string, tapis: any[]) =>
    client.patch(`/api/livreur/commandes/${id}/items`, tapis),

  reportFailedAttempt: (
    orderId: number | string,
    data: {
      attemptType: 'PICKUP' | 'DELIVERY';
      reason: string;
      notes?: string | null;
      rescheduledTo?: string | null;
    }
  ) => client.post(`/api/commandes/${orderId}/failed-attempt`, data),
};

export default ordersApi;
