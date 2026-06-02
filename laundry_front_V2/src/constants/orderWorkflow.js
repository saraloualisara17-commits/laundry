export const ORDER_WORKFLOW = {
  PENDING_PICKUP:     { nextStatus: 'PICKED_UP',           label: 'Confirmer Récupération',  requiresPickupModal: false },
  PICKED_UP:          { nextStatus: 'IN_PROCESS',          label: 'Démarrer Traitement',     requiresPickupModal: false },
  IN_PROCESS:         { nextStatus: 'READY_FOR_DELIVERY',  label: 'Marquer Prête',           requiresDriverModal: true  },
  READY_FOR_DELIVERY: { nextStatus: 'DELIVERED',           label: 'Marquer Livrée',          requiresDeliveryModal: true },
  DELIVERED:          { nextStatus: null,                  label: 'Livrée',                  disabled: true             },
  CANCELLED:          { nextStatus: 'PENDING_PICKUP',      label: 'Réactiver Commande',      requiresPickupModal: false },
  PICKUP_FAILED:      { nextStatus: 'PENDING_PICKUP',      label: 'Réessayer Collecte',      requiresPickupModal: false },
  DELIVERY_FAILED:    { nextStatus: 'READY_FOR_DELIVERY',  label: 'Réessayer Livraison',     requiresPickupModal: false },
  AU_LOCAL:           { nextStatus: 'READY_FOR_DELIVERY',  label: 'Marquer Prête',           requiresDriverModal: true  },
}

export const isCancelled       = (s) => s === 'CANCELLED'
export const isDelivered       = (s) => s === 'DELIVERED'
export const isPickupPhase     = (s) => s === 'PENDING_PICKUP' || s === 'PICKUP_FAILED'
export const isReadyForDelivery= (s) => s === 'READY_FOR_DELIVERY'
export const isFailedStatus    = (s) => s === 'PICKUP_FAILED' || s === 'DELIVERY_FAILED'
