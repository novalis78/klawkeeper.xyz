'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import EmailRow from '../../components/dashboard/EmailRow';
import EmailDetail from '../../components/dashboard/EmailDetail';
import MailCredentialsModal from '../../components/mail/MailCredentialsModal';
import ComposeEmail from '../../components/mail/ComposeEmail';
import { mockMessages } from '../../lib/email/mock-data';
import { getCurrentUserId } from '../../lib/auth/getCurrentUser';
import { getCredentials, getSessionKey } from '../../lib/mail/mailCredentialManager';
import { useAuth } from '../../lib/auth/useAuth';
import { 
  MagnifyingGlassIcon, 
  ArrowPathIcon,
  FunnelIcon,
  EnvelopeIcon,
  InboxIcon,
  TrashIcon,
  StarIcon,
  ArchiveBoxIcon,
  TagIcon,
  KeyIcon
} from '@heroicons/react/24/outline';

export default function Dashboard() {
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentFolder, setCurrentFolder] = useState('inbox');
  const [refreshing, setRefreshing] = useState(false);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [credentialsRequired, setCredentialsRequired] = useState(false);
  const [showComposeEmail, setShowComposeEmail] = useState(false);
  const [composeMode, setComposeMode] = useState('new'); // 'new', 'reply', or 'forward'
  const [composeInitialData, setComposeInitialData] = useState({});
  const { user, getToken } = useAuth();
  
  // Fetch real messages from the inbox
  useEffect(() => {
    fetchInboxMessages();
    // Never show credentials modal - if credentials fail, user should be logged out
    setShowCredentialsModal(false);
  }, []);
  
  const fetchInboxMessages = async (userCredentials = null) => {
    setLoading(true);
    setError(null);
    setCredentialsRequired(false);
    
    try {
      // Get the user ID from the current session
      const userId = getCurrentUserId();
      
      if (!userId) {
        throw new Error('User not logged in. Please sign in to view your inbox.');
      }
      
      // If user credentials were not provided directly, try to get them from storage
      let credentials = userCredentials;
      if (!credentials) {
        try {
          console.log('=== KEYKEEPER: Attempting to retrieve stored mail credentials ===');
          
          // First make sure we have the user email
          const email = user?.email || localStorage.getItem('user_email');
          if (!email) {
            throw new Error('User email not available');
          }
          
          // Generate account ID from email
          const accountId = `account_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
          console.log(`Using account ID: ${accountId}`);
          
          // First try the direct storage method (no encryption)
          const directStorageKey = `kk_mail_${accountId}_direct`;
          const directCredentials = localStorage.getItem(directStorageKey);
          
          if (directCredentials) {
            console.log('Found direct credentials in localStorage!');
            credentials = JSON.parse(directCredentials);
            console.log('=== KEYKEEPER: Successfully retrieved direct mail credentials ===');
            console.log(`Using credentials for: ${credentials.email}`);
            console.log(`Credential timestamp: ${new Date(credentials.timestamp).toISOString()}`);
          } else {
            console.log('No direct credentials found, trying encrypted storage...');
            
            // If no direct credentials, try the encrypted storage
            // First make sure we have the user fingerprint - try multiple sources
            let fingerprint = user?.fingerprint;
            
            // If fingerprint is not in user object, try to get it from localStorage
            if (!fingerprint) {
              console.log('Fingerprint not in user object, checking localStorage...');
              fingerprint = localStorage.getItem('user_fingerprint');
              
              if (fingerprint) {
                console.log(`Found fingerprint in localStorage: ${fingerprint}`);
              } else {
                console.log('Fingerprint not found in localStorage, trying JWT token...');
                
                // Try to extract fingerprint from JWT token
                try {
                  const token = getToken();
                  if (token) {
                    // Parse JWT without verification
                    const base64Url = token.split('.')[1];
                    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                    const payload = JSON.parse(atob(base64));
                    
                    if (payload.fingerprint) {
                      fingerprint = payload.fingerprint;
                      console.log(`Extracted fingerprint from token: ${fingerprint}`);
                      localStorage.setItem('user_fingerprint', fingerprint);
                    }
                  }
                } catch (tokenError) {
                  console.error('Error extracting fingerprint from token:', tokenError);
                }
              }
            }
            
            if (fingerprint) {
              console.log(`Using fingerprint: ${fingerprint}`);
              
              // Get the session key
              const token = getToken();
              console.log('Got auth token, deriving session key...');
              
              const sessionKey = await getSessionKey(token, fingerprint);
              console.log('Session key derived successfully');
              
              // Try to get credentials from secure storage
              credentials = await getCredentials(accountId, sessionKey);
              
              if (credentials) {
                console.log('=== KEYKEEPER: Successfully retrieved encrypted mail credentials ===');
                console.log(`Using credentials for: ${credentials.email}`);
                console.log(`Credential timestamp: ${new Date(credentials.timestamp).toISOString()}`);
              } else {
                console.warn('No encrypted credentials found');
              }
            } else {
              console.error('Failed to retrieve user fingerprint from any source');
            }
          }
          
          if (!credentials) {
            console.warn('No stored credentials found - user may need to enter manually');
          }
        } catch (credError) {
          console.error('=== KEYKEEPER ERROR: Failed to retrieve credentials ===');
          console.error('Error details:', credError);
          console.error('Stack trace:', credError.stack);
          // Continue without credentials, the server will prompt if needed
        }
      } else if (userCredentials) {
        console.log('Using explicitly provided credentials');
      }
      
      console.log('Fetching inbox for user ID:', userId);
      
      // Try to activate mail account if this is the first login
      if (credentials) {
        try {
          console.log('=== KEYKEEPER: Checking if mail account needs activation ===');
          console.log(`=== KEYKEEPER: Credentials has password: ${!!credentials.password} (length: ${credentials.password?.length || 0}) ===`);
          
          // Ensure we have a derived password
          if (!credentials.password) {
            console.error('=== KEYKEEPER ERROR: No derived password available for activation ===');
            
            // Try to derive it if possible
            try {
              console.log('=== KEYKEEPER: Attempting to derive password on the fly ===');
              // Try to access the PGP key object from localStorage (this is set during login)
              const pgpKeyData = localStorage.getItem('pgp_key_data');
              if (pgpKeyData) {
                const keyData = JSON.parse(pgpKeyData);
                
                // If we have a private key available, derive the Dovecot password
                if (keyData.privateKey) {
                  console.log('=== KEYKEEPER: Found private key, deriving password ===');
                  
                  const { getDovecotPassword } = await import('@/lib/mail/mailCredentialManager');
                  
                  const derivedPassword = await getDovecotPassword(
                    credentials.email,
                    keyData.privateKey,
                    '' // No passphrase for now
                  );
                  
                  console.log('=== KEYKEEPER: Successfully derived password on the fly ===');
                  console.log(`Password length: ${derivedPassword.length}, first 5 chars: ${derivedPassword.substring(0, 5)}...`);
                  
                  // Update credentials with the derived password
                  credentials.password = derivedPassword;
                }
              } else {
                console.error('=== KEYKEEPER ERROR: No PGP key data available in localStorage ===');
              }
            } catch (derivationError) {
              console.error('=== KEYKEEPER ERROR: Failed to derive password on the fly ===');
              console.error('Error details:', derivationError);
            }
          }
          
          // Double-check we now have a password
          if (!credentials.password) {
            console.error('=== KEYKEEPER ERROR: Still no password available after derivation attempt ===');
            throw new Error('No password available for mail account activation');
          }
          
          // Call the mail activation API
          console.log('=== KEYKEEPER: Calling mail activation API ===');
          console.log(`Using email: ${credentials.email}`);
          console.log(`Using password length: ${credentials.password.length}, first 5 chars: ${credentials.password.substring(0, 5)}...`);
          
          const activationResponse = await fetch('/api/mail/activate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              derivedPassword: credentials.password,
              email: credentials.email
            }),
          });
          
          const activationData = await activationResponse.json();
          
          if (activationResponse.ok) {
            if (activationData.activated) {
              console.log('=== KEYKEEPER: Successfully activated mail account! ===');
            } else if (activationData.alreadyActive) {
              console.log('=== KEYKEEPER: Mail account already activated ===');
            }
          } else {
            console.error('=== KEYKEEPER ERROR: Failed to activate mail account ===');
            console.error('Error details:', activationData.error);
            console.error('Additional details:', activationData.details);
            
            // If activation failed because of missing derived password, just log it and continue 
            // No need to show the modal since we still want to display the empty inbox
            if (activationData.error === 'Missing derived password' || activationData.error === 'Derived password is required') {
              console.log('=== KEYKEEPER: Activation issue, but continuing without showing modal ===');
              // Just log the error but don't interrupt the flow
            }
          }
        } catch (activationError) {
          console.error('=== KEYKEEPER ERROR: Exception during mail account activation ===');
          console.error('Error details:', activationError);
          console.error('Stack trace:', activationError.stack);
          // Continue despite activation error - it might work anyway
        }
      }
      
      // Add credentials to request if available
      const requestBody = { userId };
      if (credentials) {
        console.log('Including stored credentials in API request');
        // Only include necessary credential fields for security
        requestBody.credentials = {
          email: credentials.email,
          password: credentials.password,
          imapServer: credentials.imapServer,
          imapPort: credentials.imapPort,
          imapSecure: credentials.imapSecure
        };
        // Debug log - mask the password
        const debugCreds = {...requestBody.credentials};
        debugCreds.password = debugCreds.password ? '****' : null;
        console.log('Credential details:', debugCreds);
      } else {
        console.warn('No credentials available for mail request');
      }
      
      // Get the auth token from localStorage
      const authToken = localStorage.getItem('auth_token');
      
      const response = await fetch('/api/mail/inbox', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { 'Authorization': `Bearer ${authToken}` })
        },
        body: JSON.stringify(requestBody),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // Handle 401 Unauthorized - session expired or invalid
        if (response.status === 401) {
          console.error('Session expired or unauthorized - logging out user');
          // Clear stored tokens and credentials
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user_email');
          localStorage.removeItem('user_id');
          localStorage.removeItem('user_fingerprint');
          localStorage.removeItem('user_key_id');
          // Redirect to login page
          window.location.href = '/login?expired=true';
          throw new Error('Session expired - please log in again');
        }

        throw new Error(data.error || 'Failed to fetch inbox');
      }
      
      // Always use the real messages array from the server, even if empty
      if (data.messages) {
        setMessages(data.messages);
        console.log('Loaded real messages:', data.messages.length);
        
        // If inbox is empty, show a more helpful message
        if (data.messages.length === 0) {
          console.log('Inbox is empty. Send an email to see it here!');
        }
      } else {
        console.log('No messages array returned, something went wrong');
        // Always show empty inbox, never use mock data
        console.log('No messages returned, showing empty inbox');
        setMessages([]);
      }
    } catch (err) {
      console.error('Error fetching inbox:', err);
      setError(err.message);
      
      // Just use empty array, never fall back to mock data
      setMessages([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  const handleRefresh = () => {
    setRefreshing(true);
    fetchInboxMessages();
  };
  
  const handleDeleteEmail = async (emailId) => {
    try {
      console.log(`Deleting email with ID: ${emailId}`);
      
      // Get current user email
      const email = user?.email || localStorage.getItem('user_email');
      if (!email) {
        throw new Error('User email not available');
      }
      
      // Get credentials if available
      const accountId = `account_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const directStorageKey = `kk_mail_${accountId}_direct`;
      const directCredentials = localStorage.getItem(directStorageKey);
      
      let credentials = null;
      if (directCredentials) {
        credentials = JSON.parse(directCredentials);
      }
      
      // Call the delete email API
      const response = await fetch('/api/mail/email', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: emailId,
          userEmail: email,
          folder: currentFolder,
          permanent: false,
          credentials: credentials 
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete email');
      }
      
      console.log('Email deleted successfully:', data);
      
      // Remove the email from local state and clear selection
      setMessages(prevMessages => prevMessages.filter(msg => msg.id !== emailId));
      setSelectedEmail(null);
      
      return true;
    } catch (error) {
      console.error('Error deleting email:', error);
      throw error;
    }
  };
  
  // Filter messages by folder and search query
  const filteredMessages = messages.filter(message => {
    // First filter by folder
    let folderMatch = true;
    if (currentFolder === 'starred') {
      folderMatch = message.starred === true;
    } else if (currentFolder === 'archive') {
      folderMatch = message.archived === true;
    } else if (currentFolder === 'inbox') {
      // Inbox shows non-archived messages
      folderMatch = message.archived !== true;
    }

    // Then filter by search query
    const searchMatch = !searchQuery || (
      message.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      message.from?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      message.from?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      message.snippet?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return folderMatch && searchMatch;
  });
  
  // Handle starring an email
  const handleStarEmail = async (emailId, starred) => {
    try {
      // Update local state immediately for responsive UI
      setMessages(prevMessages =>
        prevMessages.map(msg =>
          msg.id === emailId ? { ...msg, starred } : msg
        )
      );

      // Get current user email for API call
      const email = user?.email || localStorage.getItem('user_email');
      if (!email) return;

      // Persist to server
      const response = await fetch('/api/mail/email/star', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: emailId, userEmail: email, starred }),
      });

      if (!response.ok) {
        // Revert on error
        setMessages(prevMessages =>
          prevMessages.map(msg =>
            msg.id === emailId ? { ...msg, starred: !starred } : msg
          )
        );
        console.error('Failed to star email');
      }
    } catch (error) {
      console.error('Error starring email:', error);
    }
  };

  // Handle archiving an email
  const handleArchiveEmail = async (emailId) => {
    try {
      // Update local state immediately for responsive UI
      setMessages(prevMessages =>
        prevMessages.map(msg =>
          msg.id === emailId ? { ...msg, archived: true } : msg
        )
      );

      // Get current user email for API call
      const email = user?.email || localStorage.getItem('user_email');
      if (!email) return;

      // Persist to server
      const response = await fetch('/api/mail/email/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: emailId, userEmail: email, archived: true }),
      });

      if (!response.ok) {
        // Revert on error
        setMessages(prevMessages =>
          prevMessages.map(msg =>
            msg.id === emailId ? { ...msg, archived: false } : msg
          )
        );
        console.error('Failed to archive email');
      }
    } catch (error) {
      console.error('Error archiving email:', error);
    }
  };

  // Handle credentials submission from modal
  const handleCredentialsSubmit = (accountInfo) => {
    console.log('Credentials submitted for account:', accountInfo.email);
    fetchInboxMessages(accountInfo);
  };
  
  // Handle reply to email
  const handleReply = (replyData) => {
    console.log('Replying to email:', replyData);
    
    setComposeInitialData(replyData);
    setComposeMode('reply');
    setShowComposeEmail(true);
  };
  
  // Handle forward email
  const handleForward = (forwardData) => {
    console.log('Forwarding email:', forwardData);
    
    setComposeInitialData(forwardData);
    setComposeMode('forward');
    setShowComposeEmail(true);
  };
  
  // Handle compose close
  const handleComposeClose = () => {
    setShowComposeEmail(false);
    // Reset compose data after a short delay to prevent flashes
    setTimeout(() => {
      setComposeInitialData({});
      setComposeMode('new');
    }, 300);
  };

  return (
    <DashboardLayout onInboxClick={() => setSelectedEmail(null)}>
      {/* Mail Credentials Modal */}
      <MailCredentialsModal
        isOpen={showCredentialsModal}
        onClose={() => setShowCredentialsModal(false)}
        onSuccess={handleCredentialsSubmit}
        email={user?.email}
      />
      
      {/* Email Composer */}
      {showComposeEmail && (
        <ComposeEmail
          onClose={handleComposeClose}
          initialData={composeInitialData}
          mode={composeMode}
        />
      )}
      
      <div>
        {/* Email Toolbar */}
        <div className="bg-sidebar shadow rounded-lg overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-6 border-b border-gray-700">
            {/* Folder Navigation */}
            <div className="col-span-1 md:col-span-2 md:border-r border-gray-700 p-1.5">
              <div className="flex items-center space-x-0.5">
                <button
                  onClick={() => setCurrentFolder('inbox')}
                  className={`px-3 py-1.5 rounded-md text-sm flex items-center ${
                    currentFolder === 'inbox' 
                      ? 'bg-primary-600/20 text-primary-400' 
                      : 'text-gray-300 hover:bg-gray-700/50'
                  }`}
                >
                  <InboxIcon className="h-4 w-4 mr-1.5" />
                  Inbox
                </button>
                
                <button
                  onClick={() => setCurrentFolder('starred')}
                  className={`px-3 py-1.5 rounded-md text-sm flex items-center ${
                    currentFolder === 'starred' 
                      ? 'bg-primary-600/20 text-primary-400' 
                      : 'text-gray-300 hover:bg-gray-700/50'
                  }`}
                >
                  <StarIcon className="h-4 w-4 mr-1.5" />
                  Starred
                </button>
                
                <button
                  onClick={() => setCurrentFolder('archive')}
                  className={`px-3 py-1.5 rounded-md text-sm flex items-center ${
                    currentFolder === 'archive' 
                      ? 'bg-primary-600/20 text-primary-400' 
                      : 'text-gray-300 hover:bg-gray-700/50'
                  }`}
                >
                  <ArchiveBoxIcon className="h-4 w-4 mr-1.5" />
                  Archive
                </button>
              </div>
            </div>
            
            {/* Search and Actions */}
            <div className="col-span-1 md:col-span-4 px-4 py-1.5 flex items-center justify-between">
              {!selectedEmail && (
                <>
                  <div className="flex-grow relative rounded-md shadow-sm max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="block w-full pl-9 pr-3 py-1.5 border border-gray-700 rounded-md leading-5 bg-dashboard placeholder-gray-500 focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm text-white"
                      placeholder="Search in emails"
                    />
                  </div>
                  
                  <div className="flex items-center ml-2">
                    <button 
                      type="button"
                      className="inline-flex items-center p-1.5 rounded-md text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                    >
                      <FunnelIcon className="h-4 w-4" />
                    </button>
                    
                    <button
                      type="button"
                      onClick={handleRefresh}
                      disabled={refreshing}
                      className="ml-1 inline-flex items-center p-1.5 rounded-md text-gray-400 hover:bg-gray-700 hover:text-white transition-colors relative group"
                      title={refreshing ? "Checking for new mail..." : "Refresh inbox"}
                    >
                      {refreshing ? (
                        <div className="relative">
                          <ArrowPathIcon className="h-4 w-4 text-primary-400 animate-spin" />
                          <div className="absolute -inset-1 bg-primary-400/20 rounded-full animate-ping"></div>
                        </div>
                      ) : (
                        <ArrowPathIcon className="h-4 w-4" />
                      )}
                    </button>
                    {refreshing && (
                      <span className="ml-2 text-xs text-primary-400 animate-pulse font-mono">
                        <span className="inline-block animate-pulse">▌</span>
                        <span className="inline-block animate-pulse delay-75">▌</span>
                        <span className="inline-block animate-pulse delay-150">▌</span>
                      </span>
                    )}
                  </div>
                </>
              )}
              
              {selectedEmail && (
                <div className="flex items-center">
                  <h3 className="text-base font-medium text-white">
                    Message Details
                  </h3>
                </div>
              )}
            </div>
          </div>
          
          <div>
            {selectedEmail ? (
              <EmailDetail 
                message={selectedEmail} 
                onBack={() => setSelectedEmail(null)} 
                onDelete={handleDeleteEmail}
                onReply={handleReply}
                onForward={handleForward}
              />
            ) : loading ? (
              <div className="py-20 flex flex-col items-center justify-center text-center px-4">
                <div className="mb-4 bg-primary-600/20 p-4 rounded-full animate-pulse">
                  <EnvelopeIcon className="h-8 w-8 text-primary-400 animate-bounce" />
                </div>
                <h3 className="mt-2 text-lg font-medium text-white">Loading your inbox...</h3>
                <p className="mt-1 text-sm text-gray-400 max-w-md">
                  Please wait while we securely connect to your mailbox.
                </p>
              </div>
            ) : error ? (
              <div className="py-20 flex flex-col items-center justify-center text-center px-4">
                {credentialsRequired ? (
                  <>
                    <div className="mb-4 bg-yellow-600/20 p-4 rounded-full">
                      <KeyIcon className="h-8 w-8 text-yellow-400" />
                    </div>
                    <h3 className="mt-2 text-lg font-medium text-white">Mail Credentials Required</h3>
                    <p className="mt-1 text-sm text-gray-400 max-w-md">
                      Please enter your mail password to access your emails. Your password is never stored on our servers.
                    </p>
                    <div className="mt-6">
                      <button
                        type="button"
                        onClick={() => window.location.href = '/logout'}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-500 transition-colors"
                      >
                        <KeyIcon className="h-4 w-4 mr-2" />
                        Sign Out and Try Again
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mb-4 bg-primary-600/20 p-4 rounded-full">
                      <ArrowPathIcon className="h-8 w-8 text-primary-400 animate-spin" />
                    </div>
                    <h3 className="mt-2 text-lg font-medium text-white">Setting up your mailbox</h3>
                    <p className="mt-1 text-sm text-gray-400 max-w-md">
                      This may take a moment. If this persists, try refreshing the page.
                    </p>
                    <div className="mt-6">
                      <button
                        type="button"
                        onClick={fetchInboxMessages}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-500 transition-colors"
                      >
                        <ArrowPathIcon className="h-4 w-4 mr-2" />
                        Refresh
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : filteredMessages.length > 0 ? (
              <div>
                {filteredMessages.map(message => (
                  <EmailRow
                    key={message.id}
                    message={message}
                    onClick={() => setSelectedEmail(message)}
                    isSelected={false}
                    onStar={handleStarEmail}
                  />
                ))}
              </div>
            ) : (
              <div className="py-20 flex flex-col items-center justify-center text-center px-4">
                <div className="mb-4 bg-primary-600/20 p-4 rounded-full">
                  <EnvelopeIcon className="h-8 w-8 text-primary-400" />
                </div>
                {searchQuery ? (
                  <>
                    <h3 className="mt-2 text-lg font-medium text-white">No emails found</h3>
                    <p className="mt-1 text-sm text-gray-400 max-w-md">
                      No messages match your search criteria. Try adjusting your search terms or clear the search.
                    </p>
                    <div className="mt-6">
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-500 transition-colors"
                      >
                        Clear search
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="mt-2 text-lg font-medium text-white">Your inbox is empty</h3>
                    <p className="mt-1 text-sm text-gray-400 max-w-md">
                      You have no messages in this folder. Messages you receive will appear here.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}