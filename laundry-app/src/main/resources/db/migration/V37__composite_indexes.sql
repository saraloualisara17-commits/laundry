-- Composite indexes for common multi-column query patterns.
-- Uses stored procedures to guard against duplicate index creation on MySQL < 8.0.29
-- where ALTER TABLE ... ADD INDEX IF NOT EXISTS is not supported.

DROP PROCEDURE IF EXISTS add_index_if_missing;

DELIMITER //
CREATE PROCEDURE add_index_if_missing(
    IN tbl VARCHAR(64),
    IN idx VARCHAR(64),
    IN ddl TEXT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.STATISTICS
        WHERE table_schema = DATABASE()
          AND table_name   = tbl
          AND index_name   = idx
    ) THEN
        SET @sql = ddl;
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END //
DELIMITER ;

-- Driver analytics: findByLivreurIdAndDateCreationBetween
CALL add_index_if_missing('commandes', 'idx_commandes_livreur_date',
    'ALTER TABLE commandes ADD INDEX idx_commandes_livreur_date (pickup_driver_id, date_creation)');

-- Driver dashboard: findByDeliveryDriverIdAndStatus
CALL add_index_if_missing('commandes', 'idx_commandes_delivery_driver_status',
    'ALTER TABLE commandes ADD INDEX idx_commandes_delivery_driver_status (delivery_driver_id, status)');

-- Unpaid queries: filter delivered orders with outstanding balance
CALL add_index_if_missing('commandes', 'idx_commandes_status_montants',
    'ALTER TABLE commandes ADD INDEX idx_commandes_status_montants (status, montant_total, montant_paye)');

-- Alert scheduler: find overdue pickups by status + creation date
CALL add_index_if_missing('commandes', 'idx_commandes_status_date_creation',
    'ALTER TABLE commandes ADD INDEX idx_commandes_status_date_creation (status, date_creation)');

-- Notifications: per-user unread count and ordered list
CALL add_index_if_missing('notifications', 'idx_notifications_recipient_read',
    'ALTER TABLE notifications ADD INDEX idx_notifications_recipient_read (recipient_id, is_read)');

-- Open operational alerts lookup by type
CALL add_index_if_missing('operational_alerts', 'idx_alerts_type_resolved',
    'ALTER TABLE operational_alerts ADD INDEX idx_alerts_type_resolved (alert_type, resolved)');

DROP PROCEDURE IF EXISTS add_index_if_missing;
