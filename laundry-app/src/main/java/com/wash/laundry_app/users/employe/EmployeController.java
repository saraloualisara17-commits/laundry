package com.wash.laundry_app.users.employe;

import com.wash.laundry_app.command.*;
import com.wash.laundry_app.config.FileStorageService;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

@Deprecated
@RestController
@RequestMapping("/employe")
@AllArgsConstructor
public class EmployeController {

    private final com.wash.laundry_app.command.services.CommandeQueryService queryService;
    private final CommandeMapper commandeMapper;
    private final CommandeService commandeService;
    private final FileStorageService fileStorageService;

    @GetMapping("/commandes")
    public ResponseEntity<List<CommandDtoEmploye>> allCommandes() {
        List<CommandDtoEmploye> commandes = queryService.getAllCommandes().stream()
                .map(dto -> {
                    // EmployeController legacy mapping for backward compatibility
                    CommandDtoEmploye empDto = new CommandDtoEmploye();
                    empDto.setId(dto.getId());
                    empDto.setLivreur(dto.getLivreur());
                    empDto.setDeliveryDriver(dto.getDeliveryDriver());
                    empDto.setNumeroCommande(dto.getNumeroCommande());
                    empDto.setStatus(dto.getStatus());
                    empDto.setDateCreation(dto.getDateCreation());
                    empDto.setDateValidation(dto.getDateValidation());
                    empDto.setDateLivraison(dto.getDateLivraison());
                    empDto.setCommandeTapis(dto.getCommandeTapis());
                    empDto.setCreatedAt(dto.getCreatedAt());
                    empDto.setUpdatedAt(dto.getUpdatedAt());
                    return empDto;
                }).toList();
        return ResponseEntity.ok(commandes);
    }

    @GetMapping("/commandes/attente")
    public ResponseEntity<List<CommandDtoEmploye>> getPendingCommandes() {
        List<CommandDtoEmploye> commandes = queryService.getCommandesByStatus(CommandeStatus.PENDING_PICKUP).stream()
                .map(dto -> {
                    CommandDtoEmploye empDto = new CommandDtoEmploye();
                    empDto.setId(dto.getId());
                    empDto.setLivreur(dto.getLivreur());
                    empDto.setDeliveryDriver(dto.getDeliveryDriver());
                    empDto.setNumeroCommande(dto.getNumeroCommande());
                    empDto.setStatus(dto.getStatus());
                    empDto.setDateCreation(dto.getDateCreation());
                    empDto.setDateValidation(dto.getDateValidation());
                    empDto.setDateLivraison(dto.getDateLivraison());
                    empDto.setCommandeTapis(dto.getCommandeTapis());
                    empDto.setCreatedAt(dto.getCreatedAt());
                    empDto.setUpdatedAt(dto.getUpdatedAt());
                    return empDto;
                }).toList();
        return ResponseEntity.ok(commandes);
    }

    @GetMapping("/commandes/count/attente")
    public ResponseEntity<Long> getPendingCount() {
        return ResponseEntity.ok(commandeService.getCountByStatus(CommandeStatus.PENDING_PICKUP));
    }

    @GetMapping("/commandes/retournee")
    public ResponseEntity<List<CommandDtoEmploye>> getReturnedCommandes() {
        List<CommandDtoEmploye> commandes = queryService.getCommandesByStatus(CommandeStatus.PICKED_UP).stream()
                .map(dto -> {
                    CommandDtoEmploye empDto = new CommandDtoEmploye();
                    empDto.setId(dto.getId());
                    empDto.setLivreur(dto.getLivreur());
                    empDto.setDeliveryDriver(dto.getDeliveryDriver());
                    empDto.setNumeroCommande(dto.getNumeroCommande());
                    empDto.setStatus(dto.getStatus());
                    empDto.setDateCreation(dto.getDateCreation());
                    empDto.setDateValidation(dto.getDateValidation());
                    empDto.setDateLivraison(dto.getDateLivraison());
                    empDto.setCommandeTapis(dto.getCommandeTapis());
                    empDto.setCreatedAt(dto.getCreatedAt());
                    empDto.setUpdatedAt(dto.getUpdatedAt());
                    return empDto;
                }).toList();
        return ResponseEntity.ok(commandes);
    }

    @GetMapping("/commandes/count/retournee")
    public ResponseEntity<Long> getReturnedCount() {
        return ResponseEntity.ok(commandeService.getCountByStatus(CommandeStatus.PICKED_UP));
    }

    @PatchMapping("/commandes/{id}/status")
    public ResponseEntity<CommandeDTO> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateCommandeStatusRequest request) {
        return ResponseEntity.ok(commandeService.updateStatus(id, request));
    }

    @GetMapping("/commandes/{id}")
    public ResponseEntity<CommandDetails> getCommande(@PathVariable Long id) {
        return ResponseEntity.ok(commandeService.getCommandeById(id));
    }

    @PostMapping("/tapis/upload")
    public ResponseEntity<List<Map<String, String>>> uploadTapisImages(@RequestParam("files") MultipartFile[] files) {
        List<Map<String, String>> result = Arrays.stream(files).map(file -> {
            String fileName = fileStorageService.storeFile(file);
            String fileDownloadUri = "/uploads/" + fileName;
            return Map.of("imageUrl", fileDownloadUri);
        }).toList();
        return ResponseEntity.ok(result);
    }
}
