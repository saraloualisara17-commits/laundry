import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Loader2, ChevronRight, X, Users, DollarSign, Phone } from 'lucide-react';
import { toast } from 'react-toastify';
import { getUnpaidOverview, getUnpaidClients, getUnpaidClientDetail } from '../../store/admin/adminService';

const formatCurrency = (v) => `${Number(v || 0).toFixed(2)} MAD`;

export default function UnpaidPage() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientDetail, setClientDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    Promise.all([getUnpaidOverview(), getUnpaidClients()])
      .then(([ovRes, clRes]) => {
        setOverview(ovRes.data);
        setClients(clRes.data || []);
      })
      .catch(() => toast.error('Erreur lors du chargement'))
      .finally(() => setLoading(false));
  }, []);

  const openClient = async (client) => {
    setSelectedClient(client);
    setDetailLoading(true);
    try {
      const res = await getUnpaidClientDetail(client.client?.id || client.id);
      setClientDetail(res.data);
    } catch {
      toast.error('Erreur lors du chargement du détail');
    } finally {
      setDetailLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div>
        <h1 className="font-bold text-2xl text-[var(--text)] flex items-center gap-2">
          <AlertCircle size={24} className="text-amber-500" /> Impayés
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">Clients avec des dettes en attente</p>
      </div>

      {/* Overview banner */}
      {overview && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign size={16} className="text-amber-600" />
              <span className="text-xs font-bold text-amber-600 uppercase">Total impayé</span>
            </div>
            <p className="font-bold text-2xl text-amber-700">{formatCurrency(overview.totalUnpaid)}</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users size={16} className="text-red-600" />
              <span className="text-xs font-bold text-red-600 uppercase">Clients débiteurs</span>
            </div>
            <p className="font-bold text-2xl text-red-700">{overview.clientCount || clients.length}</p>
          </div>
        </div>
      )}

      {/* Client list */}
      {clients.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-[var(--text-secondary)]">
          <AlertCircle size={40} className="mb-3 opacity-30" />
          <p className="font-semibold">Aucun impayé</p>
        </div>
      ) : (
        <div className="space-y-2">
          {clients.map((item, i) => {
            const client = item.client || item;
            const phone = client.phones?.[0]?.phoneNumber || client.phone || '—';
            return (
              <button
                key={client.id || i}
                onClick={() => openClient(item)}
                className="w-full text-start bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] p-4 shadow-sm hover:border-amber-300 hover:shadow-md transition-all flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 font-bold text-sm flex items-center justify-center flex-shrink-0">
                  {client.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[var(--text)] truncate">{client.name || '—'}</p>
                  <p className="text-sm text-[var(--text-secondary)] flex items-center gap-1">
                    <Phone size={11} /> {phone}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">{item.commandeCount || 0} commande(s)</p>
                </div>
                <div className="text-end flex-shrink-0">
                  <p className="font-bold text-amber-600">{formatCurrency(item.totalDue)}</p>
                </div>
                <ChevronRight size={16} className="text-[var(--text-secondary)] flex-shrink-0" />
              </button>
            );
          })}
        </div>
      )}

      {/* Detail modal */}
      {selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[rgba(0,0,0,0.06)]">
              <div>
                <h3 className="font-bold text-[var(--text)]">{selectedClient.client?.name || selectedClient.name}</h3>
                <p className="text-sm text-amber-600 font-semibold">{formatCurrency(selectedClient.totalDue)} à récupérer</p>
              </div>
              <button onClick={() => { setSelectedClient(null); setClientDetail(null); }} className="p-1.5 rounded-lg hover:bg-[var(--bg)]">
                <X size={18} className="text-[var(--text-secondary)]" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {detailLoading ? (
                <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-[var(--primary)]" /></div>
              ) : clientDetail?.commandes?.length > 0 ? (
                <div className="space-y-2">
                  {clientDetail.commandes.map(cmd => (
                    <button
                      key={cmd.id}
                      onClick={() => { setSelectedClient(null); setClientDetail(null); navigate(`/orders/${cmd.id}`); }}
                      className="w-full text-start bg-[var(--bg)] rounded-xl p-3 hover:bg-[var(--primary-surface)] transition-colors flex items-center justify-between"
                    >
                      <div>
                        <p className="font-semibold text-sm text-[var(--text)]">{cmd.numeroCommande}</p>
                        <p className="text-xs text-[var(--text-secondary)]">Total: {formatCurrency(cmd.montantTotal)} · Payé: {formatCurrency(cmd.montantPaye)}</p>
                      </div>
                      <div className="text-end">
                        <p className="font-bold text-sm text-red-500">{formatCurrency(cmd.remainingAmount)}</p>
                        <p className="text-xs text-[var(--text-secondary)]">reste</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--text-secondary)] text-center py-8">Aucun détail disponible</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
