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

    const totalAmount = Math.max(0, Number(order?.montantTotal) || 0);
    const paidAmount = Math.max(0, Number(order?.montantPaye) || 0);
    const fullyPaid = totalAmount > 0 && (totalAmount - paidAmount) <= 0.05;

    const canDelete = isAdmin;

    const canEdit = (isAdmin || isEmploye || (isLivreur && isPickupPhase(status))) && !delivered;

    // No photos needed once the order is delivered
    const canAddLaboPhoto = (isAdmin || isEmploye || isLivreur) && !delivered;
    const canAddReceptionPhoto = (isAdmin || isEmploye || isLivreur) && !delivered;

    // No payment button when already fully paid
    // LIVREUR can also add payment — they collect cash at delivery
    const canAddPayment = (isAdmin || isEmploye || isLivreur) && delivered && !fullyPaid;

    const canAssignDriver = (isAdmin || isEmploye || isLivreur) && isReadyForDelivery(status);
    const orderMode = order?.mode?.toLowerCase(); // 'immediate' or 'scheduled'
    const isScheduled = orderMode === 'scheduled';

    // Pickup driver assignment only relevant for scheduled orders
    const canAssignPickupDriver = (isAdmin || isEmploye || isLivreur) && status === 'PENDING_PICKUP' && isScheduled;

    // Confirm pickup: scheduled orders only (immediate start as PICKED_UP, no pickup step)
    // Scheduled: Admin or the assigned Livreur
    const canConfirmPickup =
      status === 'PENDING_PICKUP' &&
      isScheduled &&
      (isAdmin || isLivreur);

    // Livreur can only change status when they are the assigned pickup OR delivery driver
    const livreurIsPickupDriver = isLivreur && order?.livreur?.id != null && String(order.livreur.id) === String(user?.id);
    const livreurIsDeliveryDriver = isLivreur && order?.deliveryDriver?.id != null && String(order.deliveryDriver.id) === String(user?.id);
    const canChangeStatus = isAdmin || isEmploye || livreurIsPickupDriver || livreurIsDeliveryDriver;

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
