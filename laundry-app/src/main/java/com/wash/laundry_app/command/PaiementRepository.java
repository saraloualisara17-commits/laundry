package com.wash.laundry_app.command;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public interface PaiementRepository extends JpaRepository<Paiement, Long> {

    List<Paiement> findByCommandeIdOrderByDatePaiementDesc(Long commandeId);

    java.util.Optional<Paiement> findByIdempotencyKey(String idempotencyKey);

    @Query("SELECT COALESCE(SUM(p.montant), 0) FROM Paiement p WHERE p.commande.id = :commandeId")
    BigDecimal sumByCommandeId(@Param("commandeId") Long commandeId);

    /**
     * Total revenue collected in a time window — uses the payment timestamp,
     * not the order creation date. This correctly captures payments made today
     * on orders created on previous days.
     */
    @Query("SELECT COALESCE(SUM(p.montant), 0) FROM Paiement p " +
           "WHERE p.datePaiement >= :start AND p.datePaiement <= :end")
    BigDecimal sumCollectedBetween(
        @Param("start") LocalDateTime start,
        @Param("end")   LocalDateTime end);

    /**
     * Count of distinct orders that received at least one payment in the window.
     */
    @Query("SELECT COUNT(DISTINCT p.commande.id) FROM Paiement p " +
           "WHERE p.datePaiement >= :start AND p.datePaiement <= :end")
    long countOrdersWithPaymentBetween(
        @Param("start") LocalDateTime start,
        @Param("end")   LocalDateTime end);

    /**
     * Revenue grouped by date — replaces getLastNDaysStatistics() N-query loop.
     * Returns one row per day: Object[]{date (LocalDate), sumMontant (BigDecimal)}.
     * The caller builds the full N-day list and fills zero for missing dates.
     */
    @Query("SELECT CAST(p.datePaiement AS date), COALESCE(SUM(p.montant), 0) " +
           "FROM Paiement p " +
           "WHERE p.datePaiement >= :start AND p.datePaiement <= :end " +
           "GROUP BY CAST(p.datePaiement AS date) " +
           "ORDER BY CAST(p.datePaiement AS date) ASC")
    List<Object[]> sumCollectedGroupedByDate(
        @Param("start") LocalDateTime start,
        @Param("end")   LocalDateTime end);
}
