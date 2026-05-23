package com.wash.laundry_app.users;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class RoleConverter implements AttributeConverter<Role, String> {

    @Override
    public String convertToDatabaseColumn(Role role) {
        if (role == null) {
            return null;
        }
        // Save to DB as lowercase to preserve legacy compatibility
        return role.name().toLowerCase();
    }

    @Override
    public Role convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.trim().isEmpty()) {
            return null;
        }
        // Normalize any DB value (lowercase or uppercase) into standard uppercase Role
        return Role.valueOf(dbData.toUpperCase());
    }
}
