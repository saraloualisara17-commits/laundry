package com.wash.laundry_app.users.admin;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class UpdateDeliveryDriverRequest {
    private Long deliveryDriverId;
    private LocalDateTime scheduledDeliveryDate;
}
