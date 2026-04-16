package com.wash.laundry_app.users;

import lombok.Data;

@Data
public class UpdateUserRequest {
    @jakarta.validation.constraints.Pattern(regexp = "^[a-zA-ZÀ-ÿ0-9\\s\\-'.]*$", message = "Name contains invalid characters")
    @jakarta.validation.constraints.Size(min = 3, max = 60, message = "name must be between 3 and 60 character")
    private String name;

    @jakarta.validation.constraints.Email(message = "enter a valid email")
    private String email;

    @com.wash.laundry_app.validation.ValidMoroccanPhone
    private String phone;

    private Role role;
}
