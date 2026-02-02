/**
 * Mailbox utilities for interacting with Postfix mail server
 * 
 * This module provides functions for fetching, sending, and managing emails
 * via IMAP/POP3 for receiving and SMTP for sending.
 */

import crypto from 'crypto';

// Mock data for development until we connect to the real mail server
const MOCK_EMAILS = [
  {
    id: 'email-1',
    from: { name: 'John Smith', email: 'john@example.com' },
    to: [{ name: 'Current User', email: 'user@phoneshield.ai' }],
    cc: [],
    bcc: [],
    subject: 'Welcome to PhoneShield.ai',
    body: `<p>Hello and welcome to your new email service!</p>
    <p>We're excited to have you on board. Here are a few things you should know:</p>
    <ul>
      <li>Your emails are stored securely</li>
      <li>We never scan your content for advertising</li>
      <li>You can create disposable addresses as a premium feature</li>
    </ul>
    <p>Let us know if you have any questions.</p>
    <p>Best regards,<br>The PhoneShield.ai Team</p>`,
    date: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    isRead: false,
    isStarred: false,
    hasAttachments: false,
    folder: 'inbox',
    labels: ['important']
  },
  {
    id: 'email-2',
    from: { name: 'Security Alert', email: 'security@phoneshield.ai' },
    to: [{ name: 'Current User', email: 'user@phoneshield.ai' }],
    cc: [],
    bcc: [],
    subject: 'Your account security',
    body: `<p>We noticed a new sign-in to your account.</p>
    <p>If this was you, you can safely ignore this email.</p>
    <p>If this wasn't you, please secure your account immediately.</p>
    <p>Best regards,<br>The Security Team</p>`,
    date: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    isRead: true,
    isStarred: true,
    hasAttachments: false,
    folder: 'inbox',
    labels: ['security']
  },
  {
    id: 'email-3',
    from: { name: 'Newsletter', email: 'news@example.com' },
    to: [{ name: 'Current User', email: 'user@phoneshield.ai' }],
    cc: [],
    bcc: [],
    subject: 'Weekly privacy digest',
    body: `<p>Here's your weekly roundup of privacy news:</p>
    <ul>
      <li>New legislation proposed in EU for data protection</li>
      <li>Tips for securing your digital identity</li>
      <li>The rise of encrypted messaging services</li>
    </ul>
    <p>Read more on our website.</p>`,
    date: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    isRead: true,
    isStarred: false,
    hasAttachments: true,
    attachments: [
      { 
        id: 'att-1', 
        name: 'privacy-digest.pdf', 
        size: 2400000, 
        type: 'application/pdf' 
      }
    ],
    folder: 'inbox',
    labels: ['newsletter']
  },
  {
    id: 'email-4',
    from: { name: 'Current User', email: 'user@phoneshield.ai' },
    to: [{ name: 'Support Team', email: 'support@example.com' }],
    cc: [],
    bcc: [],
    subject: 'Question about my account',
    body: `<p>Hello Support,</p>
    <p>I have a question about creating disposable email addresses.</p>
    <p>How many can I create with my current plan?</p>
    <p>Thanks,<br>Me</p>`,
    date: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 hours ago
    isRead: true,
    isStarred: false,
    hasAttachments: false,
    folder: 'sent',
    labels: []
  },
  {
    id: 'email-5',
    from: { name: 'Billing Department', email: 'billing@phoneshield.ai' },
    to: [{ name: 'Current User', email: 'user@phoneshield.ai' }],
    cc: [],
    bcc: [],
    subject: 'Your subscription invoice',
    body: `<p>Thank you for your subscription to PhoneShield.ai.</p>
    <p>Your invoice for the current billing period is attached.</p>
    <p>If you have any questions, please contact our billing department.</p>
    <p>Regards,<br>Billing Team</p>`,
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), // 1 week ago
    isRead: true,
    isStarred: false,
    hasAttachments: true,
    attachments: [
      { 
        id: 'att-2', 
        name: 'invoice-april.pdf', 
        size: 1240000, 
        type: 'application/pdf' 
      }
    ],
    folder: 'inbox',
    labels: ['billing']
  }
];

/**
 * Fetch emails for a user from a specific folder
 * 
 * @param {string} email User's email address
 * @param {string} folder Folder to fetch (inbox, sent, drafts, etc.)
 * @param {Object} options Additional options like limit, offset, search
 * @returns {Promise<Array>} List of emails
 */
export async function fetchEmails(email, folder = 'inbox', options = {}) {
  try {
    // Import here to avoid circular dependencies
    const postfix = await import('./postfixConnector.js');
    
    // Use Postfix integration if USE_REAL_MAIL_SERVER flag is set
    if (process.env.USE_REAL_MAIL_SERVER === 'true') {
      console.log('Fetching emails via Postfix IMAP');
      // Use imapConfig from options if provided (includes password), otherwise just use email
      const config = options.imapConfig || { auth: { user: email } };
      return await postfix.default.fetchEmails(folder, options, config);
    } else {
      console.log('Using mock email fetching (Postfix integration disabled)');
      // For development, return mock data
      return new Promise((resolve) => {
        setTimeout(() => {
          const results = MOCK_EMAILS
            .filter(mail => mail.folder === folder)
            .sort((a, b) => b.date - a.date);
          
          // Apply search if provided
          const filtered = options.search
            ? results.filter(mail => 
                mail.subject.toLowerCase().includes(options.search.toLowerCase()) ||
                mail.body.toLowerCase().includes(options.search.toLowerCase()) ||
                mail.from.email.toLowerCase().includes(options.search.toLowerCase()) ||
                mail.from.name.toLowerCase().includes(options.search.toLowerCase())
              )
            : results;
          
          resolve(filtered);
        }, 300);
      });
    }
  } catch (error) {
    console.error('Error in fetchEmails:', error);
    return [];
  }
}

/**
 * Fetch a single email by ID
 * 
 * @param {string} emailId ID of the email to fetch
 * @param {boolean} markAsRead Whether to mark the email as read
 * @param {string} folder Folder containing the email
 * @param {string} userEmail User's email address for authentication
 * @returns {Promise<Object>} Email object
 */
export async function fetchEmail(emailId, markAsRead = true, folder = 'inbox', userEmail = null) {
  try {
    // Import here to avoid circular dependencies
    const postfix = await import('./postfixConnector.js');
    
    // Use Postfix integration if USE_REAL_MAIL_SERVER flag is set
    if (process.env.USE_REAL_MAIL_SERVER === 'true' && userEmail) {
      console.log('Fetching email via Postfix IMAP');
      const config = { auth: { user: userEmail } };
      // emailId is the UID in IMAP
      return await postfix.default.fetchEmail(parseInt(emailId), folder.toUpperCase(), markAsRead, config);
    } else {
      console.log('Using mock email fetching (Postfix integration disabled)');
      // For development, return mock data
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const email = MOCK_EMAILS.find(mail => mail.id === emailId);
          
          if (!email) {
            reject(new Error('Email not found'));
            return;
          }
          
          if (markAsRead && !email.isRead) {
            email.isRead = true;
          }
          
          resolve(email);
        }, 300);
      });
    }
  } catch (error) {
    console.error('Error in fetchEmail:', error);
    throw error;
  }
}

/**
 * Send an email
 * 
 * @param {Object} emailData Email data including recipients, subject, body
 * @param {Object} options Additional options like encryption, attachments
 * @returns {Promise<Object>} Result of the send operation
 */
export async function sendEmail(emailData, options = {}) {
  try {
    console.log('[Mailbox] sendEmail called with:', {
      hasEmailData: !!emailData,
      attachmentCount: emailData?.attachments?.length || 0,
      attachmentDetails: emailData?.attachments?.map(a => ({
        filename: a.filename || a.name,
        hasContent: !!a.content,
        contentLength: a.content?.length || 0,
        encoding: a.encoding,
        contentType: a.contentType || a.type
      }))
    });
    
    // Import here to avoid circular dependencies
    const postfix = await import('./postfixConnector.js');
    
    // Use Postfix integration if USE_REAL_MAIL_SERVER flag is set
    if (process.env.USE_REAL_MAIL_SERVER === 'true') {
      console.log('[Mailbox] Sending email via Postfix server');
      console.log('[Mailbox] Passing emailData with attachments:', emailData?.attachments?.length || 0);
      return await postfix.default.sendEmail(emailData, options);
    } else {
      console.log('Using mock email sending (Postfix integration disabled)');
      // Use mock data for development/testing
      return new Promise((resolve) => {
        setTimeout(() => {
          const newEmail = {
            id: `email-${crypto.randomBytes(8).toString('hex')}`,
            from: emailData.from,
            to: emailData.to,
            cc: emailData.cc || [],
            bcc: emailData.bcc || [],
            subject: emailData.subject,
            body: emailData.body,
            date: new Date(),
            isRead: true,
            isStarred: false,
            hasAttachments: emailData.attachments && emailData.attachments.length > 0,
            attachments: emailData.attachments || [],
            folder: 'sent',
            labels: []
          };
          
          MOCK_EMAILS.push(newEmail);
          
          resolve({
            success: true,
            messageId: newEmail.id,
            sentAt: newEmail.date
          });
        }, 300);
      });
    }
  } catch (error) {
    console.error('Error in sendEmail:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Update email metadata (read status, starred, labels, folder)
 * 
 * @param {string} emailId ID of the email to update
 * @param {Object} updates Changes to apply to the email
 * @param {string} folder Current folder containing the email
 * @param {string} userEmail User's email address for authentication
 * @returns {Promise<Object>} Updated email
 */
export async function updateEmail(emailId, updates, folder = 'inbox', userEmail = null) {
  try {
    // Import here to avoid circular dependencies
    const postfix = await import('./postfixConnector.js');
    
    // Use Postfix integration if USE_REAL_MAIL_SERVER flag is set
    if (process.env.USE_REAL_MAIL_SERVER === 'true' && userEmail) {
      console.log('Updating email via Postfix IMAP');
      const config = { auth: { user: userEmail } };
      // emailId is the UID in IMAP
      return await postfix.default.updateEmail(parseInt(emailId), folder.toUpperCase(), updates, config);
    } else {
      console.log('Using mock email update (Postfix integration disabled)');
      // For development, use mock data
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const email = MOCK_EMAILS.find(mail => mail.id === emailId);
          
          if (!email) {
            reject(new Error('Email not found'));
            return;
          }
          
          // Apply updates
          if (updates.isRead !== undefined) email.isRead = updates.isRead;
          if (updates.isStarred !== undefined) email.isStarred = updates.isStarred;
          if (updates.folder) email.folder = updates.folder;
          if (updates.labels) email.labels = [...updates.labels];
          
          resolve(email);
        }, 300);
      });
    }
  } catch (error) {
    console.error('Error in updateEmail:', error);
    throw error;
  }
}

/**
 * Delete an email (move to trash or permanently delete)
 * 
 * @param {string} emailId ID of the email to delete
 * @param {boolean} permanent Whether to permanently delete
 * @param {string} folder Current folder containing the email
 * @param {string} userEmail User's email address for authentication
 * @param {Object} imapConfig Configuration with auth credentials (optional) 
 * @returns {Promise<Object>} Result of the delete operation
 */
export async function deleteEmail(emailId, permanent = false, folder = 'inbox', userEmail = null, imapConfig = null) {
  try {
    // Import here to avoid circular dependencies
    const postfix = await import('./postfixConnector.js');
    
    // Use Postfix integration if USE_REAL_MAIL_SERVER flag is set
    if (process.env.USE_REAL_MAIL_SERVER === 'true' && userEmail) {
      console.log('Deleting email via Postfix IMAP');
      
      // Create config with auth credentials
      const config = imapConfig || { auth: { user: userEmail } };
      
      // If we have credentials, log that we're using them (without showing the password)
      if (config && config.auth && config.auth.pass) {
        console.log(`Using auth credentials for: ${config.auth.user}`);
        console.log(`Password provided: YES (length: ${config.auth.pass.length})`);
      } else {
        console.log(`Using auth with only username: ${userEmail}`);
      }
      
      // Always ensure TLS rejectUnauthorized is false
      config.tls = { rejectUnauthorized: false };
      
      // emailId is the UID in IMAP
      return await postfix.default.deleteEmail(parseInt(emailId), folder.toUpperCase(), permanent, config);
    } else {
      console.log('Using mock email deletion (Postfix integration disabled)');
      // For development, use mock data
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const emailIndex = MOCK_EMAILS.findIndex(mail => mail.id === emailId);
          
          if (emailIndex === -1) {
            reject(new Error('Email not found'));
            return;
          }
          
          if (permanent) {
            // Remove from array
            MOCK_EMAILS.splice(emailIndex, 1);
          } else {
            // Move to trash
            MOCK_EMAILS[emailIndex].folder = 'trash';
          }
          
          resolve({
            success: true,
            deleted: permanent,
            movedToTrash: !permanent
          });
        }, 300);
      });
    }
  } catch (error) {
    console.error('Error in deleteEmail:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get user's mailbox statistics
 * 
 * @param {string} email User's email address
 * @returns {Promise<Object>} Mailbox statistics
 */
export async function getMailboxStats(email) {
  try {
    // Import here to avoid circular dependencies
    const postfix = await import('./postfixConnector.js');
    
    // Use Postfix integration if USE_REAL_MAIL_SERVER flag is set
    if (process.env.USE_REAL_MAIL_SERVER === 'true') {
      console.log('Getting mailbox stats via Postfix IMAP');
      const config = { auth: { user: email } };
      return await postfix.default.getMailboxStats(config);
    } else {
      console.log('Using mock mailbox stats (Postfix integration disabled)');
      // For development, use mock data
      return new Promise((resolve) => {
        setTimeout(() => {
          // Count emails in different folders
          const stats = {
            folders: {
              inbox: {
                total: MOCK_EMAILS.filter(mail => mail.folder === 'inbox').length,
                unread: MOCK_EMAILS.filter(mail => mail.folder === 'inbox' && !mail.isRead).length
              },
              sent: {
                total: MOCK_EMAILS.filter(mail => mail.folder === 'sent').length,
                unread: 0
              },
              drafts: {
                total: MOCK_EMAILS.filter(mail => mail.folder === 'drafts').length,
                unread: 0
              },
              trash: {
                total: MOCK_EMAILS.filter(mail => mail.folder === 'trash').length,
                unread: MOCK_EMAILS.filter(mail => mail.folder === 'trash' && !mail.isRead).length
              },
              spam: {
                total: MOCK_EMAILS.filter(mail => mail.folder === 'spam').length,
                unread: MOCK_EMAILS.filter(mail => mail.folder === 'spam' && !mail.isRead).length
              }
            },
            inbox: {
              total: MOCK_EMAILS.filter(mail => mail.folder === 'inbox').length,
              unread: MOCK_EMAILS.filter(mail => mail.folder === 'inbox' && !mail.isRead).length
            },
            unread: MOCK_EMAILS.filter(mail => !mail.isRead).length,
            total: MOCK_EMAILS.length,
            storage: {
              used: 45000000, // 45 MB in bytes
              total: 5000000000, // 5 GB in bytes
              percentage: 0.9 // 0.9%
            },
            lastRefreshed: new Date()
          };
          
          resolve(stats);
        }, 300);
      });
    }
  } catch (error) {
    console.error('Error in getMailboxStats:', error);
    // Return empty stats on error
    return {
      folders: {},
      inbox: { total: 0, unread: 0 },
      unread: 0,
      total: 0,
      storage: { used: 0, total: 0, percentage: 0 },
      lastRefreshed: new Date(),
      error: error.message
    };
  }
}

export default {
  fetchEmails,
  fetchEmail,
  sendEmail,
  updateEmail,
  deleteEmail,
  getMailboxStats
};