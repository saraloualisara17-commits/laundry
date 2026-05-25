package com.wash.laundry_app.alerts;

import com.wash.laundry_app.users.services.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/alerts")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYE')")
public class OperationalAlertController {

    private final OperationalAlertRepository alertRepository;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<List<OperationalAlertDTO>> getOpenAlerts() {
        List<OperationalAlert> alerts = alertRepository.findAllOpenOrderedBySeverity();
        return ResponseEntity.ok(alerts.stream().map(this::toDto).toList());
    }

    @GetMapping("/counts")
    public ResponseEntity<Map<String, Long>> getAlertCounts() {
        long critical = alertRepository.countOpenBySeverity("CRITICAL");
        long warning  = alertRepository.countOpenBySeverity("WARNING");
        long info     = alertRepository.countOpenBySeverity("INFO");
        return ResponseEntity.ok(Map.of("CRITICAL", critical, "WARNING", warning, "INFO", info));
    }

    @PatchMapping("/{id}/resolve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<OperationalAlertDTO> resolveAlert(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails principal) {

        OperationalAlert alert = alertRepository.findById(id)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Alert not found: " + id));

        if (alert.isResolved()) {
            return ResponseEntity.ok(toDto(alert));
        }

        var resolver = userService.getByEmail(principal.getUsername());
        alert.setResolved(true);
        alert.setResolvedBy(resolver);
        alert.setResolvedAt(LocalDateTime.now());
        alertRepository.save(alert);

        return ResponseEntity.ok(toDto(alert));
    }

    private OperationalAlertDTO toDto(OperationalAlert a) {
        return new OperationalAlertDTO(
                a.getId(),
                a.getAlertType(),
                a.getSeverity(),
                a.getMessage(),
                a.isResolved(),
                a.getResolvedAt(),
                a.getResolvedBy() != null ? a.getResolvedBy().getName() : null,
                a.getCreatedAt(),
                a.getCommande() != null ? a.getCommande().getId() : null,
                a.getCommande() != null ? a.getCommande().getNumeroCommande() : null,
                a.getClient() != null ? a.getClient().getId() : null,
                a.getClient() != null ? a.getClient().getName() : null
        );
    }
}
