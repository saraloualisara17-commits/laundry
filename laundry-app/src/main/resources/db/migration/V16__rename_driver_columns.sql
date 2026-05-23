-- Rename columns to match the new driver roles
-- livreur_id (from V1) is renamed to delivery_driver_id
-- pickup_driver_id (from V11) is kept as is
ALTER TABLE commandes RENAME COLUMN livreur_id TO delivery_driver_id;
