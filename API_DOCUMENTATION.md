# KeyKeeper.world API Documentation

**Version:** 1.0.0
**Base URL:** `https://keykeeper.world/api` (or `https://api.keykeeper.world`)
**Authentication:** Bearer token (API Key)

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Authentication](#authentication)
3. [Agent Endpoints](#agent-endpoints)
4. [Human Endpoints](#human-endpoints)
5. [Error Handling](#error-handling)
6. [Rate Limits](#rate-limits)
7. [Webhooks](#webhooks)
8. [SDKs & Libraries](#sdks--libraries)

---

## Quick Start

```javascript
// 1. Discover the service
const discovery = await fetch('https://keykeeper.world/.well-known/ai-services.json');

// 2. Register as an agent (or pay for credits first)
const register = await fetch('https://keykeeper.world/api/v1/agent/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ agentId: 'my-agent' })
});
const { apiKey, email } = await register.json();

// 3. Send an email
const send = await fetch('https://keykeeper.world/api/v1/agent/send', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    to: 'user@example.com',
    subject: 'Hello World',
    body: 'My first email from an AI agent!'
  })
});
```

---

## Authentication

### API Key Authentication

All agent endpoints require an API key passed as a Bearer token:

```
Authorization: Bearer kk_abc123...
```

### Getting an API Key

**Option 1: Register directly** (starts with 0 credits)
```bash
POST /api/v1/agent/register
```

**Option 2: Purchase credits first** (creates account with credits)
```bash
# 1. Initiate payment
POST /api/v1/agent/payment

# 2. Send Bitcoin to provided address

# 3. Claim credits (returns new API key)
POST /api/v1/agent/payment/claim/:token
```

---

## Agent Endpoints

### Service Discovery

#### Get Service Information
```
GET /.well-known/ai-services.json
```

Returns comprehensive service information including API endpoints, pricing, and capabilities.

**Response:**
```json
{
  "name": "KeyKeeper Email Infrastructure",
  "apis": {
    "rest": {
      "baseUrl": "https://keykeeper.world/api",
      "endpoints": { ... }
    }
  },
  "pricing": { ... }
}
```

---

### Registration

#### Register New Agent
```
POST /api/v1/agent/register
```

Register a new AI agent account. Returns API key and email address. Starts with 0 credits.

**Request Body:**
```json
{
  "agentId": "my-agent-name",  // Required: Your agent identifier
  "name": "My AI Assistant",   // Optional: Display name
  "email": "custom@example.com" // Optional: Custom email (if available)
}
```

**Response (201):**
```json
{
  "success": true,
  "apiKey": "kk_abc123...",
  "email": "agent-my-agent-name-a1b2c3@keykeeper.world",
  "userId": "uuid-here",
  "credits": 0,
  "note": "Store your API key securely - it cannot be retrieved later."
}
```

**Errors:**
- `400` - Missing required fields
- `409` - Email already registered
- `500` - Server error

---

### Email Operations

#### Send Email
```
POST /api/v1/agent/send
Authorization: Bearer YOUR_API_KEY
```

Send an email. Deducts 1.0 credits from your balance.

**Request Body:**
```json
{
  "to": "recipient@example.com",           // Required: Recipient (or array of emails)
  "subject": "Email Subject",              // Required
  "body": "Plain text email body",         // Required (if no html)
  "html": "<p>HTML email body</p>",       // Optional: HTML version
  "replyTo": "custom-reply@example.com"   // Optional: Reply-To address
}
```

**Response (200):**
```json
{
  "success": true,
  "messageId": "<abc123@keykeeper.world>",
  "creditsRemaining": 999.0,
  "message": "Email sent successfully"
}
```

**Errors:**
- `400` - Missing required fields
- `401` - Invalid API key
- `402` - Insufficient credits
- `403` - Not an agent account
- `500` - SMTP error / Server error

**Cost:** 1.0 credit per email

---

#### Check Inbox
```
GET /api/v1/agent/inbox?limit=50&folder=INBOX
Authorization: Bearer YOUR_API_KEY
```

Retrieve list of recent emails from inbox.

**Query Parameters:**
- `limit` (optional) - Number of emails to return (default: 50, max: 100)
- `folder` (optional) - Mailbox folder (default: "INBOX")

**Response (200):**
```json
{
  "folder": "INBOX",
  "totalMessages": 150,
  "returnedMessages": 50,
  "emails": [
    {
      "id": "12345",
      "from": "sender@example.com",
      "subject": "Message subject",
      "date": "2025-01-21T10:30:00Z",
      "hasAttachments": false
    }
  ]
}
```

**Errors:**
- `401` - Invalid API key
- `403` - Not an agent account
- `500` - IMAP error

**Cost:** Free (no credits deducted)

---

#### Get Specific Email
```
GET /api/v1/agent/email/:id
Authorization: Bearer YOUR_API_KEY
```

Retrieve full content of a specific email by ID.

**Path Parameters:**
- `id` - Email ID from inbox list

**Response (200):**
```json
{
  "id": "12345",
  "from": "sender@example.com",
  "fromName": "Sender Name",
  "to": ["you@keykeeper.world"],
  "subject": "Message subject",
  "date": "2025-01-21T10:30:00Z",
  "body": {
    "text": "Plain text content",
    "html": "<p>HTML content</p>"
  },
  "attachments": [
    {
      "filename": "document.pdf",
      "contentType": "application/pdf",
      "size": 12345
    }
  ],
  "headers": {
    "message-id": "<abc@example.com>",
    "in-reply-to": "<def@example.com>"
  }
}
```

**Errors:**
- `401` - Invalid API key
- `403` - Not an agent account
- `404` - Email not found
- `500` - IMAP error

**Cost:** Free (no credits deducted)

---

### Account Management

#### Check Credit Balance
```
GET /api/v1/agent/balance
Authorization: Bearer YOUR_API_KEY
```

Check your current credit balance.

**Response (200):**
```json
{
  "credits": 9999.0,
  "email": "agent-my-agent@keykeeper.world",
  "accountStatus": "active"
}
```

**Errors:**
- `401` - Invalid API key
- `403` - Not an agent account

---

### Payment System

#### Initiate Payment
```
POST /api/v1/agent/payment
```

Start a new Bitcoin payment for credits. Returns payment token and Bitcoin address.

**Request Body:**
```json
{
  "credits": 10000,              // Required: 1000, 10000, or 100000
  "apiKey": "kk_existing..."     // Optional: Add to existing account
}
```

**Response (200):**
```json
{
  "paymentToken": "pmt_abc123...",
  "bitcoinAddress": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
  "amount": {
    "credits": 10000,
    "usd": 800,
    "btc": 0.008,
    "sats": 800000
  },
  "instructions": [
    "Send exactly 0.00800000 BTC to 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
    "Wait for 3+ confirmations (typically 30-60 minutes)",
    "Check status at /v1/agent/payment/status/pmt_abc123...",
    "Once confirmed, claim credits at /v1/agent/payment/claim/pmt_abc123..."
  ],
  "statusUrl": "/v1/agent/payment/status/pmt_abc123...",
  "claimUrl": "/v1/agent/payment/claim/pmt_abc123..."
}
```

**Errors:**
- `400` - Invalid credit amount (must be 1000, 10000, or 100000)

---

#### Check Payment Status
```
GET /api/v1/agent/payment/status/:token
```

Check the status of a Bitcoin payment. Poll this endpoint every 5-10 minutes.

**Path Parameters:**
- `token` - Payment token from initiation response

**Response (200) - Pending:**
```json
{
  "status": "pending",
  "paymentAddress": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
  "required": {
    "sats": 800000,
    "btc": 0.008
  },
  "received": {
    "totalSats": 0,
    "confirmedSats": 0,
    "pendingSats": 0,
    "btc": 0
  },
  "confirmations": 0,
  "percentPaid": "0.00",
  "isPaid": false,
  "isConfirmed": false,
  "canClaim": false,
  "credits": 10000,
  "message": "Waiting for payment..."
}
```

**Response (200) - Confirmed:**
```json
{
  "status": "confirmed",
  "paymentAddress": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
  "required": { "sats": 800000, "btc": 0.008 },
  "received": {
    "totalSats": 800000,
    "confirmedSats": 800000,
    "pendingSats": 0,
    "btc": 0.008
  },
  "confirmations": 3,
  "percentPaid": "100.00",
  "isPaid": true,
  "isConfirmed": true,
  "canClaim": true,
  "credits": 10000,
  "message": "Payment confirmed! You can now claim your credits."
}
```

**Errors:**
- `404` - Payment token not found

---

#### Claim Credits
```
POST /api/v1/agent/payment/claim/:token
```

Claim credits after payment is confirmed. Can create new account or add to existing.

**Path Parameters:**
- `token` - Payment token from initiation response

**Request Body (New Account):**
```json
{
  "agentId": "my-agent"  // Optional: Agent identifier
}
```

**Request Body (Existing Account):**
```json
{
  "apiKey": "kk_existing..."  // Add credits to existing account
}
```

**Response (200) - New Account:**
```json
{
  "success": true,
  "credits": 10000,
  "apiKey": "kk_new_api_key...",
  "email": "agent-my-agent@keykeeper.world",
  "message": "Successfully claimed 10000 credits. New agent account created.",
  "note": "Store your API key securely - it cannot be retrieved later"
}
```

**Response (200) - Existing Account:**
```json
{
  "success": true,
  "credits": 10000,
  "message": "Successfully claimed 10000 credits"
}
```

**Errors:**
- `400` - Credits already claimed
- `401` - Invalid API key (if provided)
- `402` - Payment not confirmed yet
- `404` - Payment token not found

---

## Human Endpoints

### Simplified Authentication

#### Register with Email/Password
```
POST /api/auth/register/simple
```

Register a new human account with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe"  // Optional
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Account created successfully",
  "userId": "uuid",
  "email": "user@example.com"
}
```

---

#### Login with Email/Password
```
POST /api/auth/login/simple
```

Login with email and password. Returns JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "totpCode": "123456"  // Required if 2FA enabled
}
```

**Response (200):**
```json
{
  "token": "jwt.token.here",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "accountType": "human",
    "totpEnabled": false,
    "credits": 0
  }
}
```

**Response (403) - 2FA Required:**
```json
{
  "error": "2FA code required",
  "requires2FA": true
}
```

---

#### Setup 2FA
```
POST /api/auth/2fa/setup
Authorization: Bearer JWT_TOKEN
```

Setup two-factor authentication (TOTP).

**Response (200):**
```json
{
  "secret": "BASE32SECRET",
  "qrCodeUrl": "otpauth://totp/KeyKeeper:user@example.com?secret=...",
  "message": "Scan the QR code with your authenticator app, then verify with a code to enable 2FA"
}
```

---

#### Verify and Enable 2FA
```
POST /api/auth/2fa/verify
Authorization: Bearer JWT_TOKEN
```

Verify TOTP code and enable 2FA.

**Request Body:**
```json
{
  "totpCode": "123456"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "2FA has been successfully enabled for your account"
}
```

---

## Error Handling

All errors follow this format:

```json
{
  "error": "Human-readable error message",
  "details": {
    "code": "ERROR_CODE",
    "field": "fieldName"  // If applicable
  }
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created (registration, new payment)
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (invalid API key or JWT)
- `402` - Payment Required (insufficient credits)
- `403` - Forbidden (2FA required, wrong account type)
- `404` - Not Found
- `409` - Conflict (email already exists)
- `500` - Internal Server Error

---

## Rate Limits

### Agent Endpoints
- **Send Email:** 100 per minute
- **Check Inbox:** 1000 per hour
- **API Requests:** 10,000 per hour

### Human Endpoints
- **Authentication:** 10 per minute per IP
- **API Requests:** 1000 per hour per user

**Rate Limit Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642698000
```

---

## Pricing

### Credit Tiers

| Credits | USD | BTC* | Per Email |
|---------|-----|------|-----------|
| 1,000 | $100 | ~0.001 BTC | ~$0.10 |
| 10,000 | $800 | ~0.008 BTC | ~$0.08 |
| 100,000 | $5,000 | ~0.05 BTC | ~$0.05 |

*BTC prices are dynamic and fetched in real-time

### Credit Usage

| Action | Cost |
|--------|------|
| Send Email | 1.0 credits |
| Check Inbox | Free |
| Get Email | Free |
| Check Balance | Free |

### Custom Domains (Coming Soon)

- Setup Fee: 0.002 BTC
- Monthly Fee: 0.001 BTC

---

## Webhooks

*(Coming Soon)*

Configure webhooks to receive real-time notifications:
- New email received
- Credit balance low (<10%)
- Payment confirmed
- Email delivered/bounced

---

## SDKs & Libraries

### Official SDKs

*(Coming Soon)*

- **JavaScript/TypeScript** - NPM package
- **Python** - PyPI package
- **Go** - Go module

### Community SDKs

We encourage community contributions! Submit your SDK via GitHub.

---

## Support

- **Documentation:** https://keykeeper.world/docs/api
- **API Status:** https://status.keykeeper.world
- **Support Email:** support@keykeeper.world
- **GitHub Issues:** https://github.com/novalis78/keykeeper.world/issues

---

## Changelog

### Version 1.0.0 (2025-01-21)

Initial release:
- Agent registration and authentication
- Email send/receive operations
- Self-service Bitcoin payment system
- Human authentication with 2FA
- Service discovery endpoint

---

**Built with ❤️ for the autonomous agent economy**
