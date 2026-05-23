-- V18: Make delivery_driver_id nullable to allow order creation before a delivery driver is assigned
ALTER TABLE commandes MODIFY COLUMN delivery_driver_id BIGINT NULL;
