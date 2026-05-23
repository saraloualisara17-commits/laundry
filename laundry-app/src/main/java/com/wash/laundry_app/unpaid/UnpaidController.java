package com.wash.laundry_app.unpaid;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/unpaid")
@RequiredArgsConstructor
public class UnpaidController {

    private final UnpaidService unpaidService;

    @GetMapping("/overview")
    public ResponseEntity<UnpaidOverviewDto> getOverview() {
        return ResponseEntity.ok(unpaidService.getOverview());
    }

    @GetMapping("/clients")
    public ResponseEntity<List<ClientDebtDto>> getClients() {
        return ResponseEntity.ok(unpaidService.getClientDebtList());
    }

    @GetMapping("/clients/{clientId}")
    public ResponseEntity<ClientDebtDto> getClientDetail(@PathVariable Long clientId) {
        ClientDebtDto detail = unpaidService.getClientDebtDetail(clientId);
        if (detail == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(detail);
    }

    @GetMapping("/orders")
    public ResponseEntity<List<UnpaidOrderDto>> getOrders(
            @RequestParam(required = false) Long clientId) {
        return ResponseEntity.ok(unpaidService.getAllUnpaidOrders(clientId));
    }
}
