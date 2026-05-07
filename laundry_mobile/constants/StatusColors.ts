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
    bg: 'rgba(201,168,76,0.10)',
    border: 'rgba(201,168,76,0.25)',
    text: '#92400E',
    dot: '#C9A84C',
    label: 'Prête'
  },
  DELIVERED: {
    bg: 'rgba(16,185,129,0.10)',
    border: 'rgba(16,185,129,0.20)',
    text: '#065F46',
    dot: '#10B981',
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
