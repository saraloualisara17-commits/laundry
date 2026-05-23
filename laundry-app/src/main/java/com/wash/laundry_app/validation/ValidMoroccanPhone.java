package com.wash.laundry_app.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.*;

@Target({ ElementType.FIELD, ElementType.PARAMETER })
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = MoroccanPhoneValidator.class)
@Documented
public @interface ValidMoroccanPhone {
    String message() default "Format de numéro de téléphone invalide (Ex: 0612345678 ou +212612345678)";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
