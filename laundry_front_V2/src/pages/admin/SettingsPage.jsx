import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Save, Settings, Image, Phone, Globe } from 'lucide-react'
import { settingsApi } from '../../services/settingsApi'
import { queryKeys } from '../../lib/queryKeys'

export default function SettingsPage() {
  const qc = useQueryClient()
  const [form, setForm] = useState({ appName: '', businessPhone: '', logo: '' })
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const { data: settings, isLoading } = useQuery({
    queryKey: queryKeys.settings.all,
    queryFn: settingsApi.get,
  })

  useEffect(() => {
    if (settings) {
      setForm({
        appName:       settings.appName       || settings.nom        || '',
        businessPhone: settings.businessPhone || settings.telephone  || '',
        logo:          settings.logo          || settings.logoUrl    || '',
      })
    }
  }, [settings])

  const mutation = useMutation({
    mutationFn: (data) => settingsApi.update(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.settings.all })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    },
    onError: (e) => setError(e?.response?.data?.message || 'Erreur lors de la sauvegarde'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    mutation.mutate(form)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-[var(--primary)]" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-[var(--text)] tracking-tight">Paramètres</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">Configuration de l'application</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* App Info */}
        <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.07)] shadow-sm p-6 space-y-5">
          <div className="flex items-center gap-2 pb-2 border-b border-[rgba(0,0,0,0.05)]">
            <Globe size={15} className="text-[var(--primary)]" />
            <h2 className="text-sm font-bold text-[var(--text)]">Informations générales</h2>
          </div>

          <div>
            <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 block">Nom de l'application</label>
            <input
              value={form.appName}
              onChange={e => setForm(p => ({ ...p, appName: e.target.value }))}
              placeholder="Astra Pro Laundry"
              className="w-full px-4 py-2.5 rounded-xl border border-[rgba(0,0,0,0.1)] text-sm text-[var(--text)] focus:outline-none focus:border-[var(--primary)] bg-white"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 block">
              <Phone size={11} className="inline mr-1" />
              Téléphone professionnel
            </label>
            <input
              type="tel"
              value={form.businessPhone}
              onChange={e => setForm(p => ({ ...p, businessPhone: e.target.value }))}
              placeholder="+212 6XX XX XX XX"
              className="w-full px-4 py-2.5 rounded-xl border border-[rgba(0,0,0,0.1)] text-sm text-[var(--text)] focus:outline-none focus:border-[var(--primary)] bg-white"
            />
            <p className="text-[11px] text-[var(--text-muted)] mt-1.5">Utilisé pour les reçus et les messages WhatsApp</p>
          </div>
        </div>

        {/* Logo */}
        <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.07)] shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[rgba(0,0,0,0.05)]">
            <Image size={15} className="text-[var(--primary)]" />
            <h2 className="text-sm font-bold text-[var(--text)]">Logo</h2>
          </div>

          <div>
            <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 block">URL du logo</label>
            <input
              value={form.logo}
              onChange={e => setForm(p => ({ ...p, logo: e.target.value }))}
              placeholder="https://… ou /uploads/logo.png"
              className="w-full px-4 py-2.5 rounded-xl border border-[rgba(0,0,0,0.1)] text-sm text-[var(--text)] focus:outline-none focus:border-[var(--primary)] bg-white"
            />
          </div>

          {form.logo && (
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl border border-[rgba(0,0,0,0.08)] overflow-hidden bg-[var(--bg)] flex items-center justify-center">
                <img
                  src={form.logo}
                  alt="Logo preview"
                  className="w-full h-full object-contain"
                  onError={e => { e.target.style.display = 'none' }}
                />
              </div>
              <p className="text-xs text-[var(--text-muted)]">Aperçu du logo</p>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-600 font-semibold">{error}</p>}

        <button
          type="submit"
          disabled={mutation.isPending}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
            saved
              ? 'bg-green-500 text-white'
              : 'bg-[var(--primary)] text-white hover:opacity-90'
          } disabled:opacity-50 shadow-sm`}
        >
          {mutation.isPending
            ? <Loader2 size={15} className="animate-spin" />
            : saved ? <span>✓</span> : <Save size={15} />}
          {saved ? 'Enregistré !' : 'Enregistrer'}
        </button>
      </form>
    </div>
  )
}
