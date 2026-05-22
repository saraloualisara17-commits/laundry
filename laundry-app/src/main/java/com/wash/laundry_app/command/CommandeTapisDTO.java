package com.wash.laundry_app.command;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommandeTapisDTO {

    private Long id;
    private Long productId;
    private String productNom;
    private String productPricingMethod;
    private Integer quantite;
    private BigDecimal prixUnitaire;
    private BigDecimal sousTotal;
    private BigDecimal largeur;
    private BigDecimal hauteur;
    private BigDecimal longueur;
    private BigDecimal poids;
    private BigDecimal remiseMontant;
    private String remiseRaison;
    private String tagNumero;
    private String notes;
    private String couleur;
    private List<CommandeImageDTO> images;
    private BigDecimal prixCalcule;
    private BigDecimal prixFinal;
    private ModeTarification modeTarification;
    private BigDecimal surface; // largeur * hauteur
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Explicit Getters/Setters to bypass potential Lombok issues
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }
    public String getProductNom() { return productNom; }
    public void setProductNom(String productNom) { this.productNom = productNom; }
    public String getProductPricingMethod() { return productPricingMethod; }
    public void setProductPricingMethod(String productPricingMethod) { this.productPricingMethod = productPricingMethod; }
    public Integer getQuantite() { return quantite; }
    public void setQuantite(Integer quantite) { this.quantite = quantite; }
    public BigDecimal getPrixUnitaire() { return prixUnitaire; }
    public void setPrixUnitaire(BigDecimal prixUnitaire) { this.prixUnitaire = prixUnitaire; }
    public BigDecimal getSousTotal() { return sousTotal; }
    public void setSousTotal(BigDecimal sousTotal) { this.sousTotal = sousTotal; }
    public BigDecimal getLargeur() { return largeur; }
    public void setLargeur(BigDecimal largeur) { this.largeur = largeur; }
    public BigDecimal getHauteur() { return hauteur; }
    public void setHauteur(BigDecimal hauteur) { this.hauteur = hauteur; }
    public BigDecimal getLongueur() { return longueur; }
    public void setLongueur(BigDecimal longueur) { this.longueur = longueur; }
    public BigDecimal getPoids() { return poids; }
    public void setPoids(BigDecimal poids) { this.poids = poids; }
    public BigDecimal getRemiseMontant() { return remiseMontant; }
    public void setRemiseMontant(BigDecimal remiseMontant) { this.remiseMontant = remiseMontant; }
    public String getRemiseRaison() { return remiseRaison; }
    public void setRemiseRaison(String remiseRaison) { this.remiseRaison = remiseRaison; }
    public String getTagNumero() { return tagNumero; }
    public void setTagNumero(String tagNumero) { this.tagNumero = tagNumero; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public String getCouleur() { return couleur; }
    public void setCouleur(String couleur) { this.couleur = couleur; }
    public BigDecimal getPrixCalcule() { return prixCalcule; }
    public void setPrixCalcule(BigDecimal prixCalcule) { this.prixCalcule = prixCalcule; }
    public BigDecimal getPrixFinal() { return prixFinal; }
    public void setPrixFinal(BigDecimal prixFinal) { this.prixFinal = prixFinal; }
    public ModeTarification getModeTarification() { return modeTarification; }
    public void setModeTarification(ModeTarification modeTarification) { this.modeTarification = modeTarification; }
    public BigDecimal getSurface() { return surface; }
    public void setSurface(BigDecimal surface) { this.surface = surface; }
}
