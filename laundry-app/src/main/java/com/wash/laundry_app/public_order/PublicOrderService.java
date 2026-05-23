package com.wash.laundry_app.public_order;

import com.wash.laundry_app.audit.AuditService;
import com.wash.laundry_app.clients.Client;
import com.wash.laundry_app.clients.ClientAddress;
import com.wash.laundry_app.clients.ClientPhone;
import com.wash.laundry_app.clients.ClientRepository;
import com.wash.laundry_app.command.*;
import com.wash.laundry_app.command.events.OrderSideEffectEvent;
import com.wash.laundry_app.command.services.CommandeHelperService;
import com.wash.laundry_app.users.Role;
import com.wash.laundry_app.users.User;
import com.wash.laundry_app.users.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

/**
 * Handles order creation from the public-facing web form.
 *
 * Completely independent from AuthService / SecurityContext —
 * public clients are NOT authenticated users, so we never call
 * authService.currentUser(). A system admin is fetched directly
 * from the DB and used as the createdBy reference.
 */
@Service
@RequiredArgsConstructor
public class PublicOrderService {

    private final ClientRepository          clientRepository;
    private final UserRepository            userRepository;
    private final CommandeRepository        commandeRepository;
    private final CommandeTapisRepository   commandeTapisRepository;
    private final CommandeHelperService     helperService;
    private final AuditService              auditService;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public String createPublicOrder(PublicOrderRequest req) {

        // ── 1. System user for audit logging only — not used as createdBy ────
        User systemUser = userRepository.findByRole(Role.ADMIN)
                .stream()
                .findFirst()
                .orElseThrow(() -> new RuntimeException(
                        "Aucun administrateur trouvé — impossible de créer la commande publique."));

        // ── 2. Find or create client by phone ─────────────────────────────────
        Client client = clientRepository.findByPhone(req.getClientPhone())
                .orElseGet(() -> {
                    Client newClient = new Client();
                    newClient.setName(req.getClientName());
                    newClient.setCreatedBy(systemUser);

                    ClientPhone phone = new ClientPhone();
                    phone.setPhoneNumber(req.getClientPhone());
                    phone.setClient(newClient);
                    newClient.getPhones().add(phone);

                    if (req.getClientAddress() != null && !req.getClientAddress().isBlank()) {
                        ClientAddress addr = new ClientAddress();
                        addr.setAddress(req.getClientAddress());
                        addr.setLatitude(req.getDeliveryLatitude());
                        addr.setLongitude(req.getDeliveryLongitude());
                        addr.setClient(newClient);
                        newClient.getAddresses().add(addr);
                    }

                    return clientRepository.save(newClient);
                });

        // ── 3. Build the order ────────────────────────────────────────────────
        Commande commande = new Commande();
        commande.setClient(client);
        commande.setCreatedBy(null);                 // no staff involved — client submitted themselves
        commande.setSelfSubmitted(true);
        commande.setMode(ModeCommande.SCHEDULED);    // public orders always require pickup
        commande.setStatus(CommandeStatus.PENDING_PICKUP);
        commande.setModePaiement(ModePaiement.ESPECES);

        if (req.getNotes() != null && !req.getNotes().isBlank()) {
            commande.setNotes(req.getNotes());
        }

        // Snapshot delivery coordinates so later address edits don't affect this order
        if (req.getClientAddress() != null && !req.getClientAddress().isBlank()) {
            commande.setDeliveryAddress(req.getClientAddress());
            commande.setDeliveryLatitude(req.getDeliveryLatitude());
            commande.setDeliveryLongitude(req.getDeliveryLongitude());
        } else if (!client.getAddresses().isEmpty()) {
            ClientAddress saved = client.getAddresses().get(0);
            commande.setDeliveryAddress(saved.getAddress());
            commande.setDeliveryLatitude(saved.getLatitude());
            commande.setDeliveryLongitude(saved.getLongitude());
        }

        commande = commandeRepository.save(commande);

        // ── 4. Create order items ─────────────────────────────────────────────
        BigDecimal total    = BigDecimal.ZERO;
        int        tagIndex = 1;

        for (PublicOrderRequest.PublicOrderItem itemReq : req.getItems()) {
            // Re-use the existing helper to build, price, and tag each item
            CreateCommandeRequest.TapisItem tapisItem = new CreateCommandeRequest.TapisItem();
            tapisItem.setProductId(itemReq.getProductId());
            tapisItem.setQuantite(itemReq.getQuantite());
            tapisItem.setLargeur(itemReq.getLargeur());
            tapisItem.setLongueur(itemReq.getLongueur());
            tapisItem.setPoids(itemReq.getPoids());

            CommandeTapis item = helperService.buildTapisItem(commande, tapisItem, tagIndex++);
            item  = commandeTapisRepository.save(item);
            total = total.add(item.getPrixFinal() != null ? item.getPrixFinal() : BigDecimal.ZERO);
        }

        commande.setMontantTotal(total);
        commande = commandeRepository.save(commande);

        // ── 5. Audit ──────────────────────────────────────────────────────────
        helperService.recordAudit(
                commande, null, commande.getStatus().name(),
                systemUser, "Commande publique créée (formulaire web)");
        auditService.log("ORDER_CREATED", "COMMANDE", commande.getId(),
                null, "CREATED", "Public: " + commande.getNumeroCommande());

        // ── 6. Notify admin (fires AFTER_COMMIT) ──────────────────────────────
        eventPublisher.publishEvent(
                OrderSideEffectEvent.created(commande.getId(), commande.getNumeroCommande()));

        return commande.getNumeroCommande();
    }
}
