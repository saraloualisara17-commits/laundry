package com.wash.laundry_app.command;

import java.math.BigDecimal;

/**
 * Stateless invariant enforcer for payment operations.
 *
 * Three rules must hold across ALL payment paths (creation, addPayment, recordPayment,
 * delivery auto-payment). Previously each path had its own ad-hoc checks — or none at all.
 * This class is the single place those rules live.
 *
 * INTENTIONALLY NOT a Spring @Service: it has no dependencies, no state, and is called
 * from three different services. A static utility is the right tool here.
 */
public final class PaymentGuard {

    private PaymentGuard() {}

    /** Tolerance for floating-point rounding in MAD amounts (0.01 dirham). */
    private static final BigDecimal ROUNDING_TOLERANCE = new BigDecimal("0.01");

    /**
     * Validates a payment amount before creating a Paiement record.
     *
     * @param amount        the payment amount to validate
     * @param montantTotal  the order total
     * @param montantPaye   the amount already paid (may be null — treated as zero)
     * @throws IllegalArgumentException if any invariant is violated
     */
    public static void validatePayment(BigDecimal amount, BigDecimal montantTotal, BigDecimal montantPaye) {
        // Rule 1: payment amount must be positive
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Le montant du paiement doit être positif.");
        }

        // Rule 2: payment amount must not be astronomically large (sanity bound)
        if (amount.compareTo(new BigDecimal("999999")) > 0) {
            throw new IllegalArgumentException("Le montant du paiement est anormalement élevé.");
        }

        // Rule 3: payment must not cause total paid to exceed total owed
        BigDecimal currentPaid = montantPaye != null ? montantPaye : BigDecimal.ZERO;
        BigDecimal remaining = (montantTotal != null ? montantTotal : BigDecimal.ZERO).subtract(currentPaid);
        // Allow ROUNDING_TOLERANCE to absorb floating-point imprecision (e.g. 0.005 MAD)
        if (amount.compareTo(remaining.add(ROUNDING_TOLERANCE)) > 0) {
            throw new IllegalArgumentException(
                    String.format("Le montant du paiement (%.2f MAD) dépasse le reste à payer (%.2f MAD).",
                            amount, remaining.max(BigDecimal.ZERO)));
        }
    }

    /**
     * Resolves the effective payment amount when the caller did not provide an explicit amount.
     * Returns the full remaining balance — i.e., "pay off the order."
     */
    public static BigDecimal resolveAmount(BigDecimal requested, BigDecimal montantTotal, BigDecimal montantPaye) {
        if (requested != null && requested.compareTo(BigDecimal.ZERO) > 0) {
            return requested;
        }
        return remainingBalance(montantTotal, montantPaye);
    }

    /**
     * Calculates the remaining balance for an order.
     * Safe to call from mappers and display logic — never negative.
     */
    public static BigDecimal remainingBalance(BigDecimal montantTotal, BigDecimal montantPaye) {
        BigDecimal total = montantTotal != null ? montantTotal : BigDecimal.ZERO;
        BigDecimal paid  = montantPaye  != null ? montantPaye  : BigDecimal.ZERO;
        return total.subtract(paid).max(BigDecimal.ZERO);
    }
}
