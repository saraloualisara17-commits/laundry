/**
 * Canonical query key factory — the single source of truth for ALL React Query
 * cache keys in the application. Every hook must import from here; no local key
 * factories or inline arrays are allowed elsewhere.
 *
 * Key hierarchy rule: invalidating a parent key invalidates all its children.
 *   e.g. invalidate(queryKeys.orders.all) → clears every order query in the cache.
 */
export const queryKeys = {
  // ─── ORDERS ────────────────────────────────────────────────────────────────
  orders: {
    all: ['orders'] as const,
    list: (filters?: any) => [...queryKeys.orders.all, 'list', { filters }] as const,
    details: (id: string | number) => [...queryKeys.orders.all, 'detail', String(id)] as const,
    payments: (id: string | number) => [...queryKeys.orders.details(id), 'payments'] as const,
    history: (id: string | number) => [...queryKeys.orders.details(id), 'history'] as const,
    unpaid: () => [...queryKeys.orders.all, 'unpaid'] as const,
    map: () => [...queryKeys.orders.all, 'map'] as const,
  },

  // ─── CLIENTS ───────────────────────────────────────────────────────────────
  clients: {
    all: ['clients'] as const,
    list: (params?: any) => [...queryKeys.clients.all, 'list', { params }] as const,
    detail: (id: string | number) => [...queryKeys.clients.all, 'detail', String(id)] as const,
    debt: (id: string | number) => [...queryKeys.clients.detail(id), 'debt'] as const,
    debtList: () => [...queryKeys.clients.all, 'debt-list'] as const,
  },

  // ─── USERS ─────────────────────────────────────────────────────────────────
  users: {
    all: ['users'] as const,
    // All users whose role permits delivery (livreur + admin)
    drivers: () => [...queryKeys.users.all, 'drivers'] as const,
    // Subset used specifically for pickup assignment UI
    pickup: () => [...queryKeys.users.all, 'drivers', 'pickup'] as const,
  },

  // ─── DASHBOARD ─────────────────────────────────────────────────────────────
  dashboard: {
    all: ['dashboard'] as const,
    stats: () => [...queryKeys.dashboard.all, 'stats'] as const,
    overview: () => [...queryKeys.dashboard.all, 'overview'] as const,
    unpaidOverview: () => [...queryKeys.dashboard.all, 'unpaid-overview'] as const,
  },

  // ─── CATALOG ───────────────────────────────────────────────────────────────
  catalog: {
    all: ['catalog'] as const,
    categories: () => [...queryKeys.catalog.all, 'categories'] as const,
    products: (categoryId?: string | number) => [...queryKeys.catalog.all, 'products', { categoryId }] as const,
  },

  // ─── ANALYTICS ─────────────────────────────────────────────────────────────
  analytics: {
    all: ['analytics'] as const,
    revenue: (start: string, end: string) => [...queryKeys.analytics.all, 'revenue', { start, end }] as const,
    drivers: () => [...queryKeys.analytics.all, 'drivers'] as const,
    kpis: () => [...queryKeys.analytics.all, 'kpis'] as const,
  },

  // ─── STATISTICS ────────────────────────────────────────────────────────────
  // Separate from analytics: statistics covers operational daily summaries
  // sent via WebSocket STATS_UPDATED events.
  statistics: {
    all: ['statistics'] as const,
  },

  // ─── SETTINGS ──────────────────────────────────────────────────────────────
  settings: {
    all: ['settings'] as const,
  },

  // ─── LIVREUR ───────────────────────────────────────────────────────────────
  livreur: {
    all: ['livreur'] as const,
    stats: () => [...queryKeys.livreur.all, 'stats'] as const,
    deliveries: () => [...queryKeys.livreur.all, 'deliveries'] as const,
    pickups: () => [...queryKeys.livreur.all, 'pickups'] as const,
    cancelled: () => [...queryKeys.livreur.all, 'cancelled'] as const,
  },

  // ─── NOTIFICATIONS ─────────────────────────────────────────────────────────
  notifications: {
    all: ['notifications'] as const,
    list: () => [...['notifications'], 'list'] as const,
    unreadCount: () => [...['notifications'], 'unread-count'] as const,
  },

  // ─── AUDIT ─────────────────────────────────────────────────────────────────
  audit: {
    all: ['audit'] as const,
    recent: () => [...['audit'], 'recent'] as const,
    entity: (entityType: string, entityId: string | number) =>
      [...['audit'], 'entity', entityType, String(entityId)] as const,
    orderTimeline: (orderId: string | number) =>
      [...['audit'], 'timeline', String(orderId)] as const,
  },
};
