package com.wash.laundry_app.config;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class SystemSettingsService {
    private final SystemSettingsRepository repository;
    private final FileStorageService fileStorageService;

    public SystemSettings getSettings() {
        return repository.findById(1L)
                .orElseGet(() -> {
                    SystemSettings defaultSettings = SystemSettings.builder()
                            .id(1L)
                            .appName("ASTRA PROPRE")
                            .businessPhone("0600000000")
                            .updatedAt(LocalDateTime.now())
                            .build();
                    return repository.save(defaultSettings);
                });
    }

    @Transactional
    public SystemSettings updateSettings(String appName, String businessPhone, MultipartFile logo) {
        SystemSettings settings = getSettings();

        if (appName != null && !appName.isBlank()) {
            settings.setAppName(appName);
        }
        if (businessPhone != null && !businessPhone.isBlank()) {
            settings.setBusinessPhone(businessPhone);
        }
        if (logo != null && !logo.isEmpty()) {
            String fileName = fileStorageService.storeFile(logo);
            settings.setLogoUrl(fileName);
        }

        settings.setUpdatedAt(LocalDateTime.now());
        return repository.save(settings);
    }
}
