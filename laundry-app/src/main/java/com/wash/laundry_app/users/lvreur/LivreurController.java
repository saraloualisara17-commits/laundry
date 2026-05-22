package com.wash.laundry_app.users.lvreur;

import com.wash.laundry_app.auth.AuthService;
import com.wash.laundry_app.clients.ClientDto;
import com.wash.laundry_app.clients.ClientSearchResponse;
import com.wash.laundry_app.command.*;
import com.wash.laundry_app.config.FileStorageService;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Deprecated
@RestController
@RequestMapping({"/livreur", "/api/livreur"})
@AllArgsConstructor
public class LivreurController {

    private final CommandeService commandeService;
    private final AuthService authService;
    private final FileStorageService fileStorageService;

    // ========== ORDER MANAGEMENT ==========

    // Get orders ready for delivery (status = LIVREE / Sorti)
    @GetMapping("/commandes/ready-for-delivery")
    public ResponseEntity<List<CommandeDTO>> getReadyForDelivery() {
        List<CommandeDTO> commandes = commandeService.getReadyForDeliveryByDeliveryDriver();
        return ResponseEntity.ok(commandes);
    }

    // Record payment
    @PostMapping("/commandes/{id}/payment")
    public ResponseEntity<CommandeDTO> recordPayment(
            @PathVariable Long id,
            @Valid @RequestBody RecordPaymentRequest request) {
        CommandeDTO commande = commandeService.recordPayment(id, request);
        return ResponseEntity.ok(commande);
    }

    // Cancel delivery
    @PutMapping("/commandes/{id}/cancel")
    public ResponseEntity<CommandeDTO> annulerCommande(@PathVariable Long id) {
        return ResponseEntity.ok(commandeService.annulerCommande(id));
    }

    // Get count of ready orders
    @GetMapping("/commandes/ready-count")
    public ResponseEntity<Map<String, Long>> getPreteCount() {
        long count = commandeService.getReadyForDeliveryCountForDeliveryDriver();
        return ResponseEntity.ok(Map.of("readyOrdersCount", count));
    }

    // Get list of ready orders
    @GetMapping("/commandes/ready")
    public ResponseEntity<List<CommandeDTO>> getReadyOrders() {
        List<CommandeDTO> commandes = commandeService.getReadyForDeliveryByDeliveryDriver();
        return ResponseEntity.ok(commandes);
    }

    // Get canceled deliveries
    @GetMapping("/commandes/canceled-deliveries")
    public ResponseEntity<List<CommandeDTO>> getCanceledDeliveries() {
        List<CommandeDTO> commandes = commandeService.getCancelledOrdersForPickupDriver();
        return ResponseEntity.ok(commandes);
    }

    // Get orders pending pickup (status = PENDING_PICKUP, waiting at client's home)
    @GetMapping("/commandes/pending-pickup")
    public ResponseEntity<List<CommandeDTO>> getPendingPickup() {
        List<CommandeDTO> commandes = commandeService.getPendingPickupOrdersForPickupDriver();
        return ResponseEntity.ok(commandes);
    }

    // Past deliveries (DELIVERED orders where current user is the delivery driver)
    @GetMapping("/commandes/past-deliveries")
    public ResponseEntity<List<CommandeDTO>> getPastDeliveries() {
        return ResponseEntity.ok(commandeService.getPastDeliveriesForDriver());
    }

    // Return to workplace
    @PatchMapping("/commandes/{id}/return")
    public ResponseEntity<CommandeDTO> returnToWorkplace(@PathVariable Long id) {
        CommandeDTO commande = commandeService.returnToWorkplace(id);
        return ResponseEntity.ok(commande);
    }

    // ========== DASHBOARD & STATS ==========

    @GetMapping("/dashboard/stats")
    public ResponseEntity<LivreurDashboardStatsDTO> getDashboardStats() {
        return ResponseEntity.ok(commandeService.getLivreurDashboardStats());
    }

    @GetMapping("/payment-types")
    public ResponseEntity<List<PaymentTypeDTO>> getPaymentTypes() {
        return ResponseEntity.ok(commandeService.getPaymentTypes());
    }

    // Update order items (pickup driver only, PENDING_PICKUP status only)
    @PatchMapping("/commandes/{id}/items")
    public ResponseEntity<CommandeDTO> updateOrderItems(
            @PathVariable Long id,
            @RequestBody java.util.List<CreateCommandeRequest.TapisItem> items) {
        return ResponseEntity.ok(commandeService.updateItemsByPickupDriver(id, items));
    }

    @PostMapping("/tapis/upload")
    public ResponseEntity<List<Map<String, String>>> uploadTapisImages(@RequestParam("files") MultipartFile[] files) {
        List<Map<String, String>> result = java.util.Arrays.stream(files).map(file -> {
            String fileName = fileStorageService.storeFile(file);
            String fileDownloadUri = "/uploads/" + fileName;
            return Map.of("imageUrl", fileDownloadUri);
        }).toList();
        return ResponseEntity.ok(result);
    }
}
