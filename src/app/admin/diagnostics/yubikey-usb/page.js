'use client';

import { useState } from 'react';
import { KeyIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

export default function YubiKeyUSBTest() {
  const [logs, setLogs] = useState([]);
  const [device, setDevice] = useState(null);

  const log = (message, data = null) => {
    const entry = {
      time: new Date().toLocaleTimeString(),
      message,
      data
    };
    setLogs(prev => [...prev, entry]);
    console.log(message, data || '');
  };

  const clearLogs = () => setLogs([]);

  // Test 1: WebUSB Direct Access
  const testWebUSB = async () => {
    clearLogs();
    log('Testing WebUSB direct access...');
    
    if (!('usb' in navigator)) {
      log('❌ WebUSB not supported in this browser');
      return;
    }

    try {
      // YubiKey vendor ID is 0x1050 (4176 in decimal)
      log('Requesting USB device access...');
      log('Vendor ID 0x1050 = Yubico');
      
      const device = await navigator.usb.requestDevice({
        filters: [
          { vendorId: 0x1050 } // Yubico
        ]
      });

      log('✅ Device access granted!');
      log('Device info:', {
        vendorId: `0x${device.vendorId.toString(16)}`,
        productId: `0x${device.productId.toString(16)}`,
        productName: device.productName,
        manufacturerName: device.manufacturerName,
        serialNumber: device.serialNumber
      });

      setDevice(device);

      // Try to open the device
      log('Attempting to open device...');
      await device.open();
      log('✅ Device opened');

      // Get configuration
      if (device.configuration === null) {
        log('Selecting configuration 1...');
        await device.selectConfiguration(1);
      }
      
      log('Configuration:', {
        configurationValue: device.configuration?.configurationValue,
        interfaces: device.configuration?.interfaces.length
      });

      // List interfaces
      if (device.configuration?.interfaces) {
        device.configuration.interfaces.forEach((iface, i) => {
          log(`Interface ${i}:`, {
            interfaceNumber: iface.interfaceNumber,
            alternate: iface.alternate.interfaceClass,
            endpoints: iface.alternate.endpoints.length
          });
        });
      }

      // Try to claim an interface
      try {
        // YubiKey CCID interface is typically interface 2
        log('Attempting to claim CCID interface...');
        await device.claimInterface(2);
        log('✅ Interface claimed');
        
        // Try to read some data
        // Note: Real CCID communication requires proper APDU commands
        log('Note: Full CCID communication requires APDU commands');
        
      } catch (e) {
        log('Could not claim interface:', e.message);
        log('This is normal - the OS might be using it');
      }

      // Don\'t forget to close
      await device.close();
      log('Device closed');

    } catch (error) {
      log('❌ WebUSB Error:', error.message);
      if (error.name === 'NotFoundError') {
        log('No device was selected');
      }
    }
  };

  // Test 2: Try to detect what interfaces are available
  const testUSBDetails = async () => {
    clearLogs();
    log('Checking existing USB permissions...');

    try {
      const devices = await navigator.usb.getDevices();
      log(`Found ${devices.length} authorized devices`);

      for (const device of devices) {
        if (device.vendorId === 0x1050) {
          log('Found YubiKey in authorized devices!');
          log('YubiKey details:', {
            productName: device.productName,
            serialNumber: device.serialNumber,
            opened: device.opened
          });

          if (!device.opened) {
            await device.open();
            await device.selectConfiguration(1);
          }

          // Enumerate all interfaces
          device.configuration?.interfaces.forEach((iface, i) => {
            const alt = iface.alternate;
            log(`Interface ${i} details:`, {
              class: alt.interfaceClass,
              subclass: alt.interfaceSubclass,
              protocol: alt.interfaceProtocol,
              name: alt.interfaceName,
              endpoints: alt.endpoints.map(ep => ({
                direction: ep.direction,
                type: ep.type,
                packetSize: ep.packetSize
              }))
            });

            // Known interface classes:
            // 3 = HID (Human Interface Device)
            // 11 = CCID (Chip Card Interface Device) - for smart cards
            // 255 = Vendor specific
            
            if (alt.interfaceClass === 11) {
              log('📌 Found CCID interface - this is for smart card access!');
            } else if (alt.interfaceClass === 3) {
              log('📌 Found HID interface - this is for FIDO/U2F');
            }
          });

          await device.close();
        }
      }
    } catch (error) {
      log('Error checking devices:', error.message);
    }
  };

  // Test 3: Theoretical - what we'd need for OpenPGP access
  const explainOpenPGPAccess = () => {
    clearLogs();
    log('How to access OpenPGP on YubiKey:');
    log('');
    log('1. YubiKey OpenPGP applet uses CCID interface (class 11)');
    log('2. Communication requires APDU commands:');
    log('   - SELECT OpenPGP applet: 00 A4 04 00 06 D2 76 00 01 24 01');
    log('   - GET DATA commands to read public key');
    log('   - VERIFY PIN command for private operations');
    log('');
    log('3. Browser limitations:');
    log('   - WebUSB can access the device BUT...');
    log('   - OS usually claims CCID interface');
    log('   - Would need exclusive access');
    log('');
    log('4. Alternatives:');
    log('   a) Browser Extension with native messaging');
    log('   b) Local proxy server (like gpg-agent)');
    log('   c) Store public key URL on YubiKey, fetch separately');
    log('   d) Use FIDO2/WebAuthn and derive keys');
    log('');
    log('5. What IS accessible via browser:');
    log('   - Device info (vendor, product, serial)');
    log('   - FIDO2/U2F operations via WebAuthn');
    log('   - HID interface (if not claimed by OS)');
    log('');
    log('The YubiKey can store a URL to your public key:');
    log('   ykman openpgp set-url https://keyserver.com/yourkey.asc');
    log('But reading this URL requires CCID access 😞');
  };

  // Test 4: Check if we can at least identify the YubiKey model
  const identifyYubiKey = async () => {
    clearLogs();
    log('Attempting to identify YubiKey model...');

    try {
      const device = await navigator.usb.requestDevice({
        filters: [{ vendorId: 0x1050 }]
      });

      const productId = device.productId;
      log(`Product ID: 0x${productId.toString(16)}`);

      // YubiKey product IDs (from Yubico documentation)
      const models = {
        0x0010: 'YubiKey Standard',
        0x0110: 'YubiKey Plus',
        0x0111: 'YubiKey Plus',
        0x0114: 'YubiKey Neo OTP',
        0x0115: 'YubiKey Neo OTP+U2F',
        0x0116: 'YubiKey Neo OTP+U2F+CCID',
        0x0120: 'YubiKey Touch U2F',
        0x0402: 'YubiKey 4 OTP',
        0x0403: 'YubiKey 4 OTP+U2F', 
        0x0404: 'YubiKey 4 CCID',
        0x0405: 'YubiKey 4 OTP+U2F+CCID',
        0x0406: 'YubiKey 4 U2F+CCID',
        0x0407: 'YubiKey 4 OTP+CCID',
        0x0410: 'YubiKey Plus',
        0x0420: 'YubiKey 5 NFC',
        0x0421: 'YubiKey 5 NFC FIDO',
        0x0422: 'YubiKey 5 NFC OTP+FIDO+CCID',
        0x0423: 'YubiKey 5 NFC FIDO+CCID',
        0x0424: 'YubiKey 5 NFC OTP+FIDO',
        0x0425: 'YubiKey 5 NFC OTP+CCID',
        0x0426: 'YubiKey 5 NFC CCID'
      };

      const model = models[productId] || 'Unknown YubiKey model';
      log(`Detected: ${model}`);

      if (model.includes('CCID')) {
        log('✅ This YubiKey supports smart card (OpenPGP) operations!');
      } else {
        log('⚠️ This YubiKey might not support OpenPGP');
      }

    } catch (error) {
      log('Error:', error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-800 rounded-lg shadow-xl p-8">
          <h1 className="text-2xl font-bold text-white mb-6 flex items-center">
            <KeyIcon className="h-8 w-8 mr-3 text-purple-500" />
            YubiKey USB Direct Access Test
          </h1>

          <div className="mb-6 p-4 bg-blue-900/50 rounded-lg border border-blue-700">
            <div className="flex items-start">
              <InformationCircleIcon className="h-5 w-5 text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-200">
                <p className="font-semibold mb-2">Testing direct USB access to YubiKey</p>
                <p>This explores what data we can actually read from the YubiKey.</p>
                <p className="mt-2 text-yellow-300">Note: Chrome/Edge work best for WebUSB</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <button
              onClick={testWebUSB}
              className="py-3 px-6 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold"
            >
              Test WebUSB Access
            </button>

            <button
              onClick={testUSBDetails}
              className="py-3 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
            >
              Check USB Details
            </button>

            <button
              onClick={identifyYubiKey}
              className="py-3 px-6 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
            >
              Identify YubiKey Model
            </button>

            <button
              onClick={explainOpenPGPAccess}
              className="py-3 px-6 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold"
            >
              OpenPGP Access Info
            </button>
          </div>

          {device && (
            <div className="mb-6 p-4 bg-gray-700 rounded-lg">
              <h3 className="text-white font-semibold mb-2">Connected Device</h3>
              <p className="text-gray-300 text-sm">
                {device.productName} (Serial: {device.serialNumber})
              </p>
            </div>
          )}

          <div className="bg-gray-900 rounded-lg p-4 h-96 overflow-y-auto">
            <h3 className="text-white font-semibold mb-3">USB Access Log</h3>
            <div className="space-y-2 font-mono text-xs">
              {logs.length === 0 ? (
                <p className="text-gray-500">Click a button to start testing...</p>
              ) : (
                logs.map((entry, i) => (
                  <div key={i} className="text-gray-400">
                    <span className="text-gray-500">{entry.time}</span>
                    {' '}
                    <span className="text-gray-300">{entry.message}</span>
                    {entry.data && (
                      <pre className="mt-1 ml-8 text-gray-500">
                        {JSON.stringify(entry.data, null, 2)}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-6 p-4 bg-yellow-900/30 rounded-lg border border-yellow-700">
            <p className="text-yellow-200 text-sm">
              <strong>Reality Check:</strong> While we can detect and get basic info about the YubiKey via WebUSB, 
              accessing the OpenPGP applet (for reading PGP keys) requires CCID interface access, which is usually 
              claimed by the OS. We\'d need a browser extension or local helper app for full OpenPGP access.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}