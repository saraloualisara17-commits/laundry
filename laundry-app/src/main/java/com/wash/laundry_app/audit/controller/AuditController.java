package com.wash.laundry_app.audit.controller;

import com.wash.laundry_app.audit.AuditLog;
import com.wash.laundry_app.audit.AuditLogDto;
import com.wash.laundry_app.audit.AuditLogRepository;
import com.wash.laundry_app.command.HistoriqueStatutRepository;
import com.wash.laundry_app.command.PaiementRepository;
import com.wash.laundry_app.command.attempts.OrderAttemptRepository;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/audit")
@AllArgsConstructor
public class AuditController {

    private final AuditLogRepository auditLogRepository;
    private final HistoriqueStatutRepository historiqueRepository;
    private final PaiementRepository paiementRepository;
    private final OrderAttemptRepository attemptRepository;

    @GetMapping("/{entityType}/{entityId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<AuditLogDto>> getEntityAudit(
            @PathVariable String entityType,
            @PathVariable Long entityId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        Page<AuditLog> logs = auditLogRepository.findByEntityTypeAndEntityId(
                entityType.toUpperCase(), entityId, PageRequest.of(page, size));
        return ResponseEntity.ok(logs.map(AuditController::toDto));
    }

    @GetMapping("/recent")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<AuditLogDto>> getRecentAudit(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        Page<AuditLog> logs = auditLogRepository.findAllByOrderByTimestampDesc(
                PageRequest.of(page, size));
        return ResponseEntity.ok(logs.map(AuditController::toDto));
    }

    @GetMapping("/order/{orderId}/timeline")
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYE')")
    public ResponseEntity<List<Map<String, Object>>> getOrderTimeline(@PathVariable Long orderId) {
        List<Map<String, Object>> timeline = new ArrayList<>();

        historiqueRepository.findByCommandeIdOrderByCreatedAtDesc(orderId).forEach(h -> timeline.add(Map.of(
                "type", "STATUS_CHANGE",
                "timestamp", h.getCreatedAt() != null ? h.getCreatedAt().toString() : "",
                "actor", h.getUser() != null ? h.getUser().getName() : "Système",
                "description", (h.getAncienStatut() != null ? h.getAncienStatut() + " → " : "") + h.getNouveauStatut(),
                "commentaire", h.getCommentaire() != null ? h.getCommentaire() : ""
        )));

        paiementRepository.findByCommandeIdOrderByDatePaiementDesc(orderId).forEach(p -> timeline.add(Map.of(
                "type", "PAYMENT",
                "timestamp", p.getDatePaiement() != null ? p.getDatePaiement().toString() : "",
                "actor", p.getRecordedBy() != null ? p.getRecordedBy().getName() : "Système",
                "description", "Paiement: " + p.getMontant() + " MAD" + (p.getModePaiement() != null ? " (" + p.getModePaiement().name() + ")" : ""),
                "note", p.getNote() != null ? p.getNote() : ""
        )));

        attemptRepository.findByCommandeIdOrderByAttemptedAtDesc(orderId).forEach(a -> timeline.add(Map.of(
                "type", "ATTEMPT_FAILED",
                "timestamp", a.getAttemptedAt() != null ? a.getAttemptedAt().toString() : "",
                "actor", a.getDriver() != null ? a.getDriver().getName() : "Inconnu",
                "description", (a.getAttemptType() != null ? a.getAttemptType().name() : "") + " — " + a.getReason(),
                "notes", a.getNotes() != null ? a.getNotes() : ""
        )));

        auditLogRepository.findByEntityTypeAndEntityIdOrderByTimestampDesc("COMMANDE", orderId).forEach(al -> {
            if ("ORDER_STATUS_CHANGED".equals(al.getActionType())) return;
            timeline.add(Map.of(
                    "type", "AUDIT",
                    "timestamp", al.getTimestamp() != null ? al.getTimestamp().toString() : "",
                    "actor", al.getUser() != null ? al.getUser().getName() : "Système",
                    "description", al.getActionType(),
                    "previousValue", al.getPreviousValue() != null ? al.getPreviousValue() : "",
                    "newValue", al.getNewValue() != null ? al.getNewValue() : "",
                    "metadata", al.getMetadata() != null ? al.getMetadata() : ""
            ));
        });

        timeline.sort((a, b) -> {
            String ta = (String) a.get("timestamp");
            String tb = (String) b.get("timestamp");
            return tb.compareTo(ta);
        });

        return ResponseEntity.ok(timeline);
    }

    private static AuditLogDto toDto(AuditLog log) {
        return AuditLogDto.builder()
                .id(log.getId())
                .actionType(log.getActionType())
                .entityType(log.getEntityType())
                .entityId(log.getEntityId())
                .previousValue(log.getPreviousValue())
                .newValue(log.getNewValue())
                .metadata(log.getMetadata())
                .userName(log.getUser() != null ? log.getUser().getName() : null)
                .timestamp(log.getTimestamp())
                .ipAddress(log.getIpAddress())
                .requestId(log.getRequestId())
                .build();
    }
}
