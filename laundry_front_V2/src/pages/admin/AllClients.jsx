import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Search, X, Plus, Users, ShoppingBag, UserPlus, TrendingUp,
  Phone, ChevronRight, Loader2, AlertTriangle, Edit2, Check
} from 'lucide-react'
import { clientsApi } from '../../services/clientsApi'
import { queryKeys } from '../../lib/queryKeys'

const fmtN = (v) => Number(v || 0).toLocaleString('fr-MA')
const fmt  = (v) => Number(v || 0).toLocaleString('fr-MA', { minimumFractionDigits: 2 })

// ── Create/Edit Client Modal ──────────────────────────────────────────────────
function ClientFormModal({ isOpen, onClose, client = null }) {
  const qc = useQueryClient()
  const isEdit = !!client
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  })
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setForm({
        name:    client?.name    || client?.nom  || '',
        email:   client?.email   || '',
        phone:   client?.phone   || client?.phones?.[0]?.phoneNumber || '',
        address: client?.address || '',
      })
      setError('')
    }
  }, [isOpen, client])

  const mutation = useMutation({
    mutationFn: (data) => isEdit ? clientsApi.update(client.id, data) : clientsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clients.all })
      onClose()
    },
    onError: (e) => setError(e?.response?.data?.message || 'Erreur lors de la sauvegarde'),
  })

  const handleSubmit = useCallback((e) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Le nom est requis'); return }
    if (!form.phone.trim()) { setError('Le téléphone est requis'); return }
    mutation.mutate({ name: form.name, email: form.email, phone: form.phone, address: form.address })
  }, [form, mutation])

  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="px-6 pt-5 pb-4 border-b border-[rgba(0,0,0,0.06)] flex items-center justify-between">
          <h3 className="font-bold text-[var(--text)]">{isEdit ? 'Modifier le client' : 'Nouveau client'}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--bg)] text-[var(--text-muted)]">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {[
            { key: 'name',    label: 'Nom complet',  type: 'text',  required: true,  placeholder: 'Ahmed Benali' },
            { key: 'phone',   label: 'Téléphone',    type: 'tel',   required: true,  placeholder: '0612345678' },
            { key: 'email',   label: 'Email',        type: 'email', required: false, placeholder: 'email@exemple.com' },
            { key: 'address', label: 'Adresse',      type: 'text',  required: false, placeholder: 'Adresse de livraison…' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 block">
                {f.label} {f.required && <span className="text-red-500">*</span>}
              </label>
              <input
                type={f.type}
                value={form[f.key]}
                onChange={e => { setForm(p => ({ ...p, [f.key]: e.target.value })); setError('') }}
                placeholder={f.placeholder}
                className="w-full px-4 py-2.5 rounded-xl border border-[rgba(0,0,0,0.1)] text-sm text-[var(--text)] focus:outline-none focus:border-[var(--primary)] bg-white"
              />
            </div>
          ))}
          {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}
          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full py-3 bg-[var(--primary)] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
            {isEdit ? 'Enregistrer' : 'Créer le client'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AllClients() {
  const navigate  = useNavigate()
  const [search, setSearch]               = useState('')
  const [debouncedSearch, setDebounced]   = useState('')
  const [page, setPage]                   = useState(0)
  const [showForm, setShowForm]           = useState(false)
  const [editingClient, setEditingClient] = useState(null)
  const PAGE_SIZE = 25

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setPage(0) }, 350)
    return () => clearTimeout(t)
  }, [search])

  const params = useMemo(() => ({
    page,
    size: PAGE_SIZE,
    ...(debouncedSearch && { search: debouncedSearch }),
  }), [page, debouncedSearch])

  const { data: clientsData, isLoading } = useQuery({
    queryKey: queryKeys.clients.list(params),
    queryFn: () => clientsApi.getAll(params),
    keepPreviousData: true,
  })

  const { data: stats } = useQuery({
    queryKey: queryKeys.clients.all,
    queryFn: clientsApi.getStatistics,
    staleTime: 5 * 60 * 1000,
  })

  const clients = useMemo(() => {
    if (Array.isArray(clientsData)) return clientsData
    return clientsData?.content ?? []
  }, [clientsData])

  const totalPages = useMemo(() => {
    if (Array.isArray(clientsData)) return 1
    return clientsData?.totalPages ?? 1
  }, [clientsData])

  const totalElements = useMemo(() => {
    if (Array.isArray(clientsData)) return clientsData.length
    return clientsData?.totalElements ?? clients.length
  }, [clientsData, clients])

  const openCreate = useCallback(() => { setEditingClient(null); setShowForm(true) }, [])
  const openEdit   = useCallback((client, e) => { e.stopPropagation(); setEditingClient(client); setShowForm(true) }, [])

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-[var(--text)] tracking-tight">Clients</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            {isLoading ? '…' : `${totalElements.toLocaleString('fr-MA')} client${totalElements !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-bold shadow-sm hover:opacity-90 transition-opacity"
        >
          <Plus size={15} />
          <span className="hidden sm:inline">Nouveau client</span>
          <span className="sm:hidden">Nouveau</span>
        </button>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total clients',       value: fmtN(stats.totalClients    ?? totalElements), icon: Users,       accent: '#3B82F6', bg: 'rgba(59,130,246,0.08)' },
            { label: 'Commandes ce mois',   value: fmtN(stats.ordersThisMonth),                  icon: ShoppingBag, accent: '#10B981', bg: 'rgba(16,185,129,0.08)' },
            { label: 'Nouveaux ce mois',    value: fmtN(stats.newThisMonth),                     icon: UserPlus,    accent: '#C2185B', bg: 'rgba(194,24,91,0.08)' },
            { label: 'Panier moyen',        value: `${fmt(stats.avgBasket || 0)} DH`,            icon: TrendingUp,  accent: '#C9A84C', bg: 'rgba(201,168,76,0.08)' },
          ].map((k, i) => (
            <div key={i} className="bg-white rounded-[16px] border border-[rgba(0,0,0,0.06)] shadow-[var(--shadow-sm)] p-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ backgroundColor: k.accent }} />
              <div className="w-9 h-9 rounded-[10px] flex items-center justify-center mb-2" style={{ backgroundColor: k.bg }}>
                <k.icon size={17} style={{ color: k.accent }} />
              </div>
              <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em]">{k.label}</p>
              <p className="font-['Plus_Jakarta_Sans'] text-xl font-bold text-[var(--text)] mt-0.5">{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Nom, téléphone, email…"
          className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-[rgba(0,0,0,0.1)] bg-white text-sm text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] shadow-sm"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)]">
            <X size={14} />
          </button>
        )}
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] shadow-[var(--shadow-sm)] overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-[rgba(0,0,0,0.05)]">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <div className="w-10 h-10 rounded-full bg-[var(--bg)] shimmer shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-36 bg-[var(--bg)] rounded shimmer" />
                  <div className="h-3 w-24 bg-[var(--bg)] rounded shimmer" />
                </div>
              </div>
            ))}
          </div>
        ) : clients.length === 0 ? (
          <div className="py-20 text-center opacity-40">
            <Users size={40} className="mx-auto mb-3 text-[var(--text-muted)]" />
            <p className="text-sm font-semibold text-[var(--text-secondary)]">
              {search ? 'Aucun client trouvé' : 'Aucun client'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table header */}
            <div className="hidden md:grid grid-cols-[2fr_1.5fr_1fr_1fr_auto] gap-4 px-6 py-3 border-b border-[rgba(0,0,0,0.05)] bg-[var(--bg)]">
              {['Nom', 'Téléphone', 'Email', 'Depuis', ''].map((h, i) => (
                <span key={i} className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.06em]">{h}</span>
              ))}
            </div>
            <div className="divide-y divide-[rgba(0,0,0,0.05)]">
              {clients.map(client => (
                <button
                  key={client.id}
                  onClick={() => navigate(`/admin/clients/${client.id}`)}
                  className="w-full text-start hover:bg-[var(--bg)] transition-colors group"
                >
                  {/* Desktop row */}
                  <div className="hidden md:grid grid-cols-[2fr_1.5fr_1fr_1fr_auto] gap-4 items-center px-6 py-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-[var(--primary-surface)] text-[var(--primary)] flex items-center justify-center text-sm font-bold shrink-0">
                        {(client.name || client.nom || '?')[0].toUpperCase()}
                      </div>
                      <span className="text-sm font-bold text-[var(--text)] truncate">{client.name || client.nom}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-[var(--text-secondary)] font-medium">
                      <Phone size={12} className="text-[var(--text-muted)] shrink-0" />
                      <span className="truncate">{client.phone || client.phones?.[0]?.phoneNumber || '—'}</span>
                    </div>
                    <span className="text-sm text-[var(--text-muted)] truncate">{client.email || '—'}</span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {client.createdAt ? new Date(client.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                    </span>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={e => openEdit(client, e)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg border border-[rgba(0,0,0,0.1)] text-[var(--text-muted)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors"
                      >
                        <Edit2 size={12} />
                      </button>
                      <ChevronRight size={14} className="text-[var(--text-muted)]" />
                    </div>
                  </div>

                  {/* Mobile card */}
                  <div className="md:hidden flex items-center gap-3 px-4 py-3.5">
                    <div className="w-10 h-10 rounded-full bg-[var(--primary-surface)] text-[var(--primary)] flex items-center justify-center text-sm font-bold shrink-0">
                      {(client.name || client.nom || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[var(--text)] truncate">{client.name || client.nom}</p>
                      <p className="text-[11px] text-[var(--text-muted)] font-medium mt-0.5">
                        {client.phone || client.phones?.[0]?.phoneNumber || '—'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={e => openEdit(client, e)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-[rgba(0,0,0,0.08)] text-[var(--text-muted)] hover:text-[var(--primary)]">
                        <Edit2 size={13} />
                      </button>
                      <ChevronRight size={14} className="text-[var(--text-muted)]" />
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-[rgba(0,0,0,0.05)] bg-[var(--bg)]">
                <p className="text-xs text-[var(--text-muted)] font-medium">Page {page + 1} / {totalPages}</p>
                <div className="flex items-center gap-1.5">
                  <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
                    className="px-3 py-1.5 rounded-lg border border-[rgba(0,0,0,0.1)] text-xs font-semibold text-[var(--text-secondary)] disabled:opacity-40 hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors">
                    Préc.
                  </button>
                  <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
                    className="px-3 py-1.5 rounded-lg border border-[rgba(0,0,0,0.1)] text-xs font-semibold text-[var(--text-secondary)] disabled:opacity-40 hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors">
                    Suiv.
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <ClientFormModal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingClient(null) }}
        client={editingClient}
      />
    </div>
  )
}
