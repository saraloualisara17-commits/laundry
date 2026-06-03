package com.wash.laundry_app.public_order;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Thrown by PublicOrderService when a single phone number submits more public
 * orders than the configured hourly cap. Maps to HTTP 429 so the frontend can
 * surface a "please wait" message instead of a generic error.
 */
@ResponseStatus(HttpStatus.TOO_MANY_REQUESTS)
public class TooManyPublicOrdersException extends RuntimeException {
    public TooManyPublicOrdersException(String message) {
        super(message);
    }
}
