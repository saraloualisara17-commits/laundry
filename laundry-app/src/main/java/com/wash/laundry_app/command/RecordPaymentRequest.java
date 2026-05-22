package com.wash.laundry_app.command;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

/**
 * Request body for the LIVREUR payment confirmation endpoint.
 * Previously this only captured modePaiement, so the amount was silently
 * assumed to be the full order total. Now callers must provide the actual
 * amount collected, enabling proper partial payment support.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RecordPaymentRequest {

    @NotNull(message = "Le mode de paiement est obligatoire")
    private ModePaiement modePaiement;

    /** Amount collected. If null, defaults to the full remaining balance. */
    @JsonProperty("amount")
    private BigDecimal montant;

    /** Optional note (e.g. "Versement partiel à la livraison"). */
    private String note;

    public ModePaiement getModePaiement() { return modePaiement; }
    public void setModePaiement(ModePaiement modePaiement) { this.modePaiement = modePaiement; }
    public BigDecimal getMontant() { return montant; }
    public void setMontant(BigDecimal montant) { this.montant = montant; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
}
