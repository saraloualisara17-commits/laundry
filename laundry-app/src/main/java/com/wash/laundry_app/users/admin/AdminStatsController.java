package com.wash.laundry_app.users.admin;

import com.wash.laundry_app.statistiques.StatisticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/stats")
@RequiredArgsConstructor
public class AdminStatsController {

    private final StatisticsService statisticsService;

    /**
     * GET /api/admin/stats/status-overview
     * Returns order count and total amount per status for the dashboard overview cards.
     */
    @GetMapping("/status-overview")
    public ResponseEntity<Map<String, Object>> getStatusOverview() {
        return ResponseEntity.ok(Map.of("success", true, "data", statisticsService.getStatusOverview()));
    }
}
