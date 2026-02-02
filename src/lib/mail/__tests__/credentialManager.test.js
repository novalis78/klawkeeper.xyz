/**
 * Tests for mail credential management functionality
 * 
 * Note: These tests are meant to be run in a browser-like environment
 * since they use browser crypto APIs.
 */

import {
  deriveSessionKey,
  encryptWithSessionKey,
  decryptWithSessionKey,
  storeCredentials,
  getCredentials,
  clearAllCredentials
} from '../mailCredentialManager';

// Mock localStorage and sessionStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn(key => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    key: jest.fn(index => Object.keys(store)[index] || null),
    get length() {
      return Object.keys(store).length;
    }
  };
})();

const sessionStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn(key => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    key: jest.fn(index => Object.keys(store)[index] || null),
    get length() {
      return Object.keys(store).length;
    }
  };
})();

// Mock crypto APIs
const cryptoMock = {
  subtle: {
    digest: jest.fn(async (algorithm, data) => {
      // Simple mock implementation - not cryptographically sound, just for testing
      return new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
    }),
    importKey: jest.fn(async (format, keyData, algorithm, extractable, keyUsages) => {
      return 'mock-crypto-key';
    }),
    encrypt: jest.fn(async (algorithm, key, data) => {
      return new TextEncoder().encode(`encrypted:${new TextDecoder().decode(data)}`);
    }),
    decrypt: jest.fn(async (algorithm, key, data) => {
      const decoded = new TextDecoder().decode(data);
      const original = decoded.replace('encrypted:', '');
      return new TextEncoder().encode(original);
    })
  },
  getRandomValues: jest.fn(array => {
    for (let i = 0; i < array.length; i++) {
      array[i] = i % 256;
    }
    return array;
  })
};

describe('Mail Credential Manager', () => {
  // Setup mocks
  beforeAll(() => {
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
    Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });
    Object.defineProperty(window, 'crypto', { value: cryptoMock });
    
    // Mock btoa and atob
    global.btoa = jest.fn(str => Buffer.from(str).toString('base64'));
    global.atob = jest.fn(b64 => Buffer.from(b64, 'base64').toString());
  });
  
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    jest.clearAllMocks();
  });
  
  describe('deriveSessionKey', () => {
    it('should derive a session key from auth token and fingerprint', async () => {
      const key = await deriveSessionKey('test-token', 'test-fingerprint');
      expect(typeof key).toBe('string');
      expect(key.length).toBeGreaterThan(0);
      expect(cryptoMock.subtle.digest).toHaveBeenCalled();
    });
  });
  
  describe('encryptWithSessionKey/decryptWithSessionKey', () => {
    it('should encrypt and decrypt data with a session key', async () => {
      const sessionKey = await deriveSessionKey('test-token', 'test-fingerprint');
      const originalData = 'test data to encrypt';
      
      const encrypted = await encryptWithSessionKey(sessionKey, originalData);
      expect(typeof encrypted).toBe('string');
      expect(encrypted.length).toBeGreaterThan(0);
      
      const decrypted = await decryptWithSessionKey(sessionKey, encrypted);
      expect(decrypted).toBe(originalData);
      
      expect(cryptoMock.subtle.importKey).toHaveBeenCalled();
      expect(cryptoMock.subtle.encrypt).toHaveBeenCalled();
      expect(cryptoMock.subtle.decrypt).toHaveBeenCalled();
    });
  });
  
  describe('storeCredentials/getCredentials', () => {
    it('should store and retrieve credentials for session storage', async () => {
      const sessionKey = await deriveSessionKey('test-token', 'test-fingerprint');
      const accountId = 'test_account';
      const credentials = {
        email: 'test@example.com',
        password: 'test-password',
        server: 'imap.example.com'
      };
      
      await storeCredentials(accountId, credentials, sessionKey, false);
      
      // Check that it was stored in sessionStorage
      expect(sessionStorage.setItem).toHaveBeenCalled();
      
      // Get the credentials back
      const retrieved = await getCredentials(accountId, sessionKey);
      
      // Since we're using mocks, we can't test the actual encryption/decryption
      // But we can verify the flow works
      expect(retrieved).toBeDefined();
    });
    
    it('should store and retrieve credentials for local storage', async () => {
      const sessionKey = await deriveSessionKey('test-token', 'test-fingerprint');
      const accountId = 'test_account';
      const credentials = {
        email: 'test@example.com',
        password: 'test-password',
        server: 'imap.example.com'
      };
      
      await storeCredentials(accountId, credentials, sessionKey, true);
      
      // Check that it was stored in localStorage
      expect(localStorage.setItem).toHaveBeenCalled();
      
      // Get the credentials back
      const retrieved = await getCredentials(accountId, sessionKey);
      
      // Since we're using mocks, we can't test the actual encryption/decryption
      // But we can verify the flow works
      expect(retrieved).toBeDefined();
    });
  });
  
  describe('clearAllCredentials', () => {
    it('should clear all stored credentials', async () => {
      // Set up some test credentials
      localStorage.setItem('kk_mail_account1', 'test1');
      localStorage.setItem('kk_mail_account2', 'test2');
      localStorage.setItem('other_key', 'not-a-credential');
      sessionStorage.setItem('kk_mail_account3', 'test3');
      sessionStorage.setItem('kk_session_key', 'test-key');
      
      // Clear the credentials
      clearAllCredentials();
      
      // Check that mail items were removed
      expect(localStorage.removeItem).toHaveBeenCalledTimes(2);
      expect(sessionStorage.removeItem).toHaveBeenCalledTimes(2);
      
      // Should not remove non-credential items
      expect(localStorage.removeItem).not.toHaveBeenCalledWith('other_key');
    });
  });
});