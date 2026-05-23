package com.wash.laundry_app.unpaid;

import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
public class UnpaidOverviewDto {
    private long totalOrders;
    private BigDecimal totalAmount;
    private BigDecimal totalPaid;
    private BigDecimal totalRemaining;
    private long clientsWithDebt;

    @Builder
    public UnpaidOverviewDto(long totalOrders, BigDecimal totalAmount, BigDecimal totalPaid, BigDecimal totalRemaining, long clientsWithDebt) {
        this.totalOrders = totalOrders;
        this.totalAmount = totalAmount;
        this.totalPaid = totalPaid;
        this.totalRemaining = totalRemaining;
        this.clientsWithDebt = clientsWithDebt;
    }
}
