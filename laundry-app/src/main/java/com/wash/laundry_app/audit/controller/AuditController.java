package com.wash.laundry_app.audit.controller;

import com.wash.laundry_app.audit.AuditLog;
import com.wash.laundry_app.audit.AuditLogRepository;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/audit")
@AllArgsConstructor
public class AuditController {

    private final AuditLogRepository auditLogRepository;

    @GetMapping("/{entityType}/{entityId}")
    public ResponseEntity<List<AuditLog>> getLogs(
            @PathVariable String entityType,
            @PathVariable Long entityId) {
        return ResponseEntity.ok(auditLogRepository.findByEntityTypeAndEntityIdOrderByTimestampDesc(entityType, entityId));
    }

    @GetMapping("/recent")
    public ResponseEntity<List<AuditLog>> getRecentLogs(
            @RequestParam(defaultValue = "20") int limit) {
        PageRequest pageRequest = PageRequest.of(0, limit, Sort.by(Sort.Direction.DESC, "timestamp"));
        return ResponseEntity.ok(auditLogRepository.findAll(pageRequest).getContent());
    }
}
