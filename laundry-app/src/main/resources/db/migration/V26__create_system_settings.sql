CREATE TABLE system_settings (
    id BIGINT PRIMARY KEY,
    app_name VARCHAR(255) DEFAULT 'PureClean',
    logo_url VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO system_settings (id, app_name) VALUES (1, 'PureClean');
