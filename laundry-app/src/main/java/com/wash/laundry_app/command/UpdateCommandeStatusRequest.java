package com.wash.laundry_app.command;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateCommandeStatusRequest {

    @NotNull(message = "Le statut est obligatoire")
    private CommandeStatus status;

    private String commentaire;

    /**
     * Optional payment amount to record at the moment of delivery confirmation.
     * Only relevant when status = DELIVERED. Creates a Paiement record automatically.
     */
    @JsonProperty("amount")
    private BigDecimal montantCollecte;

    private String notesPaiement;

    /**
     * Client-generated UUID for the payment created at delivery.
     * Only relevant when status = DELIVERED and montantCollecte > 0.
     * Prevents a duplicate payment if the network drops after the server
     * commits but before the client receives the 200 response.
     */
    private String paymentIdempotencyKey;

    // Explicit getters/setters to bypass Lombok edge cases
    public CommandeStatus getStatus() { return status; }
    public void setStatus(CommandeStatus status) { this.status = status; }
    public String getCommentaire() { return commentaire; }
    public void setCommentaire(String commentaire) { this.commentaire = commentaire; }
    public BigDecimal getMontantCollecte() { return montantCollecte; }
    public void setMontantCollecte(BigDecimal montantCollecte) { this.montantCollecte = montantCollecte; }
    public String getNotesPaiement() { return notesPaiement; }
    public void setNotesPaiement(String notesPaiement) { this.notesPaiement = notesPaiement; }
    public String getPaymentIdempotencyKey() { return paymentIdempotencyKey; }
    public void setPaymentIdempotencyKey(String paymentIdempotencyKey) { this.paymentIdempotencyKey = paymentIdempotencyKey; }
}