package com.wash.laundry_app.carpettype;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public class CarpetTypeRequest {

    @NotBlank(message = "Le nom du type de tapis est obligatoire")
    @jakarta.validation.constraints.Size(max = 255, message = "Le nom ne doit pas dépasser 255 caractères")
    @jakarta.validation.constraints.Pattern(regexp = "^[a-zA-ZÀ-ÿ0-9\\s\\-.,'()]+$", message = "Nom contient des caractères non valides")
    private String nom;

    @NotNull(message = "Le prix par m² est obligatoire")
    @DecimalMin(value = "0.01", message = "Le prix par m² doit être supérieur à 0")
    private BigDecimal prixParM2;

    private Boolean actif = true;

    public String getNom() { return nom; }
    public void setNom(String nom) { this.nom = nom; }
    public BigDecimal getPrixParM2() { return prixParM2; }
    public void setPrixParM2(BigDecimal prixParM2) { this.prixParM2 = prixParM2; }
    public Boolean getActif() { return actif; }
    public void setActif(Boolean actif) { this.actif = actif; }
}
