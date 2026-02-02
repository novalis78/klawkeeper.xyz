-- Add credential_id column for WebAuthn authentication
ALTER TABLE users 
ADD COLUMN credential_id VARCHAR(255) NULL AFTER auth_method,
ADD INDEX idx_credential_id (credential_id);

-- Update comments
ALTER TABLE users 
MODIFY COLUMN public_key TEXT COMMENT 'PGP public key or WebAuthn placeholder',
MODIFY COLUMN key_id VARCHAR(40) COMMENT 'PGP key ID or WebAuthn identifier',
MODIFY COLUMN fingerprint VARCHAR(50) COMMENT 'PGP fingerprint or WebAuthn credential type';