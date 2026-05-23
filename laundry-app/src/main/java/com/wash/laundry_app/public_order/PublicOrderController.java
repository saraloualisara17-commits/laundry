package com.wash.laundry_app.public_order;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Public-facing endpoint for order creation from the web form.
 * No authentication required — delegates entirely to PublicOrderService.
 */
@RestController
@RequestMapping("/public/orders")
@RequiredArgsConstructor
public class PublicOrderController {

    private final PublicOrderService publicOrderService;

    @PostMapping
    public ResponseEntity<Map<String, Object>> createPublicOrder(
            @Valid @RequestBody PublicOrderRequest req) {

        String orderNumber = publicOrderService.createPublicOrder(req);

        return ResponseEntity.ok(Map.of(
                "success",     true,
                "orderNumber", orderNumber
        ));
    }
}
