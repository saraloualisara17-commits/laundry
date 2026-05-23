CREATE TABLE paiements (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    commande_id   BIGINT NOT NULL,
    montant       DECIMAL(10, 2) NOT NULL,
    date_paiement DATETIME NOT NULL,
    note          VARCHAR(255),
    CONSTRAINT fk_paiement_commande FOREIGN KEY (commande_id) REFERENCES commandes(id) ON DELETE CASCADE
);
