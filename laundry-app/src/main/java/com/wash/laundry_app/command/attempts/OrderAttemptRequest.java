package com.wash.laundry_app.command.attempts;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class OrderAttemptRequest {

    @NotNull(message = "attemptType is required")
    private AttemptType attemptType;

    @NotBlank(message = "reason is required")
    private String reason;

    private String notes;

    private LocalDateTime rescheduledTo;
}
