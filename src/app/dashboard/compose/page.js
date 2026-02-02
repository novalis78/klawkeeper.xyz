'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '../../../components/dashboard/DashboardLayout';
import { EnvelopeIcon, PaperAirplaneIcon, XMarkIcon, PaperClipIcon, ShieldCheckIcon, KeyIcon } from '@heroicons/react/24/outline';
import { LockClosedIcon } from '@heroicons/react/24/solid';
import { getCurrentUserId } from '@/lib/auth/getCurrentUser';
import { generateEmailHTML, EMAIL_TEMPLATES } from '@/lib/email/templates';

function ComposeContent() {
  const searchParams = useSearchParams();
  const [userEmailAccounts, setUserEmailAccounts] = useState([]);
  const [userPublicKey, setUserPublicKey] = useState(null);
  const [emailData, setEmailData] = useState({
    from: '',
    to: '',
    subject: '',
    message: '',
    attachments: []
  });
  const fileInputRef = useRef(null);
  const toInputRef = useRef(null);
  const [sendingStatus, setSendingStatus] = useState('idle'); // idle, sending, success, error
  const [encryptionStatus, setEncryptionStatus] = useState('unknown'); // unknown, available, unavailable
  const [encryptionEnabled, setEncryptionEnabled] = useState(true); // user can toggle this off even when key is available
  const [emailTemplate, setEmailTemplate] = useState('default'); // user's preferred email template
  
  // Handle query parameters (like ?to=email@example.com) and auto-focus
  useEffect(() => {
    const toEmail = searchParams.get('to');
    if (toEmail) {
      setEmailData(prev => ({ ...prev, to: decodeURIComponent(toEmail) }));
      // Check encryption status for the pre-filled email
      checkEncryptionStatus(decodeURIComponent(toEmail));
    }

    // Auto-focus the recipient field when the component mounts
    // Use a small delay to ensure the input is rendered
    const focusTimer = setTimeout(() => {
      if (toInputRef.current) {
        toInputRef.current.focus();
      }
    }, 100);

    return () => clearTimeout(focusTimer);
  }, [searchParams]);

  // Fetch user's email accounts from the virtual_users table
  // and also fetch the user's public key
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Fetch the current user's email from the API
        const userId = await getCurrentUserId();
        if (!userId) {
          console.error('No user ID found');
          return;
        }
        
        // Get user email from virtual_users table
        const response = await fetch('/api/mail/user-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch user email');
        }

        const data = await response.json();
        
        if (data.success && data.email) {
          // Create account object from real user email and name
          const userAccount = {
            id: 1,
            email: data.email,
            name: data.name || data.email.split('@')[0], // Use user's name or email prefix as fallback
            isDefault: true
          };

          setUserEmailAccounts([userAccount]);
          
          // Set default From address
          setEmailData(prev => ({ ...prev, from: userAccount.id.toString() }));
          
          // Fetch the user's public key
          try {
            const publicKeyResponse = await fetch('/api/user/public-key', {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
              }
            });

            if (publicKeyResponse.ok) {
              const pkData = await publicKeyResponse.json();
              if (pkData.publicKey) {
                console.log('Public key fetched for automatic attachment');
                setUserPublicKey(pkData.publicKey);
              }
            } else {
              // Fallback to get public key from localStorage if available
              const storedPublicKey = localStorage.getItem('user_public_key');
              if (storedPublicKey) {
                console.log('Using public key from localStorage');
                setUserPublicKey(storedPublicKey);
              }
            }
          } catch (pkError) {
            console.error('Error fetching user public key:', pkError);
          }

          // Fetch user's email template preference
          const savedTemplate = localStorage.getItem('email_template');
          if (savedTemplate && EMAIL_TEMPLATES[savedTemplate]) {
            setEmailTemplate(savedTemplate);
          }
        } else {
          console.warn('No email found for user, falling back to localStorage');
          // Fallback to localStorage if no real email found
          const fallbackEmail = localStorage.getItem('user_email') || 'user@keykeeper.world';
          const fallbackName = localStorage.getItem('user_name') || fallbackEmail.split('@')[0];
          const mockAccounts = [
            { id: 1, email: fallbackEmail, name: fallbackName, isDefault: true }
          ];

          setUserEmailAccounts(mockAccounts);

          // Set default From address
          const defaultAccount = mockAccounts.find(account => account.isDefault) || mockAccounts[0];
          if (defaultAccount) {
            setEmailData(prev => ({ ...prev, from: defaultAccount.id.toString() }));
          }
        }
      } catch (error) {
        console.error('Error fetching user email accounts:', error);

        // Fallback to localStorage on error
        const fallbackEmail = localStorage.getItem('user_email') || 'user@keykeeper.world';
        const fallbackName = localStorage.getItem('user_name') || fallbackEmail.split('@')[0];
        const mockAccounts = [
          { id: 1, email: fallbackEmail, name: fallbackName, isDefault: true }
        ];

        setUserEmailAccounts(mockAccounts);

        // Set default From address
        const defaultAccount = mockAccounts.find(account => account.isDefault) || mockAccounts[0];
        if (defaultAccount) {
          setEmailData(prev => ({ ...prev, from: defaultAccount.id.toString() }));
        }
      }
    };
    
    fetchUserData();
  }, []);
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEmailData({
      ...emailData,
      [name]: value
    });
    
    // Check encryption status when recipient email changes
    if (name === 'to' && value) {
      checkEncryptionStatus(value);
    }
  };
  
  // Check if the recipient has a public key available
  const checkEncryptionStatus = async (email) => {
    try {
      const authToken = localStorage.getItem('auth_token');
      const response = await fetch('/api/contacts/check-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ email })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.hasKey) {
          setEncryptionStatus('available');
        } else {
          setEncryptionStatus('unavailable');
        }
      } else {
        setEncryptionStatus('unavailable');
      }
    } catch (error) {
      console.error('Error checking encryption status:', error);
      setEncryptionStatus('unavailable');
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!emailData.from || !emailData.to || !emailData.subject || !emailData.message) {
      alert('Please fill in all required fields');
      return;
    }
    
    setSendingStatus('sending');
    
    try {
      // Get the selected account
      const selectedAccount = userEmailAccounts.find(acc => acc.id.toString() === emailData.from.toString());
      if (!selectedAccount) {
        throw new Error('Invalid sending account selected');
      }
      
      console.log('Sending email from:', selectedAccount.email);
      
      // Handle file attachments if any
      let attachmentsToSend = [];
      if (emailData.attachments.length > 0) {
        attachmentsToSend = await Promise.all(emailData.attachments.map(async (att) => {
          // For files, we need to convert to base64
          if (att.file) {
            try {
              // Read file as base64
              const base64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result.split(',')[1]);
                reader.onerror = reject;
                reader.readAsDataURL(att.file);
              });
              
              return {
                filename: att.name,
                content: base64,
                encoding: 'base64',
                contentType: att.type
              };
            } catch (err) {
              console.error('Error processing attachment:', err);
              return null;
            }
          } else {
            // For attachments that don't have file objects (e.g., forwarded)
            return {
              filename: att.name,
              contentType: att.type
            };
          }
        }));
        
        // Filter out any null attachments (ones that failed to process)
        attachmentsToSend = attachmentsToSend.filter(Boolean);
      }
      
      // Create a copy of attachments to send
      const allAttachments = [...attachmentsToSend];
      
      console.log('[ComposeEmail] Attachments before adding public key:', allAttachments.length);
      console.log('[ComposeEmail] Attachment filenames before:', allAttachments.map(a => a.filename));
      
      // Automatically attach the user's public key as an attachment
      if (userPublicKey) {
        console.log('[ComposeEmail] Attaching public key:', {
          hasPublicKey: !!userPublicKey,
          keyLength: userPublicKey?.length,
          keyPreview: userPublicKey?.substring(0, 100)
        });

        // Add the public key as an attachment
        const senderEmail = selectedAccount.email.replace('@', '_at_');
        const keyAttachment = {
          filename: `${senderEmail}_public_key.asc`,
          content: userPublicKey,
          encoding: 'utf8', // PGP keys are text, not base64
          contentType: 'application/pgp-keys'
        };
        
        console.log('[ComposeEmail] Key attachment object:', JSON.stringify(keyAttachment, null, 2));
        
        allAttachments.push(keyAttachment);
        
        console.log('[ComposeEmail] Total attachments after adding key:', allAttachments.length);
        console.log('[ComposeEmail] All attachment filenames:', allAttachments.map(a => a.filename));
      } else {
        console.log('[Compose] No public key available to attach');
        
        // Try one more time to get the public key from the API
        try {
          const publicKeyResponse = await fetch('/api/user/public-key', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
          });
          
          if (publicKeyResponse.ok) {
            const pkData = await publicKeyResponse.json();
            if (pkData.publicKey) {
              console.log('Public key fetched at last minute for attachment');
              
              // Add the newly retrieved public key as an attachment
              const senderEmail = selectedAccount.email.replace('@', '_at_');
              attachmentsToSend.push({
                filename: `${senderEmail}_public_key.asc`,
                content: pkData.publicKey,
                encoding: 'utf8', // PGP keys are text, not base64
                contentType: 'application/pgp-keys'
              });
              
              allAttachments.push({
                filename: `${senderEmail}_public_key.asc`,
                content: pkData.publicKey,
                encoding: 'utf8',
                contentType: 'application/pgp-keys'
              });
              
              console.log('[ComposeEmail] Added public key from last-minute fetch');
              console.log('[ComposeEmail] Total attachments after last-minute add:', allAttachments.length);
              
              // Also save for future use
              setUserPublicKey(pkData.publicKey);
              localStorage.setItem('user_public_key', pkData.publicKey);
            }
          }
        } catch (lastMinuteError) {
          console.error('Last-minute attempt to fetch public key failed:', lastMinuteError);
        }
      }
      
      // Get mail credentials from localStorage
      // This is the same pattern used by the dashboard page for inbox fetching
      let credentials = null;
      
      try {
        console.log('=== KEYKEEPER: Attempting to retrieve stored mail credentials ===');
        
        // Generate account ID from email
        const accountId = `account_${selectedAccount.email.replace(/[^a-zA-Z0-9]/g, '_')}`;
        console.log(`Using account ID: ${accountId}`);
        
        // First try the direct storage method (no encryption)
        const directStorageKey = `kk_mail_${accountId}_direct`;
        const directCredentials = localStorage.getItem(directStorageKey);
        
        if (directCredentials) {
          console.log('Found direct credentials in localStorage!');
          credentials = JSON.parse(directCredentials);
          console.log('=== KEYKEEPER: Successfully retrieved mail credentials ===');
          console.log(`Using credentials for: ${credentials.email}`);
        } else {
          console.log('No direct credentials found in localStorage');
        }
      } catch (error) {
        console.error('Error retrieving mail credentials:', error);
      }
      
      // Generate HTML using the selected template
      const formatEmailHTML = (plainText, fromName, fromEmail) => {
        // Use the template system to generate HTML
        const html = generateEmailHTML(emailTemplate, {
          subject: emailData.subject,
          body: plainText,
          senderName: fromName,
          senderEmail: fromEmail
        });

        // If plain text template is selected, return null (will use text-only)
        return html;
      };
      
      // Get sender name with fallback
      const senderName = selectedAccount.name || 'KeyKeeper User';

      // Generate HTML from template (returns null for plain text)
      const htmlBody = formatEmailHTML(emailData.message, senderName, selectedAccount.email);
      const isPlainText = !htmlBody;

      // Prepare email data for API with proper formatting for optimal delivery
      const emailApiData = {
        from: {
          email: selectedAccount.email,
          name: senderName
        },
        to: [{
          email: emailData.to.trim(),
          name: ''
        }],
        subject: emailData.subject,
        // Use simple text version for the text field
        text: emailData.message,
        // Use formatted HTML template for the body (null for plain text)
        body: htmlBody || emailData.message,
        isPlainText: isPlainText,
        pgpEncrypted: encryptionStatus === 'available' && encryptionEnabled,
        attachments: allAttachments,
        // Include credentials if found
        credentials: credentials
      };
      
      console.log('[ComposeEmail] Sending email with attachments:', allAttachments.length);
      console.log('[ComposeEmail] Request body preview:', {
        to: emailApiData.to,
        subject: emailApiData.subject,
        bodyLength: emailApiData.body.length,
        textLength: emailApiData.text.length,
        pgpEncrypted: emailApiData.pgpEncrypted,
        attachmentCount: allAttachments.length,
        attachmentDetails: allAttachments.map(a => ({
          filename: a.filename,
          contentLength: a.content?.length || 0,
          encoding: a.encoding,
          contentType: a.contentType
        }))
      });
      
      // If encryption is available AND enabled, fetch the recipient's public key
      let recipientPublicKey = null;
      if (encryptionStatus === 'available' && encryptionEnabled) {
        try {
          const authToken = localStorage.getItem('auth_token');
          const keyResponse = await fetch('/api/contacts/get-key', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ email: emailData.to.trim() })
          });

          if (keyResponse.ok) {
            const keyData = await keyResponse.json();
            if (keyData.publicKey) {
              recipientPublicKey = keyData.publicKey;
              console.log('Retrieved recipient public key for encryption');
            }
          }
        } catch (error) {
          console.error('Error fetching recipient public key:', error);
        }
      }
      
      // Update email data with recipient public key if available
      if (recipientPublicKey) {
        emailApiData.recipientPublicKey = recipientPublicKey;
        console.log('Email will be encrypted with recipient\'s public key');
      }
      
      // Get the auth token from localStorage
      const authToken = localStorage.getItem('auth_token');
      
      // Send the email through the API
      const response = await fetch('/api/mail/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { 'Authorization': `Bearer ${authToken}` })
        },
        body: JSON.stringify(emailApiData),
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to send email');
      }
      
      console.log('Email sent successfully:', result);
      
      // Reset form after successful submission
      setEmailData({
        from: emailData.from, // Keep the from address
        to: '',
        subject: '',
        message: '',
        attachments: []
      });
      
      setEncryptionStatus('unknown');
      setEncryptionEnabled(true); // Reset to default

      setSendingStatus('success');
      
      // Reset success status after 5 seconds
      setTimeout(() => {
        setSendingStatus('idle');
      }, 5000);
      
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send email: ' + error.message);
      setSendingStatus('error');
    }
  };
  
  return (
    <DashboardLayout>
      <div className="w-full">
        <div className="bg-gray-800/70 shadow-xl rounded-xl overflow-hidden border border-gray-700 backdrop-blur-sm">
          <form onSubmit={handleSubmit}>
            <div className="p-8 space-y-6">
              {/* FROM FIELD - Only show if user has multiple accounts */}
              {userEmailAccounts.length > 1 && (
                <div className="group">
                  <label htmlFor="from" className="block text-sm font-medium text-gray-300 mb-2">
                    From
                  </label>
                  <div className="relative rounded-lg transition-all duration-300 bg-gray-900/80 hover:bg-gray-900 focus-within:ring-2 focus-within:ring-primary-500 border border-gray-700 shadow-inner">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <div className="rounded-full h-7 w-7 flex items-center justify-center bg-primary-600/30 text-primary-400">
                        <span className="text-xs font-bold">LE</span>
                      </div>
                    </div>
                    <select
                      name="from"
                      id="from"
                      value={emailData.from}
                      onChange={handleInputChange}
                      className="block w-full pl-14 pr-4 py-3.5 text-base text-white bg-transparent border-0 focus:ring-0 focus:outline-none"
                      required
                    >
                      <option value="" disabled className="bg-gray-800 text-gray-300">Select an email address</option>
                      {userEmailAccounts.map(account => (
                        <option key={account.id} value={account.id} className="bg-gray-800 text-white">
                          {account.email} {account.isDefault ? '(Default)' : ''} - {account.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
              
              {/* TO FIELD */}
              <div className="group">
                <label htmlFor="to" className="block text-sm font-medium text-gray-300 mb-2">
                  To
                </label>
                <div className="relative rounded-lg transition-all duration-300 bg-gray-900/80 hover:bg-gray-900 focus-within:ring-2 focus-within:ring-primary-500 border border-gray-700 shadow-inner">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <EnvelopeIcon className="h-5 w-5 text-primary-400" />
                  </div>
                  <input
                    type="email"
                    name="to"
                    id="to"
                    ref={toInputRef}
                    value={emailData.to}
                    onChange={handleInputChange}
                    className="block w-full pl-14 pr-20 py-3.5 text-base text-white bg-transparent border-0 focus:ring-0 focus:outline-none placeholder-gray-500"
                    placeholder="recipient@example.com"
                    required
                  />
                  
                  {/* Encryption status indicator */}
                  {emailData.to && (
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                      {encryptionStatus === 'available' && encryptionEnabled ? (
                        <div className="flex items-center rounded-full px-3 py-1 bg-green-900/30 border border-green-800">
                          <LockClosedIcon className="h-4 w-4 mr-1.5 text-green-400" />
                          <span className="text-xs font-medium text-green-400">Encrypted</span>
                        </div>
                      ) : encryptionStatus === 'available' && !encryptionEnabled ? (
                        <div className="flex items-center rounded-full px-3 py-1 bg-blue-900/30 border border-blue-800">
                          <ShieldCheckIcon className="h-4 w-4 mr-1.5 text-blue-400" />
                          <span className="text-xs font-medium text-blue-400">Key Available</span>
                        </div>
                      ) : encryptionStatus === 'unavailable' ? (
                        <div className="flex items-center rounded-full px-3 py-1 bg-yellow-900/30 border border-yellow-800">
                          <ShieldCheckIcon className="h-4 w-4 mr-1.5 text-yellow-400" />
                          <span className="text-xs font-medium text-yellow-400">Unencrypted</span>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
                {encryptionStatus === 'unavailable' && (
                  <p className="mt-2 text-xs text-yellow-400 flex items-center">
                    <ShieldCheckIcon className="h-3.5 w-3.5 mr-1.5" />
                    No PGP key found for this recipient. The message will be sent with standard TLS encryption.
                  </p>
                )}
                {encryptionStatus === 'available' && (
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs text-green-400 flex items-center">
                      <LockClosedIcon className="h-3.5 w-3.5 mr-1.5" />
                      PGP key found for this recipient. End-to-end encryption is available.
                    </p>
                    <button
                      type="button"
                      onClick={() => setEncryptionEnabled(!encryptionEnabled)}
                      className={`ml-4 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        encryptionEnabled
                          ? 'bg-green-900/50 text-green-400 border border-green-700 hover:bg-green-900/70'
                          : 'bg-gray-700/50 text-gray-400 border border-gray-600 hover:bg-gray-700/70'
                      }`}
                    >
                      <LockClosedIcon className={`h-3.5 w-3.5 mr-1.5 ${encryptionEnabled ? 'text-green-400' : 'text-gray-500'}`} />
                      {encryptionEnabled ? 'Encryption ON' : 'Encryption OFF'}
                    </button>
                  </div>
                )}
              </div>
              
              {/* SUBJECT FIELD */}
              <div className="group">
                <label htmlFor="subject" className="block text-sm font-medium text-gray-300 mb-2">
                  Subject
                </label>
                <div className="relative rounded-lg transition-all duration-300 bg-gray-900/80 hover:bg-gray-900 focus-within:ring-2 focus-within:ring-primary-500 border border-gray-700 shadow-inner">
                  <input
                    type="text"
                    name="subject"
                    id="subject"
                    value={emailData.subject}
                    onChange={handleInputChange}
                    className="block w-full px-4 py-3.5 text-base text-white bg-transparent border-0 focus:ring-0 focus:outline-none placeholder-gray-500"
                    placeholder="Email subject"
                    required
                  />
                </div>
              </div>
              
              {/* MESSAGE FIELD */}
              <div className="group">
                <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">
                  Message
                </label>
                <div className="relative rounded-lg transition-all duration-300 bg-gray-900/80 hover:bg-gray-900 focus-within:ring-2 focus-within:ring-primary-500 border border-gray-700 shadow-inner">
                  <textarea
                    id="message"
                    name="message"
                    rows={14}
                    value={emailData.message}
                    onChange={handleInputChange}
                    className="block w-full px-4 py-4 text-base text-white bg-transparent border-0 focus:ring-0 focus:outline-none placeholder-gray-500 resize-y"
                    placeholder="Write your message here..."
                    required
                  />
                </div>
              </div>
              
              {/* ATTACHMENTS */}
              <div>
                <div className="flex items-center space-x-4">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center px-4 py-2.5 border border-gray-600 rounded-lg text-sm font-medium text-white bg-gray-800/80 hover:bg-gray-700 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-primary-500"
                  >
                    <PaperClipIcon className="h-5 w-5 mr-2 text-primary-400" aria-hidden="true" />
                    Attach File
                  </button>
                  <span className="text-sm text-gray-400">
                    {emailData.attachments.length > 0 
                      ? `${emailData.attachments.length} ${emailData.attachments.length === 1 ? 'file' : 'files'} attached` 
                      : 'No files attached'}
                  </span>
                  {userPublicKey && (
                    <div className="inline-flex items-center px-3 py-1.5 bg-green-900/20 rounded-lg border border-green-700">
                      <KeyIcon className="h-4 w-4 mr-1.5 text-green-400" />
                      <span className="text-xs font-medium text-green-400">Your public key will be attached</span>
                    </div>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      const newAttachments = files.map(file => ({
                        id: `file-${Math.random().toString(36).substring(7)}`,
                        name: file.name,
                        size: file.size,
                        type: file.type,
                        file // Keep the File object for later upload
                      }));
                      
                      setEmailData({
                        ...emailData,
                        attachments: [...emailData.attachments, ...newAttachments]
                      });
                      
                      // Reset the file input
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                  />
                </div>
                
                {/* Attachment list */}
                {emailData.attachments.length > 0 && (
                  <div className="mt-4 bg-gray-900/70 rounded-lg border border-gray-700 p-3">
                    <h4 className="text-sm font-medium text-gray-300 mb-2 flex items-center">
                      <PaperClipIcon className="h-4 w-4 mr-2 text-primary-400" />
                      Attachments
                    </h4>
                    <div className="space-y-2 max-h-36 overflow-y-auto pr-2">
                      {emailData.attachments.map(attachment => (
                        <div 
                          key={attachment.id}
                          className="flex items-center justify-between p-2 rounded-md bg-gray-800 hover:bg-gray-700 transition-colors"
                        >
                          <div className="flex items-center space-x-3 truncate">
                            <div className="p-1.5 bg-primary-600/20 rounded-md">
                              <PaperClipIcon className="h-4 w-4 text-primary-400" />
                            </div>
                            <div className="truncate">
                              <p className="text-sm text-white truncate">{attachment.name}</p>
                              <p className="text-xs text-gray-400">{(attachment.size / 1024).toFixed(1)} KB</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setEmailData({
                                ...emailData,
                                attachments: emailData.attachments.filter(a => a.id !== attachment.id)
                              });
                            }}
                            className="text-gray-400 hover:text-red-400 transition-colors"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* FOOTER / ACTIONS */}
            <div className="px-8 py-5 bg-gray-900/90 border-t border-gray-700 flex justify-between items-center">
              <div>
                {sendingStatus === 'success' && (
                  <div className="flex items-center text-green-400 bg-green-900/30 px-4 py-2 rounded-lg border border-green-800">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">Message sent successfully!</span>
                  </div>
                )}
                {sendingStatus === 'error' && (
                  <div className="flex items-center text-red-400 bg-red-900/30 px-4 py-2 rounded-lg border border-red-800">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">Error sending message. Please try again.</span>
                  </div>
                )}
              </div>
              
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to discard this message?')) {
                      setEmailData({
                        from: emailData.from, // Keep the from address
                        to: '',
                        subject: '',
                        message: '',
                        attachments: []
                      });
                      setEncryptionStatus('unknown');
                      setEncryptionEnabled(true); // Reset to default
                    }
                  }}
                  className="inline-flex items-center px-5 py-2.5 border border-gray-600 rounded-lg text-sm font-medium text-white bg-gray-800 hover:bg-gray-700 transition-colors shadow-sm focus:outline-none"
                >
                  <XMarkIcon className="h-5 w-5 mr-2 text-gray-400" aria-hidden="true" />
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={sendingStatus === 'sending'}
                  className={`inline-flex items-center px-5 py-2.5 border border-transparent rounded-lg text-sm font-medium text-white shadow-sm focus:outline-none ${
                    sendingStatus === 'sending'
                      ? 'bg-primary-500/50 cursor-not-allowed'
                      : 'bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 transition-all duration-300'
                  }`}
                >
                  {sendingStatus === 'sending' ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending Message...
                    </>
                  ) : (
                    <>
                      <PaperAirplaneIcon className="h-5 w-5 mr-2 transform rotate-90" aria-hidden="true" />
                      Send Message
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function ComposePage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </DashboardLayout>
    }>
      <ComposeContent />
    </Suspense>
  );
}