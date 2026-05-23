package com.wash.laundry_app;

import com.wash.laundry_app.users.Role;
import com.wash.laundry_app.users.User;
import com.wash.laundry_app.users.UserRepository;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Seeds a first-run admin account ONLY when ALL three conditions are met:
 *   1. SEED_ADMIN_EMAIL env var is set
 *   2. SEED_ADMIN_PASSWORD env var is set
 *   3. No user with that email already exists
 *
 * This class must NOT be removed — it is the safe first-run mechanism.
 * The hardcoded credentials have been removed. In production, do not set
 * SEED_ADMIN_* vars after first run; the seeding is idempotent but the vars
 * should be cleared from your deployment environment once the account exists.
 */
@Component
@AllArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        String seedEmail    = System.getenv("SEED_ADMIN_EMAIL");
        String seedPassword = System.getenv("SEED_ADMIN_PASSWORD");
        String seedName     = System.getenv("SEED_ADMIN_NAME");

        if (seedEmail == null || seedEmail.isBlank() || seedPassword == null || seedPassword.isBlank()) {
            log.debug("DataInitializer: SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD not set — skipping seed.");
            return;
        }

        if (seedPassword.length() < 8) {
            log.warn("DataInitializer: SEED_ADMIN_PASSWORD is too short (min 8 chars) — seed skipped.");
            return;
        }

        if (!userRepository.existsByEmail(seedEmail)) {
            User admin = new User();
            admin.setName(seedName != null && !seedName.isBlank() ? seedName : "Admin");
            admin.setEmail(seedEmail);
            admin.setPassword(passwordEncoder.encode(seedPassword));
            admin.setRole(Role.ADMIN);
            admin.setIsActive(true);
            userRepository.save(admin);
            log.info("DataInitializer: admin account created for {}", seedEmail);
        } else {
            log.debug("DataInitializer: admin {} already exists, skipping seed.", seedEmail);
        }
    }
}
