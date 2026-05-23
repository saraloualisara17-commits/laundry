package com.wash.laundry_app.statistiques.analytics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OperationalKPIDTO {
    private Double averageProcessingTimeHours;
    private Double averageDeliveryTimeHours;
    private Map<String, Long> volumeByProductCategory;
    private Long activeClients;
    private Long newClientsLast30Days;
    private Double unpaidRatio; // totalUnpaid / totalRevenue
}
