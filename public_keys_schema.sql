-- Table to store public keys collected from emails
CREATE TABLE IF NOT EXISTS `public_keys` (
  `id` VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  `email` VARCHAR(255) NOT NULL,
  `public_key` TEXT NOT NULL,
  `key_id` VARCHAR(16) NOT NULL,
  `fingerprint` VARCHAR(40) NOT NULL,
  `name` VARCHAR(255),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `source` ENUM('attachment', 'keyserver', 'manual', 'registration') NOT NULL,
  `verified` BOOLEAN DEFAULT FALSE,
  `trusted` BOOLEAN DEFAULT FALSE,
  `user_id` VARCHAR(36),
  UNIQUE INDEX `idx_email_fingerprint` (`email`, `fingerprint`),
  INDEX `idx_email` (`email`),
  INDEX `idx_fingerprint` (`fingerprint`),
  INDEX `idx_key_id` (`key_id`),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Add comments
ALTER TABLE `public_keys` 
  COMMENT = 'Stores public PGP keys collected from various sources for automatic encryption';