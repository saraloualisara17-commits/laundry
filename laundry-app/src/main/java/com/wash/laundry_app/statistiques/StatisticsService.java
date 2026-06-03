package com.wash.laundry_app.statistiques;

import com.wash.laundry_app.command.Commande;
import com.wash.laundry_app.command.CommandeRepository;
import com.wash.laundry_app.command.CommandeStatus;
import com.wash.laundry_app.command.HistoriqueStatutRepository;
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
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class StatisticsService {

    private final CommandeRepository commandeRepository;
    private final PaiementRepository paiementRepository;
    private final ClientRepository clientRepository;
    private final UnpaidService unpaidService;
    private final HistoriqueStatutRepository historiqueStatutRepository;

    // ─────────────────────────────────────────────────────────────────────────
    // HELPER — single GROUP BY query → EnumMap of status → count
    // Replaces 7 separate in-memory stream filters per statistics request.
    // ─────────────────────────────────────────────────────────────────────────

    private Map<CommandeStatus, Long> statusCountsForPeriod(LocalDateTime start, LocalDateTime end) {
        Map<CommandeStatus, Long> counts = new EnumMap<>(CommandeStatus.class);
        for (CommandeStatus s : CommandeStatus.values()) counts.put(s, 0L);
        for (Object[] row : commandeRepository.countByStatusBetween(start, end)) {
            counts.put((CommandeStatus) row[0], (Long) row[1]);
        }
        return counts;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HELPER — event-based breakdown anchored on when the status transition
    // actually occurred (historique_statuts.created_at), not order creation date.
    //
    // "Reçues"  = orders whose PICKED_UP transition happened within [start, end].
    //             Using the status history ensures we count when the driver
    //             physically collected the items, not when the order was placed.
    //
    // "Livrées" = orders whose DELIVERED transition happened within [start, end].
    //             Same anchor — when the driver physically delivered the items.
    //
    // "Revenue" = payments recorded in the paiements table within [start, end].
    //             This captures all cash collected in the period regardless of
    //             which order it belongs to or when that order was created.
    // ─────────────────────────────────────────────────────────────────────────

    private StatisticsDTO.StatisticsDTOBuilder applyEventBreakdown(
            StatisticsDTO.StatisticsDTOBuilder builder,
            List<Commande> ignored,
            LocalDateTime start, LocalDateTime end) {

        // ── Reçues: orders that transitioned to PICKED_UP in the window ─────────
        List<Long> recuesIds = historiqueStatutRepository
                .findDistinctCommandeIdsByStatusBetween("PICKED_UP", start, end);

        long recuesCount       = recuesIds.size();
        long recuesItems       = recuesIds.isEmpty() ? 0 : commandeRepository.sumItemsByCommandeIds(recuesIds);
        BigDecimal recuesM2    = recuesIds.isEmpty() ? BigDecimal.ZERO : commandeRepository.sumM2ByCommandeIds(recuesIds);
        BigDecimal recuesTotal = recuesIds.isEmpty() ? BigDecimal.ZERO : commandeRepository.sumMontantTotalByIds(recuesIds);

        // ── Livrées: orders that transitioned to DELIVERED in the window ─────────
        List<Long> livreesIds = historiqueStatutRepository
                .findDistinctCommandeIdsByStatusBetween("DELIVERED", start, end);

        long livreesCount        = livreesIds.size();
        long livreesItems        = livreesIds.isEmpty() ? 0 : commandeRepository.sumItemsByCommandeIds(livreesIds);
        BigDecimal livreesM2     = livreesIds.isEmpty() ? BigDecimal.ZERO : commandeRepository.sumM2ByCommandeIds(livreesIds);
        BigDecimal livreesTotal  = livreesIds.isEmpty() ? BigDecimal.ZERO : commandeRepository.sumMontantTotalByIds(livreesIds);
        BigDecimal livreesPaid   = livreesIds.isEmpty() ? BigDecimal.ZERO : commandeRepository.sumMontantPayeByIds(livreesIds);
        BigDecimal livreesUnpaid = livreesTotal.subtract(livreesPaid).max(BigDecimal.ZERO);

        // ── Revenue: payments actually collected in the window ────────────────────
        BigDecimal revenue = paiementRepository.sumCollectedBetween(start, end);

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

        Map<CommandeStatus, Long> counts = statusCountsForPeriod(start, end);
        long totalToday = counts.values().stream().mapToLong(Long::longValue).sum();

        long payees = commandeRepository.countFullyPaidDeliveredBetween(start, end);

        UnpaidOverviewDto unpaid = unpaidService.getOverview();
        Map<String, Object> unpaidData = new HashMap<>();
        unpaidData.put("count",        unpaid.getTotalOrders());
        unpaidData.put("clientsCount", unpaid.getClientsWithDebt());
        unpaidData.put("amount",       unpaid.getTotalRemaining() != null ? unpaid.getTotalRemaining() : BigDecimal.ZERO);

        long todayClients = commandeRepository.countDistinctClientsBetween(start, end);

        StatisticsDTO.StatisticsDTOBuilder builder = StatisticsDTO.builder()
                .totalCommandesToday(totalToday)
                .totalCommandes(commandeRepository.count())
                .totalClients(todayClients)
                .commandesEnAttente(counts.get(CommandeStatus.PENDING_PICKUP))
                .commandesValidees(counts.get(CommandeStatus.PICKED_UP))
                .commandesEnTraitement(counts.get(CommandeStatus.IN_PROCESS))
                .commandesPretes(counts.get(CommandeStatus.READY_FOR_DELIVERY))
                .commandesLivrees(counts.get(CommandeStatus.DELIVERED))
                .commandesPayees(payees)
                .unpaid(unpaidData);

        return applyEventBreakdown(builder, List.of(), start, end).build();
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

        Map<CommandeStatus, Long> counts = statusCountsForPeriod(start, end);
        long totalCommandes = counts.values().stream().mapToLong(Long::longValue).sum();
        long paidOrders     = commandeRepository.countFullyPaidDeliveredBetween(start, end);
        long periodClients  = commandeRepository.countDistinctClientsBetween(start, end);

        UnpaidOverviewDto unpaid = unpaidService.getOverview();
        Map<String, Object> unpaidData = new HashMap<>();
        unpaidData.put("count",        unpaid.getTotalOrders());
        unpaidData.put("clientsCount", unpaid.getClientsWithDebt());
        unpaidData.put("amount",       unpaid.getTotalRemaining() != null ? unpaid.getTotalRemaining() : BigDecimal.ZERO);

        StatisticsDTO.StatisticsDTOBuilder builder = StatisticsDTO.builder()
                .totalCommandes(totalCommandes)
                .totalClients(periodClients)
                .commandesEnAttente(counts.get(CommandeStatus.PENDING_PICKUP))
                .commandesValidees(counts.get(CommandeStatus.PICKED_UP))
                .commandesEnTraitement(counts.get(CommandeStatus.IN_PROCESS))
                .commandesPretes(counts.get(CommandeStatus.READY_FOR_DELIVERY))
                .commandesLivrees(counts.get(CommandeStatus.DELIVERED))
                .commandesPayees(paidOrders)
                .dateDebut(dateDebut)
                .dateFin(dateFin)
                .unpaid(unpaidData);

        return applyEventBreakdown(builder, List.of(), start, end).build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // OVERALL (ALL-TIME) — delegates to date-range for consistent breakdown
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public StatisticsDTO getOverallStatistics() {
        LocalDate earliest = commandeRepository.findEarliestCreationDate()
                .map(LocalDateTime::toLocalDate)
                .orElse(LocalDate.of(2020, 1, 1));
        return getStatisticsByDateRange(earliest, LocalDate.now());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DAILY
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public DailyStatisticsDTO getDailyStatistics(LocalDate date) {
        LocalDateTime start = date.atStartOfDay();
        LocalDateTime end   = date.atTime(LocalTime.MAX);

        long orderCount = commandeRepository.countCommandesByDate(date);
        BigDecimal revenue = paiementRepository.sumCollectedBetween(start, end);

        return DailyStatisticsDTO.builder()
                .date(date)
                .nombreCommandes(orderCount)
                .revenusTotal(revenue != null ? revenue : BigDecimal.ZERO)
                .build();
    }

    /**
     * BEFORE: N separate calls to getDailyStatistics() — each firing 2 DB queries → 2N total.
     *         For days=30: 60 round-trips.
     * AFTER:  2 GROUP BY queries covering the entire window, then merge in Java.
     *         Total: 2 round-trips regardless of N.
     */
    @Transactional(readOnly = true)
    public List<DailyStatisticsDTO> getLastNDaysStatistics(int days) {
        int clampedDays = Math.min(days, 365);
        LocalDate endDate   = LocalDate.now();
        LocalDate startDate = endDate.minusDays(clampedDays - 1L);
        LocalDateTime windowStart = startDate.atStartOfDay();
        LocalDateTime windowEnd   = endDate.atTime(LocalTime.MAX);

        // Single grouped query for order counts
        Map<LocalDate, Long> orderCounts = new HashMap<>();
        for (Object[] row : commandeRepository.countGroupedByDate(windowStart, windowEnd)) {
            LocalDate d = ((java.sql.Date) row[0]).toLocalDate();
            orderCounts.put(d, ((Number) row[1]).longValue());
        }

        // Single grouped query for revenue
        Map<LocalDate, BigDecimal> revenues = new HashMap<>();
        for (Object[] row : paiementRepository.sumCollectedGroupedByDate(windowStart, windowEnd)) {
            LocalDate d = ((java.sql.Date) row[0]).toLocalDate();
            revenues.put(d, (BigDecimal) row[1]);
        }

        // Build the full ordered list — fill zero for dates with no activity
        List<DailyStatisticsDTO> result = new ArrayList<>(clampedDays);
        for (int i = clampedDays - 1; i >= 0; i--) {
            LocalDate date = endDate.minusDays(i);
            result.add(DailyStatisticsDTO.builder()
                    .date(date)
                    .nombreCommandes(orderCounts.getOrDefault(date, 0L))
                    .revenusTotal(revenues.getOrDefault(date, BigDecimal.ZERO))
                    .build());
        }
        return result;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PER DRIVER
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public StatisticsDTO getStatisticsByLivreur(Long livreurId, LocalDate dateDebut, LocalDate dateFin) {
        LocalDateTime start = dateDebut.atStartOfDay();
        LocalDateTime end   = dateFin.atTime(LocalTime.MAX);

        Object[] row = commandeRepository.aggregateByLivreurAndPeriod(livreurId, start, end);
        long   total     = row[0] != null ? ((Number) row[0]).longValue()        : 0L;
        long   delivered = row[1] != null ? ((Number) row[1]).longValue()        : 0L;
        BigDecimal revenue = row[2] != null ? (BigDecimal) row[2] : BigDecimal.ZERO;

        return StatisticsDTO.builder()
                .totalCommandes(total)
                .totalRevenue(revenue)
                .totalRevenues(revenue)
                .commandesLivrees(delivered)
                .dateDebut(dateDebut)
                .dateFin(dateFin)
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STATUS OVERVIEW (dashboard cards — intentionally ALL-TIME workload)
    //
    // BEFORE: 8 statuses × 3 queries (count + sumTotal + sumPaid) = 24 DB round-trips.
    // AFTER:  1 GROUP BY query returns all status aggregates in one shot.
    //         2 additional queries for AU_LOCAL and PAID_DEBTS remain (unchanged).
    //         Total: 3 queries instead of 24.
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Map<String, Object> getStatusOverview() {
        Map<String, Object> data = new HashMap<>();

        // Single GROUP BY query → all statuses in one round-trip
        for (Object[] row : commandeRepository.aggregateByStatus()) {
            CommandeStatus status = (CommandeStatus) row[0];
            long      count = ((Number) row[1]).longValue();
            BigDecimal total = (BigDecimal) row[2];
            BigDecimal paid  = (BigDecimal) row[3];
            data.put(status.name(), Map.of(
                "count", count,
                "total", total != null ? total : BigDecimal.ZERO,
                "paid",  paid  != null ? paid  : BigDecimal.ZERO
            ));
        }

        // Ensure all statuses appear in the map even if no orders exist for them
        for (CommandeStatus s : CommandeStatus.values()) {
            data.computeIfAbsent(s.name(), k -> Map.of(
                "count", 0L,
                "total", BigDecimal.ZERO,
                "paid",  BigDecimal.ZERO
            ));
        }

        data.put("AU_LOCAL", Map.of(
            "count", commandeRepository.countActiveImmediateOrders(),
            "total", commandeRepository.sumActiveImmediateOrders()
        ));

        // PAID_DEBTS: orders where debt was fully settled in the last 30 days
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
        data.put("PAID_DEBTS", Map.of(
            "count", commandeRepository.countSettledDebts(thirtyDaysAgo),
            "total", commandeRepository.sumSettledDebts(thirtyDaysAgo)
        ));

        return data;
    }
}
