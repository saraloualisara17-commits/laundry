package com.wash.laundry_app.users;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum Role {

    LIVREUR,
    EMPLOYE,
    ADMIN;

    @JsonCreator
    public static Role fromString(String key) {
        if (key == null) return null;
        return Role.valueOf(key.toUpperCase());
    }

    @JsonValue
    public String toJson() {
        return name().toLowerCase(); // Optional: keeps JSON responses using legacy lowercase
    }
}
