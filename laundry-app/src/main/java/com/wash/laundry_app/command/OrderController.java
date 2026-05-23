package com.wash.laundry_app.command;

import com.wash.laundry_app.users.employe.CommandDetails;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
@AllArgsConstructor
public class OrderController {

    private final CommandeService commandeService;

    @PostMapping
    public ResponseEntity<CommandeDTO> createCommande(@Valid @RequestBody CreateCommandeRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(commandeService.createCommande(request));
    }

    @GetMapping
    public ResponseEntity<List<CommandeDTO>> getCommandes(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String driverId) {
        // Simplified mapping. If driverId=me, filter for current livreur.
        // For Phase 3, we just delegate to CommandeService based on logic.
        if ("me".equals(driverId)) {
            if ("PENDING_PICKUP".equals(status)) {
                return ResponseEntity.ok(commandeService.getPendingPickupOrdersForPickupDriver());
            } else if ("READY_FOR_DELIVERY".equals(status)) {
                return ResponseEntity.ok(commandeService.getReadyForDeliveryByDeliveryDriver());
            }
        }
        if (status != null) {
            return ResponseEntity.ok(commandeService.getCommandesByStatus(CommandeStatus.valueOf(status.toUpperCase())));
        }
        return ResponseEntity.ok(commandeService.getAllCommandes());
    }

    @GetMapping("/{id}")
    public ResponseEntity<CommandDetails> getCommande(@PathVariable Long id) {
        return ResponseEntity.ok(commandeService.getCommandeById(id));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<CommandeDTO> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateCommandeStatusRequest request) {
        return ResponseEntity.ok(commandeService.updateStatus(id, request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CommandeDTO> updateCommande(
            @PathVariable Long id,
            @Valid @RequestBody UpdateCommandeRequest request) {
        return ResponseEntity.ok(commandeService.updateCommande(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCommande(@PathVariable Long id) {
        commandeService.deleteCommande(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/payments")
    public ResponseEntity<CommandeDTO> recordPayment(
            @PathVariable Long id,
            @Valid @RequestBody RecordPaymentRequest request) {
        return ResponseEntity.ok(commandeService.recordPayment(id, request));
    }
}
