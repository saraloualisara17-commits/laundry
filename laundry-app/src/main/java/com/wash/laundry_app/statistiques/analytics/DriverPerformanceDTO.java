package com.wash.laundry_app.statistiques.analytics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DriverPerformanceDTO {
    private List<DriverStat> drivers;

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class DriverStat {
        private Long driverId;
        private String driverName;
        private Long ordersHandled;
        private Long completedDeliveries;
        private Long pendingMissions;
        private BigDecimal totalRevenueCollected;
        private Double successRate; // completed / handled
    }
}
