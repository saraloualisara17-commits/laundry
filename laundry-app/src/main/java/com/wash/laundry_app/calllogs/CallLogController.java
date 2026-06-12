package com.wash.laundry_app.calllogs;

import com.wash.laundry_app.auth.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class CallLogController {

    private final CallLogService callLogService;
    private final AuthService authService;

    // Any authenticated staff can log a call
    @PostMapping("/api/call-logs")
    public ResponseEntity<CallLogDTO> logCall(@RequestBody CallLogRequest request) {
        CallLogDTO dto = callLogService.logCall(
                authService.currentUser(),
                request.getClientId(),
                request.getOrderId(),
                request.getPhoneNumber(),
                request.getCallType()
        );
        return ResponseEntity.ok(dto);
    }

    // Admin sees all logs (paginated)
    @GetMapping("/api/admin/call-logs")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<CallLogDTO>> getAllLogs(
            @RequestParam(defaultValue = "0") int page) {
        return ResponseEntity.ok(callLogService.getAllLogs(page));
    }

    // Any role can see logs for a specific client
    @GetMapping("/api/call-logs/client/{clientId}")
    public ResponseEntity<Page<CallLogDTO>> getClientLogs(
            @PathVariable Long clientId,
            @RequestParam(defaultValue = "0") int page) {
        return ResponseEntity.ok(callLogService.getLogsByClient(clientId, page));
    }
}
