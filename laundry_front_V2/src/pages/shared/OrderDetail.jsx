import React, { useState, useCallback, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import {
  ArrowLeft, RefreshCw, Loader2, AlertTriangle, Package,
  Phone, MessageCircle, MapPin, Clock, CreditCard, User,
  CheckCircle2, Truck, XCircle, ChevronDown, ChevronUp,
  Plus, Trash2, Camera, Image, ChevronRight, Receipt,
  History, Edit2, Check, X
} from 'lucide-react'
import { ordersApi } from '../../services/ordersApi'
import { usersApi } from '../../services/usersApi'
import { queryKeys } from '../../lib/queryKeys'
import { StatusBadge } from '../../components/StatusBadge'
import { STATUS_LABELS, STATUS_BADGE_STYLES } from '../../constants/statusColors'
import { ORDER_WORKFLOW, isCancelled, isDelivered } from '../../constants/orderWorkflow'
import { useOrderPermissions } from '../../hooks/useOrderPermissions'
import ConfirmModal from '../../components/ui/ConfirmModal'

const fmt = (v) => Number(v || 0).toLocaleString('fr-MA', { minimumFractionDigits: 2 })
const fmtN = (v) => Number(v || 0).toLocaleString('fr-MA')
const fmtDate = (d) => d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

const PAYMENT_MODES = ['ESPECES', 'VIREMENT', 'CHEQUE', 'CARTE']

// ── Payment Modal ─────────────────────────────────────────────────────────────
function PaymentModal({ isOpen, onClose, orderId, remaining, onSuccess }) {
  const qc = useQueryClient()
  const [amount, setAmount] = useState('')
  const [mode, setMode] = useState('ESPECES')
  const [note, setNote] = useState('')
  const idempotencyKey = useRef(crypto.randomUUID())

  const mutation = useMutation({
    mutationFn: (data) => ordersApi.addPayment(orderId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) })
      qc.invalidateQueries({ queryKey: queryKeys.orders.payments(orderId) })
      idempotencyKey.current = crypto.randomUUID()
      onSuccess?.()
      onClose()
      setAmount('')
      setMode('ESPECES')
      setNote('')
    },
  })

  const handleSubmit = useCallback((e) => {
    e.preventDefault()
    const n = parseFloat(amount)
    if (!n || n <= 0) return
    mutation.mutate({ montant: n, modePaiement: mode, notes: note, idempotencyKey: idempotencyKey.current })
  }, [amount, mode, note, mutation])

  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="px-6 pt-5 pb-4 border-b border-[rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-[var(--text)] text-lg">Enregistrer un paiement</h3>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--bg)] text-[var(--text-muted)]">
              <X size={16} />
            </button>
          </div>
          {remaining > 0 && (
            <p className="text-sm text-[var(--text-muted)] mt-1">Reste à payer: <strong className="text-amber-600">{fmt(remaining)} DH</strong></p>
          )}
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 block">Montant (DH)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-2.5 rounded-xl border border-[rgba(0,0,0,0.1)] text-[var(--text)] text-lg font-bold focus:outline-none focus:border-[var(--primary)] bg-white"
              autoFocus
            />
            {remaining > 0 && (
              <button type="button" onClick={() => setAmount(remaining.toFixed(2))} className="mt-1.5 text-xs font-bold text-[var(--primary)] hover:underline">
                Tout régler ({fmt(remaining)} DH)
              </button>
            )}
          </div>
          <div>
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 block">Mode</label>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_MODES.map(m => (
                <button key={m} type="button" onClick={() => setMode(m)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${mode === m ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : 'bg-white text-[var(--text-secondary)] border-[rgba(0,0,0,0.1)] hover:border-[var(--primary)]'}`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 block">Note (optionnel)</label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Commentaire…"
              className="w-full px-4 py-2.5 rounded-xl border border-[rgba(0,0,0,0.1)] text-[var(--text)] text-sm focus:outline-none focus:border-[var(--primary)] bg-white"
            />
          </div>
          {mutation.isError && (
            <p className="text-xs text-red-600 font-semibold">{mutation.error?.response?.data?.message || 'Erreur lors du paiement'}</p>
          )}
          <button
            type="submit"
            disabled={mutation.isPending || !amount || parseFloat(amount) <= 0}
            className="w-full py-3 bg-[var(--primary)] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
          >
            {mutation.isPending && <Loader2 size={15} className="animate-spin" />}
            Enregistrer
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Assign Driver Modal ───────────────────────────────────────────────────────
function AssignDriverModal({ isOpen, onClose, orderId, type = 'delivery', currentDriverId, onSuccess }) {
  const qc = useQueryClient()
  const [selectedId, setSelectedId] = useState(currentDriverId || '')

  const { data: users = [] } = useQuery({
    queryKey: queryKeys.users.active,
    queryFn: usersApi.getActive,
    enabled: isOpen,
    select: d => Array.isArray(d) ? d.filter(u => u.role === 'LIVREUR') : [],
  })

  const mutation = useMutation({
    mutationFn: (driverId) => type === 'delivery'
      ? ordersApi.assignDeliveryDriver(orderId, { driverId })
      : ordersApi.assignPickupDriver(orderId, { driverId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) })
      onSuccess?.()
      onClose()
    },
  })

  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="px-6 pt-5 pb-4 border-b border-[rgba(0,0,0,0.06)] flex items-center justify-between">
          <h3 className="font-bold text-[var(--text)]">
            {type === 'delivery' ? 'Assigner livreur livraison' : 'Assigner livreur collecte'}
          </h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--bg)] text-[var(--text-muted)]">
            <X size={16} />
          </button>
        </div>
        <div className="p-4 space-y-2">
          {users.length === 0 && (
            <p className="text-sm text-[var(--text-muted)] text-center py-4">Aucun livreur disponible</p>
          )}
          {users.map(u => (
            <button key={u.id} onClick={() => setSelectedId(String(u.id))}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${selectedId === String(u.id) ? 'border-[var(--primary)] bg-[var(--primary-surface)]' : 'border-[rgba(0,0,0,0.08)] hover:border-[var(--primary)]'}`}
            >
              <div className="w-8 h-8 rounded-full bg-[var(--primary-surface)] text-[var(--primary)] flex items-center justify-center text-xs font-bold">
                {u.name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 text-start">
                <p className="text-sm font-semibold text-[var(--text)]">{u.name}</p>
                {u.phone && <p className="text-[11px] text-[var(--text-muted)]">{u.phone}</p>}
              </div>
              {selectedId === String(u.id) && <Check size={16} className="text-[var(--primary)]" />}
            </button>
          ))}
        </div>
        <div className="px-6 pb-5 pt-2">
          <button
            onClick={() => mutation.mutate(selectedId)}
            disabled={!selectedId || mutation.isPending}
            className="w-full py-3 bg-[var(--primary)] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
            Confirmer
          </button>
          {mutation.isError && (
            <p className="text-xs text-red-600 font-semibold text-center mt-2">{mutation.error?.response?.data?.message || 'Erreur'}</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Status Change Modal ───────────────────────────────────────────────────────
function StatusModal({ isOpen, onClose, orderId, currentStatus, onSuccess }) {
  const qc = useQueryClient()
  const [target, setTarget] = useState('')
  const [comment, setComment] = useState('')

  const ALL_STATUSES = Object.keys(STATUS_LABELS)

  const mutation = useMutation({
    mutationFn: (data) => ordersApi.updateStatus(orderId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) })
      qc.invalidateQueries({ queryKey: queryKeys.orders.history(orderId) })
      onSuccess?.()
      onClose()
      setTarget('')
      setComment('')
    },
  })

  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="px-6 pt-5 pb-4 border-b border-[rgba(0,0,0,0.06)] flex items-center justify-between">
          <h3 className="font-bold text-[var(--text)]">Changer le statut</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--bg)] text-[var(--text-muted)]">
            <X size={16} />
          </button>
        </div>
        <div className="p-4 space-y-2 max-h-60 overflow-y-auto">
          {ALL_STATUSES.filter(s => s !== currentStatus).map(s => {
            const cfg = STATUS_BADGE_STYLES[s]
            return (
              <button key={s} onClick={() => setTarget(s)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all ${target === s ? 'border-[var(--primary)] bg-[var(--primary-surface)]' : 'border-[rgba(0,0,0,0.08)] hover:border-[rgba(0,0,0,0.15)]'}`}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cfg?.dot }} />
                <span className="text-sm font-semibold text-[var(--text)]">{STATUS_LABELS[s]}</span>
                {target === s && <Check size={14} className="text-[var(--primary)] ml-auto" />}
              </button>
            )
          })}
        </div>
        <div className="px-6 pb-5 pt-2 space-y-3">
          <input
            type="text"
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Commentaire (optionnel)…"
            className="w-full px-4 py-2.5 rounded-xl border border-[rgba(0,0,0,0.1)] text-sm text-[var(--text)] focus:outline-none focus:border-[var(--primary)]"
          />
          <button
            onClick={() => mutation.mutate({ status: target, commentaire: comment })}
            disabled={!target || mutation.isPending}
            className="w-full py-3 bg-[var(--primary)] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
            Confirmer
          </button>
          {mutation.isError && (
            <p className="text-xs text-red-600 font-semibold text-center">{mutation.error?.response?.data?.message || 'Erreur'}</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function OrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const user = useSelector(s => s.auth.user)

  const [showPaymentModal, setShowPaymentModal]   = useState(false)
  const [showAssignModal, setShowAssignModal]     = useState(false)
  const [showPickupModal, setShowPickupModal]     = useState(false)
  const [showStatusModal, setShowStatusModal]     = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showHistory, setShowHistory]             = useState(false)
  const [showItems, setShowItems]                 = useState(true)

  const { data: order, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.orders.detail(id),
    queryFn: () => ordersApi.getById(id),
    enabled: !!id,
  })

  const { data: payments = [] } = useQuery({
    queryKey: queryKeys.orders.payments(id),
    queryFn: () => ordersApi.getPayments(id),
    enabled: !!id,
  })

  const { data: history = [] } = useQuery({
    queryKey: queryKeys.orders.history(id),
    queryFn: () => ordersApi.getHistory(id),
    enabled: !!id && showHistory,
  })

  const perms = useOrderPermissions(order)

  const workflowStep = ORDER_WORKFLOW[order?.status]

  const statusMutation = useMutation({
    mutationFn: (data) => ordersApi.updateStatus(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.orders.detail(id) })
      qc.invalidateQueries({ queryKey: queryKeys.orders.history(id) })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => ordersApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.orders.all })
      const role = user?.role?.toUpperCase()
      navigate(role === 'EMPLOYE' ? '/employe/commandes' : '/admin/commandes')
    },
  })

  const handleWorkflowAction = useCallback(() => {
    if (!workflowStep || workflowStep.disabled) return
    if (workflowStep.requiresDriverModal) { setShowAssignModal(true); return }
    statusMutation.mutate({ status: workflowStep.nextStatus })
  }, [workflowStep, statusMutation])

  const remaining = useMemo(() => {
    const total = Number(order?.montantTotal) || 0
    const paid  = Number(order?.montantPaye)  || 0
    return Math.max(0, total - paid)
  }, [order?.montantTotal, order?.montantPaye])

  const role = user?.role?.toUpperCase()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-[var(--primary)]" />
      </div>
    )
  }

  if (isError || !order) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 opacity-50">
        <AlertTriangle size={36} className="text-amber-400" />
        <p className="font-semibold text-[var(--text)]">Commande introuvable</p>
        <button onClick={() => navigate(-1)} className="text-sm font-bold text-[var(--primary)] hover:underline">Retour</button>
      </div>
    )
  }

  const isCancelledOrder = isCancelled(order.status)
  const isDeliveredOrder = isDelivered(order.status)

  return (
    <div className="space-y-5 animate-fade-in pb-24 lg:pb-6">

      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-xl border border-[rgba(0,0,0,0.08)] bg-white shadow-sm hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors text-[var(--text-secondary)]">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-['Plus_Jakarta_Sans'] text-xl font-bold text-[var(--text)] tracking-tight truncate">
              {order.numeroCommande || `Commande #${order.id}`}
            </h1>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{fmtDate(order.createdAt || order.dateCreation)}</p>
        </div>
        <button onClick={() => refetch()} className="w-9 h-9 flex items-center justify-center rounded-xl border border-[rgba(0,0,0,0.08)] bg-white shadow-sm text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Workflow Banner */}
      {perms.canChangeStatus && workflowStep && !workflowStep.disabled && (
        <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.07)] shadow-sm p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex-1">
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Prochaine action</p>
            <p className="text-sm font-bold text-[var(--text)]">{workflowStep.label}</p>
            {workflowStep.nextStatus && (
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">→ {STATUS_LABELS[workflowStep.nextStatus]}</p>
            )}
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleWorkflowAction}
              disabled={statusMutation.isPending}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {statusMutation.isPending && <Loader2 size={14} className="animate-spin" />}
              {workflowStep.label}
            </button>
            {perms.canChangeStatus && (
              <button onClick={() => setShowStatusModal(true)} className="px-3 py-2.5 rounded-xl border border-[rgba(0,0,0,0.1)] bg-white text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors whitespace-nowrap">
                Autre statut
              </button>
            )}
          </div>
        </div>
      )}

      {/* Financial Card */}
      <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[rgba(0,0,0,0.05)] flex items-center justify-between">
          <h2 className="text-sm font-bold text-[var(--text)]">Finances</h2>
          {perms.canAddPayment && (
            <button onClick={() => setShowPaymentModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--primary-surface)] text-[var(--primary)] text-xs font-bold hover:opacity-80 transition-opacity">
              <Plus size={12} />
              Paiement
            </button>
          )}
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Total</p>
              <p className="font-['Plus_Jakarta_Sans'] text-lg font-bold text-[var(--text)]">{fmt(order.montantTotal)} DH</p>
            </div>
            <div className="text-center">
              <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Payé</p>
              <p className="font-['Plus_Jakarta_Sans'] text-lg font-bold text-green-600">{fmt(order.montantPaye)} DH</p>
            </div>
            <div className="text-center">
              <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Reste</p>
              <p className={`font-['Plus_Jakarta_Sans'] text-lg font-bold ${remaining > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                {remaining > 0 ? `${fmt(remaining)} DH` : '✓ Réglé'}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          {Number(order.montantTotal) > 0 && (
            <div className="h-2 bg-[var(--bg)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (Number(order.montantPaye) / Number(order.montantTotal)) * 100)}%`,
                  backgroundColor: remaining <= 0 ? '#10B981' : '#F59E0B',
                }}
              />
            </div>
          )}

          {/* Payment history */}
          {payments.length > 0 && (
            <div className="space-y-2 pt-1">
              <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Historique paiements</p>
              {payments.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                    <span className="font-semibold text-[var(--text)]">{fmt(p.montant)} DH</span>
                    <span className="text-[11px] text-[var(--text-muted)] font-medium px-2 py-0.5 bg-[var(--bg)] rounded-md">{p.modePaiement}</span>
                  </div>
                  <span className="text-[11px] text-[var(--text-muted)]">{fmtDate(p.datePaiement || p.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Two-column on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Client Card */}
        <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] shadow-sm p-5">
          <h2 className="text-sm font-bold text-[var(--text)] mb-4">Client</h2>
          {order.client ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--primary-surface)] text-[var(--primary)] flex items-center justify-center font-bold text-base">
                  {order.client?.name?.[0] || order.client?.nom?.[0] || '?'}
                </div>
                <div>
                  <p className="font-bold text-[var(--text)]">{order.client?.name || order.client?.nom}</p>
                  {order.client?.email && <p className="text-xs text-[var(--text-muted)]">{order.client.email}</p>}
                </div>
              </div>
              {(order.client?.phone || order.client?.phones?.[0]) && (
                <div className="flex items-center gap-3">
                  <a
                    href={`tel:${order.client?.phone || order.client?.phones?.[0]?.phoneNumber}`}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[rgba(0,0,0,0.08)] text-sm font-semibold text-[var(--text)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
                  >
                    <Phone size={14} />
                    {order.client?.phone || order.client?.phones?.[0]?.phoneNumber}
                  </a>
                  <a
                    href={`https://wa.me/${(order.client?.phone || order.client?.phones?.[0]?.phoneNumber || '').replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[rgba(0,0,0,0.08)] text-sm font-semibold text-[var(--text)] hover:border-green-500 hover:text-green-600 transition-colors"
                  >
                    <MessageCircle size={14} />
                    WhatsApp
                  </a>
                </div>
              )}
              {order.deliveryAddress && (
                <div className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                  <MapPin size={14} className="shrink-0 mt-0.5 text-[var(--text-muted)]" />
                  <span>{order.deliveryAddress}</span>
                </div>
              )}
              <button
                onClick={() => {
                  const cid = order.client?.id
                  if (cid) navigate(role === 'EMPLOYE' ? `/employe/clients/${cid}` : `/admin/clients/${cid}`)
                }}
                className="text-xs font-bold text-[var(--primary)] hover:underline flex items-center gap-1"
              >
                Voir profil client <ChevronRight size={12} />
              </button>
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">—</p>
          )}
        </div>

        {/* Logistics Card */}
        <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] shadow-sm p-5 space-y-3">
          <h2 className="text-sm font-bold text-[var(--text)] mb-1">Logistique</h2>

          {/* Mode */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-muted)] font-medium">Mode</span>
            <span className="font-bold text-[var(--text)]">{order.modeCommande || order.mode || '—'}</span>
          </div>

          {/* Pickup driver */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-muted)] font-medium">Collecte</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[var(--text)]">{order.pickupDriver?.name || '—'}</span>
              {perms.canAssignPickupDriver && (
                <button onClick={() => setShowPickupModal(true)} className="text-[11px] font-bold text-[var(--primary)] hover:underline">Changer</button>
              )}
            </div>
          </div>

          {/* Delivery driver */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-muted)] font-medium">Livraison</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[var(--text)]">{order.deliveryDriver?.name || '—'}</span>
              {perms.canAssignDriver && (
                <button onClick={() => setShowAssignModal(true)} className="text-[11px] font-bold text-[var(--primary)] hover:underline">Assigner</button>
              )}
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="pt-2 border-t border-[rgba(0,0,0,0.05)]">
              <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Notes</p>
              <p className="text-sm text-[var(--text-secondary)]">{order.notes}</p>
            </div>
          )}

          {/* Receipt links */}
          <div className="flex gap-2 pt-2 border-t border-[rgba(0,0,0,0.05)]">
            <a
              href={`/api/commandes/${id}/receipt/order/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-[rgba(0,0,0,0.08)] text-xs font-bold text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
            >
              <Receipt size={13} />
              Reçu PDF
            </a>
            <a
              href={`/api/commandes/${id}/receipt/delivery/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-[rgba(0,0,0,0.08)] text-xs font-bold text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
            >
              <Truck size={13} />
              Bon livraison
            </a>
          </div>
        </div>
      </div>

      {/* Order Items */}
      <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] shadow-sm overflow-hidden">
        <button
          onClick={() => setShowItems(p => !p)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-[var(--bg)] transition-colors"
        >
          <h2 className="text-sm font-bold text-[var(--text)]">
            Articles ({order.commandeTapis?.length || 0})
          </h2>
          {showItems ? <ChevronUp size={16} className="text-[var(--text-muted)]" /> : <ChevronDown size={16} className="text-[var(--text-muted)]" />}
        </button>

        {showItems && (
          <div className="divide-y divide-[rgba(0,0,0,0.05)]">
            {(!order.commandeTapis || order.commandeTapis.length === 0) ? (
              <p className="text-sm text-[var(--text-muted)] text-center py-6">Aucun article</p>
            ) : (
              order.commandeTapis.map((item, idx) => (
                <div key={item.id || idx} className="px-5 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-[var(--text)]">
                          {item.product?.nom || item.nomProduit || `Article ${idx + 1}`}
                        </p>
                        {item.tagNumero && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[var(--bg)] text-[var(--text-muted)] font-mono">
                            #{item.tagNumero}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-[11px] text-[var(--text-muted)]">Qté: {item.quantite}</span>
                        {item.largeur && item.hauteur && (
                          <span className="text-[11px] text-[var(--text-muted)]">{item.largeur}×{item.hauteur}{item.longueur ? `×${item.longueur}` : ''} cm</span>
                        )}
                        {item.poids && <span className="text-[11px] text-[var(--text-muted)]">{item.poids} kg</span>}
                        <span className="text-[11px] text-[var(--text-muted)]">{item.modeTarification || item.pricingMethod}</span>
                      </div>
                      {item.remiseMontant > 0 && (
                        <p className="text-[11px] text-amber-600 font-semibold mt-0.5">
                          Remise: -{fmt(item.remiseMontant)} DH {item.remiseRaison && `· ${item.remiseRaison}`}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-[var(--text)]">{fmt(item.prixFinal || item.prixUnitaire * item.quantite)} DH</p>
                      {item.remiseMontant > 0 && (
                        <p className="text-[11px] text-[var(--text-muted)] line-through">{fmt(item.prixUnitaire * item.quantite)} DH</p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            {/* Total row */}
            {order.commandeTapis?.length > 0 && (
              <div className="px-5 py-3.5 bg-[var(--bg)] flex items-center justify-between">
                <span className="text-sm font-bold text-[var(--text-muted)]">Total</span>
                <span className="font-['Plus_Jakarta_Sans'] text-base font-bold text-[var(--text)]">{fmt(order.montantTotal)} DH</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Images */}
      {order.images?.length > 0 && (
        <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] shadow-sm p-5">
          <h2 className="text-sm font-bold text-[var(--text)] mb-4">Photos ({order.images.length})</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {order.images.filter(img => !img.isArchived).map((img, i) => (
              <a
                key={img.id || i}
                href={img.imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="aspect-square rounded-xl overflow-hidden border border-[rgba(0,0,0,0.08)] hover:opacity-80 transition-opacity bg-[var(--bg)]"
              >
                <img
                  src={img.imageUrl}
                  alt={img.photoType || `Photo ${i + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Status History */}
      <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] shadow-sm overflow-hidden">
        <button
          onClick={() => setShowHistory(p => !p)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-[var(--bg)] transition-colors"
        >
          <div className="flex items-center gap-2">
            <History size={15} className="text-[var(--text-muted)]" />
            <h2 className="text-sm font-bold text-[var(--text)]">Historique des statuts</h2>
          </div>
          {showHistory ? <ChevronUp size={16} className="text-[var(--text-muted)]" /> : <ChevronDown size={16} className="text-[var(--text-muted)]" />}
        </button>
        {showHistory && (
          <div className="px-5 pb-5">
            {history.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] text-center py-4">Aucun historique</p>
            ) : (
              <div className="space-y-3">
                {history.map((h, i) => (
                  <div key={h.id || i} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[var(--primary)] mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {h.ancienStatut && (
                          <>
                            <StatusBadge status={h.ancienStatut} showDot={false} />
                            <span className="text-[var(--text-muted)]">→</span>
                          </>
                        )}
                        <StatusBadge status={h.nouveauStatut} showDot={false} />
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] text-[var(--text-muted)]">{fmtDate(h.createdAt || h.dateChangement)}</span>
                        {h.user?.name && <span className="text-[11px] font-semibold text-[var(--text-muted)]">· {h.user.name}</span>}
                      </div>
                      {h.commentaire && <p className="text-xs text-[var(--text-secondary)] mt-0.5 italic">{h.commentaire}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Admin Delete */}
      {perms.canDelete && (
        <div className="bg-white rounded-2xl border border-red-100 p-5">
          <p className="text-sm font-bold text-red-600 mb-2">Zone dangereuse</p>
          <p className="text-xs text-[var(--text-muted)] mb-3">La suppression est irréversible.</p>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 text-red-600 text-sm font-bold border border-red-200 hover:bg-red-100 transition-colors"
          >
            <Trash2 size={14} />
            Supprimer la commande
          </button>
        </div>
      )}

      {/* Modals */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        orderId={id}
        remaining={remaining}
      />
      <AssignDriverModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        orderId={id}
        type="delivery"
        currentDriverId={order.deliveryDriver?.id}
        onSuccess={() => statusMutation.mutate({ status: 'DELIVERED' })}
      />
      <AssignDriverModal
        isOpen={showPickupModal}
        onClose={() => setShowPickupModal(false)}
        orderId={id}
        type="pickup"
        currentDriverId={order.pickupDriver?.id}
      />
      <StatusModal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        orderId={id}
        currentStatus={order.status}
      />
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
        title="Supprimer la commande ?"
        message={`La commande ${order.numeroCommande} sera définitivement supprimée.`}
        confirmText="Supprimer"
        type="danger"
      />

      {/* Bottom action bar — mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-white border-t border-[rgba(0,0,0,0.08)] px-4 py-3 flex items-center gap-3 safe-area-inset-bottom">
        {order.client && (
          <>
            <a
              href={`tel:${order.client?.phone || order.client?.phones?.[0]?.phoneNumber}`}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[rgba(0,0,0,0.1)] text-sm font-bold text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
            >
              <Phone size={15} />
              Appeler
            </a>
            <a
              href={`https://wa.me/${(order.client?.phone || order.client?.phones?.[0]?.phoneNumber || '').replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-50 border border-green-200 text-sm font-bold text-green-700 hover:bg-green-100 transition-colors"
            >
              <MessageCircle size={15} />
              WhatsApp
            </a>
          </>
        )}
        {perms.canAddPayment && (
          <button
            onClick={() => setShowPaymentModal(true)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-bold hover:opacity-90 transition-opacity"
          >
            <CreditCard size={15} />
            Paiement
          </button>
        )}
      </div>
    </div>
  )
}
