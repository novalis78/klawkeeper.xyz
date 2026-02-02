/**
 * Bitcoin Payment Service
 *
 * Self-service payment system for AI agents
 * - Generates deterministic BTC addresses
 * - Verifies payments via mempool.space API
 * - No payment gateway needed!
 */

import crypto from 'crypto';

export class BitcoinPaymentService {
  constructor() {
    // XPUB for deterministic address generation
    // TODO: Replace with your actual XPUB in production
    this.xpub = process.env.BITCOIN_XPUB || 'xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiKrhko4egpiMZbpiaQL2jkwSB1icqYh2cfDfVxdx4df189oLKnC5fSwqPfgyP3hooxujYzAu3fDVmz';

    // Pricing in USD
    this.pricingTiers = {
      1000: { usd: 100, credits: 1000 },
      10000: { usd: 800, credits: 10000 },
      100000: { usd: 5000, credits: 100000 }
    };

    // Current BTC price (will be fetched)
    this.btcPriceUSD = 0;
  }

  /**
   * Generate a unique payment token for tracking
   */
  generatePaymentToken() {
    return `pmt_${crypto.randomBytes(32).toString('hex')}`;
  }

  /**
   * Generate deterministic Bitcoin address from payment token
   * Uses a simpler approach than BIP32 for now
   */
  generateBitcoinAddress(paymentToken) {
    // Create deterministic hash from token
    const hash = crypto
      .createHash('sha256')
      .update(`${this.xpub}-${paymentToken}`)
      .digest('hex');

    // For now, return a deterministic address format
    // In production, use proper BIP32 derivation
    const address = `1${hash.substring(0, 33)}`;

    return address;
  }

  /**
   * Fetch current Bitcoin price from mempool.space
   */
  async fetchBitcoinPrice() {
    try {
      const response = await fetch('https://mempool.space/api/v1/prices');
      if (!response.ok) {
        throw new Error(`Failed to fetch BTC price: ${response.status}`);
      }

      const data = await response.json();
      this.btcPriceUSD = data.USD;

      console.log(`[BitcoinService] Current BTC price: $${this.btcPriceUSD}`);
      return this.btcPriceUSD;
    } catch (error) {
      console.error('[BitcoinService] Error fetching BTC price:', error);
      // Return cached price or default
      return this.btcPriceUSD || 100000; // Default fallback
    }
  }

  /**
   * Calculate BTC amount required for a credit tier
   */
  async calculateBtcAmount(credits) {
    // Get current BTC price
    if (this.btcPriceUSD === 0) {
      await this.fetchBitcoinPrice();
    }

    // Find pricing tier
    const tier = this.pricingTiers[credits];
    if (!tier) {
      throw new Error('Invalid credit amount');
    }

    const btcAmount = tier.usd / this.btcPriceUSD;
    const sats = Math.ceil(btcAmount * 100000000);

    return {
      credits: tier.credits,
      usd: tier.usd,
      btc: btcAmount,
      sats
    };
  }

  /**
   * Check payment status for an address via mempool.space API
   */
  async checkPaymentStatus(address, requiredSats) {
    try {
      console.log(`[BitcoinService] Checking payment for address: ${address}`);

      const response = await fetch(`https://mempool.space/api/address/${address}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch address info: ${response.status}`);
      }

      const data = await response.json();

      // Calculate total received (confirmed + unconfirmed)
      const confirmedReceived = data.chain_stats.funded_txo_sum;
      const confirmedSpent = data.chain_stats.spent_txo_sum;
      const pendingReceived = data.mempool_stats.funded_txo_sum;
      const pendingSpent = data.mempool_stats.spent_txo_sum;

      const totalReceivedSats = confirmedReceived + pendingReceived - confirmedSpent - pendingSpent;
      const confirmedSats = confirmedReceived - confirmedSpent;

      console.log(`[BitcoinService] Payment status:
        Confirmed: ${confirmedSats} sats
        Pending: ${pendingReceived - pendingSpent} sats
        Total: ${totalReceivedSats} sats
        Required: ${requiredSats} sats
      `);

      // Allow 5% tolerance
      const lowerBound = Math.floor(requiredSats * 0.95);

      return {
        address,
        totalReceivedSats,
        confirmedSats,
        pendingSats: pendingReceived - pendingSpent,
        requiredSats,
        isPaid: totalReceivedSats >= lowerBound,
        isConfirmed: confirmedSats >= lowerBound,
        confirmations: data.chain_stats.tx_count,
        percentPaid: (totalReceivedSats / requiredSats) * 100
      };
    } catch (error) {
      console.error('[BitcoinService] Error checking payment:', error);
      throw error;
    }
  }

  /**
   * Get transactions for an address
   */
  async getAddressTransactions(address) {
    try {
      const response = await fetch(`https://mempool.space/api/address/${address}/txs`);
      if (!response.ok) {
        throw new Error(`Failed to fetch transactions: ${response.status}`);
      }

      const transactions = await response.json();
      return transactions;
    } catch (error) {
      console.error('[BitcoinService] Error fetching transactions:', error);
      return [];
    }
  }
}

export default new BitcoinPaymentService();
