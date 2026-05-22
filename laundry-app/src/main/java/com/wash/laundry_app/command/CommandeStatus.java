package com.wash.laundry_app.command;


public enum CommandeStatus {
    PENDING_PICKUP,      // Scheduled but not yet collected
    PICKED_UP,           // Collected and brought to laundry
    IN_PROCESS,          // Currently being cleaned
    READY_FOR_DELIVERY,  // Finished, ready to be delivered back
    DELIVERED,           // Successfully delivered and finished
    PICKUP_FAILED,       // Driver attempted pickup but could not collect
    DELIVERY_FAILED,     // Driver attempted delivery but could not deliver
    CANCELLED            // Order was cancelled
}
