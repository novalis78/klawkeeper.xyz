/**
 * Polygon Payment Service
 * Handles USDC payments on Polygon network
 */

import { BasePaymentService } from './BasePaymentService.js';

export class PolygonPaymentService extends BasePaymentService {
  constructor(config = {}) {
    super(config);
    this.blockchain = 'polygon';
    this.nativeToken = 'MATIC';
    this.paymentAddress = process.env.POLYGON_PAYMENT_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

    // USDC contract on Polygon
    this.usdcContract = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';

    // Polygonscan API (free tier)
    this.apiKey = process.env.POLYGONSCAN_API_KEY || 'YourApiKeyToken';
    this.apiUrl = 'https://api.polygonscan.com/api';
  }

  /**
   * Get payment address
   */
  getPaymentAddress() {
    return this.paymentAddress;
  }

  /**
   * Get required confirmations (128 blocks ~2-3 minutes on Polygon)
   */
  getRequiredConfirmations() {
    return 128;
  }

  /**
   * Get estimated confirmation time
   */
  getConfirmationTime() {
    return '2-3 minutes';
  }

  /**
   * Get estimated gas fee
   */
  getEstimatedFee() {
    return '~$0.01';
  }

  /**
   * Get blockchain explorer URL
   */
  getExplorerUrl(address) {
    return `https://polygonscan.com/address/${address}`;
  }

  /**
   * Format amount for display
   */
  formatAmount(amount) {
    // USDC has 6 decimals
    return (amount / 1000000).toFixed(2);
  }

  /**
   * Convert USD to USDC (1:1 for stablecoins)
   */
  async convertUsdToToken(usd) {
    // USDC is 1:1 with USD
    // Return in smallest unit (6 decimals)
    return {
      amount: usd,
      amountSmallestUnit: Math.floor(usd * 1000000),
      token: 'USDC',
      contract: this.usdcContract
    };
  }

  /**
   * Check payment status using Polygonscan API
   */
  async checkPaymentStatus(address, requiredAmount, options = {}) {
    try {
      // Get USDC token transfers to our address
      const url = `${this.apiUrl}?module=account&action=tokentx&contractaddress=${this.usdcContract}&address=${address}&page=1&offset=100&sort=desc&apikey=${this.apiKey}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== '1') {
        return {
          totalReceived: 0,
          totalReceivedSmallestUnit: 0,
          confirmations: 0,
          isPaid: false,
          isConfirmed: false,
          transactions: []
        };
      }

      // Filter transactions to our payment address
      const relevantTxs = data.result.filter(tx =>
        tx.to.toLowerCase() === this.paymentAddress.toLowerCase()
      );

      if (relevantTxs.length === 0) {
        return {
          totalReceived: 0,
          totalReceivedSmallestUnit: 0,
          confirmations: 0,
          isPaid: false,
          isConfirmed: false,
          transactions: []
        };
      }

      // Sum up all USDC received
      let totalReceivedSmallestUnit = 0;
      let minConfirmations = Infinity;

      // Get current block number
      const blockResponse = await fetch(`${this.apiUrl}?module=proxy&action=eth_blockNumber&apikey=${this.apiKey}`);
      const blockData = await blockResponse.json();
      const currentBlock = parseInt(blockData.result, 16);

      for (const tx of relevantTxs) {
        totalReceivedSmallestUnit += parseInt(tx.value);
        const txBlock = parseInt(tx.blockNumber);
        const txConfirmations = currentBlock - txBlock + 1;
        minConfirmations = Math.min(minConfirmations, txConfirmations);
      }

      const totalReceived = totalReceivedSmallestUnit / 1000000; // Convert from 6 decimals
      const requiredWithTolerance = requiredAmount * 0.95; // 5% tolerance
      const isPaid = totalReceivedSmallestUnit >= requiredWithTolerance;
      const isConfirmed = isPaid && minConfirmations >= this.getRequiredConfirmations();

      return {
        totalReceived,
        totalReceivedSmallestUnit,
        confirmations: minConfirmations === Infinity ? 0 : minConfirmations,
        isPaid,
        isConfirmed,
        transactions: relevantTxs.map(tx => ({
          hash: tx.hash,
          amount: parseInt(tx.value) / 1000000,
          blockNumber: parseInt(tx.blockNumber),
          timestamp: new Date(parseInt(tx.timeStamp) * 1000).toISOString()
        }))
      };
    } catch (error) {
      console.error('Error checking Polygon payment status:', error);
      throw new Error(`Failed to verify payment: ${error.message}`);
    }
  }

  /**
   * Get pricing with Polygon-specific information
   */
  async getPricing(credits) {
    const basePricing = await super.getPricing(credits);
    const tokenInfo = await this.convertUsdToToken(basePricing.usd);

    return {
      ...basePricing,
      blockchain: this.blockchain,
      token: 'USDC',
      amount: tokenInfo.amount,
      amountSmallestUnit: tokenInfo.amountSmallestUnit,
      contract: tokenInfo.contract,
      decimals: 6,
      paymentAddress: this.getPaymentAddress(),
      requiredConfirmations: this.getRequiredConfirmations(),
      estimatedTime: this.getConfirmationTime(),
      estimatedFee: this.getEstimatedFee(),
      explorerUrl: this.getExplorerUrl(this.getPaymentAddress())
    };
  }
}
