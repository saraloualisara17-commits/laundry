package com.wash.laundry_app.users.lvreur;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class LivreurDashboardStatsDTO {
    private long readyOrdersCount;      // status: DELIVERED (ready for delivery)
    private long pendingPickupCount;    // status: PENDING_PICKUP
    private long cancelledCount;        // status: CANCELLED
    private long missionsCount;         // total missions for today
}
