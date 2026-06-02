import React, { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Phone, MessageCircle, ShoppingBag, DollarSign,
  TrendingUp, Clock, Edit2, X, Loader2, Package, ChevronRight
} from 'lucide-react'
import { clientsApi } from '../../services/clientsApi'
import { queryKeys } from '../../lib/queryKeys'
import { StatusBadge } from '../../components/StatusBadge'

const fmt  = (v) => Number(v || 0).toLocaleString('fr-MA', { minimumFractionDigits: 2 })
const fmtN = (v) => Number(v || 0).toLocaleString('fr-MA')
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

function EditClientModal({ isOpen, onClose, client }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ name: '', email: '', phone: '' })
  const [error, setError] = useState('')

  React.useEffect(() => {
    if (isOpen && client) {
      setForm({
        name:  client.name  || client.nom  || '',
        email: client.email || '',
        phone: client.phone || client.phones?.[0]?.phoneNumber || '',
      })
      setError('')
    }
  }, [isOpen, client])

  const mutation = useMutation({
    mutationFn: (data) => clientsApi.update(client.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clients.detail(client.id) })
      onClose()
    },
    onError: (e) => setError(e?.response?.data?.message || 'Erreur'),
  })

  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="px-6 pt-5 pb-4 border-b border-[rgba(0,0,0,0.06)] flex items-center justify-between">
          <h3 className="font-bold text-[var(--text)]">Modifier le client</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--bg)] text-[var(--text-muted)]"><X size={16} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); mutation.mutate(form) }} className="p-6 space-y-4">
          {[
            { key: 'name',  label: 'Nom',       type: 'text',  placeholder: 'Nom complet' },
            { key: 'phone', label: 'Téléphone',  type: 'tel',   placeholder: '0612345678' },
            { key: 'email', label: 'Email',      type: 'email', placeholder: 'email@exemple.com' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 block">{f.label}</label>
              <input
                type={f.type}
                value={form[f.key]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full px-4 py-2.5 rounded-xl border border-[rgba(0,0,0,0.1)] text-sm text-[var(--text)] focus:outline-none focus:border-[var(--primary)]"
              />
            </div>
          ))}
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button type="submit" disabled={mutation.isPending}
            className="w-full py-3 bg-[var(--primary)] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
            {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
            Enregistrer
          </button>
        </form>
      </div>
    </div>
  )
}

export default function ClientCommandes() {
  const { clientId } = useParams()
  const navigate = useNavigate()
  const [showEdit, setShowEdit] = useState(false)

  const { data: client, isLoading: loadingClient } = useQuery({
    queryKey: queryKeys.clients.detail(clientId),
    queryFn: () => clientsApi.getById(clientId),
    enabled: !!clientId,
  })

  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: queryKeys.clients.orders(clientId),
    queryFn: () => clientsApi.getOrders(clientId),
    enabled: !!clientId,
  })

  const kpis = useMemo(() => {
    const list = Array.isArray(orders) ? orders : orders?.content ?? []
    const totalInvested = list.reduce((s, o) => s + (Number(o.montantTotal) || 0), 0)
    const totalPaid     = list.reduce((s, o) => s + (Number(o.montantPaye)  || 0), 0)
    const avgBasket     = list.length > 0 ? totalInvested / list.length : 0
    const lastOrder     = list[0]
    const lastActivity  = lastOrder?.createdAt || lastOrder?.dateCreation
    return { count: list.length, totalInvested, totalPaid, avgBasket, lastActivity, list }
  }, [orders])

  const phone = client?.phone || client?.phones?.[0]?.phoneNumber

  if (loadingClient) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-[var(--primary)]" />
      </div>
    )
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 opacity-50">
        <p className="font-semibold text-[var(--text)]">Client introuvable</p>
        <button onClick={() => navigate(-1)} className="text-sm font-bold text-[var(--primary)] hover:underline">Retour</button>
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Back */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-xl border border-[rgba(0,0,0,0.08)] bg-white shadow-sm hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors text-[var(--text-secondary)]">
          <ArrowLeft size={16} />
        </button>
        <h1 className="font-['Plus_Jakarta_Sans'] text-xl font-bold text-[var(--text)] tracking-tight truncate flex-1">
          {client.name || client.nom}
        </h1>
        <button onClick={() => setShowEdit(true)} className="w-9 h-9 flex items-center justify-center rounded-xl border border-[rgba(0,0,0,0.08)] bg-white shadow-sm text-[var(--text-secondary)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors">
          <Edit2 size={15} />
        </button>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] shadow-sm p-5">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[var(--primary-surface)] text-[var(--primary)] flex items-center justify-center text-2xl font-bold shrink-0">
            {(client.name || client.nom || '?')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[var(--text)] text-lg">{client.name || client.nom}</p>
            {client.email && <p className="text-sm text-[var(--text-muted)] mt-0.5">{client.email}</p>}
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Client depuis {fmtDate(client.createdAt)}
            </p>
          </div>
        </div>

        {phone && (
          <div className="flex gap-3 mt-4 pt-4 border-t border-[rgba(0,0,0,0.05)]">
            <a href={`tel:${phone}`}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[rgba(0,0,0,0.1)] text-sm font-bold text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors">
              <Phone size={14} />
              {phone}
            </a>
            <a href={`https://wa.me/${phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-50 border border-green-200 text-sm font-bold text-green-700 hover:bg-green-100 transition-colors">
              <MessageCircle size={14} />
              WhatsApp
            </a>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Commandes',      value: fmtN(kpis.count),          icon: ShoppingBag, accent: '#3B82F6', bg: 'rgba(59,130,246,0.08)' },
          { label: 'Total investi',  value: `${fmt(kpis.totalInvested)} DH`, icon: DollarSign,  accent: '#10B981', bg: 'rgba(16,185,129,0.08)' },
          { label: 'Panier moyen',   value: `${fmt(kpis.avgBasket)} DH`,     icon: TrendingUp,  accent: '#C9A84C', bg: 'rgba(201,168,76,0.08)' },
          { label: 'Dernière visite',value: fmtDate(kpis.lastActivity),      icon: Clock,       accent: '#C2185B', bg: 'rgba(194,24,91,0.08)' },
        ].map((k, i) => (
          <div key={i} className="bg-white rounded-[16px] border border-[rgba(0,0,0,0.06)] shadow-sm p-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ backgroundColor: k.accent }} />
            <div className="w-8 h-8 rounded-[10px] flex items-center justify-center mb-2" style={{ backgroundColor: k.bg }}>
              <k.icon size={16} style={{ color: k.accent }} />
            </div>
            <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.05em]">{k.label}</p>
            <p className="font-['Plus_Jakarta_Sans'] text-base font-bold text-[var(--text)] mt-0.5">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Payment summary */}
      {kpis.totalInvested > 0 && (
        <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] shadow-sm p-5">
          <p className="text-sm font-bold text-[var(--text)] mb-3">Situation financière</p>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-[var(--text-muted)]">Total facturé</span>
            <span className="font-bold text-[var(--text)]">{fmt(kpis.totalInvested)} DH</span>
          </div>
          <div className="flex items-center justify-between text-sm mb-3">
            <span className="text-[var(--text-muted)]">Total payé</span>
            <span className="font-bold text-green-600">{fmt(kpis.totalPaid)} DH</span>
          </div>
          {kpis.totalInvested - kpis.totalPaid > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-muted)]">Reste dû</span>
              <span className="font-bold text-amber-600">{fmt(kpis.totalInvested - kpis.totalPaid)} DH</span>
            </div>
          )}
          <div className="h-2 bg-[var(--bg)] rounded-full mt-3 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, (kpis.totalPaid / kpis.totalInvested) * 100)}%`,
                backgroundColor: kpis.totalPaid >= kpis.totalInvested ? '#10B981' : '#F59E0B',
              }}
            />
          </div>
        </div>
      )}

      {/* Order History */}
      <div>
        <h2 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3">
          Historique des commandes
        </h2>
        <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] shadow-sm overflow-hidden">
          {loadingOrders ? (
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
          ) : kpis.list.length === 0 ? (
            <div className="py-16 text-center opacity-40">
              <Package size={36} className="mx-auto mb-3 text-[var(--text-muted)]" />
              <p className="text-sm font-semibold text-[var(--text-secondary)]">Aucune commande</p>
            </div>
          ) : (
            <div className="divide-y divide-[rgba(0,0,0,0.05)]">
              {kpis.list.map(order => (
                <button
                  key={order.id}
                  onClick={() => navigate(`/admin/commandes/${order.id}`)}
                  className="w-full text-start flex items-center gap-4 px-5 py-4 hover:bg-[var(--bg)] transition-colors group"
                >
                  <div className="w-9 h-9 rounded-[10px] bg-[var(--primary-surface)] text-[var(--primary)] flex items-center justify-center text-[10px] font-bold shrink-0">
                    #{(order.numeroCommande || '').slice(-3)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[var(--text)] truncate">
                      {order.numeroCommande || `#${order.id}`}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] font-medium mt-0.5">
                      {fmtDate(order.createdAt || order.dateCreation)} · {order.commandeTapis?.length || 0} art. · {fmt(order.montantTotal)} DH
                    </p>
                  </div>
                  <StatusBadge status={order.status} />
                  <ChevronRight size={14} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <EditClientModal isOpen={showEdit} onClose={() => setShowEdit(false)} client={client} />
    </div>
  )
}
