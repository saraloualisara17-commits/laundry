package com.wash.laundry_app.command;

import com.wash.laundry_app.command.attempts.CancelOrderRequest;
import com.wash.laundry_app.command.attempts.OrderAttemptDto;
import com.wash.laundry_app.command.attempts.OrderAttemptRequest;
import com.wash.laundry_app.command.attempts.OrderAttemptService;
import com.wash.laundry_app.command.services.*;
import com.wash.laundry_app.users.employe.CommandDetails;
import com.wash.laundry_app.users.lvreur.LivreurDashboardStatsDTO;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

/**
 * FACADE SERVICE
 * This service has been decomposed into smaller domain services to fix architectural coupling.
 * It is temporarily retained as a Facade to ensure 100% backward compatibility with
 * existing controllers (AdminController, EmployeController, LivreurController).
 * In Phase 2, these controllers will inject the specific domain services directly.
 */
@Service
@AllArgsConstructor
public class CommandeService {

    private final CommandeCreationService creationService;
    private final CommandeWorkflowService workflowService;
    private final CommandePaymentService paymentService;
    private final CommandeQueryService queryService;
    private final CommandeImageService imageService;
    private final OrderAttemptService orderAttemptService;

    // ═══════════════════════════════════════════════════════════════════════
    // CREATE
    // ═══════════════════════════════════════════════════════════════════════

    public CommandeDTO createCommande(CreateCommandeRequest request) {
        return creationService.createCommande(request);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STATUS WORKFLOW
    // ═══════════════════════════════════════════════════════════════════════

    public CommandeDTO updateStatus(Long commandeId, UpdateCommandeStatusRequest request) {
        return workflowService.updateStatus(commandeId, request);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PAYMENT
    // ═══════════════════════════════════════════════════════════════════════

    public CommandeDTO recordPayment(Long id, RecordPaymentRequest request) {
        return paymentService.recordPayment(id, request);
    }

    public PaiementDTO addPayment(Long id, BigDecimal amount, String note, ModePaiement modePaiement, String idempotencyKey) {
        return paymentService.addPayment(id, amount, note, modePaiement, idempotencyKey);
    }

    public List<PaiementDTO> getPayments(Long id) {
        return paymentService.getPayments(id);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // UPDATE / DELETE
    // ═══════════════════════════════════════════════════════════════════════

    public CommandeDTO updateCommande(Long id, UpdateCommandeRequest request) {
        return workflowService.updateCommande(id, request);
    }

    public CommandeDTO updateItemsByPickupDriver(Long id, java.util.List<CreateCommandeRequest.TapisItem> items) {
        return workflowService.updateItemsByPickupDriver(id, items);
    }

    public void deleteCommande(Long id) {
        workflowService.deleteCommande(id);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // READ
    // ═══════════════════════════════════════════════════════════════════════

    public List<CommandeDTO> getPendingPickupOrdersForPickupDriver() {
        return queryService.getPendingPickupOrdersForPickupDriver();
    }

    public List<CommandeDTO> getCancelledOrdersForPickupDriver() {
        return queryService.getCancelledOrdersForPickupDriver();
    }

    public List<CommandeDTO> getReadyForDeliveryByDeliveryDriver() {
        return queryService.getReadyForDeliveryByDeliveryDriver();
    }

    public List<CommandeDTO> getPastDeliveriesForDriver() {
        return queryService.getPastDeliveriesForDriver();
    }

    public long getReadyForDeliveryCountForDeliveryDriver() {
        return queryService.getReadyForDeliveryCountForDeliveryDriver();
    }

    public CommandDetails getCommandeById(Long id) {
        return queryService.getCommandeById(id);
    }

    public CommandeDTO getCommandeDtoById(Long id) {
        return queryService.getCommandeDtoById(id);
    }

    public List<CommandeDTO> getAllCommandes() {
        return queryService.getAllCommandes();
    }

    public List<CommandeDTO> getCommandesByLivreur(Long livreurId) {
        return queryService.getCommandesByLivreur(livreurId);
    }

    public List<CommandeDTO> getCommandesByStatus(CommandeStatus status) {
        return queryService.getCommandesByStatus(status);
    }

    public long getCountByStatus(CommandeStatus status) {
        return queryService.getCountByStatus(status);
    }

    public LivreurDashboardStatsDTO getLivreurDashboardStats() {
        return queryService.getLivreurDashboardStats();
    }

    public List<HistoriqueStatutDTO> getHistory(Long id) {
        return queryService.getHistory(id);
    }

    public List<PaymentTypeDTO> getPaymentTypes() {
        return queryService.getPaymentTypes();
    }

    public Commande getById(Long id) {
        return queryService.getById(id);
    }

    public void addOrderImages(Long id, List<String> imageUrls, String photoType) {
        imageService.addOrderImages(id, imageUrls, photoType);
    }

    public CommandeDTO returnToWorkplace(Long id) {
        return workflowService.returnToWorkplace(id);
    }

    public CommandeDTO annulerCommande(Long id) {
        return workflowService.annulerCommande(id);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ATTEMPTS / CANCELLATION WITH REASON
    // ═══════════════════════════════════════════════════════════════════════

    public OrderAttemptDto recordFailedAttempt(Long id, OrderAttemptRequest request) {
        return orderAttemptService.recordFailedAttempt(id, request);
    }

    public CommandeDTO cancelOrderWithReason(Long id, CancelOrderRequest request) {
        return orderAttemptService.cancelOrderWithReason(id, request);
    }

    public List<OrderAttemptDto> getAttemptsForOrder(Long id) {
        return orderAttemptService.getAttemptsForOrder(id);
    }
}
