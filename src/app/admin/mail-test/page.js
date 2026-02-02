'use client';

import { useState, useEffect } from 'react';
import { EnvelopeIcon, CheckCircleIcon, XCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

/**
 * Mail Server Test Page
 * 
 * This page tests connectivity to Postfix/Dovecot mail servers
 * and verifies that account creation is working properly.
 */
export default function MailServerTestPage() {
  const [smtpTest, setSmtpTest] = useState({ status: 'idle', message: '', details: null });
  const [imapTest, setImapTest] = useState({ status: 'idle', message: '', details: null });
  const [accountTest, setAccountTest] = useState({ status: 'idle', message: '', details: null });
  const [testEmail, setTestEmail] = useState('');
  const [testPassword, setTestPassword] = useState('');
  const [serverDetails, setServerDetails] = useState({
    host: '',
    smtpPort: '',
    imapPort: '',
    secureConnections: true
  });
  const [isLoading, setIsLoading] = useState(false);
  const [testLog, setTestLog] = useState([]);

  // Log a message to the test log
  const logMessage = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setTestLog(prev => [...prev, { message, timestamp, type }]);
  };

  // Test SMTP connection
  const testSmtpConnection = async () => {
    setSmtpTest({ status: 'loading', message: 'Testing SMTP connection...', details: null });
    logMessage('Testing SMTP connection...', 'info');
    
    try {
      const response = await fetch('/api/admin/mail-test/smtp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          host: serverDetails.host || undefined,
          port: serverDetails.smtpPort ? parseInt(serverDetails.smtpPort) : undefined,
          secure: serverDetails.secureConnections,
          user: testEmail || undefined,
          pass: testPassword || undefined
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSmtpTest({ 
          status: 'success', 
          message: 'SMTP connection successful', 
          details: data.details 
        });
        logMessage('✅ SMTP connection successful', 'success');
        if (data.details) {
          logMessage(`SMTP server identified as: ${data.details.name || 'Unknown'}`, 'info');
        }
      } else {
        setSmtpTest({ 
          status: 'error', 
          message: data.error || 'Failed to connect to SMTP server', 
          details: data.details 
        });
        logMessage(`❌ SMTP connection failed: ${data.error}`, 'error');
      }
    } catch (error) {
      setSmtpTest({ 
        status: 'error', 
        message: 'Error testing SMTP connection', 
        details: error.message 
      });
      logMessage(`❌ Exception during SMTP test: ${error.message}`, 'error');
    }
  };

  // Test IMAP connection
  const testImapConnection = async () => {
    setImapTest({ status: 'loading', message: 'Testing IMAP connection...', details: null });
    logMessage('Testing IMAP connection...', 'info');
    
    try {
      const response = await fetch('/api/admin/mail-test/imap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          host: serverDetails.host || undefined,
          port: serverDetails.imapPort ? parseInt(serverDetails.imapPort) : undefined,
          secure: serverDetails.secureConnections,
          user: testEmail || undefined,
          pass: testPassword || undefined
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setImapTest({ 
          status: 'success', 
          message: 'IMAP connection successful', 
          details: data.details 
        });
        logMessage('✅ IMAP connection successful', 'success');
        if (data.details && data.details.capabilities) {
          logMessage(`IMAP server capabilities: ${data.details.capabilities.join(', ')}`, 'info');
        }
      } else {
        setImapTest({ 
          status: 'error', 
          message: data.error || 'Failed to connect to IMAP server', 
          details: data.details 
        });
        logMessage(`❌ IMAP connection failed: ${data.error}`, 'error');
      }
    } catch (error) {
      setImapTest({ 
        status: 'error', 
        message: 'Error testing IMAP connection', 
        details: error.message 
      });
      logMessage(`❌ Exception during IMAP test: ${error.message}`, 'error');
    }
  };

  // Test account creation
  const testAccountCreation = async () => {
    if (!testEmail || !testPassword) {
      setAccountTest({ 
        status: 'error', 
        message: 'Email and password are required for account test', 
        details: null 
      });
      logMessage('❌ Cannot test account creation: Email and password are required', 'error');
      return;
    }
    
    setAccountTest({ status: 'loading', message: 'Testing account creation...', details: null });
    logMessage(`Testing account creation for: ${testEmail}`, 'info');
    
    try {
      const response = await fetch('/api/admin/mail-test/create-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: testEmail,
          password: testPassword,
          host: serverDetails.host || undefined
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setAccountTest({ 
          status: 'success', 
          message: 'Account created successfully', 
          details: data.details 
        });
        logMessage('✅ Account created successfully', 'success');
        if (data.details) {
          Object.entries(data.details).forEach(([key, value]) => {
            logMessage(`${key}: ${value}`, 'info');
          });
        }
      } else {
        setAccountTest({ 
          status: 'error', 
          message: data.error || 'Failed to create account', 
          details: data.details 
        });
        logMessage(`❌ Account creation failed: ${data.error}`, 'error');
      }
    } catch (error) {
      setAccountTest({ 
        status: 'error', 
        message: 'Error creating account', 
        details: error.message 
      });
      logMessage(`❌ Exception during account creation: ${error.message}`, 'error');
    }
  };

  // Run all tests
  const runAllTests = async () => {
    setIsLoading(true);
    logMessage('Starting all tests...', 'info');
    
    // Clear previous test results
    setSmtpTest({ status: 'idle', message: '', details: null });
    setImapTest({ status: 'idle', message: '', details: null });
    setAccountTest({ status: 'idle', message: '', details: null });
    
    await testSmtpConnection();
    await testImapConnection();
    await testAccountCreation();
    
    setIsLoading(false);
    logMessage('All tests completed', 'info');
  };

  // Status indicator component
  const StatusIndicator = ({ status, message }) => {
    if (status === 'loading') {
      return (
        <div className="flex items-center">
          <div className="animate-spin h-5 w-5 mr-2 border-t-2 border-primary-500 border-r-2 rounded-full"></div>
          <span>{message}</span>
        </div>
      );
    }

    if (status === 'success') {
      return (
        <div className="flex items-center text-green-600 dark:text-green-500">
          <CheckCircleIcon className="h-5 w-5 mr-2" />
          <span>{message}</span>
        </div>
      );
    }

    if (status === 'error') {
      return (
        <div className="flex items-center text-red-600 dark:text-red-500">
          <XCircleIcon className="h-5 w-5 mr-2" />
          <span>{message}</span>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <EnvelopeIcon className="h-12 w-12 text-primary-600 dark:text-primary-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Mail Server Test</h1>
          <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
            Verify connectivity to Postfix/Dovecot and test email account creation
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Server Configuration</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label htmlFor="host" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Mail Server Host
              </label>
              <input
                type="text"
                id="host"
                value={serverDetails.host}
                onChange={(e) => setServerDetails(prev => ({ ...prev, host: e.target.value }))}
                placeholder="mail.example.com or IP address"
                className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white sm:text-sm"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Leave blank to use default (172.17.0.1)
              </p>
            </div>
            
            <div className="flex gap-4">
              <div className="flex-1">
                <label htmlFor="smtpPort" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  SMTP Port
                </label>
                <input
                  type="text"
                  id="smtpPort"
                  value={serverDetails.smtpPort}
                  onChange={(e) => setServerDetails(prev => ({ ...prev, smtpPort: e.target.value }))}
                  placeholder="587 or 465"
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                />
              </div>
              
              <div className="flex-1">
                <label htmlFor="imapPort" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  IMAP Port
                </label>
                <input
                  type="text"
                  id="imapPort"
                  value={serverDetails.imapPort}
                  onChange={(e) => setServerDetails(prev => ({ ...prev, imapPort: e.target.value }))}
                  placeholder="993 or 143"
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                />
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label htmlFor="testEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Test Email
              </label>
              <input
                type="email"
                id="testEmail"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@keykeeper.world"
                className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white sm:text-sm"
              />
            </div>
            
            <div>
              <label htmlFor="testPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Test Password
              </label>
              <input
                type="password"
                id="testPassword"
                value={testPassword}
                onChange={(e) => setTestPassword(e.target.value)}
                placeholder="Password for testing"
                className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white sm:text-sm"
              />
            </div>
          </div>
          
          <div className="flex items-center mb-6">
            <input
              id="secureConnections"
              name="secureConnections"
              type="checkbox"
              checked={serverDetails.secureConnections}
              onChange={(e) => setServerDetails(prev => ({ ...prev, secureConnections: e.target.checked }))}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 rounded"
            />
            <label htmlFor="secureConnections" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              Use secure connections (TLS/SSL)
            </label>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={testSmtpConnection}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Test SMTP
            </button>
            
            <button
              type="button"
              onClick={testImapConnection}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
            >
              Test IMAP
            </button>
            
            <button
              type="button"
              onClick={testAccountCreation}
              disabled={isLoading || !testEmail || !testPassword}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              Test Account Creation
            </button>
            
            <button
              type="button"
              onClick={runAllTests}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              Run All Tests
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Test Results */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Test Results</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">SMTP Connection:</h3>
                <StatusIndicator status={smtpTest.status} message={smtpTest.message} />
                {smtpTest.details && (
                  <div className="mt-2 border-t border-gray-200 dark:border-gray-700 pt-2">
                    <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                      {JSON.stringify(smtpTest.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
              
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">IMAP Connection:</h3>
                <StatusIndicator status={imapTest.status} message={imapTest.message} />
                {imapTest.details && (
                  <div className="mt-2 border-t border-gray-200 dark:border-gray-700 pt-2">
                    <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                      {JSON.stringify(imapTest.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
              
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">Account Creation:</h3>
                <StatusIndicator status={accountTest.status} message={accountTest.message} />
                {accountTest.details && (
                  <div className="mt-2 border-t border-gray-200 dark:border-gray-700 pt-2">
                    <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                      {JSON.stringify(accountTest.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Test Log */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Test Log</h2>
            
            <div className="bg-gray-100 dark:bg-gray-900 rounded-md p-3 h-80 overflow-y-auto font-mono">
              {testLog.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">No test log entries yet</p>
              ) : (
                <div className="space-y-1.5">
                  {testLog.map((entry, index) => (
                    <div 
                      key={index} 
                      className={`text-xs ${
                        entry.type === 'error' ? 'text-red-600 dark:text-red-400' :
                        entry.type === 'success' ? 'text-green-600 dark:text-green-400' :
                        'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <span className="text-gray-500 dark:text-gray-500">[{entry.timestamp}]</span> {entry.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setTestLog([])}
                className="inline-flex items-center px-3 py-1 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Clear Log
              </button>
            </div>
          </div>
        </div>
        
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationCircleIcon className="h-5 w-5 text-yellow-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Important Notes</h3>
              <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-200">
                <ul className="list-disc pl-5 space-y-1">
                  <li>This test page requires appropriate API endpoints to be implemented</li>
                  <li>For account creation to work, the mail server should be configured to accept virtual users</li>
                  <li>Default Docker bridge IP (172.17.0.1) is used if no host is specified</li>
                  <li>This page is intended for administrative use only and should be protected accordingly</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}