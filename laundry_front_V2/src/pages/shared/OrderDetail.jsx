import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  ArrowLeft, Loader2, Package, User, Phone, MapPin, CreditCard,
  Calendar, Hash, Truck, Trash2, MessageSquare, FileText,
  CheckCircle2, Clock, ChevronRight, AlertCircle, X, Check,
  DollarSign, UserCheck, Image,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { fetchCommandeById } from '../../store/admin/adminThunk';
import {
  getOrderHistory,
  updateOrderStatus,
  deleteOrder,
  addPayment,
  assignDeliveryDriver,
  getWhatsappMessage,
  getActiveUsers as getActiveUsersService,
} from '../../store/admin/adminService';
import { StatusBadge } from '../../components/StatusBadge';
import { useOrderPermissions } from '../../hooks/useOrderPermissions';
import { ORDER_WORKFLOW } from '../../constants/orderWorkflow';
import { STATUS_LABELS } from '../../constants/statusColors';

const BASE_URL = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || '');

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const formatCurrency = (v) => `${Number(v || 0).toFixed(2)} MAD`;

export default function OrderDetail() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { selectedCommande: order, loading } = useSelector(s => s.admin);
  const perms = useOrderPermissions(order);

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [drivers, setDrivers] = useState([]);

  // Modal states
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Payment form
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('CASH');
  const [payNote, setPayNote] = useState('');

  // Driver assignment form
  const [selectedDriver, setSelectedDriver] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');

  const workflow = order ? ORDER_WORKFLOW[order.status] : null;

  const load = useCallback(() => {
    dispatch(fetchCommandeById(id));
  }, [dispatch, id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!id) return;
    setHistoryLoading(true);
    getOrderHistory(id)
      .then(res => setHistory(res.data || []))
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, [id]);

  useEffect(() => {
    if (perms.canAssignDriver || perms.canAssignPickupDriver) {
      getActiveUsersService()
        .then(res => setDrivers((res.data || []).filter(u => u.role?.toUpperCase() === 'LIVREUR')))
        .catch(() => {});
    }
  }, [perms.canAssignDriver, perms.canAssignPickupDriver]);

  const handleAdvanceStatus = async () => {
    if (!workflow || workflow.disabled) return;
    if (workflow.requiresDriverModal) {
      setShowDriverModal(true);
      return;
    }
    setShowStatusModal(true);
  };

  const confirmStatusAdvance = async () => {
    setActionLoading(true);
    try {
      await updateOrderStatus(id, { status: workflow.nextStatus });
      toast.success(`Statut mis à jour: ${STATUS_LABELS[workflow.nextStatus] || workflow.nextStatus}`);
      setShowStatusModal(false);
      load();
    } catch {
      toast.error('Erreur lors de la mise à jour du statut');
    } finally {
      setActionLoading(false);
    }
  };

  const confirmDriverAssignment = async () => {
    if (!selectedDriver) { toast.error('Veuillez sélectionner un livreur'); return; }
    setActionLoading(true);
    try {
      await assignDeliveryDriver(id, { deliveryDriverId: selectedDriver, scheduledDeliveryDate: scheduledDate || undefined });
      await updateOrderStatus(id, { status: workflow.nextStatus });
      toast.success('Livreur assigné et statut mis à jour');
      setShowDriverModal(false);
      load();
    } catch {
      toast.error("Erreur lors de l'assignation du livreur");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddPayment = async () => {
    if (!payAmount || isNaN(parseFloat(payAmount))) { toast.error('Montant invalide'); return; }
    setActionLoading(true);
    try {
      await addPayment(id, { montant: parseFloat(payAmount), modePaiement: payMode, notesPaiement: payNote || undefined });
      toast.success('Paiement enregistré');
      setShowPaymentModal(false);
      setPayAmount(''); setPayMode('CASH'); setPayNote('');
      load();
    } catch {
      toast.error('Erreur lors du paiement');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    setActionLoading(true);
    try {
      await deleteOrder(id);
      toast.success('Commande supprimée');
      navigate(-1);
    } catch {
      toast.error('Erreur lors de la suppression');
    } finally {
      setActionLoading(false);
    }
  };

  const handleWhatsApp = async () => {
    try {
      const res = await getWhatsappMessage(id);
      const msg = res.data;
      const phone = order?.client?.phones?.[0]?.phoneNumber || order?.client?.phone || '';
      const clean = phone.replace(/\D/g, '');
      window.open(`https://wa.me/${clean}?text=${encodeURIComponent(msg)}`, '_blank');
    } catch {
      toast.error('Impossible de générer le message WhatsApp');
    }
  };

  if (loading && !order) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <AlertCircle size={40} className="text-red-400" />
        <p className="text-[var(--text-secondary)]">Commande introuvable</p>
        <button onClick={() => navigate(-1)} className="text-sm text-[var(--primary)] underline">Retour</button>
      </div>
    );
  }

  const remaining = Math.max(0, (order.montantTotal || 0) - (order.montantPaye || 0));

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-[var(--bg)] transition-colors">
          <ArrowLeft size={20} className="text-[var(--text-secondary)]" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-bold text-xl text-[var(--text)]">{order.numeroCommande}</h1>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-sm text-[var(--text-secondary)]">{formatDate(order.createdAt)} · {order.modeCommande || '—'}</p>
        </div>
        {/* Actions */}
        <div className="flex items-center gap-2">
          {perms.canDelete && (
            <button onClick={() => setShowDeleteConfirm(true)} className="p-2 rounded-xl hover:bg-red-50 text-red-500 transition-colors">
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Action buttons row */}
      <div className="flex flex-wrap gap-2">
        {workflow && !workflow.disabled && (perms.canEdit || perms.isLivreur) && (
          <button
            onClick={handleAdvanceStatus}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Check size={16} />
            {workflow.label}
          </button>
        )}
        {perms.canAddPayment && (
          <button
            onClick={() => setShowPaymentModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <DollarSign size={16} />
            Ajouter paiement
          </button>
        )}
        {(perms.isAdmin || perms.isEmploye) && (
          <>
            <a
              href={`${BASE_URL}/api/commandes/${id}/receipt/order/pdf?lang=fr`}
              target="_blank" rel="noreferrer"
              className="flex items-center gap-2 px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-xl text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg)] transition-colors"
            >
              <FileText size={16} />
              Reçu PDF
            </a>
            <button onClick={handleWhatsApp} className="flex items-center gap-2 px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-xl text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg)] transition-colors">
              <MessageSquare size={16} />
              WhatsApp
            </button>
          </>
        )}
        {perms.isLivreur && order.status === 'DELIVERED' && (
          <a
            href={`${BASE_URL}/api/commandes/${id}/receipt/delivery/pdf?lang=fr`}
            target="_blank" rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-xl text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg)] transition-colors"
          >
            <FileText size={16} />
            Bon livraison
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Client */}
          <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] p-5 shadow-sm">
            <h2 className="font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
              <User size={16} className="text-[var(--primary)]" /> Client
            </h2>
            <div className="space-y-2">
              <p className="font-semibold text-[var(--text)]">{order.client?.name || '—'}</p>
              {order.client?.phones?.map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <Phone size={13} /> {p.phoneNumber}
                </div>
              ))}
              {order.client?.addresses?.map((a, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <MapPin size={13} /> {a.address}
                </div>
              ))}
            </div>
          </div>

          {/* Items */}
          <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] p-5 shadow-sm">
            <h2 className="font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
              <Package size={16} className="text-[var(--primary)]" /> Articles ({order.tapis?.length || 0})
            </h2>
            {order.tapis?.length > 0 ? (
              <div className="space-y-3">
                {order.tapis.map((item, i) => (
                  <div key={item.id || i} className="p-3 bg-[var(--bg)] rounded-xl">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-sm text-[var(--text)]">{item.product?.nom || `Article #${i + 1}`}</p>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                          Qté: {item.quantite}
                          {item.largeur && ` · ${item.largeur}×${item.hauteur} cm`}
                          {item.tagNumero && ` · Tag: ${item.tagNumero}`}
                        </p>
                        {item.remiseMontant > 0 && (
                          <p className="text-xs text-amber-600 mt-0.5">Remise: -{formatCurrency(item.remiseMontant)}</p>
                        )}
                      </div>
                      <p className="font-bold text-sm text-[var(--text)]">{formatCurrency(item.prixFinal)}</p>
                    </div>
                    {item.images?.length > 0 && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {item.images.map((img, j) => (
                          <a key={j} href={`${BASE_URL}/uploads/${img.imageUrl}`} target="_blank" rel="noreferrer">
                            <img
                              src={`${BASE_URL}/uploads/${img.imageUrl}`}
                              alt={img.photoType}
                              className="w-14 h-14 rounded-lg object-cover border border-[rgba(0,0,0,0.1)]"
                            />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-secondary)]">Aucun article</p>
            )}
          </div>

          {/* Payments */}
          <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] p-5 shadow-sm">
            <h2 className="font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
              <CreditCard size={16} className="text-[var(--primary)]" /> Paiements
            </h2>
            <div className="flex justify-between text-sm mb-3 font-medium">
              <span className="text-[var(--text-secondary)]">Total</span>
              <span className="text-[var(--text)]">{formatCurrency(order.montantTotal)}</span>
            </div>
            <div className="flex justify-between text-sm mb-3 font-medium">
              <span className="text-[var(--text-secondary)]">Payé</span>
              <span className="text-emerald-600">{formatCurrency(order.montantPaye)}</span>
            </div>
            {remaining > 0.05 && (
              <div className="flex justify-between text-sm mb-3 font-bold">
                <span className="text-red-500">Reste</span>
                <span className="text-red-500">{formatCurrency(remaining)}</span>
              </div>
            )}
            {order.paiements?.length > 0 && (
              <div className="mt-3 space-y-2 border-t border-[rgba(0,0,0,0.06)] pt-3">
                {order.paiements.map((p, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">{formatDate(p.datePaiement)} · {p.modePaiement}</span>
                    <span className="font-semibold text-[var(--text)]">{formatCurrency(p.montant)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Order info */}
          <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] p-5 shadow-sm">
            <h2 className="font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
              <Hash size={16} className="text-[var(--primary)]" /> Détails
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Numéro</span><span className="font-semibold">{order.numeroCommande}</span></div>
              <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Mode</span><span className="font-semibold">{order.modeCommande || '—'}</span></div>
              <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Livraison</span><span className="font-semibold">{order.deliveryType || '—'}</span></div>
              {order.deliveryDriver && (
                <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Livreur</span><span className="font-semibold">{order.deliveryDriver.name}</span></div>
              )}
              {order.notes && (
                <div><p className="text-[var(--text-secondary)] mb-1">Notes</p><p className="text-[var(--text)] bg-[var(--bg)] rounded-lg p-2">{order.notes}</p></div>
              )}
            </div>
          </div>

          {/* History */}
          <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] p-5 shadow-sm">
            <h2 className="font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
              <Clock size={16} className="text-[var(--primary)]" /> Historique
            </h2>
            {historyLoading ? (
              <Loader2 size={16} className="animate-spin text-[var(--primary)]" />
            ) : history.length > 0 ? (
              <div className="space-y-3">
                {history.map((h, i) => (
                  <div key={i} className="flex gap-3 text-sm">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-[var(--primary)] mt-1 flex-shrink-0" />
                      {i < history.length - 1 && <div className="w-px flex-1 bg-[rgba(0,0,0,0.1)] mt-1" />}
                    </div>
                    <div className="pb-3">
                      <p className="font-semibold text-[var(--text)]">
                        {STATUS_LABELS[h.nouveauStatut] || h.nouveauStatut}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)]">{formatDate(h.changedAt || h.date)}</p>
                      {h.commentaire && <p className="text-xs text-[var(--text-secondary)] mt-0.5">{h.commentaire}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-secondary)]">Aucun historique</p>
            )}
          </div>
        </div>
      </div>

      {/* Status advance modal */}
      {showStatusModal && (
        <Modal title="Confirmer le changement de statut" onClose={() => setShowStatusModal(false)}>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            Passer la commande à: <strong>{STATUS_LABELS[workflow?.nextStatus] || workflow?.nextStatus}</strong> ?
          </p>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowStatusModal(false)} className="px-4 py-2 rounded-xl border border-[rgba(0,0,0,0.1)] text-sm font-semibold hover:bg-[var(--bg)]">Annuler</button>
            <button onClick={confirmStatusAdvance} disabled={actionLoading} className="px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold hover:opacity-90 flex items-center gap-2">
              {actionLoading && <Loader2 size={14} className="animate-spin" />} Confirmer
            </button>
          </div>
        </Modal>
      )}

      {/* Driver assignment modal */}
      {showDriverModal && (
        <Modal title="Assigner un livreur" onClose={() => setShowDriverModal(false)}>
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-[var(--text)] mb-1">Livreur</label>
              <select
                value={selectedDriver}
                onChange={e => setSelectedDriver(e.target.value)}
                className="w-full px-3 py-2 border border-[rgba(0,0,0,0.1)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              >
                <option value="">Sélectionner un livreur</option>
                {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[var(--text)] mb-1">Date prévue (optionnel)</label>
              <input
                type="datetime-local"
                value={scheduledDate}
                onChange={e => setScheduledDate(e.target.value)}
                className="w-full px-3 py-2 border border-[rgba(0,0,0,0.1)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowDriverModal(false)} className="px-4 py-2 rounded-xl border border-[rgba(0,0,0,0.1)] text-sm font-semibold hover:bg-[var(--bg)]">Annuler</button>
            <button onClick={confirmDriverAssignment} disabled={actionLoading} className="px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold hover:opacity-90 flex items-center gap-2">
              {actionLoading && <Loader2 size={14} className="animate-spin" />} Assigner
            </button>
          </div>
        </Modal>
      )}

      {/* Payment modal */}
      {showPaymentModal && (
        <Modal title="Enregistrer un paiement" onClose={() => setShowPaymentModal(false)}>
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-[var(--text)] mb-1">Montant (MAD)</label>
              <input
                type="number" min="0" step="0.01"
                value={payAmount} onChange={e => setPayAmount(e.target.value)}
                placeholder={`Max: ${formatCurrency(remaining)}`}
                className="w-full px-3 py-2 border border-[rgba(0,0,0,0.1)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[var(--text)] mb-1">Mode de paiement</label>
              <select value={payMode} onChange={e => setPayMode(e.target.value)}
                className="w-full px-3 py-2 border border-[rgba(0,0,0,0.1)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]">
                <option value="CASH">Espèces</option>
                <option value="BANK_TRANSFER">Virement</option>
                <option value="CHECK">Chèque</option>
                <option value="OTHER">Autre</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[var(--text)] mb-1">Note (optionnel)</label>
              <input type="text" value={payNote} onChange={e => setPayNote(e.target.value)}
                className="w-full px-3 py-2 border border-[rgba(0,0,0,0.1)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowPaymentModal(false)} className="px-4 py-2 rounded-xl border border-[rgba(0,0,0,0.1)] text-sm font-semibold hover:bg-[var(--bg)]">Annuler</button>
            <button onClick={handleAddPayment} disabled={actionLoading} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:opacity-90 flex items-center gap-2">
              {actionLoading && <Loader2 size={14} className="animate-spin" />} Enregistrer
            </button>
          </div>
        </Modal>
      )}

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <Modal title="Supprimer la commande" onClose={() => setShowDeleteConfirm(false)}>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            Cette action est irréversible. La commande <strong>{order.numeroCommande}</strong> sera définitivement supprimée.
          </p>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 rounded-xl border border-[rgba(0,0,0,0.1)] text-sm font-semibold hover:bg-[var(--bg)]">Annuler</button>
            <button onClick={handleDelete} disabled={actionLoading} className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:opacity-90 flex items-center gap-2">
              {actionLoading && <Loader2 size={14} className="animate-spin" />} Supprimer
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[rgba(0,0,0,0.06)]">
          <h3 className="font-bold text-[var(--text)]">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg)] transition-colors">
            <X size={18} className="text-[var(--text-secondary)]" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
