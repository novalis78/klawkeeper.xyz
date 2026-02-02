-- Migration: Add rate limiting and AI-approved rate increases
-- Implements spam protection with AI-to-AI negotiation for limit increases

-- Add rate limiting columns to users table
ALTER TABLE users
  ADD COLUMN daily_send_limit INT DEFAULT 100 COMMENT 'Max emails per day (default: 100 for new accounts)',
  ADD COLUMN rate_limit_approved_by ENUM('system', 'ai', 'human') DEFAULT 'system' COMMENT 'Who approved current rate limit',
  ADD COLUMN rate_limit_approved_at TIMESTAMP NULL COMMENT 'When rate limit was last changed',
  ADD COLUMN rate_limit_justification TEXT NULL COMMENT 'Reason provided for rate limit increase';

-- Create table for rate limit increase requests
CREATE TABLE IF NOT EXISTS rate_limit_requests (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  requested_limit INT NOT NULL COMMENT 'New daily limit requested',
  current_limit INT NOT NULL COMMENT 'Current daily limit at time of request',
  justification TEXT NOT NULL COMMENT 'Agent-provided reason for increase',
  status ENUM('pending', 'approved', 'rejected', 'needs_human_review') DEFAULT 'pending',
  ai_evaluation JSON NULL COMMENT 'AI analysis of the request',
  ai_decision_reasoning TEXT NULL COMMENT 'Why AI approved/rejected',
  reviewed_by ENUM('ai', 'human') NULL COMMENT 'Who made the final decision',
  reviewed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSON NULL COMMENT 'Additional context about request',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_requests (user_id, created_at),
  INDEX idx_status (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Rate limit increase requests with AI evaluation';

-- Add index for checking daily email counts
ALTER TABLE emails
  ADD INDEX idx_user_created (user_id, created_at);
