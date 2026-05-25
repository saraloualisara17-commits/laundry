package com.wash.laundry_app.audit;

import com.wash.laundry_app.auth.AuthService;
import com.wash.laundry_app.users.User;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@AllArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepository;
    private final AuthService authService;

    /**
     * Runs in the CALLER'S transaction (Propagation.REQUIRED, the default).
     *
     * WHY NOT REQUIRES_NEW:
     * Astra Pro is an operational laundry business, not compliance software.
     * AuditLog records should reflect what actually happened, not what was attempted.
     * With REQUIRES_NEW, a rolled-back status change (e.g. optimistic lock conflict)
     * would still produce a permanent AuditLog entry claiming the transition occurred.
     * That is misleading and will cause support confusion. The HistoriqueStatut table
     * (written by CommandeHelperService.recordAudit) already provides domain history;
     * AuditLog provides the same information at a technical level. Both must only
     * persist for committed transitions.
     *
     * CONSEQUENCE: if the caller's transaction rolls back, this audit entry also
     * rolls back. This is the correct behavior for this system.
     */
    @Transactional
    public void log(String actionType, String entityType, Long entityId,
                    String previousValue, String newValue, String metadata) {
        User currentUser = authService.currentUser();

        AuditContext.AuditMeta ctx = AuditContext.get();

        AuditLog log = AuditLog.builder()
                .actionType(actionType)
                .entityType(entityType)
                .entityId(entityId)
                .previousValue(previousValue)
                .newValue(newValue)
                .metadata(metadata)
                .user(currentUser)
                .timestamp(LocalDateTime.now())
                .ipAddress(ctx != null ? ctx.ipAddress() : null)
                .userAgent(ctx != null ? ctx.userAgent() : null)
                .requestId(ctx != null ? ctx.requestId() : null)
                .build();

        auditLogRepository.save(log);
    }
}
