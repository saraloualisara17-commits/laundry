package com.wash.laundry_app.config;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class SettingsController {
    private final SystemSettingsService settingsService;

    @GetMapping("/public/settings")
    public ResponseEntity<SystemSettings> getPublicSettings() {
        return ResponseEntity.ok(settingsService.getSettings());
    }

    @PutMapping("/admin/settings")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SystemSettings> updateSettings(
            @RequestParam(required = false) String appName,
            @RequestParam(required = false) String businessPhone,
            @RequestParam(required = false) MultipartFile logo) {
        return ResponseEntity.ok(settingsService.updateSettings(appName, businessPhone, logo));
    }
}
