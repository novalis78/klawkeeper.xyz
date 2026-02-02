'use client';

/**
 * Mail Credential Validator
 * 
 * This module provides utilities for validating mail credentials and
 * testing connections to mail servers.
 */

// Regular expressions for validation
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const SERVER_REGEX = /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/;
const PORT_REGEX = /^()([1-9]|[1-5]?[0-9]{2,4}|6[1-4][0-9]{3}|65[1-4][0-9]{2}|655[1-2][0-9]|6553[1-5])$/;

/**
 * Validate email format
 * @param {string} email - Email address to validate
 * @returns {boolean} - Whether email format is valid
 */
export function validateEmail(email) {
  return EMAIL_REGEX.test(email);
}

/**
 * Validate server hostname
 * @param {string} server - Server hostname to validate
 * @returns {boolean} - Whether server hostname is valid
 */
export function validateServer(server) {
  return SERVER_REGEX.test(server);
}

/**
 * Validate port number
 * @param {number|string} port - Port number to validate
 * @returns {boolean} - Whether port number is valid
 */
export function validatePort(port) {
  return PORT_REGEX.test(String(port));
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} - Validation result with strength score and feedback
 */
export function validatePassword(password) {
  if (!password) {
    return {
      valid: false,
      score: 0,
      feedback: 'Password is required'
    };
  }
  
  // Calculate password strength score (0-4)
  let score = 0;
  const feedback = [];
  
  // Length check
  if (password.length < 8) {
    feedback.push('Password should be at least 8 characters');
  } else {
    score += 1;
  }
  
  // Character variety checks
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  
  // Provide feedback based on missing criteria
  if (!/[A-Z]/.test(password)) feedback.push('Add uppercase letters');
  if (!/[a-z]/.test(password)) feedback.push('Add lowercase letters');
  if (!/[0-9]/.test(password)) feedback.push('Add numbers');
  if (!/[^A-Za-z0-9]/.test(password)) feedback.push('Add special characters');
  
  return {
    valid: score >= 3,
    score,
    feedback: feedback.length > 0 ? feedback.join('. ') : 'Password strength is good'
  };
}

/**
 * Validate complete mail credentials
 * @param {Object} credentials - Mail credentials to validate
 * @returns {Object} - Validation result with errors
 */
export function validateCredentials(credentials) {
  const errors = {};
  
  // Email validation
  if (!credentials.email) {
    errors.email = 'Email is required';
  } else if (!validateEmail(credentials.email)) {
    errors.email = 'Invalid email format';
  }
  
  // Password validation
  if (!credentials.password) {
    errors.password = 'Password is required';
  } else {
    const passwordCheck = validatePassword(credentials.password);
    if (!passwordCheck.valid) {
      errors.password = passwordCheck.feedback;
    }
  }
  
  // IMAP server validation
  if (credentials.imapServer) {
    if (!validateServer(credentials.imapServer)) {
      errors.imapServer = 'Invalid IMAP server hostname';
    }
  }
  
  // IMAP port validation
  if (credentials.imapPort) {
    if (!validatePort(credentials.imapPort)) {
      errors.imapPort = 'Invalid IMAP port number';
    }
  }
  
  // SMTP server validation
  if (credentials.smtpServer) {
    if (!validateServer(credentials.smtpServer)) {
      errors.smtpServer = 'Invalid SMTP server hostname';
    }
  }
  
  // SMTP port validation
  if (credentials.smtpPort) {
    if (!validatePort(credentials.smtpPort)) {
      errors.smtpPort = 'Invalid SMTP port number';
    }
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Test connection to mail server
 * @param {Object} credentials - Mail credentials to test
 * @returns {Promise<Object>} - Test result with success/error status
 */
export async function testMailConnection(credentials) {
  try {
    // Basic validation before testing
    const validation = validateCredentials(credentials);
    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors
      };
    }
    
    // Send API request to test connection
    const response = await fetch('/api/mail/test-connection', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
        imapServer: credentials.imapServer,
        imapPort: credentials.imapPort,
        imapSecure: credentials.imapSecure,
        smtpServer: credentials.smtpServer,
        smtpPort: credentials.smtpPort,
        smtpSecure: credentials.smtpSecure
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        message: error.error || 'Connection test failed',
        details: error.details || {}
      };
    }
    
    const result = await response.json();
    return {
      success: true,
      imap: result.imap,
      smtp: result.smtp
    };
  } catch (error) {
    console.error('Error testing mail connection:', error);
    return {
      success: false,
      message: 'Error testing connection: ' + error.message
    };
  }
}

export default {
  validateEmail,
  validateServer,
  validatePort,
  validatePassword,
  validateCredentials,
  testMailConnection
};