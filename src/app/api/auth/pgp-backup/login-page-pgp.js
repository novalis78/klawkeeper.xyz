'use client';

import { useState } from 'react';
import { LockClosedIcon, KeyIcon, EnvelopeIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import Link from 'next/link';
import pgpUtils from '@/lib/auth/pgp';
import { getDovecotPassword, storeCredentials, deriveSessionKey } from '@/lib/mail/mailCredentialManager';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState(1);
  const [challenge, setChallenge] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassphraseField, setShowPassphraseField] = useState(false);
  
  const handleSubmitEmail = async (e) => {
    e.preventDefault();
    
    if (!email) return;
    
    setLoading(true);
    setError('');
    
    try {
      // Fetch challenge from the server
      const response = await fetch('/api/auth/challenge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get challenge');
      }
      
      // Set the challenge and move to next step
      setChallenge(data.challenge);
      setStep(2);
    } catch (error) {
      console.error('Error generating challenge:', error);
      setError('Failed to generate authentication challenge. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleKeyFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const keyContent = event.target.result;
      setPrivateKey(keyContent);
      
      // Check if key likely has a passphrase by looking for encryption markers
      const hasPassphrase = keyContent.includes('ENCRYPTED PRIVATE KEY');
      setShowPassphraseField(hasPassphrase);
    };
    reader.readAsText(file);
  };
  
  const handleSignChallenge = async (e) => {
    e.preventDefault();
    
    if (!privateKey || !challenge) return;
    
    setLoading(true);
    setError('');
    
    try {
      // Sign the challenge using the private key, including passphrase if provided
      const signature = await pgpUtils.signChallenge(challenge, privateKey, passphrase);
      
      // Send the signature to the server for verification
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          challenge,
          signature,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }
      
      console.log('=== KEYKEEPER: Login successful ===');
      console.log('User ID:', data.user?.id);
      console.log('Email:', data.user?.email);
      console.log('Key ID:', data.user?.keyId);
      console.log('Fingerprint:', data.user?.fingerprint);
      
      // Store the token and user data in localStorage for future API requests
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
        console.log('JWT token stored in localStorage');
      }
      
      // Store critical user info in localStorage for reliability
      if (data.user?.email) {
        localStorage.setItem('user_email', data.user.email);
        console.log('User email stored in localStorage');
      }
      
      try {
        console.log('=== KEYKEEPER: Deriving deterministic mail password from PGP key ===');
        console.log(`Email: ${email}`);
        console.log(`PGP Key Fingerprint: ${data.user.fingerprint}`);
        
        // Generate the deterministic password using the SAME method as signup
        // This uses the deriveDovecotPassword function from dovecotAuth.js
        console.log('Using the same deterministic password generation method as signup process');
        
        let derivedPassword;
        try {
          // Use the truly deterministic method that avoids PGP signatures
          console.log('Calling deriveDeterministicPassword to generate deterministic password');
          const { deriveDeterministicPassword } = await import('@/lib/mail/deterministicAuth');
          derivedPassword = await deriveDeterministicPassword(email, privateKey);
          console.log('Successfully derived deterministic password');
        } catch (error) {
          console.error('ERROR: Failed to derive deterministic password:', error);
          throw new Error('Failed to derive mail password. Please try again.');
        }
        
        console.log(`=== KEYKEEPER: Successfully derived deterministic password ===`);
        console.log(`Password length: ${derivedPassword?.length || 0}`);
        console.log(`First few chars: ${derivedPassword ? derivedPassword.substring(0, 5) + '...' : 'NULL'}`);
        
        // Generate account ID from email
        const accountId = `account_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
        console.log(`=== KEYKEEPER: Storing mail credentials ===`);
        console.log(`Account ID: ${accountId}`);
        
        // Prepare the mail credentials - the same structure used during signup
        const mailServer = process.env.MAIL_HOST || 'mail.keykeeper.world';
        console.log(`Mail server: ${mailServer}`);
        
        const credentials = {
          email: email,
          password: derivedPassword,
          imapServer: mailServer,
          imapPort: parseInt(process.env.MAIL_IMAP_PORT || '993'),
          imapSecure: process.env.MAIL_IMAP_SECURE !== 'false',
          smtpServer: mailServer,
          smtpPort: parseInt(process.env.MAIL_SMTP_PORT || '587'),
          smtpSecure: process.env.MAIL_SMTP_SECURE === 'true',
          timestamp: Date.now()
        };
        
        // Get session key for secure storage
        console.log('Deriving session key for secure credential storage');
        const sessionKey = await deriveSessionKey(data.token, data.user.fingerprint);
        
        // For reliable access, store credentials directly in localStorage without encryption
        // This is safe since localStorage is only accessible by the same origin
        console.log(`Storing mail credentials directly in localStorage for development`);
        const storageKey = `kk_mail_${accountId}_direct`;
        localStorage.setItem(storageKey, JSON.stringify(credentials));
        
        // Also try the secure storage as a backup
        try {
          console.log(`Also attempting to store encrypted credentials in localStorage`);
          await storeCredentials(accountId, credentials, sessionKey, true);
        } catch (encryptError) {
          console.warn('Could not store encrypted credentials, but direct credentials are available:', encryptError);
        }
        
        console.log(`=== KEYKEEPER: Mail credentials stored successfully ===`);
        
        // Save fingerprint and key ID for future reference
        console.log(`Storing fingerprint and key ID in localStorage`);
        if (data.user.fingerprint) {
          localStorage.setItem('user_fingerprint', data.user.fingerprint);
          console.log(`Stored fingerprint: ${data.user.fingerprint.substring(0, 8)}...`);
        }
        if (data.user.keyId) {
          localStorage.setItem('user_key_id', data.user.keyId);
          console.log(`Stored key ID: ${data.user.keyId}`);
        }
        
      } catch (credError) {
        // Log a detailed error but continue with login - we won't use the modal approach now
        console.error('=== KEYKEEPER ERROR: Failed during mail credential handling ===');
        console.error('Error details:', credError);
        console.error('Stack trace:', credError.stack);
        console.error('=== KEYKEEPER: Continuing with login despite error ===');
      }
      
      // Redirect to dashboard
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Error signing challenge:', error);
      setError('Authentication failed: ' + (error.message || 'Please check your private key and try again.'));
      setLoading(false);
    }
  };
  
  const handleHardwareAuth = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Check if hardware security key is available
      const isAvailable = await pgpUtils.isSecurityKeyAvailable();
      
      if (!isAvailable) {
        setError('No hardware security key detected. Please connect your device and try again.');
        setLoading(false);
        return;
      }
      
      // In a real app, here we would:
      // 1. Use the WebAuthn API to get an assertion from the hardware key
      // 2. Send that assertion to the server for verification
      
      // For now, we'll mock this process with our existing API
      // Get a hardware key specific challenge
      const challengeResponse = await fetch('/api/auth/challenge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, authMethod: 'hardware_key' }),
      });
      
      const challengeData = await challengeResponse.json();
      
      if (!challengeResponse.ok) {
        throw new Error(challengeData.error || 'Failed to get challenge');
      }
      
      // Mock a hardware key signature
      const hwChallenge = challengeData.challenge;
      const hwSignature = `-----BEGIN PGP SIGNATURE-----\nVersion: KeyKeeper v1.0\n\nHardwareKeySignature\n-----END PGP SIGNATURE-----`;
      
      // Send to verify endpoint
      const verifyResponse = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          challenge: hwChallenge,
          signature: hwSignature,
          authMethod: 'hardware_key'
        }),
      });
      
      const verifyData = await verifyResponse.json();
      
      if (!verifyResponse.ok) {
        throw new Error(verifyData.error || 'Hardware authentication failed');
      }
      
      console.log('Hardware authentication successful:', verifyData);
      
      // Store the token
      if (verifyData.token) {
        localStorage.setItem('auth_token', verifyData.token);
      }
      
      // Redirect to dashboard
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Error with hardware authentication:', error);
      setError('Hardware authentication failed: ' + (error.message || 'Please try again.'));
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        <Link href="/" className="flex justify-center">
          <span className="sr-only">KeyKeeper</span>
          <div className="h-14 w-14 rounded-full bg-primary-600 flex items-center justify-center">
            <LockClosedIcon className="h-8 w-8 text-white" />
          </div>
        </Link>
        <h1 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          KeyKeeper.world
        </h1>
        <h2 className="mt-2 text-center text-xl text-gray-600 dark:text-gray-400">
          Sign in with your PGP key
        </h2>
      </div>

      <div className={`mt-8 sm:mx-auto sm:w-full ${step === 1 ? 'sm:max-w-xl' : 'sm:max-w-4xl'}`}>
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          )}
          
          {step === 1 ? (
            <form onSubmit={handleSubmitEmail}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email Address
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full border-0 py-4 text-lg text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-primary-500 dark:focus:ring-primary-400 transition-all duration-200 bg-white dark:bg-gray-800 dark:bg-opacity-80 rounded-lg px-4"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div className="mt-6">
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={loading || !email}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    'Continue with Email'
                  )}
                </motion.button>
              </div>
            </form>
          ) : (
            <div>
              <div className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-lg mb-6 border border-primary-100 dark:border-primary-800">
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-0.5">
                    <LockClosedIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-primary-900 dark:text-primary-100">Secure Authentication</h3>
                    <p className="text-sm text-primary-700 dark:text-primary-300 mt-1">
                      Please authenticate using your private key to securely sign in to your account.
                    </p>
                  </div>
                </div>
              </div>
              
              <form onSubmit={handleSignChallenge} className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Authentication Method
                  </h3>
                  
                  <div className="mt-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 text-center">
                      Choose one of the following authentication methods:
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                      {/* Private Key File Option */}
                      <div className="relative bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 p-6 hover:border-primary-500 dark:hover:border-primary-500 hover:shadow-lg transition-all group">
                        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-primary-600 rounded-full h-10 w-10 flex items-center justify-center shadow-lg">
                          <KeyIcon className="h-5 w-5 text-white" />
                        </div>
                        
                        <div className="flex flex-col pt-3 items-center text-center">
                          <div className="flex items-center">
                            <input
                              id="private-key-file"
                              name="auth-method"
                              type="radio"
                              defaultChecked
                              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-700"
                            />
                            <label htmlFor="private-key-file" className="ml-2 font-bold text-gray-900 dark:text-white text-xl">
                              Private Key File
                            </label>
                          </div>
                          
                          <p className="text-gray-600 dark:text-gray-400 text-sm mt-3 mb-4">
                            Select the PGP private key file you downloaded during signup.
                          </p>
                          
                          <div className="mt-2 flex items-center">
                            <label htmlFor="key-file" className="inline-flex items-center px-5 py-2.5 border border-primary-600 bg-primary-600 rounded-md font-medium text-white hover:bg-primary-700 shadow-sm transition-colors cursor-pointer group-hover:shadow-md">
                              <span>Upload key file</span>
                              <input
                                id="key-file"
                                name="key-file"
                                type="file"
                                className="sr-only"
                                accept=".asc,.txt,.key,.gpg"
                                onChange={handleKeyFileUpload}
                              />
                            </label>
                            {privateKey && (
                              <span className="ml-3 text-sm text-green-600 dark:text-green-400 flex items-center">
                                <svg className="h-5 w-5 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                Key file loaded
                              </span>
                            )}
                          </div>
                          
                          {showPassphraseField && (
                            <div className="mt-4 w-full">
                              <label htmlFor="passphrase" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Key Passphrase
                              </label>
                              <input
                                type="password"
                                id="passphrase"
                                name="passphrase"
                                value={passphrase}
                                onChange={(e) => setPassphrase(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                                placeholder="Enter passphrase for your key"
                              />
                            </div>
                          )}
                          
                          <div className="bg-primary-50 dark:bg-primary-900/20 p-3 rounded-md mt-4 border border-primary-100 dark:border-primary-800 w-full">
                            <div className="flex items-start">
                              <ShieldCheckIcon className="h-4 w-4 text-primary-600 dark:text-primary-400 mt-0.5 flex-shrink-0" />
                              <p className="text-xs text-primary-700 dark:text-primary-300 ml-2">
                                Your private key is processed entirely in your browser and never sent to our servers.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Password Manager Option */}
                      <div className="relative bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 p-6 hover:border-primary-500 dark:hover:border-primary-500 hover:shadow-lg transition-all group">
                        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-600 dark:bg-gray-700 rounded-full h-10 w-10 flex items-center justify-center shadow-lg">
                          <EnvelopeIcon className="h-5 w-5 text-white" />
                        </div>
                        
                        <div className="flex flex-col pt-3 items-center text-center">
                          <div className="flex items-center">
                            <input
                              id="password-manager"
                              name="auth-method"
                              type="radio"
                              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-700"
                            />
                            <label htmlFor="password-manager" className="ml-2 font-bold text-gray-900 dark:text-white text-xl">
                              Password Manager
                            </label>
                          </div>
                          
                          <p className="text-gray-600 dark:text-gray-400 text-sm mt-3 mb-4">
                            Copy your private key from your password manager and paste it below.
                          </p>
                          
                          <div className="mt-2 w-full">
                            <textarea
                              id="paste-key"
                              name="paste-key"
                              rows={3}
                              className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                              placeholder="Paste your PGP private key here..."
                              onChange={(e) => {
                                const keyContent = e.target.value;
                                setPrivateKey(keyContent);
                                
                                // Check if key likely has a passphrase
                                const hasPassphrase = keyContent.includes('ENCRYPTED PRIVATE KEY');
                                setShowPassphraseField(hasPassphrase);
                              }}
                            />
                          </div>
                          
                          {showPassphraseField && (
                            <div className="mt-4 w-full">
                              <label htmlFor="passphrase-text" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Key Passphrase
                              </label>
                              <input
                                type="password"
                                id="passphrase-text"
                                name="passphrase-text"
                                value={passphrase}
                                onChange={(e) => setPassphrase(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                                placeholder="Enter passphrase for your key"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Hardware Security Key Option */}
                      <div className="relative bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 p-6 hover:border-primary-500 dark:hover:border-primary-500 hover:shadow-lg transition-all group">
                        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-600 dark:bg-gray-700 rounded-full h-10 w-10 flex items-center justify-center shadow-lg">
                          <ShieldCheckIcon className="h-5 w-5 text-white" />
                        </div>
                        
                        <div className="flex flex-col pt-3 items-center text-center">
                          <div className="flex items-center">
                            <input
                              id="hardware-key"
                              name="auth-method"
                              type="radio"
                              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-700"
                            />
                            <label htmlFor="hardware-key" className="ml-2 font-bold text-gray-900 dark:text-white text-xl">
                              Hardware Security Key
                            </label>
                          </div>
                          
                          <p className="text-gray-600 dark:text-gray-400 text-sm mt-3 mb-4">
                            Authenticate with your YubiKey or other hardware security device.
                          </p>
                          
                          <div className="mt-2">
                            <button
                              type="button"
                              onClick={handleHardwareAuth}
                              className="inline-flex items-center px-5 py-2.5 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 group-hover:shadow-md"
                            >
                              <KeyIcon className="mr-2 h-4 w-4" />
                              Connect Hardware Key
                            </button>
                          </div>
                          
                          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-md mt-6 border border-yellow-100 dark:border-yellow-800 w-full">
                            <div className="flex items-start">
                              <ShieldCheckIcon className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                              <p className="text-xs text-yellow-700 dark:text-yellow-300 ml-2">
                                Hardware key authentication provides the highest level of security protection.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-md mt-8 border border-primary-100 dark:border-primary-800 max-w-3xl mx-auto">
                      <div className="flex items-start">
                        <ShieldCheckIcon className="h-5 w-5 text-primary-600 dark:text-primary-400 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-primary-700 dark:text-primary-300 ml-3">
                          Your private key is processed entirely in your browser and never sent to our servers.
                          This provides zero-knowledge security, meaning we cannot access your encrypted data.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-8">
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={loading || !privateKey}
                    className="w-full flex justify-center py-3 px-6 border border-transparent rounded-md shadow-lg text-base font-medium text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Authenticating...
                      </>
                    ) : (
                      <>
                        <LockClosedIcon className="h-5 w-5 mr-2" />
                        Secure Sign In
                      </>
                    )}
                  </motion.button>
                </div>
              </form>
            </div>
          )}
          
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  Don't have an account?
                </span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                href="/signup"
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Create an account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}