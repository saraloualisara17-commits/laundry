package com.wash.laundry_app.statistiques;

import com.wash.laundry_app.command.CommandeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

@Service
@RequiredArgsConstructor
@Slf4j
public class DailyStatsSchedulerService {

    private final CommandeRepository commandeRepository;
    private final StatistiqueJournaliereRepository statRepository;

    /**
     * Runs at 00:05 every day and writes the previous day's aggregated stats
     * into statistiques_journalieres. Uses upsert logic so re-runs are safe.
     */
    @Scheduled(cron = "0 5 0 * * *")
    @Transactional
    public void computeYesterdayStats() {
        computeStatsForDate(LocalDate.now().minusDays(1));
    }

    @Transactional
    public void computeStatsForDate(LocalDate date) {
        long nombreCommandes = commandeRepository.countCommandesByDate(date);
        BigDecimal revenuesTotalRaw = commandeRepository.getRevenueByDate(date);
        BigDecimal revenusTotal = revenuesTotalRaw != null ? revenuesTotalRaw : null;
        long nombreTapisTraites = commandeRepository.countItemsByDate(date);

        StatistiqueJournaliere stat = statRepository.findByDate(date)
                .orElseGet(() -> {
                    StatistiqueJournaliere s = new StatistiqueJournaliere();
                    s.setDate(date);
                    return s;
                });

        stat.setNombreCommandes((int) nombreCommandes);
        stat.setRevenusTotal(revenusTotal != null ? revenusTotal : BigDecimal.ZERO);
        stat.setNombreTapisTraites((int) nombreTapisTraites);

        statRepository.save(stat);
        log.info("Daily stats saved for {}: orders={}, revenue={}, items={}",
                date, nombreCommandes, revenusTotal, nombreTapisTraites);
    }
}
