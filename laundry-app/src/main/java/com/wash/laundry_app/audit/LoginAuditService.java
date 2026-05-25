package com.wash.laundry_app.audit;

import com.wash.laundry_app.users.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class LoginAuditService {

    private static final int RETENTION_DAYS = 90;

    /**
     * Brute-force thresholds:
     *   - More than 10 failures from the same IP in 15 minutes → suspicious.
     *   - More than 5 failures for the same email in 15 minutes → targeted attack.
     * These are DETECTION thresholds only — the backend currently LOGS them but
     * does not auto-block (that would require a distributed cache for multi-instance).
     * An admin dashboard alert is raised instead (see OperationalAlertService).
     */
    private static final int IP_FAILURE_THRESHOLD = 10;
    private static final int EMAIL_FAILURE_THRESHOLD = 5;
    private static final int WINDOW_MINUTES = 15;

    private final LoginEventRepository loginEventRepository;

    /**
     * Uses REQUIRES_NEW so the event persists even if the calling transaction
     * (login) rolls back. This is intentional: a failed login IS a security event
     * and must be recorded regardless of what else is happening in the request.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordSuccess(User user, String ip, String userAgent) {
        LoginEvent event = LoginEvent.builder()
                .user(user)
                .email(user.getEmail())
                .success(true)
                .ipAddress(ip)
                .userAgent(userAgent)
                .build();
        loginEventRepository.save(event);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordFailure(String email, String reason, String ip, String userAgent) {
        LoginEvent event = LoginEvent.builder()
                .email(email)
                .success(false)
                .failureReason(reason)
                .ipAddress(ip)
                .userAgent(userAgent)
                .build();
        loginEventRepository.save(event);

        // Log suspicious patterns for ops monitoring
        if (ip != null) {
            LocalDateTime since = LocalDateTime.now().minusMinutes(WINDOW_MINUTES);
            long ipFailures = loginEventRepository.countRecentFailuresByIp(ip, since);
            if (ipFailures >= IP_FAILURE_THRESHOLD) {
                log.warn("[SECURITY] Brute-force suspected: {} failures from IP {} in last {} minutes",
                        ipFailures, ip, WINDOW_MINUTES);
            }
        }
        LocalDateTime since = LocalDateTime.now().minusMinutes(WINDOW_MINUTES);
        long emailFailures = loginEventRepository.countRecentFailuresByEmail(email, since);
        if (emailFailures >= EMAIL_FAILURE_THRESHOLD) {
            log.warn("[SECURITY] Credential stuffing suspected: {} failures for email {} in last {} minutes",
                    emailFailures, email, WINDOW_MINUTES);
        }
    }

    /** Purge events older than RETENTION_DAYS. Runs daily at 01:00. */
    @Scheduled(cron = "0 0 1 * * *")
    @Transactional
    public void purgeOldEvents() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(RETENTION_DAYS);
        int deleted = loginEventRepository.deleteOlderThan(cutoff);
        if (deleted > 0) {
            log.info("[LoginAudit] Purged {} login events older than {} days", deleted, RETENTION_DAYS);
        }
    }
}
