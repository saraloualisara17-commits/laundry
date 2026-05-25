package com.wash.laundry_app.alerts;

import com.wash.laundry_app.command.CommandeRepository;
import com.wash.laundry_app.notifications.NotificationService;
import com.wash.laundry_app.users.Role;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class OperationalAlertSchedulerService {

    private static final String OVERDUE_PICKUP     = "OVERDUE_PICKUP";
    private static final String DELAYED_DELIVERY   = "DELAYED_DELIVERY";
    private static final String UNPAID_DEBT        = "UNPAID_DEBT";

    /** Orders not picked up within this many hours are flagged as overdue. */
    @Value("${alerts.overdue-pickup-hours:24}")
    private int overduePickupHours;

    /** Orders ready for delivery but not delivered within this many hours are flagged. */
    @Value("${alerts.delayed-delivery-hours:48}")
    private int delayedDeliveryHours;

    /** Delivered orders with outstanding balance older than this many days are flagged. */
    @Value("${alerts.unpaid-debt-days:7}")
    private int unpaidDebtDays;

    private final CommandeRepository commandeRepository;
    private final OperationalAlertRepository alertRepository;
    private final NotificationService notificationService;

    /** Runs every 30 minutes. Scans for overdue pickups and delayed deliveries. */
    @Scheduled(fixedDelayString = "${alerts.scan-interval-ms:1800000}")
    @Transactional
    public void scanForOperationalAlerts() {
        scanOverduePickups();
        scanDelayedDeliveries();
    }

    /** Runs daily at 08:00. Scans for clients with long-standing unpaid balances. */
    @Scheduled(cron = "0 0 8 * * *")
    @Transactional
    public void scanForUnpaidDebts() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(unpaidDebtDays);
        List<com.wash.laundry_app.command.Commande> orders = commandeRepository.findDeliveredWithUnpaidBalance(cutoff);

        int created = 0;
        for (var order : orders) {
            if (alertRepository.existsByAlertTypeAndClient_IdAndResolvedFalse(UNPAID_DEBT, order.getClient().getId())) {
                continue;
            }
            java.math.BigDecimal unpaid = order.getMontantTotal().subtract(
                    order.getMontantPaye() != null ? order.getMontantPaye() : java.math.BigDecimal.ZERO);
            String msg = String.format(
                    "Client '%s' has an unpaid balance of %.2f MAD on order #%s delivered on %s.",
                    order.getClient().getName(),
                    unpaid,
                    order.getNumeroCommande(),
                    order.getDateLivraison() != null ? order.getDateLivraison().toLocalDate() : "N/A");
            var alert = OperationalAlert.builder()
                    .alertType(UNPAID_DEBT)
                    .commande(order)
                    .client(order.getClient())
                    .severity("WARNING")
                    .message(msg)
                    .resolved(false)
                    .build();
            alertRepository.save(alert);
            notificationService.notifyRole(
                    Role.ADMIN,
                    "Dette Impayée",
                    "Commande #" + order.getNumeroCommande() + " — solde impayé de " + String.format("%.2f", unpaid) + " MAD",
                    UNPAID_DEBT,
                    order.getId().toString()
            );
            created++;
        }
        if (created > 0) {
            log.info("[Alerts] Created {} UNPAID_DEBT alerts", created);
        }
    }

    private void scanOverduePickups() {
        LocalDateTime cutoff = LocalDateTime.now().minusHours(overduePickupHours);
        List<com.wash.laundry_app.command.Commande> orders = commandeRepository.findOverduePickups(cutoff);

        int created = 0;
        for (var order : orders) {
            if (alertRepository.existsByAlertTypeAndCommande_IdAndResolvedFalse(OVERDUE_PICKUP, order.getId())) {
                continue;
            }
            var alert = OperationalAlert.builder()
                    .alertType(OVERDUE_PICKUP)
                    .commande(order)
                    .client(order.getClient())
                    .severity("WARNING")
                    .message(String.format(
                            "Order #%s for client '%s' has been waiting for pickup for over %d hours (created: %s).",
                            order.getNumeroCommande(),
                            order.getClient().getName(),
                            overduePickupHours,
                            order.getDateCreation()))
                    .resolved(false)
                    .build();
            alertRepository.save(alert);
            notificationService.notifyRole(
                    Role.ADMIN,
                    "Collecte en Retard",
                    "Commande #" + order.getNumeroCommande() + " attend depuis plus de " + overduePickupHours + "h",
                    OVERDUE_PICKUP,
                    order.getId().toString()
            );
            created++;
        }
        if (created > 0) {
            log.info("[Alerts] Created {} OVERDUE_PICKUP alerts", created);
        }
    }

    private void scanDelayedDeliveries() {
        LocalDateTime cutoff = LocalDateTime.now().minusHours(delayedDeliveryHours);
        List<com.wash.laundry_app.command.Commande> orders = commandeRepository.findDelayedDeliveries(cutoff);

        int created = 0;
        for (var order : orders) {
            if (alertRepository.existsByAlertTypeAndCommande_IdAndResolvedFalse(DELAYED_DELIVERY, order.getId())) {
                continue;
            }
            var alert = OperationalAlert.builder()
                    .alertType(DELAYED_DELIVERY)
                    .commande(order)
                    .client(order.getClient())
                    .severity("CRITICAL")
                    .message(String.format(
                            "Order #%s for client '%s' has been ready for delivery for over %d hours (created: %s).",
                            order.getNumeroCommande(),
                            order.getClient().getName(),
                            delayedDeliveryHours,
                            order.getDateCreation()))
                    .resolved(false)
                    .build();
            alertRepository.save(alert);
            notificationService.notifyRole(
                    Role.ADMIN,
                    "Livraison Retardée",
                    "Commande #" + order.getNumeroCommande() + " est prête depuis plus de " + delayedDeliveryHours + "h",
                    DELAYED_DELIVERY,
                    order.getId().toString()
            );
            // Also notify the assigned delivery driver if there is one
            if (order.getDeliveryDriver() != null) {
                notificationService.createNotification(
                        order.getDeliveryDriver(),
                        "Livraison en Attente",
                        "La commande #" + order.getNumeroCommande() + " vous attend depuis plus de " + delayedDeliveryHours + "h",
                        DELAYED_DELIVERY,
                        order.getId().toString()
                );
            }
            created++;
        }
        if (created > 0) {
            log.info("[Alerts] Created {} DELAYED_DELIVERY alerts", created);
        }
    }
}
