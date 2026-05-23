package com.wash.laundry_app.statistiques;

import com.wash.laundry_app.command.services.CommandeQueryService;
import com.wash.laundry_app.users.lvreur.LivreurDashboardStatsDTO;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/statistics")
@AllArgsConstructor
public class StatisticsController {

    private final StatisticsService statisticsService;
    private final CommandeQueryService queryService;

    @GetMapping("/today")
    public ResponseEntity<StatisticsDTO> getTodayStats() {
        return ResponseEntity.ok(statisticsService.getTodayStatistics());
    }

    @GetMapping("/overall")
    public ResponseEntity<StatisticsDTO> getOverallStats() {
        return ResponseEntity.ok(statisticsService.getOverallStatistics());
    }

    @PostMapping("/date-range")
    public ResponseEntity<StatisticsDTO> getStatsByDateRange(@RequestBody Map<String, String> request) {
        LocalDate startDate = LocalDate.parse(request.get("startDate"));
        LocalDate endDate = LocalDate.parse(request.get("endDate"));
        return ResponseEntity.ok(statisticsService.getStatisticsByDateRange(startDate, endDate));
    }

    @GetMapping("/date-range")
    public ResponseEntity<StatisticsDTO> getStatsByDateRangeQuery(
            @RequestParam String startDate,
            @RequestParam String endDate) {
        LocalDate start = LocalDate.parse(startDate);
        LocalDate end = LocalDate.parse(endDate);
        return ResponseEntity.ok(statisticsService.getStatisticsByDateRange(start, end));
    }

    @GetMapping("/daily")
    public ResponseEntity<DailyStatisticsDTO> getDailyStats(@RequestParam String date) {
        LocalDate parsedDate = LocalDate.parse(date);
        return ResponseEntity.ok(statisticsService.getDailyStatistics(parsedDate));
    }

    @GetMapping("/last-days")
    public ResponseEntity<List<DailyStatisticsDTO>> getLastNDaysStats(@RequestParam(defaultValue = "7") int days) {
        return ResponseEntity.ok(statisticsService.getLastNDaysStatistics(days));
    }

    @GetMapping("/livreur/{id}")
    public ResponseEntity<StatisticsDTO> getLivreurStats(
            @PathVariable Long id,
            @RequestParam String startDate,
            @RequestParam String endDate) {
        LocalDate start = LocalDate.parse(startDate);
        LocalDate end = LocalDate.parse(endDate);
        return ResponseEntity.ok(statisticsService.getStatisticsByLivreur(id, start, end));
    }

    @GetMapping("/dashboard")
    public ResponseEntity<LivreurDashboardStatsDTO> getDashboardStats(@RequestParam(required = false) String driverId) {
        if ("me".equals(driverId)) {
            return ResponseEntity.ok(queryService.getLivreurDashboardStats());
        }
        return ResponseEntity.badRequest().build();
    }
}
