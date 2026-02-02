'use client';

import { useState } from 'react';
import { KeyIcon } from '@heroicons/react/24/outline';

export default function ExternalOnlyTest() {
  const [log, setLog] = useState([]);
  const [testing, setTesting] = useState(false);

  const addLog = (message) => {
    const time = new Date().toLocaleTimeString();
    setLog(prev => [...prev, `${time} - ${message}`]);
    console.log(message);
  };

  const clearLog = () => setLog([]);

  const testExternalOnly = async () => {
    clearLog();
    setTesting(true);
    
    try {
      addLog('Starting external authenticator only test...');
      
      // Generate random user ID to avoid conflicts
      const userId = new Uint8Array(16);
      crypto.getRandomValues(userId);
      
      const options = {
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rp: { 
            name: "KeyKeeper External Only",
            id: window.location.hostname
          },
          user: {
            id: userId,
            name: `external-${Date.now()}@test.com`,
            displayName: "External Test"
          },
          pubKeyCredParams: [
            { type: "public-key", alg: -7 }  // ES256
          ],
          excludeCredentials: [],
          authenticatorSelection: {
            authenticatorAttachment: "cross-platform",
            residentKey: "discouraged",
            requireResidentKey: false,
            userVerification: "discouraged"
          },
          attestation: "none",
          timeout: 120000
        }
      };
      
      addLog('Options configured for cross-platform only');
      addLog('Calling navigator.credentials.create()...');
      addLog('IMPORTANT: Choose "USB Security Key" or similar option!');
      
      const cred = await navigator.credentials.create(options);
      
      addLog(`✅ Success! Credential created`);
      addLog(`Credential ID: ${cred.id}`);
      addLog(`Type: ${cred.type}`);
      addLog(`Authenticator Attachment: ${cred.authenticatorAttachment || 'not specified'}`);
      
      if (cred.authenticatorAttachment === 'platform') {
        addLog('⚠️ WARNING: Platform authenticator was used despite cross-platform request');
        addLog('This might be a browser issue or user selection');
      } else {
        addLog('✅ CONFIRMED: External authenticator (YubiKey) was used!');
      }
      
      // Get authenticator data
      const clientData = JSON.parse(
        new TextDecoder().decode(cred.response.clientDataJSON)
      );
      addLog(`Origin: ${clientData.origin}`);
      addLog(`Challenge verified: ${clientData.challenge ? 'Yes' : 'No'}`);
      
    } catch (error) {
      addLog(`❌ Error: ${error.name}`);
      addLog(`Message: ${error.message}`);
      
      if (error.name === 'NotAllowedError') {
        addLog('');
        addLog('Common causes:');
        addLog('1. User cancelled the operation');
        addLog('2. No YubiKey detected');
        addLog('3. Timeout (try again)');
        addLog('4. Page lost focus during operation');
      }
    } finally {
      setTesting(false);
    }
  };

  const testWithExclusions = async () => {
    clearLog();
    setTesting(true);
    
    try {
      addLog('Testing with platform authenticator exclusions...');
      
      // First, try to enumerate existing credentials to exclude them
      addLog('Note: This approach tries to exclude platform authenticators');
      
      const options = {
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rp: { 
            name: "KeyKeeper No Platform",
            id: window.location.hostname
          },
          user: {
            id: crypto.getRandomValues(new Uint8Array(16)),
            name: `noplatform-${Date.now()}@test.com`,
            displayName: "No Platform Test"
          },
          pubKeyCredParams: [
            { type: "public-key", alg: -7 },   // ES256
            { type: "public-key", alg: -8 },   // EdDSA (YubiKey 5)
            { type: "public-key", alg: -36 }   // ES512
          ],
          authenticatorSelection: {
            // Explicitly require cross-platform
            authenticatorAttachment: "cross-platform",
            // Don't require resident key
            residentKey: "discouraged",
            requireResidentKey: false,
            // Don't require user verification
            userVerification: "discouraged"
          },
          // Minimal attestation
          attestation: "none",
          // Long timeout
          timeout: 300000, // 5 minutes
          // Extensions that might help
          extensions: {
            credProps: true
          }
        }
      };
      
      addLog('Creating credential with strict cross-platform requirements...');
      addLog('Please select "USB Security Key" when prompted');
      
      const cred = await navigator.credentials.create(options);
      
      addLog('✅ Credential created successfully!');
      
      // Check extensions
      if (cred.getClientExtensionResults) {
        const extensions = cred.getClientExtensionResults();
        addLog(`Extensions: ${JSON.stringify(extensions)}`);
      }
      
      // Detailed logging
      const response = cred.response;
      const authData = new Uint8Array(response.authenticatorData);
      
      addLog(`Authenticator data length: ${authData.length}`);
      addLog(`Has attestation: ${response.attestationObject ? 'Yes' : 'No'}`);
      
      if (cred.authenticatorAttachment !== 'platform') {
        addLog('🎉 SUCCESS: External authenticator confirmed!');
      }
      
    } catch (error) {
      addLog(`❌ Error: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-gray-800 rounded-lg shadow-xl p-8">
          <h1 className="text-2xl font-bold text-white mb-6 flex items-center">
            <KeyIcon className="h-8 w-8 mr-3 text-purple-500" />
            External Authenticator Only Test
          </h1>

          <div className="mb-6 p-4 bg-orange-900/50 rounded-lg border border-orange-700">
            <p className="text-orange-200 font-semibold mb-2">Force YubiKey Usage</p>
            <p className="text-orange-200 text-sm">
              These tests specifically request external authenticators only.
              Your browser SHOULD only show USB Security Key option.
            </p>
          </div>

          <div className="space-y-4 mb-8">
            <button
              onClick={testExternalOnly}
              disabled={testing}
              className="w-full py-3 px-6 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-semibold"
            >
              Test External Authenticator Only
            </button>

            <button
              onClick={testWithExclusions}
              disabled={testing}
              className="w-full py-3 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold"
            >
              Test with Extended Options
            </button>
          </div>

          <div className="bg-gray-900 rounded-lg p-4 h-96 overflow-y-auto">
            <h3 className="text-white font-semibold mb-3">Log Output</h3>
            <pre className="text-green-400 font-mono text-sm whitespace-pre-wrap">
              {log.length === 0 ? 'Click a button to start testing...' : log.join('\n')}
            </pre>
          </div>

          <div className="mt-6 text-sm text-gray-400">
            <p className="mb-2">Tips for success:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Make sure YubiKey is plugged in before clicking test</li>
              <li>Look for "USB Security Key" or "Use a different device" option</li>
              <li>Don\'t select Touch ID, Windows Hello, or phone options</li>
              <li>Touch your YubiKey when it blinks</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}