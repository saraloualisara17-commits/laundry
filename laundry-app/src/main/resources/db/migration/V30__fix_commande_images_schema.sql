-- ─────────────────────────────────────────────────────────────────────────────
-- V30: Add columns that were created by Hibernate ddl-auto=update in dev but
--      were never scripted into a Flyway migration. Required for prod where
--      ddl-auto=validate is used.
--      Also converts MySQL ENUM columns to VARCHAR so Hibernate STRING mapping works.
-- ─────────────────────────────────────────────────────────────────────────────

-- users.role: convert ENUM('livreur','employe','admin') to VARCHAR(255)
-- so Hibernate's @Enumerated(STRING) mapping works correctly.
-- On a fresh DB there is no data, so no UPDATE needed.
ALTER TABLE users
    MODIFY COLUMN role VARCHAR(255) NOT NULL;

-- commande_images: soft-delete flag
ALTER TABLE commande_images
    ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT FALSE;

-- commande_images: convert photo_type from ENUM to VARCHAR so @Enumerated(STRING) works,
-- and add the 'livraison' value that was added in Java but never in the ENUM definition.
ALTER TABLE commande_images
    MODIFY COLUMN photo_type VARCHAR(30) DEFAULT 'reception';

-- users: push notification token
ALTER TABLE users
    ADD COLUMN expo_push_token VARCHAR(255) NULL;

-- commandes: free-text notes field
ALTER TABLE commandes
    ADD COLUMN notes VARCHAR(1000) NULL;

-- commandes: optimistic locking version column
ALTER TABLE commandes
    ADD COLUMN version BIGINT NULL;

-- paiements: payment method per transaction
ALTER TABLE paiements
    ADD COLUMN mode_paiement VARCHAR(20) NULL;

-- paiements: audit trail — who recorded the payment
ALTER TABLE paiements
    ADD COLUMN recorded_by_id BIGINT NULL,
    ADD CONSTRAINT fk_paiement_recorded_by
        FOREIGN KEY (recorded_by_id) REFERENCES users (id);

-- products.pricing_method: convert ENUM to VARCHAR so @Enumerated(STRING) works
ALTER TABLE products
    MODIFY COLUMN pricing_method VARCHAR(30) NOT NULL DEFAULT 'PER_UNIT';
