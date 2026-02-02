-- Users table
  CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255),
    public_key TEXT NOT NULL,
    key_id VARCHAR(40) NOT NULL,
    fingerprint VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    status ENUM('active', 'disabled', 'pending') DEFAULT 'pending',
    auth_method ENUM('browser', 'password_manager', 'hardware_key') NOT NULL,
    mail_password TEXT NULL COMMENT 'Encrypted mail account password',
    UNIQUE INDEX idx_fingerprint (fingerprint),
    INDEX idx_key_id (key_id)
  );

  -- Disposable addresses table
  CREATE TABLE disposable_addresses (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    address VARCHAR(255) NOT NULL UNIQUE,
    label VARCHAR(255),
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('active', 'expired', 'disabled') DEFAULT 'active',
    use_count INT DEFAULT 0,
    max_uses INT NULL,
    last_used TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_addresses (user_id, status),
    INDEX idx_address (address)
  );

  -- Encrypted emails table
  CREATE TABLE emails (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    to_address VARCHAR(255) NOT NULL,
    from_address VARCHAR(255) NOT NULL,
    subject_encrypted TEXT NOT NULL,
    content_encrypted LONGTEXT NOT NULL,
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    size_bytes INT NOT NULL,
    has_attachments BOOLEAN DEFAULT FALSE,
    status ENUM('unread', 'read', 'starred', 'archived', 'deleted') DEFAULT 'unread',
    original_message_id VARCHAR(255),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_status (user_id, status),
    INDEX idx_received (received_at)
  );

  -- Email attachments table
  CREATE TABLE attachments (
    id VARCHAR(36) PRIMARY KEY,
    email_id VARCHAR(36) NOT NULL,
    filename_encrypted VARCHAR(255) NOT NULL,
    content_encrypted LONGBLOB NOT NULL,
    size_bytes INT NOT NULL,
    content_type VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE,
    INDEX idx_email_id (email_id)
  );

  -- Authentication challenges table
  CREATE TABLE auth_challenges (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    challenge VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_challenge (challenge),
    INDEX idx_expires (expires_at)
  );

  -- User sessions table
  CREATE TABLE sessions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    token VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_expires (expires_at)
  );

  -- User activity logs table
  CREATE TABLE activity_logs (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    ip_address VARCHAR(45),
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_activity (user_id, activity_type)
  );

  CREATE TABLE `virtual_users` (
	`id` INT(10) NOT NULL AUTO_INCREMENT,
	`domain_id` INT(10) NOT NULL,
	`password` VARCHAR(106) NOT NULL COLLATE 'utf8mb3_general_ci',
	`email` VARCHAR(100) NOT NULL COLLATE 'utf8mb3_general_ci',
	`user_id` VARCHAR(36) NULL COMMENT 'Link to users table',
	`username` VARCHAR(100) NULL COLLATE 'utf8mb3_general_ci',
	`pending_activation` TINYINT(1) NOT NULL DEFAULT '1' COMMENT 'Flag for first login activation',
	PRIMARY KEY (`id`) USING BTREE,
	UNIQUE INDEX `email` (`email`) USING BTREE,
	INDEX `idx_user_id` (`user_id`) USING BTREE
)
COLLATE='utf8mb3_general_ci'
ENGINE=InnoDB
;


CREATE TABLE `virtual_domains` (
	`id` INT(10) NOT NULL AUTO_INCREMENT,
	`name` VARCHAR(50) NOT NULL COLLATE 'utf8mb3_general_ci',
	PRIMARY KEY (`id`) USING BTREE
)
COLLATE='utf8mb3_general_ci'
ENGINE=InnoDB
AUTO_INCREMENT=2
;


CREATE TABLE `virtual_aliases` (
	`id` INT(10) NOT NULL AUTO_INCREMENT,
	`domain_id` INT(10) NOT NULL,
	`source` VARCHAR(100) NOT NULL COLLATE 'utf8mb3_general_ci',
	`destination` VARCHAR(100) NOT NULL COLLATE 'utf8mb3_general_ci',
	PRIMARY KEY (`id`) USING BTREE
)
COLLATE='utf8mb3_general_ci'
ENGINE=InnoDB
;


  This schema includes:

  1. Users table - Stores user accounts with public keys (no passwords!)
  2. Disposable addresses - Tracks all disposable email addresses
  3. Emails - Stores encrypted email content and minimal metadata
  4. Attachments - Handles encrypted file attachments
  5. Auth challenges - Manages one-time authentication challenges
  6. Sessions - Tracks active user sessions
  7. Activity logs - Audit trail for security events
