-- 1. Temporary convert status to VARCHAR to prevent truncation during mapping
ALTER TABLE commandes MODIFY COLUMN status VARCHAR(50);

-- 2. Map existing lowercase values to the new uppercase ENUM values
UPDATE commandes SET status = 'PENDING_PICKUP' WHERE status = 'en_attente';
UPDATE commandes SET status = 'PICKED_UP' WHERE status = 'validee';
UPDATE commandes SET status = 'IN_PROCESS' WHERE status = 'en_traitement';
UPDATE commandes SET status = 'READY_FOR_DELIVERY' WHERE status = 'prete';
UPDATE commandes SET status = 'DELIVERED' WHERE status IN ('livree', 'payee');
UPDATE commandes SET status = 'CANCELLED' WHERE status IN ('annulee', 'retournee');

-- Safeguard: ensure no nulls or unknown values before converting back to ENUM
UPDATE commandes SET status = 'PENDING_PICKUP' WHERE status NOT IN ('PENDING_PICKUP', 'PICKED_UP', 'IN_PROCESS', 'READY_FOR_DELIVERY', 'DELIVERED', 'CANCELLED') OR status IS NULL;

-- 3. Convert back to the new ENUM definition
ALTER TABLE commandes MODIFY COLUMN status ENUM('PENDING_PICKUP', 'PICKED_UP', 'IN_PROCESS', 'READY_FOR_DELIVERY', 'DELIVERED', 'CANCELLED') DEFAULT 'PENDING_PICKUP';

-- 4. Do the same for commande_tapis (etat column)
ALTER TABLE commande_tapis MODIFY COLUMN etat VARCHAR(50);

UPDATE commande_tapis SET etat = 'EN_ATTENTE' WHERE etat = 'en_attente';
UPDATE commande_tapis SET etat = 'EN_NETTOYAGE' WHERE etat = 'en_nettoyage';
UPDATE commande_tapis SET etat = 'NETTOYE' WHERE etat = 'nettoye';
UPDATE commande_tapis SET etat = 'LIVRE' WHERE etat = 'livre';

UPDATE commande_tapis SET etat = 'EN_ATTENTE' WHERE etat NOT IN ('EN_ATTENTE', 'EN_NETTOYAGE', 'NETTOYE', 'LIVRE') OR etat IS NULL;

ALTER TABLE commande_tapis MODIFY COLUMN etat ENUM('EN_ATTENTE', 'EN_NETTOYAGE', 'NETTOYE', 'LIVRE') DEFAULT 'EN_ATTENTE';

-- 5. Add new workflow columns (with IF NOT EXISTS logic handled manually via script safety)
-- We check for column existence before adding to avoid "Duplicate column" errors if the script is re-run
SET @dbname = DATABASE();
SET @tablename = 'commandes';

-- Add mode_commande
SET @columnname = 'mode_commande';
SET @preparedStatement = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname) > 0,
    'SELECT 1',
    CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' VARCHAR(20)')
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add delivery_type
SET @columnname = 'delivery_type';
SET @preparedStatement = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname) > 0,
    'SELECT 1',
    CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' VARCHAR(50)')
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add scheduled_pickup_date
SET @columnname = 'scheduled_pickup_date';
SET @preparedStatement = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname) > 0,
    'SELECT 1',
    CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' DATETIME')
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add pickup_driver_id
SET @columnname = 'pickup_driver_id';
SET @preparedStatement = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname) > 0,
    'SELECT 1',
    CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' BIGINT')
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add FK for pickup_driver if not exists (simplified check)
SET @preparedStatement = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = @dbname AND TABLE_NAME = @tablename AND CONSTRAINT_NAME = 'fk_pickup_driver') > 0,
    'SELECT 1',
    'ALTER TABLE commandes ADD CONSTRAINT fk_pickup_driver FOREIGN KEY (pickup_driver_id) REFERENCES users(id)'
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
