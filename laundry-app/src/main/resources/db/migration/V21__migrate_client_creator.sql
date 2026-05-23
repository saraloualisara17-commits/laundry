-- V21__migrate_client_creator.sql

-- 1. Add the new column (nullable first so we can populate it)
ALTER TABLE clients
ADD COLUMN created_by_id BIGINT NULL;

-- 2. Copy old data into the new column
UPDATE clients
SET created_by_id = created_by_livreur_id;

-- 3. Drop old column (no FK existed on it in the original schema)
ALTER TABLE clients
DROP COLUMN created_by_livreur_id;

-- 4. Make new column required
ALTER TABLE clients
MODIFY created_by_id BIGINT NOT NULL;

-- 5. Add new foreign key
ALTER TABLE clients
ADD CONSTRAINT fk_clients_created_by
FOREIGN KEY (created_by_id)
REFERENCES users(id);