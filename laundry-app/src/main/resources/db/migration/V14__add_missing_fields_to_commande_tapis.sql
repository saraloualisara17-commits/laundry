ALTER TABLE commande_tapis
    ADD COLUMN longueur        DECIMAL(10, 2)  NULL COMMENT 'Longueur du tapis en mètres',
    ADD COLUMN poids           DECIMAL(10, 2)  NULL COMMENT 'Poids du tapis en kg',
    ADD COLUMN remise_montant  DECIMAL(10, 2)  DEFAULT 0 COMMENT 'Remise sur l item',
    ADD COLUMN tag_numero      VARCHAR(50)     NULL COMMENT 'Numéro de tag physique',
    ADD COLUMN notes           VARCHAR(1000)   NULL COMMENT 'Notes spécifiques à l item',
    ADD COLUMN couleur         VARCHAR(50)     NULL;
