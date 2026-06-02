import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Search, X, Package, ChevronRight, RotateCcw, Loader2
} from 'lucide-react'
import { livreurApi } from '../../services/livreurApi'
import { queryKeys } from '../../lib/queryKeys'
import { StatusBadge } from '../../components/StatusBadge'
import ConfirmModal from '../../components/ui/ConfirmModal'

const fmt     = (v) => Number(v || 0).toLocaleString('fr-MA', { minimumFractionDigits: 2 })
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

export default function CanceledDeliveries() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [search,       setSearch]       = useState('')
  const [returnTarget, setReturnTarget] = useState(null)

  const { data: rawData = [], isLoading } = useQuery({
    queryKey: queryKeys.livreur.canceled,
    queryFn:  livreurApi.getCanceled,
  })

  const returnMutation = useMutation({
    mutationFn: (id) => livreurApi.returnToWorkplace(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.livreur.canceled })
      qc.invalidateQueries({ queryKey: queryKeys.livreur.readyForDelivery })
      setReturnTarget(null)
    },
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
        <h1 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-[var(--text)] tracking-tight">Annulations</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">Livraisons annulées et retours</p>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…"
          className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-[rgba(0,0,0,0.1)] bg-white text-sm text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] shadow-sm" />
        {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"><X size={14} /></button>}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] shimmer" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="py-16 text-center opacity-40">
          <Package size={36} className="mx-auto mb-3 text-[var(--text-muted)]" />
          <p className="text-sm font-semibold text-[var(--text-secondary)]">
            {search ? 'Aucun résultat' : 'Aucune annulation'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => (
            <div key={order.id} className="bg-white rounded-2xl border border-[rgba(0,0,0,0.07)] shadow-sm overflow-hidden">
              <button
                onClick={() => navigate(`/livreur/delivery/${order.id}`)}
                className="w-full text-start flex items-center gap-4 px-5 py-4 hover:bg-[var(--bg)] transition-colors group"
              >
                <div className="w-9 h-9 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center text-[10px] font-bold shrink-0">
                  #{(order.numeroCommande || '').slice(-3)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[var(--text)] truncate">
                    {order.client?.name || order.client?.nom || '—'}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    {order.numeroCommande} · {fmtDate(order.createdAt)} · {fmt(order.montantTotal)} DH
                  </p>
                </div>
                <StatusBadge status={order.status} />
                <ChevronRight size={14} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 shrink-0" />
              </button>
              {/* Return action */}
              <div className="px-5 pb-4 border-t border-[rgba(0,0,0,0.04)]">
                <button
                  onClick={() => setReturnTarget(order)}
                  className="flex items-center gap-2 px-3 py-2 mt-3 rounded-xl border border-[rgba(0,0,0,0.1)] text-xs font-bold text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
                >
                  <RotateCcw size={13} />
                  Retour atelier
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={!!returnTarget}
        onClose={() => setReturnTarget(null)}
        onConfirm={() => returnMutation.mutate(returnTarget?.id)}
        loading={returnMutation.isPending}
        title="Retour à l'atelier ?"
        message={`La commande ${returnTarget?.numeroCommande} sera retournée pour replanification.`}
        confirmText="Confirmer retour"
        type="warning"
      />
    </div>
  )
}
