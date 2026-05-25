package com.wash.laundry_app.statistiques.analytics;

import com.wash.laundry_app.command.*;
import com.wash.laundry_app.clients.ClientRepository;
import com.wash.laundry_app.users.Role;
import com.wash.laundry_app.users.User;
import com.wash.laundry_app.users.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final CommandeRepository commandeRepository;
    private final ClientRepository clientRepository;
    private final UserRepository userRepository;
    private final PaiementRepository paiementRepository;
    private final HistoriqueStatutRepository historiqueStatutRepository;

    @Transactional(readOnly = true)
    public RevenueAnalyticsDTO getRevenueAnalytics(LocalDate start, LocalDate end) {
        LocalDateTime startDt = start.atStartOfDay();
        LocalDateTime endDt = end.atTime(LocalTime.MAX);

        List<Commande> orders = commandeRepository.findByCreatedAtBetween(startDt, endDt);
        BigDecimal totalRevenue = orders.stream()
                .filter(o -> o.getStatus() == CommandeStatus.DELIVERED)
                .map(o -> o.getMontantTotal() != null ? o.getMontantTotal() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal todayRevenueRaw = commandeRepository.getTodayRevenue();
        BigDecimal todayRevenue = todayRevenueRaw != null ? todayRevenueRaw : BigDecimal.ZERO;

        // Average Order Value
        BigDecimal avgOrderValue = orders.isEmpty() ? BigDecimal.ZERO : 
                totalRevenue.divide(new BigDecimal(orders.size()), 2, RoundingMode.HALF_UP);

        // Daily Breakdown
        Map<LocalDate, List<Commande>> groupedByDate = orders.stream()
                .collect(Collectors.groupingBy(o -> o.getDateCreation().toLocalDate()));

        List<RevenueAnalyticsDTO.DailyRevenue> dailyBreakdown = groupedByDate.entrySet().stream()
                .map(entry -> {
                    BigDecimal dayAmount = entry.getValue().stream()
                            .filter(o -> o.getStatus() == CommandeStatus.DELIVERED)
                            .map(o -> o.getMontantTotal() != null ? o.getMontantTotal() : BigDecimal.ZERO)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    return new RevenueAnalyticsDTO.DailyRevenue(entry.getKey(), dayAmount, (long) entry.getValue().size());
                })
                .sorted(Comparator.comparing(RevenueAnalyticsDTO.DailyRevenue::getDate))
                .collect(Collectors.toList());

        // Revenue by Payment Mode
        Map<String, BigDecimal> byMode = orders.stream()
                .filter(o -> o.getModePaiement() != null)
                .collect(Collectors.groupingBy(
                        o -> o.getModePaiement().name(),
                        Collectors.reducing(BigDecimal.ZERO, 
                                o -> o.getMontantTotal() != null ? o.getMontantTotal() : BigDecimal.ZERO, 
                                BigDecimal::add)
                ));

        return RevenueAnalyticsDTO.builder()
                .totalRevenue(totalRevenue)
                .todayRevenue(todayRevenue)
                .averageOrderValue(avgOrderValue)
                .dailyBreakdown(dailyBreakdown)
                .revenueByPaymentMode(byMode)
                .build();
    }

    @Transactional(readOnly = true)
    public DriverPerformanceDTO getDriverPerformance() {
        List<User> drivers = userRepository.findByRole(Role.LIVREUR);
        
        List<DriverPerformanceDTO.DriverStat> stats = drivers.stream().map(driver -> {
            List<Commande> pickupOrders = commandeRepository.findByLivreurId(driver.getId());
            List<Commande> deliveryOrders = commandeRepository.findByDeliveryDriverIdAndStatus(driver.getId(), CommandeStatus.DELIVERED);
            
            long handled = pickupOrders.size();
            long completed = deliveryOrders.size();
            
            BigDecimal revenue = deliveryOrders.stream()
                    .map(o -> o.getMontantPaye() != null ? o.getMontantPaye() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            double rate = handled == 0 ? 0.0 : (double) completed / handled;

            return new DriverPerformanceDTO.DriverStat(
                    driver.getId(),
                    driver.getName(),
                    handled,
                    completed,
                    (long) (handled - completed), // approximation of pending
                    revenue,
                    rate
            );
        }).collect(Collectors.toList());

        return DriverPerformanceDTO.builder().drivers(stats).build();
    }

    @Transactional(readOnly = true)
    public OperationalKPIDTO getOperationalKPIs() {
        LocalDateTime since = LocalDateTime.now().minusDays(30);

        long activeClients = clientRepository.count();
        long newClients = clientRepository.countCreatedAfter(LocalDateTime.now().minusDays(30));

        // Unpaid ratio over delivered orders (not all orders — captures true debt exposure)
        Object[] unpaidData = commandeRepository.getUnpaidOverview();
        BigDecimal totalUnpaid = unpaidData != null && unpaidData[1] != null
                ? (BigDecimal) unpaidData[1] : BigDecimal.ZERO;
        BigDecimal totalRevenue = commandeRepository.sumTotalByStatus(CommandeStatus.DELIVERED);
        double unpaidRatio = totalRevenue != null && totalRevenue.compareTo(BigDecimal.ZERO) > 0
                ? totalUnpaid.divide(totalRevenue, 4, RoundingMode.HALF_UP).doubleValue()
                : 0.0;

        // Average processing time: PICKED_UP → IN_PROCESS (last 30 days)
        double avgProcessingHours = computeAvgHours("PICKED_UP", "IN_PROCESS", since);

        // Average delivery time: READY_FOR_DELIVERY → DELIVERED (last 30 days)
        double avgDeliveryHours = computeAvgHours("READY_FOR_DELIVERY", "DELIVERED", since);

        return OperationalKPIDTO.builder()
                .activeClients(activeClients)
                .newClientsLast30Days(newClients)
                .unpaidRatio(unpaidRatio)
                .averageProcessingTimeHours(avgProcessingHours)
                .averageDeliveryTimeHours(avgDeliveryHours)
                .build();
    }

    private double computeAvgHours(String fromStatus, String toStatus, LocalDateTime since) {
        List<Object[]> transitions = historiqueStatutRepository
                .findStatusTransitionTimes(fromStatus, toStatus, since);
        if (transitions.isEmpty()) return 0.0;
        double totalHours = transitions.stream()
                .mapToDouble(row -> {
                    LocalDateTime t1 = (LocalDateTime) row[0];
                    LocalDateTime t2 = (LocalDateTime) row[1];
                    return ChronoUnit.MINUTES.between(t1, t2) / 60.0;
                })
                .filter(h -> h >= 0)
                .sum();
        return Math.round((totalHours / transitions.size()) * 10.0) / 10.0;
    }
}
