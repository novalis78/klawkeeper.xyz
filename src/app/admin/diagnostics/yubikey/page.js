'use client';

import { useState, useEffect } from 'react';
import { ShieldCheckIcon, KeyIcon, InformationCircleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import * as openpgp from 'openpgp';

export default function YubiKeyDiagnostics() {
  const [results, setResults] = useState({});
  const [testing, setTesting] = useState(false);
  const [logs, setLogs] = useState([]);

  const addLog = (message, data = null) => {
    const timestamp = new Date().toISOString();
    setLogs(prev => [...prev, { timestamp, message, data }]);
    console.log(`[YubiKey Test] ${message}`, data || '');
  };

  // Test 1: OpenPGP.js Smart Card Support
  const testOpenPGPSmartCard = async () => {
    addLog('Testing OpenPGP.js smart card support...');
    try {
      // Note: OpenPGP.js card support is experimental and not included in standard builds
      addLog('OpenPGP.js version:', openpgp.config?.versionString || 'unknown');
      addLog('Note: Smart card support requires special OpenPGP.js build');
      addLog('Standard OpenPGP.js does not include card module');
      setResults(prev => ({ ...prev, openpgpSupport: false }));
    } catch (error) {
      addLog('OpenPGP test error:', error.message);
    }
  };

  // Test 2: WebUSB API
  const testWebUSB = async () => {
    addLog('Testing WebUSB API...');
    try {
      if ('usb' in navigator) {
        addLog('WebUSB API is available');
        
        // Check existing permissions
        const devices = await navigator.usb.getDevices();
        addLog(`Found ${devices.length} permitted USB devices`);
        
        devices.forEach((device, i) => {
          addLog(`Device ${i}:`, {
            vendorId: device.vendorId,
            productId: device.productId,
            productName: device.productName,
            manufacturerName: device.manufacturerName,
            serialNumber: device.serialNumber
          });
        });

        // YubiKey vendor ID is 0x1050
        const yubikeys = devices.filter(d => d.vendorId === 0x1050);
        if (yubikeys.length > 0) {
          addLog(`Found ${yubikeys.length} YubiKey(s)`);
          setResults(prev => ({ ...prev, webUSBYubikeys: yubikeys }));
        }

        // Try to request YubiKey access
        try {
          addLog('Requesting YubiKey USB access...');
          const device = await navigator.usb.requestDevice({
            filters: [{ vendorId: 0x1050 }] // Yubico vendor ID
          });
          
          addLog('YubiKey access granted:', {
            productName: device.productName,
            serialNumber: device.serialNumber
          });
          
          // Try to open the device
          await device.open();
          addLog('YubiKey opened successfully');
          
          // Try to read configuration
          if (device.configuration) {
            addLog('Device configuration:', device.configuration);
          }
          
          await device.close();
          addLog('YubiKey closed');
          
          setResults(prev => ({ ...prev, webUSBAccess: true }));
        } catch (e) {
          addLog('USB request failed:', e.message);
        }
      } else {
        addLog('WebUSB API not available in this browser');
        setResults(prev => ({ ...prev, webUSBSupport: false }));
      }
    } catch (error) {
      addLog('WebUSB test error:', error.message);
    }
  };

  // Test 3: WebAuthn/FIDO2
  const testWebAuthn = async () => {
    addLog('Testing WebAuthn/FIDO2...');
    try {
      if (window.PublicKeyCredential) {
        addLog('WebAuthn is supported');
        
        // Check if platform authenticator is available
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        addLog('Platform authenticator available:', available);
        
        // Try to create a credential
        const challenge = new Uint8Array(32);
        crypto.getRandomValues(challenge);
        
        const createOptions = {
          challenge,
          rp: { name: "KeyKeeper YubiKey Test" },
          user: {
            id: new TextEncoder().encode("test-user"),
            name: "test@keykeeper.world",
            displayName: "Test User"
          },
          pubKeyCredParams: [
            { alg: -7, type: "public-key" },  // ES256
            { alg: -257, type: "public-key" } // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: "cross-platform",
            userVerification: "discouraged"
          },
          timeout: 60000
        };

        addLog('Creating credential with options:', createOptions);
        
        try {
          const credential = await navigator.credentials.create({
            publicKey: createOptions
          });
          
          addLog('Credential created:', {
            id: credential.id,
            type: credential.type,
            authenticatorAttachment: credential.authenticatorAttachment,
            warning: credential.authenticatorAttachment === 'platform' ? 
              'WARNING: Platform authenticator used (Touch ID/Windows Hello), not YubiKey!' : 
              'SUCCESS: External authenticator used (likely YubiKey)'
          });
          
          // Get authenticator data
          const response = credential.response;
          const clientDataJSON = JSON.parse(
            new TextDecoder().decode(response.clientDataJSON)
          );
          
          addLog('Client data:', clientDataJSON);
          
          // Try to get authenticator info
          if (response.getAuthenticatorData) {
            const authData = response.getAuthenticatorData();
            addLog('Authenticator data length:', authData.byteLength);
          }
          
          setResults(prev => ({ ...prev, webAuthnCredential: credential.id }));
        } catch (e) {
          addLog('Credential creation failed:', e.message);
          if (e.name === 'NotAllowedError') {
            addLog('User cancelled or timeout occurred');
          }
        }
      } else {
        addLog('WebAuthn not supported in this browser');
        setResults(prev => ({ ...prev, webAuthnSupport: false }));
      }
    } catch (error) {
      addLog('WebAuthn test error:', error.message);
    }
  };

  // Test 4: Try to read OpenPGP card info via custom method
  const testOpenPGPCardInfo = async () => {
    addLog('Testing OpenPGP card info access...');
    try {
      // This would require a browser extension or special permissions
      // For now, we'll test what's possible
      
      // Try experimental Chrome USB API if available
      if (chrome && chrome.usb) {
        addLog('Chrome USB API detected');
        // Would need extension permissions
      }
      
      // Try to detect YubiKey via navigator properties
      const usbDevices = await navigator.usb.getDevices();
      const yubikey = usbDevices.find(d => d.vendorId === 0x1050);
      
      if (yubikey) {
        addLog('YubiKey found via USB, attempting to read card info...');
        
        // In a real implementation, we'd need to:
        // 1. Open the device
        // 2. Select configuration
        // 3. Claim interface
        // 4. Send APDU commands to read card data
        // This requires low-level USB access
        
        addLog('Note: Full card access requires browser extension or native app');
      }
    } catch (error) {
      addLog('OpenPGP card info test error:', error.message);
    }
  };

  // Test 5: Practical KeyKeeper Integration Test
  const testKeykeeperIntegration = async () => {
    addLog('Testing KeyKeeper YubiKey integration...');
    
    try {
      // Dynamically import YubiKey service to avoid SSR issues
      const { yubiKeyService } = await import('@/lib/auth/yubikey');
      
      if (!yubiKeyService) {
        addLog('YubiKey service not available (SSR environment)');
        return;
      }
      
      // Step 1: Detect YubiKey
      addLog('Detecting YubiKey...');
      const detection = await yubiKeyService.detectYubiKey();
      addLog('Detection results:', detection);
      
      // Step 2: Test Registration Flow
      addLog('Testing registration flow...');
      try {
        const registration = await yubiKeyService.register(
          'test@keykeeper.world',
          'Test User'
        );
        
        addLog('Registration successful:', {
          credentialId: registration.credentialId,
          publicKeyType: registration.publicKey.type
        });
        
        setResults(prev => ({ 
          ...prev, 
          keykeeperRegistration: true,
          credentialId: registration.credentialId 
        }));
        
        // Test server communication
        const serverResponse = await fetch('/api/admin/yubikey-test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'register',
            ...registration
          })
        }).then(r => r.json());
        
        addLog('Server response:', serverResponse);
        
        // Step 3: Test Authentication Flow
        if (registration.credentialId) {
          addLog('Testing authentication flow...');
          
          // Generate test challenge
          const challenge = 'test-challenge-' + Date.now();
          
          try {
            const auth = await yubiKeyService.authenticate(
              registration.credentialId,
              challenge
            );
            
            addLog('Authentication successful:', {
              passwordLength: auth.password.length,
              passwordPreview: auth.password.substring(0, 8) + '...'
            });
            
            setResults(prev => ({ 
              ...prev, 
              keykeeperAuth: true,
              derivedPassword: auth.password.substring(0, 8) + '...' 
            }));
            
            // Verify with server
            const verifyResponse = await fetch('/api/admin/yubikey-test', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'verify',
                credentialId: registration.credentialId,
                password: auth.password
              })
            }).then(r => r.json());
            
            addLog('Verification response:', verifyResponse);
          } catch (e) {
            addLog('Authentication failed:', e.message);
          }
        }
      } catch (e) {
        addLog('Registration failed:', e.message);
        if (e.name === 'NotAllowedError') {
          addLog('User cancelled or no YubiKey detected');
        }
      }
      
      // Step 4: Check for PGP key access
      addLog('Checking PGP key access...');
      const pgpKey = await yubiKeyService.readPublicKeyFromCard();
      if (pgpKey) {
        addLog('PGP key found:', pgpKey);
      } else {
        addLog('PGP key not accessible from browser');
      }
      
      // Step 5: Check card info
      const cardInfo = await yubiKeyService.getCardInfo();
      addLog('Card info:', cardInfo);
      
    } catch (error) {
      addLog('KeyKeeper integration test error:', error.message);
    }
  };

  // Run all tests
  const runAllTests = async () => {
    setTesting(true);
    setLogs([]);
    setResults({});
    
    addLog('Starting YubiKey diagnostics...');
    addLog('Browser:', navigator.userAgent);
    addLog('Protocol:', window.location.protocol);
    
    // Check basic support
    addLog('WebAuthn supported:', !!window.PublicKeyCredential);
    addLog('WebUSB supported:', 'usb' in navigator);
    
    await testOpenPGPSmartCard();
    await testWebUSB();
    await testWebAuthn();
    await testOpenPGPCardInfo();
    await testKeykeeperIntegration();
    
    addLog('All tests completed');
    setTesting(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-800 rounded-lg shadow-xl p-6">
          <div className="flex items-center mb-6">
            <ShieldCheckIcon className="h-8 w-8 text-purple-500 mr-3" />
            <h1 className="text-2xl font-bold text-white">YubiKey Diagnostics</h1>
          </div>

          <div className="mb-6 p-4 bg-blue-900/50 rounded-lg border border-blue-700">
            <div className="flex items-start">
              <InformationCircleIcon className="h-5 w-5 text-blue-400 mr-2 mt-0.5" />
              <div className="text-sm text-blue-200">
                <p className="mb-2">This page tests various methods of accessing YubiKey from the browser:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>OpenPGP.js smart card support</li>
                  <li>WebUSB API access</li>
                  <li>WebAuthn/FIDO2 capabilities</li>
                  <li>Card information reading</li>
                  <li>KeyKeeper integration (register + authenticate)</li>
                </ul>
                <p className="mt-2">Make sure your YubiKey is plugged in before running tests.</p>
              </div>
            </div>
          </div>

          <button
            onClick={runAllTests}
            disabled={testing}
            className="mb-6 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <KeyIcon className="h-5 w-5 mr-2" />
            {testing ? 'Testing...' : 'Run YubiKey Tests'}
          </button>

          {/* Quick Actions */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <button
              onClick={async () => {
                setLogs([]);
                addLog('Quick test: Detecting YubiKey...');
                const { yubiKeyService } = await import('@/lib/auth/yubikey');
                if (!yubiKeyService) {
                  addLog('YubiKey service not available');
                  return;
                }
                const methods = await yubiKeyService.detectYubiKey();
                addLog('Detection complete:', methods);
              }}
              className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
            >
              Quick Detect
            </button>
            <button
              onClick={async () => {
                setLogs([]);
                addLog('Quick test: WebAuthn registration...');
                const { yubiKeyService } = await import('@/lib/auth/yubikey');
                if (!yubiKeyService) {
                  addLog('YubiKey service not available');
                  return;
                }
                try {
                  await yubiKeyService.register('quick@test.com', 'Quick Test');
                  addLog('Success! YubiKey can be used with KeyKeeper');
                } catch (e) {
                  addLog('Failed:', e.message);
                }
              }}
              className="px-4 py-2 bg-green-700 text-white rounded hover:bg-green-600"
            >
              Quick Register
            </button>
            <button
              onClick={async () => {
                setLogs([]);
                addLog('YubiKey-only test: Forcing external authenticator...');
                try {
                  const challenge = new Uint8Array(32);
                  crypto.getRandomValues(challenge);
                  
                  const credential = await navigator.credentials.create({
                    publicKey: {
                      challenge,
                      rp: { 
                        name: "KeyKeeper YubiKey",
                        id: window.location.hostname
                      },
                      user: {
                        id: crypto.getRandomValues(new Uint8Array(16)),
                        name: `yubikey-${Date.now()}@test.com`,
                        displayName: "YubiKey User"
                      },
                      pubKeyCredParams: [
                        { alg: -7, type: "public-key" }  // ES256 only
                      ],
                      authenticatorSelection: {
                        authenticatorAttachment: "cross-platform",
                        residentKey: "discouraged",
                        userVerification: "discouraged"
                      },
                      attestation: "none",
                      timeout: 120000
                    }
                  });
                  
                  if (credential.authenticatorAttachment === 'platform') {
                    addLog('❌ Platform authenticator was used instead of YubiKey');
                    addLog('Try clicking "Use a different device" when prompted');
                  } else {
                    addLog('✅ YubiKey detected and working!');
                    addLog('Authenticator type:', credential.authenticatorAttachment || 'cross-platform');
                  }
                } catch (e) {
                  addLog('Error:', e.message);
                  if (e.name === 'NotAllowedError') {
                    addLog('Make sure your YubiKey is plugged in and you touch it when it blinks');
                  }
                }
              }}
              className="px-4 py-2 bg-purple-700 text-white rounded hover:bg-purple-600"
            >
              YubiKey Only
            </button>
          </div>

          {/* Results Summary */}
          {Object.keys(results).length > 0 && (
            <div className="mb-6 p-4 bg-gray-700 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-3">Test Results</h3>
              <div className="space-y-2">
                {Object.entries(results).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-gray-300">{key}:</span>
                    <span className="text-white font-mono text-sm">
                      {typeof value === 'boolean' ? (
                        value ? '✅ Yes' : '❌ No'
                      ) : (
                        JSON.stringify(value, null, 2)
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Logs */}
          <div className="bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto">
            <h3 className="text-lg font-semibold text-white mb-3">Detailed Logs</h3>
            <div className="space-y-2 font-mono text-xs">
              {logs.map((log, i) => (
                <div key={i} className="text-gray-400">
                  <span className="text-gray-500">{log.timestamp.split('T')[1].split('.')[0]}</span>
                  {' '}
                  <span className="text-gray-300">{log.message}</span>
                  {log.data && (
                    <pre className="mt-1 ml-4 text-gray-500">
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
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