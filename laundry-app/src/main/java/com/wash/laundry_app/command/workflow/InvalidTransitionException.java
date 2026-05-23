package com.wash.laundry_app.command.workflow;

/**
 * Thrown when a caller attempts an illegal workflow state transition.
 * Maps to HTTP 422 Unprocessable Entity via GlobalExceptionHandler.
 */
public class InvalidTransitionException extends RuntimeException {

    public InvalidTransitionException(String message) {
        super(message);
    }
}
