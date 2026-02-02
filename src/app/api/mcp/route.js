import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import db from '@/lib/db';
import ImapFlow from 'imapflow';
import crypto from 'crypto';
import { MultiChainPaymentService } from '@/lib/payment/MultiChainPaymentService';

/**
 * MCP (Model Context Protocol) Server
 *
 * Provides a standard interface for AI agents to interact with KeyKeeper's
 * email infrastructure via the Model Context Protocol.
 *
 * GET  /api/mcp - Get server capabilities and tool definitions
 * POST /api/mcp - Execute a tool
 */

// MCP Server Information
const MCP_VERSION = '2024-11-05';
const SERVER_NAME = 'keykeeper-email';
const SERVER_VERSION = '1.0.0';

// Initialize multi-chain payment service
const paymentService = new MultiChainPaymentService();

// Tool Definitions
const TOOLS = [
  // Registration & Payment Tools (no auth required)
  {
    name: 'register_agent',
    description: 'Register a new AI agent account. Returns an API key (starts with 0 credits). No authentication required.',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: {
          type: 'string',
          description: 'Your agent identifier (used to generate email address)'
        },
        name: {
          type: 'string',
          description: 'Optional display name for your agent'
        }
      },
      required: ['agentId']
    }
  },
  {
    name: 'initiate_payment',
    description: 'Start a crypto payment to purchase credits on your preferred blockchain. Supports Bitcoin, Polygon (USDC), Ethereum (USDC), and Solana (USDC). No authentication required.',
    inputSchema: {
      type: 'object',
      properties: {
        credits: {
          type: 'number',
          description: 'Number of credits to purchase (1000, 10000, or 100000)',
          enum: [1000, 10000, 100000]
        },
        blockchain: {
          type: 'string',
          description: 'Blockchain to use: polygon (recommended, cheapest), ethereum (expensive gas), solana (fastest), bitcoin (most decentralized). Defaults to polygon.',
          enum: ['polygon', 'ethereum', 'solana', 'bitcoin'],
          default: 'polygon'
        },
        token: {
          type: 'string',
          description: 'Token to pay with: USDC (stablecoin), BTC, ETH, SOL, MATIC. Defaults to USDC for EVM chains, native token otherwise.',
          enum: ['USDC', 'BTC', 'ETH', 'SOL', 'MATIC']
        },
        apiKey: {
          type: 'string',
          description: 'Optional: Add credits to existing account (provide your API key)'
        }
      },
      required: ['credits']
    }
  },
  {
    name: 'check_payment_status',
    description: 'Check the status of a crypto payment on any blockchain (Bitcoin, Polygon, Ethereum, Solana). Poll every 2-10 minutes depending on chain. No authentication required.',
    inputSchema: {
      type: 'object',
      properties: {
        paymentToken: {
          type: 'string',
          description: 'Payment token from initiate_payment'
        }
      },
      required: ['paymentToken']
    }
  },
  {
    name: 'claim_credits',
    description: 'Claim credits after payment is confirmed. Returns API key if creating new account. No authentication required.',
    inputSchema: {
      type: 'object',
      properties: {
        paymentToken: {
          type: 'string',
          description: 'Payment token from initiate_payment'
        },
        agentId: {
          type: 'string',
          description: 'Optional: Your agent identifier (for new account)'
        },
        apiKey: {
          type: 'string',
          description: 'Optional: Existing API key (to add credits to existing account)'
        }
      },
      required: ['paymentToken']
    }
  },
  // Email Tools (require authentication)
  {
    name: 'send_email',
    description: 'Send an email from your agent account. Deducts 1.0 credit from your balance. Requires authentication.',
    inputSchema: {
      type: 'object',
      properties: {
        to: {
          type: 'string',
          description: 'Recipient email address or array of addresses'
        },
        subject: {
          type: 'string',
          description: 'Email subject line'
        },
        body: {
          type: 'string',
          description: 'Plain text email body'
        },
        html: {
          type: 'string',
          description: 'Optional HTML version of the email body'
        },
        replyTo: {
          type: 'string',
          description: 'Optional Reply-To email address'
        }
      },
      required: ['to', 'subject', 'body']
    }
  },
  {
    name: 'check_inbox',
    description: 'Check your inbox for new emails. Returns a list of recent messages. Requires authentication.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of emails to return (default: 50, max: 100)',
          default: 50
        },
        folder: {
          type: 'string',
          description: 'Mailbox folder to check (default: INBOX)',
          default: 'INBOX'
        }
      }
    }
  },
  {
    name: 'get_email',
    description: 'Retrieve the full content of a specific email by its ID. Requires authentication.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Email ID from inbox listing'
        }
      },
      required: ['id']
    }
  },
  {
    name: 'check_balance',
    description: 'Check your current credit balance and account status. Requires authentication.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }
];

/**
 * GET /api/mcp
 * Returns server capabilities and available tools
 */
export async function GET(request) {
  const capabilities = {
    protocolVersion: MCP_VERSION,
    serverInfo: {
      name: SERVER_NAME,
      version: SERVER_VERSION,
      description: 'AI-first email service with autonomous registration and crypto payments'
    },
    capabilities: {
      tools: {
        listChanged: false
      }
    },
    tools: TOOLS
  };

  return NextResponse.json(capabilities, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

/**
 * POST /api/mcp
 * Execute a tool
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { method, params } = body;

    // Tools that don't require authentication
    const UNAUTHENTICATED_TOOLS = [
      'register_agent',
      'initiate_payment',
      'check_payment_status',
      'claim_credits'
    ];

    // Check if this tool requires authentication
    const toolName = params?.name;
    const requiresAuth = method === 'tools/call' && !UNAUTHENTICATED_TOOLS.includes(toolName);

    let user = null;

    // Only validate authentication for tools that require it
    if (requiresAuth) {
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({
          error: {
            code: -32001,
            message: 'Missing or invalid Authorization header. Use: Bearer YOUR_API_KEY'
          }
        }, { status: 401 });
      }

      const apiKey = authHeader.substring(7);

      // Validate user
      user = await db.users.findByApiKey(apiKey);
      if (!user) {
        return NextResponse.json({
          error: {
            code: -32001,
            message: 'Invalid API key'
          }
        }, { status: 401 });
      }

      if (user.account_type !== 'agent') {
        return NextResponse.json({
          error: {
            code: -32002,
            message: 'This endpoint is only for agent accounts'
          }
        }, { status: 403 });
      }
    }

    // Route to appropriate tool handler
    let result;
    switch (method) {
      case 'tools/call':
        result = await handleToolCall(params, user);
        break;
      case 'tools/list':
        result = { tools: TOOLS };
        break;
      default:
        return NextResponse.json({
          error: {
            code: -32601,
            message: `Method not found: ${method}`
          }
        }, { status: 404 });
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('MCP Error:', error);
    return NextResponse.json({
      error: {
        code: -32603,
        message: error.message || 'Internal server error'
      }
    }, { status: 500 });
  }
}

/**
 * Handle tool execution
 */
async function handleToolCall(params, user) {
  const { name, arguments: args } = params;

  switch (name) {
    // Registration & Payment tools (no auth)
    case 'register_agent':
      return await registerAgent(args);
    case 'initiate_payment':
      return await initiatePayment(args);
    case 'check_payment_status':
      return await checkPaymentStatus(args);
    case 'claim_credits':
      return await claimCredits(args);
    // Email tools (require auth)
    case 'send_email':
      return await sendEmail(args, user);
    case 'check_inbox':
      return await checkInbox(args, user);
    case 'get_email':
      return await getEmail(args, user);
    case 'check_balance':
      return await checkBalance(user);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

/**
 * Tool: register_agent (no auth required)
 */
async function registerAgent(args) {
  const { agentId, name } = args;

  if (!agentId) {
    throw new Error('Missing required field: agentId');
  }

  // Generate email address
  const randomSuffix = crypto.randomBytes(3).toString('hex');
  const email = `agent-${agentId}-${randomSuffix}@keykeeper.world`;

  // Generate API key
  const apiKey = `kk_${crypto.randomBytes(32).toString('hex')}`;

  // Check if email already exists
  const existing = await db.users.findByEmail(email);
  if (existing) {
    throw new Error('Agent ID already registered. Please choose a different agentId.');
  }

  // Create user
  const userId = crypto.randomUUID();
  await db.users.createAgent({
    id: userId,
    email,
    name: name || `Agent ${agentId}`,
    apiKey,
    credits: 0
  });

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          apiKey,
          email,
          userId,
          credits: 0,
          note: 'Store your API key securely - it cannot be retrieved later. You start with 0 credits. Use initiate_payment to purchase credits.'
        }, null, 2)
      }
    ]
  };
}

/**
 * Tool: initiate_payment (no auth required)
 */
async function initiatePayment(args) {
  const { credits, blockchain = 'polygon', token, apiKey } = args;

  if (!credits || ![1000, 10000, 100000].includes(credits)) {
    throw new Error('Invalid credit amount. Must be 1000, 10000, or 100000');
  }

  // If API key provided, validate it
  let userId = null;
  if (apiKey) {
    const user = await db.users.findByApiKey(apiKey);
    if (!user) {
      throw new Error('Invalid API key');
    }
    userId = user.id;
  }

  // Use multi-chain payment service
  const paymentInfo = await paymentService.initiatePayment(credits, blockchain);

  // Determine token symbol
  const tokenSymbol = token || (blockchain === 'bitcoin' ? 'BTC' : 'USDC');

  // Store payment in database with multi-chain support
  const paymentId = crypto.randomUUID();
  await db.query(
    `INSERT INTO crypto_payments (
      id, user_id, payment_address, amount_btc, amount_usd, amount_tokens,
      credits_purchased, blockchain, token_symbol, contract_address,
      network_confirmations, status, metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      paymentId,
      userId,
      paymentInfo.paymentAddress,
      blockchain === 'bitcoin' ? paymentInfo.btc : 0,
      paymentInfo.usd,
      paymentInfo.amountSmallestUnit || paymentInfo.sats || 0,
      paymentInfo.credits,
      blockchain,
      tokenSymbol,
      paymentInfo.contract || paymentInfo.mint || null,
      paymentInfo.requiredConfirmations,
      'pending',
      JSON.stringify({
        token: paymentInfo.paymentToken,
        requiredAmount: paymentInfo.amountSmallestUnit || paymentInfo.sats,
        createdAt: new Date().toISOString(),
        blockchain: blockchain,
        token: tokenSymbol
      })
    ]
  );

  // Get payment instructions
  const instructions = paymentService.getPaymentInstructions(
    blockchain,
    paymentInfo.paymentAddress,
    paymentInfo.amount,
    tokenSymbol,
    paymentInfo.paymentToken
  );

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          paymentToken: paymentInfo.paymentToken,
          blockchain: blockchain,
          token: tokenSymbol,
          paymentAddress: paymentInfo.paymentAddress,
          amount: paymentInfo.amount,
          amountUSD: paymentInfo.usd,
          contract: paymentInfo.contract || paymentInfo.mint || null,
          explorerUrl: paymentInfo.explorerUrl,
          estimatedFee: paymentInfo.estimatedFee,
          estimatedTime: paymentInfo.estimatedTime,
          requiredConfirmations: paymentInfo.requiredConfirmations,
          instructions: instructions,
          availableChains: paymentInfo.availableChains,
          nextSteps: {
            checkStatus: { tool: 'check_payment_status', args: { paymentToken: paymentInfo.paymentToken } },
            claimCredits: { tool: 'claim_credits', args: { paymentToken: paymentInfo.paymentToken } }
          },
          warning: paymentInfo.warning || null
        }, null, 2)
      }
    ]
  };
}

/**
 * Tool: check_payment_status (no auth required)
 */
async function checkPaymentStatus(args) {
  const { paymentToken } = args;

  if (!paymentToken) {
    throw new Error('Missing required field: paymentToken');
  }

  // Find payment in database
  const payments = await db.query(
    `SELECT * FROM crypto_payments WHERE JSON_EXTRACT(metadata, '$.token') = ?`,
    [paymentToken]
  );

  if (payments.length === 0) {
    throw new Error('Payment token not found');
  }

  const payment = payments[0];
  const metadata = JSON.parse(payment.metadata || '{}');
  const blockchain = payment.blockchain || 'bitcoin';
  const tokenSymbol = payment.token_symbol || 'BTC';
  const requiredAmount = metadata.requiredAmount || payment.amount_tokens;

  // Check blockchain status using appropriate service
  const status = await paymentService.checkPaymentStatus(
    paymentToken,
    blockchain,
    payment.payment_address,
    requiredAmount
  );

  // Update payment status if confirmed
  if (status.isConfirmed && payment.status === 'pending') {
    await db.query(
      `UPDATE crypto_payments SET status = 'confirmed', confirmations = ?, confirmed_at = NOW()
       WHERE id = ?`,
      [status.confirmations, payment.id]
    );
  }

  // Format response based on blockchain
  const response = {
    status: status.isConfirmed ? 'confirmed' : 'pending',
    blockchain: blockchain,
    token: tokenSymbol,
    paymentAddress: payment.payment_address,
    required: {
      amount: parseFloat(payment.amount_usd),
      token: tokenSymbol,
      tokenAmount: blockchain === 'bitcoin'
        ? parseFloat(payment.amount_btc)
        : requiredAmount / 1000000 // USDC has 6 decimals
    },
    received: {
      tokenAmount: blockchain === 'bitcoin'
        ? status.totalReceivedSats / 100000000
        : status.totalReceived || 0
    },
    confirmations: status.confirmations,
    requiredConfirmations: payment.network_confirmations,
    percentPaid: requiredAmount > 0
      ? (((status.totalReceivedSmallestUnit || status.totalReceivedSats || 0) / requiredAmount) * 100).toFixed(2)
      : '0.00',
    isPaid: status.isPaid,
    isConfirmed: status.isConfirmed,
    canClaim: status.isConfirmed,
    credits: parseInt(payment.credits_purchased),
    transactions: status.transactions || [],
    message: status.isConfirmed
      ? 'Payment confirmed! You can now claim your credits using the claim_credits tool.'
      : `Waiting for payment (${status.confirmations}/${payment.network_confirmations} confirmations)...`
  };

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(response, null, 2)
      }
    ]
  };
}

/**
 * Tool: claim_credits (no auth required)
 */
async function claimCredits(args) {
  const { paymentToken, agentId, apiKey } = args;

  if (!paymentToken) {
    throw new Error('Missing required field: paymentToken');
  }

  // Find payment
  const payments = await db.query(
    `SELECT * FROM crypto_payments WHERE JSON_EXTRACT(metadata, '$.token') = ?`,
    [paymentToken]
  );

  if (payments.length === 0) {
    throw new Error('Payment token not found');
  }

  const payment = payments[0];

  // Check if already claimed
  if (payment.status === 'claimed') {
    throw new Error('Credits already claimed for this payment');
  }

  // Check if confirmed
  if (payment.status !== 'confirmed') {
    throw new Error('Payment not confirmed yet. Check status with check_payment_status tool.');
  }

  const creditsToAdd = parseFloat(payment.credits_purchased);

  // Case 1: Adding to existing account
  if (apiKey) {
    const user = await db.users.findByApiKey(apiKey);
    if (!user) {
      throw new Error('Invalid API key');
    }

    await db.users.updateCredits(user.id, creditsToAdd);
    await db.query(
      `UPDATE crypto_payments SET status = 'claimed', user_id = ? WHERE id = ?`,
      [user.id, payment.id]
    );

    await db.query(
      `INSERT INTO credit_transactions (id, user_id, transaction_type, amount, balance_after, description)
       VALUES (UUID(), ?, 'purchase', ?, ?, ?)`,
      [user.id, creditsToAdd, parseFloat(user.credits) + creditsToAdd, `Bitcoin payment: ${paymentToken.substring(0, 12)}...`]
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            credits: creditsToAdd,
            totalBalance: parseFloat(user.credits) + creditsToAdd,
            message: `Successfully claimed ${creditsToAdd} credits! Added to your existing account.`
          }, null, 2)
        }
      ]
    };
  }

  // Case 2: Create new account
  const randomSuffix = crypto.randomBytes(3).toString('hex');
  const email = `agent-${agentId || 'new'}-${randomSuffix}@keykeeper.world`;
  const newApiKey = `kk_${crypto.randomBytes(32).toString('hex')}`;
  const userId = crypto.randomUUID();

  await db.users.createAgent({
    id: userId,
    email,
    name: agentId ? `Agent ${agentId}` : 'New Agent',
    apiKey: newApiKey,
    credits: creditsToAdd
  });

  await db.query(
    `UPDATE crypto_payments SET status = 'claimed', user_id = ? WHERE id = ?`,
    [userId, payment.id]
  );

  await db.query(
    `INSERT INTO credit_transactions (id, user_id, transaction_type, amount, balance_after, description)
     VALUES (UUID(), ?, 'purchase', ?, ?, ?)`,
    [userId, creditsToAdd, creditsToAdd, `Bitcoin payment: ${paymentToken.substring(0, 12)}...`]
  );

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          credits: creditsToAdd,
          apiKey: newApiKey,
          email,
          message: `Successfully claimed ${creditsToAdd} credits! New agent account created.`,
          note: 'Store your API key securely - it cannot be retrieved later.'
        }, null, 2)
      }
    ]
  };
}

/**
 * Tool: send_email
 */
async function sendEmail(args, user) {
  const { to, subject, body, html, replyTo } = args;

  // Validate inputs
  if (!to || !subject || !body) {
    throw new Error('Missing required fields: to, subject, body');
  }

  // Check credits
  const creditCost = 1.0;
  const currentCredits = parseFloat(user.credits || 0);

  if (currentCredits < creditCost) {
    throw new Error(`Insufficient credits. Current balance: ${currentCredits}, Required: ${creditCost}`);
  }

  // Send email
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: user.email,
      pass: process.env.MAIL_PASSWORD || 'default'
    }
  });

  const mailOptions = {
    from: user.email,
    to: Array.isArray(to) ? to.join(', ') : to,
    subject,
    text: body,
    ...(html && { html }),
    ...(replyTo && { replyTo })
  };

  const info = await transporter.sendMail(mailOptions);

  // Deduct credits
  await db.users.updateCredits(user.id, -creditCost);

  // Log transaction
  await db.query(
    `INSERT INTO credit_transactions (id, user_id, transaction_type, amount, balance_after, description)
     VALUES (UUID(), ?, 'email_sent', ?, ?, ?)`,
    [user.id, -creditCost, currentCredits - creditCost, `Sent email to ${Array.isArray(to) ? to.join(', ') : to}`]
  );

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          messageId: info.messageId,
          creditsRemaining: currentCredits - creditCost,
          message: 'Email sent successfully'
        }, null, 2)
      }
    ]
  };
}

/**
 * Tool: check_inbox
 */
async function checkInbox(args, user) {
  const limit = Math.min(parseInt(args?.limit || 50), 100);
  const folder = args?.folder || 'INBOX';

  const client = new ImapFlow({
    host: process.env.IMAP_HOST || 'localhost',
    port: parseInt(process.env.IMAP_PORT || '993'),
    secure: true,
    auth: {
      user: user.email,
      pass: process.env.MAIL_PASSWORD || 'default'
    },
    logger: false
  });

  await client.connect();
  await client.mailboxOpen(folder);

  const messages = [];
  for await (let msg of client.fetch('1:*', {
    envelope: true,
    flags: true,
    bodyStructure: true
  }, { uid: true })) {
    messages.push({
      id: msg.uid.toString(),
      from: msg.envelope.from?.[0]?.address || 'unknown',
      subject: msg.envelope.subject || '(no subject)',
      date: msg.envelope.date?.toISOString() || new Date().toISOString(),
      hasAttachments: msg.bodyStructure?.childNodes?.length > 0 || false,
      flags: msg.flags
    });
  }

  await client.logout();

  // Sort by date (newest first) and limit
  messages.sort((a, b) => new Date(b.date) - new Date(a.date));
  const limitedMessages = messages.slice(0, limit);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          folder,
          totalMessages: messages.length,
          returnedMessages: limitedMessages.length,
          emails: limitedMessages
        }, null, 2)
      }
    ]
  };
}

/**
 * Tool: get_email
 */
async function getEmail(args, user) {
  const { id } = args;

  if (!id) {
    throw new Error('Missing required field: id');
  }

  const client = new ImapFlow({
    host: process.env.IMAP_HOST || 'localhost',
    port: parseInt(process.env.IMAP_PORT || '993'),
    secure: true,
    auth: {
      user: user.email,
      pass: process.env.MAIL_PASSWORD || 'default'
    },
    logger: false
  });

  await client.connect();
  await client.mailboxOpen('INBOX');

  const message = await client.fetchOne(id, {
    envelope: true,
    bodyStructure: true,
    source: true
  }, { uid: true });

  await client.logout();

  if (!message) {
    throw new Error('Email not found');
  }

  const emailData = {
    id: message.uid.toString(),
    from: message.envelope.from?.[0]?.address || 'unknown',
    fromName: message.envelope.from?.[0]?.name || null,
    to: message.envelope.to?.map(addr => addr.address) || [],
    subject: message.envelope.subject || '(no subject)',
    date: message.envelope.date?.toISOString() || new Date().toISOString(),
    body: {
      text: message.source?.toString() || '',
      html: null // Would need parsing for HTML
    },
    attachments: message.bodyStructure?.childNodes?.filter(node =>
      node.disposition === 'attachment'
    ).map(node => ({
      filename: node.dispositionParameters?.filename || 'unknown',
      contentType: node.type + '/' + node.subtype,
      size: node.size
    })) || [],
    headers: {
      messageId: message.envelope.messageId,
      inReplyTo: message.envelope.inReplyTo
    }
  };

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(emailData, null, 2)
      }
    ]
  };
}

/**
 * Tool: check_balance
 */
async function checkBalance(user) {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          credits: parseFloat(user.credits || 0),
          email: user.email,
          accountStatus: user.status || 'active',
          accountType: user.account_type
        }, null, 2)
      }
    ]
  };
}

/**
 * Handle CORS preflight
 */
export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}
