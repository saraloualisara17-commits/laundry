package com.wash.laundry_app.auth;

import com.wash.laundry_app.audit.AuditContext;
import com.wash.laundry_app.audit.LoginAuditService;
import com.wash.laundry_app.users.Role;
import com.wash.laundry_app.users.User;
import com.wash.laundry_app.users.UserMapper;
import com.wash.laundry_app.users.services.UserService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.ResponseCookie;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.time.Duration;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/auth")
public class AuthController {
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserService userService;
    private final UserMapper userMapper;
    private final JwtConfig jwtConfig;
    private final AuthService authService;
    private final RefreshTokenService refreshTokenService;
    private final PasswordEncoder passwordEncoder;
    private final LoginAuditService loginAuditService;

    @org.springframework.beans.factory.annotation.Value("${app.use-secure-cookies:true}")
    private boolean useSecureCookies;

    @PostMapping("/login")
    public ResponseEntity<JwtResponse> Login(@Valid @RequestBody LoginRequest request, HttpServletRequest req, HttpServletResponse response){

        AuditContext.AuditMeta ctx = AuditContext.get();
        String ip = ctx != null ? ctx.ipAddress() : req.getRemoteAddr();
        String userAgent = ctx != null ? ctx.userAgent() : req.getHeader("User-Agent");

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));
        } catch (org.springframework.security.authentication.BadCredentialsException |
                 org.springframework.security.core.userdetails.UsernameNotFoundException e) {
            loginAuditService.recordFailure(request.getEmail(), "BAD_CREDENTIALS", ip, userAgent);
            throw new org.springframework.security.authentication.BadCredentialsException("Invalid credentials");
        }

        var user = userService.getByEmail(request.getEmail());

        if (user.getIsActive() != null && !user.getIsActive()) {
            loginAuditService.recordFailure(request.getEmail(), "ACCOUNT_DISABLED", ip, userAgent);
            throw new org.springframework.security.authentication.DisabledException("Compte désactivé. Contactez votre administrateur.");
        }
        var accessTocken = jwtService.generateAccessToken(user);
        var refreshToken = jwtService.generateRefreshToken(user);
        boolean isProd = "prod".equals(System.getenv("SPRING_PROFILES_ACTIVE"));

        boolean isHttps = "https".equalsIgnoreCase(req.getHeader("X-Forwarded-Proto")) || useSecureCookies;

        ResponseCookie cookie = ResponseCookie
                .from("refreshToken", refreshToken.toString())
                .httpOnly(true)
                .secure(isHttps)
                .sameSite(isHttps ? "None" : "Lax")
                .path("/auth")
                .maxAge(Duration.ofDays(7))
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

        // HIGH-4: Save refresh token hash to DB
        RefreshToken rt = new RefreshToken();
        rt.setUser(user);
        rt.setTokenHash(jwtService.hashToken(refreshToken.toString()));
        rt.setExpiresAt(java.time.LocalDateTime.now().plusSeconds(jwtConfig.getRefreshTokenExpiration()));
        refreshTokenService.save(rt);

        loginAuditService.recordSuccess(user, ip, userAgent);

        return ResponseEntity.ok(new JwtResponse(accessTocken.toString(), refreshToken.toString()));
    }

    @PostMapping("/refresh")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<JwtResponse> refresh(
            @CookieValue(name = "refreshToken", required = false) String cookieRefreshToken,
            @RequestHeader(name = "X-Refresh-Token", required = false) String headerRefreshToken,
            HttpServletResponse response) {

        String incomingToken = cookieRefreshToken != null ? cookieRefreshToken : headerRefreshToken;
        if (incomingToken == null || incomingToken.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        var jwt = jwtService.parseToken(incomingToken);
        if (jwt == null || jwt.isExpired()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        // Verify token hasn't been revoked (must exist in DB)
        String incomingHash = jwtService.hashToken(incomingToken);
        var storedToken = refreshTokenService.findByTokenHash(incomingHash);
        if (storedToken.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        // Rotate: revoke the old token and issue a fresh one (prevents replay after token theft)
        refreshTokenService.deleteByTokenHash(incomingHash);

        var user = userService.getByIdEntity(jwt.getUserId());
        var newAccessToken  = jwtService.generateAccessToken(user);
        var newRefreshToken = jwtService.generateRefreshToken(user);

        RefreshToken rt = new RefreshToken();
        rt.setUser(user);
        rt.setTokenHash(jwtService.hashToken(newRefreshToken.toString()));
        rt.setExpiresAt(java.time.LocalDateTime.now().plusSeconds(jwtConfig.getRefreshTokenExpiration()));
        refreshTokenService.save(rt);

        // Rotate the HttpOnly cookie as well (if the original came via cookie)
        if (cookieRefreshToken != null) {
            boolean isHttps = useSecureCookies;
            ResponseCookie cookie = ResponseCookie
                    .from("refreshToken", newRefreshToken.toString())
                    .httpOnly(true)
                    .secure(isHttps)
                    .sameSite(isHttps ? "None" : "Lax")
                    .path("/auth")
                    .maxAge(java.time.Duration.ofDays(7))
                    .build();
            response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
        }

        return ResponseEntity.ok(new JwtResponse(newAccessToken.toString(), newRefreshToken.toString()));
    }

    @PostMapping("/logout")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<Void> logout(
            @CookieValue(name = "refreshToken", required = false) String cookieRefreshToken,
            @RequestHeader(name = "X-Refresh-Token", required = false) String headerRefreshToken,
            HttpServletRequest req, 
            HttpServletResponse response) {
        
        String refreshToken = cookieRefreshToken != null ? cookieRefreshToken : headerRefreshToken;
        if (refreshToken != null) {
            // HIGH-4: Revoke token in DB
            refreshTokenService.deleteByTokenHash(jwtService.hashToken(refreshToken));
        }

        boolean isProd = "prod".equals(System.getenv("SPRING_PROFILES_ACTIVE"));
        boolean isHttps = isProd
                || "https".equalsIgnoreCase(req.getHeader("X-Forwarded-Proto"))
                || useSecureCookies;

        ResponseCookie cookie = ResponseCookie
                .from("refreshToken", "")
                .httpOnly(true)
                .secure(isHttps)
                .sameSite(isHttps ? "None" : "Lax")
                .path("/auth")
                .maxAge(0)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

        return ResponseEntity.noContent().build();
    }

    @ExceptionHandler(org.springframework.security.authentication.BadCredentialsException.class)
    public ResponseEntity<Map<String, String>> handleBadCredentialException() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid credentials"));
    }
}
