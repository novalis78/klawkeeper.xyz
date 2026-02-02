-- Migration: Add Multi-Chain Payment Support
-- Adds support for Polygon, Ethereum, and Solana payments alongside Bitcoin

-- Add blockchain and token columns to crypto_payments
ALTER TABLE crypto_payments
  ADD COLUMN blockchain VARCHAR(20) DEFAULT 'bitcoin' COMMENT 'Blockchain: bitcoin, ethereum, polygon, solana',
  ADD COLUMN token_symbol VARCHAR(10) DEFAULT 'BTC' COMMENT 'Token: BTC, ETH, USDC, USDT, SOL',
  ADD COLUMN transaction_hash VARCHAR(255) NULL COMMENT 'Transaction hash for verification',
  ADD COLUMN amount_tokens DECIMAL(20,8) NULL COMMENT 'Amount in tokens (generic field)',
  ADD COLUMN contract_address VARCHAR(255) NULL COMMENT 'Token contract address (for ERC-20/SPL tokens)',
  ADD COLUMN network_confirmations INT DEFAULT 0 COMMENT 'Required confirmations for this network',
  ADD INDEX idx_blockchain (blockchain),
  ADD INDEX idx_token_symbol (token_symbol),
  ADD INDEX idx_transaction_hash (transaction_hash);

-- Rename amount_btc to be more generic (keep for backwards compatibility)
-- We'll use amount_tokens going forward, but keep amount_btc populated for BTC payments

-- Update existing records to populate new fields
UPDATE crypto_payments
SET
  blockchain = 'bitcoin',
  token_symbol = 'BTC',
  amount_tokens = amount_btc,
  network_confirmations = 3
WHERE blockchain IS NULL;

-- Add comment explaining the payment flow for multi-chain
ALTER TABLE crypto_payments COMMENT = 'Tracks crypto payments across multiple blockchains (Bitcoin, Ethereum, Polygon, Solana)';

-- Create indexes for faster payment lookup by chain
CREATE INDEX idx_blockchain_status ON crypto_payments(blockchain, status);
CREATE INDEX idx_blockchain_address ON crypto_payments(blockchain, payment_address);
