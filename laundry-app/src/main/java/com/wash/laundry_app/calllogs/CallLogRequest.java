package com.wash.laundry_app.calllogs;

import lombok.Data;

@Data
public class CallLogRequest {
    private Long clientId;
    private Long orderId;
    private String phoneNumber;
    private String callType; // "PHONE" or "WHATSAPP"
}
