-- Performance indexes: eliminates full-table scans on the most-queried columns.
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

-- commandes: status is filtered in almost every query
CALL add_index_if_missing('commandes', 'idx_commandes_status',
    'ALTER TABLE commandes ADD INDEX idx_commandes_status (status)');

-- commandes: date_creation used for ORDER BY, date-range filters, and statistics
CALL add_index_if_missing('commandes', 'idx_commandes_date_creation',
    'ALTER TABLE commandes ADD INDEX idx_commandes_date_creation (date_creation)');

-- commandes: scheduled dates used by overdue pickup/delivery alert queries
CALL add_index_if_missing('commandes', 'idx_commandes_scheduled_pickup',
    'ALTER TABLE commandes ADD INDEX idx_commandes_scheduled_pickup (scheduled_pickup_date)');

CALL add_index_if_missing('commandes', 'idx_commandes_scheduled_delivery',
    'ALTER TABLE commandes ADD INDEX idx_commandes_scheduled_delivery (scheduled_delivery_date)');

-- commandes: delivery_driver_id used in driver-scoped delivery queries
CALL add_index_if_missing('commandes', 'idx_commandes_delivery_driver',
    'ALTER TABLE commandes ADD INDEX idx_commandes_delivery_driver (delivery_driver_id)');

-- historique_statuts: composite used by StatisticsService date-range queries
CALL add_index_if_missing('historique_statuts', 'idx_historique_statut_date',
    'ALTER TABLE historique_statuts ADD INDEX idx_historique_statut_date (nouveau_statut, created_at)');

-- clients: created_at used by getClientStatistics() to count new clients per month
CALL add_index_if_missing('clients', 'idx_clients_created_at',
    'ALTER TABLE clients ADD INDEX idx_clients_created_at (created_at)');

DROP PROCEDURE IF EXISTS add_index_if_missing;
