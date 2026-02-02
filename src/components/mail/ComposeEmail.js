'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  XMarkIcon,
  PaperClipIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  LockClosedIcon,
  LockOpenIcon,
  MinusIcon,
  PlusIcon,
  KeyIcon,
  CloudArrowUpIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
// Email sending is handled through API routes
import { getCurrentUserEmail } from '@/lib/auth/getCurrentUser';

export default function ComposeEmail({
  onClose,
  initialData = {},
  mode = 'new', // new, reply, forward
  draftId: initialDraftId = null,
  onDraftSaved = null // callback when draft is saved
}) {
  const [minimized, setMinimized] = useState(false);
  const [isPgpEncrypted, setIsPgpEncrypted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sendingStage, setSendingStage] = useState(null); // null, 'encrypting', 'sending', 'sent'
  const [error, setError] = useState(null);
  const [userPublicKey, setUserPublicKey] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [formData, setFormData] = useState({
    // Handle to field: if it's an object with email, extract email; if string use as-is; otherwise empty
    to: typeof initialData.to === 'string' ? initialData.to : (initialData.to?.email || ''),
    cc: initialData.cc || '',
    bcc: initialData.bcc || '',
    subject: initialData.subject || '',
    body: initialData.body || '',
    attachments: initialData.attachments || []
  });
  const [showCc, setShowCc] = useState(!!initialData.cc);
  const [showBcc, setShowBcc] = useState(!!initialData.bcc);
  const attachmentInputRef = useRef(null);

  // Draft auto-save state
  const [draftId, setDraftId] = useState(initialDraftId);
  const [draftStatus, setDraftStatus] = useState(null); // null, 'saving', 'saved', 'error'
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const saveTimerRef = useRef(null);
  const lastSavedDataRef = useRef(null);
  
  // Initialize based on mode
  useEffect(() => {
    if (mode === 'reply' && initialData.replyTo) {
      setFormData({
        ...formData,
        to: initialData.replyTo.email,
        subject: initialData.subject.startsWith('Re:') 
          ? initialData.subject 
          : `Re: ${initialData.subject}`,
        body: `\n\n---\nOn ${new Date(initialData.date).toLocaleString()}, ${initialData.replyTo.name || initialData.replyTo.email} wrote:\n\n${initialData.originalBody || ''}`,
      });
    } else if (mode === 'forward' && initialData.originalBody) {
      // Format the To field for the forwarded message header
      let toStr = '';
      if (Array.isArray(initialData.to)) {
        toStr = initialData.to.map(r => `${r.name || r.email} <${r.email}>`).join(', ');
      } else if (initialData.to?.email) {
        toStr = `${initialData.to.name || initialData.to.email} <${initialData.to.email}>`;
      }

      setFormData({
        ...formData,
        to: '', // Clear to field - user enters new recipient
        subject: initialData.subject.startsWith('Fwd:')
          ? initialData.subject
          : `Fwd: ${initialData.subject}`,
        body: `\n\n---\n---------- Forwarded message ---------\nFrom: ${initialData.from?.name || initialData.from?.email || ''} <${initialData.from?.email || ''}>\nDate: ${new Date(initialData.date).toLocaleString()}\nSubject: ${initialData.subject}\nTo: ${toStr}\n\n${initialData.originalBody}`,
        attachments: initialData.attachments || []
      });
    }
  }, [mode, initialData]);
  
  // Fetch the user's email and public key
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
          console.warn('No auth token available for fetching user data');
          return;
        }
        
        // Get user email
        const email = localStorage.getItem('userEmail');
        if (email) {
          console.log('Using email from localStorage:', email);
          setUserEmail(email);
        } else {
          // Try to get email using getCurrentUserEmail
          const currentEmail = getCurrentUserEmail();
          if (currentEmail) {
            console.log('Using email from getCurrentUserEmail:', currentEmail);
            setUserEmail(currentEmail);
          } else {
            console.warn('No user email found in localStorage or getCurrentUserEmail');
          }
        }
        
        // Try to fetch public key from API
        const response = await fetch('/api/user/public-key', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.publicKey) {
            console.log('Successfully fetched public key for attachment');
            setUserPublicKey(data.publicKey);
            localStorage.setItem('user_public_key', data.publicKey);
          }
        } else {
          // If API fails, try to get from localStorage
          const storedKey = localStorage.getItem('user_public_key');
          if (storedKey) {
            console.log('Using public key from localStorage');
            setUserPublicKey(storedKey);
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        
        // Try localStorage as fallback
        const storedKey = localStorage.getItem('user_public_key');
        if (storedKey) {
          console.log('Using public key from localStorage after API error');
          setUserPublicKey(storedKey);
        }
      }
    };
    
    fetchUserData();
  }, []);

  // Save draft function
  const saveDraft = useCallback(async (forceNew = false) => {
    // Don't save if there's no content
    const hasContent = formData.to || formData.subject || formData.body;
    if (!hasContent) return;

    // Check if data has actually changed since last save
    const currentData = JSON.stringify({
      to: formData.to,
      cc: formData.cc,
      bcc: formData.bcc,
      subject: formData.subject,
      body: formData.body
    });
    if (!forceNew && currentData === lastSavedDataRef.current) {
      return;
    }

    setDraftStatus('saving');
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/drafts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id: forceNew ? null : draftId,
          to: formData.to,
          cc: formData.cc,
          bcc: formData.bcc,
          subject: formData.subject,
          body: formData.body,
          attachments: formData.attachments.map(a => ({
            name: a.name,
            size: a.size,
            type: a.type
          }))
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save draft');
      }

      if (result.id && !draftId) {
        setDraftId(result.id);
      }

      lastSavedDataRef.current = currentData;
      setLastSavedAt(new Date());
      setDraftStatus('saved');
      setHasUnsavedChanges(false);

      // Notify parent if callback provided
      if (onDraftSaved) {
        onDraftSaved(result.id || draftId);
      }

      // Reset status after a moment
      setTimeout(() => {
        setDraftStatus(null);
      }, 2000);

    } catch (err) {
      console.error('Error saving draft:', err);
      setDraftStatus('error');
      setTimeout(() => {
        setDraftStatus(null);
      }, 3000);
    }
  }, [formData, draftId, onDraftSaved]);

  // Delete draft function
  const deleteDraft = useCallback(async (id) => {
    if (!id) return;
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      await fetch(`/api/drafts/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('[Drafts] Deleted draft after send:', id);
    } catch (err) {
      console.error('Error deleting draft:', err);
    }
  }, []);

  // Auto-save on changes with debounce
  useEffect(() => {
    // Only auto-save for new/draft emails, not replies or forwards (unless they've been edited significantly)
    if (mode !== 'new' && !draftId) return;

    // Clear existing timer
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    // Set unsaved changes flag
    const hasContent = formData.to || formData.subject || formData.body;
    if (hasContent) {
      setHasUnsavedChanges(true);
    }

    // Schedule save after 5 seconds of no changes
    saveTimerRef.current = setTimeout(() => {
      saveDraft();
    }, 5000);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [formData.to, formData.cc, formData.bcc, formData.subject, formData.body, mode, draftId, saveDraft]);

  // Cleanup on unmount - save if there are unsaved changes
  useEffect(() => {
    return () => {
      if (hasUnsavedChanges && saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        // Note: Can't do async in cleanup, draft will save on next open
      }
    };
  }, [hasUnsavedChanges]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  // Handle file attachment
  const handleAttachment = (e) => {
    const files = Array.from(e.target.files);
    
    // Create attachment objects
    const newAttachments = files.map(file => ({
      id: `temp-${Math.random().toString(36).substring(7)}`,
      name: file.name,
      size: file.size,
      type: file.type,
      file // Keep the File object for later upload
    }));
    
    setFormData({
      ...formData,
      attachments: [...formData.attachments, ...newAttachments]
    });
    
    // Reset the file input
    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = '';
    }
  };
  
  // Remove an attachment
  const handleRemoveAttachment = (attachmentId) => {
    setFormData({
      ...formData,
      attachments: formData.attachments.filter(att => att.id !== attachmentId)
    });
  };
  
  // Send the email
  const handleSend = async () => {
    setIsLoading(true);
    setSendingStage('encrypting');
    setError(null);

    try {
      // Basic validation
      if (!formData.to) {
        throw new Error('Please specify at least one recipient');
      }

      // Simulate encryption stage (brief pause for animation)
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Split recipient strings into arrays
      const toArray = formData.to.split(',').map(email => ({
        email: email.trim(),
        name: '' // In a real app, we'd extract names from "Name <email>" format
      }));
      
      const ccArray = formData.cc
        ? formData.cc.split(',').map(email => ({
            email: email.trim(),
            name: ''
          }))
        : [];
        
      const bccArray = formData.bcc
        ? formData.bcc.split(',').map(email => ({
            email: email.trim(),
            name: ''
          }))
        : [];
      
      // Create attachments list including public key
      const allAttachments = [...formData.attachments];
      
      // Add public key attachment if available
      if (userPublicKey) {
        console.log('Attaching public PGP key to email');
        allAttachments.push({
          id: 'public-key-attachment',
          name: 'public_key.asc',
          content: userPublicKey,
          contentType: 'application/pgp-keys',
          size: userPublicKey.length
        });
      } else {
        console.log('No public key available to attach');
      }
      
      // Try to get mail credentials from localStorage
      console.log('=== LOOKING FOR MAIL CREDENTIALS ===');
      let mailPassword = null;
      try {
        const accountId = `account_${userEmail?.replace(/[@.]/g, '_') || 'unknown'}`;
        console.log('Looking for credentials with ID:', accountId);
        
        const storedCreds = localStorage.getItem(accountId);
        if (storedCreds) {
          try {
            const parsedCreds = JSON.parse(storedCreds);
            mailPassword = parsedCreds.password;
            console.log('Found credentials for account:', userEmail);
          } catch (e) {
            console.error('Failed to parse stored credentials:', e);
          }
        }
      } catch (e) {
        console.error('Error accessing localStorage credentials:', e);
      }
      
      // Create email data
      const emailData = {
        from: {
          email: userEmail || localStorage.getItem('userEmail') || 'no-reply@keykeeper.world',
          name: localStorage.getItem('user_name') || localStorage.getItem('user_email')?.split('@')[0] || 'KeyKeeper User'
        },
        to: toArray,
        cc: ccArray,
        bcc: bccArray,
        subject: formData.subject,
        body: formData.body,
        attachments: allAttachments,
        pgpEncrypted: isPgpEncrypted,
        // Add credentials for the mail server
        credentials: mailPassword ? {
          user: userEmail || localStorage.getItem('userEmail'),
          password: mailPassword
        } : undefined
      };
      
      // Handle file attachments by converting them to base64
      if (formData.attachments && formData.attachments.length > 0) {
        for (let i = 0; i < formData.attachments.length; i++) {
          const attachment = formData.attachments[i];
          if (attachment.file) {
            // We need to handle file conversion on the client side
            // For now, we'll just log that we can't send attachments
            console.warn('File attachments not supported in this demo');
            // In a full implementation, we'd convert the file to base64 here
          }
        }
      }
      
      // Get auth token from localStorage
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
      }
      
      // First check authentication status
      console.log('Checking authentication status before sending email...');
      const authCheckResponse = await fetch('/api/diagnostics/auth-status', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (authCheckResponse.ok) {
        const authStatus = await authCheckResponse.json();
        console.log('Authentication status:', authStatus);
        
        if (authStatus.status !== 'authenticated') {
          throw new Error(`Authentication check failed: ${authStatus.status}`);
        }
      } else {
        console.warn('Auth status check failed:', authCheckResponse.status);
      }
      
      // Move to sending stage
      setSendingStage('sending');

      // Send the email using the API instead of the direct function
      const response = await fetch('/api/mail/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(emailData),
      });
      
      // Handle non-200 responses before parsing JSON
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          console.error(`Authentication error (${response.status}) when sending email`);
          
          try {
            // Try to read the response text - this will work even if it's HTML
            const text = await response.text();
            console.error('Error response:', text.substring(0, 500) + '...');
            
            // Check if response is HTML (indicates a server error page)
            if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
              throw new Error('Server returned an HTML error page instead of JSON. This usually indicates a server-side issue.');
            }
            
            // Try to parse as JSON if it might be JSON
            try {
              const errorData = JSON.parse(text);
              throw new Error(errorData.error || 'Authentication error. Please log in again.');
            } catch (parseError) {
              // Not valid JSON
              throw new Error('Authentication error. Please log in again.');
            }
          } catch (readError) {
            throw new Error('Authentication error. Please log in again.');
          }
        }
        
        // For other error status codes, try to get error details from the response
        try {
          // Try to read the response text first
          const text = await response.text();
          console.error('Error response for status', response.status, ':', text.substring(0, 500) + '...');
          
          // Check if response is HTML
          if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
            throw new Error('Server returned an HTML error page instead of JSON. This usually indicates a server-side issue.');
          }
          
          // Try to parse as JSON
          try {
            const errorData = JSON.parse(text);
            throw new Error(errorData.error || `Failed to send email: ${response.statusText}`);
          } catch (parseError) {
            throw new Error(`Failed to send email: ${response.statusText}`);
          }
        } catch (error) {
          // If we can't read the response at all
          throw new Error(`Failed to send email: ${response.statusText}`);
        }
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to send email');
      }


      console.log('Email sent successfully:', result);

      // Delete draft if we had one
      if (draftId) {
        await deleteDraft(draftId);
      }

      // Show success state briefly
      setSendingStage('sent');
      await new Promise(resolve => setTimeout(resolve, 800));

      // Close the composer on success
      onClose();
    } catch (err) {
      console.error('Error sending email:', err);
      
      // Handle specific error types
      if (err.message.includes('Authentication') || err.message.includes('token')) {
        setError('Authentication error. Please log in again to continue.');
      } else {
        setError(err.message || 'Failed to send email. Please try again.');
      }
    } finally {
      setIsLoading(false);
      if (sendingStage !== 'sent') {
        setSendingStage(null);
      }
    }
  };
  
  // Get title based on mode
  const getTitle = () => {
    switch(mode) {
      case 'reply': return 'Reply';
      case 'forward': return 'Forward';
      default: return 'New Message';
    }
  };
  
  // Render minimized view
  if (minimized) {
    return (
      <div className="fixed bottom-0 right-6 w-80 bg-white dark:bg-gray-800 rounded-t-lg border border-gray-300 dark:border-gray-700 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1),0_-10px_15px_-3px_rgba(0,0,0,0.1)]">
        <div className="p-3 flex items-center justify-between bg-gray-100 dark:bg-gray-900 cursor-pointer rounded-t-lg" onClick={() => setMinimized(false)}>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {formData.subject || getTitle()}
          </h3>
          <div className="flex space-x-2">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setMinimized(false);
              }}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <ChevronUpIcon className="h-5 w-5" />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="fixed bottom-0 right-6 w-[36rem] bg-white dark:bg-gray-800 rounded-t-lg border border-gray-300 dark:border-gray-700 z-50 flex flex-col max-h-[calc(100vh-6rem)] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1),0_-10px_15px_-3px_rgba(0,0,0,0.1),0_-20px_25px_-5px_rgba(0,0,0,0.1)]">
      {/* Header */}
      <div className="p-3 flex items-center justify-between bg-gray-100 dark:bg-gray-900 rounded-t-lg">
        <div className="flex items-center space-x-2">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            {getTitle()}
          </h3>
          {/* Draft status indicator */}
          {draftStatus === 'saving' && (
            <span className="flex items-center text-xs text-gray-400">
              <CloudArrowUpIcon className="h-3.5 w-3.5 mr-1 animate-pulse" />
              Saving...
            </span>
          )}
          {draftStatus === 'saved' && (
            <span className="flex items-center text-xs text-green-500">
              <CheckCircleIcon className="h-3.5 w-3.5 mr-1" />
              Saved
            </span>
          )}
          {draftStatus === 'error' && (
            <span className="text-xs text-red-400">
              Save failed
            </span>
          )}
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setMinimized(true)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            <MinusIcon className="h-5 w-5" />
          </button>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      {/* Form content */}
      <div className="p-4 flex-1 overflow-y-auto">
        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/20 p-3 rounded-md text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}
        
        {/* Recipients */}
        <div className="mb-2">
          <div className="flex items-center py-2.5 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all group shadow-sm hover:shadow">
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 w-16 pr-3 flex-shrink-0">To</label>
            <input
              type="text"
              name="to"
              value={formData.to}
              onChange={handleChange}
              className="block w-full border-0 p-0 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-0 sm:text-sm bg-transparent focus:outline-none"
              placeholder="Recipients"
            />
            <button
              type="button"
              onClick={() => {
                setShowCc(!showCc);
                setShowBcc(!showCc);
              }}
              className="ml-3 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors whitespace-nowrap opacity-0 group-hover:opacity-100"
            >
              Cc/Bcc
            </button>
          </div>
        </div>
        
        {showCc && (
          <div className="mb-2">
            <div className="flex items-center py-2.5 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all shadow-sm hover:shadow">
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 w-16 pr-3 flex-shrink-0">Cc</label>
              <input
                type="text"
                name="cc"
                value={formData.cc}
                onChange={handleChange}
                className="block w-full border-0 p-0 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-0 sm:text-sm bg-transparent focus:outline-none"
                placeholder="Carbon copy recipients"
              />
            </div>
          </div>
        )}
        
        {showBcc && (
          <div className="mb-2">
            <div className="flex items-center py-2.5 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all shadow-sm hover:shadow">
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 w-16 pr-3 flex-shrink-0">Bcc</label>
              <input
                type="text"
                name="bcc"
                value={formData.bcc}
                onChange={handleChange}
                className="block w-full border-0 p-0 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-0 sm:text-sm bg-transparent focus:outline-none"
                placeholder="Blind carbon copy recipients"
              />
            </div>
          </div>
        )}
        
        {/* Subject */}
        <div className="mb-4">
          <div className="flex items-center py-2.5 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all shadow-sm hover:shadow">
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 w-16 pr-3 flex-shrink-0">Subject</label>
            <input
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              className="block w-full border-0 p-0 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-0 sm:text-sm bg-transparent truncate focus:outline-none"
              placeholder="Subject"
              style={{ textOverflow: 'ellipsis' }}
            />
          </div>
        </div>
        
        {/* Body */}
        <div className="mb-3">
          <div className="py-2.5 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all shadow-sm hover:shadow">
            <textarea
              name="body"
              rows={12}
              value={formData.body}
              onChange={handleChange}
              className="block w-full border-0 py-0 px-0 resize-none text-gray-900 dark:text-white placeholder-gray-400 focus:ring-0 sm:text-sm bg-transparent focus:outline-none leading-relaxed"
              placeholder="Write your message here..."
              style={{ border: 'none', boxShadow: 'none' }}
            />
          </div>
        </div>
        
        {/* Attachments */}
        {formData.attachments.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center mb-2">
              <PaperClipIcon className="h-5 w-5 text-gray-400 mr-2" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Attachments
              </span>
            </div>
            <div className="space-y-2">
              {formData.attachments.map((attachment) => (
                <div 
                  key={attachment.id}
                  className="flex items-center justify-between rounded-md bg-gray-50 dark:bg-gray-700 p-2"
                >
                  <div className="flex items-center space-x-2">
                    <PaperClipIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-900 dark:text-white truncate max-w-xs">
                      {attachment.name}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {(attachment.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveAttachment(attachment.id)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Security info */}
        <div className="mt-4 rounded-md bg-gray-50 dark:bg-gray-700 p-3 shadow-sm">
          <div className="flex items-center">
            {isPgpEncrypted ? (
              <LockClosedIcon className="h-5 w-5 text-green-500 mr-2" />
            ) : (
              <LockOpenIcon className="h-5 w-5 text-yellow-500 mr-2" />
            )}
            <div className="text-sm">
              <span className="font-medium text-gray-900 dark:text-white">
                {isPgpEncrypted ? 'End-to-end encrypted' : 'Not encrypted'}
              </span>
              <p className="text-gray-500 dark:text-gray-400">
                {isPgpEncrypted
                  ? 'This message will be encrypted with the recipient\'s public key.'
                  : 'No public key found for some recipients. Message will be sent unencrypted.'}
              </p>
              
              {userPublicKey && (
                <div className="flex items-center mt-2 text-primary-600 dark:text-primary-400">
                  <KeyIcon className="h-4 w-4 mr-1.5" />
                  <span className="text-xs font-medium">Your public key will be attached automatically</span>
                </div>
              )}
            </div>
            <button
              onClick={() => setIsPgpEncrypted(!isPgpEncrypted)}
              className="ml-auto text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 text-sm font-medium"
            >
              {isPgpEncrypted ? 'Disable' : 'Enable'} encryption
            </button>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="p-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={() => attachmentInputRef.current?.click()}
            className="inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm hover:shadow"
          >
            <PaperClipIcon className="h-4 w-4 mr-1.5" />
            Attach
          </button>
          <input
            type="file"
            ref={attachmentInputRef}
            onChange={handleAttachment}
            className="hidden"
            multiple
          />
        </div>
        
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm hover:shadow"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={isLoading}
            className={`inline-flex items-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white shadow-md transition-all ${
              isLoading
                ? sendingStage === 'sent'
                  ? 'bg-green-600 cursor-default'
                  : 'bg-primary-400 dark:bg-primary-500 cursor-not-allowed opacity-75'
                : 'bg-primary-600 hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-600 hover:shadow-lg'
            }`}
          >
            {sendingStage === 'encrypting' ? (
              <>
                <span className="mr-2 text-base animate-pulse">🔐</span>
                <span className="animate-pulse">Encrypting...</span>
              </>
            ) : sendingStage === 'sending' ? (
              <>
                <span className="mr-2 text-base animate-bounce">📤</span>
                <span>Sending...</span>
              </>
            ) : sendingStage === 'sent' ? (
              <>
                <span className="mr-2 text-base animate-bounce">✓</span>
                <span>Sent!</span>
              </>
            ) : (
              'Send'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}