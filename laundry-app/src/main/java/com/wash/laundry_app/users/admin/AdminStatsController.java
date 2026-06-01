package com.wash.laundry_app.users.admin;

import com.wash.laundry_app.command.CommandeDTO;
import com.wash.laundry_app.command.services.CommandeQueryService;
import com.wash.laundry_app.statistiques.StatisticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/stats")
@RequiredArgsConstructor
public class AdminStatsController {

    private final StatisticsService statisticsService;
    private final CommandeQueryService commandeQueryService;

    /**
     * GET /api/admin/stats/status-overview
     * Returns order count and total amount per status for the dashboard overview cards.
     */
    @GetMapping("/status-overview")
    public ResponseEntity<Map<String, Object>> getStatusOverview() {
        return ResponseEntity.ok(Map.of("success", true, "data", statisticsService.getStatusOverview()));
    }

    /**
     * GET /api/admin/stats/overdue
     * Returns the count of overdue pickups and overdue deliveries.
     * An order is overdue when its scheduledPickupDate / scheduledDeliveryDate
     * is in the past and the order has not yet been acted on.
     */
    @GetMapping("/overdue")
    public ResponseEntity<Map<String, Long>> getOverdueStats() {
        return ResponseEntity.ok(commandeQueryService.getOverdueStats());
    }

    /**
     * GET /api/admin/stats/overdue-orders?type=pickup|delivery
     * Returns the full list of overdue orders for the given type.
     */
    @GetMapping("/overdue-orders")
    public ResponseEntity<List<CommandeDTO>> getOverdueOrders(
            @RequestParam(defaultValue = "pickup") String type) {
        return ResponseEntity.ok(commandeQueryService.getOverdueOrders(type));
    }
}
