package com.wash.laundry_app.command.attempts;

import com.wash.laundry_app.audit.AuditService;
import com.wash.laundry_app.auth.AuthService;
import com.wash.laundry_app.command.Commande;
import com.wash.laundry_app.command.CommandeDTO;
import com.wash.laundry_app.command.CommandeMapper;
import com.wash.laundry_app.command.CommandeNotFoundException;
import com.wash.laundry_app.command.CommandeRepository;
import com.wash.laundry_app.command.CommandeStatus;
import com.wash.laundry_app.command.events.OrderSideEffectEvent;
import com.wash.laundry_app.command.workflow.CommandeWorkflowValidator;
import com.wash.laundry_app.users.User;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderAttemptService {

    private final CommandeRepository commandeRepository;
    private final OrderAttemptRepository attemptRepository;
    private final CommandeWorkflowValidator workflowValidator;
    private final CommandeMapper commandeMapper;
    private final AuthService authService;
    private final AuditService auditService;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public OrderAttemptDto recordFailedAttempt(Long commandeId, OrderAttemptRequest request) {
        User currentUser = authService.currentUser();
        Commande commande = commandeRepository.findById(commandeId)
                .orElseThrow(CommandeNotFoundException::new);

        CommandeStatus newStatus = request.getAttemptType() == AttemptType.PICKUP
                ? CommandeStatus.PICKUP_FAILED
                : CommandeStatus.DELIVERY_FAILED;

        String oldStatus = commande.getStatus().name();
        workflowValidator.validate(commande, newStatus, currentUser);
        commande.setStatus(newStatus);
        commandeRepository.save(commande);

        OrderAttempt attempt = new OrderAttempt();
        attempt.setCommande(commande);
        attempt.setAttemptType(request.getAttemptType());
        attempt.setReason(request.getReason());
        attempt.setNotes(request.getNotes());
        attempt.setDriver(currentUser);
        attempt.setAttemptedAt(LocalDateTime.now());
        attempt.setRescheduledTo(request.getRescheduledTo());
        attempt = attemptRepository.save(attempt);

        auditService.log("ORDER_ATTEMPT_FAILED", "COMMANDE", commandeId,
                oldStatus, newStatus.name(), request.getReason());
        eventPublisher.publishEvent(OrderSideEffectEvent.statusChanged(commandeId, newStatus));

        return toDto(attempt);
    }

    @Transactional
    public CommandeDTO cancelOrderWithReason(Long commandeId, CancelOrderRequest request) {
        User currentUser = authService.currentUser();
        Commande commande = commandeRepository.findWithClientDetailsById(commandeId)
                .orElseThrow(CommandeNotFoundException::new);

        String oldStatus = commande.getStatus().name();
        workflowValidator.validate(commande, CommandeStatus.CANCELLED, currentUser);
        commande.setStatus(CommandeStatus.CANCELLED);
        commande = commandeRepository.save(commande);

        if (request != null && request.getReason() != null && !request.getReason().isBlank()) {
            AttemptType type = oldStatus.equals("READY_FOR_DELIVERY") || oldStatus.equals("DELIVERY_FAILED")
                    ? AttemptType.DELIVERY : AttemptType.PICKUP;
            OrderAttempt attempt = new OrderAttempt();
            attempt.setCommande(commande);
            attempt.setAttemptType(type);
            attempt.setReason(request.getReason());
            attempt.setNotes(request.getNotes());
            attempt.setDriver(currentUser);
            attempt.setAttemptedAt(LocalDateTime.now());
            attemptRepository.save(attempt);
        }

        String cancelReason = request != null ? request.getReason() : null;
        auditService.log("ORDER_CANCELLED", "COMMANDE", commandeId,
                oldStatus, "CANCELLED", cancelReason);
        eventPublisher.publishEvent(OrderSideEffectEvent.statusChanged(commandeId, CommandeStatus.CANCELLED));

        return commandeMapper.toDto(commande);
    }

    @Transactional(readOnly = true)
    public List<OrderAttemptDto> getAttemptsForOrder(Long commandeId) {
        return attemptRepository.findByCommandeIdOrderByAttemptedAtDesc(commandeId)
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    private OrderAttemptDto toDto(OrderAttempt a) {
        OrderAttemptDto dto = new OrderAttemptDto();
        dto.setId(a.getId());
        dto.setAttemptType(a.getAttemptType());
        dto.setReason(a.getReason());
        dto.setReasonLabel(OrderAttempt.getReasonLabel(a.getReason(), "FR"));
        dto.setReasonLabelAr(OrderAttempt.getReasonLabel(a.getReason(), "AR"));
        dto.setNotes(a.getNotes());
        dto.setDriverName(a.getDriver() != null ? a.getDriver().getName() : null);
        dto.setAttemptedAt(a.getAttemptedAt());
        dto.setRescheduledTo(a.getRescheduledTo());
        return dto;
    }
}
