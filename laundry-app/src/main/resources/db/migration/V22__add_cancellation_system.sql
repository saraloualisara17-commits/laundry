-- V22: Add cancellation system with order-attempt tracking

-- 1. Extend commandes.status ENUM to include the two new failure states
ALTER TABLE commandes MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'PENDING_PICKUP';
ALTER TABLE commandes MODIFY COLUMN status
    ENUM('PENDING_PICKUP','PICKED_UP','IN_PROCESS','READY_FOR_DELIVERY',
         'DELIVERED','PICKUP_FAILED','DELIVERY_FAILED','CANCELLED')
    NOT NULL DEFAULT 'PENDING_PICKUP';

-- 2. Create order_attempts tracking table
CREATE TABLE order_attempts (
    id             BIGINT       AUTO_INCREMENT PRIMARY KEY,
    commande_id    BIGINT       NOT NULL,
    attempt_type   VARCHAR(20)  NOT NULL COMMENT 'PICKUP or DELIVERY',
    reason         VARCHAR(50)  NOT NULL,
    notes          TEXT,
    driver_id      BIGINT,
    attempted_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    rescheduled_to DATETIME,
    CONSTRAINT fk_attempt_commande FOREIGN KEY (commande_id) REFERENCES commandes(id) ON DELETE CASCADE,
    CONSTRAINT fk_attempt_driver   FOREIGN KEY (driver_id)   REFERENCES users(id)     ON DELETE SET NULL
);

CREATE INDEX idx_attempt_commande ON order_attempts(commande_id);
