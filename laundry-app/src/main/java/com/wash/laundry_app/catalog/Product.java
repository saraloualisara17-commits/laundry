package com.wash.laundry_app.catalog;

import jakarta.persistence.*;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "products")
@Getter
@Setter
@Data
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private ProductCategory category;

    @Column(nullable = false, length = 100)
    private String nom;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "pricing_method", nullable = false)
    private PricingMethod pricingMethod = PricingMethod.PER_UNIT;

    @Column(name = "prix_unitaire", nullable = false, precision = 10, scale = 2)
    private BigDecimal prixUnitaire;

    @Column(name = "unite_label", length = 20)
    private String uniteLabel = "pièce";

    @Column(name = "processing_days")
    private Integer processingDays = 2;

    @Column(name = "requires_dimensions")
    private Boolean requiresDimensions = false;

    @Column(name = "is_active")
    private Boolean isActive = true;

    @Column(name = "sort_order")
    private Integer sortOrder = 0;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public String getProductNom(){
        return this.nom;
    }
}
