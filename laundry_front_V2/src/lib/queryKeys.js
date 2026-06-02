export const queryKeys = {
  orders: {
    all: ['orders'],
    list: (params) => ['orders', 'list', params],
    detail: (id) => ['orders', 'detail', id],
    payments: (id) => ['orders', 'payments', id],
    history: (id) => ['orders', 'history', id],
  },
  clients: {
    all: ['clients'],
    list: (params) => ['clients', 'list', params],
    detail: (id) => ['clients', 'detail', id],
    orders: (id) => ['clients', 'orders', id],
  },
  users: {
    all: ['users'],
    active: ['users', 'active'],
    inactive: ['users', 'inactive'],
  },
  statistics: {
    today: ['statistics', 'today'],
    overall: ['statistics', 'overall'],
    lastNDays: (days) => ['statistics', 'lastNDays', days],
    dateRange: (params) => ['statistics', 'dateRange', params],
    livreur: (id, params) => ['statistics', 'livreur', id, params],
    statusOverview: ['statistics', 'statusOverview'],
  },
  catalog: {
    all: ['catalog'],
    categories: ['catalog', 'categories'],
  },
  unpaid: {
    overview: ['unpaid', 'overview'],
    clients: ['unpaid', 'clients'],
    clientDetail: (id) => ['unpaid', 'client', id],
  },
  settings: {
    all: ['settings'],
  },
  notifications: {
    all: ['notifications'],
    unreadCount: ['notifications', 'unreadCount'],
  },
  livreur: {
    readyForDelivery: ['livreur', 'readyForDelivery'],
    pendingPickup: ['livreur', 'pendingPickup'],
    canceled: ['livreur', 'canceled'],
    stats: ['livreur', 'stats'],
    carpetTypes: ['livreur', 'carpetTypes'],
    paymentTypes: ['livreur', 'paymentTypes'],
  },
  employe: {
    orders: (params) => ['employe', 'orders', params],
    returned: ['employe', 'returned'],
  },
}
