'use client';

import { useState } from 'react';
import { KeyIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

export default function SimpleYubiKeyTest() {
  const [status, setStatus] = useState('');
  const [credentialId, setCredentialId] = useState('');
  const [logs, setLogs] = useState([]);

  const log = (message, data = null) => {
    console.log(message, data);
    setLogs(prev => [...prev, { message, data, time: new Date().toLocaleTimeString() }]);
  };

  // Simple registration based on Yubico recommendations
  const testRegister = async () => {
    setStatus('registering');
    setLogs([]);
    
    try {
      log('Starting YubiKey registration...');
      
      // Simple challenge
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);
      
      // Minimal options - let browser handle defaults
      const publicKey = {
        challenge,
        rp: { name: "KeyKeeper" },
        user: {
          id: new Uint8Array(16),
          name: "test@keykeeper.world",
          displayName: "Test User"
        },
        pubKeyCredParams: [{ alg: -7, type: "public-key" }],
        authenticatorSelection: {
          authenticatorAttachment: "cross-platform"
        },
        timeout: 60000
      };
      
      log('Calling navigator.credentials.create()...');
      log('Please touch your YubiKey when it blinks!');
      
      const credential = await navigator.credentials.create({ publicKey });
      
      log('Success! Credential created');
      log('Credential ID:', credential.id);
      log('Authenticator attachment:', credential.authenticatorAttachment);
      
      // Save for authentication test
      const credId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
      setCredentialId(credId);
      
      setStatus('registered');
      
      // Check if it was actually a YubiKey
      if (credential.authenticatorAttachment === 'platform') {
        log('⚠️ Warning: Platform authenticator was used (not YubiKey)');
      } else {
        log('✅ External authenticator used (likely YubiKey)');
      }
      
    } catch (error) {
      log('Registration failed:', error.message);
      setStatus('error');
      
      if (error.name === 'NotAllowedError') {
        log('Tips:');
        log('- Make sure YubiKey is plugged in');
        log('- Touch the YubiKey when it blinks');
        log('- If browser shows passkey prompt, choose "Use a different device"');
      }
    }
  };

  // Simple authentication
  const testAuthenticate = async () => {
    if (!credentialId) {
      log('Please register first');
      return;
    }
    
    setStatus('authenticating');
    
    try {
      log('Starting YubiKey authentication...');
      
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);
      
      const publicKey = {
        challenge,
        allowCredentials: [{
          id: Uint8Array.from(atob(credentialId), c => c.charCodeAt(0)),
          type: 'public-key',
          transports: ['usb', 'nfc']
        }],
        timeout: 60000
      };
      
      log('Please touch your YubiKey when it blinks!');
      
      const assertion = await navigator.credentials.get({ publicKey });
      
      log('Success! Authentication completed');
      log('Assertion ID:', assertion.id);
      
      // This is where we\'d derive the password
      const signature = new Uint8Array(assertion.response.signature);
      log('Signature length:', signature.length);
      
      setStatus('authenticated');
      
    } catch (error) {
      log('Authentication failed:', error.message);
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-gray-800 rounded-lg shadow-xl p-8">
          <h1 className="text-2xl font-bold text-white mb-6 flex items-center">
            <KeyIcon className="h-8 w-8 mr-3 text-purple-500" />
            Simple YubiKey Test
          </h1>

          <div className="space-y-4 mb-8">
            <div className="p-4 bg-blue-900/50 rounded-lg border border-blue-700">
              <p className="text-blue-200">
                This is a simplified test following Yubico\'s WebAuthn recommendations.
              </p>
              <p className="text-blue-200 mt-2">
                <strong>Important:</strong> When prompted, choose "USB Security Key" or "Use a different device" to use your YubiKey.
              </p>
            </div>

            <button
              onClick={testRegister}
              disabled={status === 'registering'}
              className="w-full py-3 px-6 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center"
            >
              {status === 'registering' ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Touch your YubiKey...
                </>
              ) : (
                <>
                  <KeyIcon className="h-5 w-5 mr-2" />
                  1. Register with YubiKey
                </>
              )}
            </button>

            <button
              onClick={testAuthenticate}
              disabled={!credentialId || status === 'authenticating'}
              className="w-full py-3 px-6 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center"
            >
              {status === 'authenticating' ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Touch your YubiKey...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="h-5 w-5 mr-2" />
                  2. Authenticate with YubiKey
                </>
              )}
            </button>
          </div>

          {status && (
            <div className={`mb-6 p-4 rounded-lg ${
              status === 'registered' || status === 'authenticated' ? 'bg-green-900/50 border-green-700' : 
              status === 'error' ? 'bg-red-900/50 border-red-700' : 
              'bg-gray-700 border-gray-600'
            } border`}>
              <p className="text-white font-semibold">
                Status: {status}
              </p>
              {credentialId && (
                <p className="text-gray-300 text-sm mt-1">
                  Credential ID: {credentialId.substring(0, 20)}...
                </p>
              )}
            </div>
          )}

          <div className="bg-gray-900 rounded-lg p-4 max-h-64 overflow-y-auto">
            <h3 className="text-white font-semibold mb-2">Logs:</h3>
            <div className="space-y-1 text-sm font-mono">
              {logs.map((log, i) => (
                <div key={i} className="text-gray-400">
                  <span className="text-gray-500">{log.time}</span>
                  {' '}
                  <span className="text-gray-300">{log.message}</span>
                  {log.data && (
                    <span className="text-gray-500 ml-2">{log.data}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}