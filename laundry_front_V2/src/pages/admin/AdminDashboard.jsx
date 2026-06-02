import React, { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  Clock, Package, Wrench, CheckCircle2, Truck, XCircle,
  AlertTriangle, TrendingUp, DollarSign, Users, RefreshCw,
  ChevronRight, Loader2, ArrowUpRight
} from 'lucide-react'
import { statisticsApi } from '../../services/statisticsApi'
import { unpaidApi } from '../../services/unpaidApi'
import { ordersApi } from '../../services/ordersApi'
import { queryKeys } from '../../lib/queryKeys'
import { StatusBadge } from '../../components/StatusBadge'
import { STATUS_BADGE_STYLES, STATUS_LABELS } from '../../constants/statusColors'

const fmt = (v) => Number(v || 0).toLocaleString('fr-MA', { minimumFractionDigits: 2 })
const fmtN = (v) => Number(v || 0).toLocaleString('fr-MA')

const STATUS_CONFIG = [
  { key: 'PENDING_PICKUP',     icon: Clock,        label: STATUS_LABELS.PENDING_PICKUP,     accent: '#C2185B' },
  { key: 'PICKED_UP',          icon: Package,      label: STATUS_LABELS.PICKED_UP,          accent: '#F59E0B' },
  { key: 'IN_PROCESS',         icon: Wrench,       label: STATUS_LABELS.IN_PROCESS,         accent: '#3B82F6' },
  { key: 'READY_FOR_DELIVERY', icon: CheckCircle2, label: STATUS_LABELS.READY_FOR_DELIVERY, accent: '#10B981' },
]
const STATUS_SECONDARY = [
  { key: 'DELIVERED',       icon: Truck,         label: STATUS_LABELS.DELIVERED,       accent: '#0D7377' },
  { key: 'CANCELLED',       icon: XCircle,       label: STATUS_LABELS.CANCELLED,       accent: '#EF4444' },
  { key: 'PICKUP_FAILED',   icon: AlertTriangle, label: STATUS_LABELS.PICKUP_FAILED,   accent: '#EA580C' },
  { key: 'DELIVERY_FAILED', icon: AlertTriangle, label: STATUS_LABELS.DELIVERY_FAILED, accent: '#7C3AED' },
]

export default function AdminDashboard() {
  const navigate = useNavigate()
  const user     = useSelector(s => s.auth.user)

  const { data: todayStats, isLoading: loadingToday, refetch: refetchToday } = useQuery({
    queryKey: queryKeys.statistics.today,
    queryFn: statisticsApi.getToday,
  })

  const { data: statusOverview = {}, isLoading: loadingStatus, refetch: refetchStatus } = useQuery({
    queryKey: queryKeys.statistics.statusOverview,
    queryFn: statisticsApi.getStatusOverview,
  })

  const { data: unpaidOverview } = useQuery({
    queryKey: queryKeys.unpaid.overview,
    queryFn: unpaidApi.getOverview,
  })

  const { data: recentRaw = [] } = useQuery({
    queryKey: queryKeys.orders.list({ page: 0, size: 5 }),
    queryFn: () => ordersApi.getAll({ page: 0, size: 5 }),
  })

  const recentOrders = useMemo(() => {
    if (Array.isArray(recentRaw)) return recentRaw.slice(0, 5)
    return recentRaw?.content?.slice(0, 5) ?? []
  }, [recentRaw])

  const loading = loadingToday || loadingStatus

  const greet = useMemo(() => {
    const h = new Date().getHours()
    if (h < 12) return 'Bonjour'
    if (h < 18) return 'Bon après-midi'
    return 'Bonsoir'
  }, [])

  return (
    <div className="space-y-6 animate-fade-in">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-[var(--text)] tracking-tight">
            {greet}, {user?.name?.split(' ')[0] || 'Admin'} 👋
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button
          onClick={() => { refetchToday(); refetchStatus(); }}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-[rgba(0,0,0,0.08)] shadow-sm text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors active:scale-95"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin text-[var(--primary)]' : ''} />
        </button>
      </div>

      {/* TODAY KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Commandes aujourd'hui", value: fmtN(todayStats?.commandesCount), icon: Package,      accent: '#0D7377', bg: 'rgba(13,115,119,0.08)' },
          { label: 'Chiffre du jour',        value: `${fmt(todayStats?.chiffreAffaires)} DH`, icon: TrendingUp,  accent: '#10B981', bg: 'rgba(16,185,129,0.08)' },
          { label: 'Paiements collectés',    value: `${fmt(todayStats?.paiementsCollectes)} DH`, icon: DollarSign, accent: '#C9A84C', bg: 'rgba(201,168,76,0.08)' },
          { label: 'Clients actifs',         value: fmtN(todayStats?.clientsCount),  icon: Users,        accent: '#3B82F6', bg: 'rgba(59,130,246,0.08)' },
        ].map((k, i) => (
          <div key={i} className="bg-white rounded-[16px] border border-[rgba(0,0,0,0.06)] shadow-[var(--shadow-sm)] p-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ backgroundColor: k.accent }} />
            <div className="w-9 h-9 rounded-[10px] flex items-center justify-center mb-3" style={{ backgroundColor: k.bg }}>
              <k.icon size={18} style={{ color: k.accent }} />
            </div>
            <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em]">{k.label}</p>
            {loading
              ? <div className="h-7 w-20 bg-[var(--bg)] rounded-lg mt-1 shimmer" />
              : <p className="font-['Plus_Jakarta_Sans'] text-xl font-bold text-[var(--text)] mt-0.5">{k.value}</p>
            }
          </div>
        ))}
      </div>

      {/* UNPAID BANNER */}
      {unpaidOverview && (
        <button
          onClick={() => navigate('/admin/unpaid')}
          className={`w-full text-start rounded-2xl p-4 flex items-center justify-between gap-4 border transition-all hover:shadow-md ${
            Number(unpaidOverview.totalRemaining || unpaidOverview.totalUnpaid) > 0
              ? 'bg-red-50 border-red-200'
              : 'bg-green-50 border-green-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${Number(unpaidOverview.totalRemaining || unpaidOverview.totalUnpaid) > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
              <DollarSign size={18} className={Number(unpaidOverview.totalRemaining || unpaidOverview.totalUnpaid) > 0 ? 'text-red-600' : 'text-green-600'} />
            </div>
            <div>
              <p className={`font-bold text-sm ${Number(unpaidOverview.totalRemaining || unpaidOverview.totalUnpaid) > 0 ? 'text-red-700' : 'text-green-700'}`}>
                {Number(unpaidOverview.totalRemaining || unpaidOverview.totalUnpaid) > 0
                  ? `${fmt(unpaidOverview.totalRemaining || unpaidOverview.totalUnpaid)} DH impayés`
                  : 'Aucun impayé — Tout est réglé ✓'}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {unpaidOverview.clientsWithDebt || unpaidOverview.clientCount || 0} client(s) · {unpaidOverview.totalOrders || 0} commande(s)
              </p>
            </div>
          </div>
          <ChevronRight size={16} className="text-[var(--text-muted)] shrink-0" />
        </button>
      )}

      {/* STATUS OVERVIEW — Primary 4 */}
      <div>
        <h2 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3">En cours</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {STATUS_CONFIG.map(({ key, icon: Icon, label, accent }) => {
            const cfg   = STATUS_BADGE_STYLES[key]
            const count = statusOverview[key]?.count ?? statusOverview[key] ?? 0
            const amt   = statusOverview[key]?.amount ?? 0
            return (
              <button
                key={key}
                onClick={() => navigate(`/admin/commandes?status=${key}`)}
                className="bg-white rounded-[16px] border border-[rgba(0,0,0,0.06)] shadow-[var(--shadow-sm)] p-4 text-start hover:shadow-md transition-all active:scale-[0.98] relative overflow-hidden group"
              >
                <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ backgroundColor: accent }} />
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ backgroundColor: cfg?.bg }}>
                    <Icon size={18} style={{ color: accent }} />
                  </div>
                  <ArrowUpRight size={14} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
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

      {/* STATUS OVERVIEW — Secondary 4 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STATUS_SECONDARY.map(({ key, icon: Icon, label, accent }) => {
          const count = statusOverview[key]?.count ?? statusOverview[key] ?? 0
          return (
            <button
              key={key}
              onClick={() => navigate(`/admin/commandes?status=${key}`)}
              className="bg-white rounded-xl border border-[rgba(0,0,0,0.06)] shadow-[var(--shadow-sm)] p-3 text-start flex items-center gap-3 hover:shadow-md transition-all active:scale-[0.98]"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: STATUS_BADGE_STYLES[key]?.bg }}>
                <Icon size={15} style={{ color: accent }} />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-base text-[var(--text)]">{loadingStatus ? '…' : fmtN(count)}</p>
                <p className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider truncate">{label}</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* RECENT ORDERS */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-widest">Dernières commandes</h2>
          <button onClick={() => navigate('/admin/commandes')} className="text-xs font-bold text-[var(--primary)] hover:underline flex items-center gap-1">
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
                  onClick={() => navigate(`/admin/commandes/${order.id}`)}
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
                      {order.commandeTapis?.length || 0} article(s) · {fmt(order.montantTotal)} DH
                    </p>
                  </div>
                  <StatusBadge status={order.status} />
                  <ChevronRight size={14} className="text-[var(--text-muted)] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
