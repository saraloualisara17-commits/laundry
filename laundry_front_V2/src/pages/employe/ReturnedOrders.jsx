import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Search, X, Package, ChevronRight, AlertTriangle } from 'lucide-react'
import { ordersApi } from '../../services/ordersApi'
import { queryKeys } from '../../lib/queryKeys'
import { StatusBadge } from '../../components/StatusBadge'

const fmt     = (v) => Number(v || 0).toLocaleString('fr-MA', { minimumFractionDigits: 2 })
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

export default function ReturnedOrders() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const { data: rawData = [], isLoading } = useQuery({
    queryKey: queryKeys.employe ? queryKeys.employe.returned : ['employe', 'returned'],
    queryFn: () => ordersApi.getAll({ status: 'DELIVERY_FAILED', size: 100 }),
  })

  const orders = useMemo(() => {
    const list = Array.isArray(rawData) ? rawData : rawData?.content ?? []
    if (!search.trim()) return list
    const q = search.toLowerCase()
    return list.filter(o =>
      (o.client?.name || o.client?.nom || '').toLowerCase().includes(q) ||
      (o.numeroCommande || '').toLowerCase().includes(q)
    )
  }, [rawData, search])

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-[var(--text)] tracking-tight">Retours</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">Commandes avec échec de livraison</p>
      </div>

      {/* Alert banner */}
      {!isLoading && orders.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
            <AlertTriangle size={16} className="text-purple-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-purple-800">{orders.length} retour{orders.length !== 1 ? 's' : ''} en attente</p>
            <p className="text-xs text-purple-600 mt-0.5">Ces commandes doivent être replanifiées</p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…"
          className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-[rgba(0,0,0,0.1)] bg-white text-sm text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] shadow-sm" />
        {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"><X size={14} /></button>}
      </div>

      {/* Table (desktop) / Cards (mobile) */}
      <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] shadow-sm overflow-hidden">
        {/* Desktop header */}
        <div className="hidden md:grid grid-cols-[2fr_2fr_1.5fr_1fr_1fr] gap-4 px-6 py-3 border-b border-[rgba(0,0,0,0.05)] bg-[var(--bg)]">
          {['N° Commande', 'Client', 'Statut', 'Montant', 'Date'].map(h => (
            <span key={h} className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.06em]">{h}</span>
          ))}
        </div>

        {isLoading ? (
          <div className="divide-y divide-[rgba(0,0,0,0.05)]">
            {Array.from({ length: 5 }).map((_, i) => (
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
          <div className="py-16 text-center">
            <Package size={36} className="mx-auto mb-3 text-[var(--text-muted)] opacity-40" />
            <p className="text-sm font-semibold text-[var(--text-secondary)] opacity-40">
              {search ? 'Aucun résultat' : 'Aucun retour en cours'}
            </p>
            {!search && (
              <p className="text-xs text-green-600 font-bold mt-2 opacity-70">✓ Tout est livré !</p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[rgba(0,0,0,0.05)]">
            {orders.map(order => (
              <button key={order.id} onClick={() => navigate(`/employe/commandes/${order.id}`)}
                className="w-full text-start hover:bg-[var(--bg)] transition-colors group">
                {/* Desktop */}
                <div className="hidden md:grid grid-cols-[2fr_2fr_1.5fr_1fr_1fr] gap-4 items-center px-6 py-3.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center text-[10px] font-bold shrink-0">
                      #{(order.numeroCommande || '').slice(-3)}
                    </div>
                    <span className="text-sm font-bold text-[var(--text)] font-mono truncate">{order.numeroCommande || `#${order.id}`}</span>
                  </div>
                  <span className="text-sm font-semibold text-[var(--text)] truncate">{order.client?.name || order.client?.nom || '—'}</span>
                  <StatusBadge status={order.status} />
                  <span className="text-sm font-bold text-[var(--text)]">{fmt(order.montantTotal)} DH</span>
                  <span className="text-xs text-[var(--text-muted)]">{fmtDate(order.createdAt)}</span>
                </div>
                {/* Mobile */}
                <div className="md:hidden flex items-center gap-3 px-4 py-3.5">
                  <div className="w-9 h-9 rounded-[10px] bg-purple-50 text-purple-600 flex items-center justify-center text-[10px] font-bold shrink-0">
                    #{(order.numeroCommande || '').slice(-3)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[var(--text)] truncate">{order.client?.name || order.client?.nom || '—'}</p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{fmtDate(order.createdAt)} · {fmt(order.montantTotal)} DH</p>
                  </div>
                  <StatusBadge status={order.status} />
                  <ChevronRight size={14} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 shrink-0" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
