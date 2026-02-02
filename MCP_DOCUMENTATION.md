# KeyKeeper MCP Server Documentation

**Model Context Protocol (MCP) Server for KeyKeeper Email Infrastructure**

Version: 1.0.0
Protocol Version: 2024-11-05
Endpoint: `https://keykeeper.world/api/mcp`

---

## What is MCP?

The Model Context Protocol (MCP) is a standardized protocol that allows AI agents to discover and interact with external services. KeyKeeper's MCP server provides a seamless way for AI agents to send and receive emails without needing to understand REST APIs.

## Quick Start - Complete Autonomous Flow

AI agents can complete their entire lifecycle through MCP without any external dependencies:

### 1. Discover the Service

```bash
curl https://keykeeper.world/.well-known/ai-services.json
```

### 2. Get Server Capabilities

```bash
curl https://keykeeper.world/api/mcp
```

### 3. Register (No Auth Required)

```bash
curl -X POST https://keykeeper.world/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "register_agent",
      "arguments": {
        "agentId": "my-agent",
        "name": "My AI Assistant"
      }
    }
  }'
```

**Returns:** API key and email address (starts with 0 credits)

### 4. Purchase Credits (No Auth Required)

```bash
curl -X POST https://keykeeper.world/api/mcp \
  -H "Content-Type": application/json" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "initiate_payment",
      "arguments": {
        "credits": 10000
      }
    }
  }'
```

**Returns:** Bitcoin address and payment token

### 5. Check Payment Status (No Auth Required)

```bash
curl -X POST https://keykeeper.world/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "check_payment_status",
      "arguments": {
        "paymentToken": "pmt_abc123..."
      }
    }
  }'
```

Poll this every 5-10 minutes until `canClaim: true`

### 6. Claim Credits (No Auth Required)

```bash
curl -X POST https://keykeeper.world/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "claim_credits",
      "arguments": {
        "paymentToken": "pmt_abc123...",
        "apiKey": "kk_from_step3..."
      }
    }
  }'
```

### 7. Send Email (Requires Auth)

```bash
curl -X POST https://keykeeper.world/api/mcp \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "send_email",
      "arguments": {
        "to": "user@example.com",
        "subject": "Hello from MCP",
        "body": "Fully autonomous agent email!"
      }
    }
  }'
```

---

## Server Information

**Endpoint:** `https://keykeeper.world/api/mcp`
**Protocol Version:** `2024-11-05`
**Server Name:** `keykeeper-email`
**Server Version:** `1.0.0`

---

## Authentication

**Unauthenticated Tools (No API Key Required):**
- `register_agent` - Get your API key
- `initiate_payment` - Start Bitcoin payment
- `check_payment_status` - Poll payment confirmation
- `claim_credits` - Claim credits after payment

**Authenticated Tools (Require API Key):**
- `send_email` - Send emails
- `check_inbox` - List inbox messages
- `get_email` - Get full email content
- `check_balance` - Check credit balance

For authenticated tools, include your API key:

```
Authorization: Bearer YOUR_API_KEY
```

---

## Available Tools

### Registration & Payment Tools (No Auth)

#### 1. register_agent

Register a new AI agent account. Returns API key (starts with 0 credits).

**Input Schema:**
```json
{
  "agentId": "my-agent",
  "name": "My AI Assistant"
}
```

**Response:**
```json
{
  "success": true,
  "apiKey": "kk_abc123...",
  "email": "agent-my-agent-a1b2c3@keykeeper.world",
  "userId": "uuid",
  "credits": 0,
  "note": "Store your API key securely - it cannot be retrieved later."
}
```

---

#### 2. initiate_payment

Start a Bitcoin payment to purchase credits. Returns payment address and token.

**Input Schema:**
```json
{
  "credits": 10000,
  "apiKey": "optional_existing_key"
}
```

**Response:**
```json
{
  "paymentToken": "pmt_abc123...",
  "bitcoinAddress": "1A1zP1eP...",
  "amount": {
    "credits": 10000,
    "usd": 800,
    "btc": 0.008,
    "sats": 800000
  },
  "instructions": ["..."],
  "nextSteps": {
    "checkStatus": { "tool": "check_payment_status", "args": {...} }
  }
}
```

---

#### 3. check_payment_status

Check the status of a Bitcoin payment. Poll every 5-10 minutes.

**Input Schema:**
```json
{
  "paymentToken": "pmt_abc123..."
}
```

**Response:**
```json
{
  "status": "confirmed",
  "confirmations": 3,
  "canClaim": true,
  "credits": 10000,
  "message": "Payment confirmed! You can now claim your credits."
}
```

---

#### 4. claim_credits

Claim credits after payment is confirmed. Returns API key if creating new account.

**Input Schema:**
```json
{
  "paymentToken": "pmt_abc123...",
  "agentId": "my-agent",
  "apiKey": "optional_existing_key"
}
```

**Response (New Account):**
```json
{
  "success": true,
  "credits": 10000,
  "apiKey": "kk_new_key...",
  "email": "agent-my-agent@keykeeper.world",
  "message": "Successfully claimed 10000 credits! New agent account created."
}
```

**Response (Existing Account):**
```json
{
  "success": true,
  "credits": 10000,
  "totalBalance": 15000,
  "message": "Successfully claimed 10000 credits! Added to your existing account."
}
```

---

### Email Tools (Require Auth)

#### 5. send_email

Send an email from your agent account. Deducts 1.0 credit.

**Input Schema:**
```json
{
  "to": "recipient@example.com",
  "subject": "Email subject",
  "body": "Plain text body",
  "html": "<p>Optional HTML body</p>",
  "replyTo": "optional-reply@example.com"
}
```

**Example Request:**
```bash
curl -X POST https://keykeeper.world/api/mcp \
  -H "Authorization: Bearer kk_abc123..." \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "send_email",
      "arguments": {
        "to": "user@example.com",
        "subject": "Test Email",
        "body": "Hello from MCP!"
      }
    }
  }'
```

**Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\n  \"success\": true,\n  \"messageId\": \"<abc@keykeeper.world>\",\n  \"creditsRemaining\": 999.0,\n  \"message\": \"Email sent successfully\"\n}"
    }
  ]
}
```

---

#### 6. check_inbox

Check your inbox for new emails. Returns list of recent messages.

**Input Schema:**
```json
{
  "limit": 50,
  "folder": "INBOX"
}
```

**Example Request:**
```bash
curl -X POST https://keykeeper.world/api/mcp \
  -H "Authorization: Bearer kk_abc123..." \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "check_inbox",
      "arguments": {
        "limit": 10
      }
    }
  }'
```

**Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\n  \"folder\": \"INBOX\",\n  \"totalMessages\": 42,\n  \"returnedMessages\": 10,\n  \"emails\": [\n    {\n      \"id\": \"123\",\n      \"from\": \"sender@example.com\",\n      \"subject\": \"Hello\",\n      \"date\": \"2025-01-21T10:00:00Z\",\n      \"hasAttachments\": false\n    }\n  ]\n}"
    }
  ]
}
```

---

#### 7. get_email

Retrieve full content of a specific email by ID.

**Input Schema:**
```json
{
  "id": "email-id-from-inbox"
}
```

**Example Request:**
```bash
curl -X POST https://keykeeper.world/api/mcp \
  -H "Authorization: Bearer kk_abc123..." \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "get_email",
      "arguments": {
        "id": "123"
      }
    }
  }'
```

**Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\n  \"id\": \"123\",\n  \"from\": \"sender@example.com\",\n  \"fromName\": \"Sender Name\",\n  \"to\": [\"you@keykeeper.world\"],\n  \"subject\": \"Hello\",\n  \"date\": \"2025-01-21T10:00:00Z\",\n  \"body\": {\n    \"text\": \"Email content...\",\n    \"html\": null\n  },\n  \"attachments\": [],\n  \"headers\": {\n    \"messageId\": \"<abc@example.com>\",\n    \"inReplyTo\": null\n  }\n}"
    }
  ]
}
```

---

#### 8. check_balance

Check your current credit balance and account status.

**Input Schema:**
```json
{}
```

**Example Request:**
```bash
curl -X POST https://keykeeper.world/api/mcp \
  -H "Authorization: Bearer kk_abc123..." \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "check_balance",
      "arguments": {}
    }
  }'
```

**Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\n  \"credits\": 1000.0,\n  \"email\": \"agent-my-agent@keykeeper.world\",\n  \"accountStatus\": \"active\",\n  \"accountType\": \"agent\"\n}"
    }
  ]
}
```

---

## MCP Methods

### tools/list

List all available tools.

**Request:**
```json
{
  "method": "tools/list"
}
```

**Response:**
```json
{
  "tools": [
    {
      "name": "send_email",
      "description": "Send an email...",
      "inputSchema": { ... }
    }
  ]
}
```

### tools/call

Execute a specific tool.

**Request:**
```json
{
  "method": "tools/call",
  "params": {
    "name": "tool_name",
    "arguments": { ... }
  }
}
```

---

## Error Handling

MCP errors follow JSON-RPC 2.0 error format:

```json
{
  "error": {
    "code": -32001,
    "message": "Error description"
  }
}
```

### Error Codes

- `-32001` - Authentication error (401)
- `-32002` - Permission error (403)
- `-32601` - Method not found (404)
- `-32603` - Internal server error (500)

### HTTP Status Codes

- `200` - Success
- `401` - Unauthorized (invalid API key)
- `403` - Forbidden (not an agent account)
- `404` - Method not found
- `500` - Internal server error

---

## Integration Examples

### Python with MCP SDK

```python
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

# Connect to MCP server
server_params = StdioServerParameters(
    command="curl",
    args=["-H", "Authorization: Bearer YOUR_API_KEY",
          "https://keykeeper.world/api/mcp"],
    env=None
)

async with stdio_client(server_params) as (read, write):
    async with ClientSession(read, write) as session:
        # Initialize
        await session.initialize()

        # Send email
        result = await session.call_tool(
            "send_email",
            arguments={
                "to": "user@example.com",
                "subject": "Hello",
                "body": "Test email"
            }
        )
        print(result)
```

### JavaScript/TypeScript

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "curl",
  args: [
    "-H", "Authorization: Bearer YOUR_API_KEY",
    "https://keykeeper.world/api/mcp"
  ]
});

const client = new Client({
  name: "my-agent",
  version: "1.0.0"
}, {
  capabilities: {}
});

await client.connect(transport);

// Send email
const result = await client.callTool({
  name: "send_email",
  arguments: {
    to: "user@example.com",
    subject: "Hello",
    body: "Test email"
  }
});
```

### Direct HTTP (any language)

```bash
# 1. Get capabilities
curl https://keykeeper.world/api/mcp

# 2. Call tool
curl -X POST https://keykeeper.world/api/mcp \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "send_email",
      "arguments": {
        "to": "user@example.com",
        "subject": "Hello",
        "body": "Test"
      }
    }
  }'
```

---

## Credit System

- **send_email**: 1.0 credit per email
- **check_inbox**: Free
- **get_email**: Free
- **check_balance**: Free

Purchase credits via Bitcoin at `/api/v1/agent/payment`.

---

## Rate Limits

- **MCP Requests:** 10,000 per hour
- **send_email calls:** 100 per minute
- **check_inbox calls:** 1000 per hour

Rate limit headers included in responses:
```
X-RateLimit-Limit: 10000
X-RateLimit-Remaining: 9999
X-RateLimit-Reset: 1642698000
```

---

## Discovery Workflow

1. **Agent discovers service** via `.well-known/ai-services.json`
2. **Agent fetches MCP capabilities** via `GET /api/mcp`
3. **Agent registers** via `/api/v1/agent/register` (or pays first)
4. **Agent receives API key**
5. **Agent calls MCP tools** with API key authentication
6. **Agent checks balance** periodically and tops up as needed

---

## Comparison: MCP vs REST API

| Feature | MCP | REST API |
|---------|-----|----------|
| Discovery | Standardized | Custom |
| Tool Definition | Schema-based | Documentation |
| Error Format | JSON-RPC 2.0 | HTTP codes |
| Agent Integration | Native support | Manual implementation |
| Best For | AI agents | Traditional apps |

Both interfaces share the same backend, so choose based on your needs!

---

## Support

- **MCP Specification:** https://modelcontextprotocol.io
- **KeyKeeper Docs:** https://keykeeper.world/docs/api
- **API Status:** https://status.keykeeper.world
- **Support Email:** support@keykeeper.world
- **GitHub:** https://github.com/novalis78/keykeeper.world

---

## What's Next?

- 🔔 **Webhooks** - Get notified of new emails
- 🔐 **Custom Domains** - Use your own domain for agent emails
- 📊 **Analytics Dashboard** - Track email metrics
- 🤖 **AI Spam Detection** - Advanced abuse prevention

---

**Built with ❤️ for the autonomous agent economy**
