package com.wash.laundry_app.users.employe;

import com.wash.laundry_app.command.CommandeStatus;
import com.wash.laundry_app.command.CommandeTapisDTO;
import com.wash.laundry_app.users.UserDto;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
@Data
public class CommandDetails {
    private Long id;
    private String numeroCommande;
    private CommandeStatus status;
    private UserDto livreur;
    private String modePaiement;
    private LocalDateTime dateCreation;
    private List<CommandeTapisDTO> commandeTapis;
    private LocalDateTime dateValidation;
    private LocalDateTime dateLivraison;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
