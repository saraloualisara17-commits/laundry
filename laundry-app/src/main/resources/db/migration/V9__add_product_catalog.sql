CREATE TABLE product_categories (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  nom VARCHAR(100) NOT NULL,
  nom_ar VARCHAR(100),
  nom_fr VARCHAR(100),
  icon VARCHAR(50) DEFAULT 'package',
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  category_id BIGINT NOT NULL,
  nom VARCHAR(100) NOT NULL,
  description TEXT,
  pricing_method ENUM(
    'PER_M2',
    'PER_UNIT', 
    'PER_KG',
    'PER_LINEAR_M',
    'CUSTOM'
  ) NOT NULL DEFAULT 'PER_UNIT',
  prix_unitaire DECIMAL(10,2) NOT NULL,
  unite_label VARCHAR(20) DEFAULT 'pièce',
  processing_days INT DEFAULT 2,
  requires_dimensions BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) 
    REFERENCES product_categories(id)
);

INSERT INTO product_categories 
  (nom, icon, sort_order) VALUES
  ('Tapis', 'rug', 1),
  ('Couvertures', 'blanket', 2),
  ('Rideaux', 'curtain', 3),
  ('Serviettes', 'towel', 4),
  ('Vêtements', 'shirt', 5),
  ('Canapé', 'sofa', 6),
  ('Autre', 'package', 7);

INSERT INTO products 
  (category_id, nom, pricing_method, 
   prix_unitaire, requires_dimensions, sort_order)
SELECT 
  (SELECT id FROM product_categories WHERE nom = 'Tapis'),
  nom, 'PER_M2', prix_par_m2, TRUE, id
FROM carpet_type WHERE actif = TRUE;
