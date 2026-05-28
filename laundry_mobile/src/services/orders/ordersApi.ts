import api from '../shared/api';
import { buildQueryParams } from '../shared/queryHelpers';
import { 
  AdminOrdersResponseDTO, 
  OrderDetails, 
  OrderFilters, 
  UpdateStatusRequest,
  OrderDTO
} from './ordersTypes';

export const ordersApi = {
  /**
   * Get all orders with filtering and pagination.
   * Path: /api/admin/commandes
   */
  getOrders: (filters: OrderFilters) => {
    const params = buildQueryParams(filters);
    return api.get<AdminOrdersResponseDTO>('/api/admin/commandes', { params });
  },

  /**
   * Get recent orders for dashboard.
   */
  getRecentOrders: (limit: number = 5) => 
    api.get<AdminOrdersResponseDTO>('/api/admin/commandes', { 
      params: { size: limit, sort: 'recent' } 
    }),

  /**
   * Get a single order by ID.
   * Path: /api/commandes/{id}
   */
  getOrder: (id: number | string) => 
    api.get<OrderDetails>(`/api/commandes/${id}`),

  /**
   * Update order status and record payment if needed.
   * Path: /api/commandes/{id}/status
   */
  updateStatus: (id: number | string, data: UpdateStatusRequest) => 
    api.patch<OrderDTO>(`/api/commandes/${id}/status`, data),

  /**
   * Delete an order (restricted to ADMIN).
   * Path: /api/admin/commandes/{id}
   */
  deleteOrder: (id: number | string) => 
    api.delete(`/api/admin/commandes/${id}`),

  /**
   * Assign a delivery driver to an order.
   */
  assignDeliveryDriver: (id: number | string, deliveryDriverId: number | string) => 
    api.patch(`/api/admin/commandes/${id}/delivery-driver`, { deliveryDriverId }),

  /**
   * Get order payment history.
   */
  getPayments: (id: number | string) => 
    api.get(`/api/commandes/${id}/payments`),

  /**
   * Add a manual payment to an order.
   */
  addPayment: (id: number | string, paymentData: { montant: number; note?: string; modePaiement?: string }) => 
    api.post(`/api/commandes/${id}/payments`, paymentData),

  /**
   * Get order status history (audit trail).
   */
  getHistory: (id: number | string) => 
    api.get(`/api/commandes/${id}/history`),

  /**
   * Add images to an order.
   */
  addImages: (id: number | string, imageUrls: string[], photoType: string) => 
    api.post(`/api/commandes/${id}/images`, { imageUrls, photoType }),

  /**
   * Get orders for map visualization.
   */
  getOrdersForMap: () => 
    api.get('/api/admin/commandes/map'),

  /**
   * Create a new order.
   * Path: /api/admin/commandes
   */
  createOrder: (data: any) => 
    api.post('/api/admin/commandes', data),

  /**
   * Update an existing order.
   * Path: /api/admin/commandes/{id}
   */
  updateOrder: (id: number | string, data: any) => 
    api.put(`/api/admin/commandes/${id}`, data),

  /**
   * Upload multiple files (images).
   * Path: /api/upload/multiple
   */
  uploadFiles: (files: any[]) => {
    const formData = new FormData();
    files.forEach((file: any) => {
      formData.append('files', {
        uri: file.uri,
        name: file.name || 'image.jpg',
        type: file.type || 'image/jpeg',
      } as any);
    });
    return api.post('/api/upload/multiple', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // --- RECEIPTS & PDF ---

  /**
   * Get the absolute URL for the order PDF receipt.
   */
  getOrderPdfUrl: (id: number | string, lang: 'fr' | 'ar' = 'fr') =>
    `${api.defaults.baseURL}/api/commandes/${id}/receipt/order/pdf?lang=${lang}`,

  /**
   * Get the absolute URL for the delivery PDF receipt.
   */
  getDeliveryPdfUrl: (id: number | string, lang: 'fr' | 'ar' = 'fr') =>
    `${api.defaults.baseURL}/api/commandes/${id}/receipt/delivery/pdf?lang=${lang}`,

  /**
   * Send order receipt via WhatsApp (or get content).
   */
  getOrderReceipt: (id: number | string) =>
    api.get(`/api/commandes/${id}/receipt/order/whatsapp`),

  /**
   * Send delivery receipt via WhatsApp (or get content).
   */
  getDeliveryReceipt: (id: number | string) =>
    api.get(`/api/commandes/${id}/receipt/delivery/whatsapp`),

  // --- LIVREUR ENDPOINTS ---

  /**
   * Get orders ready for delivery for the current driver.
   */
  getReadyDeliveries: () => 
    api.get<OrderDTO[]>('/api/livreur/commandes/ready-for-delivery'),

  /**
   * Get orders pending pickup for the current driver.
   */
  getPendingPickups: () => 
    api.get<OrderDTO[]>('/api/livreur/commandes/pending-pickup'),

  /**
   * Get cancelled deliveries history for the current driver.
   */
  getCanceledDeliveries: () => 
    api.get<OrderDTO[]>('/api/livreur/commandes/canceled-deliveries'),

  /**
   * Cancel a delivery (Livreur role).
   */
  cancelDelivery: (id: number | string) => 
    api.put(`/api/livreur/commandes/${id}/cancel`),

  /**
   * Return an order to the workshop (Livreur role).
   */
  returnToWorkplace: (id: number | string) => 
    api.patch(`/api/livreur/commandes/${id}/return`),

  /**
   * Get available payment types.
   */
  getPaymentTypes: () => 
    api.get('/api/livreur/payment-types'),
};

export default ordersApi;
