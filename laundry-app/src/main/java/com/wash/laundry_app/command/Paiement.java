package com.wash.laundry_app.command;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "paiements")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Paiement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "commande_id", nullable = false)
    private Commande commande;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal montant;

    @Column(name = "date_paiement", nullable = false)
    private LocalDateTime datePaiement;

    @Column(length = 255)
    private String note;

    /**
     * The user who recorded this payment — required for full audit trail.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recorded_by_id")
    private com.wash.laundry_app.users.User recordedBy;

    /**
     * Payment method for this specific transaction.
     * Stored per-payment (not only on the order header) to support
     * mixed-method partial payments (e.g. first installment cash, second card).
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "mode_paiement", length = 20)
    private ModePaiement modePaiement;

    @PrePersist
    protected void onCreate() {
        if (datePaiement == null) {
            datePaiement = LocalDateTime.now();
        }
    }
}
