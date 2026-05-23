package com.wash.laundry_app.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class MoroccanPhoneValidator implements ConstraintValidator<ValidMoroccanPhone, String> {

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null || value.isBlank()) {
            return true; // NotBlank should handle null/empty if needed
        }

        // 1. Ignore spaces and dashes
        String sanitized = value.replaceAll("[\\s-]", "");

        // 2. Local format: 0XXXXXXXXX (10 digits)
        if (sanitized.startsWith("0")) {
            if (sanitized.length() != 10) return false;
            char nextDigit = sanitized.charAt(1);
            return nextDigit == '5' || nextDigit == '6' || nextDigit == '7';
        }

        // 3. International format: +212XXXXXXXXX or 212XXXXXXXXX
        // If it starts with +, it should be +212... (13 chars if 9 digits follow)
        // If it starts with 212, it's 12 chars.
        if (sanitized.startsWith("+212")) {
            if (sanitized.length() != 13) return false;
            char nextDigit = sanitized.charAt(4);
            return nextDigit == '5' || nextDigit == '6' || nextDigit == '7';
        } else if (sanitized.startsWith("212")) {
            if (sanitized.length() != 12) return false;
            char nextDigit = sanitized.charAt(3);
            return nextDigit == '5' || nextDigit == '6' || nextDigit == '7';
        }

        return false;
    }
}
