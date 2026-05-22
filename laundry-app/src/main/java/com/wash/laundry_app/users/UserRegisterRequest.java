package com.wash.laundry_app.users;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import com.wash.laundry_app.validation.ValidMoroccanPhone;
import lombok.Data;

@Data
public class UserRegisterRequest {
    @NotBlank(message = "name is required")
    @Size(min = 3,max = 60,message = "name must be between 3 and 60 character")
    @jakarta.validation.constraints.Pattern(regexp = "^[a-zA-ZÀ-ÿ0-9\\s\\-'.]+$", message = "Name contains invalid characters")
    private String name;

    @NotBlank(message = "email is required")
    @Email(message = "enter a valid email")
    private String email;

    @NotBlank(message = "password is required ")
    @Size(min = 8, max = 128, message = "password must be between 8 and 128 characters")
    private String password;

    @ValidMoroccanPhone
    private String phone;

    private Role role;
}
