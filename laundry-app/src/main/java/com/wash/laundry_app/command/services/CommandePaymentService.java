package com.wash.laundry_app.command.services;

import com.wash.laundry_app.auth.AuthService;
import com.wash.laundry_app.command.*;
import com.wash.laundry_app.command.events.OrderSideEffectEvent;
import com.wash.laundry_app.users.User;
import com.wash.laundry_app.audit.AuditService;
import lombok.AllArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@AllArgsConstructor
public class CommandePaymentService {

    private final CommandeRepository commandeRepository;
    private final PaiementRepository paiementRepository;
    private final CommandeMapper commandeMapper;
    private final AuthService authService;
    private final CommandeHelperService helperService;
    private final AuditService auditService;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public CommandeDTO recordPayment(Long id, RecordPaymentRequest request) {
        User currentUser = authService.currentUser();

        // ── Idempotency check ────────────────────────────────────────────────
        // If the client provided an idempotency key and we already have a payment
        // with that key, return the order as if the operation succeeded without
        // creating a duplicate. This handles the common case of the mobile app
        // retrying after a network timeout.
        if (request.getIdempotencyKey() != null && !request.getIdempotencyKey().isBlank()) {
            var existing = paiementRepository.findByIdempotencyKey(request.getIdempotencyKey());
            if (existing.isPresent()) {
                Commande cached = existing.get().getCommande();
                return commandeMapper.toDto(commandeRepository.findById(cached.getId())
                        .orElseThrow(CommandeNotFoundException::new));
            }
        }

        Commande commande = commandeRepository.findById(id)
                .orElseThrow(CommandeNotFoundException::new);

        if (commande.getStatus() == CommandeStatus.CANCELLED) {
            throw new ForbiddenOperationException("Impossible d'enregistrer un paiement sur une commande annulée.");
        }

        ModePaiement mode = request.getModePaiement() != null ? request.getModePaiement() : ModePaiement.ESPECES;

        BigDecimal amount = PaymentGuard.resolveAmount(
                request.getMontant(), commande.getMontantTotal(), commande.getMontantPaye());
        PaymentGuard.validatePayment(amount, commande.getMontantTotal(), commande.getMontantPaye());

        Paiement paiement = Paiement.builder()
                .commande(commande)
                .montant(amount)
                .datePaiement(LocalDateTime.now())
                .note(request.getNote() != null ? request.getNote() : "Paiement enregistré")
                .recordedBy(currentUser)
                .modePaiement(mode)
                .idempotencyKey(request.getIdempotencyKey())
                .build();
        paiementRepository.save(paiement);

        BigDecimal totalPaid = paiementRepository.sumByCommandeId(commande.getId());
        commande.setMontantPaye(totalPaid != null ? totalPaid : BigDecimal.ZERO);
        commande.setModePaiement(mode);
        commande = commandeRepository.save(commande);

        helperService.recordAudit(commande, commande.getStatus().name(), commande.getStatus().name(), currentUser,
                "Paiement enregistré: " + amount + " MAD (" + mode.name() + ")");
        auditService.log("PAYMENT_RECORDED", "COMMANDE", commande.getId(),
                         null, amount.toString(), "Mode: " + mode.name());
        eventPublisher.publishEvent(OrderSideEffectEvent.paymentAdded(commande.getId()));

        return commandeMapper.toDto(commande);
    }

    @Transactional
    public PaiementDTO addPayment(Long id, BigDecimal amount, String note, ModePaiement modePaiement, String idempotencyKey) {
        User currentUser = authService.currentUser();

        // ── Idempotency check ────────────────────────────────────────────────
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            var existing = paiementRepository.findByIdempotencyKey(idempotencyKey);
            if (existing.isPresent()) {
                Paiement p = existing.get();
                return PaiementDTO.builder()
                        .id(p.getId())
                        .commandeId(p.getCommande().getId())
                        .montant(p.getMontant())
                        .datePaiement(p.getDatePaiement())
                        .note(p.getNote())
                        .recordedByName(p.getRecordedBy() != null ? p.getRecordedBy().getName() : null)
                        .modePaiement(p.getModePaiement())
                        .build();
            }
        }

        Commande commande = commandeRepository.findById(id)
                .orElseThrow(CommandeNotFoundException::new);

        if (commande.getStatus() == CommandeStatus.CANCELLED) {
            throw new ForbiddenOperationException("Impossible d'ajouter un paiement sur une commande annulée.");
        }
        PaymentGuard.validatePayment(amount, commande.getMontantTotal(), commande.getMontantPaye());

        ModePaiement mode = modePaiement != null ? modePaiement : ModePaiement.ESPECES;

        Paiement paiement = Paiement.builder()
                .commande(commande)
                .montant(amount)
                .datePaiement(LocalDateTime.now())
                .note(note)
                .recordedBy(currentUser)
                .modePaiement(mode)
                .idempotencyKey(idempotencyKey)
                .build();
        paiement = paiementRepository.save(paiement);

        BigDecimal totalPaid = paiementRepository.sumByCommandeId(commande.getId());
        commande.setMontantPaye(totalPaid != null ? totalPaid : BigDecimal.ZERO);
        commandeRepository.save(commande);

        helperService.recordAudit(commande, commande.getStatus().name(), commande.getStatus().name(), currentUser,
                "Paiement ajouté: " + amount + " MAD" + " (" + mode.name() + ")");
        auditService.log("PAYMENT_ADDED", "COMMANDE", commande.getId(),
                         null, amount.toString(), "Note: " + note);
        eventPublisher.publishEvent(OrderSideEffectEvent.paymentAdded(commande.getId()));

        return PaiementDTO.builder()
                .id(paiement.getId())
                .commandeId(commande.getId())
                .montant(paiement.getMontant())
                .datePaiement(paiement.getDatePaiement())
                .note(paiement.getNote())
                .recordedByName(currentUser.getName())
                .modePaiement(paiement.getModePaiement())
                .build();
    }

    @Transactional(readOnly = true)
    public List<PaiementDTO> getPayments(Long id) {
        return paiementRepository.findByCommandeIdOrderByDatePaiementDesc(id).stream()
                .map(p -> PaiementDTO.builder()
                        .id(p.getId())
                        .commandeId(p.getCommande().getId())
                        .montant(p.getMontant())
                        .datePaiement(p.getDatePaiement())
                        .note(p.getNote())
                        .recordedByName(p.getRecordedBy() != null ? p.getRecordedBy().getName() : null)
                        .modePaiement(p.getModePaiement())
                        .build())
                .toList();
    }
}
