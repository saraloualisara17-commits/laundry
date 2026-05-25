package com.wash.laundry_app.audit;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/**
 * Runs once per request, before any controller logic.
 * Populates AuditContext with IP, User-Agent, and a request tracing ID.
 * Clears the ThreadLocal after the response is written to prevent leaks
 * across pooled threads.
 */
@Component
@Order(1)
public class AuditContextFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        try {
            String requestId = request.getHeader("X-Request-ID");
            if (requestId == null || requestId.isBlank()) {
                requestId = UUID.randomUUID().toString();
            }

            String ip = resolveClientIp(request);
            String userAgent = request.getHeader("User-Agent");

            AuditContext.set(ip, userAgent, requestId);

            // Echo the request ID back so clients can correlate logs
            response.setHeader("X-Request-ID", requestId);

            chain.doFilter(request, response);
        } finally {
            AuditContext.clear();
        }
    }

    private String resolveClientIp(HttpServletRequest request) {
        // Respect the same trusted-proxy logic used by RateLimitInterceptor:
        // only trust X-Forwarded-For when the request arrives from a known proxy.
        String trustedProxy = System.getenv("TRUSTED_PROXY_IP");
        if (trustedProxy != null && !trustedProxy.isBlank()) {
            String remoteAddr = request.getRemoteAddr();
            if (trustedProxy.equals(remoteAddr)) {
                String forwarded = request.getHeader("X-Forwarded-For");
                if (forwarded != null && !forwarded.isBlank()) {
                    return forwarded.split(",")[0].trim();
                }
            }
        }
        return request.getRemoteAddr();
    }
}
