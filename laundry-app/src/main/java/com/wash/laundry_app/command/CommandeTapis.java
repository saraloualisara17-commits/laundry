package com.wash.laundry_app.command;

import com.wash.laundry_app.catalog.Product;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.ArrayList;

@Entity
@Table(name = "commande_tapis")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CommandeTapis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "commande_id", nullable = false)
    private Commande commande;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(nullable = false)
    private Integer quantite = 1;

    @Column(name = "prix_unitaire", nullable = false, precision = 10, scale = 2)
    private BigDecimal prixUnitaire;

    @Column(name = "sous_total", nullable = false, precision = 10, scale = 2)
    private BigDecimal sousTotal;

    // ── Dimension-based pricing fields ──────────────────────────────────────

    @Column(precision = 10, scale = 2)
    private BigDecimal largeur;

    @Column(precision = 10, scale = 2)
    private BigDecimal hauteur;

    @Column(name = "prix_calcule", precision = 10, scale = 2)
    private BigDecimal prixCalcule;

    @Column(name = "prix_final", precision = 10, scale = 2)
    private BigDecimal prixFinal;

    @Column(precision = 10, scale = 2)
    private BigDecimal longueur;

    @Column(precision = 10, scale = 2)
    private BigDecimal poids;

    @Column(name = "remise_montant", precision = 10, scale = 2)
    private BigDecimal remiseMontant = BigDecimal.ZERO;

    @Column(name = "tag_numero", length = 50)
    private String tagNumero;

    @Column(name = "notes", length = 1000)
    private String notes;

    @Column(name = "couleur", length = 50)
    private String couleur;

    @Enumerated(EnumType.STRING)
    @Column(name = "mode_tarification", length = 20)
    private ModeTarification modeTarification;

    @Column(name = "remise_raison")
    private String remiseRaison;

    @OneToMany(mappedBy = "commandeTapis", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<CommandeImage> images = new java.util.ArrayList<>();

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Explicit Getters/Setters to bypass Lombok failures
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Commande getCommande() { return commande; }
    public void setCommande(Commande commande) { this.commande = commande; }
    public Product getProduct() { return product; }
    public void setProduct(Product product) { this.product = product; }
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

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        calculateSousTotal();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
        calculateSousTotal();
    }

    // Calculate subtotal — uses prixFinal if set, otherwise falls back to prixUnitaire
    public void calculateSousTotal() {
        BigDecimal basePrice = (prixFinal != null) ? prixFinal : prixUnitaire;
        if (basePrice != null && quantite != null) {
            this.sousTotal = basePrice.multiply(new BigDecimal(quantite));
        }
    }
}
