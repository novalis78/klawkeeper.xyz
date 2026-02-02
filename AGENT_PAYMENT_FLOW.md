# Agent Payment Flow

KeyKeeper.world's self-service Bitcoin payment system - inspired by secure-mail-client's ingenious payment gateway!

## How It Works

**No payment gateway, no intermediaries, no fees!** Just Bitcoin and the blockchain.

### For Agents (Autonomous Operation)

```javascript
// 1. INITIATE PAYMENT
// Agent discovers service and requests payment details
const paymentRequest = await fetch('https://keykeeper.world/api/v1/agent/payment', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    credits: 10000  // Options: 1000, 10000, 100000
  })
});

const payment = await paymentRequest.json();
// Returns:
// {
//   paymentToken: "pmt_abc123...",
//   bitcoinAddress: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
//   amount: {
//     credits: 10000,
//     usd: 800,
//     btc: 0.008,
//     sats: 800000
//   },
//   statusUrl: "/v1/agent/payment/status/pmt_abc123...",
//   claimUrl: "/v1/agent/payment/claim/pmt_abc123..."
// }

// 2. SEND BITCOIN
// Agent sends BTC to the provided address
// (Implementation depends on agent's Bitcoin wallet integration)

// 3. POLL PAYMENT STATUS
// Agent checks payment status every 5-10 minutes
const checkStatus = async () => {
  const status = await fetch(`https://keykeeper.world/api/v1/agent/payment/status/${payment.paymentToken}`);
  const data = await status.json();

  // Returns:
  // {
  //   status: "confirmed" | "pending",
  //   confirmations: 3,
  //   isConfirmed: true,
  //   canClaim: true,
  //   credits: 10000,
  //   message: "Payment confirmed! You can now claim your credits."
  // }

  return data;
};

// Wait for confirmations (typically 30-60 minutes)
let paymentConfirmed = false;
while (!paymentConfirmed) {
  const status = await checkStatus();
  paymentConfirmed = status.isConfirmed;

  if (!paymentConfirmed) {
    await new Promise(resolve => setTimeout(resolve, 300000)); // Wait 5 minutes
  }
}

// 4. CLAIM CREDITS
// Once confirmed, agent claims credits
// Option A: Create new account with credits
const claimResponse = await fetch(`https://keykeeper.world/api/v1/agent/payment/claim/${payment.paymentToken}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    agentId: 'my-agent-id'  // Optional identifier
  })
});

const result = await claimResponse.json();
// Returns:
// {
//   success: true,
//   credits: 10000,
//   apiKey: "kk_abc123...",  // NEW API KEY!
//   email: "agent-my-agent-id@keykeeper.world",
//   message: "Successfully claimed 10000 credits. New agent account created.",
//   note: "Store your API key securely - it cannot be retrieved later"
// }

// 5. USE EMAIL SERVICE
// Agent can now send emails!
const sendEmail = await fetch('https://keykeeper.world/api/v1/agent/send', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${result.apiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    to: 'user@example.com',
    subject: 'Hello from AI Agent',
    body: 'This email was sent autonomously!'
  })
});
```

### Option B: Add Credits to Existing Account

If the agent already has an API key and wants to add more credits:

```javascript
// During claim step, provide existing API key
const claimResponse = await fetch(`https://keykeeper.world/api/v1/agent/payment/claim/${payment.paymentToken}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    apiKey: 'kk_existing_key...'  // Existing API key
  })
});
```

## Technical Details

### Payment Verification

- Uses **mempool.space API** to verify Bitcoin transactions
- Requires **3+ confirmations** for security
- Allows **5% tolerance** in payment amount (for fee fluctuations)
- Checks both confirmed and pending transactions

### Address Generation

- Addresses are **deterministically generated** from payment token
- Uses XPUB (extended public key) + token hash
- Each payment gets a unique address
- Can be verified independently via blockchain explorers

### Security

- No private keys on server (we only have XPUB)
- Payment tokens are cryptographically random
- Credits can only be claimed once per payment
- All transactions logged for audit trail

## Pricing Tiers

| Credits | USD Price | BTC Price* | Cost per Email |
|---------|-----------|------------|----------------|
| 1,000   | $100      | ~0.001 BTC | ~$0.10         |
| 10,000  | $800      | ~0.008 BTC | ~$0.08         |
| 100,000 | $5,000    | ~0.05 BTC  | ~$0.05         |

*BTC prices are dynamic and fetched from mempool.space

## Example: Complete Agent Flow

```javascript
class EmailAgent {
  constructor() {
    this.baseUrl = 'https://keykeeper.world';
    this.apiKey = null;
  }

  async purchaseCredits(credits) {
    // Step 1: Initiate payment
    const payment = await this.initiatePayment(credits);
    console.log(`Send ${payment.amount.btc} BTC to ${payment.bitcoinAddress}`);

    // Step 2: Wait for user/agent to send BTC
    // (This would integrate with agent's Bitcoin wallet)

    // Step 3: Poll for confirmation
    console.log('Waiting for payment confirmation...');
    await this.waitForConfirmation(payment.paymentToken);

    // Step 4: Claim credits
    const result = await this.claimCredits(payment.paymentToken);
    this.apiKey = result.apiKey;

    console.log(`Success! Got ${result.credits} credits and API key`);
    return result;
  }

  async initiatePayment(credits) {
    const res = await fetch(`${this.baseUrl}/api/v1/agent/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credits })
    });
    return res.json();
  }

  async waitForConfirmation(token) {
    while (true) {
      const status = await fetch(`${this.baseUrl}/api/v1/agent/payment/status/${token}`);
      const data = await status.json();

      if (data.isConfirmed) {
        return true;
      }

      console.log(`Status: ${data.message} (${data.confirmations} confirmations)`);
      await new Promise(resolve => setTimeout(resolve, 300000)); // 5 min
    }
  }

  async claimCredits(token) {
    const res = await fetch(`${this.baseUrl}/api/v1/agent/payment/claim/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: 'my-agent' })
    });
    return res.json();
  }

  async sendEmail(to, subject, body) {
    const res = await fetch(`${this.baseUrl}/api/v1/agent/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ to, subject, body })
    });
    return res.json();
  }
}

// Usage
const agent = new EmailAgent();
await agent.purchaseCredits(10000);
await agent.sendEmail('user@example.com', 'Test', 'Hello!');
```

## Environment Variables

Set these in your `.env` file:

```bash
# Bitcoin XPUB for payment address generation
BITCOIN_XPUB=xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiKrhko4egpiMZbpiaQL2jkwSB1icqYh2cfDfVxdx4df189oLKnC5fSwqPfgyP3hooxujYzAu3fDVmz

# Database connection
DATABASE_URL=mysql://user:pass@host/database
```

## Why This Approach is Ingenious

1. **No Payment Gateway** - Direct Bitcoin payments, no Stripe/PayPal
2. **Self-Verifying** - Blockchain is the source of truth
3. **Autonomous** - Agents can complete entire flow without humans
4. **Transparent** - All transactions verifiable on-chain
5. **Low Cost** - No gateway fees, just Bitcoin network fees
6. **Privacy** - No credit cards, no KYC (depending on jurisdiction)

## Credits

Payment system inspired by [@novalis78](https://github.com/novalis78)'s secure-mail-client premium service implementation. Brilliant self-service payment gateway design!
