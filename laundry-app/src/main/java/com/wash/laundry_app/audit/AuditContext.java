package com.wash.laundry_app.audit;

/**
 * Thread-local holder for per-request audit metadata.
 *
 * Populated by AuditContextFilter on every HTTP request so that
 * AuditService.log() can attach IP, User-Agent, and request ID to every
 * audit record without each caller needing to pass these values explicitly.
 *
 * ThreadLocal is safe here: Spring Boot handles each HTTP request on a
 * dedicated thread (Tomcat thread pool), and AuditContextFilter clears the
 * holder in a finally block after the request completes.
 */
public final class AuditContext {

    private static final ThreadLocal<AuditMeta> HOLDER = new ThreadLocal<>();

    private AuditContext() {}

    public static void set(String ipAddress, String userAgent, String requestId) {
        HOLDER.set(new AuditMeta(ipAddress, userAgent, requestId));
    }

    public static AuditMeta get() {
        return HOLDER.get();
    }

    public static void clear() {
        HOLDER.remove();
    }

    public record AuditMeta(String ipAddress, String userAgent, String requestId) {}
}
