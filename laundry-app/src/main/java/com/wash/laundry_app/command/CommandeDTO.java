package com.wash.laundry_app.command;

import com.wash.laundry_app.clients.ClientDto;
import com.wash.laundry_app.users.UserDto;
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
public class CommandeDTO {

    private Long id;
    private ClientDto client;
    private UserDto livreur;
    private UserDto deliveryDriver;
    private String numeroCommande;
    private CommandeStatus status;
    private LocalDateTime dateCreation;
    private LocalDateTime dateValidation;
    private LocalDateTime dateLivraison;
    private BigDecimal montantTotal;
    private BigDecimal montantPaye;
    private BigDecimal resteAPayer;
    private BigDecimal montantRestant; // Alias for resteAPayer for frontend compatibility
    private ModePaiement modePaiement;
    private LocalDateTime datePaiement;
    private List<CommandeTapisDTO> commandeTapis;
    private List<CommandeImageDTO> images;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String preparateurName;
    private UserDto createdBy;
    private String clientLatitude;
    private String clientLongitude;
    private String clientAddress;
    // Delivery address — snapshotted at order creation, preferred over client address
    private String deliveryAddress;
    private java.math.BigDecimal deliveryLatitude;
    private java.math.BigDecimal deliveryLongitude;
    private Integer itemCount;
    private ModeCommande mode;
    private LocalDateTime scheduledPickupDate;
    private LocalDateTime scheduledDeliveryDate;
    private String notes;
    private boolean selfSubmitted;
    private LocalDateTime debtSettledAt;
}
