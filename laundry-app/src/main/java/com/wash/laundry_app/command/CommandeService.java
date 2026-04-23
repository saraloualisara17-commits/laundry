package com.wash.laundry_app.command;


import com.wash.laundry_app.auth.AuthService;
import com.wash.laundry_app.clients.Client;
import com.wash.laundry_app.clients.ClientNotFoundException;
import com.wash.laundry_app.clients.ClientRepository;
import com.wash.laundry_app.command.ForbiddenOperationException;
import com.wash.laundry_app.tapis.Tapis;
import com.wash.laundry_app.tapis.TapisRepository;
import com.wash.laundry_app.users.User;
import com.wash.laundry_app.users.employe.CommandDetails;
import com.wash.laundry_app.users.lvreur.LivreurDashboardStatsDTO;
import com.wash.laundry_app.notifications.NotificationService;
import com.wash.laundry_app.users.Role;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@AllArgsConstructor
public class CommandeService {

    private final CommandeRepository commandeRepository;
    private final CommandeTapisRepository commandeTapisRepository;
    private final ClientRepository clientRepository;
    private final TapisRepository tapisRepository;
    private final HistoriqueStatutRepository historiqueStatutRepository;
    private final CommandeMapper commandeMapper;
    private final AuthService authService;
    private final CommandeTapisMapper commandeTapisMapper;
    private final HistoriqueStatutMapper historiqueStatutMapper;
    private final NotificationService notificationService;

    // Create commande

    @Transactional
    public CommandeDTO createCommande(CreateCommandeRequest request) {
        var livreur = authService.currentUser();

        // 1. Find client
        Client client = clientRepository.findById(request.getClientId())
                .orElseThrow(() -> new ClientNotFoundException("Client non trouvé"));

        // 2. Create commande
        Commande commande = new Commande();
        commande.setClient(client);
        commande.setLivreur(livreur);
        commande.setStatus(CommandeStatus.en_attente);
        commande = commandeRepository.save(commande);

        BigDecimal total = BigDecimal.ZERO;

        // 3. Create each tapis with images and link to order
        for (CreateCommandeRequest.TapisItem tapisItem : request.getTapis()) {

            // Create tapis record
            Tapis tapis = new Tapis();
            tapis.setNom(tapisItem.getNom());
            tapis.setDescription(tapisItem.getDescription());
            tapis.setPrixUnitaire(tapisItem.getPrixUnitaire());
            tapis = tapisRepository.save(tapis);

            // ✅ ADD IMAGES if provided
            if (tapisItem.getImageUrls() != null && !tapisItem.getImageUrls().isEmpty()) {
                int mainIndex = tapisItem.getMainImageIndex() != null ? tapisItem.getMainImageIndex() : 0;

                for (int i = 0; i < tapisItem.getImageUrls().size(); i++) {
                    String imageUrl = tapisItem.getImageUrls().get(i);
                    boolean isMain = (i == mainIndex);
                    tapis.addImage(imageUrl, isMain);
                }

                // Save tapis again to persist images
                tapis = tapisRepository.save(tapis);
            }

            // Create commande_tapis (junction)
            CommandeTapis commandeTapis = new CommandeTapis();
            commandeTapis.setCommande(commande);
            commandeTapis.setTapis(tapis);
            commandeTapis.setQuantite(tapisItem.getQuantite());
            commandeTapis.setPrixUnitaire(tapisItem.getPrixUnitaire());

            // Persist dimension-based pricing fields
            commandeTapis.setLargeur(tapisItem.getLargeur());
            commandeTapis.setHauteur(tapisItem.getHauteur());
            commandeTapis.setPrixCalcule(tapisItem.getPrixCalcule());
            commandeTapis.setPrixFinal(tapisItem.getPrixFinal());
            commandeTapis.setModeTarification(tapisItem.getModeTarification());

            // Use prixFinal if set (overridden), otherwise fall back to prixUnitaire
            BigDecimal basePrice = (tapisItem.getPrixFinal() != null)
                    ? tapisItem.getPrixFinal()
                    : tapisItem.getPrixUnitaire();
            BigDecimal sousTotal = basePrice.multiply(new BigDecimal(tapisItem.getQuantite()));
            commandeTapis.setSousTotal(sousTotal);
            commandeTapis.setEtat(TapisEtat.en_attente);

            commandeTapisRepository.save(commandeTapis);

            // Add to total
            total = total.add(sousTotal);
        }

        // 4. Update commande total
        commande.setMontantTotal(total);
        commande = commandeRepository.save(commande);

        // 5. Record status history
        recordStatusChange(commande, null, CommandeStatus.en_attente.name(), livreur, "Commande créée");

        // 🚀 NOTIFY ADMINS & EMPLOYEES
        notificationService.notifyRole(Role.admin, "Nouvelle Commande",
                "Commande #" + commande.getNumeroCommande() + " créée par " + livreur.getName(),
                "NEW_ORDER", commande.getId().toString());
        notificationService.notifyRole(Role.employe, "Nouvelle Commande",
                "Une nouvelle commande #" + commande.getNumeroCommande() + " attend d'être traitée.",
                "NEW_ORDER", commande.getId().toString());

        return commandeMapper.toDto(commande);
    }

    private void recordStatusChange(Commande commande, String oldStatus, String newStatus,
                                    com.wash.laundry_app.users.User user, String commentaire) {
        HistoriqueStatut historique = new HistoriqueStatut();
        historique.setCommande(commande);
        historique.setAncienStatut(oldStatus);
        historique.setNouveauStatut(newStatus);
        historique.setUser(user);
        historique.setCommentaire(commentaire);
        historiqueStatutRepository.save(historique);
    }


    // Get commande by ID
    @Transactional(readOnly = true)
    public CommandDetails getCommandeById(Long id) {
        Commande commande = commandeRepository.findById(id)
                .orElseThrow(CommandeNotFoundException::new);
        return commandeMapper.Todto(commande);
    }

    // Get all commandes
    @Transactional(readOnly = true)
    public List<CommandeDTO> getAllCommandes() {
        return commandeRepository.findAll()
                .stream()
                .map(commandeMapper::toDto)
                .toList();
    }

    // Get commandes by livreur
    @Transactional(readOnly = true)
    public List<CommandeDTO> getCommandesByLivreur(Long livreurId) {
        return commandeRepository.findByLivreurId(livreurId)
                .stream()
                .map(commandeMapper::toDto)
                .toList();
    }

    // Get commandes ready for delivery
    @Transactional(readOnly = true)
    public List<CommandeDTO> getReadyForDelivery() {
        var user = authService.currentUser();
        return commandeRepository.findReadyForDeliveryByLivreur(user.getId())
                .stream()
                .map(commandeMapper::toDto)
                .toList();
    }

    // Get commandes by status
    @Transactional(readOnly = true)
    public List<CommandeDTO> getCommandesByStatus(CommandeStatus status) {
        return commandeRepository.findByStatus(status)
                .stream()
                .map(commandeMapper::toDto)
                .toList();
    }

    public long getCountByStatus(CommandeStatus status) {
        return commandeRepository.countByStatus(status);
    }

    // Update commande status
    @Transactional
    public CommandeDTO updateStatus(Long commandeId, UpdateCommandeStatusRequest request) {
        User currentUser = authService.currentUser();

        Commande commande = commandeRepository.findById(commandeId)
                .orElseThrow(CommandeNotFoundException::new);

        String oldStatus = commande.getStatus().name();
        commande.setStatus(request.getNewStatus());

        // Update timestamps based on status
        switch (request.getNewStatus()) {
            case validee:
                commande.setDateValidation(LocalDateTime.now());
                break;
            case livree:
                commande.setDateLivraison(LocalDateTime.now());
                break;
        }

        commande = commandeRepository.save(commande);

        // Record status change
        recordStatusChange(commande, oldStatus, request.getNewStatus().name(), currentUser, request.getCommentaire());

        // 🚀 TARGETED NOTIFICATIONS
        String orderNum = commande.getNumeroCommande();
        String orderId = commande.getId().toString();

        if (request.getNewStatus() == CommandeStatus.prete) {
            notificationService.notifyRole(Role.admin, "Commande Prête", "Commande #" + orderNum + " est prête.", "ORDER_READY", orderId);
            if (commande.getLivreur() != null) {
                notificationService.createNotification(commande.getLivreur(), "Commande Prête", "La commande #" + orderNum + " est prête pour livraison.", "ORDER_READY", orderId);
            }
        } else if (request.getNewStatus() == CommandeStatus.livree) {
            notificationService.notifyRole(Role.admin, "Commande en Livraison", "Commande #" + orderNum + " est en cours de livraison.", "ORDER_DELIVERING", orderId);
        } else if (request.getNewStatus() == CommandeStatus.annulee) {
            notificationService.notifyRole(Role.admin, "Livraison Annulée", "Commande #" + orderNum + " a été annulée.", "ORDER_CANCELLED", orderId);
        } else if (request.getNewStatus() == CommandeStatus.retournee) {
            notificationService.notifyRole(Role.admin, "Commande Retournée", "Commande #" + orderNum + " est de retour à l'atelier.", "ORDER_RETURNED", orderId);
        }

        return commandeMapper.toDto(commande);
    }

    // Update tapis etat in commande
    @Transactional
    public CommandeTapisDTO updateTapisEtat(Long commandeTapisId, UpdateTapisEtatRequest request) {
        CommandeTapis commandeTapis = commandeTapisRepository.findById(commandeTapisId)
                .orElseThrow(() -> new RuntimeException("Tapis dans commande non trouvé"));

        commandeTapis.setEtat(request.getNewEtat());
        commandeTapis = commandeTapisRepository.save(commandeTapis);

        // Check if all tapis are done, update commande status
        checkAndUpdateCommandeStatusBasedOnTapis(commandeTapis.getCommande().getId());

        return commandeTapisMapper.toDto(commandeTapis);
    }

    // Record payment
    @Transactional
    public CommandeDTO recordPayment(Long commandeId, RecordPaymentRequest request) {
        User currentUser = authService.currentUser();

        Commande commande = commandeRepository.findById(commandeId)
                .orElseThrow(CommandeNotFoundException::new);

        // CRIT-2: verify ownership — only the assigned livreur can record payment
        if (commande.getLivreur() == null || !commande.getLivreur().getId().equals(currentUser.getId())) {
            throw new ForbiddenOperationException("Vous n'êtes pas autorisé à encaisser cette commande.");
        }

        if (commande.getStatus() != CommandeStatus.livree) {
            throw new ForbiddenOperationException("Seules les commandes livrées peuvent être payées.");
        }

        String oldStatus = commande.getStatus().name();
        commande.setModePaiement(request.getModePaiement());
        commande.setDatePaiement(LocalDateTime.now());
        commande.setStatus(CommandeStatus.payee);

        // Update all tapis to LIVRE
        for (CommandeTapis ct : commande.getCommandeTapis()) {
            ct.setEtat(TapisEtat.livre);
        }

        commande = commandeRepository.save(commande);

        // Record status change
        recordStatusChange(commande, oldStatus, CommandeStatus.payee.name(), currentUser, "Paiement enregistré");

        // 🚀 NOTIFY ADMIN (Payment confirmed)
        notificationService.notifyRole(Role.admin, "Commande Payée",
                "La commande #" + commande.getNumeroCommande() + " a été payée (" + commande.getMontantTotal() + " DH).",
                "PAYMENT_RECEIVED", commande.getId().toString());

        return commandeMapper.toDto(commande);
    }

    @Transactional
    public CommandeDTO annulerCommande(Long id) {
        User currentUser = authService.currentUser();

        Commande commande = commandeRepository.findById(id)
                .orElseThrow(CommandeNotFoundException::new);

        // CRIT-2: verify ownership
        if (commande.getLivreur() == null || !commande.getLivreur().getId().equals(currentUser.getId())) {
            throw new ForbiddenOperationException("Vous n'êtes pas autorisé à annuler cette commande.");
        }

        String oldStatus = commande.getStatus().name();
        commande.setStatus(CommandeStatus.annulee);
        commande = commandeRepository.save(commande);

        recordStatusChange(commande, oldStatus, CommandeStatus.annulee.name(), currentUser, "Livraison annulée par le livreur");

        // 🚀 NOTIFY ADMIN
        notificationService.notifyRole(Role.admin, "Livraison Annulée",
                "La commande #" + commande.getNumeroCommande() + " a été annulée par " + currentUser.getName(),
                "ORDER_CANCELLED", commande.getId().toString());

        return commandeMapper.toDto(commande);
    }

    // Take order (prete -> sorti/livree)
    @Transactional
    public CommandeDTO takeOrder(Long commandeId) {
        User currentUser = authService.currentUser();

        Commande commande = commandeRepository.findById(commandeId)
                .orElseThrow(CommandeNotFoundException::new);

        // CRIT-2: verify ownership — only the assigned livreur can take the order
        if (commande.getLivreur() == null || !commande.getLivreur().getId().equals(currentUser.getId())) {
            throw new ForbiddenOperationException("Vous n'êtes pas autorisé à prendre en charge cette commande.");
        }

        if (commande.getStatus() != CommandeStatus.prete) {
            throw new ForbiddenOperationException("Seules les commandes 'prêtes' peuvent être prises en charge.");
        }

        String oldStatus = commande.getStatus().name();
        commande.setStatus(CommandeStatus.livree);
        commande = commandeRepository.save(commande);

        recordStatusChange(commande, oldStatus, CommandeStatus.livree.name(), currentUser, "Commande prise en charge par le livreur");

        // 🚀 NOTIFY ADMIN (Handed over / Livree)
        notificationService.notifyRole(Role.admin, "Commande en Livraison",
                "La commande #" + commande.getNumeroCommande() + " est maintenant en cours de livraison.",
                "ORDER_DELIVERING", commande.getId().toString());

        return commandeMapper.toDto(commande);
    }

    // Return to workplace
    @Transactional
    public CommandeDTO returnToWorkplace(Long commandeId) {
        User currentUser = authService.currentUser();

        Commande commande = commandeRepository.findById(commandeId)
                .orElseThrow(CommandeNotFoundException::new);

        // CRIT-2: verify ownership
        if (commande.getLivreur() == null || !commande.getLivreur().getId().equals(currentUser.getId())) {
            throw new ForbiddenOperationException("Vous n'êtes pas autorisé à modifier cette commande.");
        }

        if (commande.getStatus() != CommandeStatus.annulee) {
            throw new ForbiddenOperationException("Seules les commandes annulées peuvent être retournées à l'atelier.");
        }

        String oldStatus = commande.getStatus().name();
        // Route back to the workshop with 'retournee' status
        commande.setStatus(CommandeStatus.retournee);
        commande = commandeRepository.save(commande);

        recordStatusChange(commande, oldStatus, CommandeStatus.retournee.name(), currentUser, "Retournée à l'atelier par le livreur");

        // 🚀 NOTIFY ADMIN
        notificationService.notifyRole(Role.admin, "Commande Retournée",
                "La commande #" + commande.getNumeroCommande() + " a été retournée à l'atelier.",
                "ORDER_RETURNED", commande.getId().toString());

        return commandeMapper.toDto(commande);
    }

    // Get historique for commande
    @Transactional(readOnly = true)
    public List<HistoriqueStatutDTO> getHistorique(Long commandeId) {
        return historiqueStatutRepository.findByCommandeIdOrderByCreatedAtDesc(commandeId)
                .stream()
                .map(historiqueStatutMapper::toDto)
                .toList();
    }

    // Helper: Check if all tapis are cleaned, update commande status
    private void checkAndUpdateCommandeStatusBasedOnTapis(Long commandeId) {
        List<CommandeTapis> allTapis = commandeTapisRepository.findByCommandeId(commandeId);

        boolean allCleaned = allTapis.stream()
                .allMatch(ct -> ct.getEtat() == TapisEtat.nettoye);

        if (allCleaned) {
            Commande commande = commandeRepository.findById(commandeId).orElseThrow();
            if (commande.getStatus() == CommandeStatus.en_attente || commande.getStatus() == CommandeStatus.en_traitement  ) {
                commande.setStatus(CommandeStatus.prete);
                commandeRepository.save(commande);

                // 🚀 NOTIFY ADMIN & LIVREUR
                notificationService.notifyRole(Role.admin, "Commande Prête",
                        "La commande #" + commande.getNumeroCommande() + " est prête.",
                        "ORDER_READY", commande.getId().toString());

                if (commande.getLivreur() != null) {
                    notificationService.createNotification(commande.getLivreur(), "Commande Prête",
                            "La commande #" + commande.getNumeroCommande() + " est prête pour livraison.",
                            "ORDER_READY", commande.getId().toString());
                }
            }
        }
    }

    @Transactional(readOnly = true)
    public List<CommandeDTO> getReadyForDeliveryByLivreur() {
        var user = authService.currentUser();
        List<Commande> commandes = commandeRepository.findByLivreurIdAndStatus(user.getId(), CommandeStatus.livree);
        return enrichCommandeDTOs(commandes);
    }

    @Transactional(readOnly = true)
    public List<CommandeDTO> getReadyOrdersForLivreur() {
        var user = authService.currentUser();
        List<Commande> commandes = commandeRepository.findByLivreurIdAndStatus(user.getId(), CommandeStatus.prete);
        return enrichCommandeDTOs(commandes);
    }

    // Get count of prete orders (for notification badge)
    @Transactional(readOnly = true)
    public long getPreteCountForLivreur() {
        var user = authService.currentUser();
        return commandeRepository.countByLivreurIdAndStatus(user.getId(), CommandeStatus.prete);
    }

    @Transactional(readOnly = true)
    public List<CommandeDTO> getCanceledDeliveriesByLivreur() {
        var user = authService.currentUser();
        List<Commande> commandes = commandeRepository.findByLivreurIdAndStatus(user.getId(), CommandeStatus.annulee);
        return enrichCommandeDTOs(commandes);
    }

    // Batch enrichment: fetches all "prete" history for the list in 1 query instead of N
    private List<CommandeDTO> enrichCommandeDTOs(List<Commande> commandes) {
        if (commandes.isEmpty()) return List.of();
        List<Long> ids = commandes.stream().map(Commande::getId).toList();
        // One query for all history records, grouped by commandeId
        Map<Long, HistoriqueStatut> preteHistoryByCommandeId = historiqueStatutRepository
                .findPreteHistoryForCommandes(ids)
                .stream()
                .collect(Collectors.toMap(
                        h -> h.getCommande().getId(),
                        h -> h,
                        (existing, replacement) -> existing  // keep the most recent (query is DESC)
                ));
        return commandes.stream().map(commande -> {
            CommandeDTO dto = commandeMapper.toDto(commande);
            HistoriqueStatut h = preteHistoryByCommandeId.get(commande.getId());
            if (h != null) {
                dto.setPreparateurName(h.getUser().getName());
            }
            return dto;
        }).toList();
    }

    // Single-order enrichment — kept for any future per-order callers
    private CommandeDTO enrichCommandeDTO(Commande commande) {
        CommandeDTO dto = commandeMapper.toDto(commande);
        historiqueStatutRepository.findByCommandeIdOrderByCreatedAtDesc(commande.getId())
                .stream()
                .filter(h -> CommandeStatus.prete.name().equalsIgnoreCase(h.getNouveauStatut()))
                .findFirst()
                .ifPresent(h -> dto.setPreparateurName(h.getUser().getName()));
        return dto;
    }

    @Transactional(readOnly = true)
    public LivreurDashboardStatsDTO getLivreurDashboardStats() {
        var user = authService.currentUser();
        Long livreurId = user.getId();

        long pretesCount = commandeRepository.countByLivreurIdAndStatus(livreurId, CommandeStatus.livree);
        long aRecupererCount = commandeRepository.countByLivreurIdAndStatus(livreurId, CommandeStatus.prete);
        long annuleesCount = commandeRepository.countByLivreurIdAndStatus(livreurId, CommandeStatus.annulee);

        // MissionsCount: count of orders created today or with active status
        long missionsCount = pretesCount + aRecupererCount + annuleesCount;

        return LivreurDashboardStatsDTO.builder()
                .commandesPretesCount(pretesCount)
                .commandesARecupererCount(aRecupererCount)
                .commandesAnnuleesCount(annuleesCount)
                .missionsCount(missionsCount)
                .build();
    }

    public List<PaymentTypeDTO> getPaymentTypes() {
        return Arrays.stream(ModePaiement.values())
                .map(m -> new PaymentTypeDTO(m.name(), capitalize(m.name())))
                .collect(Collectors.toList());
    }

    private String capitalize(String str) {
        if (str == null || str.isEmpty()) return str;
        return str.substring(0, 1).toUpperCase() + str.substring(1);
    }
}
