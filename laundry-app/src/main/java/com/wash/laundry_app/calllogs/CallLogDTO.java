package com.wash.laundry_app.calllogs;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CallLogDTO {

    private Long id;
    private StaffInfo staff;
    private ClientInfo client;
    private Long orderId;
    private String orderStatus;
    private BigDecimal orderTotal;
    private String phoneNumber;
    private String callType;
    private LocalDateTime calledAt;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class StaffInfo {
        private Long id;
        private String name;
        private String role;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ClientInfo {
        private Long id;
        private String name;
    }
}
