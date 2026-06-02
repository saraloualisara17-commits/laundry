import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, X, Package, ChevronRight } from 'lucide-react'
import { ordersApi } from '../../services/ordersApi'
import { queryKeys } from '../../lib/queryKeys'
import { StatusBadge } from '../../components/StatusBadge'
import { STATUS_LABELS } from '../../constants/statusColors'

const fmt     = (v) => Number(v || 0).toLocaleString('fr-MA', { minimumFractionDigits: 2 })
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

const EMPLOYE_STATUSES = ['PENDING_PICKUP', 'PICKED_UP', 'IN_PROCESS', 'READY_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'PICKUP_FAILED', 'DELIVERY_FAILED', 'AU_LOCAL']

export default function EmployeCommandes() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [search, setSearch]       = useState('')
  const [debounced, setDebounced] = useState('')
  const [status, setStatus]       = useState(searchParams.get('status') || '')
  const [page, setPage]           = useState(0)
  const PAGE_SIZE = 20

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setPage(0) }, 350)
    return () => clearTimeout(t)
  }, [search])
  useEffect(() => { setPage(0) }, [status])

  const params = useMemo(() => ({
    page, size: PAGE_SIZE,
    ...(debounced && { search: debounced }),
    ...(status    && { status }),
  }), [page, debounced, status])

  const { data: rawData, isLoading } = useQuery({
    queryKey: queryKeys.orders.list(params),
    queryFn:  () => ordersApi.getAll(params),
    keepPreviousData: true,
  })

  const orders = useMemo(() => {
    if (Array.isArray(rawData)) return rawData
    return rawData?.content ?? []
  }, [rawData])
  const totalPages = useMemo(() => Array.isArray(rawData) ? 1 : rawData?.totalPages ?? 1, [rawData])
  const totalElements = useMemo(() => Array.isArray(rawData) ? rawData.length : rawData?.totalElements ?? orders.length, [rawData, orders])

  return (
    <div className="space-y-4 animate-fade-in">

      <div>
        <h1 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-[var(--text)] tracking-tight">Commandes</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          {isLoading ? '…' : `${totalElements.toLocaleString('fr-MA')} commande${totalElements !== 1 ? 's' : ''}`}
        </p>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
        <button onClick={() => setStatus('')}
          className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${!status ? 'bg-[var(--primary)] text-white shadow-sm' : 'bg-white border border-[rgba(0,0,0,0.08)] text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)]'}`}>
          Toutes
        </button>
        {EMPLOYE_STATUSES.map(s => (
          <button key={s} onClick={() => setStatus(s)}
            className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${status === s ? 'bg-[var(--primary)] text-white shadow-sm' : 'bg-white border border-[rgba(0,0,0,0.08)] text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)]'}`}>
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="N° commande, client…"
          className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-[rgba(0,0,0,0.1)] bg-white text-sm text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] shadow-sm" />
        {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"><X size={14} /></button>}
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] shadow-[var(--shadow-sm)] overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-[rgba(0,0,0,0.05)]">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <div className="w-9 h-9 rounded-xl bg-[var(--bg)] shimmer shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-32 bg-[var(--bg)] rounded shimmer" />
                  <div className="h-3 w-20 bg-[var(--bg)] rounded shimmer" />
                </div>
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center opacity-40">
            <Package size={36} className="mx-auto mb-3 text-[var(--text-muted)]" />
            <p className="text-sm font-semibold text-[var(--text-secondary)]">Aucune commande</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-[rgba(0,0,0,0.05)]">
              {orders.map(order => (
                <button key={order.id} onClick={() => navigate(`/employe/commandes/${order.id}`)}
                  className="w-full text-start flex items-center gap-4 px-5 py-4 hover:bg-[var(--bg)] transition-colors group">
                  <div className="w-9 h-9 rounded-[10px] bg-[var(--primary-surface)] text-[var(--primary)] flex items-center justify-center text-[10px] font-bold shrink-0">
                    #{(order.numeroCommande || '').slice(-3)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[var(--text)] truncate">
                      {order.client?.name || order.client?.nom || '—'}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] font-medium mt-0.5">
                      {order.numeroCommande} · {order.commandeTapis?.length || 0} art. · {fmtDate(order.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={order.status} />
                    <ChevronRight size={14} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100" />
                  </div>
                </button>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-[rgba(0,0,0,0.05)] bg-[var(--bg)]">
                <p className="text-xs text-[var(--text-muted)]">Page {page + 1} / {totalPages}</p>
                <div className="flex items-center gap-1.5">
                  <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
                    className="px-3 py-1.5 rounded-lg border border-[rgba(0,0,0,0.1)] text-xs font-semibold text-[var(--text-secondary)] disabled:opacity-40 hover:border-[var(--primary)] hover:text-[var(--primary)]">
                    Préc.
                  </button>
                  <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
                    className="px-3 py-1.5 rounded-lg border border-[rgba(0,0,0,0.1)] text-xs font-semibold text-[var(--text-secondary)] disabled:opacity-40 hover:border-[var(--primary)] hover:text-[var(--primary)]">
                    Suiv.
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
