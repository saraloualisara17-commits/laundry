/**
 * Hook for managing order-related permissions based on user roles and order status.
 */

import { useMemo } from 'react';
import { 
  isPickupPhase, 
  isDelivered, 
  isReadyForDelivery 
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
}

export const useOrderPermissions = (user: any, order: any): OrderPermissions => {
  return useMemo(() => {
    const role = user?.role?.toUpperCase();
    
    const isAdmin = role === 'ADMIN';
    const isEmploye = role === 'EMPLOYE';
    const isLivreur = role === 'LIVREUR';

    const status = order?.status;

    // canDelete: Only Admins can delete orders
    const canDelete = isAdmin;

    // canEdit: Admin/Employee can edit anytime unless delivered. 
    // Livreur can only edit during pickup phases.
    const canEdit = (isAdmin || isEmploye || (isLivreur && isPickupPhase(status))) && !isDelivered(status);

    // canAddLaboPhoto: Internal staff only
    const canAddLaboPhoto = isAdmin || isEmploye;

    // canAddReceptionPhoto: Everyone can add reception photos
    const canAddReceptionPhoto = isAdmin || isEmploye || isLivreur;

    // canAddPayment: Currently allowed for admins on delivered orders in the details view
    const canAddPayment = isAdmin && isDelivered(status);

    // canAssignDriver: Internal staff can assign drivers when order is ready
    const canAssignDriver = (isAdmin || isEmploye) && isReadyForDelivery(status);

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
    };
  }, [user, order?.status]); // Memoize based on user and status
};

export default useOrderPermissions;
