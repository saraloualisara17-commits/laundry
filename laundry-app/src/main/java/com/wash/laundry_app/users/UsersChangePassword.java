package com.wash.laundry_app.users;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;

@Data

public class UsersChangePassword {
    @NotBlank(message = "password is required ")
    @Size(min = 8, max = 128, message = "password must be between 8 and 128 characters")
    private String password;

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}
