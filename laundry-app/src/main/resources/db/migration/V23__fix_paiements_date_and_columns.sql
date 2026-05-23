-- V23: Backfill NULL date_paiement on legacy payment rows, then enforce NOT NULL.
-- recorded_by_id and mode_paiement were already added by Hibernate (ddl-auto=update).

-- 1. Backfill: use the parent order's date_creation as the best approximation
UPDATE paiements p
JOIN   commandes c ON c.id = p.commande_id
SET    p.date_paiement = c.date_creation
WHERE  p.date_paiement IS NULL;

-- 2. Enforce NOT NULL now that every row has a value
ALTER TABLE paiements
    MODIFY COLUMN date_paiement DATETIME NOT NULL;
