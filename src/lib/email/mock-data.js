/**
 * Mock data for email dashboard development
 */

// Mock disposable addresses
export const mockDisposableAddresses = [
  {
    id: '1',
    address: 'alpha7391@keykeeper.world',
    created: '2025-04-25T10:32:15Z',
    expires: '2025-05-25T10:32:15Z',
    forwardTo: 'user@example.com',
    messageCount: 7,
    status: 'active',
    note: 'Shopping sites'
  },
  {
    id: '2',
    address: 'beta8312@keykeeper.world',
    created: '2025-04-20T14:43:22Z',
    expires: '2025-05-20T14:43:22Z',
    forwardTo: 'user@example.com',
    messageCount: 3,
    status: 'active',
    note: 'Newsletter subscriptions'
  },
  {
    id: '3',
    address: 'gamma5519@keykeeper.world',
    created: '2025-04-10T08:12:49Z',
    expires: '2025-04-10T08:12:49Z',
    forwardTo: 'user@example.com',
    messageCount: 12,
    status: 'expired',
    note: 'Job applications'
  },
  {
    id: '4',
    address: 'delta1167@keykeeper.world',
    created: '2025-04-28T16:51:33Z',
    expires: '2026-04-28T16:51:33Z',
    forwardTo: 'user@example.com',
    messageCount: 0,
    status: 'active',
    note: 'Social media'
  }
];

// Mock messages for inbox
export const mockMessages = [
  {
    id: '101',
    subject: 'Your Order Confirmation #12345',
    from: {
      name: 'Example Store',
      email: 'orders@example-store.com'
    },
    to: {
      name: 'User',
      email: 'alpha7391@keykeeper.world'
    },
    timestamp: '2025-04-29T09:12:42Z',
    encryptedBody: true, // Indicates message is PGP encrypted
    snippet: 'Thank you for your order! Your items will be shipped within 2 business days...',
    read: true,
    labels: ['shopping'],
    attachments: []
  },
  {
    id: '102',
    subject: 'Weekly Newsletter: Latest Security Updates',
    from: {
      name: 'Security Weekly',
      email: 'newsletter@security-weekly.com'
    },
    to: {
      name: 'User',
      email: 'beta8312@keykeeper.world'
    },
    timestamp: '2025-04-29T07:23:15Z',
    encryptedBody: true,
    snippet: 'In this week\'s security roundup: New vulnerabilities discovered in popular software...',
    read: false,
    labels: ['newsletter'],
    attachments: []
  },
  {
    id: '103',
    subject: 'Your application for Software Developer position',
    from: {
      name: 'HR Department',
      email: 'hr@tech-company.com'
    },
    to: {
      name: 'User',
      email: 'gamma5519@keykeeper.world'
    },
    timestamp: '2025-04-28T15:45:33Z',
    encryptedBody: true,
    snippet: 'Thank you for applying for the Software Developer position at Tech Company...',
    read: true,
    labels: ['job'],
    attachments: [
      {
        name: 'interview_details.pdf',
        size: 245000
      }
    ]
  },
  {
    id: '104',
    subject: 'Security Alert: New login to your account',
    from: {
      name: 'Secure Bank',
      email: 'security@secure-bank.com'
    },
    to: {
      name: 'User',
      email: 'alpha7391@keykeeper.world'
    },
    timestamp: '2025-04-28T12:32:19Z',
    encryptedBody: true,
    snippet: 'We detected a new login to your account from a device in Berlin, Germany...',
    read: false,
    labels: ['important', 'alert'],
    attachments: []
  },
  {
    id: '105',
    subject: 'Upcoming subscription renewal',
    from: {
      name: 'Streaming Service',
      email: 'billing@streaming-service.com'
    },
    to: {
      name: 'User',
      email: 'alpha7391@keykeeper.world'
    },
    timestamp: '2025-04-27T19:11:05Z',
    encryptedBody: true,
    snippet: 'Your subscription will renew on May 10, 2025. Your card ending in 4321 will be charged...',
    read: true,
    labels: ['subscription'],
    attachments: [
      {
        name: 'invoice_april.pdf',
        size: 124500
      }
    ]
  }
];

// Mock user profile
export const mockUserProfile = {
  name: 'Test User',
  email: 'user@example.com',
  keyId: 'ABC123456789DEF',
  plan: 'premium',
  created: '2025-03-15T08:00:00Z',
  addressQuota: {
    used: 4,
    total: 20
  },
  storageQuota: {
    used: 25600000, // in bytes
    total: 1073741824 // 1GB in bytes
  }
};

// Mock stats
export const mockStats = {
  emailsReceived: 124,
  emailsForwarded: 118,
  emailsEncrypted: 124,
  addressesActive: 3,
  addressesExpired: 1,
  averageResponseTime: 235 // ms
};