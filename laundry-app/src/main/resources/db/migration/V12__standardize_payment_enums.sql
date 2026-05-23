-- V12: Standardize ModePaiement to uppercase to match Java Enum constants

-- 1. Temporarily allow VARCHAR to prevent truncation during mapping
ALTER TABLE commandes MODIFY COLUMN mode_paiement VARCHAR(20);

-- 2. Update existing data to uppercase
UPDATE commandes SET mode_paiement = 'ESPECES' WHERE mode_paiement = 'especes';
UPDATE commandes SET mode_paiement = 'CARTE' WHERE mode_paiement = 'carte';
UPDATE commandes SET mode_paiement = 'CHEQUE' WHERE mode_paiement = 'cheque';
UPDATE commandes SET mode_paiement = 'VIREMENT' WHERE mode_paiement = 'virement';

-- 3. Update table definition to use uppercase ENUM values
ALTER TABLE commandes MODIFY COLUMN mode_paiement ENUM('ESPECES', 'CARTE', 'CHEQUE', 'VIREMENT');
