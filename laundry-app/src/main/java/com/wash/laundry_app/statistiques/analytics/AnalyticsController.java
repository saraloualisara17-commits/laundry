package com.wash.laundry_app.statistiques.analytics;

import lombok.AllArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/admin/analytics")
@AllArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping("/revenue")
    public ResponseEntity<RevenueAnalyticsDTO> getRevenueAnalytics(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end) {
        return ResponseEntity.ok(analyticsService.getRevenueAnalytics(start, end));
    }

    @GetMapping("/drivers")
    public ResponseEntity<DriverPerformanceDTO> getDriverPerformance() {
        return ResponseEntity.ok(analyticsService.getDriverPerformance());
    }

    @GetMapping("/kpis")
    public ResponseEntity<OperationalKPIDTO> getOperationalKPIs() {
        return ResponseEntity.ok(analyticsService.getOperationalKPIs());
    }
}
