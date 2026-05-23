package com.wash.laundry_app.catalog.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CategoryRequest {
    @NotBlank(message = "Le nom est obligatoire")
    private String nom;
    private String nomAr;
    private String nomFr;
    private String icon;
    private String imageUrl;
    private String description;
    private Integer sortOrder;
}
