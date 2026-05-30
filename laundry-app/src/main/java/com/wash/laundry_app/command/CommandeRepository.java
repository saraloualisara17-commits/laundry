package com.wash.laundry_app.command;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface CommandeRepository extends JpaRepository<Commande, Long> {

    @Query("SELECT c FROM Commande c LEFT JOIN FETCH c.client WHERE c.id = :id")
    Optional<Commande> findWithClientDetailsById(@Param("id") Long id);

    // Receipt loading — split across 6 queries to avoid Hibernate "cannot fetch multiple bags" error.
    // Hibernate forbids JOIN FETCH on more than one @OneToMany List<> (bag) per query.
    // Client.phones and Client.addresses are both bags, so they must be fetched separately.
    //
    // Query 1: Commande scalars + ManyToOne associations only (no bags at all).
    @Query("SELECT DISTINCT c FROM Commande c " +
           "LEFT JOIN FETCH c.client cl " +
           "LEFT JOIN FETCH c.livreur " +
           "LEFT JOIN FETCH c.deliveryDriver " +
           "WHERE c.id = :id")
    Optional<Commande> findForReceiptById(@Param("id") Long id);

    // Query 1b: client phones bag (one bag — safe to fetch alone).
    @Query("SELECT DISTINCT c FROM Commande c " +
           "LEFT JOIN FETCH c.client cl " +
           "LEFT JOIN FETCH cl.phones " +
           "WHERE c.id = :id")
    Optional<Commande> findWithClientPhonesById(@Param("id") Long id);

    // Query 1c: client addresses bag (one bag — safe to fetch alone).
    @Query("SELECT DISTINCT c FROM Commande c " +
           "LEFT JOIN FETCH c.client cl " +
           "LEFT JOIN FETCH cl.addresses " +
           "WHERE c.id = :id")
    Optional<Commande> findWithClientAddressesById(@Param("id") Long id);

    // Query 2: order items + product (one bag).
    @Query("SELECT DISTINCT c FROM Commande c " +
           "LEFT JOIN FETCH c.commandeTapis ct " +
           "LEFT JOIN FETCH ct.product " +
           "WHERE c.id = :id")
    Optional<Commande> findWithItemsById(@Param("id") Long id);

    // Query 3: payments (one bag).
    @Query("SELECT DISTINCT c FROM Commande c " +
           "LEFT JOIN FETCH c.paiements " +
           "WHERE c.id = :id")
    Optional<Commande> findWithPaiementsById(@Param("id") Long id);

    // Query 4: attempts + attempt driver (one bag).
    @Query("SELECT DISTINCT c FROM Commande c " +
           "LEFT JOIN FETCH c.attempts att " +
           "LEFT JOIN FETCH att.driver " +
           "WHERE c.id = :id")
    Optional<Commande> findWithAttemptsById(@Param("id") Long id);

    @Query("SELECT COUNT(c) FROM Commande c WHERE c.status = :status")
    long countByStatus(@Param("status") CommandeStatus status);

    @Query("SELECT COALESCE(SUM(c.montantTotal), 0) FROM Commande c WHERE c.status = :status")
    BigDecimal sumTotalByStatus(@Param("status") CommandeStatus status);

    @Query("SELECT COALESCE(SUM(c.montantPaye), 0) FROM Commande c WHERE c.status = :status")
    BigDecimal sumPaidByStatus(@Param("status") CommandeStatus status);

    boolean existsByClientId(Long clientId);

    Optional<Commande> findByNumeroCommande(String numeroCommande);

    Optional<Commande> findByCreationIdempotencyKey(String creationIdempotencyKey);

    boolean existsByNumeroCommande(String numeroCommande);

    // ── Pickup driver queries (pickup_driver_id / "livreur" field) ────────────
    // Use these when you need orders by the driver who COLLECTS from the client.
    List<Commande> findByLivreurId(Long livreurId);

    List<Commande> findByLivreurIdAndStatus(Long livreurId, CommandeStatus status);

    List<Commande> findByLivreurIdAndStatusIn(Long livreurId, List<CommandeStatus> statuses);

    long countByLivreurIdAndStatus(Long livreurId, CommandeStatus status);

    // ── Delivery driver queries (delivery_driver_id) ──────────────────────────
    // Use these when you need orders by the driver who DELIVERS back to the client.
    List<Commande> findByDeliveryDriverIdAndStatus(Long deliveryDriverId, CommandeStatus status);

    long countByDeliveryDriverIdAndStatus(Long deliveryDriverId, CommandeStatus status);

    /**
     * Finds orders in a given status assigned to a specific delivery driver.
     * Previously, a method named findReadyForDeliveryByLivreur incorrectly used
     * c.livreur.id (pickup driver) AND a string literal for status — both were wrong.
     * This replaces it with a correctly parameterised JPQL query on the delivery driver.
     */
    @Query("SELECT c FROM Commande c WHERE c.status = :status AND c.deliveryDriver.id = :driverId")
    List<Commande> findByDeliveryDriverAndStatus(
            @Param("driverId") Long driverId,
            @Param("status") CommandeStatus status
    );

    @Query("SELECT c FROM Commande c WHERE c.status = 'READY_FOR_DELIVERY' AND c.deliveryDriver.id = :driverId")
    List<Commande> findReadyForDeliveryDueForDriver(@Param("driverId") Long driverId);

    // ── Client queries ────────────────────────────────────────────────────────
    List<Commande> findByClientId(Long clientId);

    /** Batch stats — avoids N+1 when building the client list in AdminService. */
    @Query("SELECT c.client.id, COUNT(c), MAX(c.dateCreation) FROM Commande c WHERE c.client.id IN :clientIds GROUP BY c.client.id")
    List<Object[]> findOrderStatsByClientIds(@Param("clientIds") List<Long> clientIds);

    // ── Status queries ────────────────────────────────────────────────────────
    List<Commande> findByStatus(CommandeStatus status);

    List<Commande> findByStatusIn(List<CommandeStatus> statuses);

    // ── Date-range queries ────────────────────────────────────────────────────
    List<Commande> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);
    List<Commande> findByDateCreationBetween(LocalDateTime start, LocalDateTime end);

    // ── Statistics queries ────────────────────────────────────────────────────
    @Query("SELECT COUNT(c) FROM Commande c WHERE DATE(c.dateCreation) = CURRENT_DATE")
    long countTodayCommandes();

    @Query("SELECT COALESCE(SUM(c.montantPaye), 0) FROM Commande c WHERE c.status = 'DELIVERED' AND DATE(c.dateCreation) = CURRENT_DATE")
    BigDecimal getTodayRevenue();

    @Query("SELECT COUNT(c) FROM Commande c WHERE c.status = :status AND DATE(c.dateCreation) = CURRENT_DATE")
    long countTodayCommandesByStatus(@Param("status") CommandeStatus status);

    @Query("SELECT COUNT(c) FROM Commande c WHERE DATE(c.dateCreation) = :date")
    long countCommandesByDate(@Param("date") LocalDate date);

    @Query("SELECT COALESCE(SUM(c.montantPaye), 0) FROM Commande c WHERE c.status = 'DELIVERED' AND DATE(c.dateCreation) = :date")
    BigDecimal getRevenueByDate(@Param("date") LocalDate date);

    @Query("SELECT COUNT(t) FROM Commande c JOIN c.commandeTapis t WHERE DATE(c.dateCreation) = :date")
    long countItemsByDate(@Param("date") LocalDate date);

    List<Commande> findByLivreurIdAndDateCreationBetween(Long livreurId, LocalDateTime start, LocalDateTime end);

    // ── Paginated filtered query ───────────────────────────────────────────────
    // LEFT JOIN on livreur and deliveryDriver so that rows with NULL pickup_driver_id
    // or NULL delivery_driver_id are never excluded by implicit inner-join semantics.
    @Query(value = "SELECT c FROM Commande c LEFT JOIN c.livreur ld LEFT JOIN c.deliveryDriver dd WHERE " +
            "(:status IS NULL OR c.status = :status) AND " +
            "(:mode IS NULL OR c.mode = :mode) AND " +
            "(:activeOnly IS NULL OR :activeOnly = false OR c.status NOT IN ('DELIVERED', 'CANCELLED')) AND " +
            "(:paidDebts IS NULL OR :paidDebts = false OR (c.debtSettledAt IS NOT NULL AND c.montantTotal > 0 AND c.montantPaye >= c.montantTotal)) AND " +
            "(:selfSubmitted IS NULL OR c.selfSubmitted = :selfSubmitted) AND " +
            "(:dateDebut IS NULL OR (:paidDebts = true AND c.debtSettledAt >= :dateDebut) OR (:paidDebts IS NULL OR :paidDebts = false) AND c.dateCreation >= :dateDebut) AND " +
            "(:dateFin IS NULL OR (:paidDebts = true AND c.debtSettledAt <= :dateFin) OR (:paidDebts IS NULL OR :paidDebts = false) AND c.dateCreation <= :dateFin) AND " +
            "(:livreurId IS NULL OR ld.id = :livreurId OR dd.id = :livreurId) AND " +
            "(:search IS NULL OR LOWER(c.numeroCommande) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(c.client.name) LIKE LOWER(CONCAT('%', :search, '%')))",
           countQuery = "SELECT COUNT(c) FROM Commande c LEFT JOIN c.livreur ld LEFT JOIN c.deliveryDriver dd WHERE " +
            "(:status IS NULL OR c.status = :status) AND " +
            "(:mode IS NULL OR c.mode = :mode) AND " +
            "(:activeOnly IS NULL OR :activeOnly = false OR c.status NOT IN ('DELIVERED', 'CANCELLED')) AND " +
            "(:paidDebts IS NULL OR :paidDebts = false OR (c.debtSettledAt IS NOT NULL AND c.montantTotal > 0 AND c.montantPaye >= c.montantTotal)) AND " +
            "(:selfSubmitted IS NULL OR c.selfSubmitted = :selfSubmitted) AND " +
            "(:dateDebut IS NULL OR (:paidDebts = true AND c.debtSettledAt >= :dateDebut) OR (:paidDebts IS NULL OR :paidDebts = false) AND c.dateCreation >= :dateDebut) AND " +
            "(:dateFin IS NULL OR (:paidDebts = true AND c.debtSettledAt <= :dateFin) OR (:paidDebts IS NULL OR :paidDebts = false) AND c.dateCreation <= :dateFin) AND " +
            "(:livreurId IS NULL OR ld.id = :livreurId OR dd.id = :livreurId) AND " +
            "(:search IS NULL OR LOWER(c.numeroCommande) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(c.client.name) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Commande> findFiltered(
            @Param("status") CommandeStatus status,
            @Param("mode") ModeCommande mode,
            @Param("activeOnly") Boolean activeOnly,
            @Param("paidDebts") Boolean paidDebts,
            @Param("selfSubmitted") Boolean selfSubmitted,
            @Param("dateDebut") LocalDateTime dateDebut,
            @Param("dateFin") LocalDateTime dateFin,
            @Param("search") String search,
            @Param("livreurId") Long livreurId,
            Pageable pageable
    );

    @Query("SELECT COALESCE(SUM(c.montantPaye), 0) FROM Commande c LEFT JOIN c.livreur ld LEFT JOIN c.deliveryDriver dd WHERE " +
            "(:status IS NULL OR c.status = :status) AND " +
            "(:mode IS NULL OR c.mode = :mode) AND " +
            "(:activeOnly IS NULL OR :activeOnly = false OR c.status NOT IN ('DELIVERED', 'CANCELLED')) AND " +
            "(:paidDebts IS NULL OR :paidDebts = false OR (c.debtSettledAt IS NOT NULL AND c.montantTotal > 0 AND c.montantPaye >= c.montantTotal)) AND " +
            "(:selfSubmitted IS NULL OR c.selfSubmitted = :selfSubmitted) AND " +
            "(:dateDebut IS NULL OR (:paidDebts = true AND c.debtSettledAt >= :dateDebut) OR (:paidDebts IS NULL OR :paidDebts = false) AND c.dateCreation >= :dateDebut) AND " +
            "(:dateFin IS NULL OR (:paidDebts = true AND c.debtSettledAt <= :dateFin) OR (:paidDebts IS NULL OR :paidDebts = false) AND c.dateCreation <= :dateFin) AND " +
            "(:livreurId IS NULL OR ld.id = :livreurId OR dd.id = :livreurId) AND " +
            "(:search IS NULL OR LOWER(c.numeroCommande) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(c.client.name) LIKE LOWER(CONCAT('%', :search, '%')))")
    BigDecimal findFilteredTotalValue(
            @Param("status") CommandeStatus status,
            @Param("mode") ModeCommande mode,
            @Param("activeOnly") Boolean activeOnly,
            @Param("paidDebts") Boolean paidDebts,
            @Param("selfSubmitted") Boolean selfSubmitted,
            @Param("dateDebut") LocalDateTime dateDebut,
            @Param("dateFin") LocalDateTime dateFin,
            @Param("search") String search,
            @Param("livreurId") Long livreurId
    );

    @Query("SELECT COALESCE(SUM(c.montantTotal - COALESCE(c.montantPaye, 0)), 0) FROM Commande c LEFT JOIN c.livreur ld LEFT JOIN c.deliveryDriver dd WHERE " +
            "(:status IS NULL OR c.status = :status) AND " +
            "(:mode IS NULL OR c.mode = :mode) AND " +
            "(:activeOnly IS NULL OR :activeOnly = false OR c.status NOT IN ('DELIVERED', 'CANCELLED')) AND " +
            "(:paidDebts IS NULL OR :paidDebts = false OR (c.debtSettledAt IS NOT NULL AND c.montantTotal > 0 AND c.montantPaye >= c.montantTotal)) AND " +
            "(:selfSubmitted IS NULL OR c.selfSubmitted = :selfSubmitted) AND " +
            "(:dateDebut IS NULL OR (:paidDebts = true AND c.debtSettledAt >= :dateDebut) OR (:paidDebts IS NULL OR :paidDebts = false) AND c.dateCreation >= :dateDebut) AND " +
            "(:dateFin IS NULL OR (:paidDebts = true AND c.debtSettledAt <= :dateFin) OR (:paidDebts IS NULL OR :paidDebts = false) AND c.dateCreation <= :dateFin) AND " +
            "(:livreurId IS NULL OR ld.id = :livreurId OR dd.id = :livreurId) AND " +
            "(:search IS NULL OR LOWER(c.numeroCommande) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(c.client.name) LIKE LOWER(CONCAT('%', :search, '%')))")
    BigDecimal findFilteredTotalUnpaid(
            @Param("status") CommandeStatus status,
            @Param("mode") ModeCommande mode,
            @Param("activeOnly") Boolean activeOnly,
            @Param("paidDebts") Boolean paidDebts,
            @Param("selfSubmitted") Boolean selfSubmitted,
            @Param("dateDebut") LocalDateTime dateDebut,
            @Param("dateFin") LocalDateTime dateFin,
            @Param("search") String search,
            @Param("livreurId") Long livreurId
    );

    @Query("SELECT COUNT(t) FROM Commande c JOIN c.commandeTapis t LEFT JOIN c.livreur ld LEFT JOIN c.deliveryDriver dd WHERE " +
            "(:status IS NULL OR c.status = :status) AND " +
            "(:mode IS NULL OR c.mode = :mode) AND " +
            "(:activeOnly IS NULL OR :activeOnly = false OR c.status NOT IN ('DELIVERED', 'CANCELLED')) AND " +
            "(:paidDebts IS NULL OR :paidDebts = false OR (c.debtSettledAt IS NOT NULL AND c.montantTotal > 0 AND c.montantPaye >= c.montantTotal)) AND " +
            "(:selfSubmitted IS NULL OR c.selfSubmitted = :selfSubmitted) AND " +
            "(:dateDebut IS NULL OR (:paidDebts = true AND c.debtSettledAt >= :dateDebut) OR (:paidDebts IS NULL OR :paidDebts = false) AND c.dateCreation >= :dateDebut) AND " +
            "(:dateFin IS NULL OR (:paidDebts = true AND c.debtSettledAt <= :dateFin) OR (:paidDebts IS NULL OR :paidDebts = false) AND c.dateCreation <= :dateFin) AND " +
            "(:livreurId IS NULL OR ld.id = :livreurId OR dd.id = :livreurId) AND " +
            "(:search IS NULL OR LOWER(c.numeroCommande) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(c.client.name) LIKE LOWER(CONCAT('%', :search, '%')))")
    Long findFilteredTotalVolume(
            @Param("status") CommandeStatus status,
            @Param("mode") ModeCommande mode,
            @Param("activeOnly") Boolean activeOnly,
            @Param("paidDebts") Boolean paidDebts,
            @Param("selfSubmitted") Boolean selfSubmitted,
            @Param("dateDebut") LocalDateTime dateDebut,
            @Param("dateFin") LocalDateTime dateFin,
            @Param("search") String search,
            @Param("livreurId") Long livreurId
    );

    // ── Dashboard specific metric queries ─────────────────────────────────────
    @Query("SELECT COUNT(c) FROM Commande c WHERE c.mode = 'IMMEDIATE' AND c.status NOT IN ('DELIVERED', 'CANCELLED')")
    long countActiveImmediateOrders();

    @Query("SELECT COALESCE(SUM(c.montantTotal), 0) FROM Commande c WHERE c.mode = 'IMMEDIATE' AND c.status NOT IN ('DELIVERED', 'CANCELLED')")
    BigDecimal sumActiveImmediateOrders();

    /** @deprecated use countRecentlyFullyPaidDelivered instead */
    @Deprecated
    @Query("SELECT COUNT(c) FROM Commande c WHERE c.status = 'DELIVERED' AND c.montantPaye >= c.montantTotal AND c.montantTotal > 0 AND c.datePaiement >= :thirtyDaysAgo")
    long countRecentlyPaidDebts(@Param("thirtyDaysAgo") LocalDateTime thirtyDaysAgo);

    /** @deprecated use sumRecentlyFullyPaidDelivered instead */
    @Deprecated
    @Query("SELECT COALESCE(SUM(c.montantTotal), 0) FROM Commande c WHERE c.status = 'DELIVERED' AND c.montantPaye >= c.montantTotal AND c.montantTotal > 0 AND c.datePaiement >= :thirtyDaysAgo")
    BigDecimal sumRecentlyPaidDebts(@Param("thirtyDaysAgo") LocalDateTime thirtyDaysAgo);

    // Correct versions: use dateCreation (always set) instead of datePaiement (often null)
    @Query("SELECT COUNT(c) FROM Commande c WHERE c.status = 'DELIVERED' AND c.montantTotal > 0 AND c.montantPaye >= c.montantTotal AND c.dateCreation >= :since")
    long countRecentlyFullyPaidDelivered(@Param("since") LocalDateTime since);

    @Query("SELECT COALESCE(SUM(c.montantPaye), 0) FROM Commande c WHERE c.status = 'DELIVERED' AND c.montantTotal > 0 AND c.montantPaye >= c.montantTotal AND c.dateCreation >= :since")
    BigDecimal sumRecentlyFullyPaidDelivered(@Param("since") LocalDateTime since);

    // ── Real paid-debt queries anchored on debtSettledAt ─────────────────────
    @Query("SELECT COUNT(c) FROM Commande c WHERE c.debtSettledAt IS NOT NULL AND c.debtSettledAt >= :since")
    long countSettledDebts(@Param("since") LocalDateTime since);

    @Query("SELECT COALESCE(SUM(c.montantPaye), 0) FROM Commande c WHERE c.debtSettledAt IS NOT NULL AND c.debtSettledAt >= :since")
    BigDecimal sumSettledDebts(@Param("since") LocalDateTime since);

    // ── Unpaid / debt queries ─────────────────────────────────────────────────
    @Query("SELECT c FROM Commande c " +
            "JOIN FETCH c.client cl " +
            "WHERE c.montantTotal > COALESCE(c.montantPaye, 0) " +
            "AND c.status = 'DELIVERED' " +
            "ORDER BY (c.montantTotal - COALESCE(c.montantPaye, 0)) DESC")
    List<Commande> findAllWithUnpaidBalance();

    @Query("SELECT cl.id, cl.name, " +
            "COUNT(c.id) as orderCount, " +
            "SUM(c.montantTotal) as totalAmount, " +
            "SUM(COALESCE(c.montantPaye, 0)) as totalPaid, " +
            "SUM(c.montantTotal - COALESCE(c.montantPaye, 0)) as totalRemaining " +
            "FROM Commande c " +
            "JOIN c.client cl " +
            "WHERE c.montantTotal > COALESCE(c.montantPaye, 0) " +
            "AND c.status = 'DELIVERED' " +
            "GROUP BY cl.id, cl.name " +
            "ORDER BY SUM(c.montantTotal - COALESCE(c.montantPaye, 0)) DESC")
    List<Object[]> findClientDebtSummary();

    @Query("SELECT c FROM Commande c " +
            "WHERE c.client.id = :clientId " +
            "AND c.montantTotal > COALESCE(c.montantPaye, 0) " +
            "AND c.status = 'DELIVERED' " +
            "ORDER BY c.dateCreation DESC")
    List<Commande> findUnpaidByClient(@Param("clientId") Long clientId);

    @Query("SELECT COUNT(c), " +
            "SUM(c.montantTotal - COALESCE(c.montantPaye, 0)) " +
            "FROM Commande c " +
            "WHERE c.montantTotal > COALESCE(c.montantPaye, 0) " +
            "AND c.status = 'DELIVERED'")
    Object[] getUnpaidOverview();

    @Query("SELECT COUNT(DISTINCT c.client.id) " +
            "FROM Commande c " +
            "WHERE c.montantTotal > COALESCE(c.montantPaye, 0) " +
            "AND c.status = 'DELIVERED'")
    long countClientsWithDebt();

    // ── Statistics aggregation queries ────────────────────────────────────────
    /** Used by getClientStatistics() — avoids loading all orders in memory. */
    @Query("SELECT COUNT(c) FROM Commande c " +
           "WHERE c.dateCreation >= :start AND c.dateCreation < :end")
    long countCommandesInPeriod(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    // ── Map view queries ──────────────────────────────────────────────────────
    @Query("SELECT DISTINCT c FROM Commande c " +
            "JOIN c.client cl " +
            "JOIN cl.addresses a " +
            "WHERE a.latitude IS NOT NULL " +
            "AND a.longitude IS NOT NULL " +
            "AND c.status != 'CANCELLED' " +
            "ORDER BY c.dateCreation DESC")
    List<Commande> findAllWithGpsCoordinates();

    // ── Delivered orders scoped by date_livraison ─────────────────────────────
    @Query("SELECT c FROM Commande c WHERE c.status = 'DELIVERED' " +
           "AND c.dateLivraison >= :start AND c.dateLivraison <= :end")
    List<Commande> findDeliveredByDateLivraisonBetween(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end);

    // ── Period-scoped aggregates on a provided list of commande IDs ───────────
    // Used by StatisticsService to compute totals for orders that passed through
    // a given status within a date window (event-based, not current-status-based).

    // ── Operational alert queries ─────────────────────────────────────────────

    /** Orders stuck in PENDING_PICKUP beyond a threshold (overdue pickup). */
    @Query("SELECT c FROM Commande c WHERE c.status = 'PENDING_PICKUP' AND c.dateCreation <= :cutoff")
    List<Commande> findOverduePickups(@Param("cutoff") LocalDateTime cutoff);

    /** Orders stuck in READY_FOR_DELIVERY beyond a threshold (delayed delivery). */
    @Query("SELECT c FROM Commande c WHERE c.status = 'READY_FOR_DELIVERY' AND c.dateCreation <= :cutoff")
    List<Commande> findDelayedDeliveries(@Param("cutoff") LocalDateTime cutoff);

    /** Delivered orders with outstanding balance (unpaid debt). */
    @Query("SELECT c FROM Commande c WHERE c.status = 'DELIVERED' " +
           "AND c.montantTotal > COALESCE(c.montantPaye, 0) AND c.dateLivraison <= :cutoff")
    List<Commande> findDeliveredWithUnpaidBalance(@Param("cutoff") LocalDateTime cutoff);

    @Query("SELECT COALESCE(SUM(ct.quantite), 0) FROM CommandeTapis ct " +
           "WHERE ct.commande.id IN :ids")
    long sumItemsByCommandeIds(@Param("ids") List<Long> ids);

    // m² = largeur * hauteur * quantite for dimension-priced items only
    @Query("SELECT COALESCE(SUM(ct.largeur * ct.hauteur * ct.quantite), 0) FROM CommandeTapis ct " +
           "WHERE ct.commande.id IN :ids " +
           "AND ct.largeur IS NOT NULL AND ct.hauteur IS NOT NULL")
    java.math.BigDecimal sumM2ByCommandeIds(@Param("ids") List<Long> ids);

    @Query("SELECT COALESCE(SUM(c.montantTotal), 0) FROM Commande c " +
           "WHERE c.id IN :ids")
    java.math.BigDecimal sumMontantTotalByIds(@Param("ids") List<Long> ids);

    @Query("SELECT COALESCE(SUM(c.montantPaye), 0) FROM Commande c " +
           "WHERE c.id IN :ids")
    java.math.BigDecimal sumMontantPayeByIds(@Param("ids") List<Long> ids);

    @Query("SELECT MIN(c.dateCreation) FROM Commande c")
    Optional<LocalDateTime> findEarliestCreationDate();
}
