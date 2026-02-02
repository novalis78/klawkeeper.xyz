'use client';

import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, KeyIcon, LockClosedIcon, ServerIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import { storeCredentials, getSessionKey, getDovecotPassword } from '@/lib/mail/mailCredentialManager';
import { validateCredentials, testMailConnection } from '@/lib/mail/mailValidator';
import { useAuth } from '@/lib/auth/useAuth';

export default function MailCredentialsModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  email = '',
  initAccountId = null
}) {
  const { user, getToken } = useAuth();
  const [accountId, setAccountId] = useState(initAccountId);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);
  
  // Mail credentials state
  const [credentials, setCredentials] = useState({
    email: email || '',
    password: '',
    imapServer: '',
    imapPort: 993,
    imapSecure: true,
    smtpServer: '',
    smtpPort: 587,
    smtpSecure: false
  });
  
  // Form validation errors
  const [validationErrors, setValidationErrors] = useState({});
  
  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setCredentials({
        ...credentials,
        email: email || '',
        password: '',
      });
      setError(null);
      setTestResult(null);
      setValidationErrors({});
      setLoading(false);
      setTesting(false);
      
      // Generate account ID if not provided
      if (!accountId) {
        setAccountId(`account_${Date.now()}`);
      }
    }
  }, [isOpen, email]);
  
  // Auto-fill server settings when email changes
  useEffect(() => {
    if (credentials.email) {
      try {
        const domain = credentials.email.split('@')[1];
        if (domain) {
          setCredentials({
            ...credentials,
            imapServer: `imap.${domain}`,
            smtpServer: `smtp.${domain}`
          });
        }
      } catch (error) {
        console.error('Error parsing email domain:', error);
      }
    }
  }, [credentials.email]);
  
  // Handle input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Handle checkbox differently
    const newValue = type === 'checkbox' ? checked : value;
    
    setCredentials({
      ...credentials,
      [name]: newValue
    });
    
    // Clear validation error when field is edited
    if (validationErrors[name]) {
      setValidationErrors({
        ...validationErrors,
        [name]: null
      });
    }
  };
  
  // Handle number inputs (ports)
  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    
    // Ensure value is a valid number
    const numberValue = parseInt(value, 10);
    
    if (!isNaN(numberValue) && numberValue > 0 && numberValue <= 65535) {
      setCredentials({
        ...credentials,
        [name]: numberValue
      });
    }
  };
  
  // Test connection
  const handleTestConnection = async () => {
    try {
      setTesting(true);
      setTestResult(null);
      setError(null);
      
      // Validate credentials
      const validation = validateCredentials(credentials);
      if (!validation.valid) {
        setValidationErrors(validation.errors);
        setTesting(false);
        return;
      }
      
      // Test connection
      const result = await testMailConnection(credentials);
      setTestResult(result);
      
      if (!result.success) {
        setError(result.message || 'Connection test failed');
        if (result.errors) {
          setValidationErrors(result.errors);
        }
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      setError('Failed to test connection: ' + error.message);
    } finally {
      setTesting(false);
    }
  };
  
  // Save credentials
  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // If email is not set but available as a prop, use that
      if (!credentials.email && email) {
        setCredentials({
          ...credentials,
          email: email
        });
      }
      
      // Validate credentials before saving
      const validation = validateCredentials(credentials);
      if (!validation.valid) {
        setValidationErrors(validation.errors);
        setLoading(false);
        return;
      }
      
      // Get auth token and fingerprint
      const token = getToken();
      const fingerprint = user?.fingerprint;
      
      if (!token || !fingerprint) {
        setError('Authentication required. Please log in again.');
        setLoading(false);
        return;
      }
      
      // Get session key
      const sessionKey = await getSessionKey(token, fingerprint);
      
      // If PGP key is available, use the deterministic password
      let updatedCredentials = { ...credentials };
      
      // Try to access the PGP key object from localStorage (this is set during login)
      const pgpKeyData = localStorage.getItem('pgp_key_data');
      if (pgpKeyData) {
        try {
          const keyData = JSON.parse(pgpKeyData);
          
          // If we have a private key available, derive the Dovecot password
          if (keyData.privateKey) {
            console.log('Deriving deterministic password from PGP key');
            
            // Get the salt and version from environment or defaults
            const authSalt = window.env?.DOVECOT_AUTH_SALT || 'keykeeper-dovecot-auth';
            const authVersion = window.env?.DOVECOT_AUTH_VERSION || 'v1';
            
            // Derive the password
            const derivedPassword = await getDovecotPassword(
              credentials.email,
              keyData.privateKey,
              '' // No passphrase for now
            );
            
            console.log('Successfully derived deterministic password');
            
            // Use the derived password instead of the one entered by user
            updatedCredentials.password = derivedPassword;
          }
        } catch (keyError) {
          console.error('Error with PGP key:', keyError);
          // Continue with user-provided password
        }
      }
      
      // Store credentials
      await storeCredentials(accountId, updatedCredentials, sessionKey, rememberDevice);
      
      // Call success callback
      if (onSuccess) {
        onSuccess(updatedCredentials);
      }
      
      // Close modal
      onClose();
    } catch (error) {
      console.error('Error saving credentials:', error);
      setError('Failed to save credentials: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={() => !loading && onClose()}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-70" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-xl bg-background border border-primary-600/30 p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-white flex items-center"
                >
                  <KeyIcon className="h-5 w-5 mr-2 text-primary-500" />
                  Mail Account Credentials
                </Dialog.Title>
                
                <button
                  type="button"
                  className="absolute top-4 right-4 text-gray-400 hover:text-white"
                  onClick={onClose}
                  disabled={loading}
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
                
                <div className="mt-4">
                  <p className="text-sm text-gray-300 mb-4">
                    Your mail password is derived from your PGP private key, creating a secure and consistent password without storing it anywhere. 
                    Server details are saved securely and encrypted on your device only.
                  </p>
                  
                  {error && (
                    <div className="mb-4 p-2 bg-red-900/30 border border-red-800 rounded-md text-red-400 text-sm">
                      {error}
                    </div>
                  )}
                  
                  {testResult && testResult.success && (
                    <div className="mb-4 p-2 bg-green-900/30 border border-green-800 rounded-md text-green-400 text-sm">
                      Connection test successful! IMAP and SMTP servers are accessible.
                    </div>
                  )}
                  
                  <div className="space-y-4">
                    {/* Email field */}
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                        Email Address
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="email"
                          name="email"
                          id="email"
                          className={`block w-full pl-10 pr-3 py-2 border ${validationErrors.email ? 'border-red-500' : 'border-gray-700'} bg-gray-900 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-white text-sm`}
                          placeholder="your@email.com"
                          value={credentials.email}
                          onChange={handleChange}
                          disabled={loading || !!email}
                        />
                      </div>
                      {validationErrors.email && (
                        <p className="mt-1 text-sm text-red-500">{validationErrors.email}</p>
                      )}
                    </div>
                    
                    {/* Password field */}
                    <div>
                      <div className="flex justify-between items-baseline mb-1">
                        <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                          Password
                        </label>
                        <span className="text-xs text-primary-400">Will use PGP-derived password</span>
                      </div>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <LockClosedIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="password"
                          name="password"
                          id="password"
                          className={`block w-full pl-10 pr-3 py-2 border ${validationErrors.password ? 'border-red-500' : 'border-gray-700'} bg-gray-900 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-white text-sm`}
                          placeholder="Password (derived from your PGP key)"
                          value={credentials.password}
                          onChange={handleChange}
                          disabled={loading}
                        />
                      </div>
                      {validationErrors.password && (
                        <p className="mt-1 text-sm text-red-500">{validationErrors.password}</p>
                      )}
                      <p className="mt-1 text-xs text-gray-400">
                        Your mail password will be automatically derived from your PGP private key.
                        You can still enter a password manually if needed.
                      </p>
                    </div>
                    
                    {/* Advanced settings toggle */}
                    <div>
                      <button
                        type="button"
                        className="text-sm text-primary-400 hover:text-primary-300 focus:outline-none"
                        onClick={() => setShowAdvanced(!showAdvanced)}
                      >
                        {showAdvanced ? '- Hide advanced settings' : '+ Show advanced settings'}
                      </button>
                    </div>
                    
                    {/* Advanced settings */}
                    {showAdvanced && (
                      <div className="space-y-4 border border-gray-700 rounded-md p-3 bg-gray-900/50">
                        <h4 className="text-sm font-medium text-gray-300">Server Settings</h4>
                        
                        {/* IMAP Settings */}
                        <div className="space-y-3">
                          <div>
                            <label htmlFor="imapServer" className="block text-sm font-medium text-gray-400 mb-1">
                              IMAP Server
                            </label>
                            <div className="flex space-x-2">
                              <div className="relative flex-grow">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                  <ServerIcon className="h-4 w-4 text-gray-500" />
                                </div>
                                <input
                                  type="text"
                                  name="imapServer"
                                  id="imapServer"
                                  className={`block w-full pl-9 pr-3 py-1.5 border ${validationErrors.imapServer ? 'border-red-500' : 'border-gray-700'} bg-gray-900 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-white text-sm`}
                                  placeholder="imap.example.com"
                                  value={credentials.imapServer}
                                  onChange={handleChange}
                                  disabled={loading}
                                />
                              </div>
                              <div className="w-20">
                                <input
                                  type="number"
                                  name="imapPort"
                                  id="imapPort"
                                  className={`block w-full px-3 py-1.5 border ${validationErrors.imapPort ? 'border-red-500' : 'border-gray-700'} bg-gray-900 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-white text-sm`}
                                  placeholder="Port"
                                  value={credentials.imapPort}
                                  onChange={handleNumberChange}
                                  disabled={loading}
                                  min="1"
                                  max="65535"
                                />
                              </div>
                            </div>
                            {validationErrors.imapServer && (
                              <p className="mt-1 text-sm text-red-500">{validationErrors.imapServer}</p>
                            )}
                          </div>
                          
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              name="imapSecure"
                              id="imapSecure"
                              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-700 rounded bg-gray-900"
                              checked={credentials.imapSecure}
                              onChange={handleChange}
                              disabled={loading}
                            />
                            <label htmlFor="imapSecure" className="ml-2 block text-sm text-gray-400">
                              Use SSL/TLS (Recommended)
                            </label>
                          </div>
                        </div>
                        
                        {/* SMTP Settings */}
                        <div className="space-y-3">
                          <div>
                            <label htmlFor="smtpServer" className="block text-sm font-medium text-gray-400 mb-1">
                              SMTP Server
                            </label>
                            <div className="flex space-x-2">
                              <div className="relative flex-grow">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                  <ServerIcon className="h-4 w-4 text-gray-500" />
                                </div>
                                <input
                                  type="text"
                                  name="smtpServer"
                                  id="smtpServer"
                                  className={`block w-full pl-9 pr-3 py-1.5 border ${validationErrors.smtpServer ? 'border-red-500' : 'border-gray-700'} bg-gray-900 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-white text-sm`}
                                  placeholder="smtp.example.com"
                                  value={credentials.smtpServer}
                                  onChange={handleChange}
                                  disabled={loading}
                                />
                              </div>
                              <div className="w-20">
                                <input
                                  type="number"
                                  name="smtpPort"
                                  id="smtpPort"
                                  className={`block w-full px-3 py-1.5 border ${validationErrors.smtpPort ? 'border-red-500' : 'border-gray-700'} bg-gray-900 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-white text-sm`}
                                  placeholder="Port"
                                  value={credentials.smtpPort}
                                  onChange={handleNumberChange}
                                  disabled={loading}
                                  min="1"
                                  max="65535"
                                />
                              </div>
                            </div>
                            {validationErrors.smtpServer && (
                              <p className="mt-1 text-sm text-red-500">{validationErrors.smtpServer}</p>
                            )}
                          </div>
                          
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              name="smtpSecure"
                              id="smtpSecure"
                              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-700 rounded bg-gray-900"
                              checked={credentials.smtpSecure}
                              onChange={handleChange}
                              disabled={loading}
                            />
                            <label htmlFor="smtpSecure" className="ml-2 block text-sm text-gray-400">
                              Use SSL/TLS
                            </label>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Remember credentials */}
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="rememberDevice"
                        id="rememberDevice"
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-700 rounded bg-gray-900"
                        checked={rememberDevice}
                        onChange={(e) => setRememberDevice(e.target.checked)}
                        disabled={loading}
                      />
                      <label htmlFor="rememberDevice" className="ml-2 block text-sm text-gray-300">
                        Remember on this device
                      </label>
                    </div>
                    
                    <div className="text-xs text-gray-400 italic">
                      <p>
                        Credentials are encrypted and stored only on your device. We never store your mail password on our servers.
                      </p>
                    </div>
                    
                    <div className="flex space-x-3 mt-6">
                      <button
                        type="button"
                        className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-gray-600 bg-gray-800 text-sm font-medium rounded-md text-gray-300 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 focus:ring-offset-gray-800"
                        onClick={handleTestConnection}
                        disabled={loading || testing}
                      >
                        {testing ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Testing
                          </>
                        ) : "Test Connection"}
                      </button>
                      <button
                        type="button"
                        className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 focus:ring-offset-gray-800"
                        onClick={handleSave}
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Saving
                          </>
                        ) : "Save & Continue"}
                      </button>
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}