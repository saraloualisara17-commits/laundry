import React, { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  Package, Wrench, CheckCircle2, AlertTriangle, Clock,
  ChevronRight, Loader2, RefreshCw, TrendingUp
} from 'lucide-react'
import { statisticsApi } from '../../services/statisticsApi'
import { ordersApi } from '../../services/ordersApi'
import { queryKeys } from '../../lib/queryKeys'
import { StatusBadge } from '../../components/StatusBadge'
import { STATUS_LABELS, STATUS_BADGE_STYLES } from '../../constants/statusColors'

const fmt  = (v) => Number(v || 0).toLocaleString('fr-MA', { minimumFractionDigits: 2 })
const fmtN = (v) => Number(v || 0).toLocaleString('fr-MA')
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

export default function EmployeDashboard() {
  const navigate = useNavigate()
  const user     = useSelector(s => s.auth.user)

  const { data: statusOverview = {}, isLoading: loadingStatus, refetch } = useQuery({
    queryKey: queryKeys.statistics.statusOverview,
    queryFn:  statisticsApi.getStatusOverview,
  })

  const { data: recentRaw = [] } = useQuery({
    queryKey: queryKeys.orders.list({ page: 0, size: 8, sort: 'createdAt,desc' }),
    queryFn:  () => ordersApi.getAll({ page: 0, size: 8 }),
  })

  const recentOrders = useMemo(() => {
    if (Array.isArray(recentRaw)) return recentRaw.slice(0, 8)
    return recentRaw?.content?.slice(0, 8) ?? []
  }, [recentRaw])

  const greet = useMemo(() => {
    const h = new Date().getHours()
    if (h < 12) return 'Bonjour'
    if (h < 18) return 'Bon après-midi'
    return 'Bonsoir'
  }, [])

  const WORKSHOP_STATS = [
    { key: 'PENDING_PICKUP',    icon: Clock,        label: STATUS_LABELS.PENDING_PICKUP,    accent: '#C2185B' },
    { key: 'PICKED_UP',         icon: Package,      label: STATUS_LABELS.PICKED_UP,         accent: '#F59E0B' },
    { key: 'IN_PROCESS',        icon: Wrench,       label: STATUS_LABELS.IN_PROCESS,        accent: '#3B82F6' },
    { key: 'READY_FOR_DELIVERY',icon: CheckCircle2, label: STATUS_LABELS.READY_FOR_DELIVERY,accent: '#10B981' },
  ]

  const overdueCount = useMemo(() => {
    const inProcess = statusOverview['IN_PROCESS']?.count ?? statusOverview['IN_PROCESS'] ?? 0
    return Number(inProcess) > 10 ? Number(inProcess) : 0
  }, [statusOverview])

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-[var(--text)] tracking-tight">
            {greet}, {user?.name?.split(' ')[0] || 'Employé'} 👋
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <button onClick={() => refetch()} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-[rgba(0,0,0,0.08)] shadow-sm text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors">
          <RefreshCw size={16} className={loadingStatus ? 'animate-spin text-[var(--primary)]' : ''} />
        </button>
      </div>

      {/* Overdue alert */}
      {overdueCount > 0 && (
        <button
          onClick={() => navigate('/employe/commandes?status=IN_PROCESS')}
          className="w-full text-start bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 hover:shadow-md transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <AlertTriangle size={18} className="text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm text-amber-800">Atelier chargé</p>
            <p className="text-xs text-amber-600 mt-0.5">{overdueCount} commandes en cours de traitement</p>
          </div>
          <ChevronRight size={16} className="text-amber-400 shrink-0" />
        </button>
      )}

      {/* Workshop stats */}
      <div>
        <h2 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3">Atelier</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {WORKSHOP_STATS.map(({ key, icon: Icon, label, accent }) => {
            const cfg   = STATUS_BADGE_STYLES[key]
            const count = statusOverview[key]?.count ?? statusOverview[key] ?? 0
            const amt   = statusOverview[key]?.amount ?? 0
            return (
              <button
                key={key}
                onClick={() => navigate(`/employe/commandes?status=${key}`)}
                className="bg-white rounded-[16px] border border-[rgba(0,0,0,0.06)] shadow-[var(--shadow-sm)] p-4 text-start hover:shadow-md transition-all active:scale-[0.98] relative overflow-hidden group"
              >
                <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ backgroundColor: accent }} />
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ backgroundColor: cfg?.bg }}>
                    <Icon size={18} style={{ color: accent }} />
                  </div>
                </div>
                {loadingStatus
                  ? <div className="h-8 w-12 bg-[var(--bg)] rounded-lg shimmer mb-1" />
                  : <p className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-[var(--text)]">{fmtN(count)}</p>
                }
                <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.05em]">{label}</p>
                {amt > 0 && <p className="text-[11px] font-bold mt-1" style={{ color: accent }}>{fmt(amt)} DH</p>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Recent orders */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-widest">Commandes récentes</h2>
          <button onClick={() => navigate('/employe/commandes')} className="text-xs font-bold text-[var(--primary)] hover:underline flex items-center gap-1">
            Voir tout <ChevronRight size={12} />
          </button>
        </div>
        <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] shadow-[var(--shadow-sm)] overflow-hidden">
          {recentOrders.length === 0 ? (
            <div className="py-12 text-center opacity-40">
              <Package size={32} className="mx-auto mb-2 text-[var(--text-muted)]" />
              <p className="text-sm font-semibold text-[var(--text-secondary)]">Aucune commande récente</p>
            </div>
          ) : (
            <div className="divide-y divide-[rgba(0,0,0,0.05)]">
              {recentOrders.map(order => (
                <button
                  key={order.id}
                  onClick={() => navigate(`/employe/commandes/${order.id}`)}
                  className="w-full text-start flex items-center gap-4 px-5 py-4 hover:bg-[var(--bg)] transition-colors group"
                >
                  <div className="w-9 h-9 rounded-[10px] bg-[var(--primary-surface)] text-[var(--primary)] flex items-center justify-center text-[11px] font-bold shrink-0">
                    #{(order.numeroCommande || '').slice(-3)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[var(--text)] truncate">
                      {order.client?.name || order.client?.nom || '—'}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] font-semibold mt-0.5">
                      {order.commandeTapis?.length || 0} art. · {fmt(order.montantTotal)} DH · {fmtDate(order.createdAt)}
                    </p>
                  </div>
                  <StatusBadge status={order.status} />
                  <ChevronRight size={14} className="text-[var(--text-muted)] shrink-0 opacity-0 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
