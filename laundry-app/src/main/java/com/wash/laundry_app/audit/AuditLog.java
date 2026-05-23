package com.wash.laundry_app.audit;

import com.wash.laundry_app.users.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "audit_logs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String actionType; // e.g., ORDER_STATUS_CHANGE, PAYMENT_RECORDED, etc.

    @Column(nullable = false)
    private String entityType; // e.g., COMMANDE, PAIEMENT

    private Long entityId;

    @Column(columnDefinition = "TEXT")
    private String previousValue;

    @Column(columnDefinition = "TEXT")
    private String newValue;

    @Column(columnDefinition = "TEXT")
    private String metadata;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false)
    private LocalDateTime timestamp;
}
