package com.wash.laundry_app.command.services;

import com.wash.laundry_app.auth.AuthService;
import com.wash.laundry_app.command.*;
import com.wash.laundry_app.command.PaymentGuard;
import com.wash.laundry_app.command.events.OrderSideEffectEvent;
import com.wash.laundry_app.command.workflow.CommandeWorkflowValidator;
import com.wash.laundry_app.users.User;
import com.wash.laundry_app.users.UserRepository;
import com.wash.laundry_app.audit.AuditService;
import lombok.AllArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Service
@AllArgsConstructor
public class CommandeWorkflowService {

    private final CommandeRepository commandeRepository;
    private final CommandeTapisRepository commandeTapisRepository;
    private final CommandeImageRepository commandeImageRepository;
    private final PaiementRepository paiementRepository;
    private final CommandeMapper commandeMapper;
    private final AuthService authService;
    private final UserRepository userRepository;
    private final CommandeWorkflowValidator workflowValidator;
    private final CommandeHelperService helperService;
    private final AuditService auditService;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public CommandeDTO updateStatus(Long commandeId, UpdateCommandeStatusRequest request) {
        User currentUser = authService.currentUser();
        Commande commande = commandeRepository.findById(commandeId)
                .orElseThrow(CommandeNotFoundException::new);

        String oldStatus = commande.getStatus().name();

        workflowValidator.validate(commande, request.getStatus(), currentUser);
        commande.setStatus(request.getStatus());

        if (request.getStatus() == CommandeStatus.DELIVERED) {
            commande.setDateLivraison(LocalDateTime.now());
            BigDecimal montantCollecte = request.getMontantCollecte();
            if (montantCollecte != null && montantCollecte.compareTo(BigDecimal.ZERO) > 0) {

                // ── Idempotency guard for delivery payment ────────────────────
                // If the client retries the DELIVERED transition after a network
                // timeout (the server committed but the response was lost), the
                // status transition itself will be rejected by the workflow
                // validator (DELIVERED → DELIVERED is invalid). But if somehow
                // the retry reaches here, a duplicate payment must not be created.
                // The paymentIdempotencyKey catches this at the DB level.
                boolean paymentAlreadyRecorded = request.getPaymentIdempotencyKey() != null
                        && paiementRepository.findByIdempotencyKey(request.getPaymentIdempotencyKey()).isPresent();

                if (!paymentAlreadyRecorded) {
                    PaymentGuard.validatePayment(montantCollecte, commande.getMontantTotal(), commande.getMontantPaye());
                    Paiement paiement = Paiement.builder()
                            .commande(commande)
                            .montant(montantCollecte)
                            .datePaiement(LocalDateTime.now())
                            .note(request.getNotesPaiement() != null ? request.getNotesPaiement() : "Paiement à la livraison")
                            .recordedBy(currentUser)
                            .idempotencyKey(request.getPaymentIdempotencyKey())
                            .build();
                    paiementRepository.save(paiement);
                }
                BigDecimal totalPaid = paiementRepository.sumByCommandeId(commande.getId());
                commande.setMontantPaye(totalPaid != null ? totalPaid : BigDecimal.ZERO);
            } else if (commande.getMontantPaye() == null) {
                commande.setMontantPaye(BigDecimal.ZERO);
            }
        }

        commande = commandeRepository.save(commande);
        helperService.recordAudit(commande, oldStatus, request.getStatus().name(), currentUser, request.getCommentaire());
        auditService.log("ORDER_STATUS_CHANGED", "COMMANDE", commande.getId(),
                         oldStatus, request.getStatus().name(), request.getCommentaire());

        // Broadcast happens AFTER_COMMIT — no phantom updates on rollback.
        eventPublisher.publishEvent(OrderSideEffectEvent.statusChanged(commande.getId(), commande.getStatus()));

        return commandeMapper.toDto(commande);
    }

    @Transactional
    public CommandeDTO updateCommande(Long id, UpdateCommandeRequest request) {
        User currentUser = authService.currentUser();
        Commande commande = commandeRepository.findById(id).orElseThrow(CommandeNotFoundException::new);

        if (request.getVersion() != null && !request.getVersion().equals(commande.getVersion())) {
            throw new org.springframework.orm.ObjectOptimisticLockingFailureException(Commande.class, id);
        }

        if (request.getLivreurId() != null) {
            userRepository.findById(request.getLivreurId())
                    .ifPresent(commande::setPickupDriver);
        }
        if (request.getDeliveryDriverId() != null) {
            String oldDriver = commande.getDeliveryDriver() != null ? commande.getDeliveryDriver().getName() : "None";
            User newDriver = userRepository.findById(request.getDeliveryDriverId()).orElse(null);
            commande.setDeliveryDriver(newDriver);
            auditService.log("ORDER_DRIVER_ASSIGNED", "COMMANDE", commande.getId(),
                             oldDriver, newDriver != null ? newDriver.getName() : "None", "Delivery Driver Updated");

            // Notification sent AFTER_COMMIT so the driver only receives it if the
            // assignment actually persisted. orderId not yet set on commande here,
            // so we capture the values now and let the listener do the DB lookup.
            if (newDriver != null) {
                eventPublisher.publishEvent(OrderSideEffectEvent.driverAssigned(
                        commande.getId(), newDriver.getId(), newDriver.getName(), commande.getNumeroCommande()));
            }
        }
        if (request.getDateLivraison() != null) commande.setDateLivraison(request.getDateLivraison());
        if (request.getScheduledPickupDate() != null) commande.setScheduledPickupDate(request.getScheduledPickupDate());
        if (request.getScheduledDeliveryDate() != null) commande.setScheduledDeliveryDate(request.getScheduledDeliveryDate());
        if (request.getNotes() != null) commande.setNotes(request.getNotes());

        if (request.getStatus() != null) {
            String oldStatus = commande.getStatus().name();
            workflowValidator.validate(commande, request.getStatus(), currentUser);
            commande.setStatus(request.getStatus());
            helperService.recordAudit(commande, oldStatus, request.getStatus().name(), currentUser, "Mise à jour via admin");
            auditService.log("ORDER_STATUS_CHANGED", "COMMANDE", commande.getId(), 
                             oldStatus, request.getStatus().name(), "Mise à jour via admin");
        }

        if (request.getTapis() != null) {
            for (CommandeTapis existing : commande.getCommandeTapis()) {
                commandeImageRepository.archiveByCommandeTapisId(existing.getId());
            }
            commandeTapisRepository.deleteAll(commande.getCommandeTapis());
            commande.getCommandeTapis().clear();

            BigDecimal total = BigDecimal.ZERO;
            int tagIndex = 1;
            for (CreateCommandeRequest.TapisItem itemReq : request.getTapis()) {
                CommandeTapis item = helperService.buildTapisItem(commande, itemReq, tagIndex++);
                item = commandeTapisRepository.save(item);
                helperService.attachItemImages(item, itemReq.getImageUrls());
                total = total.add(item.getPrixFinal() != null ? item.getPrixFinal() : BigDecimal.ZERO);
                commande.getCommandeTapis().add(item);
            }
            commande.setMontantTotal(total);
        }

        if (request.getImageUrls() != null) {
            commande.getImages().removeIf(img -> img.getCommandeTapis() == null && !Boolean.TRUE.equals(img.getIsArchived()));
            helperService.attachOrderImages(commande, request.getImageUrls());
        }

        commande = commandeRepository.save(commande);
        eventPublisher.publishEvent(OrderSideEffectEvent.updated(commande.getId()));
        return commandeMapper.toDto(commande);
    }

    @Transactional
    public void deleteCommande(Long id) {
        Commande commande = commandeRepository.findById(id).orElseThrow(CommandeNotFoundException::new);
        String snapshot = "Num: " + commande.getNumeroCommande() + " | Status: " + commande.getStatus().name()
                + " | Total: " + commande.getMontantTotal();
        auditService.log("ORDER_DELETED", "COMMANDE", id, snapshot, null, null);
        commandeRepository.deleteById(id);
        eventPublisher.publishEvent(OrderSideEffectEvent.deleted(id));
    }

    @Transactional
    public CommandeDTO returnToWorkplace(Long id) {
        User currentUser = authService.currentUser();
        Commande commande = commandeRepository.findById(id).orElseThrow(CommandeNotFoundException::new);
        String oldStatus = commande.getStatus().name();
        
        workflowValidator.validate(commande, CommandeStatus.PICKED_UP, currentUser);
        commande.setStatus(CommandeStatus.PICKED_UP);
        
        commande = commandeRepository.save(commande);
        helperService.recordAudit(commande, oldStatus, CommandeStatus.PICKED_UP.name(), currentUser, "Retournée à l'atelier");
        auditService.log("ORDER_STATUS_CHANGED", "COMMANDE", commande.getId(),
                         oldStatus, CommandeStatus.PICKED_UP.name(), "Retournée à l'atelier");
        eventPublisher.publishEvent(OrderSideEffectEvent.statusChanged(commande.getId(), commande.getStatus()));
        return commandeMapper.toDto(commande);
    }

    @Transactional
    public CommandeDTO updateItemsByPickupDriver(Long id, java.util.List<CreateCommandeRequest.TapisItem> items) {
        User currentUser = authService.currentUser();
        Commande commande = commandeRepository.findById(id).orElseThrow(CommandeNotFoundException::new);

        if (commande.getStatus() != CommandeStatus.PENDING_PICKUP) {
            throw new IllegalStateException("Order must be in PENDING_PICKUP status to edit items");
        }
        if (commande.getLivreur() == null || !commande.getLivreur().getId().equals(currentUser.getId())) {
            throw new org.springframework.security.access.AccessDeniedException("You are not the pickup driver for this order");
        }

        for (CommandeTapis existing : commande.getCommandeTapis()) {
            commandeImageRepository.archiveByCommandeTapisId(existing.getId());
        }
        commandeTapisRepository.deleteAll(commande.getCommandeTapis());
        commande.getCommandeTapis().clear();

        java.math.BigDecimal total = java.math.BigDecimal.ZERO;
        int tagIndex = 1;
        for (CreateCommandeRequest.TapisItem itemReq : items) {
            CommandeTapis item = helperService.buildTapisItem(commande, itemReq, tagIndex++);
            item = commandeTapisRepository.save(item);
            helperService.attachItemImages(item, itemReq.getImageUrls());
            total = total.add(item.getPrixFinal() != null ? item.getPrixFinal() : java.math.BigDecimal.ZERO);
            commande.getCommandeTapis().add(item);
        }
        commande.setMontantTotal(total);

        commande = commandeRepository.save(commande);
        auditService.log("ORDER_ITEMS_UPDATED_BY_DRIVER", "COMMANDE", commande.getId(),
                         null, "Items updated by pickup driver", null);
        eventPublisher.publishEvent(OrderSideEffectEvent.updated(commande.getId()));
        return commandeMapper.toDto(commande);
    }

    @Transactional
    public CommandeDTO confirmPickup(Long id, java.util.List<CreateCommandeRequest.TapisItem> items) {
        User currentUser = authService.currentUser();
        Commande commande = commandeRepository.findById(id).orElseThrow(CommandeNotFoundException::new);

        if (commande.getStatus() != CommandeStatus.PENDING_PICKUP) {
            throw new IllegalStateException("Order must be in PENDING_PICKUP status to confirm pickup");
        }

        boolean isLivreur = currentUser.getRole() == com.wash.laundry_app.users.Role.LIVREUR;
        if (isLivreur && (commande.getLivreur() == null || !commande.getLivreur().getId().equals(currentUser.getId()))) {
            throw new org.springframework.security.access.AccessDeniedException("You are not the pickup driver for this order");
        }

        if (items != null && !items.isEmpty()) {
            for (CommandeTapis existing : commande.getCommandeTapis()) {
                commandeImageRepository.archiveByCommandeTapisId(existing.getId());
            }
            commandeTapisRepository.deleteAll(commande.getCommandeTapis());
            commande.getCommandeTapis().clear();

            java.math.BigDecimal total = java.math.BigDecimal.ZERO;
            int tagIndex = 1;
            for (CreateCommandeRequest.TapisItem itemReq : items) {
                CommandeTapis item = helperService.buildTapisItem(commande, itemReq, tagIndex++);
                item = commandeTapisRepository.save(item);
                helperService.attachItemImages(item, itemReq.getImageUrls());
                total = total.add(item.getPrixFinal() != null ? item.getPrixFinal() : java.math.BigDecimal.ZERO);
                commande.getCommandeTapis().add(item);
            }
            commande.setMontantTotal(total);
        }

        String oldStatus = commande.getStatus().name();
        workflowValidator.validate(commande, CommandeStatus.PICKED_UP, currentUser);
        commande.setStatus(CommandeStatus.PICKED_UP);

        commande = commandeRepository.save(commande);
        helperService.recordAudit(commande, oldStatus, CommandeStatus.PICKED_UP.name(), currentUser, "Pickup confirmé");
        auditService.log("ORDER_PICKUP_CONFIRMED", "COMMANDE", commande.getId(),
                         oldStatus, CommandeStatus.PICKED_UP.name(), "Pickup confirmé");
        eventPublisher.publishEvent(OrderSideEffectEvent.statusChanged(commande.getId(), commande.getStatus()));
        return commandeMapper.toDto(commande);
    }

    @Transactional
    public CommandeDTO annulerCommande(Long id) {
        User currentUser = authService.currentUser();
        Commande commande = commandeRepository.findById(id).orElseThrow(CommandeNotFoundException::new);
        String oldStatus = commande.getStatus().name();
        
        workflowValidator.validate(commande, CommandeStatus.CANCELLED, currentUser);
        commande.setStatus(CommandeStatus.CANCELLED);
        
        commande = commandeRepository.save(commande);
        helperService.recordAudit(commande, oldStatus, CommandeStatus.CANCELLED.name(), currentUser, "Annulée");
        auditService.log("ORDER_STATUS_CHANGED", "COMMANDE", commande.getId(),
                         oldStatus, CommandeStatus.CANCELLED.name(), "Annulée");
        eventPublisher.publishEvent(OrderSideEffectEvent.statusChanged(commande.getId(), commande.getStatus()));
        return commandeMapper.toDto(commande);
    }
}
