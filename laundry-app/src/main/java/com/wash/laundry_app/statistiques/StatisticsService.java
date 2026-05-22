package com.wash.laundry_app.statistiques;

import com.wash.laundry_app.command.Commande;
import com.wash.laundry_app.command.CommandeRepository;
import com.wash.laundry_app.command.CommandeStatus;
import com.wash.laundry_app.command.PaiementRepository;
import com.wash.laundry_app.clients.ClientRepository;
import com.wash.laundry_app.unpaid.UnpaidService;
import com.wash.laundry_app.unpaid.UnpaidOverviewDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StatisticsService {

    private final CommandeRepository commandeRepository;
    private final PaiementRepository paiementRepository;
    private final ClientRepository clientRepository;
    private final UnpaidService unpaidService;

    // ─────────────────────────────────────────────────────────────────────────
    // HELPER — order-creation-date-based breakdown for a date window
    //
    // We anchor on commande.date_creation (not historique_statuts.created_at)
    // so that manually editing date_creation in the DB is immediately reflected.
    //
    // "Reçues"  = orders created in the window whose current or past status
    //             ever reached PICKED_UP (i.e. not PENDING_PICKUP / CANCELLED only).
    //             Since PICKED_UP is always set before any later status, we simply
    //             check that the order is NOT stuck at PENDING_PICKUP or CANCELLED.
    //
    // "Livrées" = orders created in the window that are currently DELIVERED.
    // ─────────────────────────────────────────────────────────────────────────

    private StatisticsDTO.StatisticsDTOBuilder applyEventBreakdown(
            StatisticsDTO.StatisticsDTOBuilder builder,
            List<Commande> period,
            LocalDateTime start, LocalDateTime end) {

        // ── Reçues: anchored on date_creation (already filtered by caller) ──────
        // An order is "received" once it moves past PENDING_PICKUP.
        List<Long> recuesIds = period.stream()
                .filter(c -> c.getStatus() != CommandeStatus.PENDING_PICKUP
                          && c.getStatus() != CommandeStatus.CANCELLED)
                .map(Commande::getId)
                .toList();

        long recuesCount       = recuesIds.size();
        long recuesItems       = recuesIds.isEmpty() ? 0 : commandeRepository.sumItemsByCommandeIds(recuesIds);
        BigDecimal recuesM2    = recuesIds.isEmpty() ? BigDecimal.ZERO : commandeRepository.sumM2ByCommandeIds(recuesIds);
        BigDecimal recuesTotal = recuesIds.isEmpty() ? BigDecimal.ZERO : commandeRepository.sumMontantTotalByIds(recuesIds);

        // ── Livrées: anchored on date_livraison ───────────────────────────────
        List<Commande> livreesOrders = commandeRepository.findDeliveredByDateLivraisonBetween(start, end);
        List<Long> livreesIds = livreesOrders.stream().map(Commande::getId).toList();

        long livreesCount        = livreesIds.size();
        long livreesItems        = livreesIds.isEmpty() ? 0 : commandeRepository.sumItemsByCommandeIds(livreesIds);
        BigDecimal livreesM2     = livreesIds.isEmpty() ? BigDecimal.ZERO : commandeRepository.sumM2ByCommandeIds(livreesIds);
        BigDecimal livreesTotal  = livreesIds.isEmpty() ? BigDecimal.ZERO : commandeRepository.sumMontantTotalByIds(livreesIds);
        BigDecimal livreesPaid   = livreesIds.isEmpty() ? BigDecimal.ZERO : commandeRepository.sumMontantPayeByIds(livreesIds);
        BigDecimal livreesUnpaid = livreesTotal.subtract(livreesPaid).max(BigDecimal.ZERO);

        // ── Revenue: sum of montant_paye on orders delivered in the period ────
        // This is the cash actually collected for work completed in the window,
        // regardless of when the original payment was recorded.
        BigDecimal revenue = livreesOrders.stream()
                .map(c -> c.getMontantPaye() != null ? c.getMontantPaye() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return builder
                .totalRevenue(revenue)
                .totalRevenues(revenue)
                .revenuesToday(revenue)
                .recuesCount(recuesCount)
                .recuesItems(recuesItems)
                .recuesM2(recuesM2)
                .recuesTotal(recuesTotal)
                .livreesCount(livreesCount)
                .livreesItems(livreesItems)
                .livreesM2(livreesM2)
                .livreesTotal(livreesTotal)
                .livreesPaid(livreesPaid)
                .livreesUnpaid(livreesUnpaid);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TODAY
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Today's snapshot.
     *
     * Order counts  → orders whose dateCreation is today.
     * Revenue       → payments whose datePaiement is today (regardless of when
     *                 the order was created). This correctly captures payments
     *                 collected today on orders created on previous days.
     */
    @Transactional(readOnly = true)
    public StatisticsDTO getTodayStatistics() {
        LocalDateTime start = LocalDate.now().atStartOfDay();
        LocalDateTime end   = LocalDate.now().atTime(LocalTime.MAX);

        List<Commande> todayCommandes = commandeRepository.findByDateCreationBetween(start, end);

        long enAttente    = todayCommandes.stream().filter(c -> c.getStatus() == CommandeStatus.PENDING_PICKUP).count();
        long validees     = todayCommandes.stream().filter(c -> c.getStatus() == CommandeStatus.PICKED_UP).count();
        long enTraitement = todayCommandes.stream().filter(c -> c.getStatus() == CommandeStatus.IN_PROCESS).count();
        long pretes       = todayCommandes.stream().filter(c -> c.getStatus() == CommandeStatus.READY_FOR_DELIVERY).count();
        long livrees      = todayCommandes.stream().filter(c -> c.getStatus() == CommandeStatus.DELIVERED).count();
        long payees       = todayCommandes.stream()
                .filter(c -> c.getStatus() == CommandeStatus.DELIVERED
                          && c.getMontantTotal() != null
                          && c.getMontantTotal().compareTo(BigDecimal.ZERO) > 0
                          && c.getMontantPaye() != null
                          && c.getMontantPaye().compareTo(c.getMontantTotal()) >= 0)
                .count();

        UnpaidOverviewDto unpaid = unpaidService.getOverview();
        Map<String, Object> unpaidData = new HashMap<>();
        unpaidData.put("count",        unpaid.getTotalOrders());
        unpaidData.put("clientsCount", unpaid.getClientsWithDebt());
        unpaidData.put("amount",       unpaid.getTotalRemaining() != null ? unpaid.getTotalRemaining() : BigDecimal.ZERO);

        StatisticsDTO.StatisticsDTOBuilder builder = StatisticsDTO.builder()
                .totalCommandesToday((long) todayCommandes.size())
                .totalCommandes(commandeRepository.count())
                .totalClients(clientRepository.count())
                .commandesEnAttente(enAttente)
                .commandesValidees(validees)
                .commandesEnTraitement(enTraitement)
                .commandesPretes(pretes)
                .commandesLivrees(livrees)
                .commandesPayees(payees)
                .unpaid(unpaidData);

        return applyEventBreakdown(builder, todayCommandes, start, end).build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DATE RANGE
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Statistics for an arbitrary date range.
     *
     * Order counts / Reçues  → orders whose dateCreation falls in [dateDebut, dateFin].
     * Livrées / Revenue      → orders whose dateLivraison falls in [dateDebut, dateFin].
     */
    @Transactional(readOnly = true)
    public StatisticsDTO getStatisticsByDateRange(LocalDate dateDebut, LocalDate dateFin) {
        LocalDateTime start = dateDebut.atStartOfDay();
        LocalDateTime end   = dateFin.atTime(LocalTime.MAX);

        // ── Order volume counts (scoped by creation date) ─────────────────────
        List<Commande> period = commandeRepository.findByDateCreationBetween(start, end);

        long totalCommandes = period.size();
        long enAttente      = period.stream().filter(c -> c.getStatus() == CommandeStatus.PENDING_PICKUP).count();
        long validees       = period.stream().filter(c -> c.getStatus() == CommandeStatus.PICKED_UP).count();
        long enTraitement   = period.stream().filter(c -> c.getStatus() == CommandeStatus.IN_PROCESS).count();
        long pretes         = period.stream().filter(c -> c.getStatus() == CommandeStatus.READY_FOR_DELIVERY).count();
        long livrees        = period.stream().filter(c -> c.getStatus() == CommandeStatus.DELIVERED).count();

        // Fully-paid delivered orders created in this period
        long paidOrders = period.stream()
                .filter(c -> c.getStatus() == CommandeStatus.DELIVERED
                          && c.getMontantTotal() != null
                          && c.getMontantTotal().compareTo(BigDecimal.ZERO) > 0
                          && c.getMontantPaye()  != null
                          && c.getMontantPaye().compareTo(c.getMontantTotal()) >= 0)
                .count();

        // Remaining unpaid balance on delivered orders created in this period
        BigDecimal unpaidAmount = period.stream()
                .filter(c -> c.getStatus() == CommandeStatus.DELIVERED)
                .map(c -> {
                    BigDecimal total     = c.getMontantTotal() != null ? c.getMontantTotal() : BigDecimal.ZERO;
                    BigDecimal paid      = c.getMontantPaye()  != null ? c.getMontantPaye()  : BigDecimal.ZERO;
                    BigDecimal remaining = total.subtract(paid);
                    return remaining.compareTo(BigDecimal.ZERO) > 0 ? remaining : BigDecimal.ZERO;
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, Object> unpaidData = new HashMap<>();
        unpaidData.put("amount", unpaidAmount);
        unpaidData.put("count",  livrees - paidOrders);

        StatisticsDTO.StatisticsDTOBuilder builder = StatisticsDTO.builder()
                .totalCommandes(totalCommandes)
                .commandesEnAttente(enAttente)
                .commandesValidees(validees)
                .commandesEnTraitement(enTraitement)
                .commandesPretes(pretes)
                .commandesLivrees(livrees)
                .commandesPayees(paidOrders)
                .dateDebut(dateDebut)
                .dateFin(dateFin)
                .unpaid(unpaidData);

        return applyEventBreakdown(builder, period, start, end).build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // OVERALL (ALL-TIME)
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public StatisticsDTO getOverallStatistics() {
        List<Commande> all = commandeRepository.findAll();

        // All-time revenue = sum of all payments ever recorded
        BigDecimal revenue = all.stream()
                .map(c -> c.getMontantPaye() != null ? c.getMontantPaye() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, Long> byStatus = all.stream()
                .collect(Collectors.groupingBy(c -> c.getStatus().name(), Collectors.counting()));

        return StatisticsDTO.builder()
                .totalCommandes((long) all.size())
                .totalRevenue(revenue)
                .totalRevenues(revenue)
                .commandesByStatus(byStatus)
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DAILY
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public DailyStatisticsDTO getDailyStatistics(LocalDate date) {
        LocalDateTime start = date.atStartOfDay();
        LocalDateTime end   = date.atTime(LocalTime.MAX);

        List<Commande> day = commandeRepository.findByDateCreationBetween(start, end);

        // Revenue = payments collected on this specific day
        BigDecimal revenue = paiementRepository.sumCollectedBetween(start, end);

        return DailyStatisticsDTO.builder()
                .date(date)
                .nombreCommandes((long) day.size())
                .revenusTotal(revenue)
                .build();
    }

    @Transactional(readOnly = true)
    public List<DailyStatisticsDTO> getLastNDaysStatistics(int days) {
        List<DailyStatisticsDTO> stats = new ArrayList<>();
        for (int i = 0; i < days; i++) {
            stats.add(getDailyStatistics(LocalDate.now().minusDays(i)));
        }
        return stats;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PER DRIVER
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public StatisticsDTO getStatisticsByLivreur(Long livreurId, LocalDate dateDebut, LocalDate dateFin) {
        LocalDateTime start = dateDebut.atStartOfDay();
        LocalDateTime end   = dateFin.atTime(LocalTime.MAX);

        List<Commande> period = commandeRepository.findByLivreurIdAndDateCreationBetween(livreurId, start, end);

        BigDecimal revenue = period.stream()
                .filter(c -> c.getStatus() == CommandeStatus.DELIVERED)
                .map(c -> c.getMontantPaye() != null ? c.getMontantPaye() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return StatisticsDTO.builder()
                .totalCommandes((long) period.size())
                .totalRevenue(revenue)
                .totalRevenues(revenue)
                .commandesLivrees(period.stream().filter(c -> c.getStatus() == CommandeStatus.DELIVERED).count())
                .dateDebut(dateDebut)
                .dateFin(dateFin)
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STATUS OVERVIEW (dashboard cards — intentionally ALL-TIME workload)
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Map<String, Object> getStatusOverview() {
        List<CommandeStatus> statuses = List.of(
            CommandeStatus.PENDING_PICKUP,
            CommandeStatus.PICKED_UP,
            CommandeStatus.IN_PROCESS,
            CommandeStatus.READY_FOR_DELIVERY,
            CommandeStatus.DELIVERED,
            CommandeStatus.PICKUP_FAILED,
            CommandeStatus.DELIVERY_FAILED,
            CommandeStatus.CANCELLED
        );

        Map<String, Object> data = new HashMap<>();
        for (CommandeStatus status : statuses) {
            long count       = commandeRepository.countByStatus(status);
            BigDecimal total = commandeRepository.sumTotalByStatus(status);
            BigDecimal paid  = commandeRepository.sumPaidByStatus(status);
            data.put(status.name(), Map.of(
                "count", count,
                "total", total != null ? total : BigDecimal.ZERO,
                "paid",  paid  != null ? paid  : BigDecimal.ZERO
            ));
        }

        data.put("AU_LOCAL", Map.of(
            "count", commandeRepository.countActiveImmediateOrders(),
            "total", commandeRepository.sumActiveImmediateOrders()
        ));

        // PAID_DEBTS: fully-paid delivered orders created in last 30 days
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
        data.put("PAID_DEBTS", Map.of(
            "count", commandeRepository.countRecentlyFullyPaidDelivered(thirtyDaysAgo),
            "total", commandeRepository.sumRecentlyFullyPaidDelivered(thirtyDaysAgo)
        ));

        return data;
    }
}
