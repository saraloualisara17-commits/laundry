package com.wash.laundry_app.alerts;

import java.time.LocalDateTime;

public record OperationalAlertDTO(
        Long id,
        String alertType,
        String severity,
        String message,
        boolean resolved,
        LocalDateTime resolvedAt,
        String resolvedByName,
        LocalDateTime createdAt,
        Long commandeId,
        String commandeNumero,
        Long clientId,
        String clientName
) {}
