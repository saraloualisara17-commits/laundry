package com.wash.laundry_app.catalog.dto;

import com.wash.laundry_app.catalog.PricingMethod;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductDto {
    private Long id;
    private Long categoryId;
    private String categoryNom;
    private String nom;
    private String imageUrl;
    private String description;
    private PricingMethod pricingMethod;
    private BigDecimal prixUnitaire;
    private String uniteLabel;
    private Integer processingDays;
    private Boolean requiresDimensions;
    private Boolean isActive;
    private Integer sortOrder;
}
