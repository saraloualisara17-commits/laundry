package com.wash.laundry_app.command;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateCommandeRequest {

    @NotNull(message = "L'ID du client est obligatoire")
    private Long clientId;

    private String mode; // IMMEDIATE or SCHEDULED
    private String deliveryType;
    private Long pickupDriverId;
    private String scheduledPickupDate;
    private String paymentMethod;
    private BigDecimal montantPaye;
    private String notes;
    private String deliveryAddress;
    private java.math.BigDecimal deliveryLatitude;
    private java.math.BigDecimal deliveryLongitude;
    private List<String> imageUrls;

    @NotEmpty(message = "Au moins un article est requis")
    @Valid
    private List<TapisItem> tapis;

    // Explicit Getters/Setters to bypass potential Lombok issues
    public Long getClientId() { return clientId; }
    public void setClientId(Long clientId) { this.clientId = clientId; }
    public String getMode() { return mode; }
    public void setMode(String mode) { this.mode = mode; }
    public String getDeliveryType() { return deliveryType; }
    public void setDeliveryType(String deliveryType) { this.deliveryType = deliveryType; }
    public Long getPickupDriverId() { return pickupDriverId; }
    public void setPickupDriverId(Long pickupDriverId) { this.pickupDriverId = pickupDriverId; }
    public String getScheduledPickupDate() { return scheduledPickupDate; }
    public void setScheduledPickupDate(String scheduledPickupDate) { this.scheduledPickupDate = scheduledPickupDate; }
    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }
    public BigDecimal getMontantPaye() { return montantPaye; }
    public void setMontantPaye(BigDecimal montantPaye) { this.montantPaye = montantPaye; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public String getDeliveryAddress() { return deliveryAddress; }
    public void setDeliveryAddress(String deliveryAddress) { this.deliveryAddress = deliveryAddress; }
    public java.math.BigDecimal getDeliveryLatitude() { return deliveryLatitude; }
    public void setDeliveryLatitude(java.math.BigDecimal deliveryLatitude) { this.deliveryLatitude = deliveryLatitude; }
    public java.math.BigDecimal getDeliveryLongitude() { return deliveryLongitude; }
    public void setDeliveryLongitude(java.math.BigDecimal deliveryLongitude) { this.deliveryLongitude = deliveryLongitude; }
    public List<String> getImageUrls() { return imageUrls; }
    public void setImageUrls(List<String> imageUrls) { this.imageUrls = imageUrls; }
    public List<TapisItem> getTapis() { return tapis; }
    public void setTapis(List<TapisItem> tapis) { this.tapis = tapis; }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TapisItem {

        @NotNull(message = "Le produit est obligatoire")
        private Long productId;

        @NotNull(message = "La quantité est obligatoire")
        private Integer quantite;

        private BigDecimal largeur;
        private BigDecimal hauteur;
        private BigDecimal longueur;
        private BigDecimal poids;
        private BigDecimal manualPrice; // Used if pricing method is CUSTOM
        
        private String tagNumero;
        private String notes;
        private String couleur;
        private BigDecimal remiseMontant;
        private String remiseRaison;
        private List<String> imageUrls;

        // Explicit Getters/Setters
        public Long getProductId() { return productId; }
        public void setProductId(Long productId) { this.productId = productId; }
        public Integer getQuantite() { return quantite; }
        public void setQuantite(Integer quantite) { this.quantite = quantite; }
        public BigDecimal getLargeur() { return largeur; }
        public void setLargeur(BigDecimal largeur) { this.largeur = largeur; }
        public BigDecimal getHauteur() { return hauteur; }
        public void setHauteur(BigDecimal hauteur) { this.hauteur = hauteur; }
        public BigDecimal getLongueur() { return longueur; }
        public void setLongueur(BigDecimal longueur) { this.longueur = longueur; }
        public BigDecimal getPoids() { return poids; }
        public void setPoids(BigDecimal poids) { this.poids = poids; }
        public BigDecimal getManualPrice() { return manualPrice; }
        public void setManualPrice(BigDecimal manualPrice) { this.manualPrice = manualPrice; }
        public String getTagNumero() { return tagNumero; }
        public void setTagNumero(String tagNumero) { this.tagNumero = tagNumero; }
        public String getNotes() { return notes; }
        public void setNotes(String notes) { this.notes = notes; }
        public String getCouleur() { return couleur; }
        public void setCouleur(String couleur) { this.couleur = couleur; }
        public BigDecimal getRemiseMontant() { return remiseMontant; }
        public void setRemiseMontant(BigDecimal remiseMontant) { this.remiseMontant = remiseMontant; }
        public String getRemiseRaison() { return remiseRaison; }
        public void setRemiseRaison(String remiseRaison) { this.remiseRaison = remiseRaison; }
        public List<String> getImageUrls() { return imageUrls; }
        public void setImageUrls(List<String> imageUrls) { this.imageUrls = imageUrls; }
    }
}
