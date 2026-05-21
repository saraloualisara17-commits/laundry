import { 
  ordersApi, 
  clientsApi, 
  catalogApi, 
  driversApi, 
  paymentsApi, 
  uploadsApi,
  statisticsApi,
  authApi,
  usersApi,
  analyticsApi
} from './api';

/**
 * BACKWARD COMPATIBILITY LAYER
 * This object maintains the existing API surface while delegating 
 * to the new modernized service architecture.
 */
export const adminApi = {
  // Dashboard & Stats
  getStats: () => statisticsApi.getTodayStats(),
  getStatusOverview: () => statisticsApi.getStatusOverview(),
  getRecentOrders: () => ordersApi.getOrders({ limit: 5, sort: 'recent' }),
  getOrdersForMap: (livreurId?: number | string) => ordersApi.getOrdersForMap(livreurId),

  // Orders
  getOrders: (params: any) => ordersApi.getOrders(params),
  getOrder: (id: number | string) => ordersApi.getOrder(id),
  deleteOrder: (id: number | string) => ordersApi.deleteOrder(id),
  updateOrderStatus: (id: number | string, status: string, paymentData?: any) => 
    ordersApi.updateStatus(id, { status, ...paymentData }),
  assignDeliveryDriver: (id: number | string, driverId: string | number, scheduledDeliveryDate?: string) =>
    ordersApi.assignDeliveryDriver(id, driverId, scheduledDeliveryDate),
  getOrderPayments: (id: number | string) => paymentsApi.getOrderPayments(id),
  addOrderPayment: (id: number | string, amount: number, note?: string) => 
    paymentsApi.addPayment(id, { amount, note }),
  getOrderHistory: (id: number | string) => ordersApi.getHistory(id),
  createOrder: (data: any) => ordersApi.createOrder(data),
  updateOrder: (id: number | string, data: any) => ordersApi.updateOrder(id, data),
  addOrderImages: (id: number | string, imageUrls: string[], photoType: string) => 
    ordersApi.addImages(id, imageUrls, photoType),

  // Clients
  getClients: (params: any) => clientsApi.getClients(params),
  getClient: (id: number | string) => clientsApi.getClient(id),
  createClient: (data: any) => clientsApi.createClient(data),
  updateClient: (id: number | string, data: any) => clientsApi.updateClient(id, data),
  getClientCommandes: (id: number | string) => clientsApi.getClientCommandes(id),
  getClientDebtDetail: (clientId: number | string) => clientsApi.getClientDebtDetail(clientId),

  // Catalog
  getCategories: () => catalogApi.getCategories(),
  createCategory: (data: any) => catalogApi.createCategory(data),
  updateCategory: (id: number | string, data: any) => catalogApi.updateCategory(id, data),
  toggleCategory: (id: number | string) => catalogApi.toggleCategory(id),
  createProduct: (categoryId: number | string, data: any) => catalogApi.createProduct(categoryId, data),
  updateProduct: (id: number | string, data: any) => catalogApi.updateProduct(id, data),
  toggleProduct: (id: number | string) => catalogApi.toggleProduct(id),

  // Users / Drivers
  getUsers: () => usersApi.getActiveUsers(),
  createUser: (data: any) => usersApi.createUser(data),
  updateUser: (id: number | string, data: any) => usersApi.updateUser(id, data),
  activateUser: (id: number | string) => usersApi.activateUser(id),
  deactivateUser: (id: number | string) => usersApi.deactivateUser(id),
  resetPassword: (id: number | string, password: string) => usersApi.resetPassword(id, password),

  // Receipts & PDFs
  getOrderPdfUrl: (id: number | string) => ordersApi.getOrderPdfUrl(id),
  getDeliveryPdfUrl: (id: number | string) => ordersApi.getDeliveryPdfUrl(id),
  getOrderReceipt: (id: number | string) => ordersApi.getOrderReceiptWhatsapp(id),
  getDeliveryReceipt: (id: number | string) => ordersApi.getDeliveryReceiptWhatsapp(id),

  // Unpaid
  getUnpaidOverview: () => paymentsApi.getUnpaidOverview(),
  getClientDebtList: () => paymentsApi.getClientDebtList(),
  // getAllUnpaidOrders is missing from the new specialized ones, I'll add it to ordersApi
  getAllUnpaidOrders: () => ordersApi.getOrders({ status: 'UNPAID' }), // Placeholder mapping

  // Uploads
  uploadFiles: (files: any[]) => uploadsApi.uploadFiles(files),

  // Analytics
  getRevenueAnalytics: (start: string, end: string) => analyticsApi.getRevenue(start, end),
  getDriverPerformance: () => analyticsApi.getDriverPerformance(),
  getOperationalKPIs: () => analyticsApi.getOperationalKPIs(),
};

export default adminApi;
