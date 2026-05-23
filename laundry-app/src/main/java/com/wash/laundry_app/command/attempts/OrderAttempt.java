package com.wash.laundry_app.command.attempts;

import com.wash.laundry_app.command.Commande;
import com.wash.laundry_app.users.User;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "order_attempts")
@Data
@NoArgsConstructor
public class OrderAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "commande_id", nullable = false)
    private Commande commande;

    @Enumerated(EnumType.STRING)
    @Column(name = "attempt_type", nullable = false, length = 20)
    private AttemptType attemptType;

    @Column(name = "reason", nullable = false, length = 50)
    private String reason;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "driver_id")
    private User driver;

    @Column(name = "attempted_at", nullable = false)
    private LocalDateTime attemptedAt;

    @Column(name = "rescheduled_to")
    private LocalDateTime rescheduledTo;

    public static String getReasonLabel(String reason, String lang) {
        if (reason == null) return "";
        if ("AR".equalsIgnoreCase(lang)) {
            return switch (reason) {
                case "CLIENT_ABSENT"     -> "العميل غائب";
                case "CLIENT_REFUSED"    -> "رفض العميل";
                case "CLIENT_CANCELLED"  -> "إلغاء بطلب العميل";
                case "ADDRESS_NOT_FOUND" -> "العنوان غير موجود";
                case "ACCESS_PROBLEM"    -> "مشكلة في الوصول";
                case "PAYMENT_REFUSED"   -> "رفض الدفع";
                case "ITEM_DAMAGED"      -> "بضاعة تالفة";
                case "OTHER"             -> "سبب آخر";
                default -> reason;
            };
        }
        return switch (reason) {
            case "CLIENT_ABSENT"     -> "Client absent";
            case "CLIENT_REFUSED"    -> "Client a refusé";
            case "CLIENT_CANCELLED"  -> "Annulé par le client";
            case "ADDRESS_NOT_FOUND" -> "Adresse introuvable";
            case "ACCESS_PROBLEM"    -> "Problème d'accès";
            case "PAYMENT_REFUSED"   -> "Paiement refusé";
            case "ITEM_DAMAGED"      -> "Article endommagé";
            case "OTHER"             -> "Autre";
            default -> reason;
        };
    }
}
