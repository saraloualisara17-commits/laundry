import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle, DollarSign, Users, Search, X,
  MessageCircle, Phone, ChevronRight, Loader2, Package
} from 'lucide-react'
import { unpaidApi } from '../../services/unpaidApi'
import { queryKeys } from '../../lib/queryKeys'
import { StatusBadge } from '../../components/StatusBadge'

const fmt  = (v) => Number(v || 0).toLocaleString('fr-MA', { minimumFractionDigits: 2 })
const fmtN = (v) => Number(v || 0).toLocaleString('fr-MA')

function debtTier(amount) {
  if (amount >= 1000) return { label: 'Critique',  color: '#DC2626', bg: 'rgba(220,38,38,0.08)',   border: 'rgba(220,38,38,0.2)' }
  if (amount >= 500)  return { label: 'Élevé',     color: '#EA580C', bg: 'rgba(234,88,12,0.08)',  border: 'rgba(234,88,12,0.2)' }
  if (amount >= 100)  return { label: 'Modéré',    color: '#D97706', bg: 'rgba(217,119,6,0.08)',  border: 'rgba(217,119,6,0.2)' }
  return              { label: 'Faible',            color: '#6B7280', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.2)' }
}

// ── Client Debt Detail Modal ──────────────────────────────────────────────────
function ClientDebtModal({ clientId, onClose }) {
  const navigate = useNavigate()
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.unpaid.clientDetail(clientId),
    queryFn: () => unpaidApi.getClientDetail(clientId),
    enabled: !!clientId,
  })

  const orders   = useMemo(() => data?.orders ?? data ?? [], [data])
  const client   = data?.client ?? orders?.[0]?.client
  const totalDue = useMemo(() => orders.reduce((s, o) => s + Math.max(0, Number(o.montantTotal) - Number(o.montantPaye)), 0), [orders])
  const phone    = client?.phone || client?.phones?.[0]?.phoneNumber

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="px-6 pt-5 pb-4 border-b border-[rgba(0,0,0,0.06)] flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-bold text-[var(--text)]">{client?.name || client?.nom || 'Client'}</h3>
            <p className="text-xs text-red-600 font-bold mt-0.5">{fmt(totalDue)} DH impayés</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--bg)] text-[var(--text-muted)]">
            <X size={16} />
          </button>
        </div>

        {phone && (
          <div className="px-6 py-3 border-b border-[rgba(0,0,0,0.05)] flex gap-3 shrink-0">
            <a href={`tel:${phone}`}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border border-[rgba(0,0,0,0.1)] text-xs font-bold text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors">
              <Phone size={13} />
              Appeler
            </a>
            <a href={`https://wa.me/${phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-green-50 border border-green-200 text-xs font-bold text-green-700 hover:bg-green-100 transition-colors">
              <MessageCircle size={13} />
              WhatsApp
            </a>
          </div>
        )}

        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-[var(--primary)]" />
            </div>
          ) : orders.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] text-center py-10">Aucune commande impayée</p>
          ) : (
            <div className="divide-y divide-[rgba(0,0,0,0.05)]">
              {orders.map(order => {
                const remaining = Math.max(0, Number(order.montantTotal) - Number(order.montantPaye))
                if (remaining <= 0) return null
                return (
                  <button
                    key={order.id}
                    onClick={() => { navigate(`/admin/commandes/${order.id}`); onClose() }}
                    className="w-full text-start flex items-center gap-4 px-6 py-4 hover:bg-[var(--bg)] transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-[10px] bg-red-50 text-red-600 flex items-center justify-center text-[10px] font-bold shrink-0">
                      #{(order.numeroCommande || '').slice(-3)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[var(--text)] truncate">
                        {order.numeroCommande || `#${order.id}`}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                        Total: {fmt(order.montantTotal)} DH · Payé: {fmt(order.montantPaye)} DH
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-red-600">-{fmt(remaining)} DH</p>
                      <StatusBadge status={order.status} />
                    </div>
                    <ChevronRight size={14} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 shrink-0" />
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function UnpaidPage() {
  const [search, setSearch]       = useState('')
  const [selectedClient, setSelectedClient] = useState(null)

  const { data: overview } = useQuery({
    queryKey: queryKeys.unpaid.overview,
    queryFn: unpaidApi.getOverview,
  })

  const { data: rawClients = [], isLoading } = useQuery({
    queryKey: queryKeys.unpaid.clients,
    queryFn: unpaidApi.getClients,
  })

  const clients = useMemo(() => {
    const list = Array.isArray(rawClients) ? rawClients : rawClients?.clients ?? []
    if (!search.trim()) return list
    const q = search.toLowerCase()
    return list.filter(c =>
      (c.client?.name || c.client?.nom || c.name || c.nom || '').toLowerCase().includes(q) ||
      (c.client?.phone || c.client?.phones?.[0]?.phoneNumber || c.phone || '').includes(q)
    )
  }, [rawClients, search])

  const totalUnpaid = Number(overview?.totalRemaining ?? overview?.totalUnpaid ?? 0)
  const clientCount = Number(overview?.clientsWithDebt ?? overview?.clientCount ?? rawClients.length ?? 0)
  const orderCount  = Number(overview?.totalOrders ?? 0)

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div>
        <h1 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-[var(--text)] tracking-tight">Impayés</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">Suivi des dettes clients</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-red-500" />
          <div className="w-9 h-9 rounded-[10px] bg-red-100 flex items-center justify-center mb-2">
            <DollarSign size={17} className="text-red-600" />
          </div>
          <p className="text-[11px] font-bold text-red-600 uppercase tracking-wider">Total dû</p>
          <p className="font-['Plus_Jakarta_Sans'] text-xl font-bold text-red-700 mt-0.5">{fmt(totalUnpaid)} DH</p>
        </div>
        <div className="bg-white border border-[rgba(0,0,0,0.06)] rounded-2xl p-4 shadow-sm">
          <div className="w-9 h-9 rounded-[10px] bg-amber-50 flex items-center justify-center mb-2">
            <Users size={17} className="text-amber-600" />
          </div>
          <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Clients</p>
          <p className="font-['Plus_Jakarta_Sans'] text-xl font-bold text-[var(--text)] mt-0.5">{fmtN(clientCount)}</p>
        </div>
        <div className="bg-white border border-[rgba(0,0,0,0.06)] rounded-2xl p-4 shadow-sm">
          <div className="w-9 h-9 rounded-[10px] bg-blue-50 flex items-center justify-center mb-2">
            <Package size={17} className="text-blue-600" />
          </div>
          <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Commandes</p>
          <p className="font-['Plus_Jakarta_Sans'] text-xl font-bold text-[var(--text)] mt-0.5">{fmtN(orderCount)}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un client…"
          className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-[rgba(0,0,0,0.1)] bg-white text-sm text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] shadow-sm"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)]">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Client list */}
      <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-[rgba(0,0,0,0.05)]">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <div className="w-10 h-10 rounded-full bg-[var(--bg)] shimmer shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-[var(--bg)] rounded shimmer" />
                  <div className="h-3 w-24 bg-[var(--bg)] rounded shimmer" />
                </div>
                <div className="h-6 w-20 bg-[var(--bg)] rounded shimmer" />
              </div>
            ))}
          </div>
        ) : clients.length === 0 ? (
          <div className="py-16 text-center">
            {totalUnpaid <= 0 ? (
              <div className="opacity-70">
                <p className="text-3xl mb-2">✓</p>
                <p className="font-bold text-green-600">Tout est réglé !</p>
                <p className="text-sm text-[var(--text-muted)] mt-1">Aucune dette en cours</p>
              </div>
            ) : (
              <div className="opacity-40">
                <Users size={36} className="mx-auto mb-3 text-[var(--text-muted)]" />
                <p className="text-sm font-semibold text-[var(--text-secondary)]">Aucun résultat</p>
              </div>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[rgba(0,0,0,0.05)]">
            {clients.map((entry, i) => {
              const client    = entry.client ?? entry
              const clientId  = client?.id ?? entry.clientId
              const name      = client?.name ?? client?.nom ?? '—'
              const phone     = client?.phone ?? client?.phones?.[0]?.phoneNumber
              const remaining = Number(entry.totalRemaining ?? entry.remainingAmount ?? entry.totalDebt ?? 0)
              const orders    = Number(entry.orderCount ?? entry.orders?.length ?? 0)
              const tier      = debtTier(remaining)

              return (
                <button
                  key={clientId || i}
                  onClick={() => setSelectedClient(clientId)}
                  className="w-full text-start flex items-center gap-4 px-5 py-4 hover:bg-[var(--bg)] transition-colors group"
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                    style={{ backgroundColor: tier.bg, color: tier.color, border: `1px solid ${tier.border}` }}>
                    {name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[var(--text)] truncate">{name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {phone && <span className="text-[11px] text-[var(--text-muted)]">{phone}</span>}
                      <span className="text-[11px] text-[var(--text-muted)]">· {orders} commande{orders !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold" style={{ color: tier.color }}>{fmt(remaining)} DH</p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: tier.bg, color: tier.color }}>
                      {tier.label}
                    </span>
                  </div>
                  <ChevronRight size={14} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 shrink-0" />
                </button>
              )
            })}
          </div>
        )}
      </div>

      {selectedClient && (
        <ClientDebtModal clientId={selectedClient} onClose={() => setSelectedClient(null)} />
      )}
    </div>
  )
}
