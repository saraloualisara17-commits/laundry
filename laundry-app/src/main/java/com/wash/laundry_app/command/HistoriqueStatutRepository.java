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
}
