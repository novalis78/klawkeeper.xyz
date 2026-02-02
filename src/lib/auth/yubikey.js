/**
 * YubiKey integration for KeyKeeper
 * 
 * This module provides YubiKey support for authentication using WebAuthn
 * and derives passwords compatible with the existing auth system
 */

import * as openpgp from 'openpgp';

export class YubiKeyService {
  constructor() {
    // Only check support in browser environment
    this.isSupported = typeof window !== 'undefined' ? this.checkSupport() : false;
  }

  checkSupport() {
    // Guard against SSR
    if (typeof window === 'undefined') return false;
    return !!(window.PublicKeyCredential && navigator.credentials);
  }

  /**
   * Check if a YubiKey is connected using various methods
   */
  async detectYubiKey() {
    const methods = [];

    // Method 1: Check WebUSB (requires HTTPS and user permission)
    if ('usb' in navigator) {
      try {
        const devices = await navigator.usb.getDevices();
        const yubikey = devices.find(d => d.vendorId === 0x1050);
        if (yubikey) {
          methods.push({
            method: 'WebUSB',
            detected: true,
            details: {
              productName: yubikey.productName,
              serialNumber: yubikey.serialNumber
            }
          });
        }
      } catch (e) {
        console.log('WebUSB detection failed:', e);
      }
    }

    // Method 2: Try WebAuthn (most reliable for our use case)
    if (this.isSupported) {
      // We can't directly detect without user interaction, but we know it's available
      methods.push({
        method: 'WebAuthn',
        detected: true,
        details: { available: true }
      });
    }

    return methods;
  }

  /**
   * Register a new YubiKey for authentication
   */
  async register(userEmail, userName) {
    if (!this.isSupported) {
      throw new Error('WebAuthn not supported');
    }

    // Generate challenge
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    // Create credential - specifically request USB security key
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: "KeyKeeper",
          id: window.location.hostname
        },
        user: {
          id: new TextEncoder().encode(userEmail),
          name: userEmail,
          displayName: userName || userEmail
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" },   // ES256 (YubiKey supports this)
          { alg: -8, type: "public-key" },   // EdDSA
          { alg: -257, type: "public-key" }  // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "cross-platform", // This forces external authenticator
          residentKey: "discouraged",
          requireResidentKey: false,
          userVerification: "discouraged"
        },
        attestation: "direct",
        timeout: 120000,
        excludeCredentials: [] // Don't exclude any credentials
      }
    });

    // Extract credential data
    const credentialId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
    const publicKey = await this.extractPublicKey(credential.response);

    return {
      credentialId,
      publicKey,
      attestation: credential.response,
      type: credential.type
    };
  }

  /**
   * Authenticate with YubiKey and derive password
   */
  async authenticate(credentialId, challenge) {
    if (!this.isSupported) {
      throw new Error('WebAuthn not supported');
    }

    // Convert credential ID back to ArrayBuffer
    const credentialIdBuffer = Uint8Array.from(atob(credentialId), c => c.charCodeAt(0));

    // Get assertion
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: new TextEncoder().encode(challenge),
        rpId: window.location.hostname,
        allowCredentials: [{
          id: credentialIdBuffer,
          type: 'public-key',
          transports: ['usb', 'nfc', 'ble'] // YubiKey can use multiple transports
        }],
        userVerification: "discouraged",
        timeout: 120000
      }
    });

    // Get signature
    const signature = new Uint8Array(assertion.response.signature);
    
    // Derive password from signature (compatible with existing system)
    const password = await this.derivePassword(signature, challenge);

    return {
      password,
      signature: btoa(String.fromCharCode(...signature)),
      authenticatorData: assertion.response.authenticatorData
    };
  }

  /**
   * Extract public key from credential response
   */
  async extractPublicKey(response) {
    // Parse attestation object
    const attestationObject = response.attestationObject;
    
    // For now, return a placeholder
    // In production, we'd parse the CBOR-encoded attestation object
    return {
      type: 'webauthn',
      keyData: btoa(String.fromCharCode(...new Uint8Array(attestationObject).slice(0, 100)))
    };
  }

  /**
   * Derive password from YubiKey signature (matches existing password derivation)
   */
  async derivePassword(signature, challenge) {
    // Combine signature with challenge for uniqueness
    const combined = new Uint8Array(signature.length + challenge.length);
    combined.set(signature);
    combined.set(new TextEncoder().encode(challenge), signature.length);

    // Hash using SHA-256
    const hash = await crypto.subtle.digest('SHA-256', combined);
    
    // Convert to base64 and format like existing passwords
    const base64 = btoa(String.fromCharCode(...new Uint8Array(hash)));
    
    // Remove special characters and limit length (matching existing system)
    return base64.replace(/[^a-zA-Z0-9]/g, '').substring(0, 24);
  }

  /**
   * Try to read PGP public key from YubiKey (if stored)
   */
  async readPublicKeyFromCard() {
    // This would require one of:
    // 1. OpenPGP.js with smart card support
    // 2. Browser extension
    // 3. Companion native app
    
    // For now, return null - user would need to provide public key separately
    console.log('Reading PGP keys directly from YubiKey requires browser extension');
    return null;
  }

  /**
   * Get YubiKey info if URL is stored on card
   */
  async getCardInfo() {
    // YubiKeys can store a URL that points to the public key
    // This requires card access which browsers don't directly support
    
    // Possible workarounds:
    // 1. Ask user to provide their keyserver URL
    // 2. Use a browser extension
    // 3. Have user upload their public key file
    
    return {
      urlSupport: false,
      message: 'Direct card URL reading not available in browser'
    };
  }
}

// Create singleton instance only in browser
export const yubiKeyService = typeof window !== 'undefined' ? new YubiKeyService() : null;