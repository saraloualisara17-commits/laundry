import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Package, ChevronRight, Phone, Loader2 } from 'lucide-react'
import { livreurApi } from '../../services/livreurApi'
import { queryKeys } from '../../lib/queryKeys'
import { StatusBadge } from '../../components/StatusBadge'

const fmt = (v) => Number(v || 0).toLocaleString('fr-MA', { minimumFractionDigits: 2 })

export default function LivreurOrders() {
  const navigate = useNavigate()

  const { data: pickups = [], isLoading } = useQuery({
    queryKey: queryKeys.livreur.pendingPickup,
    queryFn:  livreurApi.getPendingPickup,
    refetchInterval: 60_000,
  })

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-[var(--text)] tracking-tight">Collectes</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          {isLoading ? '…' : `${pickups.length} commande${pickups.length !== 1 ? 's' : ''} à collecter`}
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] shimmer" />
          ))}
        </div>
      ) : pickups.length === 0 ? (
        <div className="py-20 text-center opacity-40">
          <Package size={40} className="mx-auto mb-3 text-[var(--text-muted)]" />
          <p className="text-sm font-semibold text-[var(--text-secondary)]">Aucune collecte assignée</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pickups.map(order => {
            const phone = order.client?.phone || order.client?.phones?.[0]?.phoneNumber
            return (
              <div key={order.id} className="bg-white rounded-2xl border border-[rgba(0,0,0,0.07)] shadow-sm overflow-hidden">
                <button
                  onClick={() => navigate(`/livreur/delivery/${order.id}`)}
                  className="w-full text-start flex items-center gap-4 px-5 py-4 hover:bg-[var(--bg)] transition-colors group"
                >
                  <div className="w-9 h-9 rounded-[10px] bg-[rgba(194,24,91,0.08)] text-[#C2185B] flex items-center justify-center text-[10px] font-bold shrink-0">
                    #{(order.numeroCommande || '').slice(-3)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[var(--text)] truncate">
                      {order.client?.name || order.client?.nom || '—'}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      {order.commandeTapis?.length || 0} art. · {fmt(order.montantTotal)} DH
                    </p>
                  </div>
                  <StatusBadge status={order.status} />
                  <ChevronRight size={14} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 shrink-0" />
                </button>
                {(phone || order.deliveryAddress) && (
                  <div className="px-5 pb-3 flex gap-2 border-t border-[rgba(0,0,0,0.04)]">
                    {phone && (
                      <a href={`tel:${phone}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[rgba(0,0,0,0.08)] text-xs font-bold text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] mt-3">
                        <Phone size={12} />
                        {phone}
                      </a>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
