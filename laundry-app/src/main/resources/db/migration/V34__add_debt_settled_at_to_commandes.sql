ALTER TABLE commandes ADD COLUMN debt_settled_at DATETIME NULL;

-- Backfill: orders already fully paid get a settlement timestamp
-- We use date_livraison as the best available approximation since
-- the exact payment timestamp is not on the commande row itself.
UPDATE commandes
SET debt_settled_at = date_livraison
WHERE status = 'DELIVERED'
  AND montant_total > 0
  AND montant_paye >= montant_total
  AND date_livraison IS NOT NULL;
