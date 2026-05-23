package com.wash.laundry_app.command.events;

import com.wash.laundry_app.notifications.NotificationService;
import com.wash.laundry_app.realtime.RealtimeService;
import com.wash.laundry_app.users.Role;
import com.wash.laundry_app.users.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Handles all post-commit side effects for order operations.
 *
 * WHY THIS EXISTS:
 * Before this listener, RealtimeService.broadcastOrderEvent() and
 * NotificationService.createNotification() were called directly inside
 * @Transactional methods in CommandeWorkflowService — before the transaction
 * committed. This caused two correctness problems:
 *
 *   1. If the transaction rolled back (optimistic lock, DB error, validation),
 *      the WebSocket event had already been sent. Mobile clients would show a
 *      status change that does not exist in the database.
 *
 *   2. Notifications were saved to the DB in a nested transaction, then the
 *      outer transaction could roll back — leaving orphan notification records
 *      pointing to a state transition that never happened.
 *
 * SOLUTION:
 * CommandeWorkflowService now publishes an OrderSideEffectEvent via
 * ApplicationEventPublisher. Spring only delivers the event to this listener
 * after the publishing transaction has committed (AFTER_COMMIT phase). If the
 * transaction rolls back, the event is discarded — no broadcast, no notification.
 *
 * FALLBACK BEHAVIOR (phase = AFTER_COMMIT):
 * If this listener itself throws, the transaction is already committed. The order
 * state is consistent in the DB. The side effect (WebSocket/notification) is lost
 * for that event, but no data is corrupted. This is the correct trade-off for an
 * operational system: prefer silent side-effect failure over phantom client state.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OrderSideEffectListener {

    private final RealtimeService realtimeService;
    private final NotificationService notificationService;
    private final UserRepository userRepository;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onOrderEvent(OrderSideEffectEvent event) {
        try {
            switch (event.eventType()) {
                case "ORDER_STATUS_CHANGED" ->
                        realtimeService.broadcastOrderEvent(
                                "ORDER_STATUS_CHANGED", event.orderId(), event.newStatus());

                case "ORDER_UPDATED" ->
                        realtimeService.broadcastOrderEvent(
                                "ORDER_UPDATED", event.orderId(), null);

                case "ORDER_DELETED" ->
                        realtimeService.broadcastOrderEvent(
                                "ORDER_DELETED", event.orderId(), null);

                case "ORDER_DRIVER_ASSIGNED" -> {
                    realtimeService.broadcastOrderEvent(
                            "ORDER_UPDATED", event.orderId(), null);
                    if (event.assignedUserId() != null) {
                        userRepository.findById(event.assignedUserId()).ifPresent(driver ->
                                notificationService.createNotification(
                                        driver,
                                        "Nouvelle Mission",
                                        "Vous avez été assigné à la livraison de la commande #" + event.orderNumber(),
                                        "ORDER_ASSIGNED",
                                        event.orderId().toString()
                                )
                        );
                    }
                }

                case "ORDER_PAYMENT_ADDED" ->
                        realtimeService.broadcastOrderEvent(
                                "ORDER_PAYMENT_ADDED", event.orderId(), null);

                case "ORDER_CREATED" -> {
                    realtimeService.broadcastOrderEvent(
                            "ORDER_CREATED", event.orderId(), event.orderNumber());
                    // Notify all admins and employees of new order
                    notificationService.notifyRole(
                            Role.ADMIN,
                            "Nouvelle Commande",
                            "Commande #" + event.orderNumber() + " a été créée",
                            "NEW_ORDER",
                            event.orderId().toString()
                    );
                }

                case "ORDER_PICKUP_DRIVER_ASSIGNED" -> {
                    if (event.assignedUserId() != null) {
                        userRepository.findById(event.assignedUserId()).ifPresent(driver ->
                                notificationService.createNotification(
                                        driver,
                                        "Nouvelle Mission de Collecte",
                                        "Vous avez été assigné à la collecte de la commande #" + event.orderNumber(),
                                        "ORDER_ASSIGNED",
                                        event.orderId().toString()
                                )
                        );
                    }
                }

                default -> log.warn("OrderSideEffectListener: unknown event type '{}'", event.eventType());
            }
        } catch (Exception ex) {
            // Side effect failure must never surface as a user-facing error.
            // The transaction is already committed; data integrity is preserved.
            log.error("OrderSideEffectListener failed for event {} orderId={}: {}",
                    event.eventType(), event.orderId(), ex.getMessage(), ex);
        }
    }
}
