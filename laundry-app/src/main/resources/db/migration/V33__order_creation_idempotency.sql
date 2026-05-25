-- V33: Order-level creation idempotency key
-- Prevents duplicate order creation when the mobile client retries after a
-- network drop (server committed, response was lost).
-- The client generates a UUID once per creation attempt and sends it as
-- creationIdempotencyKey in the request body. The server stores it here;
-- the UNIQUE constraint turns any duplicate INSERT into a DB constraint
-- violation, which the service layer maps to an idempotent 200 response.
-- NULL is allowed for orders created before this feature was introduced.

ALTER TABLE commandes
    ADD COLUMN creation_idempotency_key VARCHAR(64) NULL
        COMMENT 'UUID sent by client to prevent duplicate order creation on retry',
    ADD UNIQUE INDEX uidx_commandes_creation_idempotency (creation_idempotency_key);
