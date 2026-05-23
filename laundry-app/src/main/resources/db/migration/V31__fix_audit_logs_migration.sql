-- Remove failed V29 entry from Flyway history so it can re-run
DELETE FROM flyway_schema_history WHERE version = '29' AND success = 0;

-- Drop the table if it was partially created
DROP TABLE IF EXISTS audit_logs;

-- Re-create cleanly
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

-- Mark V29 as successfully applied so Flyway won't try to re-run it
UPDATE flyway_schema_history SET success = 1 WHERE version = '29';
