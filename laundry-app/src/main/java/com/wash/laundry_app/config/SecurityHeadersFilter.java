package com.wash.laundry_app.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Adds hardening HTTP response headers to every response.
 * These are defense-in-depth headers that reduce attack surface for clients
 * consuming the API through a web browser (e.g., admin dashboard, Expo web).
 */
@Component
@Order(2)
public class SecurityHeadersFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {

        // Prevent MIME sniffing — browser must respect the declared Content-Type
        response.setHeader("X-Content-Type-Options", "nosniff");

        // Deny framing — blocks clickjacking via <iframe>
        response.setHeader("X-Frame-Options", "DENY");

        // Don't send Referer header to third-party origins (reduces info leakage)
        response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

        // Restrict browser features — minimal policy for a pure API
        response.setHeader("Permissions-Policy", "geolocation=(), camera=(), microphone=()");

        // Force HTTPS for 1 year once seen over a secure connection (HSTS).
        // Only effective when the app is served over HTTPS (reverse proxy / production).
        // Safe to set on HTTP too — browsers ignore HSTS on plain HTTP responses.
        response.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");

        // Content Security Policy: restrict resource origins for browser clients
        // (admin web dashboard, Expo web). Pure API clients ignore this header.
        response.setHeader("Content-Security-Policy",
                "default-src 'self'; " +
                "script-src 'self'; " +
                "style-src 'self' 'unsafe-inline'; " +
                "img-src 'self' data: blob:; " +
                "font-src 'self'; " +
                "connect-src 'self'; " +
                "frame-ancestors 'none'");

        chain.doFilter(request, response);
    }
}
