-- V19: Upgrade item_photos to support both order-level and item-level images
ALTER TABLE item_photos RENAME TO commande_images;

ALTER TABLE commande_images 
    MODIFY COLUMN commande_tapis_id BIGINT NULL,
    ADD COLUMN commande_id BIGINT NULL AFTER id;

ALTER TABLE commande_images
    ADD CONSTRAINT fk_images_commande
    FOREIGN KEY (commande_id) REFERENCES commandes(id) ON DELETE CASCADE;

-- If item_photos was created without a name for the FK, we might need to handle that, 
-- but V17 used 'fk_item_photos_commande_tapis'
