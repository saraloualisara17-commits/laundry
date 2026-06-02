import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Search, Filter, Download, ChevronLeft, ChevronRight,
  Package, Loader2, X, Calendar, User, ChevronDown
} from 'lucide-react'
import { ordersApi } from '../../services/ordersApi'
import { usersApi } from '../../services/usersApi'
import { queryKeys } from '../../lib/queryKeys'
import { StatusBadge } from '../../components/StatusBadge'
import { STATUS_LABELS } from '../../constants/statusColors'

const fmt = (v) => Number(v || 0).toLocaleString('fr-MA', { minimumFractionDigits: 2 })
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

const ALL_STATUSES = ['PENDING_PICKUP', 'PICKED_UP', 'IN_PROCESS', 'READY_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'PICKUP_FAILED', 'DELIVERY_FAILED', 'AU_LOCAL']

const PAGE_SIZE = 20

export default function AllCommandes() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [debouncedSearch, setDebouncedSearch] = useState(search)
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get('status') || '')
  const [selectedDriver, setSelectedDriver] = useState(searchParams.get('driver') || '')
  const [dateFrom, setDateFrom] = useState(searchParams.get('dateFrom') || '')
  const [dateTo, setDateTo] = useState(searchParams.get('dateTo') || '')
  const [page, setPage] = useState(0)
  const [showFilters, setShowFilters] = useState(false)
  const [exportingCsv, setExportingCsv] = useState(false)

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(0)
    }, 350)
    return () => clearTimeout(t)
  }, [search])

  // Reset page when filters change
  useEffect(() => { setPage(0) }, [selectedStatus, selectedDriver, dateFrom, dateTo])

  const params = useMemo(() => ({
    page,
    size: PAGE_SIZE,
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(selectedStatus && { status: selectedStatus }),
    ...(selectedDriver && { driverId: selectedDriver }),
    ...(dateFrom && { dateFrom }),
    ...(dateTo && { dateTo }),
  }), [page, debouncedSearch, selectedStatus, selectedDriver, dateFrom, dateTo])

  const { data: ordersData, isLoading, isFetching } = useQuery({
    queryKey: queryKeys.orders.list(params),
    queryFn: () => ordersApi.getAll(params),
    keepPreviousData: true,
  })

  const { data: drivers = [] } = useQuery({
    queryKey: queryKeys.users.active,
    queryFn: usersApi.getActive,
    select: (d) => Array.isArray(d) ? d.filter(u => u.role === 'LIVREUR') : [],
  })

  const orders = useMemo(() => {
    if (Array.isArray(ordersData)) return ordersData
    return ordersData?.content ?? []
  }, [ordersData])

  const totalPages = useMemo(() => {
    if (Array.isArray(ordersData)) return 1
    return ordersData?.totalPages ?? 1
  }, [ordersData])

  const totalElements = useMemo(() => {
    if (Array.isArray(ordersData)) return ordersData.length
    return ordersData?.totalElements ?? orders.length
  }, [ordersData, orders])

  const handleExportCsv = useCallback(async () => {
    if (exportingCsv) return
    setExportingCsv(true)
    try {
      const blob = await ordersApi.exportCsv()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `commandes-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Export failed', e)
    } finally {
      setExportingCsv(false)
    }
  }, [exportingCsv])

  const clearFilters = useCallback(() => {
    setSearch('')
    setSelectedStatus('')
    setSelectedDriver('')
    setDateFrom('')
    setDateTo('')
    setPage(0)
  }, [])

  const hasActiveFilters = debouncedSearch || selectedStatus || selectedDriver || dateFrom || dateTo

  return (
    <div className="space-y-4 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-[var(--text)] tracking-tight">Commandes</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            {isLoading ? '…' : `${totalElements.toLocaleString('fr-MA')} commande${totalElements !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={handleExportCsv}
          disabled={exportingCsv}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[rgba(0,0,0,0.1)] bg-white text-sm font-semibold text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors disabled:opacity-50 shadow-sm"
        >
          {exportingCsv ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
          <span className="hidden sm:inline">Exporter CSV</span>
        </button>
      </div>

      {/* Status Tab Bar */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
        <button
          onClick={() => { setSelectedStatus(''); setPage(0) }}
          className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
            !selectedStatus
              ? 'bg-[var(--primary)] text-white shadow-sm'
              : 'bg-white border border-[rgba(0,0,0,0.08)] text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)]'
          }`}
        >
          Toutes
        </button>
        {ALL_STATUSES.map(s => (
          <button
            key={s}
            onClick={() => { setSelectedStatus(s); setPage(0) }}
            className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
              selectedStatus === s
                ? 'bg-[var(--primary)] text-white shadow-sm'
                : 'bg-white border border-[rgba(0,0,0,0.08)] text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)]'
            }`}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Search + Filters Row */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="N° commande, client, téléphone…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[rgba(0,0,0,0.1)] bg-white text-sm text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] shadow-sm transition-colors"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)]">
              <X size={14} />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(p => !p)}
          className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all shadow-sm ${
            showFilters || selectedDriver || dateFrom || dateTo
              ? 'border-[var(--primary)] bg-[var(--primary-surface)] text-[var(--primary)]'
              : 'border-[rgba(0,0,0,0.1)] bg-white text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)]'
          }`}
        >
          <Filter size={14} />
          <span className="hidden sm:inline">Filtres</span>
          {(selectedDriver || dateFrom || dateTo) && (
            <span className="w-4 h-4 rounded-full bg-[var(--primary)] text-white text-[10px] flex items-center justify-center font-bold">
              {[selectedDriver, dateFrom, dateTo].filter(Boolean).length}
            </span>
          )}
        </button>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 transition-colors shadow-sm"
          >
            <X size={14} />
            <span className="hidden sm:inline">Effacer</span>
          </button>
        )}
      </div>

      {/* Expanded Filters */}
      {showFilters && (
        <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.07)] shadow-sm p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Driver filter */}
          <div>
            <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 block">Livreur</label>
            <div className="relative">
              <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <select
                value={selectedDriver}
                onChange={e => { setSelectedDriver(e.target.value); setPage(0) }}
                className="w-full pl-8 pr-8 py-2 rounded-xl border border-[rgba(0,0,0,0.1)] bg-white text-sm text-[var(--text)] focus:outline-none focus:border-[var(--primary)] appearance-none cursor-pointer"
              >
                <option value="">Tous les livreurs</option>
                {drivers.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
            </div>
          </div>
          {/* Date from */}
          <div>
            <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 block">Du</label>
            <div className="relative">
              <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="date"
                value={dateFrom}
                onChange={e => { setDateFrom(e.target.value); setPage(0) }}
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-[rgba(0,0,0,0.1)] bg-white text-sm text-[var(--text)] focus:outline-none focus:border-[var(--primary)]"
              />
            </div>
          </div>
          {/* Date to */}
          <div>
            <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 block">Au</label>
            <div className="relative">
              <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="date"
                value={dateTo}
                onChange={e => { setDateTo(e.target.value); setPage(0) }}
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-[rgba(0,0,0,0.1)] bg-white text-sm text-[var(--text)] focus:outline-none focus:border-[var(--primary)]"
              />
            </div>
          </div>
        </div>
      )}

      {/* Table / Cards */}
      <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] shadow-[var(--shadow-sm)] overflow-hidden">
        {/* Desktop Table Header */}
        <div className="hidden lg:grid grid-cols-[2fr_2fr_1.5fr_1fr_1.2fr_1.2fr] gap-4 px-6 py-3 border-b border-[rgba(0,0,0,0.05)] bg-[var(--bg)]">
          {['N° Commande', 'Client', 'Statut', 'Articles', 'Montant', 'Date'].map(h => (
            <span key={h} className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.06em]">{h}</span>
          ))}
        </div>

        {isLoading ? (
          <div className="divide-y divide-[rgba(0,0,0,0.05)]">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--bg)] shimmer shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-[var(--bg)] rounded shimmer" />
                  <div className="h-3 w-24 bg-[var(--bg)] rounded shimmer" />
                </div>
                <div className="hidden lg:block h-6 w-24 bg-[var(--bg)] rounded-full shimmer" />
                <div className="hidden lg:block h-4 w-16 bg-[var(--bg)] rounded shimmer" />
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="py-20 text-center opacity-40">
            <Package size={40} className="mx-auto mb-3 text-[var(--text-muted)]" />
            <p className="text-sm font-semibold text-[var(--text-secondary)]">Aucune commande trouvée</p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="mt-3 text-xs font-bold text-[var(--primary)] hover:underline">
                Effacer les filtres
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[rgba(0,0,0,0.05)]">
            {orders.map(order => (
              <button
                key={order.id}
                onClick={() => navigate(`/admin/commandes/${order.id}`)}
                className="w-full text-start hover:bg-[var(--bg)] transition-colors group"
              >
                {/* Desktop Row */}
                <div className="hidden lg:grid grid-cols-[2fr_2fr_1.5fr_1fr_1.2fr_1.2fr] gap-4 items-center px-6 py-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-[10px] bg-[var(--primary-surface)] text-[var(--primary)] flex items-center justify-center text-[10px] font-bold shrink-0">
                      #{(order.numeroCommande || '').slice(-3)}
                    </div>
                    <span className="text-sm font-bold text-[var(--text)] truncate font-mono">
                      {order.numeroCommande || `#${order.id}`}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--text)] truncate">
                      {order.client?.name || order.client?.nom || '—'}
                    </p>
                    {order.client?.phone && (
                      <p className="text-[11px] text-[var(--text-muted)] font-medium mt-0.5 truncate">{order.client.phone}</p>
                    )}
                  </div>
                  <StatusBadge status={order.status} />
                  <span className="text-sm font-semibold text-[var(--text)]">
                    {order.commandeTapis?.length || 0} art.
                  </span>
                  <div>
                    <p className="text-sm font-bold text-[var(--text)]">{fmt(order.montantTotal)} DH</p>
                    {Number(order.montantPaye) > 0 && Number(order.montantPaye) < Number(order.montantTotal) && (
                      <p className="text-[11px] text-amber-600 font-semibold mt-0.5">
                        Reste: {fmt(Number(order.montantTotal) - Number(order.montantPaye))} DH
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-[var(--text-muted)] font-medium">
                    {fmtDate(order.createdAt || order.dateCreation)}
                  </span>
                </div>

                {/* Mobile Card */}
                <div className="lg:hidden flex items-center gap-3 px-4 py-3.5">
                  <div className="w-10 h-10 rounded-[10px] bg-[var(--primary-surface)] text-[var(--primary)] flex items-center justify-center text-[11px] font-bold shrink-0">
                    #{(order.numeroCommande || '').slice(-3)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-sm font-bold text-[var(--text)] truncate">
                        {order.client?.name || order.client?.nom || '—'}
                      </p>
                      <StatusBadge status={order.status} />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-mono text-[var(--text-muted)]">{order.numeroCommande || `#${order.id}`}</span>
                      <span className="text-[11px] text-[var(--text-muted)]">·</span>
                      <span className="text-[11px] font-bold text-[var(--text)]">{fmt(order.montantTotal)} DH</span>
                      <span className="text-[11px] text-[var(--text-muted)]">·</span>
                      <span className="text-[11px] text-[var(--text-muted)]">{fmtDate(order.createdAt || order.dateCreation)}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-[rgba(0,0,0,0.05)] bg-[var(--bg)]">
            <p className="text-xs text-[var(--text-muted)] font-medium">
              Page {page + 1} / {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 0}
                onClick={() => setPage(p => Math.max(0, p - 1))}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-[rgba(0,0,0,0.1)] bg-white text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              {/* Page numbers — show up to 5 */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let p
                if (totalPages <= 5) p = i
                else if (page < 3) p = i
                else if (page > totalPages - 4) p = totalPages - 5 + i
                else p = page - 2 + i
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                      p === page
                        ? 'bg-[var(--primary)] text-white shadow-sm'
                        : 'border border-[rgba(0,0,0,0.1)] bg-white text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)]'
                    }`}
                  >
                    {p + 1}
                  </button>
                )
              })}
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-[rgba(0,0,0,0.1)] bg-white text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
            {isFetching && !isLoading && (
              <Loader2 size={14} className="animate-spin text-[var(--primary)]" />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
