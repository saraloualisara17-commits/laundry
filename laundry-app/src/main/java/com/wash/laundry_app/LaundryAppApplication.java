package com.wash.laundry_app;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class LaundryAppApplication {

	public static void main(String[] args) {
		String url = System.getenv("SPRING_DATASOURCE_URL");
		String user = System.getenv("SPRING_DATASOURCE_USERNAME");
		System.out.println("=== DB DIAGNOSTICS ===");
		System.out.println("SPRING_DATASOURCE_URL: " + (url != null ? url.replaceAll("://[^@]*@", "://***@") : "NOT SET"));
		System.out.println("SPRING_DATASOURCE_USERNAME: " + (user != null ? user : "NOT SET"));
		System.out.println("======================");
		SpringApplication.run(LaundryAppApplication.class, args);
	}

}
