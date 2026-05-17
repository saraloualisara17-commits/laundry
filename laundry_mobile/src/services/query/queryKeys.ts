/**
 * Query Key Factory for consistent cache management across the app.
 */
export const queryKeys = {
  // Global scopes
  orders: {
    all: ['orders'] as const,
    list: (filters?: any) => [...queryKeys.orders.all, 'list', { filters }] as const,
    details: (id: string | number) => [...queryKeys.orders.all, 'detail', String(id)] as const,
    payments: (id: string | number) => [...queryKeys.orders.details(id), 'payments'] as const,
    history: (id: string | number) => [...queryKeys.orders.details(id), 'history'] as const,
    unpaid: () => [...queryKeys.orders.all, 'unpaid'] as const,
    map: () => [...queryKeys.orders.all, 'map'] as const,
  },
  clients: {
    all: ['clients'] as const,
    list: (params?: any) => [...queryKeys.clients.all, 'list', { params }] as const,
    detail: (id: string | number) => [...queryKeys.clients.all, 'detail', String(id)] as const,
    debt: (id: string | number) => [...queryKeys.clients.detail(id), 'debt'] as const,
    debtList: () => [...queryKeys.clients.all, 'debt-list'] as const,
  },
  users: {
    all: ['users'] as const,
    drivers: () => [...queryKeys.users.all, 'drivers'] as const,
  },
  dashboard: {
    stats: () => ['dashboard', 'stats'] as const,
    overview: () => ['dashboard', 'overview'] as const,
    unpaidOverview: () => ['dashboard', 'unpaid-overview'] as const,
  },
  catalog: {
    all: ['catalog'] as const,
    categories: () => [...queryKeys.catalog.all, 'categories'] as const,
    products: (categoryId?: string | number) => [...queryKeys.catalog.all, 'products', { categoryId }] as const,
  }
};
