package com.wash.laundry_app.command;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateCommandeRequest {

    @NotNull(message = "L'ID du client est obligatoire")
    private Long clientId;

    @NotEmpty(message = "Au moins un tapis est requis")
    @Valid
    private List<TapisItem> tapis;

    public Long getClientId() { return clientId; }
    public void setClientId(Long clientId) { this.clientId = clientId; }
    public List<TapisItem> getTapis() { return tapis; }
    public void setTapis(List<TapisItem> tapis) { this.tapis = tapis; }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TapisItem {

        @NotNull(message = "Le nom du tapis est obligatoire")
        @jakarta.validation.constraints.Size(max = 255, message = "Le nom ne doit pas dépasser 255 caractères")
        @jakarta.validation.constraints.Pattern(regexp = "^[a-zA-ZÀ-ÿ0-9\\s\\-.,'()]+$", message = "Nom contient des caractères non valides")
        private String nom;

        @jakarta.validation.constraints.Size(max = 1000, message = "La description ne doit pas dépasser 1000 caractères")
        @jakarta.validation.constraints.Pattern(regexp = "^[a-zA-ZÀ-ÿ0-9\\s\\-.,'()!?+]*$", message = "Description contient des caractères non valides")
        private String description;

        @NotNull(message = "Le prix unitaire est obligatoire")
        private java.math.BigDecimal prixUnitaire;

        @NotNull(message = "La quantité est obligatoire")
        private Integer quantite;

        // ✅ NEW: List of image URLs
        private List<String> imageUrls;

        // ✅ NEW: Index of the main image (optional, defaults to 0)
        private Integer mainImageIndex;

        // ✅ NEW: Carpet type reference (optional, for catalogue link)
        private Long carpetTypeId;

        // ✅ NEW: Dimension-based pricing
        private java.math.BigDecimal largeur;
        private java.math.BigDecimal hauteur;
        private java.math.BigDecimal prixCalcule;
        private java.math.BigDecimal prixFinal;
        private com.wash.laundry_app.command.ModeTarification modeTarification;

        public String getNom() { return nom; }
        public void setNom(String nom) { this.nom = nom; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public java.math.BigDecimal getPrixUnitaire() { return prixUnitaire; }
        public void setPrixUnitaire(java.math.BigDecimal prixUnitaire) { this.prixUnitaire = prixUnitaire; }
        public Integer getQuantite() { return quantite; }
        public void setQuantite(Integer quantite) { this.quantite = quantite; }
        public List<String> getImageUrls() { return imageUrls; }
        public void setImageUrls(List<String> imageUrls) { this.imageUrls = imageUrls; }
        public Integer getMainImageIndex() { return mainImageIndex; }
        public void setMainImageIndex(Integer mainImageIndex) { this.mainImageIndex = mainImageIndex; }
        public Long getCarpetTypeId() { return carpetTypeId; }
        public void setCarpetTypeId(Long carpetTypeId) { this.carpetTypeId = carpetTypeId; }
        public java.math.BigDecimal getLargeur() { return largeur; }
        public void setLargeur(java.math.BigDecimal largeur) { this.largeur = largeur; }
        public java.math.BigDecimal getHauteur() { return hauteur; }
        public void setHauteur(java.math.BigDecimal hauteur) { this.hauteur = hauteur; }
        public java.math.BigDecimal getPrixCalcule() { return prixCalcule; }
        public void setPrixCalcule(java.math.BigDecimal prixCalcule) { this.prixCalcule = prixCalcule; }
        public java.math.BigDecimal getPrixFinal() { return prixFinal; }
        public void setPrixFinal(java.math.BigDecimal prixFinal) { this.prixFinal = prixFinal; }
        public com.wash.laundry_app.command.ModeTarification getModeTarification() { return modeTarification; }
        public void setModeTarification(com.wash.laundry_app.command.ModeTarification modeTarification) { this.modeTarification = modeTarification; }
    }
}