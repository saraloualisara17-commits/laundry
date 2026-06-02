import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { isCancelled, isDelivered, isPickupPhase, isReadyForDelivery } from '../constants/orderWorkflow'

export function useOrderPermissions(order) {
  const user = useSelector((state) => state.auth.user)

  return useMemo(() => {
    const role = user?.role?.toUpperCase()
    const isAdmin   = role === 'ADMIN'
    const isEmploye = role === 'EMPLOYE'
    const isLivreur = role === 'LIVREUR'

    const status    = order?.status
    const cancelled = isCancelled(status)
    const delivered = isDelivered(status)

    const isScheduled = order?.mode === 'SCHEDULED' || order?.modeCommande === 'SCHEDULED'

    const totalAmount = Math.max(0, Number(order?.montantTotal) || 0)
    const paidAmount  = Math.max(0, Number(order?.montantPaye)  || 0)
    const fullyPaid   = totalAmount > 0 && (totalAmount - paidAmount) <= 0.05

    return {
      isAdmin, isEmploye, isLivreur,
      canEdit:              (isAdmin || isEmploye || (isLivreur && isPickupPhase(status))) && !delivered && !cancelled,
      canDelete:            isAdmin,
      canAddLaboPhoto:      (isAdmin || isEmploye) && !delivered && !cancelled,
      canAddReceptionPhoto: (isAdmin || isEmploye || isLivreur) && !delivered && !cancelled,
      canAddPayment:        (isAdmin || isEmploye || isLivreur) && !cancelled && !fullyPaid,
      canAssignDriver:      (isAdmin || isEmploye) && isReadyForDelivery(status),
      canAssignPickupDriver:(isAdmin || isEmploye) && isScheduled && status === 'PENDING_PICKUP',
      canConfirmPickup:     (isAdmin || isEmploye || isLivreur) && isScheduled && status === 'PENDING_PICKUP',
      canChangeStatus:      (isAdmin || isEmploye) && !delivered,
      fullyPaid, totalAmount, paidAmount,
    }
  }, [user, order?.status, order?.montantTotal, order?.montantPaye, order?.mode, order?.modeCommande])
}
