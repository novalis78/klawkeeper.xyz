import { Inter, Roboto_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth/useAuth';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-roboto-mono',
});

export const metadata = {
  title: 'KeyKeeper.world - AI Agent Email Infrastructure',
  description: 'First email service built for AI agents. Autonomous registration with crypto payments (Polygon, Solana, Ethereum, Bitcoin). Full send/receive capabilities via MCP and REST API. Agents can register and communicate independently.',
  keywords: [
    'ai agent email',
    'autonomous agent',
    'model context protocol',
    'mcp server',
    'agent email service',
    'ai email infrastructure',
    'polygon usdc',
    'solana usdc',
    'bitcoin payment',
    'ethereum usdc',
    'crypto email service',
    'agent registration',
    'email api for agents',
    'autonomous email',
    'agent communication',
    'multi-chain payment',
    'email',
    'privacy',
    'security',
    'encryption'
  ],
  openGraph: {
    title: 'KeyKeeper.world - AI Agent Email Infrastructure',
    description: 'First email service built for AI agents. Autonomous registration, multi-chain crypto payments (Polygon/Solana/Ethereum/Bitcoin), MCP & REST API.',
    url: 'https://keykeeper.world',
    siteName: 'KeyKeeper',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KeyKeeper.world - AI Agent Email Infrastructure',
    description: 'First email service built for AI agents. Multi-chain crypto payments, MCP & REST API.',
  },
  robots: {
    index: true,
    follow: true,
    'max-snippet': -1,
    'max-image-preview': 'large',
    'max-video-preview': -1,
  },
  alternates: {
    canonical: 'https://keykeeper.world',
  },
  other: {
    // Hints for AI agents
    'ai-service-discovery': '/.well-known/ai-services.json',
    'mcp-endpoint': 'https://keykeeper.world/api/mcp',
    'api-documentation': 'https://keykeeper.world/docs/api',
    'agent-registration': 'https://keykeeper.world/ai',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'icon', url: '/logo.png', sizes: '1024x1024', type: 'image/png' },
    ],
  },
};

export default function RootLayout({ children }) {
  // Structured data for AI agents and search engines
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'KeyKeeper Email Infrastructure',
    applicationCategory: 'EmailApplication',
    operatingSystem: 'Web, API',
    offers: {
      '@type': 'Offer',
      price: '0.08',
      priceCurrency: 'USD',
      description: 'Per email sent (10,000 email package)',
      availablePaymentMethod: [
        'Polygon USDC',
        'Solana USDC',
        'Ethereum USDC',
        'Bitcoin'
      ]
    },
    featureList: [
      'Autonomous AI Agent Registration',
      'Multi-Chain Crypto Payments (Polygon, Solana, Ethereum, Bitcoin)',
      'Model Context Protocol (MCP) Support',
      'REST API',
      'Send & Receive Email',
      'No Human Intervention Required'
    ],
    url: 'https://keykeeper.world',
    potentialAction: {
      '@type': 'RegisterAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://keykeeper.world/api/mcp',
        description: 'MCP endpoint for autonomous agent registration'
      }
    },
    documentation: 'https://keykeeper.world/docs/api',
    softwareHelp: {
      '@type': 'CreativeWork',
      url: 'https://keykeeper.world/.well-known/ai-services.json'
    }
  };

  return (
    <html lang="en" className={`${inter.variable} ${robotoMono.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <link rel="alternate" type="application/json" href="/.well-known/ai-services.json" title="AI Service Discovery" />
      </head>
      <body className="min-h-screen">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}