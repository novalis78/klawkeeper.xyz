/**
 * Solana Payment Service
 * Handles USDC payments on Solana network
 */

import { BasePaymentService } from './BasePaymentService.js';

export class SolanaPaymentService extends BasePaymentService {
  constructor(config = {}) {
    super(config);
    this.blockchain = 'solana';
    this.nativeToken = 'SOL';
    this.paymentAddress = process.env.SOLANA_PAYMENT_ADDRESS || 'Your-Solana-Wallet-Address';

    // USDC SPL token mint address on Solana
    this.usdcMint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

    // Solana RPC endpoint (can use public or Helius/Alchemy)
    this.rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
  }

  /**
   * Get payment address
   */
  getPaymentAddress() {
    return this.paymentAddress;
  }

  /**
   * Get required confirmations (32 ~30 seconds on Solana)
   */
  getRequiredConfirmations() {
    return 32;
  }

  /**
   * Get estimated confirmation time
   */
  getConfirmationTime() {
    return '30-60 seconds';
  }

  /**
   * Get estimated gas fee
   */
  getEstimatedFee() {
    return '~$0.001';
  }

  /**
   * Get blockchain explorer URL
   */
  getExplorerUrl(address) {
    return `https://explorer.solana.com/address/${address}`;
  }

  /**
   * Format amount for display
   */
  formatAmount(amount) {
    // USDC has 6 decimals on Solana
    return (amount / 1000000).toFixed(2);
  }

  /**
   * Convert USD to USDC (1:1 for stablecoins)
   */
  async convertUsdToToken(usd) {
    // USDC is 1:1 with USD
    // Return in smallest unit (6 decimals on Solana)
    return {
      amount: usd,
      amountSmallestUnit: Math.floor(usd * 1000000),
      token: 'USDC',
      mint: this.usdcMint
    };
  }

  /**
   * Check payment status using Solana RPC
   */
  async checkPaymentStatus(address, requiredAmount, options = {}) {
    try {
      // Get token account for USDC
      const response = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getTokenAccountsByOwner',
          params: [
            address,
            {
              mint: this.usdcMint
            },
            {
              encoding: 'jsonParsed'
            }
          ]
        })
      });

      const data = await response.json();

      if (!data.result || !data.result.value || data.result.value.length === 0) {
        return {
          totalReceived: 0,
          totalReceivedSmallestUnit: 0,
          confirmations: 0,
          isPaid: false,
          isConfirmed: false,
          transactions: []
        };
      }

      // Get the token account balance
      const tokenAccount = data.result.value[0];
      const balance = tokenAccount.account.data.parsed.info.tokenAmount;
      const totalReceivedSmallestUnit = parseInt(balance.amount);
      const totalReceived = totalReceivedSmallestUnit / 1000000;

      // Get current slot for confirmation check
      const slotResponse = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getSlot'
        })
      });

      const slotData = await slotResponse.json();
      const currentSlot = slotData.result;

      // Get transaction signatures for this account
      const signaturesResponse = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getSignaturesForAddress',
          params: [
            tokenAccount.pubkey,
            {
              limit: 10
            }
          ]
        })
      });

      const signaturesData = await signaturesResponse.json();
      const signatures = signaturesData.result || [];

      // Calculate minimum confirmations
      let minConfirmations = Infinity;
      if (signatures.length > 0) {
        for (const sig of signatures) {
          if (sig.slot) {
            const confirmations = currentSlot - sig.slot + 1;
            minConfirmations = Math.min(minConfirmations, confirmations);
          }
        }
      }

      if (minConfirmations === Infinity) {
        minConfirmations = 0;
      }

      const requiredWithTolerance = requiredAmount * 0.95; // 5% tolerance
      const isPaid = totalReceivedSmallestUnit >= requiredWithTolerance;
      const isConfirmed = isPaid && minConfirmations >= this.getRequiredConfirmations();

      return {
        totalReceived,
        totalReceivedSmallestUnit,
        confirmations: minConfirmations,
        isPaid,
        isConfirmed,
        transactions: signatures.map(sig => ({
          signature: sig.signature,
          slot: sig.slot,
          timestamp: sig.blockTime ? new Date(sig.blockTime * 1000).toISOString() : null,
          confirmations: sig.slot ? currentSlot - sig.slot + 1 : 0
        }))
      };
    } catch (error) {
      console.error('Error checking Solana payment status:', error);
      throw new Error(`Failed to verify payment: ${error.message}`);
    }
  }

  /**
   * Get pricing with Solana-specific information
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
      mint: tokenInfo.mint,
      decimals: 6,
      paymentAddress: this.getPaymentAddress(),
      requiredConfirmations: this.getRequiredConfirmations(),
      estimatedTime: this.getConfirmationTime(),
      estimatedFee: this.getEstimatedFee(),
      explorerUrl: this.getExplorerUrl(this.getPaymentAddress())
    };
  }
}
