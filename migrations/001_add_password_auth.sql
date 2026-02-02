-- Migration: Add password-based authentication support for humans
-- This allows KeyKeeper to support both:
-- 1. AI Agents (using API keys)
-- 2. Humans (using email/password + 2FA)

-- Add new columns to users table
ALTER TABLE users
  ADD COLUMN password_hash VARCHAR(255) NULL COMMENT 'Bcrypt hash for password-based auth',
  ADD COLUMN totp_secret VARCHAR(255) NULL COMMENT '2FA TOTP secret',
  ADD COLUMN totp_enabled BOOLEAN DEFAULT FALSE COMMENT 'Whether 2FA is enabled',
  ADD COLUMN account_type ENUM('human', 'agent') DEFAULT 'human' COMMENT 'Account type: human or AI agent',
  ADD COLUMN api_key VARCHAR(64) NULL COMMENT 'API key for agent access',
  ADD COLUMN credits DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Credit balance for pay-per-use',
  ADD INDEX idx_api_key (api_key);

-- Make PGP fields nullable for human accounts
ALTER TABLE users
  MODIFY COLUMN public_key TEXT NULL,
  MODIFY COLUMN key_id VARCHAR(40) NULL,
  MODIFY COLUMN fingerprint VARCHAR(50) NULL,
  MODIFY COLUMN auth_method ENUM('browser', 'password_manager', 'hardware_key', 'password', 'api_key') NULL;

-- Drop the unique constraint on fingerprint (since it can be NULL now)
ALTER TABLE users DROP INDEX idx_fingerprint;

-- Add new index that allows NULLs
ALTER TABLE users ADD INDEX idx_fingerprint (fingerprint);

-- Add constraint to ensure either password OR pgp key is present
-- Note: This is a logical constraint that should be enforced in application code
-- MySQL doesn't support complex CHECK constraints well in all versions

-- Create table for crypto payments tracking
CREATE TABLE IF NOT EXISTS crypto_payments (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NULL COMMENT 'User who made the payment (NULL if not yet claimed)',
  payment_address VARCHAR(255) NOT NULL COMMENT 'BTC address where payment was sent',
  amount_btc DECIMAL(16,8) NOT NULL COMMENT 'Amount in BTC',
  amount_usd DECIMAL(10,2) NULL COMMENT 'USD value at time of payment',
  credits_purchased DECIMAL(10,2) NOT NULL COMMENT 'Number of email credits purchased',
  transaction_id VARCHAR(255) NULL COMMENT 'Bitcoin transaction ID',
  status ENUM('pending', 'confirmed', 'claimed', 'failed', 'refunded') DEFAULT 'pending',
  confirmations INT DEFAULT 0 COMMENT 'Number of blockchain confirmations',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  confirmed_at TIMESTAMP NULL,
  claimed_at TIMESTAMP NULL COMMENT 'When the user claimed these credits',
  metadata JSON NULL COMMENT 'Additional payment metadata',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_payment_address (payment_address),
  INDEX idx_transaction_id (transaction_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Tracks crypto payments for credit purchases';

-- Create table for credit transactions (usage history)
CREATE TABLE IF NOT EXISTS credit_transactions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  transaction_type ENUM('purchase', 'email_sent', 'email_received', 'refund', 'adjustment') NOT NULL,
  amount DECIMAL(10,2) NOT NULL COMMENT 'Positive for additions, negative for deductions',
  balance_after DECIMAL(10,2) NOT NULL COMMENT 'Balance after this transaction',
  description TEXT NULL,
  related_email_id VARCHAR(36) NULL COMMENT 'Email ID if transaction is email-related',
  related_payment_id VARCHAR(36) NULL COMMENT 'Payment ID if transaction is purchase-related',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSON NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (related_payment_id) REFERENCES crypto_payments(id) ON DELETE SET NULL,
  INDEX idx_user_transactions (user_id, created_at),
  INDEX idx_transaction_type (transaction_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Tracks all credit additions and deductions';

-- Create table for API keys (agents can have multiple keys)
CREATE TABLE IF NOT EXISTS api_keys (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  key_hash VARCHAR(255) NOT NULL COMMENT 'Hashed API key for security',
  key_prefix VARCHAR(20) NOT NULL COMMENT 'First few chars for identification',
  name VARCHAR(255) NULL COMMENT 'User-friendly name for this key',
  scopes JSON NULL COMMENT 'Permissions granted to this key',
  last_used_at TIMESTAMP NULL,
  last_used_ip VARCHAR(45) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  status ENUM('active', 'revoked', 'expired') DEFAULT 'active',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_key_hash (key_hash),
  INDEX idx_user_keys (user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='API keys for agent authentication';

-- Add email cost tracking
ALTER TABLE emails
  ADD COLUMN credit_cost DECIMAL(6,4) DEFAULT 1.0000 COMMENT 'Credits deducted for this email';
