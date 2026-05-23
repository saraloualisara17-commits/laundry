package com.wash.laundry_app.command.events;

import com.wash.laundry_app.command.CommandeStatus;

/**
 * Published inside a @Transactional method; consumed by OrderSideEffectListener
 * under @TransactionalEventListener(AFTER_COMMIT).
 *
 * This guarantees that WebSocket broadcasts and push notifications are only sent
 * after the database transaction has successfully committed. If the transaction
 * rolls back (optimistic lock conflict, validation failure, DB error), the event
 * is discarded and no client receives a phantom update.
 */
public record OrderSideEffectEvent(
        String eventType,
        Long orderId,
        CommandeStatus newStatus,
        Long assignedUserId,
        String assignedUserName,
        String orderNumber
) {
    /** Convenience factory for status-change events. */
    public static OrderSideEffectEvent statusChanged(Long orderId, CommandeStatus newStatus) {
        return new OrderSideEffectEvent("ORDER_STATUS_CHANGED", orderId, newStatus, null, null, null);
    }

    /** Convenience factory for generic order-updated events (no status change). */
    public static OrderSideEffectEvent updated(Long orderId) {
        return new OrderSideEffectEvent("ORDER_UPDATED", orderId, null, null, null, null);
    }

    /** Convenience factory for order-deleted events. */
    public static OrderSideEffectEvent deleted(Long orderId) {
        return new OrderSideEffectEvent("ORDER_DELETED", orderId, null, null, null, null);
    }

    /** Convenience factory for driver-assignment events (includes notification target). */
    public static OrderSideEffectEvent driverAssigned(Long orderId, Long driverId, String driverName, String orderNumber) {
        return new OrderSideEffectEvent("ORDER_DRIVER_ASSIGNED", orderId, null, driverId, driverName, orderNumber);
    }

    /** Convenience factory for payment-recorded events. */
    public static OrderSideEffectEvent paymentAdded(Long orderId) {
        return new OrderSideEffectEvent("ORDER_PAYMENT_ADDED", orderId, null, null, null, null);
    }

    /** Convenience factory for order-created events (includes order number for notification). */
    public static OrderSideEffectEvent created(Long orderId, String orderNumber) {
        return new OrderSideEffectEvent("ORDER_CREATED", orderId, null, null, null, orderNumber);
    }

    /** Convenience factory for pickup-driver notification on order creation. */
    public static OrderSideEffectEvent pickupDriverAssigned(Long orderId, Long driverId, String driverName, String orderNumber) {
        return new OrderSideEffectEvent("ORDER_PICKUP_DRIVER_ASSIGNED", orderId, null, driverId, driverName, orderNumber);
    }
}
