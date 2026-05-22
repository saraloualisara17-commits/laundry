package com.wash.laundry_app.statistiques;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class StatisticsDTO {
    // Today's statistics
    private Long totalCommandesToday;
    private BigDecimal revenuesToday;
    private Long totalClients;
    private Long commandesEnAttente;
    private Long commandesValidees;
    private Long commandesEnTraitement;
    private Long commandesPretes;
    private Long commandesLivrees;
    private Long commandesPayees;

    // Overall statistics
    private Long totalCommandes;
    private BigDecimal totalRevenue;
    private BigDecimal totalRevenues;

    // By status
    private Map<String, Long> commandesByStatus;

    // Date range
    private LocalDate dateDebut;
    private LocalDate dateFin;

    // Unpaid
    private Map<String, Object> unpaid;

    // ── Commandes Reçues breakdown (event-based: orders that passed PICKED_UP) ──
    private Long recuesCount;          // number of distinct orders received
    private Long recuesItems;          // total items across those orders
    private BigDecimal recuesM2;       // total m² (dimension-priced items only)
    private BigDecimal recuesTotal;    // sum of montant_total for those orders

    // ── Commandes Livrées breakdown (event-based: orders that passed DELIVERED) ─
    private Long livreesCount;         // number of distinct orders delivered
    private Long livreesItems;         // total items across those orders
    private BigDecimal livreesM2;      // total m²
    private BigDecimal livreesTotal;   // sum of montant_total
    private BigDecimal livreesPaid;    // sum of montant_paye
    private BigDecimal livreesUnpaid;  // livreesTotal - livreesPaid
}
