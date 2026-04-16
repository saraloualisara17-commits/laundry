package com.wash.laundry_app.command;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface CommandeRepository extends JpaRepository<Commande, Long> {

    boolean existsByClientId(Long clientId);


    // Find by numero_commande
    Optional<Commande> findByNumeroCommande(String numeroCommande);

    boolean existsByNumeroCommande(String numeroCommande);

    // Find by livreur
    List<Commande> findByLivreurId(Long livreurId);

    List<Commande> findByLivreurIdAndStatus(Long livreurId, CommandeStatus status);

    List<Commande> findByLivreurIdAndStatusIn(Long livreurId, List<CommandeStatus> statuses);

    long countByLivreurIdAndStatus(Long livreurId, CommandeStatus status);

    // Find by client
    List<Commande> findByClientId(Long clientId);

    // Batch aggregation: returns [clientId, orderCount, maxDateCreation] for a list of client IDs
    // Used to avoid N+1 queries when building the client list with stats in AdminService
    @Query("SELECT c.client.id, COUNT(c), MAX(c.dateCreation) FROM Commande c WHERE c.client.id IN :clientIds GROUP BY c.client.id")
    List<Object[]> findOrderStatsByClientIds(@Param("clientIds") List<Long> clientIds);


    // Find by status
    List<Commande> findByStatus(CommandeStatus status);

    List<Commande> findByStatusIn(List<CommandeStatus> statuses);

    // Find commandes ready for delivery (status = PRETE)
    @Query("SELECT c FROM Commande c WHERE c.status = 'PRETE' AND c.livreur.id = :livreurId")
    List<Commande> findReadyForDeliveryByLivreur(@Param("livreurId") Long livreurId);


    // Find commandes by date range
    List<Commande> findByDateCreationBetween(LocalDateTime start, LocalDateTime end);

    // Count commandes by status
    long countByStatus(CommandeStatus status);

    // Statistics queries
    @Query("SELECT COUNT(c) FROM Commande c WHERE DATE(c.dateCreation) = CURRENT_DATE")
    long countTodayCommandes();

    @Query("SELECT SUM(c.montantTotal) FROM Commande c WHERE c.status = 'PAYEE' AND DATE(c.datePaiement) = CURRENT_DATE")
    Double getTodayRevenue();

    // Additional useful statistics
    @Query("SELECT COUNT(c) FROM Commande c WHERE c.status = :status AND DATE(c.dateCreation) = CURRENT_DATE")
    long countTodayCommandesByStatus(@Param("status") CommandeStatus status);

    @Query("SELECT COUNT(c) FROM Commande c WHERE DATE(c.dateCreation) = :date")
    long countCommandesByDate(@Param("date") LocalDate date);

    @Query("SELECT SUM(c.montantTotal) FROM Commande c WHERE c.status = 'PAYEE' AND DATE(c.datePaiement) = :date")
    Double getRevenueByDate(@Param("date") LocalDate date);

    // Find commandes by livreur and date range
    List<Commande> findByLivreurIdAndDateCreationBetween(Long livreurId, LocalDateTime start, LocalDateTime end);

    // Paginated filtered query with explicit countQuery to avoid Spring JPA derivation failures
    // on complex OR/join WHERE clauses.
    @Query(value = "SELECT c FROM Commande c WHERE " +
            "(:status IS NULL OR c.status = :status) AND " +
            "(:dateDebut IS NULL OR c.dateCreation >= :dateDebut) AND " +
            "(:dateFin IS NULL OR c.dateCreation <= :dateFin) AND " +
            "(:search IS NULL OR LOWER(c.numeroCommande) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(c.client.name) LIKE LOWER(CONCAT('%', :search, '%')))",
           countQuery = "SELECT COUNT(c) FROM Commande c WHERE " +
            "(:status IS NULL OR c.status = :status) AND " +
            "(:dateDebut IS NULL OR c.dateCreation >= :dateDebut) AND " +
            "(:dateFin IS NULL OR c.dateCreation <= :dateFin) AND " +
            "(:search IS NULL OR LOWER(c.numeroCommande) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(c.client.name) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Commande> findFiltered(
            @Param("status") CommandeStatus status,
            @Param("dateDebut") LocalDateTime dateDebut,
            @Param("dateFin") LocalDateTime dateFin,
            @Param("search") String search,
            Pageable pageable
    );

    // Total Value: Sum of montantTotal for all matching orders (no joins to avoid price duplication)
    @Query("SELECT COALESCE(SUM(c.montantTotal), 0) FROM Commande c WHERE " +
            "(:status IS NULL OR c.status = :status) AND " +
            "(:dateDebut IS NULL OR c.dateCreation >= :dateDebut) AND " +
            "(:dateFin IS NULL OR c.dateCreation <= :dateFin) AND " +
            "(:search IS NULL OR LOWER(c.numeroCommande) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(c.client.name) LIKE LOWER(CONCAT('%', :search, '%')))")
    Double findFilteredTotalValue(
            @Param("status") CommandeStatus status,
            @Param("dateDebut") LocalDateTime dateDebut,
            @Param("dateFin") LocalDateTime dateFin,
            @Param("search") String search
    );

    // Total Volume: Count of all carpet items across matching orders
    @Query("SELECT COUNT(t) FROM Commande c JOIN c.commandeTapis t WHERE " +
            "(:status IS NULL OR c.status = :status) AND " +
            "(:dateDebut IS NULL OR c.dateCreation >= :dateDebut) AND " +
            "(:dateFin IS NULL OR c.dateCreation <= :dateFin) AND " +
            "(:search IS NULL OR LOWER(c.numeroCommande) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(c.client.name) LIKE LOWER(CONCAT('%', :search, '%')))")
    Long findFilteredTotalVolume(
            @Param("status") CommandeStatus status,
            @Param("dateDebut") LocalDateTime dateDebut,
            @Param("dateFin") LocalDateTime dateFin,
            @Param("search") String search
    );
}
