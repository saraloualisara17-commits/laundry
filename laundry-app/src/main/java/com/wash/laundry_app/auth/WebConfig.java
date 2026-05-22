package com.wash.laundry_app.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import com.wash.laundry_app.config.LegacyEndpointInterceptor;

import com.wash.laundry_app.config.RateLimitInterceptor;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${cors.allowed-origins:http://localhost:5173,http://localhost:3000}")
    private String allowedOrigins;

    private final LegacyEndpointInterceptor legacyEndpointInterceptor;
    private final RateLimitInterceptor rateLimitInterceptor;

    public WebConfig(LegacyEndpointInterceptor legacyEndpointInterceptor, RateLimitInterceptor rateLimitInterceptor) {
        this.legacyEndpointInterceptor = legacyEndpointInterceptor;
        this.rateLimitInterceptor = rateLimitInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(legacyEndpointInterceptor)
                .addPathPatterns("/admin/**", "/employe/**", "/livreur/**", "/api/admin/**", "/api/employe/**", "/api/livreur/**");
        
        registry.addInterceptor(rateLimitInterceptor)
                .addPathPatterns("/**");
    }

    // =====================
    // CORS CONFIG
    // =====================
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        // ── Explicit Origins ──────────────────────────────────────────────────
        // These are exact origins (no wildcards). Parsed from application.properties.
        // Example: http://localhost:5173,https://pureclean-backend-production.up.railway.app
        List<String> originPatterns = new ArrayList<>();

        if (allowedOrigins != null && !allowedOrigins.isBlank()) {
            originPatterns.addAll(Arrays.asList(allowedOrigins.split(",")));
        }

        // Use setAllowedOriginPatterns — supports wildcards + credentials together.
        config.setAllowedOriginPatterns(originPatterns);

        // ── Allowed Methods ───────────────────────────────────────────────────
        config.setAllowedMethods(Arrays.asList(
                "GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"
        ));

        // ── Allowed Headers ───────────────────────────────────────────────────
        // Wildcard "*" allows all request headers including Authorization,
        // Content-Type, X-Requested-With, Accept, etc.
        config.setAllowedHeaders(Arrays.asList("*"));

        // ── Exposed Headers ───────────────────────────────────────────────────
        // Headers the browser is allowed to read from the response.
        // Authorization allows the frontend to read JWT from response headers if needed.
        config.setExposedHeaders(Arrays.asList("Authorization", "Content-Disposition"));

        // ── Credentials ───────────────────────────────────────────────────────
        // Must be true for cookies (refresh token cookie) and
        // Authorization header to be sent cross-origin.
        config.setAllowCredentials(true);

        // ── Preflight Cache Duration ──────────────────────────────────────────
        // Cache preflight OPTIONS response for 1 hour to reduce overhead.
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    // =====================
    // RESOURCE HANDLERS
    // =====================
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String uploadPath = new java.io.File("uploads").getAbsolutePath();
        if (!uploadPath.endsWith(java.io.File.separator)) {
            uploadPath += java.io.File.separator;
        }
        
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:" + uploadPath);
    }
}