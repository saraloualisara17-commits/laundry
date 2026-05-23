package com.wash.laundry_app.command.services;

import com.wash.laundry_app.auth.AuthService;
import com.wash.laundry_app.command.*;
import com.wash.laundry_app.users.User;
import com.wash.laundry_app.users.employe.CommandDetails;
import com.wash.laundry_app.users.lvreur.LivreurDashboardStatsDTO;
import com.wash.laundry_app.users.admin.AdminOrdersResponseDTO;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@AllArgsConstructor
public class CommandeQueryService {

    private final CommandeRepository commandeRepository;
    private final HistoriqueStatutRepository historiqueStatutRepository;
    private final CommandeMapper commandeMapper;
    private final HistoriqueStatutMapper historiqueStatutMapper;
    private final AuthService authService;

    @Transactional(readOnly = true)
    public List<CommandeDTO> getPendingPickupOrdersForPickupDriver() {
        User user = authService.currentUser();
        return commandeRepository.findByLivreurIdAndStatus(user.getId(), CommandeStatus.PENDING_PICKUP)
                .stream().map(commandeMapper::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<CommandeDTO> getCancelledOrdersForPickupDriver() {
        User user = authService.currentUser();
        return commandeRepository.findByLivreurIdAndStatus(user.getId(), CommandeStatus.CANCELLED)
                .stream().map(commandeMapper::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<CommandeDTO> getReadyForDeliveryByDeliveryDriver() {
        User user = authService.currentUser();
        return commandeRepository.findReadyForDeliveryDueForDriver(user.getId())
                .stream().map(commandeMapper::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<CommandeDTO> getPastDeliveriesForDriver() {
        User user = authService.currentUser();
        return commandeRepository.findByDeliveryDriverIdAndStatus(user.getId(), CommandeStatus.DELIVERED)
                .stream()
                .sorted(java.util.Comparator.comparing(
                        c -> c.getDateLivraison() != null ? c.getDateLivraison() : c.getDateCreation(),
                        java.util.Comparator.reverseOrder()))
                .map(commandeMapper::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public long getReadyForDeliveryCountForDeliveryDriver() {
        User user = authService.currentUser();
        return commandeRepository.countByDeliveryDriverIdAndStatus(user.getId(), CommandeStatus.READY_FOR_DELIVERY);
    }

    @Transactional(readOnly = true)
    public Commande getById(Long id) {
        return commandeRepository.findWithClientDetailsById(id).orElseThrow(CommandeNotFoundException::new);
    }

    @Transactional(readOnly = true)
    public CommandDetails getCommandeById(Long id) {
        return commandeMapper.Todto(commandeRepository.findWithClientDetailsById(id).orElseThrow(CommandeNotFoundException::new));
    }

    @Transactional(readOnly = true)
    public CommandeDTO getCommandeDtoById(Long id) {
        return commandeMapper.toDto(commandeRepository.findWithClientDetailsById(id).orElseThrow(CommandeNotFoundException::new));
    }

    @Transactional(readOnly = true)
    public List<CommandeDTO> getAllCommandes() {
        return commandeRepository.findAll().stream().map(commandeMapper::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<CommandeDTO> getCommandesByLivreur(Long livreurId) {
        return commandeRepository.findByLivreurId(livreurId).stream().map(commandeMapper::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<CommandeDTO> getCommandesByStatus(CommandeStatus status) {
        return commandeRepository.findByStatus(status).stream().map(commandeMapper::toDto).toList();
    }

    public long getCountByStatus(CommandeStatus status) {
        return commandeRepository.countByStatus(status);
    }

    @Transactional(readOnly = true)
    public LivreurDashboardStatsDTO getLivreurDashboardStats() {
        User user = authService.currentUser();
        Long uid = user.getId();
        long ready = commandeRepository.countByDeliveryDriverIdAndStatus(uid, CommandeStatus.READY_FOR_DELIVERY);
        long pending = commandeRepository.countByLivreurIdAndStatus(uid, CommandeStatus.PENDING_PICKUP);
        long cancelled = commandeRepository.countByLivreurIdAndStatus(uid, CommandeStatus.CANCELLED);
        return LivreurDashboardStatsDTO.builder()
                .readyOrdersCount(ready)
                .pendingPickupCount(pending)
                .cancelledCount(cancelled)
                .missionsCount(ready + pending)
                .build();
    }

    @Transactional(readOnly = true)
    public List<HistoriqueStatutDTO> getHistory(Long id) {
        return historiqueStatutRepository.findByCommandeIdOrderByCreatedAtDesc(id)
                .stream().map(historiqueStatutMapper::toDto).toList();
    }

    public List<PaymentTypeDTO> getPaymentTypes() {
        return Arrays.stream(ModePaiement.values())
                .map(m -> new PaymentTypeDTO(m.name(), m.name()))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public AdminOrdersResponseDTO getFilteredCommands(
            String status, String mode, Boolean paidDebts, Boolean activeOnly, Boolean selfSubmitted,
            java.time.LocalDate dateDebut, java.time.LocalDate dateFin,
            String search, Long livreurId, int page, int size, String sortDirection) {

        CommandeStatus statusEnum = null;
        if (status != null && !status.trim().isEmpty()) {
            try { statusEnum = CommandeStatus.valueOf(status.toUpperCase()); }
            catch (IllegalArgumentException e) { }
        }

        ModeCommande modeEnum = null;
        if (mode != null && !mode.trim().isEmpty()) {
            try { modeEnum = ModeCommande.valueOf(mode.toUpperCase()); }
            catch (IllegalArgumentException e) { }
        }

        java.time.LocalDateTime dateTimeDebut = dateDebut != null ? dateDebut.atStartOfDay() : null;
        java.time.LocalDateTime dateTimeFin = dateFin != null ? dateFin.atTime(23, 59, 59) : null;
        java.time.LocalDateTime thirtyDaysAgo = java.time.LocalDateTime.now().minusDays(30);

        Sort sort = Sort.by("dateCreation");
        sort = "asc".equalsIgnoreCase(sortDirection) ? sort.ascending() : sort.descending();

        PageRequest pageable = PageRequest.of(page, size, sort);
        Page<Commande> pageResult = commandeRepository.findFiltered(
                statusEnum, modeEnum, activeOnly, paidDebts, selfSubmitted, thirtyDaysAgo, dateTimeDebut, dateTimeFin, search, livreurId, pageable);

        java.math.BigDecimal totalValue  = commandeRepository.findFilteredTotalValue(statusEnum, modeEnum, activeOnly, paidDebts, selfSubmitted, thirtyDaysAgo, dateTimeDebut, dateTimeFin, search, livreurId);
        java.math.BigDecimal totalUnpaid = commandeRepository.findFilteredTotalUnpaid(statusEnum, modeEnum, activeOnly, paidDebts, selfSubmitted, thirtyDaysAgo, dateTimeDebut, dateTimeFin, search, livreurId);
        Long totalVolumes = commandeRepository.findFilteredTotalVolume(statusEnum, modeEnum, activeOnly, paidDebts, selfSubmitted, thirtyDaysAgo, dateTimeDebut, dateTimeFin, search, livreurId);

        return AdminOrdersResponseDTO.builder()
                .content(pageResult.getContent().stream().map(commandeMapper::toDto).toList())
                .totalElements(pageResult.getTotalElements())
                .totalPages(pageResult.getTotalPages())
                .currentPage(pageResult.getNumber())
                .pageSize(pageResult.getSize())
                .first(pageResult.isFirst())
                .last(pageResult.isLast())
                .totalValue(totalValue)
                .totalUnpaid(totalUnpaid)
                .totalVolumes(totalVolumes)
                .build();
    }

    @Transactional(readOnly = true)
    public byte[] exportCommandesToCsv() {
        List<Commande> commandes = commandeRepository.findAll().stream()
                .sorted(java.util.Comparator.comparing(Commande::getDateCreation).reversed())
                .toList();

        StringBuilder sb = new StringBuilder();
        sb.append("ID,Numero Commande,Client,Telephone,Date Creation,Status,Montant Total,Type Paiement\n");

        for (Commande c : commandes) {
            sb.append(c.getId()).append(",");
            sb.append(c.getNumeroCommande() != null ? c.getNumeroCommande() : "").append(",");
            sb.append(c.getClient() != null && c.getClient().getName() != null ? c.getClient().getName().replace(",", " ") : "").append(",");
            String phone = (c.getClient() != null && c.getClient().getPhones() != null && !c.getClient().getPhones().isEmpty())
                            ? c.getClient().getPhones().get(0).getPhoneNumber() : "";
            sb.append(phone).append(",");
            sb.append(c.getDateCreation() != null ? c.getDateCreation().toString() : "").append(",");
            sb.append(c.getStatus() != null ? c.getStatus().name() : "").append(",");
            sb.append(c.getModePaiement() != null ? c.getModePaiement().name() : "").append("\n");
        }
        return sb.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getOrdersForMap(Long livreurId) {
        return commandeRepository.findAll().stream()
                .filter(c -> livreurId == null || (c.getLivreur() != null && c.getLivreur().getId().equals(livreurId)))
                .filter(c -> {
                    // Prefer the order's own delivery coords; fall back to client's first address
                    if (c.getDeliveryLatitude() != null && c.getDeliveryLongitude() != null) return true;
                    if (c.getClient() == null || c.getClient().getAddresses() == null || c.getClient().getAddresses().isEmpty()) return false;
                    var addr = c.getClient().getAddresses().get(0);
                    return addr.getLatitude() != null && addr.getLongitude() != null;
                })
                .map(c -> {
                    // Resolve coords: order snapshot first, then client profile
                    java.math.BigDecimal lat, lng;
                    String addressText;
                    if (c.getDeliveryLatitude() != null && c.getDeliveryLongitude() != null) {
                        lat = c.getDeliveryLatitude();
                        lng = c.getDeliveryLongitude();
                        addressText = c.getDeliveryAddress();
                    } else {
                        var addr = c.getClient().getAddresses().get(0);
                        lat = addr.getLatitude();
                        lng = addr.getLongitude();
                        addressText = addr.getAddress();
                    }

                    Map<String, Object> map = new HashMap<>();
                    map.put("id", c.getId());
                    map.put("numeroCommande", c.getNumeroCommande() != null ? c.getNumeroCommande() : "");
                    map.put("status", c.getStatus() != null ? c.getStatus().name() : "");
                    map.put("clientName", c.getClient() != null && c.getClient().getName() != null ? c.getClient().getName() : "Client Inconnu");
                    map.put("clientLatitude", lat);
                    map.put("clientLongitude", lng);
                    map.put("clientAddress", addressText != null ? addressText : "");
                    map.put("deliveryLatitude", lat);
                    map.put("deliveryLongitude", lng);
                    map.put("deliveryAddress", addressText != null ? addressText : "");
                    map.put("clientPhone", c.getClient() != null && c.getClient().getPhones() != null && !c.getClient().getPhones().isEmpty()
                            ? c.getClient().getPhones().get(0).getPhoneNumber() : "");

                    double total = c.getMontantTotal() != null ? c.getMontantTotal().doubleValue() : 0.0;
                    double paye  = c.getMontantPaye()  != null ? c.getMontantPaye().doubleValue()  : 0.0;
                    map.put("montantTotal", total);
                    map.put("resteAPayer", total - paye);
                    map.put("livreurId", c.getLivreur() != null ? c.getLivreur().getId() : null);
                    return map;
                })
                .collect(Collectors.toList());
    }
}
