package com.wash.laundry_app.catalog.dto;

import com.wash.laundry_app.catalog.PricingMethod;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class ProductRequest {
    @NotBlank(message = "Le nom est obligatoire")
    private String nom;
    
    private String imageUrl;
    
    private String description;
    
    @NotNull(message = "La méthode de tarification est obligatoire")
    private PricingMethod pricingMethod;
    
    @NotNull(message = "Le prix unitaire est obligatoire")
    @DecimalMin(value = "0.01", message = "Le prix doit être au moins 0.01")
    private BigDecimal prixUnitaire;
    
    private String uniteLabel;
    
    private Integer processingDays;
    
    private Boolean requiresDimensions;
    
    private Integer sortOrder;
}
