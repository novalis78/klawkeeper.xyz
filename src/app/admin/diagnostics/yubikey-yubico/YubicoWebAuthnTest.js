'use client';

import { useState, useEffect } from 'react';
import { KeyIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

export default function YubicoWebAuthnTest() {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [credential, setCredential] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [platformAuthAvailable, setPlatformAuthAvailable] = useState('Checking...');
  const [webAuthnSupported, setWebAuthnSupported] = useState(false);

  useEffect(() => {
    // Check WebAuthn support
    setWebAuthnSupported(!!window.PublicKeyCredential);
    
    // Check platform authenticator availability
    if (window.PublicKeyCredential) {
      window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then(available => {
          setPlatformAuthAvailable(available ? 'Available' : 'Not Available');
        })
        .catch(() => {
          setPlatformAuthAvailable('Unknown');
        });
    }
  }, []);

  // Following Yubico's exact implementation pattern
  const handleRegister = async () => {
    if (!username) {
      setError('Please enter a username');
      return;
    }

    setError('');
    setSuccess('');
    setIsRegistering(true);

    try {
      // Create challenge - Yubico recommends server-generated, but for testing:
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      // Following Yubico's exact credential creation options
      const credentialCreationOptions = {
        challenge: challenge,
        rp: {
          name: "KeyKeeper",
          id: window.location.hostname,
        },
        user: {
          id: new TextEncoder().encode(username),
          name: username,
          displayName: displayName || username,
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" },   // ES256
          { alg: -257, type: "public-key" }, // RS256
        ],
        excludeCredentials: [],
        authenticatorSelection: {
          authenticatorAttachment: "cross-platform",
          requireResidentKey: false,
          userVerification: "preferred"
        },
        timeout: 60000,
        attestation: "direct"
      };

      console.log('Creating credential with options:', credentialCreationOptions);

      // Create credential
      const credential = await navigator.credentials.create({
        publicKey: credentialCreationOptions
      });

      console.log('Credential created:', credential);

      // Store credential info
      setCredential({
        id: credential.id,
        rawId: arrayBufferToBase64(credential.rawId),
        type: credential.type,
        response: {
          attestationObject: arrayBufferToBase64(credential.response.attestationObject),
          clientDataJSON: arrayBufferToBase64(credential.response.clientDataJSON),
        }
      });

      setSuccess(`Successfully registered! Your YubiKey is ready to use.`);
      
      // Check what type of authenticator was used
      if (credential.authenticatorAttachment) {
        if (credential.authenticatorAttachment === 'platform') {
          setError('Warning: Platform authenticator was used (not YubiKey). Try clicking "Use a different device" next time.');
        } else {
          setSuccess(success + ' External authenticator (YubiKey) confirmed!');
        }
      }

    } catch (err) {
      console.error('Registration error:', err);
      setError(`Registration failed: ${err.message}`);
      
      if (err.name === 'NotAllowedError') {
        setError('Registration cancelled or timed out. Make sure to:\n1. Click directly on the Register button\n2. Choose "USB Security Key" when prompted\n3. Touch your YubiKey when it blinks');
      }
    } finally {
      setIsRegistering(false);
    }
  };

  const handleAuthenticate = async () => {
    if (!credential) {
      setError('Please register first');
      return;
    }

    setError('');
    setSuccess('');
    setIsAuthenticating(true);

    try {
      // Create challenge
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      // Following Yubico's authentication options
      const credentialRequestOptions = {
        challenge: challenge,
        allowCredentials: [{
          id: base64ToArrayBuffer(credential.rawId),
          type: 'public-key',
          transports: ['usb', 'nfc', 'ble', 'internal'],
        }],
        userVerification: "preferred",
        timeout: 60000,
      };

      console.log('Getting credential with options:', credentialRequestOptions);

      // Get assertion
      const assertion = await navigator.credentials.get({
        publicKey: credentialRequestOptions
      });

      console.log('Assertion received:', assertion);

      setSuccess('Authentication successful! Your YubiKey works perfectly.');

      // Here we would derive the password for KeyKeeper
      const signature = new Uint8Array(assertion.response.signature);
      const password = await derivePassword(signature);
      console.log('Derived password (first 8 chars):', password.substring(0, 8));

    } catch (err) {
      console.error('Authentication error:', err);
      setError(`Authentication failed: ${err.message}`);
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Helper functions from Yubico examples
  function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  function base64ToArrayBuffer(base64) {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  async function derivePassword(signature) {
    const hash = await crypto.subtle.digest('SHA-256', signature);
    const base64 = arrayBufferToBase64(hash);
    return base64.replace(/[^a-zA-Z0-9]/g, '').substring(0, 24);
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-gray-800 rounded-lg shadow-xl p-8">
          <h1 className="text-3xl font-bold text-white mb-6 flex items-center">
            <KeyIcon className="h-10 w-10 mr-3 text-purple-500" />
            Yubico WebAuthn Test
          </h1>

          <div className="mb-6 p-4 bg-blue-900/50 rounded-lg border border-blue-700">
            <div className="flex items-start">
              <InformationCircleIcon className="h-5 w-5 text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-200">
                <p className="font-semibold mb-2">Following Yubico's WebAuthn implementation exactly</p>
                <p>When you see the browser prompt:</p>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>Look for "Use a different device" or "USB Security Key"</li>
                  <li>Select that option (not Touch ID or Windows Hello)</li>
                  <li>Touch your YubiKey when it starts blinking</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="test@keykeeper.world"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Display Name (optional)
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Test User"
              />
            </div>

            <button
              onClick={handleRegister}
              disabled={isRegistering || !username}
              className="w-full py-3 px-6 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors"
            >
              {isRegistering ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Touch your YubiKey when it blinks...
                </span>
              ) : (
                'Register with YubiKey'
              )}
            </button>

            <button
              onClick={handleAuthenticate}
              disabled={isAuthenticating || !credential}
              className="w-full py-3 px-6 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors"
            >
              {isAuthenticating ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Touch your YubiKey when it blinks...
                </span>
              ) : (
                'Authenticate with YubiKey'
              )}
            </button>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-900/50 border border-red-700 rounded-lg">
              <p className="text-red-200 whitespace-pre-line">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-900/50 border border-green-700 rounded-lg">
              <p className="text-green-200">{success}</p>
            </div>
          )}

          {credential && (
            <div className="mt-6 p-4 bg-gray-700 rounded-lg">
              <h3 className="text-white font-semibold mb-2">Stored Credential</h3>
              <p className="text-gray-300 text-sm font-mono break-all">
                ID: {credential.id}
              </p>
            </div>
          )}

          <div className="mt-8 p-4 bg-gray-900 rounded-lg">
            <h3 className="text-white font-semibold mb-2">Browser Support</h3>
            <div className="space-y-1 text-sm">
              <p className="text-gray-400">
                WebAuthn: <span className={webAuthnSupported ? 'text-green-400' : 'text-red-400'}>
                  {webAuthnSupported ? 'Supported' : 'Not Supported'}
                </span>
              </p>
              <p className="text-gray-400">
                Platform Authenticator: <span className={platformAuthAvailable === 'Available' ? 'text-yellow-400' : 'text-gray-400'}>
                  {platformAuthAvailable}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}