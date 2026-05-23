package com.wash.laundry_app.unpaid;

import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
public class ClientDebtDto {
    private Long clientId;
    private String clientName;
    private String clientPhone;
    private long orderCount;
    private BigDecimal totalAmount;
    private BigDecimal totalPaid;
    private BigDecimal totalRemaining;
    private List<UnpaidOrderDto> orders;

    @Builder
    public ClientDebtDto(Long clientId, String clientName, String clientPhone, long orderCount, 
                         BigDecimal totalAmount, BigDecimal totalPaid, BigDecimal totalRemaining, 
                         List<UnpaidOrderDto> orders) {
        this.clientId = clientId;
        this.clientName = clientName;
        this.clientPhone = clientPhone;
        this.orderCount = orderCount;
        this.totalAmount = totalAmount;
        this.totalPaid = totalPaid;
        this.totalRemaining = totalRemaining;
        this.orders = orders;
    }
}
