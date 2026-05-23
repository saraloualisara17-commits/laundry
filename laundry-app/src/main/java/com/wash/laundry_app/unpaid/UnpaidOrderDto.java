package com.wash.laundry_app.unpaid;

import com.wash.laundry_app.command.CommandeTapisDTO;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
public class UnpaidOrderDto {
    private Long orderId;
    private String reference;
    private String status;
    private BigDecimal montantTotal;
    private BigDecimal montantPaye;
    private BigDecimal montantRestant;
    private LocalDateTime dateCreation;
    private int itemCount;
    private String livreurName;
    private List<CommandeTapisDTO> commandeTapis;

    @Builder
    public UnpaidOrderDto(Long orderId, String reference, String status, BigDecimal montantTotal, 
                          BigDecimal montantPaye, BigDecimal montantRestant, LocalDateTime dateCreation, 
                          int itemCount, String livreurName, List<CommandeTapisDTO> commandeTapis) {
        this.orderId = orderId;
        this.reference = reference;
        this.status = status;
        this.montantTotal = montantTotal;
        this.montantPaye = montantPaye;
        this.montantRestant = montantRestant;
        this.dateCreation = dateCreation;
        this.itemCount = itemCount;
        this.livreurName = livreurName;
        this.commandeTapis = commandeTapis;
    }
}
