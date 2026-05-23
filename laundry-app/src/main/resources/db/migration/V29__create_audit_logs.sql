CREATE TABLE audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    action_type VARCHAR(255) NOT NULL,
    entity_type VARCHAR(255) NOT NULL,
    entity_id BIGINT NULL,
    previous_value TEXT NULL,
    new_value TEXT NULL,
    metadata TEXT NULL,
    user_id BIGINT NULL,
    timestamp DATETIME NOT NULL,
    CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id) REFERENCES users (id)
);
`