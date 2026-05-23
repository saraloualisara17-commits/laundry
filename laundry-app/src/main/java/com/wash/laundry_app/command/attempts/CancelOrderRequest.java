package com.wash.laundry_app.command.attempts;

import lombok.Data;

@Data
public class CancelOrderRequest {
    private String reason;
    private String notes;
}
