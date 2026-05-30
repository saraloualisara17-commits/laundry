export const ORDER_WORKFLOW = {
  PENDING_PICKUP:     { nextStatus: 'PICKED_UP',           label: 'Confirmer Récupération' },
  PICKED_UP:          { nextStatus: 'IN_PROCESS',          label: 'Démarrer Traitement' },
  IN_PROCESS:         { nextStatus: 'READY_FOR_DELIVERY',  label: 'Marquer Prête',         requiresDriverModal: true },
  READY_FOR_DELIVERY: { nextStatus: 'DELIVERED',           label: 'Marquer Livrée',        requiresDeliveryModal: true },
  DELIVERED:          { nextStatus: null,                  label: 'Livrée',                disabled: true },
  CANCELLED:          { nextStatus: null,                  label: 'Annulée',               disabled: true },
}

export const isPickupPhase = (status) =>
  status === 'PENDING_PICKUP' || status === 'PICKED_UP'

export const isDelivered = (status) => status === 'DELIVERED'

export const isReadyForDelivery = (status) => status === 'READY_FOR_DELIVERY'
