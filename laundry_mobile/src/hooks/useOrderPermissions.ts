import { useMemo } from 'react';
import {
  isPickupPhase,
  isDelivered,
  isReadyForDelivery,
} from '../../constants/orderWorkflow';

export interface OrderPermissions {
  isAdmin: boolean;
  isEmploye: boolean;
  isLivreur: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canAddLaboPhoto: boolean;
  canAddReceptionPhoto: boolean;
  canAddPayment: boolean;
  canAssignDriver: boolean;
  canAssignPickupDriver: boolean;
}

export const useOrderPermissions = (user: any, order: any): OrderPermissions => {
  return useMemo(() => {
    const role = user?.role?.toUpperCase();

    const isAdmin = role === 'ADMIN';
    const isEmploye = role === 'EMPLOYE';
    const isLivreur = role === 'LIVREUR';

    const status = order?.status;
    const delivered = isDelivered(status);

    const totalAmount = Math.max(0, Number(order?.montantTotal) || 0);
    const paidAmount = Math.max(0, Number(order?.montantPaye) || 0);
    const fullyPaid = totalAmount > 0 && (totalAmount - paidAmount) <= 0.05;

    const canDelete = isAdmin;

    const canEdit = (isAdmin || isEmploye || (isLivreur && isPickupPhase(status))) && !delivered;

    // No photos needed once the order is delivered
    const canAddLaboPhoto = (isAdmin || isEmploye) && !delivered;
    const canAddReceptionPhoto = (isAdmin || isEmploye || isLivreur) && !delivered;

    // No payment button when already fully paid
    const canAddPayment = (isAdmin || isEmploye) && delivered && !fullyPaid;

    const canAssignDriver = (isAdmin || isEmploye) && isReadyForDelivery(status);
    const canAssignPickupDriver = (isAdmin || isEmploye) && status === 'PENDING_PICKUP';

    return {
      isAdmin,
      isEmploye,
      isLivreur,
      canEdit,
      canDelete,
      canAddLaboPhoto,
      canAddReceptionPhoto,
      canAddPayment,
      canAssignDriver,
      canAssignPickupDriver,
    };
  }, [user, order?.status, order?.montantTotal, order?.montantPaye]);
};

export default useOrderPermissions;
