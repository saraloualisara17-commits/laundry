import { Colors } from './theme';

export type OrderStatus =
  | 'PENDING_PICKUP'
  | 'PICKED_UP'
  | 'IN_PROCESS'
  | 'READY_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'PICKUP_FAILED'
  | 'DELIVERY_FAILED';

export interface WorkflowAction {
  labelKey: string;
  nextStatus: OrderStatus | null;
  bg: string;
  icon: string;
  textColor?: string;
  disabled?: boolean;
  requiresDriverModal?: boolean;
  requiresDeliveryModal?: boolean;
}

/**
 * Centralized definition of the order workflow.
 * Maps current status to the next logical action.
 */
export const ORDER_WORKFLOW: Record<OrderStatus, WorkflowAction> = {
  PENDING_PICKUP: {
    labelKey: 'admin.orders.actions.confirm_received',
    nextStatus: 'PICKED_UP',
    bg: Colors.primary,
    icon: 'check-circle'
  },
  PICKED_UP: {
    labelKey: 'admin.orders.actions.start_processing',
    nextStatus: 'IN_PROCESS',
    bg: Colors.info,
    icon: 'broom'
  },
  IN_PROCESS: {
    labelKey: 'admin.orders.actions.mark_ready',
    nextStatus: 'READY_FOR_DELIVERY',
    bg: Colors.accent,
    icon: 'check-circle',
    textColor: '#0D1B2A',
    requiresDriverModal: true,
  },
  READY_FOR_DELIVERY: {
    labelKey: 'admin.orders.actions.mark_delivered',
    nextStatus: 'DELIVERED',
    bg: Colors.success,
    icon: 'truck',
    requiresDeliveryModal: true
  },
  DELIVERED: {
    labelKey: 'status.DELIVERED',
    nextStatus: null,
    bg: Colors.success,
    disabled: true,
    icon: 'check-double'
  },
  CANCELLED: {
    labelKey: 'status.CANCELLED',
    nextStatus: null,
    bg: Colors.danger,
    disabled: true,
    icon: 'times-circle'
  },
  // Failure states — Admin can reschedule from these on the backend.
  // No direct UI action button; they show as informational terminal states.
  PICKUP_FAILED: {
    labelKey: 'status.PICKUP_FAILED',
    nextStatus: null,
    bg: Colors.danger,
    disabled: true,
    icon: 'exclamation-circle'
  },
  DELIVERY_FAILED: {
    labelKey: 'status.DELIVERY_FAILED',
    nextStatus: null,
    bg: Colors.danger,
    disabled: true,
    icon: 'exclamation-triangle'
  },
};

/**
 * Returns the workflow action for a given status.
 */
export const getWorkflowAction = (status: OrderStatus): WorkflowAction | null => {
  return ORDER_WORKFLOW[status] || null;
};

/**
 * Checks if a status transition is valid.
 */
export const canTransition = (current: OrderStatus, next: OrderStatus): boolean => {
  const action = ORDER_WORKFLOW[current];
  return action?.nextStatus === next;
};

/**
 * Roles that can perform specific transitions if logic needs to be more granular.
 * Currently, general permissions (isAdmin, isEmploye, isLivreur) are handled in useOrderPermissions.
 */
export const isTransitionAllowedForRole = (status: OrderStatus, role: string): boolean => {
  const normalizedRole = role.toUpperCase();
  
  // Example: If certain transitions were Admin only, we would define them here.
  // For now, we preserve existing behavior where visibility is managed by action existence.
  return true;
};

/**
 * Helper to identify if the order is in the pickup phase.
 */
export const isPickupPhase = (status: OrderStatus | string): boolean => {
  return status === 'PENDING_PICKUP' || status === 'PICKED_UP' || status === 'PICKUP_FAILED';
};

/**
 * Helper to identify if the order is delivered.
 */
export const isDelivered = (status: OrderStatus | string): boolean => {
  return status === 'DELIVERED';
};

/**
 * Helper to identify if the order is cancelled.
 */
export const isCancelled = (status: OrderStatus | string): boolean => {
  return status === 'CANCELLED';
};

/**
 * Helper to identify if the order is ready for delivery.
 */
export const isReadyForDelivery = (status: OrderStatus | string): boolean => {
  return status === 'READY_FOR_DELIVERY';
};
