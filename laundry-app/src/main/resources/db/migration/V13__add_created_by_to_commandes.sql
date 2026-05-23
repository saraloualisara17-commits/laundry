-- V13: Add created_by column to commandes to track the actual creator separately from the assigned livreur

ALTER TABLE commandes ADD COLUMN created_by_id BIGINT;

-- Link to users table
ALTER TABLE commandes ADD CONSTRAINT fk_order_creator FOREIGN KEY (created_by_id) REFERENCES users(id);

-- Migration: Set existing created_by_id to the current livreur_id to maintain history
UPDATE commandes SET created_by_id = livreur_id WHERE created_by_id IS NULL;
