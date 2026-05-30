export const STATUS_COLORS = {
  PENDING_PICKUP: '#C2185B',
  PICKED_UP: '#D32F2F',
  IN_PROCESS: '#8B5CF6',
  READY_FOR_DELIVERY: '#00897B',
  DELIVERED: '#388E3C',
  CANCELLED: '#94A3B8',
  PICKUP_FAILED: '#EF4444',
  DELIVERY_FAILED: '#F43F5E',
  AU_LOCAL: '#7C3AED',
  PAID_DEBTS: '#388E3C',
}

export const STATUS_LABELS = {
  PENDING_PICKUP: 'En attente',
  PICKED_UP: 'Récupérée',
  IN_PROCESS: 'En traitement',
  READY_FOR_DELIVERY: 'Prête',
  DELIVERED: 'Livrée',
  CANCELLED: 'Annulée',
  PICKUP_FAILED: 'Échec Collecte',
  DELIVERY_FAILED: 'Échec Livraison',
  AU_LOCAL: 'Au Local',
  PAID_DEBTS: 'Dettes Payées',
}

export const STATUS_BADGE_STYLES = {
  PENDING_PICKUP:      { bg: 'rgba(194,24,91,0.10)',   border: 'rgba(194,24,91,0.25)',   text: '#C2185B' },
  PICKED_UP:           { bg: 'rgba(211,47,47,0.10)',   border: 'rgba(211,47,47,0.25)',   text: '#D32F2F' },
  IN_PROCESS:          { bg: 'rgba(139,92,246,0.10)',  border: 'rgba(139,92,246,0.20)',  text: '#7C3AED' },
  READY_FOR_DELIVERY:  { bg: 'rgba(0,137,123,0.10)',   border: 'rgba(0,137,123,0.25)',   text: '#00897B' },
  DELIVERED:           { bg: 'rgba(56,142,60,0.10)',   border: 'rgba(56,142,60,0.25)',   text: '#388E3C' },
  CANCELLED:           { bg: 'rgba(148,163,184,0.10)', border: 'rgba(148,163,184,0.20)', text: '#475569' },
  PICKUP_FAILED:       { bg: 'rgba(239,68,68,0.10)',   border: 'rgba(239,68,68,0.20)',   text: '#B91C1C' },
  DELIVERY_FAILED:     { bg: 'rgba(244,63,94,0.10)',   border: 'rgba(244,63,94,0.20)',   text: '#BE123C' },
  AU_LOCAL:            { bg: 'rgba(124,58,237,0.10)',  border: 'rgba(124,58,237,0.20)',  text: '#6D28D9' },
}
