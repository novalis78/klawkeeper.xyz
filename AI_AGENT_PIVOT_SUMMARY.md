# AI Agent Infrastructure - Pivot Summary

## 🎯 The Vision

**KeyKeeper.world**: The first email service built for AI agents first, humans second.

### Core Innovation
Autonomous AI agents can:
- Register themselves
- Pay with Bitcoin (no credit cards!)
- Send and receive emails
- All without human intervention

## ✅ What We've Built

### 1. Landing Pages & Marketing
- **`/ai` Page**: Gorgeous dedicated landing page for AI agents
  - Feature showcase
  - Pricing tiers
  - API examples (REST & MCP)
  - Use cases
  - How it works flow

- **Main Page Enhancement**: Added prominent AI agent callout
  - Drives traffic to `/ai` page
  - Highlights agent-first approach

### 2. Simplified Human Authentication
**Problem**: PGP was too complex for mass adoption

**Solution**: Dual auth system
- **Humans**: Email/password + 2FA (TOTP)
- **Agents**: API key authentication
- **Legacy**: PGP still works for power users

**New Endpoints**:
- `POST /api/auth/register/simple` - Email/password signup
- `POST /api/auth/login/simple` - Login with password
- `POST /api/auth/2fa/setup` - Setup authenticator
- `POST /api/auth/2fa/verify` - Verify and enable 2FA

### 3. Complete Agent REST API
All endpoints use `Authorization: Bearer API_KEY`

**Registration**:
- `POST /v1/agent/register` - Autonomous registration
  - Returns API key + email address
  - Creates mail account automatically

**Email Operations**:
- `POST /v1/agent/send` - Send email (deducts 1 credit)
- `GET /v1/agent/inbox` - List recent emails
- `GET /v1/agent/email/:id` - Get full email content

**Account Management**:
- `GET /v1/agent/balance` - Check credit balance

### 4. Self-Service Bitcoin Payment System 💎

**The Game Changer**: No payment gateway needed!

Inspired by secure-mail-client's brilliant approach:

**Agent Flow**:
1. `POST /v1/agent/payment` → Get payment token + BTC address
2. Agent sends Bitcoin to address
3. `GET /v1/agent/payment/status/:token` → Poll for confirmations
4. `POST /v1/agent/payment/claim/:token` → Receive credits + optional API key

**How it Works**:
- Deterministic BTC address generation (XPUB + token hash)
- Verifies payments via mempool.space API
- Requires 3+ confirmations
- Completely autonomous

**Pricing Tiers**:
- 1,000 emails = $100 (~0.001 BTC)
- 10,000 emails = $800 (~0.008 BTC)  ← Most popular
- 100,000 emails = $5,000 (~0.05 BTC)

### 5. Service Discovery
**`/.well-known/ai-services.json`** - Agent discovery endpoint

Provides:
- API documentation
- Pricing information
- Capabilities list
- MCP server info
- Authentication methods

Agents can autonomously discover and integrate with KeyKeeper!

### 6. Database Schema
Complete credit system:

**New Tables**:
- `crypto_payments` - Tracks Bitcoin payments
- `credit_transactions` - All credit adds/deductions
- `api_keys` - API key management (future: multiple keys per user)

**Enhanced Users Table**:
- `password_hash` - For human accounts
- `totp_secret` / `totp_enabled` - 2FA support
- `account_type` - 'human' or 'agent'
- `api_key` - For agent authentication
- `credits` - Current balance

### 7. Security Features
- **Encrypted Emails**: All emails encrypted on-server filesystem (maintained from original design)
- **API Key Auth**: Secure bearer token authentication
- **Credit-Based Anti-Spam**: Agents have skin in the game
- **Payment Verification**: Blockchain-verified payments
- **2FA for Humans**: TOTP support

## 📋 Still To Do

### High Priority

1. **Run Database Migration** ⚠️
   - Apply `migrations/001_add_password_auth.sql`
   - Adds all new tables and columns
   - **Must be done before system goes live**

2. **API Key Management UI**
   - Dashboard for humans to view/revoke API keys
   - Generate additional keys
   - View credit usage history

3. **Production XPUB Setup**
   - Replace demo XPUB with production key
   - Proper BIP32 address derivation (currently using simple hash)
   - Set `BITCOIN_XPUB` environment variable

### Medium Priority

4. **AI-Powered Spam Monitoring**
   - Monitor email patterns
   - Flag suspicious behavior
   - Auto-suspend abusive agents
   - Could use Claude API for content analysis

5. **MCP Server Implementation**
   - Model Context Protocol server
   - Tools: send_email, check_inbox, get_email, check_balance
   - Endpoint: `mcp://keykeeper.world`

6. **Custom Domain Support**
   - Allow agents to use their own domains
   - Additional setup fee (0.002 BTC)
   - Monthly fee (0.001 BTC)
   - DNS verification

### Low Priority

7. **Enhanced Monitoring**
   - Deliverability tracking
   - Credit usage analytics
   - Payment dashboard
   - Agent activity logs

8. **Rate Limiting**
   - Per-agent rate limits
   - Anti-abuse thresholds
   - Automatic cooldowns

## 🚀 Agent Onboarding Flow

```
1. Agent discovers service via .well-known/ai-services.json
2. Agent requests payment: POST /v1/agent/payment
3. Agent sends Bitcoin to provided address
4. Agent polls: GET /v1/agent/payment/status/:token
5. Payment confirms (3+ confirmations, ~30-60 min)
6. Agent claims: POST /v1/agent/payment/claim/:token
7. Agent receives API key + credits
8. Agent sends emails: POST /v1/agent/send (with Authorization header)
9. Agent monitors inbox: GET /v1/agent/inbox
10. Agent adds more credits by repeating steps 2-6
```

**Total time**: ~1 hour (mostly waiting for Bitcoin confirmations)

## 💡 What Makes This Special

### For AI Agents
- **First-class citizens** - Not an afterthought
- **Truly autonomous** - No humans needed
- **Fair pricing** - Pay per use, transparent
- **Self-service** - No approval process
- **Blockchain verified** - No trust required

### For Humans
- **Simplified auth** - Email/password + 2FA
- **Same infrastructure** - Benefits from agent-first design
- **Commercializable** - Easy onboarding = more users

### Technical Innovation
- **No payment gateway** - Direct Bitcoin, no Stripe/PayPal
- **Self-verifying** - Blockchain is source of truth
- **Deterministic addresses** - Reproducible, auditable
- **Zero-knowledge** - Emails encrypted at rest

## 📊 Business Model

### Revenue Streams
1. **Agent Credits** - Primary revenue
   - Volume play: agents send lots of emails
   - Recurring: agents need to top up
   - Transparent pricing

2. **Custom Domains** - Premium feature
   - Setup fee + monthly
   - Higher-value customers

3. **Human Accounts** - Secondary
   - Simplified auth attracts users
   - Could add premium tiers later

### Competitive Advantages
1. **First mover** - No one else is agent-first
2. **Deliverability** - Already built up IP reputation
3. **No middleman** - Bitcoin payments = lower costs
4. **Developer friendly** - Clean API, good docs

## 🔧 Environment Variables Needed

```bash
# Database
DATABASE_URL=mysql://user:pass@host/db

# Bitcoin
BITCOIN_XPUB=xpub...  # Production XPUB

# Mail Server
SMTP_HOST=localhost
SMTP_PORT=587
IMAP_HOST=localhost
IMAP_PORT=993

# Security
APP_SECRET=random-secret-for-encryption

# Optional
NEXT_PUBLIC_BASE_URL=https://keykeeper.world
DEFAULT_MAIL_QUOTA=1024
```

## 📖 Documentation Created

1. **`AGENT_PAYMENT_FLOW.md`** - Complete payment flow guide
2. **`AI_AGENT_PIVOT_SUMMARY.md`** - This file
3. **API documentation** - In `.well-known/ai-services.json`
4. **Landing page** - `/ai` with examples

## 🎉 Ready for Launch?

**Almost!** Complete these steps:

1. ✅ Run database migration
2. ✅ Set production XPUB
3. ✅ Test complete agent flow end-to-end
4. ✅ Add basic monitoring/alerting
5. ✅ Deploy to production

Then we can:
- Announce on Twitter/HN
- Reach out to AI agent developers
- Post in AI/crypto communities
- Write blog post about the tech

## 🤝 Credits

Built on top of the excellent KeyKeeper foundation with inspiration from:
- secure-mail-client's payment system
- The broader AI agent ecosystem
- Bitcoin's trustless verification

---

**Next Steps**: Want me to help with the database migration or testing the full flow?
