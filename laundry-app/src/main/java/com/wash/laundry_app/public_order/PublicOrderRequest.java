package com.wash.laundry_app.public_order;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class PublicOrderRequest {

    @NotBlank(message = "Le nom est obligatoire")
    private String clientName;

    @NotBlank(message = "Le téléphone est obligatoire")
    private String clientPhone;

    private String     clientAddress;
    private BigDecimal deliveryLatitude;   // renamed from clientLatitude
    private BigDecimal deliveryLongitude;  // renamed from clientLongitude
    private String     notes;

    @NotEmpty(message = "Au moins un article est requis")
    @Valid
    private List<PublicOrderItem> items;

    @Data
    public static class PublicOrderItem {
        @NotNull(message = "Le produit est obligatoire")
        private Long productId;

        @NotNull(message = "La quantité est obligatoire")
        private Integer quantite;

        private BigDecimal largeur;
        private BigDecimal longueur;
        private BigDecimal poids;
    }
}

