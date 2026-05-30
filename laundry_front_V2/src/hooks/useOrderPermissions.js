import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { isPickupPhase, isDelivered, isReadyForDelivery } from '../constants/orderWorkflow'

export function useOrderPermissions(order) {
  const user = useSelector((state) => state.auth.user)

  return useMemo(() => {
    const role = user?.role?.toUpperCase()

    const isAdmin   = role === 'ADMIN'
    const isEmploye = role === 'EMPLOYE'
    const isLivreur = role === 'LIVREUR'

    const status    = order?.status
    const delivered = isDelivered(status)

    const totalAmount = Math.max(0, Number(order?.montantTotal) || 0)
    const paidAmount  = Math.max(0, Number(order?.montantPaye)  || 0)
    const fullyPaid   = totalAmount > 0 && (totalAmount - paidAmount) <= 0.05

    return {
      isAdmin,
      isEmploye,
      isLivreur,
      canEdit:               (isAdmin || isEmploye || (isLivreur && isPickupPhase(status))) && !delivered,
      canDelete:             isAdmin,
      canAddLaboPhoto:       (isAdmin || isEmploye) && !delivered,
      canAddReceptionPhoto:  (isAdmin || isEmploye || isLivreur) && !delivered,
      canAddPayment:         (isAdmin || isEmploye || isLivreur) && delivered && !fullyPaid,
      canAssignDriver:       (isAdmin || isEmploye) && isReadyForDelivery(status),
      canAssignPickupDriver: (isAdmin || isEmploye) && status === 'PENDING_PICKUP',
    }
  }, [user, order?.status, order?.montantTotal, order?.montantPaye])
}
