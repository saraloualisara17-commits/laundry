package com.wash.laundry_app.calllogs;

import com.wash.laundry_app.clients.Client;
import com.wash.laundry_app.command.Commande;
import com.wash.laundry_app.users.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "call_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CallLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "staff_id", nullable = false)
    private User staff;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false)
    private Client client;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id")
    private Commande order;

    @Column(name = "phone_number", nullable = false, length = 20)
    private String phoneNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "call_type", nullable = false, length = 10)
    private CallType callType;

    @Column(name = "called_at", nullable = false)
    private LocalDateTime calledAt;

    @PrePersist
    protected void onCreate() {
        if (calledAt == null) calledAt = LocalDateTime.now();
    }

    public enum CallType {
        PHONE, WHATSAPP
    }
}
