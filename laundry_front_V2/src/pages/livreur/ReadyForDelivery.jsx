import React, { useState, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Truck, Phone, MessageCircle, MapPin, Package,
  ChevronRight, Loader2, X, Check, CreditCard, XCircle
} from 'lucide-react'
import { livreurApi } from '../../services/livreurApi'
import { queryKeys } from '../../lib/queryKeys'
import { StatusBadge } from '../../components/StatusBadge'
import ConfirmModal from '../../components/ui/ConfirmModal'

const fmt  = (v) => Number(v || 0).toLocaleString('fr-MA', { minimumFractionDigits: 2 })
const PAYMENT_MODES = ['ESPECES', 'VIREMENT', 'CHEQUE', 'CARTE']

// ── Quick Payment Modal ───────────────────────────────────────────────────────
function PaymentModal({ order, onClose }) {
  const qc = useQueryClient()
  const [amount, setAmount] = useState('')
  const [mode, setMode]     = useState('ESPECES')
  const idempotencyKey      = useRef(crypto.randomUUID())

  const remaining = Math.max(0, Number(order?.montantTotal) - Number(order?.montantPaye))

  const mutation = useMutation({
    mutationFn: (data) => livreurApi.recordPayment(order.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.livreur.readyForDelivery })
      qc.invalidateQueries({ queryKey: queryKeys.orders.detail(String(order.id)) })
      idempotencyKey.current = crypto.randomUUID()
      onClose()
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="px-6 pt-5 pb-4 border-b border-[rgba(0,0,0,0.06)] flex items-center justify-between">
          <div>
            <h3 className="font-bold text-[var(--text)]">Enregistrer paiement</h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{order?.client?.name || order?.client?.nom}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--bg)] text-[var(--text-muted)]"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-4">
          {remaining > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm">
              <span className="text-amber-700 font-semibold">Reste à payer: </span>
              <span className="font-bold text-amber-800">{fmt(remaining)} DH</span>
            </div>
          )}
          <div>
            <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 block">Montant (DH)</label>
            <input type="number" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="0.00" autoFocus
              className="w-full px-4 py-2.5 rounded-xl border border-[rgba(0,0,0,0.1)] text-[var(--text)] text-lg font-bold focus:outline-none focus:border-[var(--primary)]" />
            {remaining > 0 && (
              <button type="button" onClick={() => setAmount(remaining.toFixed(2))} className="mt-1.5 text-xs font-bold text-[var(--primary)] hover:underline">
                Tout régler ({fmt(remaining)} DH)
              </button>
            )}
          </div>
          <div>
            <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 block">Mode</label>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_MODES.map(m => (
                <button key={m} type="button" onClick={() => setMode(m)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${mode === m ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : 'bg-white text-[var(--text-secondary)] border-[rgba(0,0,0,0.1)] hover:border-[var(--primary)]'}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          {mutation.isError && (
            <p className="text-xs text-red-600 font-semibold">{mutation.error?.response?.data?.message || 'Erreur'}</p>
          )}
          <button onClick={() => mutation.mutate({ montant: parseFloat(amount), modePaiement: mode, idempotencyKey: idempotencyKey.current })}
            disabled={mutation.isPending || !amount || parseFloat(amount) <= 0}
            className="w-full py-3 bg-[var(--primary)] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
            {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Delivery Card ─────────────────────────────────────────────────────────────
function DeliveryCard({ order, onPayment, onCancel }) {
  const navigate = useNavigate()
  const phone    = order.client?.phone || order.client?.phones?.[0]?.phoneNumber
  const remaining = Math.max(0, Number(order.montantTotal) - Number(order.montantPaye))

  return (
    <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.07)] shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="flex items-start gap-3 p-4">
        <div className="w-10 h-10 rounded-xl bg-[var(--primary-surface)] text-[var(--primary)] flex items-center justify-center font-bold text-xs shrink-0">
          #{(order.numeroCommande || '').slice(-3)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[var(--text)]">{order.client?.name || order.client?.nom || '—'}</p>
          <p className="text-xs font-mono text-[var(--text-muted)] mt-0.5">{order.numeroCommande}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* Details */}
      <div className="px-4 pb-3 space-y-2 border-t border-[rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between pt-3 text-sm">
          <div className="flex items-center gap-2 text-[var(--text-secondary)]">
            <Package size={14} />
            <span>{order.commandeTapis?.length || 0} article{(order.commandeTapis?.length || 0) !== 1 ? 's' : ''}</span>
          </div>
          <div className="text-right">
            <p className="font-bold text-[var(--text)]">{fmt(order.montantTotal)} DH</p>
            {remaining > 0 && <p className="text-[11px] text-amber-600 font-semibold">Reste: {fmt(remaining)} DH</p>}
            {remaining <= 0 && <p className="text-[11px] text-green-600 font-semibold">✓ Réglé</p>}
          </div>
        </div>
        {order.deliveryAddress && (
          <div className="flex items-start gap-1.5 text-xs text-[var(--text-secondary)]">
            <MapPin size={12} className="shrink-0 mt-0.5" />
            <span className="truncate">{order.deliveryAddress}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 pb-4 flex gap-2">
        {phone && (
          <>
            <a href={`tel:${phone}`}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-[rgba(0,0,0,0.1)] text-xs font-bold text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors">
              <Phone size={13} />
              Appeler
            </a>
            <a href={`https://wa.me/${phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-green-50 border border-green-200 text-xs font-bold text-green-700 hover:bg-green-100 transition-colors">
              <MessageCircle size={13} />
              WA
            </a>
          </>
        )}
        {remaining > 0 && (
          <button onClick={() => onPayment(order)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[var(--primary)] text-white text-xs font-bold hover:opacity-90 transition-opacity">
            <CreditCard size={13} />
            Paiement
          </button>
        )}
        <button onClick={() => navigate(`/livreur/delivery/${order.id}`)}
          className="w-8 h-8 flex items-center justify-center rounded-xl border border-[rgba(0,0,0,0.08)] text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors shrink-0">
          <ChevronRight size={14} />
        </button>
        <button onClick={() => onCancel(order)}
          className="w-8 h-8 flex items-center justify-center rounded-xl border border-red-200 text-red-400 hover:bg-red-50 transition-colors shrink-0">
          <XCircle size={14} />
        </button>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ReadyForDelivery() {
  const qc = useQueryClient()
  const [paymentOrder, setPaymentOrder] = useState(null)
  const [cancelOrder,  setCancelOrder]  = useState(null)

  const { data: deliveries = [], isLoading } = useQuery({
    queryKey: queryKeys.livreur.readyForDelivery,
    queryFn:  livreurApi.getReadyForDelivery,
    refetchInterval: 60_000,
  })

  const cancelMutation = useMutation({
    mutationFn: (id) => livreurApi.cancelDelivery(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.livreur.readyForDelivery })
      setCancelOrder(null)
    },
  })

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-[var(--text)] tracking-tight">Livraisons</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          {isLoading ? '…' : `${deliveries.length} commande${deliveries.length !== 1 ? 's' : ''} à livrer`}
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-48 bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] shimmer" />
          ))}
        </div>
      ) : deliveries.length === 0 ? (
        <div className="py-20 text-center opacity-40">
          <Truck size={40} className="mx-auto mb-3 text-[var(--text-muted)]" />
          <p className="text-sm font-semibold text-[var(--text-secondary)]">Aucune livraison en attente</p>
        </div>
      ) : (
        <div className="space-y-3">
          {deliveries.map(order => (
            <DeliveryCard
              key={order.id}
              order={order}
              onPayment={setPaymentOrder}
              onCancel={setCancelOrder}
            />
          ))}
        </div>
      )}

      {paymentOrder && (
        <PaymentModal order={paymentOrder} onClose={() => setPaymentOrder(null)} />
      )}
      <ConfirmModal
        isOpen={!!cancelOrder}
        onClose={() => setCancelOrder(null)}
        onConfirm={() => cancelMutation.mutate(cancelOrder?.id)}
        loading={cancelMutation.isPending}
        title="Annuler la livraison ?"
        message={`La commande ${cancelOrder?.numeroCommande} sera marquée comme échec de livraison.`}
        confirmText="Annuler"
        type="warning"
      />
    </div>
  )
}
