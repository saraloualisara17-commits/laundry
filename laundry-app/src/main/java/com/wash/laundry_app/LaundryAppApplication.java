package com.wash.laundry_app;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.util.ArrayList;
import java.util.List;

@SpringBootApplication
@EnableScheduling
@EnableAsync
@EnableCaching
public class LaundryAppApplication {

	public static void main(String[] args) {
		validateEnvironment();
		SpringApplication.run(LaundryAppApplication.class, args);
	}

	/**
	 * Fails fast before Spring context starts if required environment variables
	 * are missing. Only enforced when SPRING_PROFILES_ACTIVE=prod so dev/test
	 * runs with property-file defaults are not affected.
	 */
	private static void validateEnvironment() {
		String profile = System.getenv("SPRING_PROFILES_ACTIVE");
		if (!"prod".equals(profile)) return;

		record RequiredVar(String name, String redactedHint) {}

		List<RequiredVar> required = List.of(
			new RequiredVar("JWT_SECRET",                  "must be ≥32 random characters"),
			new RequiredVar("SPRING_DATASOURCE_URL",       "jdbc:mysql://host:3306/dbname"),
			new RequiredVar("SPRING_DATASOURCE_USERNAME",  "non-root DB user name"),
			new RequiredVar("SPRING_DATASOURCE_PASSWORD",  "DB password"),
			new RequiredVar("CORS_ALLOWED_ORIGINS",        "https://yourdomain.com")
		);

		List<String> missing = new ArrayList<>();
		List<String> warnings = new ArrayList<>();

		for (RequiredVar v : required) {
			String val = System.getenv(v.name());
			if (val == null || val.isBlank()) {
				missing.add("  MISSING  → " + v.name() + "  (" + v.redactedHint() + ")");
			}
		}

		// Warn about weak JWT secret (present but too short)
		String jwtSecret = System.getenv("JWT_SECRET");
		if (jwtSecret != null && !jwtSecret.isBlank() && jwtSecret.length() < 32) {
			warnings.add("  WARNING  → JWT_SECRET is only " + jwtSecret.length()
					+ " chars — minimum is 32 for HMAC-SHA256 security");
		}

		// Warn if default dev DB user slipped into prod
		String dbUser = System.getenv("SPRING_DATASOURCE_USERNAME");
		if ("root".equalsIgnoreCase(dbUser)) {
			warnings.add("  WARNING  → SPRING_DATASOURCE_USERNAME=root — use a dedicated DB user in production");
		}

		if (!warnings.isEmpty()) {
			System.err.println("\n╔══════════════════════════════════════════════════════╗");
			System.err.println("║         PRODUCTION CONFIGURATION WARNINGS            ║");
			System.err.println("╠══════════════════════════════════════════════════════╣");
			warnings.forEach(System.err::println);
			System.err.println("╚══════════════════════════════════════════════════════╝\n");
		}

		if (!missing.isEmpty()) {
			System.err.println("\n╔══════════════════════════════════════════════════════╗");
			System.err.println("║      FATAL: MISSING REQUIRED ENVIRONMENT VARIABLES   ║");
			System.err.println("╠══════════════════════════════════════════════════════╣");
			missing.forEach(System.err::println);
			System.err.println("╠══════════════════════════════════════════════════════╣");
			System.err.println("║  Set the variables above and restart the application ║");
			System.err.println("╚══════════════════════════════════════════════════════╝\n");
			System.exit(1);
		}
	}
}
