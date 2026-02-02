'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  UserCircleIcon,
  CreditCardIcon,
  GlobeAltIcon,
  KeyIcon,
  BellIcon,
  PaintBrushIcon,
  EnvelopeIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClipboardDocumentIcon,
  ArrowTopRightOnSquareIcon,
  PlusIcon,
  TrashIcon,
  CloudIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  DeviceTabletIcon,
  MapPinIcon,
  ClockIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';
import DashboardLayout from '../../../components/dashboard/DashboardLayout';
import { QRCodeSVG } from 'qrcode.react';

function SettingsContent() {
  const searchParams = useSearchParams();
  const [activeSection, setActiveSection] = useState('account');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [domains, setDomains] = useState([]);
  const [showAddDomain, setShowAddDomain] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [copiedField, setCopiedField] = useState(null);

  // Cloudflare state
  const [cloudflare, setCloudflare] = useState({ connected: false, zones: [], loading: false });
  const [showCfConnect, setShowCfConnect] = useState(false);
  const [cfApiToken, setCfApiToken] = useState('');
  const [cfConnecting, setCfConnecting] = useState(false);
  const [cfError, setCfError] = useState('');
  const [selectedZone, setSelectedZone] = useState(null);
  const [setupDnsLoading, setSetupDnsLoading] = useState(false);

  // Sessions state
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [revokingSession, setRevokingSession] = useState(null);

  // Bitcoin payment state
  const [showBitcoinPayment, setShowBitcoinPayment] = useState(false);
  const [bitcoinPayment, setBitcoinPayment] = useState(null);
  const [bitcoinPaymentStatus, setBitcoinPaymentStatus] = useState('loading');
  const [bitcoinError, setBitcoinError] = useState('');

  // Settings state
  const [settings, setSettings] = useState({
    name: '',
    email: '',
    autoEncrypt: true,
    attachPublicKey: true,
    emailNotifications: true,
    securityAlerts: true,
    emailTemplate: 'default'
  });

  // Template saved notification
  const [templateSaved, setTemplateSaved] = useState(false);

  // PGP Key details
  const [masterKeyDetails, setMasterKeyDetails] = useState({
    fingerprint: user?.fingerprint || 'Loading...',
    created: user?.createdAt || 'N/A',
    type: 'RSA-4096',
    expires: 'Never',
    backupStatus: 'disabled'
  });

  // Email templates
  const emailTemplates = [
    { id: 'default', name: 'KeyKeeper Classic', description: 'Clean and professional', colors: { bg: '#ffffff', text: '#333333', accent: '#2b7de9' }},
    { id: 'midnight', name: 'Midnight', description: 'Dark and elegant', colors: { bg: '#1a1b26', text: '#a9b1d6', accent: '#7aa2f7' }},
    { id: 'dracula', name: 'Dracula', description: 'Dark with vibrant accents', colors: { bg: '#282a36', text: '#f8f8f2', accent: '#bd93f9' }},
    { id: 'nord', name: 'Nord', description: 'Arctic and minimalist', colors: { bg: '#2e3440', text: '#eceff4', accent: '#88c0d0' }},
    { id: 'solarized', name: 'Solarized Light', description: 'Easy on the eyes', colors: { bg: '#fdf6e3', text: '#657b83', accent: '#268bd2' }},
    { id: 'gruvbox', name: 'Gruvbox', description: 'Retro and warm', colors: { bg: '#282828', text: '#ebdbb2', accent: '#fe8019' }},
    { id: 'monokai', name: 'Monokai', description: 'Classic dark theme', colors: { bg: '#272822', text: '#f8f8f2', accent: '#a6e22e' }},
    { id: 'ocean', name: 'Ocean', description: 'Calm and serene', colors: { bg: '#ffffff', text: '#1e3a5f', accent: '#0077b6' }},
    { id: 'rose', name: 'Rose Pine', description: 'Soft and natural', colors: { bg: '#191724', text: '#e0def4', accent: '#eb6f92' }},
    { id: 'plain', name: 'Plain Text', description: 'No formatting, just text', colors: null },
  ];

  useEffect(() => {
    fetchUserData();

    // Load saved template preference from localStorage
    const savedTemplate = localStorage.getItem('email_template');
    if (savedTemplate) {
      setSettings(s => ({ ...s, emailTemplate: savedTemplate }));
    }

    // Check for section query parameter (e.g., ?section=security)
    const section = searchParams.get('section');
    if (section && ['account', 'billing', 'domains', 'security', 'email', 'notifications', 'appearance'].includes(section)) {
      setActiveSection(section);
    }
  }, [searchParams]);

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('auth_token');

      // Fetch user profile
      const profileRes = await fetch('/api/user/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setUser(profileData.user);
        setSettings(s => ({
          ...s,
          name: profileData.user?.name || '',
          email: profileData.user?.email || ''
        }));
        // Update master key details
        setMasterKeyDetails(prev => ({
          ...prev,
          fingerprint: profileData.user?.fingerprint || 'Not available',
          created: profileData.user?.createdAt ? new Date(profileData.user.createdAt).toLocaleDateString() : 'N/A'
        }));
      }

      // Fetch subscription status
      const subRes = await fetch('/api/user/subscription', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (subRes.ok) {
        const subData = await subRes.json();
        setSubscription(subData);
      }

      // Fetch user domains
      const domainsRes = await fetch('/api/user/domains', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (domainsRes.ok) {
        const domainsData = await domainsRes.json();
        setDomains(domainsData.domains || []);
      }

    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleAddDomain = async () => {
    if (!newDomain.trim()) return;

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/user/domains', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ domain: newDomain.trim() })
      });

      if (res.ok) {
        const data = await res.json();
        setDomains([...domains, data.domain]);
        setNewDomain('');
        setShowAddDomain(false);
      }
    } catch (error) {
      console.error('Error adding domain:', error);
    }
  };

  // Cloudflare functions
  const fetchCloudflareZones = async () => {
    setCloudflare(prev => ({ ...prev, loading: true }));
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/cloudflare/zones', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (res.ok) {
        setCloudflare({ connected: data.connected, zones: data.zones || [], loading: false });
      } else {
        setCloudflare({ connected: false, zones: [], loading: false });
      }
    } catch (error) {
      console.error('Error fetching Cloudflare zones:', error);
      setCloudflare({ connected: false, zones: [], loading: false });
    }
  };

  const connectCloudflare = async () => {
    if (!cfApiToken.trim()) {
      setCfError('Please enter your Cloudflare API token');
      return;
    }

    setCfConnecting(true);
    setCfError('');

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/cloudflare/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ apiToken: cfApiToken.trim() })
      });

      const data = await res.json();

      if (res.ok) {
        setShowCfConnect(false);
        setCfApiToken('');
        fetchCloudflareZones();
      } else {
        setCfError(data.error || 'Failed to connect');
      }
    } catch (error) {
      setCfError('Network error. Please try again.');
    } finally {
      setCfConnecting(false);
    }
  };

  const disconnectCloudflare = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      await fetch('/api/cloudflare/connect', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setCloudflare({ connected: false, zones: [], loading: false });
    } catch (error) {
      console.error('Error disconnecting Cloudflare:', error);
    }
  };

  const setupDns = async (zoneId, domain) => {
    setSetupDnsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/cloudflare/setup-dns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ zoneId, domain })
      });

      const data = await res.json();

      if (res.ok) {
        alert(`DNS records configured for ${domain}!\n\nCreated: ${data.results.created.length}\nSkipped: ${data.results.skipped.length}\nErrors: ${data.results.errors.length}`);
        // Refresh domains list
        const domainsRes = await fetch('/api/user/domains', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (domainsRes.ok) {
          const domainsData = await domainsRes.json();
          setDomains(domainsData.domains || []);
        }
      } else {
        alert(data.error || 'Failed to setup DNS');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    } finally {
      setSetupDnsLoading(false);
    }
  };

  // Load Cloudflare status when domains section is active
  useEffect(() => {
    if (activeSection === 'domains' && subscription?.subscription?.status === 'active') {
      fetchCloudflareZones();
    }
  }, [activeSection, subscription]);

  // Load sessions when security section is active
  useEffect(() => {
    if (activeSection === 'security') {
      fetchSessions();
      // Also register/update the current session
      registerSession();
    }
  }, [activeSection]);

  const fetchSessions = async () => {
    setSessionsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/user/sessions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setSessionsLoading(false);
    }
  };

  const registerSession = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      await fetch('/api/user/sessions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Error registering session:', error);
    }
  };

  const revokeSession = async (sessionId) => {
    setRevokingSession(sessionId);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/user/sessions', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ sessionId })
      });

      if (res.ok) {
        setSessions(sessions.filter(s => s.id !== sessionId));
      }
    } catch (error) {
      console.error('Error revoking session:', error);
    } finally {
      setRevokingSession(null);
    }
  };

  const revokeAllOtherSessions = async () => {
    if (!confirm('Are you sure you want to sign out all other devices?')) return;

    setRevokingSession('all');
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/user/sessions', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ revokeAll: true })
      });

      if (res.ok) {
        // Keep only current session
        setSessions(sessions.filter(s => s.isCurrent));
      }
    } catch (error) {
      console.error('Error revoking sessions:', error);
    } finally {
      setRevokingSession(null);
    }
  };

  // Format relative time
  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  // Get device icon
  const getDeviceIcon = (device) => {
    if (device === 'Mobile') return DevicePhoneMobileIcon;
    if (device === 'Tablet') return DeviceTabletIcon;
    return ComputerDesktopIcon;
  };

  // Get browser color
  const getBrowserColor = (browser) => {
    const colors = {
      'Chrome': 'text-green-400',
      'Firefox': 'text-orange-400',
      'Safari': 'text-blue-400',
      'Edge': 'text-cyan-400',
      'Opera': 'text-red-400'
    };
    return colors[browser] || 'text-gray-400';
  };

  // Bitcoin payment functions
  const initiateBitcoinPayment = async () => {
    setBitcoinPaymentStatus('loading');
    setBitcoinError('');
    setShowBitcoinPayment(true);
    setBitcoinPayment(null);

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/user/payment/bitcoin/initiate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (res.ok) {
        setBitcoinPayment(data);
        setBitcoinPaymentStatus('waiting');
        // Start polling for payment
        startPaymentPolling(data.paymentToken);
      } else {
        setBitcoinError(data.error || 'Failed to initiate Bitcoin payment');
        setBitcoinPaymentStatus('error');
      }
    } catch (error) {
      console.error('Bitcoin payment error:', error);
      setBitcoinError('Network error. Please try again.');
      setBitcoinPaymentStatus('error');
    }
  };

  const checkBitcoinPaymentStatus = async (paymentToken) => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/user/payment/bitcoin/status/${paymentToken}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (res.ok) {
        if (data.status === 'confirmed') {
          setBitcoinPaymentStatus('confirmed');
          // Refresh user data to show updated subscription
          fetchUserData();
          return true; // Stop polling
        } else if (data.status === 'pending_confirmation') {
          setBitcoinPaymentStatus('pending_confirmation');
        }
      }
      return false; // Continue polling
    } catch (error) {
      console.error('Error checking payment status:', error);
      return false;
    }
  };

  const startPaymentPolling = (paymentToken) => {
    // Poll every 10 seconds
    const pollInterval = setInterval(async () => {
      const shouldStop = await checkBitcoinPaymentStatus(paymentToken);
      if (shouldStop) {
        clearInterval(pollInterval);
      }
    }, 10000);

    // Clean up on unmount
    return () => clearInterval(pollInterval);
  };

  const closeBitcoinPayment = () => {
    setShowBitcoinPayment(false);
    setBitcoinPayment(null);
    setBitcoinPaymentStatus('loading');
    setBitcoinError('');
  };

  const [upgradeLoading, setUpgradeLoading] = useState(null);
  const [upgradeError, setUpgradeError] = useState('');

  const handleUpgrade = async (planId) => {
    // Bitcoin plan should show payment modal
    if (planId === 'bitcoin') {
      await initiateBitcoinPayment();
      return;
    }

    setUpgradeLoading(planId);
    setUpgradeError('');

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ planId })
      });

      const data = await res.json();

      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        setUpgradeError(data.error || 'Failed to start checkout. Please try again.');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      setUpgradeError('Network error. Please check your connection.');
    } finally {
      setUpgradeLoading(null);
    }
  };

  const sections = [
    { id: 'account', name: 'Account', icon: UserCircleIcon },
    { id: 'billing', name: 'Billing & Plans', icon: CreditCardIcon },
    { id: 'domains', name: 'Custom Domains', icon: GlobeAltIcon },
    { id: 'security', name: 'Security', icon: ShieldCheckIcon },
    { id: 'email', name: 'Email Preferences', icon: EnvelopeIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'appearance', name: 'Email Style', icon: PaintBrushIcon },
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Settings</h1>
          <p className="mt-2 text-gray-400">Manage your account, billing, and preferences</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <nav className="lg:w-64 flex-shrink-0">
            <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-2">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    activeSection === section.id
                      ? 'bg-primary-600/20 text-primary-400 border border-primary-500/30'
                      : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
                  }`}
                >
                  <section.icon className="h-5 w-5" />
                  {section.name}
                </button>
              ))}
            </div>
          </nav>

          {/* Main Content */}
          <div className="flex-1 space-y-6">
            {/* Account Section */}
            {activeSection === 'account' && (
              <div className="space-y-6">
                <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
                  <h2 className="text-xl font-semibold text-white mb-6">Profile Information</h2>

                  <div className="flex items-start gap-6 mb-6">
                    <div className="h-20 w-20 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                      {settings.name?.charAt(0)?.toUpperCase() || settings.email?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-white">{settings.name || 'User'}</h3>
                      <p className="text-gray-400">{settings.email}</p>
                      <div className="mt-2 flex gap-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-500/20 text-primary-400 border border-primary-500/30">
                          {subscription?.subscription?.status === 'active' ? 'Pro' : 'Free Plan'}
                        </span>
                        {user?.hasPgpKeys && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                            <KeyIcon className="h-3 w-3 mr-1" />
                            PGP Active
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Display Name</label>
                      <input
                        type="text"
                        value={settings.name}
                        onChange={(e) => setSettings({...settings, name: e.target.value})}
                        className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Your name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
                      <input
                        type="email"
                        value={settings.email}
                        disabled
                        className="w-full bg-gray-900/30 border border-gray-700/50 rounded-lg px-4 py-2.5 text-gray-400 cursor-not-allowed"
                      />
                      <p className="mt-1.5 text-xs text-gray-500">Email is tied to your PGP identity and cannot be changed</p>
                    </div>
                  </div>
                </div>

                {/* PGP Key Info */}
                {user?.publicKey && (
                  <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
                    <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                      <KeyIcon className="h-5 w-5 text-primary-400" />
                      PGP Key
                    </h2>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-gray-900/50 rounded-lg p-4">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Key ID</p>
                        <p className="text-sm font-mono text-white">{user.keyId || 'Not set'}</p>
                      </div>
                      <div className="bg-gray-900/50 rounded-lg p-4">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Fingerprint</p>
                        <p className="text-sm font-mono text-white truncate">{user.fingerprint || 'Not set'}</p>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-gray-300">Public Key</p>
                        <button
                          onClick={() => copyToClipboard(user.publicKey, 'publicKey')}
                          className="inline-flex items-center gap-1.5 text-xs text-primary-400 hover:text-primary-300"
                        >
                          {copiedField === 'publicKey' ? (
                            <>
                              <CheckIcon className="h-4 w-4" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <ClipboardDocumentIcon className="h-4 w-4" />
                              Copy
                            </>
                          )}
                        </button>
                      </div>
                      <textarea
                        readOnly
                        value={user.publicKey}
                        rows={4}
                        className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-xs font-mono text-gray-400"
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <button className="px-6 py-2.5 bg-primary-600 hover:bg-primary-500 text-white font-medium rounded-lg transition-colors">
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {/* Billing Section */}
            {activeSection === 'billing' && (
              <div className="space-y-6">
                {/* Current Plan */}
                <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
                  <h2 className="text-xl font-semibold text-white mb-6">Current Plan</h2>

                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary-600/20 to-purple-600/20 rounded-xl border border-primary-500/30">
                    <div>
                      <div className="flex items-center gap-2">
                        <SparklesIcon className="h-5 w-5 text-primary-400" />
                        <h3 className="text-lg font-semibold text-white">
                          {subscription?.subscription?.plan || 'Free'} Plan
                        </h3>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">
                        {subscription?.subscription?.status === 'active'
                          ? `Renews ${new Date(subscription.subscription.expiresAt).toLocaleDateString()}`
                          : 'Upgrade to unlock more features'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-white">
                        {subscription?.usage?.emailsRemaining || 3}
                      </p>
                      <p className="text-xs text-gray-400">emails remaining today</p>
                    </div>
                  </div>

                  {/* Usage Bar */}
                  <div className="mt-4">
                    <div className="flex justify-between text-sm text-gray-400 mb-2">
                      <span>Daily Usage</span>
                      <span>{subscription?.usage?.emailsSentToday || 0} / {subscription?.usage?.emailLimit || 3}</span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary-500 to-purple-500 rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, ((subscription?.usage?.emailsSentToday || 0) / (subscription?.usage?.emailLimit || 3)) * 100)}%`
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Pricing Plans */}
                <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
                  <h2 className="text-xl font-semibold text-white mb-6">Available Plans</h2>

                  {upgradeError && (
                    <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                      {upgradeError}
                    </div>
                  )}

                  <div className="grid md:grid-cols-3 gap-4">
                    {/* Personal Plan */}
                    <div className="relative bg-gray-900/50 rounded-xl border border-gray-700 p-6 hover:border-primary-500/50 transition-colors">
                      <h3 className="text-lg font-semibold text-white">Personal</h3>
                      <div className="mt-2">
                        <span className="text-3xl font-bold text-white">$2.99</span>
                        <span className="text-gray-400">/month</span>
                      </div>
                      <ul className="mt-4 space-y-2">
                        <li className="flex items-center gap-2 text-sm text-gray-300">
                          <CheckIcon className="h-4 w-4 text-green-400" />
                          100 emails per day
                        </li>
                        <li className="flex items-center gap-2 text-sm text-gray-300">
                          <CheckIcon className="h-4 w-4 text-green-400" />
                          1GB storage
                        </li>
                        <li className="flex items-center gap-2 text-sm text-gray-300">
                          <CheckIcon className="h-4 w-4 text-green-400" />
                          Full PGP encryption
                        </li>
                        <li className="flex items-center gap-2 text-sm text-gray-300">
                          <CheckIcon className="h-4 w-4 text-green-400" />
                          No branding
                        </li>
                      </ul>
                      <button
                        onClick={() => handleUpgrade('personal')}
                        disabled={upgradeLoading === 'personal'}
                        className="mt-6 w-full py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {upgradeLoading === 'personal' ? 'Loading...' : 'Upgrade'}
                      </button>
                    </div>

                    {/* Pro Plan */}
                    <div className="relative bg-gradient-to-b from-primary-900/30 to-gray-900/50 rounded-xl border-2 border-primary-500/50 p-6">
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="bg-primary-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                          Most Popular
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-white">Pro</h3>
                      <div className="mt-2">
                        <span className="text-3xl font-bold text-white">$6.99</span>
                        <span className="text-gray-400">/month</span>
                      </div>
                      <ul className="mt-4 space-y-2">
                        <li className="flex items-center gap-2 text-sm text-gray-300">
                          <CheckIcon className="h-4 w-4 text-green-400" />
                          500 emails per day
                        </li>
                        <li className="flex items-center gap-2 text-sm text-gray-300">
                          <CheckIcon className="h-4 w-4 text-green-400" />
                          5GB storage
                        </li>
                        <li className="flex items-center gap-2 text-sm text-gray-300">
                          <CheckIcon className="h-4 w-4 text-green-400" />
                          Custom domains
                        </li>
                        <li className="flex items-center gap-2 text-sm text-gray-300">
                          <CheckIcon className="h-4 w-4 text-green-400" />
                          API access
                        </li>
                      </ul>
                      <button
                        onClick={() => handleUpgrade('pro')}
                        disabled={upgradeLoading === 'pro'}
                        className="mt-6 w-full py-2.5 bg-primary-600 hover:bg-primary-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {upgradeLoading === 'pro' ? 'Loading...' : 'Upgrade to Pro'}
                      </button>
                    </div>

                    {/* Bitcoin Plan */}
                    <div className="relative bg-gray-900/50 rounded-xl border border-amber-500/30 p-6">
                      <div className="absolute -top-3 right-4">
                        <span className="bg-amber-500 text-black text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1">
                          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor">
                            <path d="M23.638 14.904c-1.602 6.43-8.113 10.34-14.542 8.736C2.67 22.05-1.244 15.525.362 9.105 1.962 2.67 8.475-1.243 14.9.358c6.43 1.605 10.342 8.115 8.738 14.548v-.002z"/>
                          </svg>
                          Bitcoin
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-white">3-Year Deal</h3>
                      <div className="mt-2">
                        <span className="text-3xl font-bold text-white">$30</span>
                        <span className="text-gray-400"> one-time</span>
                      </div>
                      <p className="text-xs text-amber-400 mt-1">Just $0.83/month</p>
                      <ul className="mt-4 space-y-2">
                        <li className="flex items-center gap-2 text-sm text-gray-300">
                          <CheckIcon className="h-4 w-4 text-green-400" />
                          500 emails per day
                        </li>
                        <li className="flex items-center gap-2 text-sm text-gray-300">
                          <CheckIcon className="h-4 w-4 text-green-400" />
                          Maximum privacy
                        </li>
                        <li className="flex items-center gap-2 text-sm text-gray-300">
                          <CheckIcon className="h-4 w-4 text-green-400" />
                          No recurring charges
                        </li>
                      </ul>
                      <button
                        onClick={() => handleUpgrade('bitcoin')}
                        className="mt-6 w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-medium rounded-lg transition-colors"
                      >
                        Pay with Bitcoin
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Custom Domains Section */}
            {activeSection === 'domains' && (
              <div className="space-y-6">
                <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-semibold text-white">Custom Domains</h2>
                      <p className="text-sm text-gray-400 mt-1">Add your own domain to send and receive emails</p>
                    </div>
                    <button
                      onClick={() => setShowAddDomain(true)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-500 text-white font-medium rounded-lg transition-colors"
                    >
                      <PlusIcon className="h-5 w-5" />
                      Add Domain
                    </button>
                  </div>

                  {/* Add Domain Modal/Form */}
                  {showAddDomain && (
                    <div className="mb-6 p-4 bg-gray-900/50 rounded-xl border border-gray-700">
                      <h3 className="text-lg font-medium text-white mb-4">Add a New Domain</h3>
                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={newDomain}
                          onChange={(e) => setNewDomain(e.target.value)}
                          placeholder="yourdomain.com"
                          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                        <button
                          onClick={handleAddDomain}
                          className="px-6 py-2.5 bg-primary-600 hover:bg-primary-500 text-white font-medium rounded-lg transition-colors"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => setShowAddDomain(false)}
                          className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Domains List */}
                  {domains.length === 0 ? (
                    <div className="text-center py-12">
                      <GlobeAltIcon className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-white mb-2">No custom domains yet</h3>
                      <p className="text-gray-400 mb-6">Add a domain to start sending emails from your own address</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {domains.map((domain) => (
                        <DomainCard key={domain.id} domain={domain} onCopy={copyToClipboard} copiedField={copiedField} />
                      ))}
                    </div>
                  )}
                </div>

                {/* DNS Setup Instructions */}
                <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
                  <h2 className="text-xl font-semibold text-white mb-4">DNS Setup Guide</h2>
                  <p className="text-gray-400 mb-6">
                    To use your custom domain, add these DNS records to your domain registrar:
                  </p>

                  <div className="space-y-4">
                    <DNSRecordRow
                      type="MX"
                      name="@"
                      value="mail.keykeeper.world"
                      priority="10"
                      onCopy={copyToClipboard}
                      copiedField={copiedField}
                    />
                    <DNSRecordRow
                      type="TXT"
                      name="@"
                      value="v=spf1 include:keykeeper.world ~all"
                      onCopy={copyToClipboard}
                      copiedField={copiedField}
                    />
                    <DNSRecordRow
                      type="TXT"
                      name="_dmarc"
                      value="v=DMARC1; p=quarantine; rua=mailto:dmarc@keykeeper.world"
                      onCopy={copyToClipboard}
                      copiedField={copiedField}
                    />
                  </div>

                  {/* Cloudflare Integration */}
                  <div className="mt-8 p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl">
                    <div className="flex items-start gap-4">
                      <CloudIcon className="h-8 w-8 text-orange-400 flex-shrink-0" />
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-white mb-2">Cloudflare Integration</h3>

                        {/* Check if paid user */}
                        {subscription?.subscription?.status !== 'active' ? (
                          <div>
                            <p className="text-sm text-gray-400 mb-4">
                              Automatic DNS configuration requires a paid subscription.
                            </p>
                            <button
                              onClick={() => setActiveSection('billing')}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                            >
                              Upgrade to unlock
                            </button>
                          </div>
                        ) : cloudflare.connected ? (
                          <div>
                            <div className="flex items-center gap-2 mb-4">
                              <CheckCircleIcon className="h-5 w-5 text-green-400" />
                              <span className="text-sm text-green-400">Connected to Cloudflare</span>
                            </div>

                            {/* Zone selector and auto-setup */}
                            {cloudflare.zones.length > 0 ? (
                              <div className="space-y-4">
                                <div>
                                  <label className="block text-sm text-gray-400 mb-2">Select a domain to configure:</label>
                                  <select
                                    value={selectedZone?.id || ''}
                                    onChange={(e) => {
                                      const zone = cloudflare.zones.find(z => z.id === e.target.value);
                                      setSelectedZone(zone || null);
                                    }}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                  >
                                    <option value="">Choose a domain...</option>
                                    {cloudflare.zones.map(zone => (
                                      <option key={zone.id} value={zone.id}>{zone.name}</option>
                                    ))}
                                  </select>
                                </div>

                                {selectedZone && (
                                  <button
                                    onClick={() => setupDns(selectedZone.id, selectedZone.name)}
                                    disabled={setupDnsLoading}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-400 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                                  >
                                    {setupDnsLoading ? (
                                      <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                                        Setting up DNS...
                                      </>
                                    ) : (
                                      <>
                                        <CloudIcon className="h-5 w-5" />
                                        Auto-Configure DNS for {selectedZone.name}
                                      </>
                                    )}
                                  </button>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-400">No domains found in your Cloudflare account.</p>
                            )}

                            <button
                              onClick={disconnectCloudflare}
                              className="mt-4 text-sm text-red-400 hover:text-red-300"
                            >
                              Disconnect Cloudflare
                            </button>
                          </div>
                        ) : showCfConnect ? (
                          <div className="space-y-4">
                            <p className="text-sm text-gray-400">
                              Enter your Cloudflare API token. You can create one at{' '}
                              <a href="https://dash.cloudflare.com/profile/api-tokens" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">
                                dash.cloudflare.com/profile/api-tokens
                              </a>
                              {' '}with "Zone:DNS:Edit" permissions.
                            </p>

                            {cfError && (
                              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                                {cfError}
                              </div>
                            )}

                            <input
                              type="password"
                              value={cfApiToken}
                              onChange={(e) => setCfApiToken(e.target.value)}
                              placeholder="Cloudflare API Token"
                              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            />

                            <div className="flex gap-3">
                              <button
                                onClick={connectCloudflare}
                                disabled={cfConnecting}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-400 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                              >
                                {cfConnecting ? 'Connecting...' : 'Connect'}
                              </button>
                              <button
                                onClick={() => { setShowCfConnect(false); setCfError(''); }}
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm text-gray-400 mb-4">
                              Connect your Cloudflare account to automatically configure DNS records for your custom domains.
                            </p>
                            <button
                              onClick={() => setShowCfConnect(true)}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-400 text-white font-medium rounded-lg transition-colors"
                            >
                              <CloudIcon className="h-5 w-5" />
                              Connect Cloudflare
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Security Section */}
            {activeSection === 'security' && (
              <div className="space-y-6">
                {/* Master PGP Key */}
                <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <KeyIcon className="h-5 w-5 text-primary-400" />
                    <h2 className="text-xl font-semibold text-white">Master PGP Key</h2>
                  </div>
                  <p className="text-sm text-gray-400 mb-6">
                    Your master key is used to encrypt and sign all communications
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="p-4 bg-gray-900/50 rounded-xl">
                      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Key Fingerprint</dt>
                      <dd className="text-sm text-white font-mono break-all">{user?.fingerprint || 'Loading...'}</dd>
                    </div>
                    <div className="p-4 bg-gray-900/50 rounded-xl">
                      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Key Type</dt>
                      <dd className="text-sm text-white">RSA-4096</dd>
                    </div>
                    <div className="p-4 bg-gray-900/50 rounded-xl">
                      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Created</dt>
                      <dd className="text-sm text-white">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</dd>
                    </div>
                    <div className="p-4 bg-gray-900/50 rounded-xl">
                      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Expires</dt>
                      <dd className="text-sm text-white">Never</dd>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <a
                      href="/api/user/public-key"
                      download
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                      Download Public Key
                    </a>
                    <button
                      onClick={() => {
                        copyToClipboard(user?.fingerprint || '', 'fingerprint');
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      {copiedField === 'fingerprint' ? (
                        <>
                          <CheckIcon className="h-4 w-4" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <ClipboardDocumentIcon className="h-4 w-4" />
                          Copy Fingerprint
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Key Backup Status */}
                <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <ShieldCheckIcon className="h-5 w-5 text-primary-400" />
                    <h2 className="text-xl font-semibold text-white">Key Backup</h2>
                  </div>
                  <p className="text-sm text-gray-400 mb-6">
                    Securely encrypted backup of your master key
                  </p>

                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl mb-4">
                    <div className="flex items-start gap-3">
                      <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="text-sm font-medium text-yellow-400">Backup Not Configured</h3>
                        <p className="text-sm text-gray-400 mt-1">
                          Backing up your key is important for recovery. Your key will be encrypted with a recovery passphrase that only you know.
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <ShieldCheckIcon className="h-4 w-4" />
                    Enable Key Backup
                  </button>
                </div>

                {/* Two-Factor Authentication */}
                <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
                  <h2 className="text-xl font-semibold text-white mb-6">Two-Factor Authentication</h2>

                  <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className={`h-12 w-12 ${user?.totpEnabled ? 'bg-green-500/20' : 'bg-yellow-500/20'} rounded-full flex items-center justify-center`}>
                        <ShieldCheckIcon className={`h-6 w-6 ${user?.totpEnabled ? 'text-green-400' : 'text-yellow-400'}`} />
                      </div>
                      <div>
                        <h3 className="font-medium text-white">TOTP Authenticator</h3>
                        <p className="text-sm text-gray-400">Use an app like Google Authenticator, Authy, or 1Password</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        user?.totpEnabled
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {user?.totpEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                      <a
                        href="/dashboard/security/2fa"
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          user?.totpEnabled
                            ? 'bg-gray-700 hover:bg-gray-600 text-white'
                            : 'bg-primary-600 hover:bg-primary-500 text-white'
                        }`}
                      >
                        {user?.totpEnabled ? 'Manage' : 'Enable 2FA'}
                      </a>
                    </div>
                  </div>

                  {!user?.totpEnabled && (
                    <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                      <div className="flex items-start gap-3">
                        <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-medium text-yellow-400">Recommended: Enable 2FA</h4>
                          <p className="text-sm text-gray-400 mt-1">
                            Protect your account with two-factor authentication. Even if your password is compromised, your account remains secure.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-semibold text-white">Active Sessions</h2>
                      <p className="text-sm text-gray-400 mt-1">Devices where you're currently logged in</p>
                    </div>
                    {sessions.length > 1 && (
                      <button
                        onClick={revokeAllOtherSessions}
                        disabled={revokingSession === 'all'}
                        className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium rounded-lg border border-red-500/30 transition-colors disabled:opacity-50"
                      >
                        {revokingSession === 'all' ? 'Signing out...' : 'Sign out all other devices'}
                      </button>
                    )}
                  </div>

                  {sessionsLoading ? (
                    <div className="space-y-3">
                      {[1, 2].map(i => (
                        <div key={i} className="animate-pulse p-4 bg-gray-900/50 rounded-xl">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 bg-gray-700 rounded-xl"></div>
                            <div className="flex-1">
                              <div className="h-4 bg-gray-700 rounded w-1/3 mb-2"></div>
                              <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : sessions.length === 0 ? (
                    <div className="text-center py-8">
                      <ComputerDesktopIcon className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400">No active sessions found</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sessions.map((session) => {
                        const DeviceIcon = getDeviceIcon(session.device);
                        return (
                          <div
                            key={session.id}
                            className={`relative p-4 rounded-xl border transition-all ${
                              session.isCurrent
                                ? 'bg-primary-500/10 border-primary-500/30'
                                : 'bg-gray-900/50 border-gray-700/50 hover:border-gray-600'
                            }`}
                          >
                            <div className="flex items-start gap-4">
                              {/* Device Icon */}
                              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                                session.isCurrent ? 'bg-primary-500/20' : 'bg-gray-800'
                              }`}>
                                <DeviceIcon className={`h-6 w-6 ${
                                  session.isCurrent ? 'text-primary-400' : 'text-gray-400'
                                }`} />
                              </div>

                              {/* Session Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-medium text-white">
                                    {session.browser} on {session.os}
                                  </h3>
                                  {session.isCurrent && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                                      This device
                                    </span>
                                  )}
                                </div>

                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-400">
                                  {/* Location */}
                                  <span className="flex items-center gap-1">
                                    <MapPinIcon className="h-4 w-4" />
                                    {session.location}
                                  </span>

                                  {/* IP Address */}
                                  <span className="font-mono text-xs">
                                    {session.ipAddress}
                                  </span>

                                  {/* Last Active */}
                                  <span className="flex items-center gap-1">
                                    <ClockIcon className="h-4 w-4" />
                                    {session.isCurrent ? 'Active now' : formatRelativeTime(session.lastActive)}
                                  </span>
                                </div>
                              </div>

                              {/* Revoke Button */}
                              {!session.isCurrent && (
                                <button
                                  onClick={() => revokeSession(session.id)}
                                  disabled={revokingSession === session.id}
                                  className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                                  title="Sign out this device"
                                >
                                  {revokingSession === session.id ? (
                                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-400 border-t-transparent"></div>
                                  ) : (
                                    <XMarkIcon className="h-5 w-5" />
                                  )}
                                </button>
                              )}
                            </div>

                            {/* Current Session Indicator */}
                            {session.isCurrent && (
                              <div className="absolute top-0 right-0 h-3 w-3 -mt-1 -mr-1">
                                <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Security Info */}
                  <div className="mt-6 p-4 bg-gray-900/30 rounded-xl border border-gray-700/30">
                    <div className="flex items-start gap-3">
                      <ShieldCheckIcon className="h-5 w-5 text-primary-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium text-gray-300">Session Security</h4>
                        <p className="text-xs text-gray-500 mt-1">
                          If you notice any unfamiliar devices, sign them out immediately and consider changing your password. Enable 2FA for additional protection.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
                  <h2 className="text-xl font-semibold text-white mb-6">Password</h2>

                  <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 bg-gray-700 rounded-lg flex items-center justify-center">
                        <KeyIcon className="h-5 w-5 text-gray-400" />
                      </div>
                      <div>
                        <h3 className="font-medium text-white">Account Password</h3>
                        <p className="text-sm text-gray-400">Last changed: Never</p>
                      </div>
                    </div>
                    <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors">
                      Change Password
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Email Preferences */}
            {activeSection === 'email' && (
              <div className="space-y-6">
                <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
                  <h2 className="text-xl font-semibold text-white mb-6">Encryption Settings</h2>

                  <div className="space-y-4">
                    <ToggleSetting
                      title="Auto-encrypt emails"
                      description="Automatically encrypt emails when recipient's public key is available"
                      checked={settings.autoEncrypt}
                      onChange={(v) => setSettings({...settings, autoEncrypt: v})}
                    />
                    <ToggleSetting
                      title="Attach public key"
                      description="Include your public key as an attachment on outgoing emails"
                      checked={settings.attachPublicKey}
                      onChange={(v) => setSettings({...settings, attachPublicKey: v})}
                    />
                  </div>
                </div>

                <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
                  <h2 className="text-xl font-semibold text-white mb-6">Email Signature</h2>

                  <textarea
                    rows={4}
                    placeholder="Add your email signature..."
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    defaultValue="Best regards,&#10;&#10;Sent securely via KeyKeeper"
                  />
                </div>
              </div>
            )}

            {/* Notifications */}
            {activeSection === 'notifications' && (
              <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
                <h2 className="text-xl font-semibold text-white mb-6">Notification Preferences</h2>

                <div className="space-y-4">
                  <ToggleSetting
                    title="Email notifications"
                    description="Receive notifications about new emails"
                    checked={settings.emailNotifications}
                    onChange={(v) => setSettings({...settings, emailNotifications: v})}
                  />
                  <ToggleSetting
                    title="Security alerts"
                    description="Get notified about login attempts and security events"
                    checked={settings.securityAlerts}
                    onChange={(v) => setSettings({...settings, securityAlerts: v})}
                  />
                </div>
              </div>
            )}

            {/* Appearance */}
            {activeSection === 'appearance' && (
              <div className="space-y-6">
                {/* Success notification */}
                {templateSaved && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        <CheckCircleIcon className="h-6 w-6 text-green-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-green-400">Email style applied!</h3>
                        <p className="text-sm text-gray-400 mt-0.5">Your new email template has been saved successfully.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Email Template */}
                <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
                  <h2 className="text-xl font-semibold text-white mb-2">Email Template</h2>
                  <p className="text-sm text-gray-400 mb-6">Choose how your outgoing emails will look to recipients</p>

                  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                    {emailTemplates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => {
                          setSettings({...settings, emailTemplate: template.id});
                          localStorage.setItem('email_template', template.id);
                          // Show success feedback
                          setTemplateSaved(true);
                          setTimeout(() => setTemplateSaved(false), 3000);
                        }}
                        className={`group relative p-4 rounded-xl border-2 transition-all ${
                          settings.emailTemplate === template.id
                            ? 'border-primary-500 bg-primary-500/10'
                            : 'border-gray-700 hover:border-gray-600'
                        }`}
                      >
                        {/* Template Preview */}
                        <div
                          className="h-20 rounded-lg mb-3 overflow-hidden"
                          style={{
                            backgroundColor: template.colors?.bg || '#f5f5f5',
                          }}
                        >
                          {template.colors ? (
                            <div className="h-full p-2 flex flex-col">
                              {/* Mini header */}
                              <div
                                className="h-3 w-3/4 rounded mb-2 opacity-50"
                                style={{ backgroundColor: template.colors.accent }}
                              />
                              {/* Mini content lines */}
                              <div
                                className="h-2 w-full rounded mb-1 opacity-60"
                                style={{ backgroundColor: template.colors.text }}
                              />
                              <div
                                className="h-2 w-5/6 rounded mb-1 opacity-40"
                                style={{ backgroundColor: template.colors.text }}
                              />
                              <div
                                className="h-2 w-4/6 rounded opacity-40"
                                style={{ backgroundColor: template.colors.text }}
                              />
                            </div>
                          ) : (
                            <div className="h-full p-2 flex flex-col justify-center items-center text-gray-400">
                              <EnvelopeIcon className="h-6 w-6 mb-1 opacity-50" />
                              <span className="text-xs">Plain Text</span>
                            </div>
                          )}
                        </div>

                        {/* Template Info */}
                        <div className="text-left">
                          <span className="text-sm font-medium text-white block truncate">{template.name}</span>
                          <span className="text-xs text-gray-500 truncate block">{template.description}</span>
                        </div>

                        {/* Selected Indicator */}
                        {settings.emailTemplate === template.id && (
                          <div className="absolute -top-2 -right-2 h-6 w-6 bg-primary-500 rounded-full flex items-center justify-center">
                            <CheckIcon className="h-4 w-4 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Preview */}
                  {settings.emailTemplate && settings.emailTemplate !== 'plain' && (
                    <div className="mt-6 p-4 bg-gray-900/50 rounded-xl border border-gray-700">
                      <h3 className="text-sm font-medium text-gray-300 mb-3">Preview</h3>
                      <div
                        className="rounded-lg overflow-hidden"
                        style={{
                          backgroundColor: emailTemplates.find(t => t.id === settings.emailTemplate)?.colors?.bg || '#ffffff'
                        }}
                      >
                        {(() => {
                          const t = emailTemplates.find(t => t.id === settings.emailTemplate);
                          if (!t?.colors) return null;
                          return (
                            <div className="p-4">
                              {/* Header */}
                              <div
                                className="pb-3 mb-3 border-b"
                                style={{ borderColor: t.colors.accent + '40' }}
                              >
                                <h4
                                  style={{ color: t.colors.text }}
                                  className="text-lg font-semibold"
                                >
                                  Sample Email Subject
                                </h4>
                              </div>
                              {/* Body */}
                              <div style={{ color: t.colors.text }}>
                                <p className="text-sm mb-2">Hello there,</p>
                                <p className="text-sm mb-2">This is how your emails will look to recipients who view them in their email client.</p>
                                <p className="text-sm">Best regards</p>
                              </div>
                              {/* Footer */}
                              <div
                                className="mt-4 pt-3 border-t text-xs"
                                style={{ borderColor: t.colors.accent + '30', color: t.colors.text + '99' }}
                              >
                                <span style={{ color: t.colors.accent }}>KeyKeeper</span> Secure Email
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <button className="px-6 py-2.5 bg-primary-600 hover:bg-primary-500 text-white font-medium rounded-lg transition-colors">
                    Save Preferences
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bitcoin Payment Modal */}
      {showBitcoinPayment && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="h-7 w-7 text-amber-500" fill="currentColor">
                      <path d="M23.638 14.904c-1.602 6.43-8.113 10.34-14.542 8.736C2.67 22.05-1.244 15.525.362 9.105 1.962 2.67 8.475-1.243 14.9.358c6.43 1.605 10.342 8.115 8.738 14.548v-.002z"/>
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Pay with Bitcoin</h2>
                    <p className="text-sm text-gray-400">3-Year Plan - $30 one-time payment</p>
                  </div>
                </div>
                <button
                  onClick={closeBitcoinPayment}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Error State */}
              {bitcoinPaymentStatus === 'error' && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <div className="flex items-start gap-3">
                    <XCircleIcon className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-medium text-red-400">Payment Error</h3>
                      <p className="text-sm text-gray-400 mt-1">{bitcoinError}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Loading State */}
              {bitcoinPaymentStatus === 'loading' && (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-amber-500 mb-4"></div>
                  <p className="text-gray-400">Generating Bitcoin address...</p>
                </div>
              )}

              {/* Payment Details */}
              {bitcoinPayment && bitcoinPaymentStatus !== 'error' && bitcoinPaymentStatus !== 'loading' && (
                <div className="space-y-6">
                  {/* QR Code */}
                  <div className="flex justify-center">
                    <div className="bg-white p-6 rounded-2xl">
                      <QRCodeSVG
                        value={bitcoinPayment.qrData}
                        size={256}
                        level="H"
                        includeMargin={true}
                      />
                    </div>
                  </div>

                  {/* Bitcoin Address */}
                  <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-gray-300">Bitcoin Address</p>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(bitcoinPayment.bitcoinAddress);
                          setCopiedField('btc-address');
                          setTimeout(() => setCopiedField(null), 2000);
                        }}
                        className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300"
                      >
                        {copiedField === 'btc-address' ? (
                          <>
                            <CheckIcon className="h-4 w-4" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <ClipboardDocumentIcon className="h-4 w-4" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-sm font-mono text-white break-all bg-gray-800 p-3 rounded-lg">
                      {bitcoinPayment.bitcoinAddress}
                    </p>
                  </div>

                  {/* Amount */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700">
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Amount (BTC)</p>
                      <p className="text-lg font-mono font-bold text-white">{bitcoinPayment.amount.btc.toFixed(8)}</p>
                      <p className="text-xs text-gray-500 mt-1">{bitcoinPayment.amount.sats.toLocaleString()} sats</p>
                    </div>
                    <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700">
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Amount (USD)</p>
                      <p className="text-lg font-bold text-white">${bitcoinPayment.amount.usd}</p>
                      <p className="text-xs text-gray-500 mt-1">1 BTC ≈ ${bitcoinPayment.btcPrice.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Payment Status */}
                  <div className={`rounded-xl p-4 border ${
                    bitcoinPaymentStatus === 'confirmed'
                      ? 'bg-green-500/10 border-green-500/30'
                      : bitcoinPaymentStatus === 'pending_confirmation'
                      ? 'bg-yellow-500/10 border-yellow-500/30'
                      : 'bg-blue-500/10 border-blue-500/30'
                  }`}>
                    <div className="flex items-center gap-3">
                      {bitcoinPaymentStatus === 'confirmed' ? (
                        <>
                          <CheckCircleIcon className="h-6 w-6 text-green-400 flex-shrink-0" />
                          <div>
                            <h3 className="text-sm font-medium text-green-400">Payment Confirmed!</h3>
                            <p className="text-sm text-gray-400 mt-1">Your 3-year Bitcoin plan is now active. You can close this window.</p>
                          </div>
                        </>
                      ) : bitcoinPaymentStatus === 'pending_confirmation' ? (
                        <>
                          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-yellow-400 flex-shrink-0"></div>
                          <div>
                            <h3 className="text-sm font-medium text-yellow-400">Payment Detected</h3>
                            <p className="text-sm text-gray-400 mt-1">Waiting for blockchain confirmations...</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="animate-pulse h-6 w-6 bg-blue-400/50 rounded-full flex-shrink-0"></div>
                          <div>
                            <h3 className="text-sm font-medium text-blue-400">Waiting for Payment</h3>
                            <p className="text-sm text-gray-400 mt-1">Send the exact amount to the address above</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="bg-gray-900/30 rounded-xl p-4 border border-gray-700/50">
                    <h3 className="text-sm font-medium text-gray-300 mb-3">Instructions</h3>
                    <ul className="space-y-2">
                      {bitcoinPayment.instructions.map((instruction, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-gray-400">
                          <span className="text-amber-400 mt-0.5">•</span>
                          <span>{instruction}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Plan Benefits */}
                  <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-xl p-4 border border-amber-500/30">
                    <h3 className="text-sm font-medium text-amber-400 mb-3">What You Get</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <CheckIcon className="h-4 w-4 text-green-400" />
                        500 emails per day
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <CheckIcon className="h-4 w-4 text-green-400" />
                        3 years of service
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <CheckIcon className="h-4 w-4 text-green-400" />
                        Maximum privacy
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <CheckIcon className="h-4 w-4 text-green-400" />
                        No recurring charges
                      </div>
                    </div>
                  </div>

                  {/* Close Button */}
                  {bitcoinPaymentStatus === 'confirmed' && (
                    <button
                      onClick={closeBitcoinPayment}
                      className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-medium rounded-lg transition-colors"
                    >
                      Close & Continue
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

// Toggle Setting Component
function ToggleSetting({ title, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-xl">
      <div>
        <h3 className="font-medium text-white">{title}</h3>
        <p className="text-sm text-gray-400">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-primary-600' : 'bg-gray-700'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

// DNS Record Row Component
function DNSRecordRow({ type, name, value, priority, onCopy, copiedField }) {
  const fieldId = `${type}-${name}`;

  return (
    <div className="flex items-center gap-4 p-4 bg-gray-900/50 rounded-xl">
      <span className="px-3 py-1 bg-primary-500/20 text-primary-400 text-xs font-mono font-bold rounded">
        {type}
      </span>
      <div className="flex-1 grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-gray-500 uppercase">Name</p>
          <p className="text-sm font-mono text-white">{name}</p>
        </div>
        <div className="col-span-2">
          <p className="text-xs text-gray-500 uppercase">Value</p>
          <p className="text-sm font-mono text-white truncate">{value}</p>
        </div>
      </div>
      {priority && (
        <div>
          <p className="text-xs text-gray-500 uppercase">Priority</p>
          <p className="text-sm font-mono text-white">{priority}</p>
        </div>
      )}
      <button
        onClick={() => onCopy(value, fieldId)}
        className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors"
      >
        {copiedField === fieldId ? (
          <CheckIcon className="h-5 w-5 text-green-400" />
        ) : (
          <ClipboardDocumentIcon className="h-5 w-5" />
        )}
      </button>
    </div>
  );
}

// Domain Card Component
function DomainCard({ domain, onCopy, copiedField }) {
  const isVerified = domain.verified;

  return (
    <div className="p-4 bg-gray-900/50 rounded-xl border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <GlobeAltIcon className="h-5 w-5 text-gray-400" />
          <span className="font-medium text-white">{domain.name}</span>
        </div>
        <div className="flex items-center gap-2">
          {isVerified ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
              <CheckCircleIcon className="h-4 w-4" />
              Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">
              <ExclamationTriangleIcon className="h-4 w-4" />
              Pending DNS
            </span>
          )}
          <button className="p-1.5 text-gray-400 hover:text-red-400 rounded">
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!isVerified && (
        <div className="text-sm text-gray-400">
          <p className="mb-2">Add the following DNS records to verify your domain:</p>
          <button className="text-primary-400 hover:text-primary-300">
            View DNS records
          </button>
        </div>
      )}
    </div>
  );
}

// Default export with Suspense boundary for useSearchParams
export default function SettingsPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      </DashboardLayout>
    }>
      <SettingsContent />
    </Suspense>
  );
}
