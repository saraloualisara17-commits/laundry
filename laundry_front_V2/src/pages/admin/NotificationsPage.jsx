import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Bell, BellOff, CheckCheck, Loader2, ChevronRight } from 'lucide-react'
import { notificationsApi } from '../../services/notificationsApi'
import { queryKeys } from '../../lib/queryKeys'

const fmtDate = (d) => {
  if (!d) return ''
  const date = new Date(d)
  const now   = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1)  return 'À l\'instant'
  if (diffMins < 60) return `Il y a ${diffMins} min`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `Il y a ${diffHours}h`
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const TYPE_STYLES = {
  ORDER_STATUS_CHANGE: { bg: 'rgba(59,130,246,0.1)',  color: '#1D4ED8',  dot: '#3B82F6' },
  PAYMENT:             { bg: 'rgba(16,185,129,0.1)',  color: '#065F46',  dot: '#10B981' },
  ASSIGNMENT:          { bg: 'rgba(201,168,76,0.1)',  color: '#92400E',  dot: '#C9A84C' },
  DEFAULT:             { bg: 'rgba(148,163,184,0.1)', color: '#475569',  dot: '#94A3B8' },
}

export default function NotificationsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: queryKeys.notifications.all,
    queryFn: notificationsApi.getAll,
    refetchInterval: 30_000,
  })

  const markReadMut = useMutation({
    mutationFn: (id) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications.all })
      qc.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount })
    },
  })

  const markAllMut = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications.all })
      qc.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount })
    },
  })

  const unreadCount = notifications.filter(n => !n.isRead && !n.read).length

  const handleClick = (n) => {
    if (!n.isRead && !n.read) markReadMut.mutate(n.id)
    if (n.referenceId) navigate(`/admin/commandes/${n.referenceId}`)
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-[var(--text)] tracking-tight">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-[var(--text-muted)] mt-0.5">{unreadCount} non lue{unreadCount !== 1 ? 's' : ''}</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllMut.mutate()}
            disabled={markAllMut.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[rgba(0,0,0,0.1)] bg-white text-sm font-semibold text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors shadow-sm disabled:opacity-50"
          >
            {markAllMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCheck size={14} />}
            Tout lire
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-[rgba(0,0,0,0.05)]">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-start gap-4 px-5 py-4">
                <div className="w-10 h-10 rounded-full bg-[var(--bg)] shimmer shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-4 w-48 bg-[var(--bg)] rounded shimmer" />
                  <div className="h-3 w-32 bg-[var(--bg)] rounded shimmer" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-20 text-center opacity-40">
            <BellOff size={40} className="mx-auto mb-3 text-[var(--text-muted)]" />
            <p className="text-sm font-semibold text-[var(--text-secondary)]">Aucune notification</p>
          </div>
        ) : (
          <div className="divide-y divide-[rgba(0,0,0,0.05)]">
            {notifications.map(n => {
              const isUnread = !n.isRead && !n.read
              const style    = TYPE_STYLES[n.type] ?? TYPE_STYLES.DEFAULT
              return (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full text-start flex items-start gap-4 px-5 py-4 hover:bg-[var(--bg)] transition-colors group ${isUnread ? 'bg-[var(--primary-surface)]' : ''}`}
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 relative"
                    style={{ backgroundColor: style.bg }}>
                    <Bell size={16} style={{ color: style.color }} />
                    {isUnread && (
                      <span className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white" style={{ backgroundColor: style.dot }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${isUnread ? 'font-bold text-[var(--text)]' : 'font-semibold text-[var(--text-secondary)]'}`}>
                      {n.title}
                    </p>
                    {n.message && (
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5 line-clamp-2">{n.message}</p>
                    )}
                    <p className="text-[10px] text-[var(--text-muted)] mt-1 font-medium">{fmtDate(n.createdAt)}</p>
                  </div>
                  {n.referenceId && (
                    <ChevronRight size={14} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 shrink-0 mt-1" />
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
