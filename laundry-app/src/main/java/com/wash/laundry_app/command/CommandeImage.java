package com.wash.laundry_app.command;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "commande_images")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CommandeImage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "image_url", nullable = false, length = 500)
    private String imageUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "photo_type")
    @Builder.Default
    private PhotoType photoType = PhotoType.reception;

    @Column(name = "is_main")
    @Builder.Default
    private Boolean isMain = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "commande_id")
    private Commande commande;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "commande_tapis_id")
    private CommandeTapis commandeTapis;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    /**
     * Soft-delete flag — set to true when the parent item is replaced during
     * an order update. The image row is preserved in the database for audit
     * and dispute purposes but excluded from normal display queries.
     */
    @Column(name = "is_archived", nullable = false)
    @Builder.Default
    private Boolean isArchived = false;

    public enum PhotoType {
        reception,
        apres_traitement,
        livraison
    }
}
