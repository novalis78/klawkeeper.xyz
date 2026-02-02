/**
 * Domain management utilities
 * 
 * This module provides functions for managing email domains, DNS records,
 * and domain verification.
 */

// Mock data for development
const MOCK_DOMAINS = [
  {
    id: 'domain-1',
    domain: 'phoneshield.ai',
    isVerified: true,
    isPrimary: true,
    addedDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30), // 30 days ago
    dnsRecords: {
      mx: [
        { priority: 10, host: 'mx1.keykeeper.world' },
        { priority: 20, host: 'mx2.keykeeper.world' }
      ],
      spf: 'v=spf1 include:_spf.keykeeper.world ~all',
      dkim: {
        selector: 'mail',
        record: 'v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A...'
      },
      dmarc: 'v=DMARC1; p=quarantine; rua=mailto:dmarc@keykeeper.world'
    },
    status: 'active',
    accounts: [
      { email: 'user@phoneshield.ai', name: 'Primary User', isAdmin: true },
      { email: 'info@phoneshield.ai', name: 'Info Account', isAdmin: false }
    ]
  }
];

/**
 * Get domains for a user account
 * 
 * @param {string} userId The user's ID
 * @returns {Promise<Array>} List of domains
 */
export async function getDomains(userId) {
  // TODO: Replace with actual domain fetching from database
  
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(MOCK_DOMAINS);
    }, 600);
  });
}

/**
 * Get a single domain by ID
 * 
 * @param {string} domainId The domain ID
 * @returns {Promise<Object>} Domain object
 */
export async function getDomain(domainId) {
  // TODO: Replace with actual domain fetching from database
  
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const domain = MOCK_DOMAINS.find(d => d.id === domainId);
      
      if (!domain) {
        reject(new Error('Domain not found'));
        return;
      }
      
      resolve(domain);
    }, 300);
  });
}

/**
 * Add a new domain
 * 
 * @param {string} userId The user's ID
 * @param {string} domainName The domain name to add
 * @returns {Promise<Object>} Newly created domain
 */
export async function addDomain(userId, domainName) {
  // TODO: Replace with actual domain creation in database
  
  return new Promise((resolve) => {
    setTimeout(() => {
      // Check if domain already exists
      const existingDomain = MOCK_DOMAINS.find(d => d.domain === domainName);
      
      if (existingDomain) {
        throw new Error('Domain already exists');
      }
      
      // Generate DKIM keys, create DNS records, etc.
      const newDomain = {
        id: `domain-${Date.now()}`,
        domain: domainName,
        isVerified: false,
        isPrimary: MOCK_DOMAINS.length === 0,
        addedDate: new Date(),
        dnsRecords: {
          mx: [
            { priority: 10, host: 'mx1.keykeeper.world' },
            { priority: 20, host: 'mx2.keykeeper.world' }
          ],
          spf: 'v=spf1 include:_spf.keykeeper.world ~all',
          dkim: {
            selector: 'mail',
            record: 'v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A...'
          },
          dmarc: 'v=DMARC1; p=quarantine; rua=mailto:dmarc@keykeeper.world'
        },
        status: 'pending_verification',
        accounts: []
      };
      
      MOCK_DOMAINS.push(newDomain);
      
      resolve(newDomain);
    }, 800);
  });
}

/**
 * Delete a domain
 * 
 * @param {string} domainId The domain ID to delete
 * @returns {Promise<Object>} Result of the delete operation
 */
export async function deleteDomain(domainId) {
  // TODO: Replace with actual domain deletion in database
  
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const domainIndex = MOCK_DOMAINS.findIndex(d => d.id === domainId);
      
      if (domainIndex === -1) {
        reject(new Error('Domain not found'));
        return;
      }
      
      // Check if domain is primary
      if (MOCK_DOMAINS[domainIndex].isPrimary) {
        reject(new Error('Cannot delete primary domain'));
        return;
      }
      
      // Remove from array
      MOCK_DOMAINS.splice(domainIndex, 1);
      
      resolve({ success: true });
    }, 500);
  });
}

/**
 * Verify a domain's DNS records
 * 
 * @param {string} domainId The domain ID to verify
 * @returns {Promise<Object>} Verification results
 */
export async function verifyDomain(domainId) {
  // TODO: Replace with actual DNS verification
  
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const domain = MOCK_DOMAINS.find(d => d.id === domainId);
      
      if (!domain) {
        reject(new Error('Domain not found'));
        return;
      }
      
      // Simulate verification
      const verificationResults = {
        mx: { verified: true, records: domain.dnsRecords.mx },
        spf: { verified: true, record: domain.dnsRecords.spf },
        dkim: { verified: true, record: domain.dnsRecords.dkim.record },
        dmarc: { verified: false, record: domain.dnsRecords.dmarc, error: 'Record not found' }
      };
      
      // Update domain status based on verification
      const allVerified = Object.values(verificationResults)
        .every(result => result.verified);
      
      if (allVerified) {
        domain.isVerified = true;
        domain.status = 'active';
      }
      
      resolve(verificationResults);
    }, 1500);
  });
}

/**
 * Add an email account to a domain
 * 
 * @param {string} domainId The domain ID
 * @param {Object} accountData The account data including email, name, etc.
 * @returns {Promise<Object>} Newly created account
 */
export async function addAccount(domainId, accountData) {
  // TODO: Replace with actual account creation in database/mail server
  
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const domain = MOCK_DOMAINS.find(d => d.id === domainId);
      
      if (!domain) {
        reject(new Error('Domain not found'));
        return;
      }
      
      // Check if email already exists
      const emailExists = domain.accounts.some(account => 
        account.email === accountData.email);
      
      if (emailExists) {
        reject(new Error('Email already exists'));
        return;
      }
      
      // Create new account
      const newAccount = {
        email: accountData.email,
        name: accountData.name,
        isAdmin: accountData.isAdmin || false,
        createdAt: new Date()
      };
      
      domain.accounts.push(newAccount);
      
      resolve(newAccount);
    }, 700);
  });
}

/**
 * Remove an email account from a domain
 * 
 * @param {string} domainId The domain ID
 * @param {string} email The email address to remove
 * @returns {Promise<Object>} Result of the remove operation
 */
export async function removeAccount(domainId, email) {
  // TODO: Replace with actual account deletion in database/mail server
  
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const domain = MOCK_DOMAINS.find(d => d.id === domainId);
      
      if (!domain) {
        reject(new Error('Domain not found'));
        return;
      }
      
      const accountIndex = domain.accounts.findIndex(account => 
        account.email === email);
      
      if (accountIndex === -1) {
        reject(new Error('Account not found'));
        return;
      }
      
      // Check if this is the last admin account
      const isLastAdmin = domain.accounts[accountIndex].isAdmin && 
        domain.accounts.filter(a => a.isAdmin).length === 1;
      
      if (isLastAdmin) {
        reject(new Error('Cannot remove the last admin account'));
        return;
      }
      
      // Remove account
      domain.accounts.splice(accountIndex, 1);
      
      resolve({ success: true });
    }, 500);
  });
}

/**
 * Generate DNS records for a domain
 * 
 * @param {string} domainName The domain name
 * @returns {Promise<Object>} DNS records
 */
export async function generateDnsRecords(domainName) {
  // TODO: Replace with actual DNS record generation
  
  return new Promise((resolve) => {
    setTimeout(() => {
      const dnsRecords = {
        mx: [
          { priority: 10, host: 'mx1.keykeeper.world', value: `10 mx1.keykeeper.world` },
          { priority: 20, host: 'mx2.keykeeper.world', value: `20 mx2.keykeeper.world` }
        ],
        spf: {
          type: 'TXT',
          name: domainName,
          value: 'v=spf1 include:_spf.keykeeper.world ~all'
        },
        dkim: {
          type: 'TXT',
          name: `mail._domainkey.${domainName}`,
          value: 'v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAyyYBH4qQ...'
        },
        dmarc: {
          type: 'TXT',
          name: `_dmarc.${domainName}`,
          value: 'v=DMARC1; p=quarantine; rua=mailto:dmarc@keykeeper.world'
        }
      };
      
      resolve(dnsRecords);
    }, 500);
  });
}

export default {
  getDomains,
  getDomain,
  addDomain,
  deleteDomain,
  verifyDomain,
  addAccount,
  removeAccount,
  generateDnsRecords
};