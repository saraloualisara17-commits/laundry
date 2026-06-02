import React, { useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Phone, MessageCircle, MapPin, Package,
  CreditCard, Loader2, X, Check, ChevronRight
} from 'lucide-react'
import { ordersApi } from '../../services/ordersApi'
import { livreurApi } from '../../services/livreurApi'
import { queryKeys } from '../../lib/queryKeys'
import { StatusBadge } from '../../components/StatusBadge'

const fmt  = (v) => Number(v || 0).toLocaleString('fr-MA', { minimumFractionDigits: 2 })
const PAYMENT_MODES = ['ESPECES', 'VIREMENT', 'CHEQUE', 'CARTE']

export default function DeliveryDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [payAmount, setPayAmount] = useState('')
  const [payMode, setPayMode]     = useState('ESPECES')
  const idempotencyKey            = useRef(crypto.randomUUID())

  const { data: order, isLoading } = useQuery({
    queryKey: queryKeys.orders.detail(id),
    queryFn:  () => ordersApi.getById(id),
    enabled:  !!id,
  })

  const { data: payments = [] } = useQuery({
    queryKey: queryKeys.orders.payments(id),
    queryFn:  () => ordersApi.getPayments(id),
    enabled:  !!id,
  })

  const payMutation = useMutation({
    mutationFn: (data) => livreurApi.recordPayment(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.orders.detail(id) })
      qc.invalidateQueries({ queryKey: queryKeys.orders.payments(id) })
      qc.invalidateQueries({ queryKey: queryKeys.livreur.readyForDelivery })
      idempotencyKey.current = crypto.randomUUID()
      setPayAmount('')
    },
  })

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 size={28} className="animate-spin text-[var(--primary)]" />
    </div>
  )

  if (!order) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 opacity-50">
      <p className="font-semibold text-[var(--text)]">Commande introuvable</p>
      <button onClick={() => navigate(-1)} className="text-sm font-bold text-[var(--primary)] hover:underline">Retour</button>
    </div>
  )

  const remaining = Math.max(0, Number(order.montantTotal) - Number(order.montantPaye))
  const phone     = order.client?.phone || order.client?.phones?.[0]?.phoneNumber

  return (
    <div className="space-y-4 animate-fade-in pb-6">
      {/* Back */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-xl border border-[rgba(0,0,0,0.08)] bg-white shadow-sm text-[var(--text-secondary)] hover:text-[var(--primary)]">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-[var(--text)] truncate">{order.numeroCommande}</h1>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-xs text-[var(--text-muted)]">{order.client?.name || order.client?.nom}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 items-start">

        {/* Left — order info */}
        <div className="space-y-4">
          {/* Client */}
          <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.07)] shadow-sm p-5">
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Client</p>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[var(--primary-surface)] text-[var(--primary)] flex items-center justify-center font-bold">
                {(order.client?.name || order.client?.nom || '?')[0].toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-[var(--text)]">{order.client?.name || order.client?.nom}</p>
                {order.client?.email && <p className="text-xs text-[var(--text-muted)]">{order.client.email}</p>}
              </div>
            </div>
            {phone && (
              <div className="flex gap-2">
                <a href={`tel:${phone}`}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[rgba(0,0,0,0.1)] text-sm font-bold text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors">
                  <Phone size={14} /> {phone}
                </a>
                <a href={`https://wa.me/${phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-green-50 border border-green-200 text-sm font-bold text-green-700 hover:bg-green-100 transition-colors">
                  <MessageCircle size={14} /> WhatsApp
                </a>
              </div>
            )}
            {order.deliveryAddress && (
              <div className="flex items-start gap-2 mt-3 text-sm text-[var(--text-secondary)]">
                <MapPin size={14} className="shrink-0 mt-0.5 text-[var(--text-muted)]" />
                <span>{order.deliveryAddress}</span>
              </div>
            )}
          </div>

          {/* Items */}
          <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.07)] shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-[rgba(0,0,0,0.05)]">
              <p className="text-sm font-bold text-[var(--text)]">Articles ({order.commandeTapis?.length || 0})</p>
            </div>
            {!order.commandeTapis?.length ? (
              <p className="text-sm text-[var(--text-muted)] text-center py-6">Aucun article</p>
            ) : (
              <div className="divide-y divide-[rgba(0,0,0,0.05)]">
                {order.commandeTapis.map((item, i) => (
                  <div key={item.id || i} className="flex items-center justify-between px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[var(--text)] truncate">{item.product?.nom || item.nomProduit || `Article ${i + 1}`}</p>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        Qté: {item.quantite}
                        {item.tagNumero && ` · #${item.tagNumero}`}
                        {item.largeur && item.hauteur && ` · ${item.largeur}×${item.hauteur}`}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-[var(--text)] shrink-0 ml-3">{fmt(item.prixFinal || item.prixUnitaire * item.quantite)} DH</p>
                  </div>
                ))}
                <div className="flex justify-between px-5 py-3 bg-[var(--bg)]">
                  <span className="text-sm font-bold text-[var(--text-muted)]">Total</span>
                  <span className="font-bold text-[var(--text)]">{fmt(order.montantTotal)} DH</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right — payment sticky panel */}
        <div className="lg:sticky lg:top-6 space-y-4">
          <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.07)] shadow-sm p-5">
            <p className="text-sm font-bold text-[var(--text)] mb-4">Paiement</p>

            {/* Financial summary */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: 'Total',  value: `${fmt(order.montantTotal)} DH`,  color: 'text-[var(--text)]' },
                { label: 'Payé',   value: `${fmt(order.montantPaye)} DH`,   color: 'text-green-600' },
                { label: 'Reste',  value: remaining > 0 ? `${fmt(remaining)} DH` : '✓', color: remaining > 0 ? 'text-amber-600' : 'text-green-600' },
              ].map((s, i) => (
                <div key={i} className="text-center p-2 rounded-xl bg-[var(--bg)]">
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase">{s.label}</p>
                  <p className={`text-sm font-bold mt-0.5 ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>

            {remaining > 0 && (
              <div className="space-y-3">
                <input type="number" step="0.01" min="0.01" value={payAmount}
                  onChange={e => setPayAmount(e.target.value)} placeholder="Montant (DH)"
                  className="w-full px-3 py-2.5 rounded-xl border border-[rgba(0,0,0,0.1)] text-sm text-[var(--text)] focus:outline-none focus:border-[var(--primary)] font-bold" />
                {remaining > 0 && (
                  <button type="button" onClick={() => setPayAmount(remaining.toFixed(2))} className="text-xs font-bold text-[var(--primary)] hover:underline">
                    Tout régler ({fmt(remaining)} DH)
                  </button>
                )}
                <div className="grid grid-cols-2 gap-1.5">
                  {PAYMENT_MODES.map(m => (
                    <button key={m} onClick={() => setPayMode(m)}
                      className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${payMode === m ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : 'border-[rgba(0,0,0,0.1)] text-[var(--text-secondary)]'}`}>
                      {m}
                    </button>
                  ))}
                </div>
                {payMutation.isError && (
                  <p className="text-xs text-red-600">{payMutation.error?.response?.data?.message || 'Erreur'}</p>
                )}
                <button
                  onClick={() => payMutation.mutate({ montant: parseFloat(payAmount), modePaiement: payMode, idempotencyKey: idempotencyKey.current })}
                  disabled={payMutation.isPending || !payAmount || parseFloat(payAmount) <= 0}
                  className="w-full py-3 bg-[var(--primary)] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                  {payMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                  <CreditCard size={14} />
                  Enregistrer
                </button>
              </div>
            )}

            {/* Payment history */}
            {payments.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[rgba(0,0,0,0.05)] space-y-2">
                <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Historique</p>
                {payments.map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-[var(--text)]">{fmt(p.montant)} DH</span>
                    <span className="text-[11px] bg-[var(--bg)] text-[var(--text-muted)] px-2 py-0.5 rounded-md font-medium">{p.modePaiement}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
