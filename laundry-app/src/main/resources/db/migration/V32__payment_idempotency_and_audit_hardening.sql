-- V32: Payment idempotency key + audit log hardening + login events + branch prep
-- Each section is idempotent (uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS where supported,
-- otherwise guarded by the migration version system so it only runs once).

-- ─── 1. PAYMENT IDEMPOTENCY ──────────────────────────────────────────────────
-- Add idempotency_key to paiements. The client generates a UUID per payment
-- attempt and sends it as X-Idempotency-Key header. The server stores the key;
-- a UNIQUE constraint prevents duplicate inserts at the DB level.
-- NULL is allowed for legacy rows and for back-office direct payments where no
-- key was provided (old mobile clients, admin manual entries).
ALTER TABLE paiements
    ADD COLUMN idempotency_key VARCHAR(64) NULL COMMENT 'UUID sent by client to prevent duplicate payment submission',
    ADD UNIQUE INDEX uidx_paiement_idempotency (idempotency_key);

-- ─── 2. AUDIT LOG: add ip_address + user_agent + request_id ─────────────────
-- These fields were missing; required for enterprise security audits.
ALTER TABLE audit_logs
    ADD COLUMN ip_address VARCHAR(64) NULL COMMENT 'Client IP at time of action',
    ADD COLUMN user_agent VARCHAR(512) NULL COMMENT 'HTTP User-Agent header',
    ADD COLUMN request_id VARCHAR(64) NULL COMMENT 'X-Request-ID tracing header';

-- Index for querying by user (most common audit UI filter)
CREATE INDEX idx_audit_logs_user_id ON audit_logs (user_id);
-- Index for querying by entity (order detail → its audit trail)
CREATE INDEX idx_audit_logs_entity ON audit_logs (entity_type, entity_id);
-- Index for time-range queries (admin audit log screen)
CREATE INDEX idx_audit_logs_timestamp ON audit_logs (timestamp);

-- ─── 3. LOGIN AUDIT TABLE ────────────────────────────────────────────────────
-- Separate from audit_logs because login events have different cardinality,
-- different retention needs, and no entity_id concept.
CREATE TABLE login_events (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id     BIGINT NULL COMMENT 'NULL if login failed (unknown email)',
    email       VARCHAR(255) NOT NULL COMMENT 'Attempted email — captures unknown-user attempts',
    success     BOOLEAN NOT NULL,
    failure_reason VARCHAR(64) NULL COMMENT 'BAD_CREDENTIALS | ACCOUNT_DISABLED | ACCOUNT_LOCKED',
    ip_address  VARCHAR(64) NULL,
    user_agent  VARCHAR(512) NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_login_events_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
);

-- Index for brute-force detection queries (recent failures by IP)
CREATE INDEX idx_login_events_ip_success ON login_events (ip_address, success, created_at);
-- Index for user-level audit queries
CREATE INDEX idx_login_events_user ON login_events (user_id, created_at);
-- Cleanup: only keep 90 days of login events (enforce via scheduled job)
CREATE INDEX idx_login_events_created_at ON login_events (created_at);

-- ─── 4. OPERATIONAL ALERTS TABLE ─────────────────────────────────────────────
-- Tracks automated alerts raised by the business rule engine so they can be
-- dismissed, assigned, and tracked in the admin dashboard.
CREATE TABLE operational_alerts (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    alert_type  VARCHAR(64) NOT NULL COMMENT 'OVERDUE_PICKUP | DELAYED_DELIVERY | UNPAID_DEBT | DRIVER_OVERLOAD',
    commande_id BIGINT NULL COMMENT 'Related order (if applicable)',
    client_id   BIGINT NULL COMMENT 'Related client (if applicable)',
    user_id     BIGINT NULL COMMENT 'Related user/driver (if applicable)',
    severity    VARCHAR(16) NOT NULL DEFAULT 'WARNING' COMMENT 'INFO | WARNING | CRITICAL',
    message     TEXT NOT NULL,
    is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_by BIGINT NULL,
    resolved_at DATETIME NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_alerts_commande FOREIGN KEY (commande_id) REFERENCES commandes (id) ON DELETE SET NULL,
    CONSTRAINT fk_alerts_client FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE SET NULL,
    CONSTRAINT fk_alerts_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_alerts_resolver FOREIGN KEY (resolved_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX idx_alerts_type_resolved ON operational_alerts (alert_type, is_resolved);
CREATE INDEX idx_alerts_commande ON operational_alerts (commande_id);
CREATE INDEX idx_alerts_created ON operational_alerts (created_at);

-- ─── 5. BRANCH PREPARATION ────────────────────────────────────────────────────
-- Add branch concept without breaking existing data.
-- All existing rows get branch_id = NULL (interpreted as "default branch").
-- The application enforces NULL = single-branch mode; when multi-branch is
-- activated, all rows must have a non-NULL branch_id.
CREATE TABLE branches (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(128) NOT NULL,
    address     VARCHAR(512) NULL,
    phone       VARCHAR(32) NULL,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert the default single branch so existing data can be migrated later
INSERT INTO branches (id, name, address, is_active)
VALUES (1, 'Siège Principal', NULL, TRUE);

-- Add branch_id to the four core aggregates
ALTER TABLE commandes ADD COLUMN branch_id BIGINT NULL COMMENT 'NULL = single-branch mode',
    ADD CONSTRAINT fk_commandes_branch FOREIGN KEY (branch_id) REFERENCES branches (id);

ALTER TABLE clients ADD COLUMN branch_id BIGINT NULL,
    ADD CONSTRAINT fk_clients_branch FOREIGN KEY (branch_id) REFERENCES branches (id);

ALTER TABLE users ADD COLUMN branch_id BIGINT NULL COMMENT 'NULL = all branches / admin',
    ADD CONSTRAINT fk_users_branch FOREIGN KEY (branch_id) REFERENCES branches (id);

-- Index on commandes.branch_id for branch-filtered list queries
CREATE INDEX idx_commandes_branch ON commandes (branch_id);
CREATE INDEX idx_clients_branch ON clients (branch_id);
