package com.wash.laundry_app.catalog.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CategoryDto {
    private Long id;
    private String nom;
    private String nomAr;
    private String nomFr;
    private String icon;
    private String imageUrl;
    private String description;
    private Boolean isActive;
    private Integer sortOrder;
    private Long productCount;
    private List<ProductDto> products;
}
