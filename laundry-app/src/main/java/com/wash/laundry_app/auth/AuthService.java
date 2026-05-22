package com.wash.laundry_app.auth;

import com.wash.laundry_app.users.User;
import com.wash.laundry_app.users.UserNotFoundException;
import com.wash.laundry_app.users.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.AllArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Service
@AllArgsConstructor
public class AuthService {
    private final UserRepository userRepository;

    public User currentUser() {
        // HIGH-5: first try the request-scoped cache set by JwtAuthenticationFilter
        ServletRequestAttributes attrs =
                (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs != null) {
            User cached = (User) attrs.getRequest().getAttribute("_currentUser");
            if (cached != null) return cached;
        }
        
        // Fallback: fetch from DB (e.g. scheduled tasks, tests)
        var authenticated = SecurityContextHolder.getContext().getAuthentication();
        if (authenticated == null || !authenticated.isAuthenticated()) {
            return null;
        }
        
        Object principal = authenticated.getPrincipal();
        if (principal instanceof String) {
            // e.g. "anonymousUser"
            return null;
        }
        
        if (principal instanceof Long userId) {
            return userRepository.findById(userId)
                    .orElseThrow(() -> new UserNotFoundException("Utilisateur introuvable"));
        }
        
        return null;
    }
}
