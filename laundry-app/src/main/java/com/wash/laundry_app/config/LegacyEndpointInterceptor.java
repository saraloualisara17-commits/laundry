package com.wash.laundry_app.config;

import com.wash.laundry_app.users.User;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.time.LocalDateTime;

@Slf4j
@Component
public class LegacyEndpointInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String path = request.getRequestURI();
        
        // We only care about legacy routes
        if ((path.startsWith("/admin") || path.startsWith("/employe") || path.startsWith("/livreur")) &&
            !path.startsWith("/api/")) {
            
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String userId = "anonymous";
            String role = "none";
            
            if (auth != null && auth.getPrincipal() instanceof User) {
                User user = (User) auth.getPrincipal();
                userId = String.valueOf(user.getId());
                role = user.getRole() != null ? user.getRole().name() : "unknown";
            } else if (auth != null && auth.getName() != null) {
                userId = auth.getName();
                role = auth.getAuthorities().toString();
            }

            log.warn("LEGACY_ENDPOINT_ACCESSED | Path: {} | UserId: {} | Role: {} | Timestamp: {}", 
                     path, userId, role, LocalDateTime.now());
        }
        
        return true;
    }
}
