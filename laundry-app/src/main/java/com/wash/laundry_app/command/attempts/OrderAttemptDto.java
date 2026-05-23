package com.wash.laundry_app.command.attempts;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class OrderAttemptDto {
    private Long id;
    private AttemptType attemptType;
    private String reason;
    private String reasonLabel;
    private String reasonLabelAr;
    private String notes;
    private String driverName;
    private LocalDateTime attemptedAt;
    private LocalDateTime rescheduledTo;
}
