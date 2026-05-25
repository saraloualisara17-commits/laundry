package com.wash.laundry_app.command.services;

import com.wash.laundry_app.auth.AuthService;
import com.wash.laundry_app.clients.Client;
import com.wash.laundry_app.clients.ClientNotFoundException;
import com.wash.laundry_app.clients.ClientRepository;
import com.wash.laundry_app.command.*;
import com.wash.laundry_app.command.PaymentGuard;
import com.wash.laundry_app.command.events.OrderSideEffectEvent;
import com.wash.laundry_app.users.User;
import com.wash.laundry_app.users.UserRepository;
import com.wash.laundry_app.audit.AuditService;
import lombok.AllArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
@AllArgsConstructor
public class CommandeCreationService {

    private final CommandeRepository commandeRepository;
    private final CommandeTapisRepository commandeTapisRepository;
    private final ClientRepository clientRepository;
    private final CommandeMapper commandeMapper;
    private final AuthService authService;
    private final UserRepository userRepository;
    private final CommandeHelperService helperService;
    private final AuditService auditService;
    private final PaiementRepository paiementRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public CommandeDTO createCommande(CreateCommandeRequest request) {
        User creator = authService.currentUser();

        // ── Idempotency check ────────────────────────────────────────────────
        // If the client retries after a network drop (server committed but
        // response was lost), return the existing order instead of creating
        // a duplicate. Key is a UUID generated once per creation attempt.
        if (request.getCreationIdempotencyKey() != null && !request.getCreationIdempotencyKey().isBlank()) {
            var existing = commandeRepository.findByCreationIdempotencyKey(request.getCreationIdempotencyKey());
            if (existing.isPresent()) {
                return commandeMapper.toDto(existing.get());
            }
        }

        Client client = clientRepository.findById(request.getClientId())
                .orElseThrow(() -> new ClientNotFoundException("Client non trouvé"));

        ModeCommande mode = null;
        if (request.getMode() != null) {
            try {
                mode = ModeCommande.valueOf(request.getMode().toUpperCase());
            } catch (Exception e) {
                mode = ModeCommande.SCHEDULED; // Default to scheduled if invalid
            }
        } else {
            mode = ModeCommande.SCHEDULED; // Default if null
        }

        boolean isScheduled = ModeCommande.SCHEDULED.equals(mode);
        User pickupDriver = null;

        if (isScheduled) {
            if (request.getPickupDriverId() == null) {
                throw new IllegalArgumentException(
                        "Un livreur de collecte doit être assigné à la création d'une commande programmée (PICKUP).");
            }
            pickupDriver = userRepository.findById(request.getPickupDriverId())
                    .orElseThrow(() -> new RuntimeException("Livreur de collecte introuvable: " + request.getPickupDriverId()));
        }

        Commande commande = new Commande();
        commande.setClient(client);
        commande.setCreatedBy(creator);
        commande.setPickupDriver(pickupDriver);
        commande.setMode(mode);

        // Initial status based on mode
        if (isScheduled) {
            commande.setStatus(CommandeStatus.PENDING_PICKUP);
        } else {
            commande.setStatus(CommandeStatus.PICKED_UP); // For IMMEDIATE/Walk-in, carpets are already received
        }

        if (request.getPaymentMethod() != null) {
            try {
                commande.setModePaiement(ModePaiement.valueOf(request.getPaymentMethod().toUpperCase()));
            } catch (Exception ignored) { }
        }
        if (request.getNotes() != null) commande.setNotes(request.getNotes());
        if (request.getDeliveryType() != null) commande.setDeliveryType(request.getDeliveryType());

        // Snapshot delivery address at order creation time — prevents retroactive changes
        // if the client updates their saved address later.
        if (request.getDeliveryAddress() != null) {
            commande.setDeliveryAddress(request.getDeliveryAddress());
        } else if (!client.getAddresses().isEmpty()) {
            commande.setDeliveryAddress(client.getAddresses().get(0).getAddress());
        }
        if (request.getDeliveryLatitude() != null) {
            commande.setDeliveryLatitude(request.getDeliveryLatitude());
        } else if (!client.getAddresses().isEmpty() && client.getAddresses().get(0).getLatitude() != null) {
            commande.setDeliveryLatitude(client.getAddresses().get(0).getLatitude());
        }
        if (request.getDeliveryLongitude() != null) {
            commande.setDeliveryLongitude(request.getDeliveryLongitude());
        } else if (!client.getAddresses().isEmpty() && client.getAddresses().get(0).getLongitude() != null) {
            commande.setDeliveryLongitude(client.getAddresses().get(0).getLongitude());
        }

        commande.setCreationIdempotencyKey(request.getCreationIdempotencyKey());
        commande = commandeRepository.save(commande);

        BigDecimal total = BigDecimal.ZERO;
        int tagIndex = 1;
        for (CreateCommandeRequest.TapisItem itemReq : request.getTapis()) {
            CommandeTapis item = helperService.buildTapisItem(commande, itemReq, tagIndex++);
            item = commandeTapisRepository.save(item);
            helperService.attachItemImages(item, itemReq.getImageUrls());
            total = total.add(item.getPrixFinal() != null ? item.getPrixFinal() : BigDecimal.ZERO);
        }

        commande.setMontantTotal(total);
        if (request.getMontantPaye() != null && request.getMontantPaye().compareTo(BigDecimal.ZERO) > 0) {
            ModePaiement paymentMode = ModePaiement.ESPECES;
            if (request.getPaymentMethod() != null) {
                try { paymentMode = ModePaiement.valueOf(request.getPaymentMethod().toUpperCase()); } catch (Exception ignored) {}
            }
            // Validate before creating the record — same rules as addPayment
            PaymentGuard.validatePayment(request.getMontantPaye(), total, BigDecimal.ZERO);
            // Derive an idempotency key for this payment from the order key so that
            // if the creation is replayed (network retry after commit) the payment is
            // not inserted twice. The "-init" suffix scopes it to this specific event.
            String paymentKey = request.getCreationIdempotencyKey() != null
                    ? request.getCreationIdempotencyKey() + "-init"
                    : null;
            Paiement initialPayment = Paiement.builder()
                    .commande(commande)
                    .montant(request.getMontantPaye())
                    .datePaiement(java.time.LocalDateTime.now())
                    .note("Paiement à la création")
                    .recordedBy(creator)
                    .modePaiement(paymentMode)
                    .idempotencyKey(paymentKey)
                    .build();
            paiementRepository.save(initialPayment);
            // Derive montantPaye from the DB sum — not from the request directly.
            // This ensures montantPaye always equals SUM(paiements.montant).
            BigDecimal totalPaid = paiementRepository.sumByCommandeId(commande.getId());
            commande.setMontantPaye(totalPaid != null ? totalPaid : BigDecimal.ZERO);
        }
        helperService.attachOrderImages(commande, request.getImageUrls());
        commande = commandeRepository.save(commande);

        helperService.recordAudit(commande, null, commande.getStatus().name(), creator, "Commande créée");
        auditService.log("ORDER_CREATED", "COMMANDE", commande.getId(),
                         null, "CREATED", "Num: " + commande.getNumeroCommande());

        // All broadcasts and notifications fire AFTER_COMMIT via OrderSideEffectListener.
        eventPublisher.publishEvent(OrderSideEffectEvent.created(commande.getId(), commande.getNumeroCommande()));
        if (pickupDriver != null) {
            eventPublisher.publishEvent(OrderSideEffectEvent.pickupDriverAssigned(
                    commande.getId(), pickupDriver.getId(), pickupDriver.getName(), commande.getNumeroCommande()));
        }

        return commandeMapper.toDto(commande);
    }
}
