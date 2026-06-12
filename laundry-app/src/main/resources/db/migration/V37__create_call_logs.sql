CREATE TABLE call_logs (
    id          BIGINT          NOT NULL AUTO_INCREMENT,
    staff_id    BIGINT          NOT NULL,
    client_id   BIGINT          NOT NULL,
    order_id    BIGINT          NULL,
    phone_number VARCHAR(20)    NOT NULL,
    call_type   VARCHAR(10)     NOT NULL COMMENT 'PHONE or WHATSAPP',
    called_at   DATETIME        NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_call_logs_staff  FOREIGN KEY (staff_id)  REFERENCES users(id),
    CONSTRAINT fk_call_logs_client FOREIGN KEY (client_id) REFERENCES clients(id),
    CONSTRAINT fk_call_logs_order  FOREIGN KEY (order_id)  REFERENCES commandes(id) ON DELETE SET NULL,
    INDEX idx_call_logs_staff     (staff_id),
    INDEX idx_call_logs_client    (client_id),
    INDEX idx_call_logs_called_at (called_at DESC)
);
