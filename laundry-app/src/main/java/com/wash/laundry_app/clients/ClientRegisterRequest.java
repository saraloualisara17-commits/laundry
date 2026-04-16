package com.wash.laundry_app.clients;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class ClientRegisterRequest {

    @NotBlank(message = "Le nom est obligatoire")
    @Size(max = 255, message = "Le nom ne doit pas dépasser 255 caractères")
    @jakarta.validation.constraints.Pattern(regexp = "^[a-zA-ZÀ-ÿ0-9\\s\\-'.]+$", message = "Name contains invalid characters")
    private String name;

    @jakarta.validation.constraints.Email(message = "Entrez un email valide")
    private String email;

    @Valid
    private List<ClientPhoneDto> phones;

    @Valid
    private List<ClientAddressDto> addresses;
}
