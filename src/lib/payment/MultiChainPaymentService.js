/**
 * Multi-Chain Payment Service
 * Unified interface for all blockchain payment services
 */

import { BitcoinPaymentService } from './bitcoinService.js';
import { PolygonPaymentService } from './PolygonPaymentService.js';
import { EthereumPaymentService } from './EthereumPaymentService.js';
import { SolanaPaymentService } from './SolanaPaymentService.js';

export class MultiChainPaymentService {
  constructor() {
    // Initialize all payment services
    this.services = {
      bitcoin: new BitcoinPaymentService(),
      polygon: new PolygonPaymentService(),
      ethereum: new EthereumPaymentService(),
      solana: new SolanaPaymentService()
    };

    // Default chain (cheapest and fastest)
    this.defaultChain = 'polygon';
  }

  /**
   * Get available blockchains
   */
  getAvailableChains() {
    return [
      {
        id: 'polygon',
        name: 'Polygon',
        token: 'USDC',
        fee: '~$0.01',
        time: '2-3 minutes',
        recommended: true,
        reason: 'Cheapest gas fees and stable pricing'
      },
      {
        id: 'ethereum',
        name: 'Ethereum',
        token: 'USDC',
        fee: '$5-$50',
        time: '3-5 minutes',
        recommended: false,
        reason: 'High liquidity but expensive gas',
        warning: 'Gas fees can be very high'
      },
      {
        id: 'solana',
        name: 'Solana',
        token: 'USDC',
        fee: '~$0.001',
        time: '30-60 seconds',
        recommended: true,
        reason: 'Fastest confirmations and cheapest fees'
      },
      {
        id: 'bitcoin',
        name: 'Bitcoin',
        token: 'BTC',
        fee: '$1-$10',
        time: '30-60 minutes',
        recommended: false,
        reason: 'Most decentralized but slower',
        note: 'Price volatility - amount varies with BTC price'
      }
    ];
  }

  /**
   * Get service for a specific blockchain
   */
  getService(blockchain) {
    const service = this.services[blockchain];
    if (!service) {
      throw new Error(`Unsupported blockchain: ${blockchain}. Supported: ${Object.keys(this.services).join(', ')}`);
    }
    return service;
  }

  /**
   * Get recommended blockchain for payment
   */
  getRecommendedChain() {
    return this.defaultChain;
  }

  /**
   * Initiate payment on specified blockchain
   */
  async initiatePayment(credits, blockchain = null) {
    // Use recommended chain if not specified
    if (!blockchain) {
      blockchain = this.getRecommendedChain();
    }

    const service = this.getService(blockchain);
    const pricing = await service.getPricing(credits);
    const paymentToken = service.generatePaymentToken();

    return {
      paymentToken,
      blockchain,
      ...pricing,
      availableChains: this.getAvailableChains()
    };
  }

  /**
   * Check payment status on blockchain
   */
  async checkPaymentStatus(paymentToken, blockchain, paymentAddress, requiredAmount) {
    const service = this.getService(blockchain);

    try {
      const status = await service.checkPaymentStatus(
        paymentAddress,
        requiredAmount
      );

      return {
        blockchain,
        paymentToken,
        paymentAddress,
        ...status
      };
    } catch (error) {
      console.error(`Error checking ${blockchain} payment:`, error);
      throw error;
    }
  }

  /**
   * Get pricing for all chains (for comparison)
   */
  async getPricingAllChains(credits) {
    const results = {};

    for (const [chain, service] of Object.entries(this.services)) {
      try {
        results[chain] = await service.getPricing(credits);
      } catch (error) {
        console.error(`Error getting ${chain} pricing:`, error);
        results[chain] = { error: error.message };
      }
    }

    return results;
  }

  /**
   * Validate blockchain and token combination
   */
  validatePaymentMethod(blockchain, token) {
    const service = this.getService(blockchain);

    // Validate that the token is supported on this blockchain
    const validCombinations = {
      bitcoin: ['BTC'],
      polygon: ['USDC', 'MATIC'],
      ethereum: ['USDC', 'ETH'],
      solana: ['USDC', 'SOL']
    };

    const validTokens = validCombinations[blockchain];
    if (!validTokens || !validTokens.includes(token)) {
      throw new Error(
        `Invalid token ${token} for ${blockchain}. Valid tokens: ${validTokens?.join(', ') || 'none'}`
      );
    }

    return true;
  }

  /**
   * Get payment instructions for agent
   */
  getPaymentInstructions(blockchain, paymentAddress, amount, token, paymentToken) {
    const service = this.getService(blockchain);

    const baseInstructions = [
      `Send ${amount} ${token} to ${paymentAddress}`,
      `Network: ${blockchain.charAt(0).toUpperCase() + blockchain.slice(1)}`,
      `Estimated fee: ${service.getEstimatedFee()}`,
      `Estimated time: ${service.getConfirmationTime()}`,
      `Required confirmations: ${service.getRequiredConfirmations()}`,
      `Check status with payment token: ${paymentToken}`
    ];

    // Add blockchain-specific instructions
    if (blockchain === 'polygon' || blockchain === 'ethereum') {
      baseInstructions.push(
        `Token contract: ${token === 'USDC' ? service.usdcContract : 'native'}`
      );
    } else if (blockchain === 'solana') {
      baseInstructions.push(
        `USDC Mint: ${service.usdcMint}`
      );
    }

    // Add warnings
    if (blockchain === 'ethereum') {
      baseInstructions.push(
        'WARNING: Ethereum gas fees can be high ($5-$50). Consider using Polygon for lower fees.'
      );
    }

    return baseInstructions;
  }
}
