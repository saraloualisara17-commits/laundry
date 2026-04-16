package com.wash.laundry_app.users.lvreur;

import com.wash.laundry_app.auth.AuthService;
import com.wash.laundry_app.clients.ClientDto;
import com.wash.laundry_app.clients.ClientRegisterRequest;
import com.wash.laundry_app.clients.ClientSearchResponse;
import com.wash.laundry_app.command.*;
import com.wash.laundry_app.tapis.FileStorageService;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping({"/livreur", "/api/livreur"})
@AllArgsConstructor
public class LivreurController {

    private final CommandeService commandeService;
    private final LivreurService livreurService;
    private final AuthService authService;
    private final FileStorageService fileStorageService;

    // ========== CLIENT MANAGEMENT ==========

    //  Get my pending client
    @GetMapping("/my-client/pending")
    public ResponseEntity<ClientDto> getMyPendingClient() {
        Optional<ClientDto> client = livreurService.getMyPendingClient();
        return client
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    //  Search client by phone
    @GetMapping("/clients/search")
    public ResponseEntity<ClientSearchResponse> searchByPhone(@RequestParam String phone) {
        Optional<ClientDto> client = livreurService.findByPhone(phone);
        return client
                .map(clientDto -> ResponseEntity.ok(new ClientSearchResponse(true, clientDto)))
                .orElseGet(() -> ResponseEntity.ok(new ClientSearchResponse(false, null)));
    }

    // Create new client
    @PostMapping("/clients")
    public ResponseEntity<ClientDto> createClient(@Valid @RequestBody ClientRegisterRequest request) {
        ClientDto client = livreurService.createClient(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(client);
    }

    //  Delete pending client (optional - you decide if livreur can delete)
    @DeleteMapping("/clients/{id}")
    public ResponseEntity<Map<String, String>> deletePendingClient(@PathVariable Long id) {
        livreurService.deletePendingClient(id);
        return ResponseEntity.ok(Map.of("message", "Client supprimé avec succès"));
    }

    // ========== ORDER MANAGEMENT ==========

    //  Create order
    @PostMapping("/commandes")
    public ResponseEntity<CommandeDTO> createCommande(@Valid @RequestBody CreateCommandeRequest request) {
        CommandeDTO commande = commandeService.createCommande(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(commande);
    }

    // Get orders ready for delivery (status = LIVREE / Sorti)
    @GetMapping("/commandes/ready-for-delivery")
    public ResponseEntity<List<CommandeDTO>> getReadyForDelivery() {
        List<CommandeDTO> commandes = commandeService.getReadyForDeliveryByLivreur();
        return ResponseEntity.ok(commandes);
    }

    // Record payment (change LIVREE -> PAYEE)
    @PostMapping("/commandes/{id}/payment")
    public ResponseEntity<CommandeDTO> recordPayment(
            @PathVariable Long id,
            @Valid @RequestBody RecordPaymentRequest request) {
        CommandeDTO commande = commandeService.recordPayment(id, request);
        return ResponseEntity.ok(commande);
    }

    // Cancel delivery (change LIVREE -> ANNULEE)

    @PutMapping("/commandes/{id}/annuler")
    public ResponseEntity<CommandeDTO> annulerCommande(@PathVariable Long id) {
        return ResponseEntity.ok(commandeService.annulerCommande(id));
    }

    // Get count of prete orders (notification badge)
    @GetMapping("/commandes/prete-count")
    public ResponseEntity<Map<String, Long>> getPreteCount() {
        long count = commandeService.getPreteCountForLivreur();
        return ResponseEntity.ok(Map.of("readyOrdersCount", count));
    }

    // Get list of prete orders (detailed notifications)
    @GetMapping("/commandes/prete")
    public ResponseEntity<List<CommandeDTO>> getReadyOrders() {
        List<CommandeDTO> commandes = commandeService.getReadyOrdersForLivreur();
        return ResponseEntity.ok(commandes);
    }

    // Get canceled deliveries for the livreur (status = ANNULEE)
    @GetMapping("/commandes/canceled-deliveries")
    public ResponseEntity<List<CommandeDTO>> getCanceledDeliveries() {
        List<CommandeDTO> commandes = commandeService.getCanceledDeliveriesByLivreur();
        return ResponseEntity.ok(commandes);
    }

    // Return to workplace (change ANNULEE -> EN_ATTENTE)
    @PatchMapping("/commandes/{id}/return")
    public ResponseEntity<CommandeDTO> returnToWorkplace(@PathVariable Long id) {
        CommandeDTO commande = commandeService.returnToWorkplace(id);
        return ResponseEntity.ok(commande);
    }

    // ========== NEW/ALIASED ENDPOINTS FROM REDESIGN REQUEST ==========

    // GET /api/livreur/dashboard/stats
    @GetMapping("/dashboard/stats")
    public ResponseEntity<LivreurDashboardStatsDTO> getDashboardStats() {
        return ResponseEntity.ok(commandeService.getLivreurDashboardStats());
    }


    // GET /api/payment-types (Note: mapped under /api/livreur here for simplicity, but we can use absolute path)
    @GetMapping("/payment-types")
    public ResponseEntity<List<PaymentTypeDTO>> getPaymentTypes() {
        return ResponseEntity.ok(commandeService.getPaymentTypes());
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