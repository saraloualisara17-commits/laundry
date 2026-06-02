-- Performance and composite indexes.
-- Uses CREATE INDEX IF NOT EXISTS (valid MySQL 8.0+ / MySQL 9.x syntax).
-- Replaces the failed V36/V37 migrations.

CREATE INDEX IF NOT EXISTS idx_commandes_status
    ON commandes (status);

CREATE INDEX IF NOT EXISTS idx_commandes_date_creation
    ON commandes (date_creation);

CREATE INDEX IF NOT EXISTS idx_commandes_scheduled_pickup
    ON commandes (scheduled_pickup_date);

CREATE INDEX IF NOT EXISTS idx_commandes_scheduled_delivery
    ON commandes (scheduled_delivery_date);

CREATE INDEX IF NOT EXISTS idx_commandes_delivery_driver
    ON commandes (delivery_driver_id);

CREATE INDEX IF NOT EXISTS idx_historique_statut_date
    ON historique_statuts (nouveau_statut, created_at);

CREATE INDEX IF NOT EXISTS idx_clients_created_at
    ON clients (created_at);

CREATE INDEX IF NOT EXISTS idx_commandes_livreur_date
    ON commandes (pickup_driver_id, date_creation);

CREATE INDEX IF NOT EXISTS idx_commandes_delivery_driver_status
    ON commandes (delivery_driver_id, status);

CREATE INDEX IF NOT EXISTS idx_commandes_status_montants
    ON commandes (status, montant_total, montant_paye);

CREATE INDEX IF NOT EXISTS idx_commandes_status_date_creation
    ON commandes (status, date_creation);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_read
    ON notifications (recipient_id, is_read);
