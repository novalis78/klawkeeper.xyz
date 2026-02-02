/**
 * Base Payment Service
 * Abstract class defining the interface for all blockchain payment services
 */

export class BasePaymentService {
  constructor(config = {}) {
    this.config = config;
    this.blockchain = 'unknown';
    this.nativeToken = 'UNKNOWN';
  }

  /**
   * Get pricing for credits in various tokens
   * @param {number} credits - Number of credits to purchase
   * @returns {Promise<Object>} - Pricing information
   */
  async getPricing(credits) {
    const PRICING_TIERS = {
      1000: { usd: 100, credits: 1000 },
      10000: { usd: 800, credits: 10000 },
      100000: { usd: 5000, credits: 100000 }
    };

    const tier = PRICING_TIERS[credits];
    if (!tier) {
      throw new Error('Invalid credit amount. Must be 1000, 10000, or 100000');
    }

    return tier;
  }

  /**
   * Get payment address for receiving payments
   * @returns {string} - Payment address
   */
  getPaymentAddress() {
    throw new Error('getPaymentAddress must be implemented by subclass');
  }

  /**
   * Generate a payment token for tracking
   * @returns {string} - Payment token
   */
  generatePaymentToken() {
    const crypto = require('crypto');
    return `pmt_${crypto.randomBytes(32).toString('hex')}`;
  }

  /**
   * Check payment status on blockchain
   * @param {string} address - Payment address
   * @param {number} requiredAmount - Required amount in smallest unit
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Payment status
   */
  async checkPaymentStatus(address, requiredAmount, options = {}) {
    throw new Error('checkPaymentStatus must be implemented by subclass');
  }

  /**
   * Get required confirmations for this blockchain
   * @returns {number} - Number of confirmations required
   */
  getRequiredConfirmations() {
    throw new Error('getRequiredConfirmations must be implemented by subclass');
  }

  /**
   * Get estimated confirmation time
   * @returns {string} - Human-readable time estimate
   */
  getConfirmationTime() {
    throw new Error('getConfirmationTime must be implemented by subclass');
  }

  /**
   * Get estimated gas/transaction fee
   * @returns {string} - Human-readable fee estimate
   */
  getEstimatedFee() {
    throw new Error('getEstimatedFee must be implemented by subclass');
  }

  /**
   * Get blockchain explorer URL
   * @param {string} address - Address to view
   * @returns {string} - Explorer URL
   */
  getExplorerUrl(address) {
    throw new Error('getExplorerUrl must be implemented by subclass');
  }

  /**
   * Format amount for display
   * @param {number} amount - Amount in smallest unit
   * @returns {string} - Formatted amount
   */
  formatAmount(amount) {
    throw new Error('formatAmount must be implemented by subclass');
  }

  /**
   * Convert USD to token amount
   * @param {number} usd - USD amount
   * @returns {Promise<number>} - Token amount
   */
  async convertUsdToToken(usd) {
    throw new Error('convertUsdToToken must be implemented by subclass');
  }
}
