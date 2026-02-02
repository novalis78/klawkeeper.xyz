import db from '../db.js';

/**
 * Public keys database operations
 */
const publicKeys = {
  /**
   * Store a public key
   * @param {Object} keyData - Public key information
   * @returns {Promise<string>} - ID of the stored key
   */
  async store(keyData) {
    const { email, publicKey, keyId, fingerprint, name, source, userId } = keyData;
    
    try {
      const query = `
        INSERT INTO public_keys (email, public_key, key_id, fingerprint, name, source, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          public_key = VALUES(public_key),
          key_id = VALUES(key_id),
          name = COALESCE(VALUES(name), name),
          updated_at = CURRENT_TIMESTAMP
      `;
      
      const result = await db.query(query, [
        email.toLowerCase(),
        publicKey,
        keyId,
        fingerprint,
        name || null,
        source || 'manual',
        userId || null
      ]);
      
      return result.insertId;
    } catch (error) {
      console.error('Error storing public key:', error);
      throw error;
    }
  },

  /**
   * Find public key by email
   * @param {string} email - Email address
   * @returns {Promise<Object|null>} - Public key data or null
   */
  async findByEmail(email) {
    try {
      const query = `
        SELECT * FROM public_keys 
        WHERE email = ? 
        ORDER BY trusted DESC, verified DESC, updated_at DESC
        LIMIT 1
      `;
      
      const results = await db.query(query, [email.toLowerCase()]);
      return results[0] || null;
    } catch (error) {
      console.error('Error finding public key by email:', error);
      throw error;
    }
  },

  /**
   * Find all public keys for an email
   * @param {string} email - Email address
   * @returns {Promise<Array>} - Array of public keys
   */
  async findAllByEmail(email) {
    try {
      const query = `
        SELECT * FROM public_keys 
        WHERE email = ? 
        ORDER BY trusted DESC, verified DESC, updated_at DESC
      `;
      
      const results = await db.query(query, [email.toLowerCase()]);
      return results;
    } catch (error) {
      console.error('Error finding public keys by email:', error);
      throw error;
    }
  },

  /**
   * Find public key by fingerprint
   * @param {string} fingerprint - Key fingerprint
   * @returns {Promise<Object|null>} - Public key data or null
   */
  async findByFingerprint(fingerprint) {
    try {
      const query = 'SELECT * FROM public_keys WHERE fingerprint = ? LIMIT 1';
      const results = await db.query(query, [fingerprint]);
      return results[0] || null;
    } catch (error) {
      console.error('Error finding public key by fingerprint:', error);
      throw error;
    }
  },

  /**
   * Mark a key as verified
   * @param {string} fingerprint - Key fingerprint
   * @returns {Promise<boolean>} - Success status
   */
  async markVerified(fingerprint) {
    try {
      const query = 'UPDATE public_keys SET verified = TRUE WHERE fingerprint = ?';
      const result = await db.query(query, [fingerprint]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error marking key as verified:', error);
      throw error;
    }
  },

  /**
   * Mark a key as trusted
   * @param {string} fingerprint - Key fingerprint
   * @returns {Promise<boolean>} - Success status
   */
  async markTrusted(fingerprint) {
    try {
      const query = 'UPDATE public_keys SET trusted = TRUE WHERE fingerprint = ?';
      const result = await db.query(query, [fingerprint]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error marking key as trusted:', error);
      throw error;
    }
  },

  /**
   * Delete a public key
   * @param {string} fingerprint - Key fingerprint
   * @returns {Promise<boolean>} - Success status
   */
  async delete(fingerprint) {
    try {
      const query = 'DELETE FROM public_keys WHERE fingerprint = ?';
      const result = await db.query(query, [fingerprint]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting public key:', error);
      throw error;
    }
  }
};

export default publicKeys;