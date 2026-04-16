package com.wash.laundry_app.clients;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class ClientAddressDto {
    private Long id;
    @jakarta.validation.constraints.NotBlank(message = "L'adresse est obligatoire")
    @jakarta.validation.constraints.Size(max = 500, message = "L'adresse ne doit pas dépasser 500 caractères")
    @jakarta.validation.constraints.Pattern(regexp = "^[a-zA-ZÀ-ÿ0-9\\s\\-.,'()]+$", message = "Adresse contient des caractères non valides")
    private String address;
    private BigDecimal latitude;
    private BigDecimal longitude;

    @jakarta.validation.constraints.Size(max = 1000, message = "Les notes ne doivent pas dépasser 1000 caractères")
    @jakarta.validation.constraints.Pattern(regexp = "^[a-zA-ZÀ-ÿ0-9\\s\\-.,'()!?+]*$", message = "Les notes contiennent des caractères non valides")
    private String notes;
    private LocalDateTime createdAt;
}
