import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * AI Services Discovery Endpoint
 *
 * This endpoint provides AI agents with information about KeyKeeper's
 * email infrastructure services, including:
 * - Available APIs (REST and MCP)
 * - Authentication methods
 * - Pricing information
 * - Service capabilities
 */
export async function GET(request) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://keykeeper.world';
  const apiUrl = `${baseUrl}/api`;

  const serviceInfo = {
    name: 'KeyKeeper Email Infrastructure',
    description: 'AI-first email service with autonomous registration, crypto payments, and full send/receive capabilities',
    version: '1.0.0',
    homepage: `${baseUrl}/ai`,
    documentation: `${baseUrl}/docs/api`,

    // Service capabilities
    capabilities: [
      'autonomous_registration',
      'send_email',
      'receive_email',
      'check_inbox',
      'manage_emails',
      'crypto_payments',
      'credit_system',
      'custom_domains',
      'encrypted_storage'
    ],

    // API endpoints
    apis: {
      rest: {
        baseUrl: apiUrl,
        version: 'v1',
        authentication: 'api-key',
        endpoints: {
          register: {
            method: 'POST',
            path: '/v1/agent/register',
            description: 'Register a new agent account',
            requiresAuth: false
          },
          sendEmail: {
            method: 'POST',
            path: '/v1/agent/send',
            description: 'Send an email',
            requiresAuth: true,
            costCredits: 1.0
          },
          checkInbox: {
            method: 'GET',
            path: '/v1/agent/inbox',
            description: 'Check inbox for new emails',
            requiresAuth: true
          },
          getEmail: {
            method: 'GET',
            path: '/v1/agent/email/:id',
            description: 'Get a specific email',
            requiresAuth: true
          },
          balance: {
            method: 'GET',
            path: '/v1/agent/balance',
            description: 'Check credit balance',
            requiresAuth: true
          },
          payment: {
            method: 'POST',
            path: '/v1/agent/payment',
            description: 'Initiate crypto payment for credits',
            requiresAuth: false
          }
        },
        authenticationExample: {
          header: 'Authorization',
          value: 'Bearer YOUR_API_KEY'
        }
      },
      mcp: {
        available: true,
        endpoint: 'mcp://keykeeper.world',
        version: '1.0',
        description: 'Model Context Protocol server for seamless agent integration',
        tools: [
          // Registration & Payment (no auth required)
          'register_agent',
          'initiate_payment',
          'check_payment_status',
          'claim_credits',
          // Email operations (require auth)
          'send_email',
          'check_inbox',
          'get_email',
          'check_balance'
        ]
      }
    },

    // Pricing information
    pricing: {
      currency: 'BTC',
      tiers: [
        {
          emails: 1000,
          priceBTC: '0.001',
          priceUSD: '~100',
          perEmailCost: '~$0.10'
        },
        {
          emails: 10000,
          priceBTC: '0.008',
          priceUSD: '~800',
          perEmailCost: '~$0.08',
          recommended: true
        },
        {
          emails: 100000,
          priceBTC: '0.05',
          priceUSD: '~5000',
          perEmailCost: '~$0.05'
        }
      ],
      customDomainFee: {
        setupBTC: '0.002',
        monthlyBTC: '0.001'
      }
    },

    // Payment methods
    payments: {
      methods: ['bitcoin'],
      bitcoin: {
        network: 'mainnet',
        confirmationsRequired: 3,
        paymentFlow: [
          'Request payment address via /v1/agent/payment',
          'Send BTC to provided address',
          'Wait for confirmations (typically 30-60 minutes)',
          'Credits automatically added to account',
          'Start sending emails'
        ]
      }
    },

    // Technical specifications
    specifications: {
      emailFormats: ['text/plain', 'text/html'],
      maxEmailSize: '25MB',
      attachmentSupport: true,
      encryptionAtRest: true,
      deliverabilityRate: '99.9%',
      averageApiLatency: '<2s',
      uptime: '99.9%'
    },

    // Rate limits
    rateLimits: {
      sendEmail: '100 per minute',
      checkInbox: '1000 per hour',
      apiRequests: '10000 per hour'
    },

    // Support and contact
    support: {
      documentation: `${baseUrl}/docs/api`,
      apiStatus: 'https://status.keykeeper.world',
      email: 'support@keykeeper.world',
      github: 'https://github.com/novalis78/keykeeper.world'
    },

    // Discovery metadata
    _metadata: {
      lastUpdated: new Date().toISOString(),
      schema: 'https://keykeeper.world/schemas/ai-services-v1.json',
      compatibleAgents: [
        'claude-mcp',
        'openai-gpt',
        'custom-agents'
      ]
    }
  };

  return NextResponse.json(serviceInfo, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
    }
  });
}

// Handle CORS preflight
export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}
