'use client';

import { useState, useEffect } from 'react';
import { 
  ArrowRightIcon, 
  LockClosedIcon, 
  CheckIcon,
  ExclamationCircleIcon,
  XMarkIcon,
  ShieldCheckIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/useAuth';

export default function TwoFactorSettingsPage() {
  const router = useRouter();
  const { user, getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [totpCode, setTotpCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [totpSecret, setTotpSecret] = useState('');
  const [setupStep, setSetupStep] = useState('setup'); // setup, verify, enabled, disable
  
  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    
    // Check current 2FA status
    if (user.totpEnabled) {
      setSetupStep('enabled');
    }
  }, [user, router]);

  const handleSetup2FA = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = getToken();
      const response = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to setup 2FA');
      }
      
      setQrCodeUrl(data.qrCodeUrl);
      setTotpSecret(data.secret);
      setBackupCodes(data.backupCodes || []);
      setSetupStep('verify');
      setSuccess('2FA setup initiated. Scan the QR code with your authenticator app.');
      
    } catch (error) {
      console.error('2FA setup error:', error);
      setError(error.message || 'Failed to setup 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!totpCode || totpCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const token = getToken();
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          totpCode: totpCode
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify 2FA');
      }
      
      setSetupStep('enabled');
      setSuccess('2FA has been successfully enabled for your account!');
      setTotpCode('');
      
      // Update user context
      window.location.reload(); // Simple way to refresh user context
      
    } catch (error) {
      console.error('2FA verification error:', error);
      setError(error.message || 'Failed to verify 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!confirm('Are you sure you want to disable 2FA? This will make your account less secure.')) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const token = getToken();
      const response = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to disable 2FA');
      }
      
      setSetupStep('setup');
      setSuccess('2FA has been disabled for your account.');
      
      // Update user context
      window.location.reload();
      
    } catch (error) {
      console.error('2FA disable error:', error);
      setError(error.message || 'Failed to disable 2FA');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard!');
    setTimeout(() => setSuccess(null), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="py-6">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg">
            {/* Header */}
            <div className="px-4 py-5 sm:p-6 sm:pb-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <LockClosedIcon className="h-6 w-6 text-primary-600" />
                </div>
                <div className="ml-3">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                    Two-Factor Authentication
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Add an extra layer of security to your account with TOTP-based 2FA.
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-4 py-5 sm:p-6">
              {error && (
                <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start">
                  <ExclamationCircleIcon className="h-5 w-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="ml-3">
                    <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                  </div>
                  <button 
                    type="button" 
                    className="ml-auto flex-shrink-0 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300"
                    onClick={() => setError(null)}
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              )}

              {success && (
                <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-start">
                  <CheckIcon className="h-5 w-5 text-green-500 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="ml-3">
                    <p className="text-sm text-green-700 dark:text-green-300">{success}</p>
                  </div>
                  <button 
                    type="button" 
                    className="ml-auto flex-shrink-0 text-green-500 dark:text-green-400 hover:text-green-600 dark:hover:text-green-300"
                    onClick={() => setSuccess(null)}
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              )}

              {/* Setup Step */}
              {setupStep === 'setup' && (
                <div className="text-center">
                  <div className="mb-6">
                    <ShieldCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Enable Two-Factor Authentication
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    Protect your account with an additional layer of security using an authenticator app.
                  </p>
                  
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSetup2FA}
                    disabled={loading}
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Setting up 2FA...
                      </>
                    ) : (
                      <>
                        Enable 2FA
                        <ArrowRightIcon className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </motion.button>
                </div>
              )}

              {/* Verify Step */}
              {setupStep === 'verify' && (
                <div>
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                      Scan QR Code with Authenticator App
                    </h3>
                    
                    {qrCodeUrl && (
                      <div className="mb-6">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeUrl)}`}
                          alt="2FA Setup QR Code"
                          className="mx-auto border border-gray-200 dark:border-gray-700 rounded-lg"
                        />
                      </div>
                    )}
                    
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-4">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                        Or manually enter This secret:
                      </h4>
                      <div className="flex items-center space-x-2">
                        <code className="flex-1 text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded font-mono break-all">
                          {totpSecret}
                        </code>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(totpSecret)}
                          className="px-3 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="totp-code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Verification Code
                      </label>
                      <input
                        type="text"
                        id="totp-code"
                        value={totpCode}
                        onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                        maxLength={6}
                        className="block w-full text-center text-2xl tracking-widest border-0 py-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 focus:ring-2 focus:ring-inset focus:ring-primary-500 dark:focus:ring-primary-400 sm:text-sm sm:leading-6 dark:bg-gray-800 rounded-lg"
                        placeholder="000000"
                        autoComplete="one-time-code"
                      />
                    </div>
                    
                    <motion.button
                      type="button"
                      onClick={handleVerify2FA}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={loading || totpCode.length !== 6}
                      className="w-full flex justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Verifying...
                        </>
                      ) : (
                        <>
                          Enable 2FA
                          <ArrowRightIcon className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </motion.button>
                  </div>
                  
                  {/* Backup Codes */}
                  {backupCodes.length > 0 && (
                    <div className="mt-6">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          Backup Codes
                        </h4>
                        <button
                          type="button"
                          onClick={() => setShowBackupCodes(!showBackupCodes)}
                          className="text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
                        >
                          {showBackupCodes ? 'Hide' : 'Show'}
                        </button>
                      </div>
                      
                      {showBackupCodes && (
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                          <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
                            Save these backup codes in a secure location. Each code can only be used once.
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                            {backupCodes.map((code, index) => (
                              <div key={index} className="bg-white dark:bg-gray-800 px-2 py-1 rounded border border-gray-200 dark:border-gray-600 text-center font-mono text-sm">
                                {code}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Enabled Step */}
              {setupStep === 'enabled' && (
                <div className="text-center">
                  <div className="mb-6">
                    <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900">
                      <ShieldCheckIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    2FA is Enabled
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    Your account is protected with two-factor authentication.
                  </p>
                  
                  <div className="space-y-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                        Security Tips:
                      </h4>
                      <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                        <li>• Keep your backup codes in a secure location</li>
                        <li>• Use a reputable authenticator app</li>
                        <li>• Never share your verification codes</li>
                        <li>• Consider using a hardware security key</li>
                      </ul>
                    </div>
                    
                    <motion.button
                      type="button"
                      onClick={handleDisable2FA}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={loading}
                      className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-red-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Disabling 2FA...
                        </>
                      ) : (
                        <>
                          <TrashIcon className="ml-2 h-4 w-4 text-red-700" />
                          Disable 2FA
                        </>
                      )}
                    </motion.button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}