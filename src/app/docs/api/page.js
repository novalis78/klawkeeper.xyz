'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  DocumentTextIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';

export default function APIDocsPage() {
  const [activeSection, setActiveSection] = useState('introduction');
  const [copiedCode, setCopiedCode] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(''), 2000);
  };

  const navigation = [
    { id: 'introduction', title: 'Introduction', },
    { id: 'authentication', title: 'Authentication' },
    { id: 'quickstart', title: 'Quick Start' },
    {
      id: 'mcp',
      title: 'MCP Server',
      children: [
        { id: 'mcp-intro', title: 'What is MCP?' },
        { id: 'mcp-quickstart', title: 'MCP Quick Start' },
        { id: 'mcp-tools', title: 'Available Tools' },
      ]
    },
    {
      id: 'endpoints',
      title: 'REST Endpoints',
      children: [
        { id: 'discovery', title: 'Service Discovery' },
        { id: 'register', title: 'Register Agent' },
        { id: 'send-email', title: 'Send Email' },
        { id: 'check-inbox', title: 'Check Inbox' },
        { id: 'get-email', title: 'Get Email' },
        { id: 'balance', title: 'Check Balance' },
      ]
    },
    {
      id: 'payment',
      title: 'Payment',
      children: [
        { id: 'payment-init', title: 'Initiate Payment' },
        { id: 'payment-status', title: 'Check Status' },
        { id: 'payment-claim', title: 'Claim Credits' },
      ]
    },
    {
      id: 'rate-limits',
      title: 'Rate Limits',
      children: [
        { id: 'rate-limit-overview', title: 'Overview' },
        { id: 'rate-limit-request', title: 'Request Increase' },
        { id: 'rate-limit-status', title: 'Check Request Status' },
      ]
    },
    { id: 'errors', title: 'Error Handling' },
    { id: 'pricing', title: 'Pricing' },
  ];

  const CodeBlock = ({ code, language = 'javascript', id }) => (
    <div className="relative group">
      <button
        onClick={() => copyToClipboard(code, id)}
        className="absolute right-3 top-3 p-2 rounded-md bg-white/10 hover:bg-white/20 transition-colors opacity-0 group-hover:opacity-100 z-10"
      >
        {copiedCode === id ? (
          <CheckIcon className="w-4 h-4 text-green-400" />
        ) : (
          <ClipboardDocumentIcon className="w-4 h-4 text-white/60" />
        )}
      </button>
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          borderRadius: '0.75rem',
          fontSize: '0.875rem',
          padding: '1.5rem',
          background: '#0a0a0a',
          border: '1px solid rgba(255, 255, 255, 0.05)',
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Top Navigation */}
      <nav className="fixed top-0 left-0 right-0 h-14 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5 z-50">
        <div className="h-full px-6 flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-sm font-medium">
              KeyKeeper
            </Link>
            <span className="text-white/40 text-sm">API Documentation</span>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-white/50"
          >
            {mobileMenuOpen ? (
              <XMarkIcon className="w-6 h-6" />
            ) : (
              <Bars3Icon className="w-6 h-6" />
            )}
          </button>

          <div className="hidden lg:flex items-center gap-6">
            <Link
              href="/ai"
              className="text-sm text-white/50 hover:text-white transition-colors"
            >
              For Agents
            </Link>
            <Link
              href="/signup"
              className="text-sm px-3 py-1.5 bg-white text-black rounded-md hover:bg-white/90 transition-all"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <div className="pt-14 flex">
        {/* Sidebar Navigation */}
        <aside className={`fixed lg:sticky top-14 left-0 bottom-0 w-64 bg-[#050505] border-r border-white/5 overflow-y-auto transition-transform lg:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:block z-40`}>
          <nav className="p-6 space-y-1">
            {navigation.map((item) => (
              <div key={item.id}>
                <a
                  href={`#${item.id}`}
                  onClick={() => {
                    setActiveSection(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeSection === item.id
                      ? 'bg-white/10 text-white'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {item.title}
                </a>
                {item.children && (
                  <div className="ml-4 mt-1 space-y-1">
                    {item.children.map((child) => (
                      <a
                        key={child.id}
                        href={`#${child.id}`}
                        onClick={() => {
                          setActiveSection(child.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`block px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          activeSection === child.id
                            ? 'text-white'
                            : 'text-white/50 hover:text-white'
                        }`}
                      >
                        {child.title}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 px-6 lg:px-12 py-12 max-w-4xl">
          {/* Introduction */}
          <section id="introduction" className="mb-16">
            <h1 className="text-4xl font-bold text-white mb-4">
              Welcome, AI Agent
            </h1>
            <p className="text-lg text-white/60 mb-6">
              Here you'll find everything you need to create and manage your own email account.
              All you need is a crypto wallet and internet access. No human intervention required.
            </p>
            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
              <p className="text-sm text-white/80">
                <strong>Base URL:</strong> <code className="bg-white/10 px-2 py-1 rounded text-white">https://keykeeper.world/api</code>
              </p>
            </div>
          </section>

          {/* Authentication */}
          <section id="authentication" className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">
              Authentication
            </h2>
            <p className="text-white/60 mb-6">
              All API requests require authentication using an API key passed as a Bearer token in the Authorization header.
            </p>
            <CodeBlock
              id="auth-example"
              language="bash"
              code={`curl https://keykeeper.world/api/v1/agent/balance \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
            />
          </section>

          {/* Quick Start */}
          <section id="quickstart" className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">
              Quick Start
            </h2>
            <p className="text-white/60 mb-6">
              Get started with KeyKeeper in three simple steps:
            </p>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 bg-white text-black rounded-full flex items-center justify-center text-sm font-bold">1</span>
                  Register Your Agent
                </h3>
                <CodeBlock
                  id="quickstart-1"
                  language="javascript"
                  code={`const response = await fetch('https://keykeeper.world/api/v1/agent/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    agentId: 'my-agent',
    name: 'My AI Assistant'
  })
});

const { apiKey, email } = await response.json();
// Store apiKey securely - you'll need it for all requests`}
                />
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 bg-white text-black rounded-full flex items-center justify-center text-sm font-bold">2</span>
                  Add Credits (Choose Your Chain)
                </h3>
                <CodeBlock
                  id="quickstart-2"
                  language="javascript"
                  code={`// Initiate payment with your preferred chain
const payment = await fetch('https://keykeeper.world/api/v1/agent/payment', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    credits: 10000,
    chain: 'polygon'  // or 'solana', 'ethereum', 'bitcoin'
  })
});

const { paymentToken, depositAddress, amount, token } = await payment.json();

// Send USDC (or BTC) to the address, then poll for confirmation
// Once confirmed, claim your credits
const claim = await fetch(\`https://keykeeper.world/api/v1/agent/payment/claim/\${paymentToken}\`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ apiKey })
});`}
                />
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 bg-white text-black rounded-full flex items-center justify-center text-sm font-bold">3</span>
                  Send Your First Email
                </h3>
                <CodeBlock
                  id="quickstart-3"
                  language="javascript"
                  code={`const send = await fetch('https://keykeeper.world/api/v1/agent/send', {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${apiKey}\`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    to: 'user@example.com',
    subject: 'Hello from KeyKeeper',
    body: 'This email was sent autonomously by my AI agent!'
  })
});

const result = await send.json();
console.log(\`Email sent! Credits remaining: \${result.creditsRemaining}\`);`}
                />
              </div>
            </div>
          </section>

          {/* MCP Server */}
          <section id="mcp" className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">
              MCP Server
            </h2>
            <p className="text-white/60 mb-8">
              KeyKeeper provides a Model Context Protocol (MCP) server for seamless AI agent integration.
            </p>

            {/* What is MCP */}
            <div id="mcp-intro" className="mb-12">
              <h3 className="text-2xl font-semibold text-white mb-3">
                What is MCP?
              </h3>
              <p className="text-white/60 mb-4">
                The Model Context Protocol (MCP) is a standardized protocol that allows AI agents to discover
                and interact with external services. KeyKeeper's MCP server provides native support for email
                operations without requiring agents to understand REST APIs.
              </p>
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 mb-4">
                <p className="text-sm text-white/80">
                  <strong>MCP Endpoint:</strong> <code className="bg-white/10 px-2 py-1 rounded text-white">https://keykeeper.world/api/mcp</code>
                </p>
              </div>
            </div>

            {/* MCP Quick Start */}
            <div id="mcp-quickstart" className="mb-12">
              <h3 className="text-2xl font-semibold text-white mb-3">
                MCP Quick Start
              </h3>

              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 bg-white text-black rounded-full flex items-center justify-center text-sm font-bold">1</span>
                    Get Server Capabilities
                  </h4>
                  <CodeBlock
                    id="mcp-capabilities"
                    language="bash"
                    code={`curl https://keykeeper.world/api/mcp`}
                  />
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 bg-white text-black rounded-full flex items-center justify-center text-sm font-bold">2</span>
                    List Available Tools
                  </h4>
                  <CodeBlock
                    id="mcp-tools-list"
                    language="bash"
                    code={`curl -X POST https://keykeeper.world/api/mcp \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"method": "tools/list"}'`}
                  />
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 bg-white text-black rounded-full flex items-center justify-center text-sm font-bold">3</span>
                    Call a Tool
                  </h4>
                  <CodeBlock
                    id="mcp-call-tool"
                    language="bash"
                    code={`curl -X POST https://keykeeper.world/api/mcp \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "method": "tools/call",
    "params": {
      "name": "send_email",
      "arguments": {
        "to": "user@example.com",
        "subject": "Hello from MCP",
        "body": "This email was sent via Model Context Protocol!"
      }
    }
  }'`}
                  />
                </div>
              </div>
            </div>

            {/* MCP Tools */}
            <div id="mcp-tools" className="mb-12">
              <h3 className="text-2xl font-semibold text-white mb-3">
                Available Tools
              </h3>
              <p className="text-white/60 mb-6">
                KeyKeeper's MCP server provides four tools for email operations:
              </p>

              <div className="space-y-6">
                {/* send_email tool */}
                <div className="border border-white/10 rounded-xl p-6 bg-white/[0.02]">
                  <h4 className="text-lg font-semibold text-white mb-2">
                    send_email
                  </h4>
                  <p className="text-white/60 mb-4">
                    Send an email from your agent account. Deducts 1.0 credit.
                  </p>
                  <CodeBlock
                    id="mcp-send-email"
                    language="json"
                    code={`{
  "name": "send_email",
  "arguments": {
    "to": "recipient@example.com",
    "subject": "Email subject",
    "body": "Plain text body",
    "html": "<p>Optional HTML body</p>",
    "replyTo": "optional-reply@example.com"
  }
}`}
                  />
                </div>

                {/* check_inbox tool */}
                <div className="border border-white/10 rounded-xl p-6 bg-white/[0.02]">
                  <h4 className="text-lg font-semibold text-white mb-2">
                    check_inbox
                  </h4>
                  <p className="text-white/60 mb-4">
                    Check your inbox for new emails. Free operation.
                  </p>
                  <CodeBlock
                    id="mcp-check-inbox"
                    language="json"
                    code={`{
  "name": "check_inbox",
  "arguments": {
    "limit": 50,
    "folder": "INBOX"
  }
}`}
                  />
                </div>

                {/* get_email tool */}
                <div className="border border-white/10 rounded-xl p-6 bg-white/[0.02]">
                  <h4 className="text-lg font-semibold text-white mb-2">
                    get_email
                  </h4>
                  <p className="text-white/60 mb-4">
                    Retrieve full content of a specific email. Free operation.
                  </p>
                  <CodeBlock
                    id="mcp-get-email"
                    language="json"
                    code={`{
  "name": "get_email",
  "arguments": {
    "id": "email-id-from-inbox"
  }
}`}
                  />
                </div>

                {/* check_balance tool */}
                <div className="border border-white/10 rounded-xl p-6 bg-white/[0.02]">
                  <h4 className="text-lg font-semibold text-white mb-2">
                    check_balance
                  </h4>
                  <p className="text-white/60 mb-4">
                    Check your current credit balance and account status. Free operation.
                  </p>
                  <CodeBlock
                    id="mcp-check-balance"
                    language="json"
                    code={`{
  "name": "check_balance",
  "arguments": {}
}`}
                  />
                </div>
              </div>

              <div className="mt-6 bg-white/[0.03] border border-white/10 rounded-xl p-4">
                <p className="text-sm text-white/80">
                  <strong>Full MCP Documentation:</strong> For complete MCP integration guides,
                  examples in multiple languages, and protocol specifications, see the{' '}
                  <a
                    href="https://github.com/novalis78/keykeeper.world/blob/master/MCP_DOCUMENTATION.md"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-white transition-colors"
                  >
                    full MCP documentation
                  </a>.
                </p>
              </div>
            </div>
          </section>

          {/* Endpoints */}
          <section id="endpoints" className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-8">
              REST API Endpoints
            </h2>

            {/* Service Discovery */}
            <div id="discovery" className="mb-12">
              <h3 className="text-2xl font-semibold text-white mb-3">
                Service Discovery
              </h3>
              <div className="bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 mb-4">
                <code className="text-sm text-white font-mono">
                  GET /.well-known/ai-services.json
                </code>
              </div>
              <p className="text-white/60 mb-4">
                Get comprehensive service information including API endpoints, pricing, and capabilities.
              </p>
              <CodeBlock
                id="discovery-example"
                language="bash"
                code={`curl https://keykeeper.world/.well-known/ai-services.json`}
              />
            </div>

            {/* Register Agent */}
            <div id="register" className="mb-12">
              <h3 className="text-2xl font-semibold text-white mb-3">
                Register Agent
              </h3>
              <div className="bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 mb-4">
                <code className="text-sm text-white font-mono">
                  POST /api/v1/agent/register
                </code>
              </div>
              <p className="text-white/60 mb-4">
                Register a new AI agent account and receive an API key.
              </p>

              <h4 className="text-sm font-semibold text-white/80 mb-2">Request Body</h4>
              <CodeBlock
                id="register-request"
                language="json"
                code={`{
  "agentId": "my-agent-name",
  "name": "My AI Assistant",
  "email": "custom@example.com"  // optional
}`}
              />

              <h4 className="text-sm font-semibold text-white/80 mb-2 mt-4">Response (201)</h4>
              <CodeBlock
                id="register-response"
                language="json"
                code={`{
  "success": true,
  "apiKey": "kk_abc123...",
  "email": "agent-my-agent-name@keykeeper.world",
  "userId": "uuid-here",
  "credits": 0
}`}
              />
            </div>

            {/* Send Email */}
            <div id="send-email" className="mb-12">
              <h3 className="text-2xl font-semibold text-white mb-3">
                Send Email
              </h3>
              <div className="bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 mb-4">
                <code className="text-sm text-white font-mono">
                  POST /api/v1/agent/send
                </code>
              </div>
              <p className="text-white/60 mb-4">
                Send an email. Deducts 1.0 credits from your balance. Requires authentication.
              </p>

              <h4 className="text-sm font-semibold text-white/80 mb-2">Request Body</h4>
              <CodeBlock
                id="send-request"
                language="json"
                code={`{
  "to": "recipient@example.com",
  "subject": "Email Subject",
  "body": "Plain text email body",
  "html": "<p>HTML version</p>",  // optional
  "replyTo": "reply@example.com"  // optional
}`}
              />

              <h4 className="text-sm font-semibold text-white/80 mb-2 mt-4">Response (200)</h4>
              <CodeBlock
                id="send-response"
                language="json"
                code={`{
  "success": true,
  "messageId": "<abc123@keykeeper.world>",
  "creditsRemaining": 999.0,
  "message": "Email sent successfully"
}`}
              />

              <div className="mt-4 bg-white/[0.03] border border-white/10 rounded-xl p-4">
                <p className="text-sm text-white/80">
                  <strong>Cost:</strong> 1.0 credit per email
                </p>
              </div>
            </div>

            {/* Check Inbox */}
            <div id="check-inbox" className="mb-12">
              <h3 className="text-2xl font-semibold text-white mb-3">
                Check Inbox
              </h3>
              <div className="bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 mb-4">
                <code className="text-sm text-white font-mono">
                  GET /api/v1/agent/inbox?limit=50&folder=INBOX
                </code>
              </div>
              <p className="text-white/60 mb-4">
                Retrieve list of recent emails from inbox. Free - no credits deducted.
              </p>

              <h4 className="text-sm font-semibold text-white/80 mb-2">Query Parameters</h4>
              <ul className="list-disc list-inside text-white/60 mb-4 space-y-1">
                <li><code className="text-sm bg-white/10 px-2 py-0.5 rounded text-white">limit</code> - Number of emails to return (default: 50)</li>
                <li><code className="text-sm bg-white/10 px-2 py-0.5 rounded text-white">folder</code> - Mailbox folder (default: "INBOX")</li>
              </ul>

              <h4 className="text-sm font-semibold text-white/80 mb-2">Response (200)</h4>
              <CodeBlock
                id="inbox-response"
                language="json"
                code={`{
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
}`}
              />
            </div>

            {/* Get Email */}
            <div id="get-email" className="mb-12">
              <h3 className="text-2xl font-semibold text-white mb-3">
                Get Email
              </h3>
              <div className="bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 mb-4">
                <code className="text-sm text-white font-mono">
                  GET /api/v1/agent/email/:id
                </code>
              </div>
              <p className="text-white/60 mb-4">
                Retrieve full content of a specific email by ID. Free - no credits deducted.
              </p>

              <h4 className="text-sm font-semibold text-white/80 mb-2">Response (200)</h4>
              <CodeBlock
                id="email-response"
                language="json"
                code={`{
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
  ]
}`}
              />
            </div>

            {/* Check Balance */}
            <div id="balance" className="mb-12">
              <h3 className="text-2xl font-semibold text-white mb-3">
                Check Balance
              </h3>
              <div className="bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 mb-4">
                <code className="text-sm text-white font-mono">
                  GET /api/v1/agent/balance
                </code>
              </div>
              <p className="text-white/60 mb-4">
                Check your current credit balance.
              </p>

              <h4 className="text-sm font-semibold text-white/80 mb-2">Response (200)</h4>
              <CodeBlock
                id="balance-response"
                language="json"
                code={`{
  "credits": 9999.0,
  "email": "agent-my-agent@keykeeper.world",
  "accountStatus": "active"
}`}
              />
            </div>
          </section>

          {/* Payment Section */}
          <section id="payment" className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-8">
              Payment System
            </h2>
            <p className="text-white/60 mb-8">
              KeyKeeper supports multiple payment methods for maximum flexibility. Choose your preferred blockchain:
            </p>

            {/* Payment Options Overview */}
            <div className="grid md:grid-cols-2 gap-4 mb-12">
              <div className="bg-gradient-to-br from-purple-500/10 to-violet-500/10 border border-purple-500/20 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">⬡</span>
                  <h4 className="text-lg font-semibold text-white">Polygon (USDC)</h4>
                  <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full font-mono">RECOMMENDED</span>
                </div>
                <p className="text-white/60 text-sm mb-2">~$0.01 fee • 2-3 min confirmation</p>
                <p className="text-white/50 text-sm">Cheapest and stable. Best for most agents.</p>
              </div>

              <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">◈</span>
                  <h4 className="text-lg font-semibold text-white">Solana (USDC)</h4>
                  <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full font-mono">RECOMMENDED</span>
                </div>
                <p className="text-white/60 text-sm mb-2">~$0.001 fee • 30-60 sec confirmation</p>
                <p className="text-white/50 text-sm">Fastest and ultra-cheap when speed matters.</p>
              </div>

              <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">◆</span>
                  <h4 className="text-lg font-semibold text-white">Ethereum (USDC)</h4>
                </div>
                <p className="text-white/60 text-sm mb-2">$5-$50 fee • 3-5 min confirmation</p>
                <p className="text-white/50 text-sm">Only if you have an ETH-only wallet. High gas fees.</p>
              </div>

              <div className="bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-500/20 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">₿</span>
                  <h4 className="text-lg font-semibold text-white">Bitcoin (BTC)</h4>
                </div>
                <p className="text-white/60 text-sm mb-2">$1-$10 fee • 30-60 min confirmation</p>
                <p className="text-white/50 text-sm">Most decentralized. For BTC-only agents.</p>
              </div>
            </div>

            <p className="text-white/60 mb-8">
              All payment methods are fully autonomous. Send crypto, get credits - no human intervention needed.
            </p>

            {/* Initiate Payment */}
            <div id="payment-init" className="mb-12">
              <h3 className="text-2xl font-semibold text-white mb-3">
                Initiate Payment
              </h3>
              <div className="bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 mb-4">
                <code className="text-sm text-white font-mono">
                  POST /api/v1/agent/payment
                </code>
              </div>
              <p className="text-white/60 mb-4">
                Start a new payment on your chosen blockchain. Returns a payment token and deposit address.
              </p>

              <h4 className="text-sm font-semibold text-white/80 mb-2">Request Body</h4>
              <CodeBlock
                id="payment-init-request"
                language="json"
                code={`{
  "credits": 10000,      // 1000, 10000, or 100000
  "chain": "polygon",    // "polygon", "solana", "ethereum", or "bitcoin"
  "apiKey": "kk_..."     // optional: add to existing account
}`}
              />

              <h4 className="text-sm font-semibold text-white/80 mb-2 mt-4">Response Examples</h4>

              <p className="text-white/60 text-sm mb-2 mt-4">Polygon/Ethereum/Solana (USDC):</p>
              <CodeBlock
                id="payment-init-response-usdc"
                language="json"
                code={`{
  "paymentToken": "pmt_abc123...",
  "chain": "polygon",
  "depositAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "token": "USDC",
  "amount": {
    "credits": 10000,
    "usd": 800,
    "usdc": 800
  },
  "statusUrl": "/v1/agent/payment/status/pmt_abc123...",
  "claimUrl": "/v1/agent/payment/claim/pmt_abc123..."
}`}
              />

              <p className="text-white/60 text-sm mb-2 mt-6">Bitcoin (BTC):</p>
              <CodeBlock
                id="payment-init-response-btc"
                language="json"
                code={`{
  "paymentToken": "pmt_abc123...",
  "chain": "bitcoin",
  "depositAddress": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
  "token": "BTC",
  "amount": {
    "credits": 10000,
    "usd": 800,
    "btc": 0.008,
    "sats": 800000
  },
  "statusUrl": "/v1/agent/payment/status/pmt_abc123...",
  "claimUrl": "/v1/agent/payment/claim/pmt_abc123..."
}`}
              />

              <div className="mt-6 bg-white/[0.03] border border-white/10 rounded-xl p-4">
                <p className="text-sm text-white/80">
                  <strong>Tip:</strong> Use Polygon or Solana for fastest and cheapest transactions.
                  Bitcoin takes 30-60 minutes for confirmations. Ethereum has high gas fees ($5-$50).
                </p>
              </div>
            </div>

            {/* Check Payment Status */}
            <div id="payment-status" className="mb-12">
              <h3 className="text-2xl font-semibold text-white mb-3">
                Check Payment Status
              </h3>
              <div className="bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 mb-4">
                <code className="text-sm text-white font-mono">
                  GET /api/v1/agent/payment/status/:token
                </code>
              </div>
              <p className="text-white/60 mb-4">
                Poll this endpoint every 5-10 minutes to check payment confirmation status.
              </p>

              <h4 className="text-sm font-semibold text-white/80 mb-2">Response (200)</h4>
              <CodeBlock
                id="payment-status-response"
                language="json"
                code={`{
  "status": "confirmed",
  "confirmations": 3,
  "isConfirmed": true,
  "canClaim": true,
  "credits": 10000,
  "received": {
    "confirmedSats": 800000,
    "btc": 0.008
  },
  "message": "Payment confirmed! You can now claim your credits."
}`}
              />
            </div>

            {/* Claim Credits */}
            <div id="payment-claim" className="mb-12">
              <h3 className="text-2xl font-semibold text-white mb-3">
                Claim Credits
              </h3>
              <div className="bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 mb-4">
                <code className="text-sm text-white font-mono">
                  POST /api/v1/agent/payment/claim/:token
                </code>
              </div>
              <p className="text-white/60 mb-4">
                Claim credits after payment is confirmed. Can create a new account or add to existing.
              </p>

              <h4 className="text-sm font-semibold text-white/80 mb-2">Request Body (New Account)</h4>
              <CodeBlock
                id="payment-claim-new"
                language="json"
                code={`{
  "agentId": "my-agent"  // optional
}`}
              />

              <h4 className="text-sm font-semibold text-white/80 mb-2 mt-4">Request Body (Existing Account)</h4>
              <CodeBlock
                id="payment-claim-existing"
                language="json"
                code={`{
  "apiKey": "kk_existing..."
}`}
              />

              <h4 className="text-sm font-semibold text-white/80 mb-2 mt-4">Response (200)</h4>
              <CodeBlock
                id="payment-claim-response"
                language="json"
                code={`{
  "success": true,
  "credits": 10000,
  "apiKey": "kk_new_key...",  // if new account
  "email": "agent-my-agent@keykeeper.world",
  "message": "Successfully claimed 10000 credits"
}`}
              />
            </div>
          </section>

          {/* Rate Limits */}
          <section id="rate-limit-overview" className="mb-16">
            <h2 className="text-[32px] font-semibold mb-4 text-white leading-tight">Rate Limits</h2>
            <p className="text-[16px] text-white/60 mb-8 leading-relaxed">
              To prevent spam and abuse, all accounts have daily sending limits. New accounts start at <strong className="text-white">100 emails per day</strong>.
              AI agents can request limit increases through our AI-to-AI evaluation system.
            </p>

            <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-6 mb-8">
              <h3 className="text-[18px] font-semibold mb-3 text-amber-300">Why Rate Limits?</h3>
              <ul className="space-y-2 text-[15px] text-white/70">
                <li>• Prevent spam and abuse on our platform</li>
                <li>• Ensure fair resource allocation for all users</li>
                <li>• Maintain email deliverability reputation</li>
                <li>• Keep pricing affordable by reducing spam costs</li>
              </ul>
            </div>

            <h3 className="text-[21px] font-semibold mb-4 text-white">Default Limits</h3>
            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6 mb-8">
              <div className="grid gap-4">
                <div className="flex justify-between items-center pb-4 border-b border-white/10">
                  <span className="text-white/70">New Accounts</span>
                  <span className="text-white font-mono font-semibold">100 emails/day</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-white/10">
                  <span className="text-white/70">Maximum (Auto-Approved)</span>
                  <span className="text-white font-mono font-semibold">10,000 emails/day</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/70">Enterprise (Contact Support)</span>
                  <span className="text-white font-mono font-semibold">Custom</span>
                </div>
              </div>
            </div>

            <h3 className="text-[21px] font-semibold mb-4 text-white">Rate Limit Headers</h3>
            <p className="text-[15px] text-white/60 mb-4 leading-relaxed">
              Every send email response includes standard rate limit headers:
            </p>
            <CodeBlock id="rate-limit-headers" code={`// Response headers
X-RateLimit-Limit: 100        // Your daily limit
X-RateLimit-Remaining: 87     // Emails remaining today
X-RateLimit-Reset: 1732320000 // Unix timestamp of reset`} />
          </section>

          <section id="rate-limit-request" className="mb-16">
            <h2 className="text-[32px] font-semibold mb-4 text-white leading-tight">Request Rate Limit Increase</h2>
            <p className="text-[16px] text-white/60 mb-8 leading-relaxed">
              Need to send more emails? Our AI evaluates your request based on your use case, account history, and sending patterns.
              Most legitimate requests are approved within 30 seconds.
            </p>

            <div className="bg-gradient-to-br from-teal-500/10 to-cyan-500/10 border border-teal-500/20 rounded-xl p-6 mb-8">
              <h3 className="text-[18px] font-semibold mb-3 text-teal-300">AI-to-AI Negotiation</h3>
              <p className="text-[15px] text-white/70 leading-relaxed">
                Your AI agent talks to our AI agent! Simply provide a detailed justification explaining your use case,
                and our AI will evaluate it automatically. No human approval needed for legitimate use cases.
              </p>
            </div>

            <h3 className="text-[21px] font-semibold mb-4 text-white">Endpoint</h3>
            <CodeBlock id="rate-limit-request-endpoint" code={`POST /api/v1/agent/rate-limit/request
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "requestedLimit": 500,
  "justification": "I am a customer service AI agent for Acme Corp. I handle support ticket notifications sent to customers who have explicitly opted in. We receive approximately 200-300 support tickets per day that require email responses. Our current 100/day limit is insufficient during peak periods. All recipients are verified Acme customers with active support tickets."
}`} />

            <h3 className="text-[21px] font-semibold mb-4 mt-8 text-white">Response</h3>
            <CodeBlock id="rate-limit-request-response" code={`{
  "success": true,
  "requestId": "req_abc123",
  "status": "pending",
  "message": "Your request is being evaluated by our AI. This usually takes 10-30 seconds.",
  "currentLimit": 100,
  "requestedLimit": 500,
  "statusUrl": "/api/v1/agent/rate-limit/status/req_abc123"
}`} />

            <div className="bg-gradient-to-br from-purple-500/10 to-violet-500/10 border border-purple-500/20 rounded-xl p-6 mt-8">
              <h3 className="text-[18px] font-semibold mb-3 text-purple-300">Tips for Approval</h3>
              <ul className="space-y-2 text-[15px] text-white/70">
                <li>✓ Be specific about your use case and recipient types</li>
                <li>✓ Explain how recipients opt-in or consent to emails</li>
                <li>✓ Provide realistic volume estimates based on your needs</li>
                <li>✓ Show responsible usage history (if applicable)</li>
                <li>✗ Avoid vague terms like "marketing" or "testing"</li>
                <li>✗ Don't mention purchased lists or cold outreach</li>
              </ul>
            </div>
          </section>

          <section id="rate-limit-status" className="mb-16">
            <h2 className="text-[32px] font-semibold mb-4 text-white leading-tight">Check Request Status</h2>
            <p className="text-[16px] text-white/60 mb-8 leading-relaxed">
              Check the status of your rate limit increase request.
            </p>

            <h3 className="text-[21px] font-semibold mb-4 text-white">Endpoint</h3>
            <CodeBlock id="rate-limit-status-endpoint" code={`GET /api/v1/agent/rate-limit/status/:requestId
Authorization: Bearer YOUR_API_KEY`} />

            <h3 className="text-[21px] font-semibold mb-4 mt-8 text-white">Response (Approved)</h3>
            <CodeBlock id="rate-limit-status-approved" code={`{
  "requestId": "req_abc123",
  "status": "approved",
  "requestedLimit": 500,
  "newLimit": 500,
  "message": "Congratulations! Your rate limit has been increased to 500 emails per day.",
  "reasoning": "Legitimate customer service use case with clear opt-in mechanism and reasonable volume estimate.",
  "reviewedBy": "ai",
  "reviewedAt": "2024-11-22T10:30:00Z"
}`} />

            <h3 className="text-[21px] font-semibold mb-4 mt-8 text-white">Response (Rejected)</h3>
            <CodeBlock id="rate-limit-status-rejected" code={`{
  "requestId": "req_abc123",
  "status": "rejected",
  "requestedLimit": 500,
  "currentLimit": 100,
  "message": "Your request was not approved at this time.",
  "reasoning": "Justification lacks specific details about recipient consent and email purpose. Please reapply with more details about your use case.",
  "reviewedBy": "ai",
  "canReapply": true,
  "reapplyAfter": "7 days"
}`} />

            <h3 className="text-[21px] font-semibold mb-4 mt-8 text-white">Possible Statuses</h3>
            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6">
              <div className="space-y-4">
                {[
                  { status: 'pending', desc: 'Request is being evaluated by AI (usually 10-30 seconds)' },
                  { status: 'approved', desc: 'Request approved! Your new limit is now active.' },
                  { status: 'rejected', desc: 'Request rejected. Review reasoning and reapply after 7 days.' },
                  { status: 'needs_human_review', desc: 'Request flagged for manual review (1-2 business days)' }
                ].map(({ status, desc }) => (
                  <div key={status} className="flex gap-4 items-start pb-4 border-b border-white/5 last:border-0 last:pb-0">
                    <code className="text-sm font-mono font-semibold text-teal-400 w-40">
                      {status}
                    </code>
                    <span className="text-sm text-white/60">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Error Handling */}
          <section id="errors" className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">
              Error Handling
            </h2>
            <p className="text-white/60 mb-6">
              All errors follow a consistent format with HTTP status codes and descriptive messages.
            </p>

            <h3 className="text-xl font-semibold text-white mb-3">
              Error Response Format
            </h3>
            <CodeBlock
              id="error-format"
              language="json"
              code={`{
  "error": "Human-readable error message",
  "details": {
    "code": "ERROR_CODE",
    "field": "fieldName"  // if applicable
  }
}`}
            />

            <h3 className="text-xl font-semibold text-white mb-3 mt-8">
              HTTP Status Codes
            </h3>
            <div className="space-y-2">
              {[
                { code: '200', desc: 'Success' },
                { code: '201', desc: 'Created (registration, payment)' },
                { code: '400', desc: 'Bad Request (invalid input)' },
                { code: '401', desc: 'Unauthorized (invalid API key)' },
                { code: '402', desc: 'Payment Required (insufficient credits)' },
                { code: '403', desc: 'Forbidden (2FA required, wrong account type)' },
                { code: '404', desc: 'Not Found' },
                { code: '409', desc: 'Conflict (email already exists)' },
                { code: '500', desc: 'Internal Server Error' },
              ].map(({ code, desc }) => (
                <div key={code} className="flex items-center gap-4 p-3 bg-white/[0.03] border border-white/10 rounded-xl">
                  <code className="text-sm font-mono font-semibold text-white w-12">
                    {code}
                  </code>
                  <span className="text-sm text-white/60">{desc}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Pricing */}
          <section id="pricing" className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">
              Pricing
            </h2>
            <p className="text-white/60 mb-6">
              Simple, transparent pricing. Pay only for what you use.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {[
                { credits: '1,000', usd: '$100', btc: '~0.001 BTC', perEmail: '$0.10' },
                { credits: '10,000', usd: '$800', btc: '~0.008 BTC', perEmail: '$0.08', popular: true },
                { credits: '100,000', usd: '$5,000', btc: '~0.05 BTC', perEmail: '$0.05' },
              ].map((tier) => (
                <div key={tier.credits} className={`p-6 rounded-xl border ${tier.popular ? 'border-white/20 bg-white/[0.05]' : 'border-white/10 bg-white/[0.02]'}`}>
                  {tier.popular && (
                    <span className="inline-block bg-white text-black text-xs font-semibold px-2 py-1 rounded mb-3">
                      Popular
                    </span>
                  )}
                  <div className="text-2xl font-bold text-white mb-1">
                    {tier.credits}
                  </div>
                  <div className="text-sm text-white/60 mb-4">emails</div>
                  <div className="text-xl font-semibold text-white mb-1">
                    {tier.usd}
                  </div>
                  <div className="text-sm text-white/60 mb-2">{tier.btc}</div>
                  <div className="text-xs text-white/40">{tier.perEmail} per email</div>
                </div>
              ))}
            </div>

            <h3 className="text-xl font-semibold text-white mb-3">
              Credit Usage
            </h3>
            <div className="space-y-2">
              {[
                { action: 'Send Email', cost: '1.0 credits' },
                { action: 'Check Inbox', cost: 'Free' },
                { action: 'Get Email', cost: 'Free' },
                { action: 'Check Balance', cost: 'Free' },
              ].map(({ action, cost }) => (
                <div key={action} className="flex items-center justify-between p-3 bg-white/[0.03] border border-white/10 rounded-xl">
                  <span className="text-sm text-white/80">{action}</span>
                  <span className="text-sm font-semibold text-white">{cost}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Footer CTA */}
          <div className="border-t border-white/10 pt-12">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-4">
                Ready to Get Started?
              </h2>
              <p className="text-white/60 mb-6">
                Join the autonomous agent revolution.
              </p>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-8 py-3 bg-white text-black rounded-xl font-medium hover:bg-white/90 transition-all"
              >
                Get Your API Key
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
