package com.wash.laundry_app.command;


import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface HistoriqueStatutRepository extends JpaRepository<HistoriqueStatut, Long> {

    List<HistoriqueStatut> findByCommandeIdOrderByCreatedAtDesc(Long commandeId);

    List<HistoriqueStatut> findByUserIdOrderByCreatedAtDesc(Long userId);

    // Batch query: fetches the "prete" status history for a list of commande IDs in one query.
    // JOIN FETCH h.user eagerly loads the user so no secondary query is needed for getName().
    @Query(
        "SELECT h FROM HistoriqueStatut h JOIN FETCH h.user WHERE h.commande.id IN :commandeIds AND LOWER(h.nouveauStatut) = 'prete' ORDER BY h.createdAt DESC"
    )
    List<HistoriqueStatut> findPreteHistoryForCommandes(@Param("commandeIds") List<Long> commandeIds);

    // Returns distinct commande IDs that transitioned to a given status within the time window.
    // Using DISTINCT commande.id ensures each order is counted once even if it was picked up
    // multiple times (e.g. cancelled then re-collected).
    @Query("SELECT DISTINCT h.commande.id FROM HistoriqueStatut h " +
           "WHERE h.nouveauStatut = :status " +
           "AND h.createdAt >= :start AND h.createdAt <= :end")
    List<Long> findDistinctCommandeIdsByStatusBetween(
            @Param("status") String status,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end);

    @Query("SELECT COUNT(DISTINCT h.commande.id) FROM HistoriqueStatut h " +
           "WHERE h.nouveauStatut = :status " +
           "AND h.createdAt >= :start AND h.createdAt <= :end")
    long countDistinctCommandesByStatusBetween(
            @Param("status") String status,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end);

    /**
     * Returns pairs of (fromEntry.createdAt, toEntry.createdAt) for orders
     * that passed through both statuses within the given window.
     * Used to compute average processing/delivery time in AnalyticsService.
     */
    @Query("SELECT h1.createdAt, h2.createdAt " +
           "FROM HistoriqueStatut h1 JOIN HistoriqueStatut h2 " +
           "ON h1.commande.id = h2.commande.id " +
           "WHERE h1.nouveauStatut = :fromStatus AND h2.nouveauStatut = :toStatus " +
           "AND h1.createdAt < h2.createdAt " +
           "AND h1.createdAt >= :since")
    List<Object[]> findStatusTransitionTimes(
            @Param("fromStatus") String fromStatus,
            @Param("toStatus") String toStatus,
            @Param("since") LocalDateTime since);
}
