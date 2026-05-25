package com.wash.laundry_app.audit;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class AuditLogDto {
    private Long id;
    private String actionType;
    private String entityType;
    private Long entityId;
    private String previousValue;
    private String newValue;
    private String metadata;
    private String userName;
    private LocalDateTime timestamp;
    private String ipAddress;
    private String requestId;
}
