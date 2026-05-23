package com.wash.laundry_app.command;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaiementDTO {
    private Long id;
    private Long commandeId;
    private BigDecimal montant;
    private LocalDateTime datePaiement;
    private String note;
    /** Name of the user who recorded this payment — audit trail. */
    private String recordedByName;
    /** Payment method used for this specific transaction. */
    private ModePaiement modePaiement;
}
