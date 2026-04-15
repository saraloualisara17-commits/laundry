package com.wash.laundry_app;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;
@SpringBootApplication
@EnableScheduling
public class LaundryAppApplication {

	public static void main(String[] args) {
		SpringApplication.run(LaundryAppApplication.class, args);
	}

}
