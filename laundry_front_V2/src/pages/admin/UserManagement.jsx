import React, { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Edit2, KeyRound, ToggleLeft, ToggleRight, Trash2,
  Loader2, X, Search, User, UserCheck, UserX, Shield
} from 'lucide-react'
import { usersApi } from '../../services/usersApi'
import { queryKeys } from '../../lib/queryKeys'
import ConfirmModal from '../../components/ui/ConfirmModal'

const ROLES = ['ADMIN', 'EMPLOYE', 'LIVREUR']

const ROLE_STYLES = {
  ADMIN:   { bg: 'rgba(194,24,91,0.08)',  text: '#C2185B',  label: 'Admin' },
  EMPLOYE: { bg: 'rgba(59,130,246,0.08)', text: '#1D4ED8',  label: 'Employé' },
  LIVREUR: { bg: 'rgba(16,185,129,0.08)', text: '#065F46',  label: 'Livreur' },
}

// ── User Form Panel ───────────────────────────────────────────────────────────
function UserFormPanel({ user, onClose }) {
  const qc    = useQueryClient()
  const isEdit = !!user
  const [form, setForm]   = useState({ name: '', email: '', phone: '', role: 'EMPLOYE', password: '' })
  const [error, setError] = useState('')

  useEffect(() => {
    setForm({
      name:     user?.name     || '',
      email:    user?.email    || '',
      phone:    user?.phone    || '',
      role:     user?.role     || 'EMPLOYE',
      password: '',
    })
    setError('')
  }, [user])

  const mutation = useMutation({
    mutationFn: (data) => isEdit ? usersApi.update(user.id, data) : usersApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.users.active })
      qc.invalidateQueries({ queryKey: queryKeys.users.inactive })
      onClose()
    },
    onError: (e) => setError(e?.response?.data?.message || 'Erreur'),
  })

  const handleSubmit = useCallback((e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim()) { setError('Nom et email requis'); return }
    if (!isEdit && !form.password.trim()) { setError('Mot de passe requis'); return }
    const data = { name: form.name, email: form.email, phone: form.phone, role: form.role }
    if (!isEdit) data.password = form.password
    mutation.mutate(data)
  }, [form, isEdit, mutation])

  return (
    <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.07)] shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-[var(--text)]">{isEdit ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}</h3>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--bg)] text-[var(--text-muted)]">
          <X size={15} />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {[
          { key: 'name',     label: 'Nom complet', type: 'text',     placeholder: 'Ahmed Benali' },
          { key: 'email',    label: 'Email',        type: 'email',    placeholder: 'email@exemple.com' },
          { key: 'phone',    label: 'Téléphone',    type: 'tel',      placeholder: '0612345678' },
        ].map(f => (
          <div key={f.key}>
            <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 block">{f.label}</label>
            <input
              type={f.type}
              value={form[f.key]}
              onChange={e => { setForm(p => ({ ...p, [f.key]: e.target.value })); setError('') }}
              placeholder={f.placeholder}
              className="w-full px-3 py-2.5 rounded-xl border border-[rgba(0,0,0,0.1)] text-sm text-[var(--text)] focus:outline-none focus:border-[var(--primary)]"
            />
          </div>
        ))}

        {/* Role selector */}
        <div>
          <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 block">Rôle</label>
          <div className="grid grid-cols-3 gap-2">
            {ROLES.map(r => {
              const s = ROLE_STYLES[r]
              return (
                <button key={r} type="button" onClick={() => setForm(p => ({ ...p, role: r }))}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${form.role === r
                    ? 'border-[var(--primary)] bg-[var(--primary-surface)] text-[var(--primary)]'
                    : 'border-[rgba(0,0,0,0.1)] text-[var(--text-secondary)] hover:border-[var(--primary)]'}`}
                >
                  {s.label}
                </button>
              )
            })}
          </div>
        </div>

        {!isEdit && (
          <div>
            <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 block">Mot de passe</label>
            <input
              type="password"
              value={form.password}
              onChange={e => { setForm(p => ({ ...p, password: e.target.value })); setError('') }}
              placeholder="Minimum 6 caractères"
              className="w-full px-3 py-2.5 rounded-xl border border-[rgba(0,0,0,0.1)] text-sm text-[var(--text)] focus:outline-none focus:border-[var(--primary)]"
            />
          </div>
        )}

        {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}

        <button type="submit" disabled={mutation.isPending}
          className="w-full py-3 bg-[var(--primary)] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
          {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
          {isEdit ? 'Enregistrer' : 'Créer l\'utilisateur'}
        </button>
      </form>
    </div>
  )
}

// ── Change Password Panel ─────────────────────────────────────────────────────
function ChangePasswordPanel({ user, onClose }) {
  const qc = useQueryClient()
  const [form, setForm]   = useState({ newPassword: '', confirm: '' })
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: (data) => usersApi.changePassword(user.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.users.active }); onClose() },
    onError:   (e) => setError(e?.response?.data?.message || 'Erreur'),
  })

  const handleSubmit = useCallback((e) => {
    e.preventDefault()
    if (form.newPassword.length < 6) { setError('Minimum 6 caractères'); return }
    if (form.newPassword !== form.confirm) { setError('Les mots de passe ne correspondent pas'); return }
    mutation.mutate({ newPassword: form.newPassword })
  }, [form, mutation])

  return (
    <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.07)] shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-[var(--text)]">Changer le mot de passe — {user?.name}</h3>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--bg)] text-[var(--text-muted)]">
          <X size={15} />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {[
          { key: 'newPassword', label: 'Nouveau mot de passe', placeholder: 'Minimum 6 caractères' },
          { key: 'confirm',     label: 'Confirmer',            placeholder: 'Répéter le mot de passe' },
        ].map(f => (
          <div key={f.key}>
            <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 block">{f.label}</label>
            <input type="password" value={form[f.key]} onChange={e => { setForm(p => ({ ...p, [f.key]: e.target.value })); setError('') }}
              placeholder={f.placeholder}
              className="w-full px-3 py-2.5 rounded-xl border border-[rgba(0,0,0,0.1)] text-sm text-[var(--text)] focus:outline-none focus:border-[var(--primary)]"
            />
          </div>
        ))}
        {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}
        <button type="submit" disabled={mutation.isPending}
          className="w-full py-3 bg-[var(--primary)] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
          {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
          Changer
        </button>
      </form>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function UserManagement() {
  const qc = useQueryClient()
  const [search,       setSearch]       = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [panel,        setPanel]        = useState(null) // { type: 'create'|'edit'|'password', user }
  const [deleteTarget, setDeleteTarget] = useState(null)

  const { data: activeUsers   = [], isLoading: loadingActive }   = useQuery({ queryKey: queryKeys.users.active,   queryFn: usersApi.getActive })
  const { data: inactiveUsers = [], isLoading: loadingInactive } = useQuery({ queryKey: queryKeys.users.inactive, queryFn: usersApi.getInactive, enabled: showInactive })

  const activateMutation = useMutation({
    mutationFn: (id) => usersApi.activate(id),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: queryKeys.users.active }); qc.invalidateQueries({ queryKey: queryKeys.users.inactive }) },
  })
  const deactivateMutation = useMutation({
    mutationFn: (id) => usersApi.deactivate(id),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: queryKeys.users.active }); qc.invalidateQueries({ queryKey: queryKeys.users.inactive }) },
  })
  const deleteMutation = useMutation({
    mutationFn: (id) => usersApi.delete(id),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: queryKeys.users.active }); qc.invalidateQueries({ queryKey: queryKeys.users.inactive }); setDeleteTarget(null) },
  })

  const filter = useCallback((list) => {
    if (!search.trim()) return list
    const q = search.toLowerCase()
    return list.filter(u => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
  }, [search])

  const displayUsers   = filter(activeUsers)
  const displayInactive = filter(inactiveUsers)

  function UserRow({ user, isActive }) {
    const role  = ROLE_STYLES[user.role?.toUpperCase()] || ROLE_STYLES.EMPLOYE
    const busy  = activateMutation.isPending || deactivateMutation.isPending
    return (
      <div className="flex items-center gap-3 px-5 py-4 hover:bg-[var(--bg)] transition-colors">
        {/* Avatar */}
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${isActive ? 'bg-[var(--primary-surface)] text-[var(--primary)]' : 'bg-gray-100 text-gray-400'}`}>
          {user.name?.[0]?.toUpperCase() || '?'}
        </div>
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`text-sm font-bold truncate ${isActive ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'}`}>{user.name}</p>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: role.bg, color: role.text }}>
              {role.label}
            </span>
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5 truncate">{user.email}</p>
        </div>
        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button title="Modifier" onClick={() => setPanel({ type: 'edit', user })}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-[rgba(0,0,0,0.08)] text-[var(--text-muted)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors">
            <Edit2 size={13} />
          </button>
          <button title="Changer mdp" onClick={() => setPanel({ type: 'password', user })}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-[rgba(0,0,0,0.08)] text-[var(--text-muted)] hover:text-amber-600 hover:border-amber-300 transition-colors">
            <KeyRound size={13} />
          </button>
          <button
            title={isActive ? 'Désactiver' : 'Activer'}
            disabled={busy}
            onClick={() => isActive ? deactivateMutation.mutate(user.id) : activateMutation.mutate(user.id)}
            className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-colors disabled:opacity-50 ${isActive ? 'border-amber-200 text-amber-600 hover:bg-amber-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}
          >
            {isActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
          </button>
          <button title="Supprimer" onClick={() => setDeleteTarget(user)}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-[rgba(0,0,0,0.08)] text-[var(--text-muted)] hover:text-red-600 hover:border-red-200 transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-[var(--text)] tracking-tight">Utilisateurs</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">{activeUsers.length} actif{activeUsers.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setPanel({ type: 'create', user: null })}
          className="flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-bold shadow-sm hover:opacity-90 transition-opacity"
        >
          <Plus size={15} />
          <span className="hidden sm:inline">Nouvel utilisateur</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5 items-start">

        {/* Left — user lists */}
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nom ou email…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[rgba(0,0,0,0.1)] bg-white text-sm text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] shadow-sm" />
          </div>

          {/* Active users */}
          <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[rgba(0,0,0,0.05)] flex items-center gap-2 bg-[var(--bg)]">
              <UserCheck size={14} className="text-green-600" />
              <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Actifs ({displayUsers.length})</span>
            </div>
            {loadingActive ? (
              <div className="py-8 flex justify-center"><Loader2 size={20} className="animate-spin text-[var(--primary)]" /></div>
            ) : displayUsers.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] text-center py-8">Aucun utilisateur actif</p>
            ) : (
              <div className="divide-y divide-[rgba(0,0,0,0.05)]">
                {displayUsers.map(u => <UserRow key={u.id} user={u} isActive={true} />)}
              </div>
            )}
          </div>

          {/* Inactive toggle */}
          <button onClick={() => setShowInactive(p => !p)}
            className="flex items-center gap-2 text-sm font-bold text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors">
            <UserX size={14} />
            {showInactive ? 'Masquer' : 'Afficher'} les comptes désactivés
          </button>

          {showInactive && (
            <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[rgba(0,0,0,0.05)] flex items-center gap-2 bg-[var(--bg)]">
                <UserX size={14} className="text-gray-400" />
                <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Désactivés ({displayInactive.length})</span>
              </div>
              {loadingInactive ? (
                <div className="py-8 flex justify-center"><Loader2 size={20} className="animate-spin text-[var(--primary)]" /></div>
              ) : displayInactive.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)] text-center py-8">Aucun compte désactivé</p>
              ) : (
                <div className="divide-y divide-[rgba(0,0,0,0.05)]">
                  {displayInactive.map(u => <UserRow key={u.id} user={u} isActive={false} />)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right — form panel */}
        <div>
          {panel?.type === 'create' && (
            <UserFormPanel user={null} onClose={() => setPanel(null)} />
          )}
          {panel?.type === 'edit' && (
            <UserFormPanel user={panel.user} onClose={() => setPanel(null)} />
          )}
          {panel?.type === 'password' && (
            <ChangePasswordPanel user={panel.user} onClose={() => setPanel(null)} />
          )}
          {!panel && (
            <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] shadow-sm p-8 flex flex-col items-center justify-center gap-3 opacity-40 text-center hidden lg:flex">
              <Shield size={32} className="text-[var(--text-muted)]" />
              <p className="text-sm font-semibold text-[var(--text-secondary)]">Sélectionnez un utilisateur<br />pour le modifier</p>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget?.id)}
        loading={deleteMutation.isPending}
        title={`Supprimer ${deleteTarget?.name} ?`}
        message="Cette action est irréversible."
        confirmText="Supprimer"
        type="danger"
      />
    </div>
  )
}
