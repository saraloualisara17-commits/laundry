package com.wash.laundry_app.auth;

import lombok.AllArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfigurationSource;

@Configuration
@EnableWebSecurity
@AllArgsConstructor
public class SecurityConfig {

    private final UserDetailsService userDetailsService;
    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final CorsConfigurationSource corsConfigurationSource;

    @Bean
    public PasswordEncoder passwordEncoder(){
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationProvider authenticationProvider(){
        var provider = new DaoAuthenticationProvider();
        provider.setPasswordEncoder(passwordEncoder());
        provider.setUserDetailsService(userDetailsService);
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config)throws Exception{
        return config.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception{
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource))
                .sessionManagement(c ->
                        c.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .csrf(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(c->c
                        // ── NEW DOMAIN-BASED ROUTES (PHASE 2 TARGET) ────────────────────────

                        // Orders Domain (/api/orders)
                        .requestMatchers(HttpMethod.POST, "/api/orders").hasAnyRole("ADMIN", "EMPLOYE")
                        .requestMatchers(HttpMethod.GET, "/api/orders").hasAnyRole("ADMIN", "EMPLOYE", "LIVREUR")
                        .requestMatchers(HttpMethod.GET, "/api/orders/{id}").hasAnyRole("ADMIN", "EMPLOYE", "LIVREUR")
                        .requestMatchers(HttpMethod.PATCH, "/api/orders/{id}/status").hasAnyRole("ADMIN", "EMPLOYE", "LIVREUR")
                        .requestMatchers(HttpMethod.PATCH, "/api/orders/{id}/delivery-driver").hasAnyRole("ADMIN", "EMPLOYE")
                        .requestMatchers(HttpMethod.PUT, "/api/orders/{id}").hasAnyRole("ADMIN", "EMPLOYE")
                        .requestMatchers(HttpMethod.DELETE, "/api/orders/{id}").hasRole("ADMIN")

                        // Payments Domain (/api/orders/{id}/payments)
                        .requestMatchers(HttpMethod.POST, "/api/orders/{id}/payments").hasAnyRole("ADMIN", "EMPLOYE", "LIVREUR")
                        .requestMatchers(HttpMethod.GET, "/api/orders/{id}/payments").hasAnyRole("ADMIN", "EMPLOYE", "LIVREUR")

                        // Clients Domain (/api/clients)
                        .requestMatchers(HttpMethod.POST, "/api/clients").hasAnyRole("ADMIN", "EMPLOYE", "LIVREUR")
                        .requestMatchers(HttpMethod.PUT, "/api/clients/{id}").hasAnyRole("ADMIN", "EMPLOYE")
                        .requestMatchers(HttpMethod.DELETE, "/api/clients/{id}").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/clients/**").hasAnyRole("ADMIN", "EMPLOYE", "LIVREUR")

                        // Users Domain (/api/users)
                        .requestMatchers(HttpMethod.POST, "/api/users").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/users/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PATCH, "/api/users/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/users/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/users/**").hasAnyRole("ADMIN", "EMPLOYE") // Employe lists livreurs

                        // Statistics Domain (/api/statistics)
                        .requestMatchers("/api/statistics/**").hasAnyRole("ADMIN", "EMPLOYE", "LIVREUR")

                        // Catalog Domain (/api/catalog)
                        .requestMatchers(HttpMethod.POST, "/api/catalog/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/catalog/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PATCH, "/api/catalog/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/catalog/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/catalog/**").hasAnyRole("ADMIN", "EMPLOYE", "LIVREUR")

                        // Images/Uploads — must be authenticated; public file serving is via /uploads/** (UUID filenames)
                        .requestMatchers("/api/images/**", "/api/upload/**").hasAnyRole("ADMIN", "EMPLOYE", "LIVREUR")


                        // ── LEGACY ROUTES (PRESERVED FOR BACKWARD COMPATIBILITY) ────────────

                        // Legacy Admin Routes
                        .requestMatchers(HttpMethod.GET, "/admin/commandes/{id}", "/api/admin/commandes/{id}").hasAnyRole("ADMIN", "EMPLOYE", "LIVREUR")
                        .requestMatchers(HttpMethod.PATCH, "/admin/commandes/{id}/status", "/api/admin/commandes/{id}/status").hasAnyRole("ADMIN", "EMPLOYE", "LIVREUR")
                        .requestMatchers(HttpMethod.DELETE, "/admin/commandes/{id}", "/api/admin/commandes/{id}").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/admin/client/{id}", "/api/admin/client/{id}").hasAnyRole("ADMIN", "EMPLOYE", "LIVREUR")
                        .requestMatchers(HttpMethod.GET, "/admin/clients/{id}", "/api/admin/clients/{id}").hasAnyRole("ADMIN", "EMPLOYE", "LIVREUR")
                        .requestMatchers("/api/admin/stats/**").hasAnyRole("ADMIN", "EMPLOYE", "LIVREUR")
                        .requestMatchers("/api/admin/unpaid/**").hasAnyRole("ADMIN", "EMPLOYE", "LIVREUR")

                        .requestMatchers(HttpMethod.GET, "/api/admin/catalog/**").hasAnyRole("ADMIN", "EMPLOYE", "LIVREUR")
                        .requestMatchers(HttpMethod.POST, "/api/admin/catalog/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/admin/catalog/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PATCH, "/api/admin/catalog/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/admin/catalog/**").hasRole("ADMIN")

                        .requestMatchers(HttpMethod.POST, "/admin/create-user").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/admin/update-user/**").hasRole("ADMIN")
                        .requestMatchers("/admin/active-users", "/api/admin/active-users").hasAnyRole("ADMIN", "EMPLOYE", "LIVREUR")
                        .requestMatchers("/admin/active-user/**", "/admin/inactive-user/**", "/admin/inactive-users", "/api/admin/inactive-users").hasRole("ADMIN")
                        .requestMatchers("/admin/change-user-password/**").hasRole("ADMIN")

                        .requestMatchers(HttpMethod.POST, "/admin/clients").hasAnyRole("ADMIN", "EMPLOYE")
                        .requestMatchers(HttpMethod.PUT, "/admin/clients/**").hasAnyRole("ADMIN", "EMPLOYE")
                        .requestMatchers(HttpMethod.DELETE, "/admin/clients/**").hasRole("ADMIN")

                        // Livreur needs the orders list and create order endpoints
                        .requestMatchers(HttpMethod.GET, "/admin/commandes", "/api/admin/commandes").hasAnyRole("ADMIN", "EMPLOYE", "LIVREUR")
                        .requestMatchers(HttpMethod.POST, "/admin/commandes", "/api/admin/commandes").hasAnyRole("ADMIN", "EMPLOYE", "LIVREUR")

                        // Livreur can assign pickup/delivery drivers and update order items
                        .requestMatchers(HttpMethod.PATCH, "/admin/commandes/{id}/pickup-driver", "/api/admin/commandes/{id}/pickup-driver").hasAnyRole("ADMIN", "EMPLOYE", "LIVREUR")
                        .requestMatchers(HttpMethod.PATCH, "/admin/commandes/{id}/delivery-driver", "/api/admin/commandes/{id}/delivery-driver").hasAnyRole("ADMIN", "EMPLOYE", "LIVREUR")
                        .requestMatchers(HttpMethod.PUT, "/admin/commandes/{id}", "/api/admin/commandes/{id}").hasAnyRole("ADMIN", "EMPLOYE", "LIVREUR")

                        .requestMatchers("/admin/**", "/api/admin/**").hasAnyRole("ADMIN", "EMPLOYE")

                        // Legacy Livreur Routes
                        .requestMatchers("/livreur/**", "/api/livreur/**").hasAnyRole("LIVREUR", "ADMIN")

                        // Legacy Employe Routes
                        .requestMatchers("/employe/**", "/api/employe/**").hasAnyRole("EMPLOYE", "ADMIN")

                        // Shared Legacy Routes
                        .requestMatchers(HttpMethod.POST, "/api/commandes/{id}/payments").hasAnyRole("ADMIN", "EMPLOYE", "LIVREUR")
                        .requestMatchers("/api/notifications/**").hasAnyRole("ADMIN", "EMPLOYE", "LIVREUR")
                        .requestMatchers("/api/commandes/{id}/receipt/**").hasAnyRole("ADMIN", "EMPLOYE", "LIVREUR")
                        .requestMatchers(HttpMethod.DELETE, "/api/commandes/**").hasRole("ADMIN")
                        .requestMatchers("/api/commandes/**").hasAnyRole("ADMIN", "EMPLOYE", "LIVREUR")

                        // ── PUBLIC ROUTES ───────────────────────────────────────────────────
                        .requestMatchers(HttpMethod.POST,"/auth/login").permitAll()
                        .requestMatchers(HttpMethod.POST,"/auth/logout").permitAll()
                        .requestMatchers(HttpMethod.POST,"/auth/refresh").permitAll()
                        .requestMatchers("/api/public/**").permitAll()
                        .requestMatchers("/uploads/**").permitAll()
                        .requestMatchers("/ws/**").permitAll()
                        .requestMatchers("/actuator/health").permitAll()
                        .requestMatchers("/public/**").permitAll()

                .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .exceptionHandling(c->
                {
                    c.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED));
                    c.accessDeniedHandler((request, response, accessDeniedException) ->
                            response.setStatus(HttpStatus.FORBIDDEN.value()));
                })
        ;
        return http.build();
    }
}
