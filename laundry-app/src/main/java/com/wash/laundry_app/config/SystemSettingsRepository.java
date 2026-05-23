package com.wash.laundry_app.config;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SystemSettingsRepository extends JpaRepository<SystemSettings, Long> {
}
