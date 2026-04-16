package com.wash.laundry_app.command;


import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface HistoriqueStatutRepository extends JpaRepository<HistoriqueStatut, Long> {

    List<HistoriqueStatut> findByCommandeIdOrderByCreatedAtDesc(Long commandeId);

    List<HistoriqueStatut> findByUserIdOrderByCreatedAtDesc(Long userId);

    // Batch query: fetches the "prete" status history for a list of commande IDs in one query.
    // JOIN FETCH h.user eagerly loads the user so no secondary query is needed for getName().
    @org.springframework.data.jpa.repository.Query(
        "SELECT h FROM HistoriqueStatut h JOIN FETCH h.user WHERE h.commande.id IN :commandeIds AND LOWER(h.nouveauStatut) = 'prete' ORDER BY h.createdAt DESC"
    )
    List<HistoriqueStatut> findPreteHistoryForCommandes(@Param("commandeIds") List<Long> commandeIds);
}
