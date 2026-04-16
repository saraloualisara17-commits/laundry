package com.wash.laundry_app.auth;

import com.wash.laundry_app.users.Role;
import com.wash.laundry_app.users.User;
import com.wash.laundry_app.users.UserMapper;
import com.wash.laundry_app.users.UserRepository;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
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
@AllArgsConstructor
@RequestMapping("/auth")
public class AuthController {
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserRepository userRepository;
    private UserMapper userMapper;
    private final JwtConfig jwtConfig;
    private final AuthService authService;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;

    @PostMapping("/login")
    public ResponseEntity<JwtResponse> Login(@Valid @RequestBody LoginRequest request , HttpServletResponse response){

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));
        } catch (org.springframework.security.authentication.BadCredentialsException |
                 org.springframework.security.core.userdetails.UsernameNotFoundException e) {
            throw new org.springframework.security.authentication.BadCredentialsException("Invalid credentials");
        }

        var user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new org.springframework.security.authentication.BadCredentialsException("Invalid credentials"));

        if (user.getIsActive() != null && !user.getIsActive()) {
            throw new org.springframework.security.authentication.DisabledException("Compte désactivé. Contactez votre administrateur.");
        }
        var accessTocken = jwtService.generateAccessToken(user);
        var refreshToken = jwtService.generateRefreshToken(user);
        boolean isProd = "prod".equals(System.getenv("SPRING_PROFILES_ACTIVE"));

        ResponseCookie cookie = ResponseCookie
                .from("refreshToken", refreshToken.toString())
                .httpOnly(true)
                .secure(isProd)
                .sameSite(isProd ? "None" : "Lax")
                .path("/auth")
                .maxAge(Duration.ofDays(7))
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

        // HIGH-4: Save refresh token hash to DB
        RefreshToken rt = new RefreshToken();
        rt.setUser(user);
        rt.setTokenHash(jwtService.hashToken(refreshToken.toString()));
        rt.setExpiresAt(java.time.LocalDateTime.now().plusSeconds(jwtConfig.getRefreshTokenExpiration()));
        refreshTokenRepository.save(rt);

        return ResponseEntity.ok(new JwtResponse(accessTocken.toString()));
    }

    @PostMapping("/refresh")
    public ResponseEntity<JwtResponse> refresh(@CookieValue(name = "refreshToken") String refreshToken) {
        var jwt = jwtService.parseToken(refreshToken);
        if (jwt == null || jwt.isExpired()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        // HIGH-4: Verify token hasn't been revoked (is in DB)
        String hash = jwtService.hashToken(refreshToken);
        var storedToken = refreshTokenRepository.findByTokenHash(hash);
        if (storedToken.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        var user = userRepository.findById(jwt.getUserId()).orElseThrow();
        var accessToken = jwtService.generateAccessToken(user);
        return ResponseEntity.ok(new JwtResponse(accessToken.toString()));
    }

    @PostMapping("/logout")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<Void> logout(@CookieValue(name = "refreshToken", required = false) String refreshToken, HttpServletResponse response) {
        if (refreshToken != null) {
            // HIGH-4: Revoke token in DB
            refreshTokenRepository.deleteByTokenHash(jwtService.hashToken(refreshToken));
        }

        boolean isProd = "prod".equals(System.getenv("SPRING_PROFILES_ACTIVE"));

        ResponseCookie cookie = ResponseCookie
                .from("refreshToken", "")
                .httpOnly(true)
                .secure(isProd)
                .sameSite(isProd ? "None" : "Lax")
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
