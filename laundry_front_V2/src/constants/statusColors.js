export const STATUS_BADGE_STYLES = {
  PENDING_PICKUP:     { bg: 'rgba(194,24,91,0.08)',   border: 'rgba(194,24,91,0.2)',   text: '#C2185B', dot: '#C2185B'  },
  PICKED_UP:          { bg: 'rgba(245,158,11,0.1)',   border: 'rgba(245,158,11,0.2)',  text: '#B45309', dot: '#F59E0B'  },
  IN_PROCESS:         { bg: 'rgba(59,130,246,0.1)',   border: 'rgba(59,130,246,0.2)',  text: '#1D4ED8', dot: '#3B82F6'  },
  READY_FOR_DELIVERY: { bg: 'rgba(16,185,129,0.1)',   border: 'rgba(16,185,129,0.2)',  text: '#065F46', dot: '#10B981'  },
  DELIVERED:          { bg: 'rgba(13,115,119,0.1)',   border: 'rgba(13,115,119,0.2)',  text: '#0D7377', dot: '#0D7377'  },
  CANCELLED:          { bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)',   text: '#DC2626', dot: '#EF4444'  },
  PICKUP_FAILED:      { bg: 'rgba(234,88,12,0.08)',   border: 'rgba(234,88,12,0.2)',   text: '#C2410C', dot: '#EA580C'  },
  DELIVERY_FAILED:    { bg: 'rgba(124,58,237,0.08)',  border: 'rgba(124,58,237,0.2)',  text: '#6D28D9', dot: '#7C3AED'  },
  AU_LOCAL:           { bg: 'rgba(201,168,76,0.1)',   border: 'rgba(201,168,76,0.2)',  text: '#92400E', dot: '#C9A84C'  },
}

export const STATUS_LABELS = {
  PENDING_PICKUP:     'En attente',
  PICKED_UP:          'Récupérée',
  IN_PROCESS:         'En traitement',
  READY_FOR_DELIVERY: 'Prête',
  DELIVERED:          'Livrée',
  CANCELLED:          'Annulée',
  PICKUP_FAILED:      'Échec collecte',
  DELIVERY_FAILED:    'Échec livraison',
  AU_LOCAL:           'Au local',
}
