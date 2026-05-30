package com.wash.laundry_app.command;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateCommandeRequest {

    private Long version;
    private Long livreurId;
    private Long deliveryDriverId;
    private LocalDateTime dateLivraison;
    private LocalDateTime scheduledPickupDate;
    private LocalDateTime scheduledDeliveryDate;
    private String notes;
    private CommandeStatus status;
    private java.util.List<CreateCommandeRequest.TapisItem> tapis;
    private java.util.List<String> imageUrls;

    public Long getVersion() { return version; }
    public void setVersion(Long version) { this.version = version; }
    public Long getLivreurId() { return livreurId; }
    public void setLivreurId(Long livreurId) { this.livreurId = livreurId; }
    public Long getDeliveryDriverId() { return deliveryDriverId; }
    public void setDeliveryDriverId(Long deliveryDriverId) { this.deliveryDriverId = deliveryDriverId; }
    public LocalDateTime getDateLivraison() { return dateLivraison; }
    public void setDateLivraison(LocalDateTime dateLivraison) { this.dateLivraison = dateLivraison; }
    public LocalDateTime getScheduledPickupDate() { return scheduledPickupDate; }
    public void setScheduledPickupDate(LocalDateTime scheduledPickupDate) { this.scheduledPickupDate = scheduledPickupDate; }
    public LocalDateTime getScheduledDeliveryDate() { return scheduledDeliveryDate; }
    public void setScheduledDeliveryDate(LocalDateTime scheduledDeliveryDate) { this.scheduledDeliveryDate = scheduledDeliveryDate; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public CommandeStatus getStatus() { return status; }
    public void setStatus(CommandeStatus status) { this.status = status; }
    public java.util.List<CreateCommandeRequest.TapisItem> getTapis() { return tapis; }
    public void setTapis(java.util.List<CreateCommandeRequest.TapisItem> tapis) { this.tapis = tapis; }
    public java.util.List<String> getImageUrls() { return imageUrls; }
    public void setImageUrls(java.util.List<String> imageUrls) { this.imageUrls = imageUrls; }
}