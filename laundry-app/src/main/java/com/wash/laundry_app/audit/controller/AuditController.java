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
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
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
    @Transactional(readOnly = true)
    public ResponseEntity<List<Map<String, Object>>> getOrderTimeline(@PathVariable Long orderId) {
        List<Map<String, Object>> timeline = new ArrayList<>();

        historiqueRepository.findByCommandeIdOrderByCreatedAtDesc(orderId).forEach(h -> {
            Map<String, Object> entry = new HashMap<>();
            entry.put("type", "STATUS_CHANGE");
            entry.put("timestamp", h.getCreatedAt() != null ? h.getCreatedAt().toString() : "");
            entry.put("actor", h.getUser() != null ? h.getUser().getName() : "Système");
            entry.put("description", (h.getAncienStatut() != null ? h.getAncienStatut() + " → " : "") + (h.getNouveauStatut() != null ? h.getNouveauStatut() : ""));
            entry.put("commentaire", h.getCommentaire() != null ? h.getCommentaire() : "");
            timeline.add(entry);
        });

        paiementRepository.findByCommandeIdOrderByDatePaiementDesc(orderId).forEach(p -> {
            Map<String, Object> entry = new HashMap<>();
            entry.put("type", "PAYMENT");
            entry.put("timestamp", p.getDatePaiement() != null ? p.getDatePaiement().toString() : "");
            entry.put("actor", p.getRecordedBy() != null ? p.getRecordedBy().getName() : "Système");
            entry.put("description", "Paiement: " + p.getMontant() + " MAD" + (p.getModePaiement() != null ? " (" + p.getModePaiement().name() + ")" : ""));
            entry.put("note", p.getNote() != null ? p.getNote() : "");
            timeline.add(entry);
        });

        attemptRepository.findByCommandeIdOrderByAttemptedAtDesc(orderId).forEach(a -> {
            Map<String, Object> entry = new HashMap<>();
            entry.put("type", "ATTEMPT_FAILED");
            entry.put("timestamp", a.getAttemptedAt() != null ? a.getAttemptedAt().toString() : "");
            entry.put("actor", a.getDriver() != null ? a.getDriver().getName() : "Inconnu");
            entry.put("description", (a.getAttemptType() != null ? a.getAttemptType().name() : "") + " — " + (a.getReason() != null ? a.getReason() : ""));
            entry.put("notes", a.getNotes() != null ? a.getNotes() : "");
            timeline.add(entry);
        });

        auditLogRepository.findByEntityTypeAndEntityIdOrderByTimestampDesc("COMMANDE", orderId).forEach(al -> {
            if ("ORDER_STATUS_CHANGED".equals(al.getActionType())) return;
            Map<String, Object> entry = new HashMap<>();
            entry.put("type", "AUDIT");
            entry.put("timestamp", al.getTimestamp() != null ? al.getTimestamp().toString() : "");
            entry.put("actor", al.getUser() != null ? al.getUser().getName() : "Système");
            entry.put("description", al.getActionType() != null ? al.getActionType() : "");
            entry.put("previousValue", al.getPreviousValue() != null ? al.getPreviousValue() : "");
            entry.put("newValue", al.getNewValue() != null ? al.getNewValue() : "");
            entry.put("metadata", al.getMetadata() != null ? al.getMetadata() : "");
            timeline.add(entry);
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
