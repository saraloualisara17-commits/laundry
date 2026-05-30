import React from 'react';
import { STATUS_BADGE_STYLES, STATUS_LABELS } from '../constants/statusColors';

export const StatusBadge = ({ status }) => {
  const normalizedStatus = status?.toUpperCase();
  const cfg = STATUS_BADGE_STYLES[normalizedStatus];
  const label = STATUS_LABELS[normalizedStatus] || status || '—';

  const style = cfg
    ? { background: cfg.bg, borderColor: cfg.border, color: cfg.text }
    : { background: 'rgba(148,163,184,0.10)', borderColor: 'rgba(148,163,184,0.20)', color: '#475569' };

  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.06em] border"
      style={style}
    >
      {label}
    </span>
  );
};

