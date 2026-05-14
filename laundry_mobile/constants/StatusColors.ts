export const StatusColors: Record<string, { bg: string, border: string, text: string, dot: string, label: string }> = {
  PENDING_PICKUP: {
    bg: 'rgba(245,158,11,0.10)',
    border: 'rgba(245,158,11,0.20)',
    text: '#D97706',
    dot: '#F59E0B',
    label: 'En attente'
  },
  PICKED_UP: {
    bg: 'rgba(59,130,246,0.10)',
    border: 'rgba(59,130,246,0.20)',
    text: '#2563EB',
    dot: '#3B82F6',
    label: 'Récupérée'
  },
  IN_PROCESS: {
    bg: 'rgba(13,115,119,0.10)',
    border: 'rgba(13,115,119,0.20)',
    text: '#0D7377',
    dot: '#14A3A8',
    label: 'En traitement'
  },
  READY_FOR_DELIVERY: {
    bg: 'rgba(16,185,129,0.10)',
    border: 'rgba(16,185,129,0.20)',
    text: '#065F46',
    dot: '#10B981',
    label: 'Prête'
  },
  DELIVERED: {
    bg: 'rgba(107,114,128,0.10)',
    border: 'rgba(107,114,128,0.20)',
    text: '#4B5563',
    dot: '#6B7280',
    label: 'Livrée'
  },
  CANCELLED: {
    bg: 'rgba(239,68,68,0.10)',
    border: 'rgba(239,68,68,0.20)',
    text: '#991B1B',
    dot: '#EF4444',
    label: 'Annulée'
  },
}

export const STATUS_COLORS: Record<string, string> = {
  PENDING_PICKUP: '#F59E0B',
  PICKED_UP: '#3B82F6',
  IN_PROCESS: '#0D7377',
  READY_FOR_DELIVERY: '#10B981',
  DELIVERED: '#6B7280',
  CANCELLED: '#EF4444',
}

export const STATUS_LABELS: Record<string, string> = {
  PENDING_PICKUP: 'En attente',
  PICKED_UP: 'Récupérée',
  IN_PROCESS: 'En traitement',
  READY_FOR_DELIVERY: 'Prête',
  DELIVERED: 'Livrée',
  CANCELLED: 'Annulée',
}
