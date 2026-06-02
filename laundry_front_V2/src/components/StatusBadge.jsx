import React from 'react'
import { STATUS_BADGE_STYLES, STATUS_LABELS } from '../constants/statusColors'

export const StatusBadge = ({ status, showDot = true }) => {
  const key = status?.toUpperCase()
  const cfg = STATUS_BADGE_STYLES[key]
  const label = STATUS_LABELS[key] || status || '—'

  const style = cfg
    ? { background: cfg.bg, borderColor: cfg.border, color: cfg.text }
    : { background: 'rgba(148,163,184,0.10)', borderColor: 'rgba(148,163,184,0.20)', color: '#475569' }

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.06em] border"
      style={style}
    >
      {showDot && (
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: cfg?.dot ?? '#94A3B8' }} />
      )}
      {label}
    </span>
  )
}
