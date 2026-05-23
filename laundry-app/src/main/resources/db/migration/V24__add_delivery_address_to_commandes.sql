-- V24: Store the delivery address directly on the order (snapshot at creation time).
-- This prevents historical orders from changing address if the client updates their profile.

ALTER TABLE commandes
    ADD COLUMN delivery_address   TEXT          NULL,
    ADD COLUMN delivery_latitude  DECIMAL(10,8) NULL,
    ADD COLUMN delivery_longitude DECIMAL(11,8) NULL;
