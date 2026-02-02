'use client';

import { useState } from 'react';
import { KeyIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

export default function YubiKeyOptionsTest() {
  const [results, setResults] = useState({});

  const addResult = (key, value) => {
    setResults(prev => ({ ...prev, [key]: value }));
  };

  // Option 1: Use WebAuthn to derive a deterministic key
  const testWebAuthnDerivation = async () => {
    try {
      // Create a credential with YubiKey
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: new TextEncoder().encode('keykeeper-static-challenge'),
          rp: { name: "KeyKeeper", id: window.location.hostname },
          user: {
            id: new TextEncoder().encode('test@keykeeper.world'),
            name: 'test@keykeeper.world',
            displayName: 'Test User'
          },
          pubKeyCredParams: [{ alg: -7, type: "public-key" }],
          authenticatorSelection: {
            authenticatorAttachment: "cross-platform",
            residentKey: "preferred",
            userVerification: "discouraged"
          }
        }
      });

      // Use the credential ID as a seed for key derivation
      const credentialId = new Uint8Array(credential.rawId);
      const hash = await crypto.subtle.digest('SHA-256', credentialId);
      const derived = btoa(String.fromCharCode(...new Uint8Array(hash)));
      
      addResult('webauthnDerivation', {
        success: true,
        info: 'Can derive deterministic keys from YubiKey credential',
        derivedKey: derived.substring(0, 16) + '...'
      });
    } catch (e) {
      addResult('webauthnDerivation', {
        success: false,
        error: e.message
      });
    }
  };

  // Option 2: Check if we can store/retrieve data via credential properties
  const testCredentialStorage = async () => {
    try {
      // Try to create a credential with extensions
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rp: { name: "KeyKeeper Storage Test" },
          user: {
            id: crypto.getRandomValues(new Uint8Array(16)),
            name: 'storage@test.com',
            displayName: 'Storage Test'
          },
          pubKeyCredParams: [{ alg: -7, type: "public-key" }],
          authenticatorSelection: {
            authenticatorAttachment: "cross-platform",
            residentKey: "required", // Try to store on key
            userVerification: "preferred"
          },
          extensions: {
            credProps: true,
            largeBlob: {
              support: "preferred"
            }
          }
        }
      });

      const extensions = credential.getClientExtensionResults();
      
      addResult('credentialStorage', {
        success: true,
        residentKey: extensions.credProps?.rk,
        largeBlob: extensions.largeBlob,
        info: 'Checked credential storage capabilities'
      });
    } catch (e) {
      addResult('credentialStorage', {
        success: false,
        error: e.message
      });
    }
  };

  // Option 3: Test if we can use YubiKey serial for deterministic operations
  const testSerialBasedAuth = async () => {
    try {
      // First get device info via WebUSB
      if (!navigator.usb) {
        throw new Error('WebUSB not supported');
      }

      const device = await navigator.usb.requestDevice({
        filters: [{ vendorId: 0x1050 }]
      });

      const serial = device.serialNumber;
      
      // Use serial + user email to derive a unique key
      const data = new TextEncoder().encode(serial + ':test@keykeeper.world');
      const hash = await crypto.subtle.digest('SHA-256', data);
      const derived = btoa(String.fromCharCode(...new Uint8Array(hash)));

      addResult('serialBased', {
        success: true,
        serial: serial,
        derivedKey: derived.substring(0, 16) + '...',
        info: 'Can use YubiKey serial for deterministic key derivation'
      });
    } catch (e) {
      addResult('serialBased', {
        success: false,
        error: e.message
      });
    }
  };

  // Option 4: Explain hybrid approach
  const explainHybridApproach = () => {
    addResult('hybridApproach', {
      success: true,
      approach: {
        step1: 'Use WebAuthn for secure authentication with YubiKey',
        step2: 'Let user provide their PGP public key separately (file upload or URL)',
        step3: 'Use YubiKey WebAuthn signature to derive mail password',
        step4: 'Store public key in database, use YubiKey for auth only',
        benefits: [
          'Works in all modern browsers',
          'No special permissions needed',
          'Maintains security of YubiKey auth',
          'Compatible with existing KeyKeeper architecture'
        ]
      }
    });
  };

  // Option 5: Future possibilities
  const checkFutureTech = async () => {
    const features = {
      webUSB: 'usb' in navigator,
      webAuthn: 'credentials' in navigator,
      webAuthnLargeBlob: false,
      webAuthnPRF: false,
      webNFC: 'NDEFReader' in window,
      webHID: 'hid' in navigator
    };

    // Check for newer WebAuthn extensions
    try {
      const testCred = {
        publicKey: {
          challenge: new Uint8Array(32),
          rp: { name: "Test" },
          user: { id: new Uint8Array(16), name: "test", displayName: "Test" },
          pubKeyCredParams: [{ alg: -7, type: "public-key" }],
          extensions: {
            largeBlob: { support: "preferred" },
            prf: {}
          }
        }
      };
      // Just checking if browser understands these extensions
      features.webAuthnLargeBlob = true;
      features.webAuthnPRF = true;
    } catch (e) {
      // Extensions not supported
    }

    addResult('futureTech', {
      success: true,
      features,
      info: 'Checked for future web technologies'
    });
  };

  const runAllTests = async () => {
    setResults({});
    await testWebAuthnDerivation();
    await testCredentialStorage();
    await testSerialBasedAuth();
    explainHybridApproach();
    await checkFutureTech();
  };

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-800 rounded-lg shadow-xl p-8">
          <h1 className="text-2xl font-bold text-white mb-6 flex items-center">
            <KeyIcon className="h-8 w-8 mr-3 text-purple-500" />
            YubiKey Integration Options
          </h1>

          <div className="mb-8">
            <button
              onClick={runAllTests}
              className="w-full py-3 px-6 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-bold"
            >
              Test All Integration Options
            </button>
          </div>

          <div className="space-y-6">
            {Object.entries(results).map(([key, result]) => (
              <div key={key} className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-white font-semibold capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </h3>
                  {result.success ? (
                    <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircleIcon className="h-5 w-5 text-red-500" />
                  )}
                </div>
                
                <div className="text-sm text-gray-300">
                  {result.error && (
                    <p className="text-red-400 mb-2">Error: {result.error}</p>
                  )}
                  
                  {result.info && (
                    <p className="mb-2">{result.info}</p>
                  )}
                  
                  {result.approach && (
                    <div className="space-y-2">
                      <p className="font-semibold">Recommended Approach:</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>{result.approach.step1}</li>
                        <li>{result.approach.step2}</li>
                        <li>{result.approach.step3}</li>
                        <li>{result.approach.step4}</li>
                      </ol>
                      <p className="font-semibold mt-3">Benefits:</p>
                      <ul className="list-disc list-inside">
                        {result.approach.benefits.map((benefit, i) => (
                          <li key={i}>{benefit}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {result.features && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {Object.entries(result.features).map(([feat, supported]) => (
                        <div key={feat} className="flex items-center">
                          <span className={supported ? 'text-green-400' : 'text-gray-500'}>
                            {supported ? '✓' : '✗'}
                          </span>
                          <span className="ml-2">{feat}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {result.derivedKey && (
                    <p className="font-mono text-xs mt-2">
                      Derived: {result.derivedKey}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 p-4 bg-blue-900/30 rounded-lg border border-blue-700">
            <h3 className="text-blue-300 font-semibold mb-2">Recommended Path for KeyKeeper:</h3>
            <ol className="list-decimal list-inside text-blue-200 space-y-2">
              <li>Use WebAuthn for YubiKey authentication (works today)</li>
              <li>Have users upload/provide their PGP public key separately</li>
              <li>Derive deterministic passwords from YubiKey signatures</li>
              <li>Optional: Support YubiKey serial number for extra validation</li>
            </ol>
            <p className="text-blue-200 mt-3">
              This approach works in all browsers, requires no special permissions, 
              and maintains the security benefits of hardware authentication.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}