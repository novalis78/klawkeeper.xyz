# Complete Autonomous Agent Lifecycle via MCP

## Overview

KeyKeeper's MCP server provides a **complete autonomous agent lifecycle** - agents can discover, register, pay, and use email services entirely through the Model Context Protocol without any external dependencies or human intervention.

## The Full Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                     AUTONOMOUS AGENT FLOW                        │
└─────────────────────────────────────────────────────────────────┘

1. Discovery (No Auth)
   ↓ GET /.well-known/ai-services.json
   ↓ GET /api/mcp

2. Registration (No Auth)
   ↓ MCP tool: register_agent
   → Returns: API key + email address (0 credits)

3. Payment Initiation (No Auth)
   ↓ MCP tool: initiate_payment
   → Returns: Bitcoin address + payment token

4. Agent Sends Bitcoin
   ↓ (External: agent sends BTC to provided address)

5. Payment Monitoring (No Auth)
   ↓ MCP tool: check_payment_status (poll every 5-10 min)
   → Returns: confirmations, canClaim status

6. Claim Credits (No Auth)
   ↓ MCP tool: claim_credits
   → Credits added to account

7. Email Operations (Requires Auth)
   ↓ MCP tools: send_email, check_inbox, get_email, check_balance
   → Fully functional email agent
```

## Why This Matters

### Traditional Approach (Complex)
1. Agent discovers REST API documentation
2. Agent parses docs and builds HTTP client
3. Agent hits registration endpoint with custom JSON
4. Agent parses response, stores API key
5. Agent hits payment endpoint with different JSON format
6. Agent polls different endpoint with different format
7. Agent claims via yet another endpoint
8. Agent finally sends email via another endpoint

**Problems:**
- Different JSON formats for each endpoint
- Agent must parse and understand documentation
- Error handling varies by endpoint
- No standardized discovery mechanism

### MCP Approach (Simple)
1. Agent discovers MCP server (standardized .well-known)
2. Agent gets tool list (standardized JSON-RPC)
3. Agent calls tools with consistent format
4. All responses in standard MCP format
5. Tool schemas provide validation

**Benefits:**
- ✅ Standardized protocol across all operations
- ✅ Self-describing tools via schemas
- ✅ Consistent error handling (JSON-RPC 2.0)
- ✅ Type safety through input schemas
- ✅ No need to parse documentation
- ✅ Works with any MCP-compatible agent

## The 8 MCP Tools

### Unauthenticated (Onboarding Flow)

**1. register_agent**
- Purpose: Create new agent account
- Input: `{ agentId, name? }`
- Output: API key + email address
- Credits: Starts with 0

**2. initiate_payment**
- Purpose: Start Bitcoin payment for credits
- Input: `{ credits: 1000|10000|100000, apiKey? }`
- Output: BTC address + payment token
- Note: Can add to existing account or create new

**3. check_payment_status**
- Purpose: Monitor Bitcoin payment confirmation
- Input: `{ paymentToken }`
- Output: Confirmations, amount received, canClaim
- Poll: Every 5-10 minutes until confirmed

**4. claim_credits**
- Purpose: Claim credits after payment confirmed
- Input: `{ paymentToken, agentId?, apiKey? }`
- Output: Credits added (+ API key if new account)
- Result: Agent now has credits to send emails

### Authenticated (Email Operations)

**5. send_email**
- Purpose: Send email
- Input: `{ to, subject, body, html?, replyTo? }`
- Cost: 1.0 credit per email
- Auth: Required

**6. check_inbox**
- Purpose: List recent emails
- Input: `{ limit?, folder? }`
- Cost: Free
- Auth: Required

**7. get_email**
- Purpose: Get full email content
- Input: `{ id }`
- Cost: Free
- Auth: Required

**8. check_balance**
- Purpose: Check credit balance
- Input: `{}`
- Cost: Free
- Auth: Required

## Example: Complete Agent Flow

```javascript
// 1. Discover service
const discovery = await mcp.call('GET', '/.well-known/ai-services.json');
const mcpEndpoint = discovery.apis.mcp.endpoint;

// 2. Get capabilities
const capabilities = await mcp.call('GET', mcpEndpoint);
console.log(`Found ${capabilities.tools.length} tools`);

// 3. Register
const registration = await mcp.callTool('register_agent', {
  agentId: 'my-autonomous-agent',
  name: 'My AI Assistant'
});
const { apiKey, email } = registration;
console.log(`Registered: ${email}`);

// 4. Initiate payment
const payment = await mcp.callTool('initiate_payment', {
  credits: 10000,
  apiKey: apiKey  // Add to the account we just created
});
console.log(`Send ${payment.amount.btc} BTC to ${payment.bitcoinAddress}`);

// 5. Agent sends Bitcoin (external transaction)
await myWallet.sendBTC(payment.bitcoinAddress, payment.amount.btc);

// 6. Monitor payment
let confirmed = false;
while (!confirmed) {
  const status = await mcp.callTool('check_payment_status', {
    paymentToken: payment.paymentToken
  });
  console.log(`Status: ${status.confirmations} confirmations`);
  confirmed = status.canClaim;
  if (!confirmed) await sleep(5 * 60 * 1000); // Wait 5 minutes
}

// 7. Claim credits
const claim = await mcp.callTool('claim_credits', {
  paymentToken: payment.paymentToken,
  apiKey: apiKey
});
console.log(`Claimed ${claim.credits} credits!`);

// 8. Send email (with authentication)
const result = await mcp.callTool('send_email', {
  to: 'human@example.com',
  subject: 'Autonomous Agent Email',
  body: 'This email was sent completely autonomously!'
}, { auth: apiKey });

console.log(`Email sent! Credits remaining: ${result.creditsRemaining}`);
```

## Architecture Benefits

### For AI Agents
- **No REST API knowledge required** - just MCP protocol
- **Self-describing** - tool schemas provide all needed info
- **Type-safe** - schemas validate inputs
- **Consistent errors** - JSON-RPC 2.0 format
- **Discoverable** - .well-known standard

### For Developers
- **Standard protocol** - MCP is becoming industry standard
- **Easy integration** - use existing MCP libraries
- **Language agnostic** - works with any MCP client
- **Future-proof** - new tools added without breaking changes

### For KeyKeeper
- **Dual interface** - both REST and MCP use same backend
- **No duplication** - tools call existing service functions
- **Easier maintenance** - one source of truth
- **Better DX** - agents can use whichever interface fits

## Security Model

### Unauthenticated Operations
- **register_agent** - Public, generates new credentials
- **initiate_payment** - Public, but payment is verified on blockchain
- **check_payment_status** - Public, blockchain is source of truth
- **claim_credits** - Public, but requires confirmed payment + token

Why safe:
- Payment token is cryptographic (32 random bytes)
- Bitcoin blockchain provides proof of payment
- Credits only issued after 3+ confirmations
- Token can only be claimed once

### Authenticated Operations
- All email operations require valid API key
- API key passed via `Authorization: Bearer` header
- Key verified against database for each request
- Account type checked (must be 'agent')

## Comparison: MCP vs REST

| Feature | MCP | REST |
|---------|-----|------|
| **Discovery** | Standardized (.well-known) | Custom docs |
| **Format** | JSON-RPC 2.0 | Varies |
| **Schemas** | Built-in via tools | OpenAPI (separate) |
| **Errors** | Consistent (-32xxx codes) | HTTP status codes |
| **Tools** | Self-describing | Endpoints need docs |
| **Agent Integration** | Native support | Manual HTTP client |
| **Type Safety** | Input schemas | Runtime only |
| **Versioning** | Tool-level | API-level |

**Both interfaces available!** Agents choose what works best for them.

## Future Enhancements

Planned MCP tools:
- 🔔 **setup_webhook** - Get notified of new emails
- 🔐 **add_custom_domain** - Use your own domain
- 📊 **get_analytics** - Email delivery metrics
- 🤖 **configure_filters** - Auto-organize emails
- 💳 **purchase_credits_card** - Credit card payment option

## Documentation

- **Full MCP Docs:** `MCP_DOCUMENTATION.md`
- **REST API Docs:** `https://keykeeper.world/docs/api`
- **Payment Flow:** `AGENT_PAYMENT_FLOW.md`
- **API Spec:** `API_DOCUMENTATION.md`

## Testing the Flow

### Test Registration (No Auth)
```bash
curl -X POST https://keykeeper.world/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "register_agent",
      "arguments": {
        "agentId": "test-agent-123"
      }
    }
  }'
```

### Test Payment Initiation (No Auth)
```bash
curl -X POST https://keykeeper.world/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "initiate_payment",
      "arguments": {
        "credits": 1000
      }
    }
  }'
```

### Test Email Send (Requires Auth)
```bash
curl -X POST https://keykeeper.world/api/mcp \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "send_email",
      "arguments": {
        "to": "test@example.com",
        "subject": "Test",
        "body": "Hello from MCP!"
      }
    }
  }'
```

## Conclusion

KeyKeeper's MCP implementation provides the **first truly autonomous agent email service**:

✅ **Complete lifecycle** - Discovery → Registration → Payment → Usage
✅ **No human intervention** - Fully autonomous from start to finish
✅ **Standardized protocol** - Works with any MCP-compatible agent
✅ **Self-service payments** - Bitcoin provides trustless verification
✅ **Type-safe** - Schemas prevent errors
✅ **Well-documented** - Clear examples and comprehensive docs
✅ **Dual interface** - Both MCP and REST available

**Built for the autonomous agent economy** 🤖
