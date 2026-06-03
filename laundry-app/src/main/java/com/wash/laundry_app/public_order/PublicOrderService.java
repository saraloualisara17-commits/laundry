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
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Iterator;
import java.util.concurrent.ConcurrentHashMap;

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

    // ── Per-phone abuse throttle ────────────────────────────────────────────
    // A second layer of defence after the per-IP RateLimitInterceptor: stops
    // an attacker who rotates IPs (e.g. via a residential proxy network) from
    // hammering the form for the same phone number. Sized for normal usage —
    // a real customer never submits more than 1–2 orders per hour.
    private static final int  MAX_ORDERS_PER_PHONE_PER_HOUR = 3;
    private static final long PHONE_WINDOW_MS               = 60L * 60L * 1000L; // 1 hour

    private final ConcurrentHashMap<String, Deque<Long>> recentByPhone = new ConcurrentHashMap<>();

    @Transactional
    public String createPublicOrder(PublicOrderRequest req) {

        // ── 0. Per-phone hourly throttle ──────────────────────────────────────
        // Runs before any DB work so abusive bursts cost nothing.
        enforcePhoneThrottle(req.getClientPhone());


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

        // Record the timestamp only after the order is committed-ready —
        // throwing earlier inside the transaction must NOT consume the quota.
        recordPhoneSubmission(req.getClientPhone());

        return commande.getNumeroCommande();
    }

    // ── Per-phone throttle helpers ──────────────────────────────────────────

    private void enforcePhoneThrottle(String phone) {
        if (phone == null || phone.isBlank()) return;
        long now = System.currentTimeMillis();
        long cutoff = now - PHONE_WINDOW_MS;

        Deque<Long> history = recentByPhone.get(phone);
        if (history == null) return;

        synchronized (history) {
            // Prune timestamps that fell outside the window
            while (!history.isEmpty() && history.peekFirst() < cutoff) {
                history.pollFirst();
            }
            if (history.size() >= MAX_ORDERS_PER_PHONE_PER_HOUR) {
                throw new TooManyPublicOrdersException(
                        "Trop de commandes pour ce numéro. Veuillez réessayer plus tard.");
            }
        }
    }

    private void recordPhoneSubmission(String phone) {
        if (phone == null || phone.isBlank()) return;
        long now = System.currentTimeMillis();
        recentByPhone.compute(phone, (k, history) -> {
            Deque<Long> dq = (history != null) ? history : new ArrayDeque<>(4);
            synchronized (dq) { dq.addLast(now); }
            return dq;
        });
    }

    /**
     * Evicts phone entries with no recent submissions every 10 minutes so the
     * map can't grow unbounded across millions of phone numbers over time.
     */
    @Scheduled(fixedDelay = 10L * 60L * 1000L)
    public void evictStalePhoneHistory() {
        long cutoff = System.currentTimeMillis() - PHONE_WINDOW_MS;
        for (Iterator<java.util.Map.Entry<String, Deque<Long>>> it = recentByPhone.entrySet().iterator(); it.hasNext(); ) {
            Deque<Long> dq = it.next().getValue();
            synchronized (dq) {
                while (!dq.isEmpty() && dq.peekFirst() < cutoff) dq.pollFirst();
                if (dq.isEmpty()) it.remove();
            }
        }
    }
}
