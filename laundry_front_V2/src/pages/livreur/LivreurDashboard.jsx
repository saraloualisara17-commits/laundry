import React, { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  Truck, Package, CheckCircle2, Clock, ChevronRight,
  MapPin, Phone, MessageCircle, RefreshCw, Loader2
} from 'lucide-react'
import { livreurApi } from '../../services/livreurApi'
import { queryKeys } from '../../lib/queryKeys'
import { StatusBadge } from '../../components/StatusBadge'

const fmt     = (v) => Number(v || 0).toLocaleString('fr-MA', { minimumFractionDigits: 2 })
const fmtN    = (v) => Number(v || 0).toLocaleString('fr-MA')
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) : '—'

export default function LivreurDashboard() {
  const navigate = useNavigate()
  const user     = useSelector(s => s.auth.user)

  const { data: stats,    isLoading: loadingStats, refetch } = useQuery({
    queryKey: queryKeys.livreur.stats,
    queryFn:  livreurApi.getDashboardStats,
  })
  const { data: deliveries = [], isLoading: loadingDeliveries } = useQuery({
    queryKey: queryKeys.livreur.readyForDelivery,
    queryFn:  livreurApi.getReadyForDelivery,
  })
  const { data: pickups = [], isLoading: loadingPickups } = useQuery({
    queryKey: queryKeys.livreur.pendingPickup,
    queryFn:  livreurApi.getPendingPickup,
  })

  const greet = useMemo(() => {
    const h = new Date().getHours()
    if (h < 12) return 'Bonjour'
    if (h < 18) return 'Bon après-midi'
    return 'Bonsoir'
  }, [])

  const loading = loadingStats || loadingDeliveries || loadingPickups
  const nextMission = deliveries[0] || pickups[0]
  const missionType = deliveries.length > 0 ? 'livraison' : 'collecte'

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-[var(--text)] tracking-tight">
            {greet}, {user?.name?.split(' ')[0] || 'Livreur'} 👋
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <button onClick={() => refetch()} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-[rgba(0,0,0,0.08)] shadow-sm text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors">
          <RefreshCw size={16} className={loading ? 'animate-spin text-[var(--primary)]' : ''} />
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Livraisons today',  value: fmtN(stats?.deliveriesToday  ?? deliveries.length), icon: Truck,        accent: '#0D7377', bg: 'rgba(13,115,119,0.08)' },
          { label: 'Collectes today',   value: fmtN(stats?.pickupsToday     ?? pickups.length),    icon: Package,      accent: '#C2185B', bg: 'rgba(194,24,91,0.08)' },
          { label: 'Livrées totales',   value: fmtN(stats?.deliveredTotal   ?? 0),                 icon: CheckCircle2, accent: '#10B981', bg: 'rgba(16,185,129,0.08)' },
          { label: 'Paiements collectés',value: `${fmt(stats?.paymentsTotal ?? 0)} DH`,            icon: Clock,        accent: '#C9A84C', bg: 'rgba(201,168,76,0.08)' },
        ].map((k, i) => (
          <div key={i} className="bg-white rounded-[16px] border border-[rgba(0,0,0,0.06)] shadow-sm p-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ backgroundColor: k.accent }} />
            <div className="w-9 h-9 rounded-[10px] flex items-center justify-center mb-2" style={{ backgroundColor: k.bg }}>
              <k.icon size={17} style={{ color: k.accent }} />
            </div>
            <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.05em]">{k.label}</p>
            {loadingStats
              ? <div className="h-6 w-16 bg-[var(--bg)] rounded shimmer mt-1" />
              : <p className="font-['Plus_Jakarta_Sans'] text-xl font-bold text-[var(--text)] mt-0.5">{k.value}</p>
            }
          </div>
        ))}
      </div>

      {/* Next mission spotlight */}
      {nextMission && (
        <div>
          <h2 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3">Prochaine mission</h2>
          <button
            onClick={() => navigate(`/livreur/delivery/${nextMission.id}`)}
            className="w-full text-start bg-[var(--primary)] text-white rounded-2xl p-5 shadow-md hover:opacity-95 transition-opacity"
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider opacity-70 mb-1">{missionType}</p>
                <p className="font-['Plus_Jakarta_Sans'] text-lg font-bold">{nextMission.client?.name || nextMission.client?.nom}</p>
                <p className="text-sm opacity-70 mt-0.5 font-mono">{nextMission.numeroCommande}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Truck size={20} />
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5 opacity-80">
                <Package size={14} />
                <span>{nextMission.commandeTapis?.length || 0} art.</span>
              </div>
              <div className="flex items-center gap-1.5 opacity-80">
                <span className="font-bold">{fmt(nextMission.montantTotal)} DH</span>
              </div>
            </div>
            {nextMission.deliveryAddress && (
              <div className="flex items-center gap-1.5 mt-3 text-sm opacity-70">
                <MapPin size={13} />
                <span className="truncate">{nextMission.deliveryAddress}</span>
              </div>
            )}
          </button>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => navigate('/livreur/delivery')}
          className="bg-white rounded-2xl border border-[rgba(0,0,0,0.07)] shadow-sm p-4 flex flex-col items-start gap-3 hover:shadow-md transition-all hover:border-[var(--primary)]">
          <div className="w-10 h-10 rounded-xl bg-[rgba(13,115,119,0.08)] flex items-center justify-center">
            <Truck size={18} className="text-[#0D7377]" />
          </div>
          <div>
            <p className="font-bold text-[var(--text)]">Livraisons</p>
            <p className="text-xs text-[var(--text-muted)]">{deliveries.length} en attente</p>
          </div>
          <ChevronRight size={14} className="text-[var(--text-muted)] self-end" />
        </button>
        <button onClick={() => navigate('/livreur/orders')}
          className="bg-white rounded-2xl border border-[rgba(0,0,0,0.07)] shadow-sm p-4 flex flex-col items-start gap-3 hover:shadow-md transition-all hover:border-[var(--primary)]">
          <div className="w-10 h-10 rounded-xl bg-[rgba(194,24,91,0.08)] flex items-center justify-center">
            <Package size={18} className="text-[#C2185B]" />
          </div>
          <div>
            <p className="font-bold text-[var(--text)]">Collectes</p>
            <p className="text-xs text-[var(--text-muted)]">{pickups.length} en attente</p>
          </div>
          <ChevronRight size={14} className="text-[var(--text-muted)] self-end" />
        </button>
      </div>
    </div>
  )
}
