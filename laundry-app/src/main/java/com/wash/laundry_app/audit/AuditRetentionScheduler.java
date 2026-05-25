package com.wash.laundry_app.audit;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
@Slf4j
public class AuditRetentionScheduler {

    private final AuditLogRepository auditLogRepository;

    @Value("${app.audit.retention-days:365}")
    private int retentionDays;

    /** Runs daily at 02:00 — purges audit_logs older than retention-days. */
    @Scheduled(cron = "0 0 2 * * *")
    @Transactional
    public void purgeOldAuditLogs() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(retentionDays);
        int deleted = auditLogRepository.deleteOlderThan(cutoff);
        if (deleted > 0) {
            log.info("Audit retention: purged {} records older than {} days (before {})",
                    deleted, retentionDays, cutoff.toLocalDate());
        }
    }
}
