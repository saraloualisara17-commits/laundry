-- photo_type column is already VARCHAR(30), no DDL change needed.
-- New values added to Java PhotoType enum:
--   pending_pickup, picked_up, in_process, ready_for_delivery, delivered
-- Legacy values (reception, apres_traitement, livraison) remain valid for existing rows.
SELECT 1;
