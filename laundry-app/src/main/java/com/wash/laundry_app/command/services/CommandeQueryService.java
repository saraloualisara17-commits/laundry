package com.wash.laundry_app.command.services;

import com.wash.laundry_app.auth.AuthService;
import com.wash.laundry_app.clients.ClientPhone;
import com.wash.laundry_app.clients.ClientPhoneRepository;
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
    private final CommandeImageRepository commandeImageRepository;
    private final HistoriqueStatutRepository historiqueStatutRepository;
    private final CommandeMapper commandeMapper;
    private final HistoriqueStatutMapper historiqueStatutMapper;
    private final AuthService authService;
    private final ClientPhoneRepository clientPhoneRepository;

    @Transactional(readOnly = true)
    public List<CommandeDTO> getPendingPickupOrdersForPickupDriver() {
        User user = authService.currentUser();
        return commandeRepository.findPendingPickupsDueForDriver(user.getId(), java.time.LocalDate.now().atTime(23, 59, 59))
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
        return commandeRepository.findReadyForDeliveryDueForDriver(user.getId(), java.time.LocalDate.now().atTime(23, 59, 59))
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

    private static final int MAX_LIST_SIZE = 500;

    @Transactional(readOnly = true)
    public List<CommandeDTO> getAllCommandes() {
        return commandeRepository
                .findAll(PageRequest.of(0, MAX_LIST_SIZE, Sort.by(Sort.Direction.DESC, "dateCreation")))
                .getContent().stream().map(commandeMapper::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<CommandeDTO> getCommandesByLivreur(Long livreurId) {
        return commandeRepository.findByLivreurId(livreurId).stream().map(commandeMapper::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<CommandeDTO> getCommandesByStatus(CommandeStatus status) {
        return commandeRepository
                .findByStatus(status, PageRequest.of(0, MAX_LIST_SIZE, Sort.by(Sort.Direction.DESC, "dateCreation")))
                .getContent().stream().map(commandeMapper::toDto).toList();
    }

    public long getCountByStatus(CommandeStatus status) {
        return commandeRepository.countByStatus(status);
    }

    @Transactional(readOnly = true)
    public LivreurDashboardStatsDTO getLivreurDashboardStats() {
        User user = authService.currentUser();
        Long uid = user.getId();
        java.time.LocalDateTime endOfToday = java.time.LocalDate.now().atTime(23, 59, 59);
        long ready = commandeRepository.countReadyForDeliveryDueForDriver(uid, endOfToday);
        long pending = commandeRepository.countPendingPickupsDueForDriver(uid, endOfToday);
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

    @Transactional(readOnly = true)
    public Map<String, Long> getOverdueStats() {
        // Use start of today so that orders scheduled for today are NOT counted as late.
        // Only orders whose date is strictly before today (yesterday or earlier) are overdue.
        java.time.LocalDateTime startOfToday = java.time.LocalDate.now().atStartOfDay();
        long overduePickups = commandeRepository.countOverduePickups(startOfToday);
        long overdueDeliveries = commandeRepository.countOverdueDeliveries(startOfToday);
        Map<String, Long> result = new HashMap<>();
        result.put("overduePickups", overduePickups);
        result.put("overdueDeliveries", overdueDeliveries);
        return result;
    }

    @Transactional(readOnly = true)
    public List<CommandeDTO> getOverdueOrders(String type) {
        java.time.LocalDateTime startOfToday = java.time.LocalDate.now().atStartOfDay();
        List<Commande> orders = "delivery".equalsIgnoreCase(type)
                ? commandeRepository.findDelayedDeliveries(startOfToday)
                : commandeRepository.findOverduePickups(startOfToday);
        return orders.stream().map(commandeMapper::toDto).toList();
    }

    @Transactional(readOnly = true)
    public Page<OrderImageDTO> getFilteredImages(
            String status, String search,
            java.time.LocalDate dateDebut, java.time.LocalDate dateFin,
            int page, int size) {

        String statusParam  = (status != null && !status.trim().isEmpty()) ? status.toUpperCase() : null;
        String searchParam  = (search != null && !search.trim().isEmpty()) ? search : null;
        java.time.LocalDateTime dateTimeDebut = dateDebut != null ? dateDebut.atStartOfDay() : null;
        java.time.LocalDateTime dateTimeFin   = dateFin  != null ? dateFin.atTime(23, 59, 59) : null;

        PageRequest pageable = PageRequest.of(page, size);
        Page<Commande> idPage = commandeRepository.findOrdersWithImages(
                statusParam, searchParam, dateTimeDebut, dateTimeFin, pageable);

        List<Long> ids = idPage.getContent().stream().map(Commande::getId).toList();
        if (ids.isEmpty()) {
            return new org.springframework.data.domain.PageImpl<>(
                    java.util.Collections.emptyList(), pageable, 0);
        }

        // Two separate queries to avoid Hibernate MultipleBagFetchException:
        // client+phones is one bag, images is another — cannot JOIN FETCH both in one query.
        List<Commande> withClient = commandeRepository.findByIdsWithClient(ids);
        List<Commande> withImages = commandeRepository.findByIdsWithImages(ids);

        Map<Long, Commande> clientById = withClient.stream()
                .collect(Collectors.toMap(Commande::getId, c -> c));
        Map<Long, Commande> imagesById = withImages.stream()
                .collect(Collectors.toMap(Commande::getId, c -> c));

        List<OrderImageDTO> dtos = ids.stream()
                .filter(id -> clientById.containsKey(id))
                .map(id -> {
                    Commande c = clientById.get(id);
                    String phone = (c.getClient().getPhones() != null && !c.getClient().getPhones().isEmpty())
                            ? c.getClient().getPhones().get(0).getPhoneNumber() : null;
                    Commande ci = imagesById.get(id);
                    List<OrderImageDTO.ImageItem> images = (ci != null && ci.getImages() != null)
                            ? ci.getImages().stream()
                                    .filter(img -> !Boolean.TRUE.equals(img.getIsArchived()))
                                    .map(img -> OrderImageDTO.ImageItem.builder()
                                            .id(img.getId())
                                            .imageUrl(img.getImageUrl())
                                            .photoType(img.getPhotoType() != null ? img.getPhotoType().name() : null)
                                            .build())
                                    .toList()
                            : java.util.Collections.emptyList();
                    return OrderImageDTO.builder()
                            .orderId(c.getId())
                            .orderStatus(c.getStatus() != null ? c.getStatus().name() : null)
                            .clientName(c.getClient().getName())
                            .clientPhone(phone)
                            .dateCreation(c.getDateCreation())
                            .images(images)
                            .build();
                })
                .toList();

        return new org.springframework.data.domain.PageImpl<>(dtos, pageable, idPage.getTotalElements());
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

        // When filtering paid debts, the user-supplied date range applies to debtSettledAt,
        // not dateCreation — so we pass it through as-is and let the query use it for
        // the standard dateDebut/dateFin filter (which for paidDebts=true effectively
        // narrows to settlement date via the debtSettledAt field in the WHERE clause).
        Sort sort = Sort.by(Boolean.TRUE.equals(paidDebts) ? "debtSettledAt" : "dateCreation");
        sort = "asc".equalsIgnoreCase(sortDirection) ? sort.ascending() : sort.descending();

        PageRequest pageable = PageRequest.of(page, size, sort);
        Page<Commande> pageResult = commandeRepository.findFiltered(
                statusEnum, modeEnum, activeOnly, paidDebts, selfSubmitted, dateTimeDebut, dateTimeFin, search, livreurId, pageable);

        java.math.BigDecimal totalValue  = commandeRepository.findFilteredTotalValue(
                statusEnum, modeEnum, activeOnly, paidDebts, selfSubmitted, dateTimeDebut, dateTimeFin, search, livreurId);
        java.math.BigDecimal totalUnpaid = commandeRepository.findFilteredTotalUnpaid(
                statusEnum, modeEnum, activeOnly, paidDebts, selfSubmitted, dateTimeDebut, dateTimeFin, search, livreurId);
        Long totalVolumes = commandeRepository.findFilteredTotalVolume(
                statusEnum, modeEnum, activeOnly, paidDebts, selfSubmitted, dateTimeDebut, dateTimeFin, search, livreurId);

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
        List<Commande> commandes = commandeRepository.findAll(
                PageRequest.of(0, 2000, Sort.by(Sort.Direction.DESC, "dateCreation"))
        ).getContent();

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
        List<Commande> orders = commandeRepository.findAllForMapView(livreurId);
        if (orders.isEmpty()) return List.of();

        // Batch-fetch first phone per client in one query — avoids N lazy loads.
        List<Long> clientIds = orders.stream()
                .filter(c -> c.getClient() != null)
                .map(c -> c.getClient().getId())
                .distinct()
                .collect(Collectors.toList());
        Map<Long, String> phoneByClientId = clientPhoneRepository.findAllByClientIdIn(clientIds)
                .stream()
                .collect(Collectors.toMap(
                        p -> p.getClient().getId(),
                        ClientPhone::getPhoneNumber,
                        (a, b) -> a)); // keep first if duplicates

        return orders.stream()
                .map(c -> {
                    java.math.BigDecimal lat, lng;
                    String addressText;
                    if (c.getDeliveryLatitude() != null && c.getDeliveryLongitude() != null) {
                        lat = c.getDeliveryLatitude();
                        lng = c.getDeliveryLongitude();
                        addressText = c.getDeliveryAddress();
                    } else {
                        var addrs = c.getClient().getAddresses();
                        var addr = addrs != null && !addrs.isEmpty() ? addrs.get(0) : null;
                        lat = addr != null ? addr.getLatitude() : null;
                        lng = addr != null ? addr.getLongitude() : null;
                        addressText = addr != null ? addr.getAddress() : null;
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
                    map.put("clientPhone", c.getClient() != null
                            ? phoneByClientId.getOrDefault(c.getClient().getId(), "") : "");

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
