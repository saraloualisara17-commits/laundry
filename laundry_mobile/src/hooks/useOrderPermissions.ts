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
  // True when the current user is allowed to trigger the "Confirm Picked Up" flow
  // (which opens order-items to add products before marking the order PICKED_UP).
  // Only applies to SCHEDULED orders — immediate orders start as PICKED_UP already.
  // Scheduled: Admin or the assigned Livreur.
  canConfirmPickup: boolean;
  // Livreur-specific: true only when they are the assigned pickup or delivery driver
  canChangeStatus: boolean;
}

export const useOrderPermissions = (user: any, order: any): OrderPermissions => {
  return useMemo(() => {
    const role = user?.role?.toUpperCase();

    const isAdmin = role === 'ADMIN';
    const isEmploye = role === 'EMPLOYE';
    const isLivreur = role === 'LIVREUR';

    const status = order?.status;
    const delivered = isDelivered(status);
    const cancelled = status === 'CANCELLED';

    const totalAmount = Math.max(0, Number(order?.montantTotal) || 0);
    const paidAmount = Math.max(0, Number(order?.montantPaye) || 0);
    const fullyPaid = totalAmount > 0 && (totalAmount - paidAmount) <= 0.05;

    const canDelete = isAdmin;

    const canEdit = (isAdmin || isEmploye || isLivreur) && !delivered;

    // No photos needed once the order is delivered
    const canAddLaboPhoto = (isAdmin || isEmploye || isLivreur) && !delivered;
    const canAddReceptionPhoto = (isAdmin || isEmploye || isLivreur) && !delivered;

    // No payment button when already fully paid
    const canAddPayment = (isAdmin || isEmploye || isLivreur) && !cancelled && !fullyPaid;

    const canAssignDriver = (isAdmin || isEmploye || isLivreur) && isReadyForDelivery(status);
    const orderMode = order?.mode?.toLowerCase();
    const isScheduled = orderMode === 'scheduled';

    // Pickup driver assignment only relevant for scheduled orders
    const canAssignPickupDriver = (isAdmin || isEmploye || isLivreur) && status === 'PENDING_PICKUP' && isScheduled;

    // Confirm pickup: scheduled orders only
    const canConfirmPickup =
      status === 'PENDING_PICKUP' &&
      isScheduled &&
      (isAdmin || isEmploye || isLivreur);

    // All roles can change status
    const canChangeStatus = isAdmin || isEmploye || isLivreur;

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
      canConfirmPickup,
      canChangeStatus,
    };
  }, [user, order?.status, order?.mode, order?.montantTotal, order?.montantPaye, order?.livreur?.id, order?.deliveryDriver?.id]);
};

export default useOrderPermissions;
