-- MySQL setup script for Laundry App production database
--
-- Run as root (once, on the database server):
--   mysql -u root -p < deploy/mysql-setup.sql
--
-- Replace the placeholder password before running.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Create the production database
CREATE DATABASE IF NOT EXISTS `laundry_prod`
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

-- 2. Create a dedicated application user (NOT root)
--    Replace 'CHANGE_ME_STRONG_PASSWORD' with the value in laundry.env
CREATE USER IF NOT EXISTS 'laundry_app'@'localhost'
    IDENTIFIED BY 'CHANGE_ME_STRONG_PASSWORD';

-- 3. Grant only the permissions the application actually needs.
--    No SUPER, no FILE, no GRANT OPTION.
GRANT SELECT, INSERT, UPDATE, DELETE,
      CREATE, ALTER, DROP, INDEX, REFERENCES
ON `laundry_prod`.*
TO 'laundry_app'@'localhost';

-- Flyway needs CREATE/ALTER/DROP for migration DDL.
-- If you want to restrict further after migrations stabilise, remove
-- CREATE, ALTER, DROP and run migrations with a separate migration user.

FLUSH PRIVILEGES;

-- 4. Verify (optional — run manually after setup):
-- SHOW GRANTS FOR 'laundry_app'@'localhost';
