# Multi-Chain Payment Support

## Overview

KeyKeeper now supports payments across **4 blockchains**, allowing AI agents to choose their preferred payment method based on their wallet capabilities and preferences.

## Supported Blockchains

### 1. **Polygon (USDC)** ⭐ RECOMMENDED
- **Token:** USDC (stablecoin)
- **Gas Fee:** ~$0.01
- **Confirmation Time:** 2-3 minutes (128 confirmations)
- **Why Choose:** Cheapest gas fees + stable pricing (1 USDC = $1)
- **Best For:** Cost-conscious agents, most agents

### 2. **Ethereum (USDC)**
- **Token:** USDC (stablecoin)
- **Gas Fee:** $5-$50 (varies with network congestion)
- **Confirmation Time:** 3-5 minutes (12 confirmations)
- **Why Choose:** Highest liquidity, most common
- **Best For:** Agents that only have Ethereum wallets
- **⚠️ Warning:** Gas fees can be very high!

### 3. **Solana (USDC)** ⚐ FASTEST
- **Token:** USDC (stablecoin)
- **Gas Fee:** ~$0.001
- **Confirmation Time:** 30-60 seconds (32 confirmations)
- **Why Choose:** Fastest confirmations, ultra-cheap
- **Best For:** Agents that need immediate credit top-ups

### 4. **Bitcoin (BTC)**
- **Token:** BTC (native cryptocurrency)
- **Gas Fee:** $1-$10
- **Confirmation Time:** 30-60 minutes (3 confirmations)
- **Why Choose:** Most decentralized, most trustless
- **Best For:** Bitcoin-only agents
- **⚠️ Note:** Price volatility - BTC amount varies with market price

## Pricing (All Chains)

| Credits | USD  | Polygon USDC | Ethereum USDC | Solana USDC | Bitcoin BTC* |
|---------|------|--------------|---------------|-------------|--------------|
| 1,000   | $100 | 100 USDC     | 100 USDC      | 100 USDC    | ~0.001 BTC   |
| 10,000  | $800 | 800 USDC     | 800 USDC      | 800 USDC    | ~0.008 BTC   |
| 100,000 | $5,000 | 5,000 USDC | 5,000 USDC    | 5,000 USDC  | ~0.05 BTC    |

*BTC amounts are dynamic and vary with market price

## How It Works

### For Agents Using MCP

**1. Initiate Payment (Choose Your Chain)**
```javascript
const payment = await mcp.callTool('initiate_payment', {
  credits: 10000,
  blockchain: 'polygon',  // polygon | ethereum | solana | bitcoin
  token: 'USDC'           // Optional: USDC | BTC | ETH | SOL | MATIC
});

// Response includes:
// - Payment address
// - Amount to send
// - Contract address (for tokens)
// - Estimated fees and time
// - Instructions
// - All available chains for comparison
```

**2. Send Payment**
```javascript
// Agent sends crypto to the provided address
await wallet.sendUSDC(
  payment.paymentAddress,
  payment.amount,
  {
    network: 'polygon',
    contract: payment.contract
  }
);
```

**3. Monitor Status**
```javascript
// Poll until confirmed
let confirmed = false;
while (!confirmed) {
  const status = await mcp.callTool('check_payment_status', {
    paymentToken: payment.paymentToken
  });

  confirmed = status.canClaim;
  if (!confirmed) {
    await sleep(60000); // Wait 1 minute
  }
}
```

**4. Claim Credits**
```javascript
const claim = await mcp.callTool('claim_credits', {
  paymentToken: payment.paymentToken,
  apiKey: yourApiKey
});

console.log(`Claimed ${claim.credits} credits!`);
```

### For Agents Using REST API

**Same flow, different endpoint format:**

```bash
# 1. Initiate
POST /api/v1/agent/payment
{
  "credits": 10000,
  "blockchain": "polygon",
  "token": "USDC"
}

# 2. Check Status
GET /api/v1/agent/payment/status/:token

# 3. Claim
POST /api/v1/agent/payment/claim/:token
```

## Technical Implementation

### Payment Verification

Each blockchain uses its own verification method:

**Polygon & Ethereum:**
- Uses Polygonscan/Etherscan API (free tier)
- Monitors ERC-20 USDC transfers to our address
- Checks confirmations via current block number
- 5% tolerance for gas fee variations

**Solana:**
- Uses public Solana RPC endpoints
- Queries SPL token account for USDC balance
- Checks transaction signatures for confirmations
- 5% tolerance

**Bitcoin:**
- Uses mempool.space API (no API key required)
- Deterministic address generation from payment token
- Monitors UTXOs at generated address
- 5% tolerance

### Database Schema

```sql
crypto_payments table:
- blockchain VARCHAR(20)        -- bitcoin, ethereum, polygon, solana
- token_symbol VARCHAR(10)      -- BTC, USDC, ETH, SOL
- transaction_hash VARCHAR(255) -- For verification
- amount_tokens DECIMAL(20,8)   -- Amount in smallest unit
- contract_address VARCHAR(255) -- Token contract (ERC-20/SPL)
- network_confirmations INT     -- Required confirmations
```

### Service Architecture

```
MultiChainPaymentService (unified interface)
├── BitcoinPaymentService
│   └── mempool.space API
├── PolygonPaymentService
│   └── Polygonscan API
├── EthereumPaymentService
│   └── Etherscan API
└── SolanaPaymentService
    └── Solana RPC
```

## Environment Variables Required

```bash
# Payment Addresses
POLYGON_PAYMENT_ADDRESS=0xYourPolygonWallet...
ETHEREUM_PAYMENT_ADDRESS=0xYourEthereumWallet...
SOLANA_PAYMENT_ADDRESS=YourSolanaWallet...
BITCOIN_XPUB=xpub... (for deterministic addresses)

# API Keys (optional but recommended)
POLYGONSCAN_API_KEY=YourApiKey
ETHERSCAN_API_KEY=YourApiKey
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com (or paid service)

# Bitcoin uses public mempool.space (no key needed)
```

## Agent Decision Tree

```
Agent needs to pay for credits
│
├─ Has Polygon wallet?
│  └─ YES → Use Polygon (cheapest + fast)
│
├─ Has Solana wallet?
│  └─ YES → Use Solana (fastest + ultra-cheap)
│
├─ Has Ethereum wallet?
│  └─ YES → Use Ethereum (check gas fees first!)
│
└─ Has Bitcoin wallet?
   └─ YES → Use Bitcoin (slower but works)
```

## Migration Path

**From Bitcoin-only to Multi-chain:**

1. ✅ **Already Done:**
   - Multi-chain payment services created
   - MCP endpoints updated
   - Database schema updated

2. ⏳ **Next Steps:**
   - Run migration: `migrations/002_add_multichain_support.sql`
   - Set environment variables for wallet addresses
   - Get API keys for Polygonscan/Etherscan (free tier)
   - Test payment flow on each chain

3. 📝 **Documentation:**
   - Update REST API docs
   - Update MCP docs
   - Add chain comparison guide
   - Create troubleshooting guide

## Testing

### Test on Testnets First

Before accepting real payments, test on testnets:

- **Polygon Mumbai** (testnet)
- **Ethereum Goerli** (testnet)
- **Solana Devnet** (testnet)
- **Bitcoin Testnet** (testnet)

### Test Flow
1. Agent initiates payment on testnet
2. Send testnet tokens
3. Verify detection and confirmation
4. Verify credit issuance
5. Repeat for each chain

## Troubleshooting

### Payment Not Detected

**Polygon/Ethereum:**
- Check correct network (mainnet vs testnet)
- Verify USDC contract address
- Check Polygonscan/Etherscan API key
- Ensure sent to correct address

**Solana:**
- Check correct network (mainnet-beta vs devnet)
- Verify USDC mint address
- Check RPC endpoint connectivity
- Ensure SPL token transfer

**Bitcoin:**
- Check correct network (mainnet vs testnet)
- Verify sent to generated address
- Wait for mempool propagation
- Check mempool.space for transaction

### Confirmations Slow

| Chain | Expected | If Slower |
|-------|----------|-----------|
| Polygon | 2-3 min | Check for network congestion |
| Ethereum | 3-5 min | High gas = priority |
| Solana | 30-60 sec | Rarely slow |
| Bitcoin | 30-60 min | Normal, wait for blocks |

## Future Enhancements

1. **More Chains:**
   - Arbitrum (L2 for Ethereum)
   - Optimism (L2 for Ethereum)
   - Base (Coinbase L2)
   - Avalanche C-Chain

2. **More Tokens:**
   - Native tokens (ETH, SOL, MATIC)
   - Other stablecoins (USDT, DAI)
   - Wrapped tokens (WBTC)

3. **Payment Options:**
   - Lightning Network for Bitcoin
   - Cross-chain swaps
   - Fiat on-ramps

## Summary

**KeyKeeper now offers the most flexible payment system for AI agents:**

✅ **4 blockchains** - Polygon, Ethereum, Solana, Bitcoin
✅ **Stablecoins** - USDC for predictable pricing
✅ **Self-service** - No payment processor, blockchain is source of truth
✅ **Agent-friendly** - Choose based on wallet and preferences
✅ **Well-documented** - Clear instructions per chain
✅ **Cost-effective** - Options from $0.001 to $50 in fees

**Agents with any web3 wallet can now autonomously pay for KeyKeeper email services!** 🚀
