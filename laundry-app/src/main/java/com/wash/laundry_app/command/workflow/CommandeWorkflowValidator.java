package com.wash.laundry_app.command.workflow;

import com.wash.laundry_app.command.Commande;
import com.wash.laundry_app.command.CommandeStatus;
import com.wash.laundry_app.command.ForbiddenOperationException;
import com.wash.laundry_app.users.Role;
import com.wash.laundry_app.users.User;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

/**
 * Central state machine for the Commande workflow.
 *
 * <p>This is the ONLY place where valid transitions and role permissions are defined.
 * All status changes must pass through {@link #validate(Commande, CommandeStatus, User)}
 * before being applied to the entity. This guarantees workflow integrity regardless of
 * which controller or service initiates the change.
 *
 * <p>Intended state graph:
 * <pre>
 *   PENDING_PICKUP  → PICKED_UP              [LIVREUR (pickup driver only), ADMIN]
 *   PENDING_PICKUP  → CANCELLED              [LIVREUR (pickup driver only), EMPLOYE, ADMIN]
 *   PICKED_UP       → IN_PROCESS             [EMPLOYE, ADMIN]
 *   PICKED_UP       → CANCELLED              [EMPLOYE, ADMIN]
 *   IN_PROCESS      → READY_FOR_DELIVERY     [EMPLOYE, ADMIN]
 *   IN_PROCESS      → CANCELLED              [EMPLOYE, ADMIN]
 *   READY_FOR_DELIVERY → DELIVERED           [LIVREUR (delivery driver only), ADMIN]
 *   READY_FOR_DELIVERY → CANCELLED           [ADMIN]
 *   DELIVERED       → (terminal)
 *   CANCELLED       → (terminal)
 * </pre>
 *
 * <p>ADMIN is fully constrained — no bypass. This was intentionally chosen so that
 * every workflow change has a valid audit trail.
 */
@Component
public class CommandeWorkflowValidator {

    /** from → set of allowed "to" statuses */
    private static final Map<CommandeStatus, Set<CommandeStatus>> VALID_TRANSITIONS =
            new EnumMap<>(CommandeStatus.class);

    /** "FROM_TO" key → set of roles permitted to execute that transition */
    private static final Map<String, Set<Role>> TRANSITION_ROLES = new HashMap<>();

    static {
        // ── Valid transition graph ────────────────────────────────────────────
        VALID_TRANSITIONS.put(CommandeStatus.PENDING_PICKUP, Set.of(
                CommandeStatus.PICKED_UP,
                CommandeStatus.PICKUP_FAILED,
                CommandeStatus.CANCELLED
        ));
        VALID_TRANSITIONS.put(CommandeStatus.PICKED_UP, Set.of(
                CommandeStatus.IN_PROCESS,
                CommandeStatus.CANCELLED
        ));
        VALID_TRANSITIONS.put(CommandeStatus.IN_PROCESS, Set.of(
                CommandeStatus.READY_FOR_DELIVERY,
                CommandeStatus.CANCELLED
        ));
        VALID_TRANSITIONS.put(CommandeStatus.READY_FOR_DELIVERY, Set.of(
                CommandeStatus.DELIVERED,
                CommandeStatus.DELIVERY_FAILED,
                CommandeStatus.CANCELLED
        ));
        // Failure states — admin can reschedule or cancel
        VALID_TRANSITIONS.put(CommandeStatus.PICKUP_FAILED, Set.of(
                CommandeStatus.PENDING_PICKUP,
                CommandeStatus.CANCELLED
        ));
        VALID_TRANSITIONS.put(CommandeStatus.DELIVERY_FAILED, Set.of(
                CommandeStatus.READY_FOR_DELIVERY,
                CommandeStatus.CANCELLED
        ));
        // Terminal states — no outgoing transitions
        VALID_TRANSITIONS.put(CommandeStatus.DELIVERED, Set.of());
        VALID_TRANSITIONS.put(CommandeStatus.CANCELLED, Set.of());

        // ── Role permissions per transition ───────────────────────────────────
        addRole(CommandeStatus.PENDING_PICKUP,    CommandeStatus.PICKED_UP,           Role.LIVREUR, Role.ADMIN);
        addRole(CommandeStatus.PENDING_PICKUP,    CommandeStatus.PICKUP_FAILED,       Role.LIVREUR, Role.ADMIN);
        addRole(CommandeStatus.PENDING_PICKUP,    CommandeStatus.CANCELLED,           Role.LIVREUR, Role.EMPLOYE, Role.ADMIN);
        addRole(CommandeStatus.PICKED_UP,         CommandeStatus.IN_PROCESS,          Role.EMPLOYE, Role.ADMIN);
        addRole(CommandeStatus.PICKED_UP,         CommandeStatus.CANCELLED,           Role.EMPLOYE, Role.ADMIN);
        addRole(CommandeStatus.IN_PROCESS,        CommandeStatus.READY_FOR_DELIVERY,  Role.EMPLOYE, Role.ADMIN);
        addRole(CommandeStatus.IN_PROCESS,        CommandeStatus.CANCELLED,           Role.EMPLOYE, Role.ADMIN);
        addRole(CommandeStatus.READY_FOR_DELIVERY, CommandeStatus.DELIVERED,          Role.LIVREUR, Role.ADMIN);
        addRole(CommandeStatus.READY_FOR_DELIVERY, CommandeStatus.DELIVERY_FAILED,    Role.LIVREUR, Role.ADMIN);
        addRole(CommandeStatus.READY_FOR_DELIVERY, CommandeStatus.CANCELLED,          Role.ADMIN);
        addRole(CommandeStatus.PICKUP_FAILED,     CommandeStatus.PENDING_PICKUP,      Role.ADMIN);
        addRole(CommandeStatus.PICKUP_FAILED,     CommandeStatus.CANCELLED,           Role.ADMIN);
        addRole(CommandeStatus.DELIVERY_FAILED,   CommandeStatus.READY_FOR_DELIVERY,  Role.ADMIN);
        addRole(CommandeStatus.DELIVERY_FAILED,   CommandeStatus.CANCELLED,           Role.ADMIN);
    }

    private static void addRole(CommandeStatus from, CommandeStatus to, Role... roles) {
        TRANSITION_ROLES.put(transitionKey(from, to), Set.of(roles));
    }

    private static String transitionKey(CommandeStatus from, CommandeStatus to) {
        return from.name() + "_" + to.name();
    }

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Validates the requested transition, role permission, and (for LIVREUR) ownership.
     *
     * @param commande    the order being updated
     * @param newStatus   the target status
     * @param currentUser the authenticated user requesting the change
     * @throws InvalidTransitionException  if the transition does not exist in the graph
     * @throws ForbiddenOperationException if the user's role is not permitted, or
     *                                     if ownership validation fails for LIVREUR
     */
    public void validate(Commande commande, CommandeStatus newStatus, User currentUser) {
        CommandeStatus currentStatus = commande.getStatus();
        Role role = currentUser.getRole();

        // 1. Verify the transition exists in the graph
        Set<CommandeStatus> allowed = VALID_TRANSITIONS.get(currentStatus);
        if (allowed == null || !allowed.contains(newStatus)) {
            throw new InvalidTransitionException(String.format(
                    "Transition invalide: %s → %s n'est pas autorisée. " +
                    "Les transitions disponibles depuis cet état sont: %s",
                    currentStatus.name(), newStatus.name(),
                    allowed != null ? allowed : "aucune (état terminal)"));
        }

        // 2. Verify the caller's role is permitted for this specific transition
        String key = transitionKey(currentStatus, newStatus);
        Set<Role> permittedRoles = TRANSITION_ROLES.get(key);
        if (permittedRoles == null || !permittedRoles.contains(role)) {
            throw new ForbiddenOperationException(String.format(
                    "Votre rôle (%s) n'est pas autorisé à effectuer la transition %s → %s.",
                    role.name(), currentStatus.name(), newStatus.name()));
        }

        // 3. LIVREUR-specific ownership check
        if (role == Role.LIVREUR) {
            validateLivreurOwnership(commande, currentStatus, newStatus, currentUser);
        }
    }

    /**
     * Returns true if the given transition is structurally valid (ignores role/ownership).
     * Useful for display logic (e.g., deciding which buttons to show in the UI).
     */
    public boolean isValidTransition(CommandeStatus from, CommandeStatus to) {
        Set<CommandeStatus> allowed = VALID_TRANSITIONS.get(from);
        return allowed != null && allowed.contains(to);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private void validateLivreurOwnership(Commande commande, CommandeStatus from,
                                          CommandeStatus to, User currentUser) {
        switch (from) {
            case PENDING_PICKUP -> {
                // Only the assigned pickup driver may confirm pickup or cancel
                User pickupDriver = commande.getPickupDriver();
                if (pickupDriver == null || !pickupDriver.getId().equals(currentUser.getId())) {
                    throw new ForbiddenOperationException(
                            "Vous n'êtes pas le livreur de collecte assigné à cette commande.");
                }
            }
            case READY_FOR_DELIVERY -> {
                // Only the assigned delivery driver may confirm delivery
                User deliveryDriver = commande.getDeliveryDriver();
                if (deliveryDriver == null || !deliveryDriver.getId().equals(currentUser.getId())) {
                    throw new ForbiddenOperationException(
                            "Vous n'êtes pas le livreur de livraison assigné à cette commande.");
                }
            }
            default -> {
                // For other livreur-permitted transitions, no extra ownership check is needed
            }
        }
    }
}
