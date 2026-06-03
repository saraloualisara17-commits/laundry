package com.wash.laundry_app.public_order;

import com.wash.laundry_app.validation.ValidMoroccanPhone;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Null;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class PublicOrderRequest {

    @NotBlank(message = "Le nom est obligatoire")
    @Size(max = 100, message = "Le nom ne peut pas dépasser 100 caractères")
    private String clientName;

    @NotBlank(message = "Le téléphone est obligatoire")
    @ValidMoroccanPhone
    private String clientPhone;

    @Size(max = 500, message = "L'adresse ne peut pas dépasser 500 caractères")
    private String clientAddress;

    @DecimalMin(value = "-90.0",  message = "Latitude invalide")
    @DecimalMax(value =  "90.0",  message = "Latitude invalide")
    private BigDecimal deliveryLatitude;

    @DecimalMin(value = "-180.0", message = "Longitude invalide")
    @DecimalMax(value =  "180.0", message = "Longitude invalide")
    private BigDecimal deliveryLongitude;

    @Size(max = 500, message = "Les notes ne peuvent pas dépasser 500 caractères")
    private String notes;

    @NotEmpty(message = "Au moins un article est requis")
    @Size(max = 50, message = "Trop d'articles dans une seule commande (max 50)")
    @Valid
    private List<PublicOrderItem> items;

    /**
     * Honeypot field — invisible to real users. Bots that fill out every form
     * field will populate this, and the request is rejected. Legitimate browser
     * users never see it and submit it as null.
     *
     * The frontend renders a hidden text input named "website" with CSS that
     * keeps it out of view AND out of the accessibility tree.
     */
    @Null(message = "Spam detected")
    private String website;

    @Data
    public static class PublicOrderItem {
        @NotNull(message = "Le produit est obligatoire")
        @Positive(message = "ID produit invalide")
        private Long productId;

        @NotNull(message = "La quantité est obligatoire")
        @Min(value = 1,    message = "Quantité minimale: 1")
        @Max(value = 1000, message = "Quantité maximale: 1000")
        private Integer quantite;

        @DecimalMin(value = "0.0", inclusive = false, message = "Largeur doit être positive")
        @DecimalMax(value = "100.0", message = "Largeur déraisonnable (max 100m)")
        private BigDecimal largeur;

        @DecimalMin(value = "0.0", inclusive = false, message = "Longueur doit être positive")
        @DecimalMax(value = "100.0", message = "Longueur déraisonnable (max 100m)")
        private BigDecimal longueur;

        @DecimalMin(value = "0.0", inclusive = false, message = "Poids doit être positif")
        @DecimalMax(value = "500.0", message = "Poids déraisonnable (max 500kg)")
        private BigDecimal poids;
    }
}
