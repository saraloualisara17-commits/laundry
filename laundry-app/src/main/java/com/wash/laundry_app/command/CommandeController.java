package com.wash.laundry_app.command;

import com.wash.laundry_app.auth.AuthService;
import com.wash.laundry_app.command.attempts.CancelOrderRequest;
import com.wash.laundry_app.command.attempts.OrderAttemptDto;
import com.wash.laundry_app.command.attempts.OrderAttemptRequest;
import com.wash.laundry_app.users.employe.CommandDetails;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/commandes")
@AllArgsConstructor
public class CommandeController {

    private final CommandeService commandeService;

    @GetMapping("/{id}")
    public ResponseEntity<CommandDetails> getCommande(@PathVariable Long id) {
        return ResponseEntity.ok(commandeService.getCommandeById(id));
    }

    // DELETE is intentionally NOT exposed here — only available via /api/admin/commandes/{id}
    // which is restricted to ADMIN in SecurityConfig.

    @PutMapping("/{id}/cancel")
    public ResponseEntity<CommandeDTO> cancelCommande(@PathVariable Long id) {
        return ResponseEntity.ok(commandeService.annulerCommande(id));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<CommandeDTO> updateStatus(@PathVariable Long id,
            @RequestBody UpdateCommandeStatusRequest request) {
        return ResponseEntity.ok(commandeService.updateStatus(id, request));
    }

    /**
     * Add a supplementary payment.
     * Body: { "amount": 150.00, "note": "Acompte", "modePaiement": "CASH" }
     */
    @PostMapping("/{id}/payments")
    public ResponseEntity<PaiementDTO> addPayment(@PathVariable Long id,
            @RequestBody RecordPaymentRequest request) {
        return ResponseEntity.ok(commandeService.addPayment(id, request.getMontant(), request.getNote(), request.getModePaiement()));
    }

    @GetMapping("/{id}/payments")
    public ResponseEntity<List<PaiementDTO>> getPayments(@PathVariable Long id) {
        return ResponseEntity.ok(commandeService.getPayments(id));
    }

    @GetMapping("/{id}/history")
    public ResponseEntity<List<HistoriqueStatutDTO>> getHistory(@PathVariable Long id) {
        return ResponseEntity.ok(commandeService.getHistory(id));
    }

    @PostMapping("/{id}/images")
    public ResponseEntity<Void> addOrderImages(@PathVariable Long id,
            @RequestBody Map<String, Object> request) {
        List<String> urls = (List<String>) request.get("imageUrls");
        String type = (String) request.get("photoType");
        commandeService.addOrderImages(id, urls, type);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/failed-attempt")
    public ResponseEntity<OrderAttemptDto> recordFailedAttempt(@PathVariable Long id,
            @Valid @RequestBody OrderAttemptRequest request) {
        return ResponseEntity.ok(commandeService.recordFailedAttempt(id, request));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<CommandeDTO> cancelWithReason(@PathVariable Long id,
            @RequestBody(required = false) CancelOrderRequest request) {
        return ResponseEntity.ok(commandeService.cancelOrderWithReason(
                id, request != null ? request : new CancelOrderRequest()));
    }

    @GetMapping("/{id}/attempts")
    public ResponseEntity<List<OrderAttemptDto>> getAttempts(@PathVariable Long id) {
        return ResponseEntity.ok(commandeService.getAttemptsForOrder(id));
    }
}
