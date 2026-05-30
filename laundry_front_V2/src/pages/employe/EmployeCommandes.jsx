import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList, Search, Loader2, Filter, X, ChevronRight,
  Calendar, Clock, Package, Phone,
} from 'lucide-react';
import { fetchAllCommandes } from '../../store/admin/adminThunk';
import { selectAllCommandes, selectAdminLoading, selectCommandesPagination } from '../../store/admin/adminSelectors';
import { StatusBadge } from '../../components/StatusBadge';
import { STATUS_LABELS } from '../../constants/statusColors';
import { toast } from 'react-toastify';

const STATUSES = ['PENDING_PICKUP', 'PICKED_UP', 'IN_PROCESS', 'READY_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export default function EmployeCommandes() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const commandes = useSelector(selectAllCommandes);
  const loading = useSelector(selectAdminLoading);
  const pagination = useSelector(selectCommandesPagination);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  const loadData = useCallback((page = 0) => {
    const params = {
      search: search || undefined,
      status: status !== 'all' ? status : undefined,
      dateDebut: dateDebut || undefined,
      dateFin: dateFin || undefined,
      page,
      size: 20,
    };
    dispatch(fetchAllCommandes(params));
  }, [dispatch, search, status, dateDebut, dateFin]);

  useEffect(() => {
    setCurrentPage(0);
    const timer = setTimeout(() => loadData(0), 400);
    return () => clearTimeout(timer);
  }, [search, status, dateDebut, dateFin]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl text-[var(--text)] flex items-center gap-2">
            <ClipboardList size={24} className="text-[var(--primary)]" /> Commandes
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">{pagination.totalElements || 0} commande(s) au total</p>
        </div>
      </div>

      {/* Search + filter bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par numéro, client..."
            className="w-full ps-9 pe-3 py-2.5 border border-[rgba(0,0,0,0.1)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] bg-white"
          />
        </div>
        <button
          onClick={() => setShowFilters(v => !v)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${showFilters ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : 'border-[rgba(0,0,0,0.1)] text-[var(--text-secondary)] hover:bg-[var(--bg)]'}`}
        >
          <Filter size={15} /> Filtres
        </button>
      </div>

      {showFilters && (
        <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setStatus('all')} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${status === 'all' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--bg)] text-[var(--text-secondary)]'}`}>
              Tous
            </button>
            {STATUSES.map(s => (
              <button key={s} onClick={() => setStatus(s)} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${status === s ? 'bg-[var(--primary)] text-white' : 'bg-[var(--bg)] text-[var(--text-secondary)]'}`}>
                {STATUS_LABELS[s] || s}
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)}
              className="flex-1 px-3 py-2 border border-[rgba(0,0,0,0.1)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
            <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)}
              className="flex-1 px-3 py-2 border border-[rgba(0,0,0,0.1)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
          </div>
        </div>
      )}

      {/* List */}
      {loading && commandes.length === 0 ? (
        <div className="flex justify-center py-16">
          <Loader2 size={32} className="animate-spin text-[var(--primary)]" />
        </div>
      ) : commandes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-[var(--text-secondary)]">
          <Package size={40} className="mb-3 opacity-40" />
          <p className="font-semibold">Aucune commande</p>
        </div>
      ) : (
        <div className="space-y-2">
          {commandes.map(c => (
            <button
              key={c.id}
              onClick={() => navigate(`/orders/${c.id}`)}
              className="w-full text-start bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] p-4 shadow-sm hover:border-[var(--primary)] hover:shadow-md transition-all flex items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-sm text-[var(--text)] truncate">{c.numeroCommande}</span>
                  <StatusBadge status={c.status} />
                </div>
                <p className="text-sm text-[var(--text-secondary)] truncate">{c.client?.name || '—'}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">{formatDate(c.createdAt)}</p>
              </div>
              <div className="text-end flex-shrink-0">
                <p className="font-bold text-sm text-[var(--text)]">{Number(c.montantTotal || 0).toFixed(2)} MAD</p>
                {c.montantPaye < c.montantTotal && <p className="text-xs text-red-500">Reste: {Number((c.montantTotal - c.montantPaye) || 0).toFixed(2)}</p>}
              </div>
              <ChevronRight size={16} className="text-[var(--text-secondary)] flex-shrink-0" />
            </button>
          ))}
          {!pagination.isLast && (
            <button
              onClick={() => { const next = currentPage + 1; setCurrentPage(next); loadData(next); }}
              disabled={loading}
              className="w-full py-3 rounded-2xl border border-[rgba(0,0,0,0.1)] text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg)] flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : 'Charger plus'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
