package com.wash.laundry_app.statistiques.analytics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RevenueAnalyticsDTO {
    private BigDecimal totalRevenue;
    private BigDecimal todayRevenue;
    private BigDecimal averageOrderValue;
    private List<DailyRevenue> dailyBreakdown;
    private Map<String, BigDecimal> revenueByPaymentMode;

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class DailyRevenue {
        private LocalDate date;
        private BigDecimal amount;
        private Long orderCount;
    }
}
