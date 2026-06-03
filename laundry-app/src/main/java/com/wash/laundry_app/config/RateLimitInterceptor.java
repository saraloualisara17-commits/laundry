package com.wash.laundry_app.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Component
public class RateLimitInterceptor implements HandlerInterceptor {

    private final ConcurrentHashMap<String, RequestData> requestCounts = new ConcurrentHashMap<>();
    private static final int MAX_REQUESTS_PER_MINUTE = 100;
    private static final int AUTH_LOGIN_LIMIT       = 10;
    private static final int UPLOAD_LIMIT           = 20;
    // Public order submission is unauthenticated and writes to the DB — keep
    // it well below the generic limit. Real customers submit one order at a
    // time; 5/min/IP leaves room for retries on flaky connections.
    private static final int PUBLIC_ORDER_LIMIT     = 5;
    private static final long TIME_WINDOW_MS        = 60_000L;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String clientIp = getClientIP(request);
        String path = request.getRequestURI();
        String method = request.getMethod();

        int limit = MAX_REQUESTS_PER_MINUTE;
        if (path.startsWith("/auth/login"))  limit = AUTH_LOGIN_LIMIT;
        else if (path.startsWith("/api/upload")) limit = UPLOAD_LIMIT;
        else if ("POST".equals(method) && path.startsWith("/api/public/orders")) limit = PUBLIC_ORDER_LIMIT;

        RequestData requestData = requestCounts.compute(clientIp + ":" + path, (key, data) -> {
            long now = System.currentTimeMillis();
            if (data == null || (now - data.timestamp) > TIME_WINDOW_MS) {
                return new RequestData(now, new AtomicInteger(1));
            }
            data.count.incrementAndGet();
            return data;
        });

        if (requestData.count.get() > limit) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.getWriter().write("Too many requests.");
            return false;
        }

        return true;
    }

    /**
     * Evicts stale entries every 5 minutes to prevent unbounded memory growth.
     * Without this, the map grows forever as each unique IP+path combination
     * accumulates an entry that is never removed.
     */
    @Scheduled(fixedDelay = 300_000L)
    public void evictStaleEntries() {
        long now = System.currentTimeMillis();
        requestCounts.entrySet().removeIf(e -> (now - e.getValue().timestamp) > TIME_WINDOW_MS);
    }

    /**
     * Extracts the real client IP.
     *
     * WHY NOT X-Forwarded-For blindly:
     * XFF is trivially spoofed by clients — any request can include
     * "X-Forwarded-For: 1.2.3.4" to bypass IP-based rate limiting.
     * We only trust XFF when the app is explicitly configured to run
     * behind a trusted proxy (set TRUSTED_PROXY env var to proxy IP).
     * Without that config, we use the TCP-level remoteAddr which cannot
     * be spoofed.
     */
    private String getClientIP(HttpServletRequest request) {
        String trustedProxy = System.getenv("TRUSTED_PROXY_IP");
        if (trustedProxy != null && !trustedProxy.isBlank()) {
            String remoteAddr = request.getRemoteAddr();
            if (trustedProxy.equals(remoteAddr)) {
                String xff = request.getHeader("X-Forwarded-For");
                if (xff != null && !xff.isBlank()) {
                    return xff.split(",")[0].trim();
                }
            }
        }
        return request.getRemoteAddr();
    }

    private static class RequestData {
        long timestamp;
        AtomicInteger count;

        RequestData(long timestamp, AtomicInteger count) {
            this.timestamp = timestamp;
            this.count = count;
        }
    }
}
