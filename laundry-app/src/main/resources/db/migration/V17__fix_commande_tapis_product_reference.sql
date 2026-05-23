-- Step 0 — Clean old data (since schema changed significantly and data preservation not required)
-- We do this first to allow adding NOT NULL columns later
DELETE FROM commande_tapis;

-- Step 1 — Remove old foreign key and column from commande_tapis
SET @fk_name = (
  SELECT CONSTRAINT_NAME
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_NAME = 'commande_tapis'
  AND COLUMN_NAME = 'tapis_id'
  AND TABLE_SCHEMA = DATABASE()
  LIMIT 1
);

SET @drop_fk_sql = IF(@fk_name IS NOT NULL,
  CONCAT('ALTER TABLE commande_tapis DROP FOREIGN KEY ', @fk_name),
  'SELECT "No FK to drop"'
);
PREPARE stmt FROM @drop_fk_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Drop the old tapis_id column
ALTER TABLE commande_tapis DROP COLUMN tapis_id;

-- Step 2 — Add product_id column
ALTER TABLE commande_tapis 
  ADD COLUMN product_id BIGINT NOT NULL 
  AFTER commande_id;

ALTER TABLE commande_tapis
  ADD CONSTRAINT fk_commande_tapis_product
  FOREIGN KEY (product_id) REFERENCES products(id);

-- Step 3 — Remove etat column (per-item status is no longer used)
ALTER TABLE commande_tapis DROP COLUMN etat;

-- Step 4 — Add supporting columns if missing
SET @dbname = DATABASE();
SET @tablename = 'commande_tapis';

-- Add remise_raison if not exists
SET @columnname = 'remise_raison';
SET @preparedStatement = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname) > 0,
    'SELECT 1',
    CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' VARCHAR(255) NULL')
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Ensure notes is TEXT (it was VARCHAR(1000) in V14)
ALTER TABLE commande_tapis MODIFY COLUMN notes TEXT NULL;

-- Step 5 — Drop old tables safely
DROP TABLE IF EXISTS tapis_images;
DROP TABLE IF EXISTS tapis;
DROP TABLE IF EXISTS carpet_type;

-- Step 6 — Create item_photos table for generic photo management
CREATE TABLE IF NOT EXISTS item_photos (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  commande_tapis_id BIGINT NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  photo_type ENUM('reception', 'apres_traitement')
    DEFAULT 'reception',
  is_main BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_item_photos_commande_tapis
  FOREIGN KEY (commande_tapis_id)
    REFERENCES commande_tapis(id) ON DELETE CASCADE
);
