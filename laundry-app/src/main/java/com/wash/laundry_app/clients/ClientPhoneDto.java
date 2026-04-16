package com.wash.laundry_app.clients;

import com.wash.laundry_app.validation.ValidMoroccanPhone;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class ClientPhoneDto {
    private Long id;
    @ValidMoroccanPhone
    private String phoneNumber;
    private LocalDateTime createdAt;
}
