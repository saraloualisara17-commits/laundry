-- Add image_url to product_categories if it doesn't exist
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'product_categories' AND column_name = 'image_url' AND table_schema = DATABASE());
SET @sql = IF(@col_exists = 0, 'ALTER TABLE product_categories ADD COLUMN image_url VARCHAR(255) AFTER icon', 'SELECT "Column image_url already exists in product_categories"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add image_url to products if it doesn't exist
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'image_url' AND table_schema = DATABASE());
SET @sql = IF(@col_exists = 0, 'ALTER TABLE products ADD COLUMN image_url VARCHAR(255) AFTER nom', 'SELECT "Column image_url already exists in products"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
