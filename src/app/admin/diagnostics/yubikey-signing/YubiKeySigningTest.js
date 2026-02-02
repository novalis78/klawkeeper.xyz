'use client';

import { useState } from 'react';
import { KeyIcon, ShieldCheckIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

export default function YubiKeySigningTest() {
  const [credentialId, setCredentialId] = useState('');
  const [publicKeyData, setPublicKeyData] = useState(null);
  const [signatures, setSignatures] = useState([]);
  const [logs, setLogs] = useState([]);
  const [dataToSign, setDataToSign] = useState('Hello, KeyKeeper!');

  const log = (message, data = null) => {
    const entry = {
      time: new Date().toLocaleTimeString(),
      message,
      data
    };
    setLogs(prev => [...prev, entry]);
    console.log(message, data || '');
  };

  const clearLogs = () => {
    setLogs([]);
    setSignatures([]);
  };

  // Helper functions
  function arrayBufferToHex(buffer) {
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  function base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // Step 1: Register (Create Credential)
  const handleRegister = async () => {
    clearLogs();
    log('🔑 Starting YubiKey registration...');
    
    try {
      // Generate random challenge
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);
      log('Generated challenge:', arrayBufferToHex(challenge));

      const createOptions = {
        publicKey: {
          challenge: challenge,
          rp: { 
            name: "KeyKeeper Signing Test",
            id: window.location.hostname
          },
          user: {
            id: new TextEncoder().encode('test-user-' + Date.now()),
            name: 'test@keykeeper.world',
            displayName: 'Test User'
          },
          pubKeyCredParams: [
            { alg: -7, type: "public-key" },   // ES256 (ECDSA with SHA-256)
            { alg: -257, type: "public-key" }  // RS256 (RSASSA-PKCS1-v1_5 with SHA-256)
          ],
          authenticatorSelection: {
            authenticatorAttachment: "cross-platform",
            userVerification: "discouraged"
          },
          timeout: 120000,
          attestation: "direct"
        }
      };

      log('📤 Calling navigator.credentials.create()...');
      log('⚠️ Touch your YubiKey when it blinks!');

      const credential = await navigator.credentials.create(createOptions);

      log('✅ Credential created successfully!');
      
      // Extract and display what came FROM the YubiKey
      const credId = arrayBufferToBase64(credential.rawId);
      setCredentialId(credId);
      
      // Decode the public key from the attestation
      const publicKeyInfo = {
        credentialId: credential.id,
        rawId: arrayBufferToHex(credential.rawId).substring(0, 32) + '...',
        type: credential.type,
        authenticatorAttachment: credential.authenticatorAttachment || 'unknown'
      };

      log('🔐 Data FROM YubiKey:', publicKeyInfo);
      
      // Parse attestation object to get public key
      const attestationObject = credential.response.attestationObject;
      const publicKey = credential.response.publicKey;
      
      log('📜 Attestation object size:', attestationObject.byteLength + ' bytes');
      
      if (publicKey) {
        log('🔑 Public key received:', arrayBufferToHex(publicKey).substring(0, 64) + '...');
      }

      // Store public key data
      setPublicKeyData({
        credential: credId,
        publicKeyHex: publicKey ? arrayBufferToHex(publicKey) : 'N/A',
        created: new Date().toISOString()
      });

      log('');
      log('✅ YubiKey registration complete!');
      log('The YubiKey has generated and stored a private key internally.');
      log('We received the public key and credential ID.');

    } catch (error) {
      log('❌ Registration error:', error.message);
      if (error.name === 'NotAllowedError') {
        log('Make sure to touch your YubiKey when it blinks!');
      }
    }
  };

  // Step 2: Sign Data
  const handleSign = async () => {
    if (!credentialId) {
      log('❌ Please register first!');
      return;
    }

    log('');
    log('📝 Starting signature process...');
    log('Data to sign:', dataToSign);

    try {
      // Convert data to sign into a challenge
      const encoder = new TextEncoder();
      const dataBytes = encoder.encode(dataToSign);
      
      // Create a proper challenge by hashing the data
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBytes);
      const challenge = new Uint8Array(hashBuffer);
      
      log('Challenge (SHA-256 of data):', arrayBufferToHex(challenge).substring(0, 32) + '...');

      const getOptions = {
        publicKey: {
          challenge: challenge,
          allowCredentials: [{
            id: base64ToArrayBuffer(credentialId),
            type: 'public-key',
            transports: ['usb', 'nfc']
          }],
          userVerification: "discouraged",
          timeout: 120000
        }
      };

      log('📤 Calling navigator.credentials.get()...');
      log('⚠️ Touch your YubiKey when it blinks!');

      const assertion = await navigator.credentials.get(getOptions);

      log('✅ Signature created successfully!');

      // Extract what came FROM the YubiKey
      const signature = new Uint8Array(assertion.response.signature);
      const authenticatorData = new Uint8Array(assertion.response.authenticatorData);
      const clientDataJSON = new TextDecoder().decode(assertion.response.clientDataJSON);

      const signatureInfo = {
        signatureHex: arrayBufferToHex(signature),
        signatureBase64: arrayBufferToBase64(signature),
        signatureLength: signature.length,
        authenticatorDataLength: authenticatorData.length,
        clientData: JSON.parse(clientDataJSON)
      };

      log('');
      log('🔏 SIGNATURE FROM YUBIKEY:');
      log('Hex (first 64 chars):', signatureInfo.signatureHex.substring(0, 64) + '...');
      log('Base64:', signatureInfo.signatureBase64);
      log('Length:', signatureInfo.signatureLength + ' bytes');
      log('');
      log('📊 Authenticator data:', authenticatorData.length + ' bytes');
      log('🔍 Client data:', signatureInfo.clientData);

      // Derive a deterministic password from the signature
      const password = await derivePassword(signature, challenge);
      log('');
      log('🔑 Derived password:', password);
      log('(This would be used for mail system access)');

      // Store signature
      setSignatures(prev => [...prev, {
        data: dataToSign,
        signature: signatureInfo.signatureHex.substring(0, 32) + '...',
        password: password,
        timestamp: new Date().toISOString()
      }]);

    } catch (error) {
      log('❌ Signing error:', error.message);
    }
  };

  // Derive password from signature (same as current system)
  async function derivePassword(signature, challenge) {
    // Combine signature with challenge
    const combined = new Uint8Array(signature.length + challenge.length);
    combined.set(signature);
    combined.set(challenge, signature.length);
    
    // Hash the combination
    const hash = await crypto.subtle.digest('SHA-256', combined);
    
    // Convert to base64 and format
    const base64 = arrayBufferToBase64(hash);
    return base64.replace(/[^a-zA-Z0-9]/g, '').substring(0, 24);
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-800 rounded-lg shadow-xl p-8">
          <h1 className="text-2xl font-bold text-white mb-6 flex items-center">
            <ShieldCheckIcon className="h-8 w-8 mr-3 text-purple-500" />
            YubiKey Signing Test - What Comes From YubiKey?
          </h1>

          <div className="mb-6 p-4 bg-blue-900/50 rounded-lg border border-blue-700">
            <p className="text-blue-200 text-sm">
              This test shows exactly what data comes FROM the YubiKey during registration and signing.
              The YubiKey generates keys, stores the private key, and creates signatures.
            </p>
          </div>

          {/* Step 1: Register */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
              <span className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3 text-sm">1</span>
              Register YubiKey (Create Credential)
            </h2>
            <button
              onClick={handleRegister}
              className="w-full py-3 px-6 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold"
            >
              <KeyIcon className="inline h-5 w-5 mr-2" />
              Register YubiKey
            </button>
            {publicKeyData && (
              <div className="mt-4 p-4 bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-300">
                  <strong>Credential ID:</strong> {publicKeyData.credential.substring(0, 32)}...
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  The YubiKey generated a key pair and returned this ID
                </p>
              </div>
            )}
          </div>

          {/* Step 2: Sign Data */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
              <span className="bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3 text-sm">2</span>
              Sign Data with YubiKey
            </h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Data to Sign:
              </label>
              <input
                type="text"
                value={dataToSign}
                onChange={(e) => setDataToSign(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                placeholder="Enter text to sign"
              />
            </div>
            <button
              onClick={handleSign}
              disabled={!credentialId}
              className="w-full py-3 px-6 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-semibold"
            >
              <DocumentTextIcon className="inline h-5 w-5 mr-2" />
              Sign with YubiKey
            </button>
          </div>

          {/* Signatures History */}
          {signatures.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-white mb-4">Signature History</h3>
              <div className="space-y-2">
                {signatures.map((sig, i) => (
                  <div key={i} className="p-3 bg-gray-700 rounded-lg">
                    <p className="text-sm text-gray-300">
                      <strong>Data:</strong> {sig.data}
                    </p>
                    <p className="text-xs text-gray-400 font-mono">
                      Signature: {sig.signature}
                    </p>
                    <p className="text-xs text-green-400 font-mono">
                      Password: {sig.password}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Logs */}
          <div className="bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto">
            <h3 className="text-white font-semibold mb-3">Detailed Logs</h3>
            <div className="space-y-1 font-mono text-xs">
              {logs.length === 0 ? (
                <p className="text-gray-500">Click "Register YubiKey" to start...</p>
              ) : (
                logs.map((entry, i) => (
                  <div key={i} className="text-gray-400">
                    <span className="text-gray-500">{entry.time}</span>
                    {' '}
                    <span className={
                      entry.message.includes('✅') ? 'text-green-400' :
                      entry.message.includes('❌') ? 'text-red-400' :
                      entry.message.includes('🔑') || entry.message.includes('🔏') ? 'text-yellow-400' :
                      'text-gray-300'
                    }>
                      {entry.message}
                    </span>
                    {entry.data && (
                      <pre className="mt-1 ml-8 text-gray-500">
                        {typeof entry.data === 'object' 
                          ? JSON.stringify(entry.data, null, 2)
                          : entry.data}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-6 p-4 bg-yellow-900/30 rounded-lg border border-yellow-700">
            <p className="text-yellow-200 text-sm">
              <strong>Key Points:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>The YubiKey generates and stores the private key - it never leaves the device</li>
                <li>Each signature is unique even for the same data (includes timestamp/counter)</li>
                <li>We derive deterministic passwords by hashing signature + challenge</li>
                <li>This gives us hardware security without needing PGP card access</li>
              </ul>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}