'use client';

import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import md5 from 'blueimp-md5';
import {
  ArrowLeftIcon,
  ArrowUturnLeftIcon,
  ArchiveBoxIcon,
  TrashIcon,
  EyeIcon,
  LockClosedIcon,
  DocumentTextIcon,
  PaperClipIcon,
  StarIcon,
  ArrowTopRightOnSquareIcon,
  EllipsisHorizontalIcon,
  FolderIcon,
  KeyIcon,
  CodeBracketIcon,
  PrinterIcon,
  FlagIcon,
  NoSymbolIcon
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';

export default function EmailDetail({ message, onBack, onDelete, onReply, onForward }) {
  const [decrypted, setDecrypted] = useState(false);
  const [isStarred, setIsStarred] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showOriginalModal, setShowOriginalModal] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const menuRef = useRef(null);
  const router = useRouter();

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMoreMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const formattedDate = (dateString) => {
    const date = new Date(dateString);
    return format(date, 'EEEE, MMMM d, yyyy · h:mm a');
  };

  // Simulated PGP decryption
  const handleDecrypt = () => {
    // In a real app, this would trigger PGP decryption
    setDecrypted(true);
  };

  const toggleStar = () => {
    setIsStarred(!isStarred);
  };
  
  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this email?')) {
      setIsDeleting(true);
      try {
        // Call the delete function passed from the parent
        if (onDelete) {
          await onDelete(message.id);
        }
      } catch (error) {
        console.error('Error deleting email:', error);
        alert('Failed to delete the email. Please try again.');
        setIsDeleting(false);
      }
    }
  };
  
  const handleReply = () => {
    // Get the body content - prefer text, then strip HTML tags from html
    let bodyContent = message.text || message.body || '';
    if (!bodyContent && message.html) {
      // Strip HTML tags for quote
      bodyContent = message.html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    }

    // Prepare data for reply
    const replyData = {
      replyTo: message.from,
      subject: message.subject,
      date: message.timestamp || message.date,
      originalBody: bodyContent,
    };

    // Call the reply handler passed from parent
    if (onReply) {
      onReply(replyData);
    }
  };
  
  const handleForward = () => {
    // Get the body content - prefer text, then strip HTML tags from html
    let bodyContent = message.text || message.body || '';
    if (!bodyContent && message.html) {
      // Strip HTML tags for quote
      bodyContent = message.html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    }

    // Prepare data for forwarding
    const forwardData = {
      subject: message.subject,
      date: message.timestamp || message.date,
      from: message.from,
      to: message.to,
      originalBody: bodyContent,
      attachments: message.attachments || [],
    };

    // Call the forward handler passed from parent
    if (onForward) {
      onForward(forwardData);
    }
  };

  // Check if message is actually PGP encrypted (not just has encryptedBody flag)
  const isActuallyEncrypted = () => {
    // Check for explicit encryptedBody flag
    if (message.encryptedBody === true) return true;

    // Check message content for PGP markers
    const content = message.text || message.html || '';
    return content.includes('-----BEGIN PGP MESSAGE-----') ||
           content.includes('-----BEGIN PGP SIGNED MESSAGE-----');
  };

  // Handle clicking on email address - open compose instead of mailto
  const handleEmailClick = (e, email) => {
    e.preventDefault();
    // Navigate to compose with pre-filled recipient
    router.push(`/dashboard/compose?to=${encodeURIComponent(email)}`);
  };

  // Generate Gravatar URL from email using MD5 hash
  const getGravatarUrl = (email, size = 80) => {
    if (!email) return null;
    const hash = md5(email.trim().toLowerCase());
    return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=404`;
  };

  // Generate raw email source (like Gmail's "Show original")
  const getRawEmailSource = () => {
    const lines = [];

    // Email headers
    lines.push(`From: ${message.from.name} <${message.from.email}>`);
    lines.push(`To: ${message.to.email}`);
    if (message.cc) lines.push(`Cc: ${message.cc}`);
    if (message.bcc) lines.push(`Bcc: ${message.bcc}`);
    lines.push(`Subject: ${message.subject}`);
    lines.push(`Date: ${new Date(message.timestamp).toUTCString()}`);

    // MIME headers
    lines.push(`MIME-Version: 1.0`);
    lines.push(`Content-Type: ${message.html ? 'text/html' : 'text/plain'}; charset=UTF-8`);
    if (message.messageId) lines.push(`Message-ID: ${message.messageId}`);

    // Security headers
    if (message.encryptedBody) {
      lines.push(`X-KeyKeeper-Encrypted: yes`);
    }

    // Custom headers
    lines.push(`X-Mailer: KeyKeeper.world`);

    // Empty line between headers and body
    lines.push('');

    // Email body
    if (message.html) {
      lines.push(message.html);
    } else if (message.text) {
      lines.push(message.text);
    } else {
      lines.push(message.snippet || '(No content)');
    }

    // Attachments info
    if (message.attachments && message.attachments.length > 0) {
      lines.push('');
      lines.push('------ Attachments ------');
      message.attachments.forEach(att => {
        lines.push(`${att.filename} (${att.contentType}, ${(att.size / 1024).toFixed(1)} KB)`);
      });
    }

    return lines.join('\n');
  };
  
  return (
    <motion.div 
      className="bg-sidebar shadow rounded-lg overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
        <div className="flex items-center">
          <button
            type="button"
            onClick={onBack}
            className="mr-4 inline-flex items-center p-1.5 border border-transparent rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          
          <h2 className="text-xl font-semibold text-white">{message.subject}</h2>
        </div>
        
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={toggleStar}
            className="inline-flex items-center p-2 text-gray-400 hover:text-yellow-400 transition-colors"
          >
            <StarIcon className={`h-5 w-5 ${isStarred ? 'text-yellow-400 fill-yellow-400' : ''}`} />
          </button>
          
          <button
            type="button"
            className="inline-flex items-center p-2 text-gray-400 hover:text-white transition-colors"
          >
            <FolderIcon className="h-5 w-5" />
          </button>
          
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="inline-flex items-center p-2 text-gray-400 hover:text-white transition-colors"
            >
              <EllipsisHorizontalIcon className="h-5 w-5" />
            </button>

            {/* Dropdown menu */}
            <AnimatePresence>
              {showMoreMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-gray-800 border border-gray-700 z-50"
                >
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setShowOriginalModal(true);
                        setShowMoreMenu(false);
                      }}
                      className="w-full flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                    >
                      <CodeBracketIcon className="h-4 w-4 mr-3" />
                      Show original
                    </button>
                    <button
                      onClick={() => {
                        window.print();
                        setShowMoreMenu(false);
                      }}
                      className="w-full flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                    >
                      <PrinterIcon className="h-4 w-4 mr-3" />
                      Print
                    </button>
                    <button
                      onClick={() => {
                        toggleStar();
                        setShowMoreMenu(false);
                      }}
                      className="w-full flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                    >
                      <FlagIcon className="h-4 w-4 mr-3" />
                      {isStarred ? 'Remove star' : 'Add star'}
                    </button>
                    <div className="border-t border-gray-700 my-1"></div>
                    <button
                      onClick={() => {
                        // Mark as spam functionality
                        setShowMoreMenu(false);
                      }}
                      className="w-full flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                    >
                      <NoSymbolIcon className="h-4 w-4 mr-3" />
                      Report spam
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      
      {/* Labels */}
      {message.labels?.length > 0 && (
        <div className="px-6 py-2 border-b border-gray-700 flex flex-wrap gap-1">
          {message.labels.map(label => (
            <span 
              key={label} 
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium 
                ${label === 'important' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' : 
                  label === 'alert' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' :
                  'bg-primary-100 dark:bg-primary-800/40 text-primary-800 dark:text-primary-300'}`}
            >
              {label}
            </span>
          ))}
        </div>
      )}
      
      {/* Sender info */}
      <div className="px-6 py-4 border-b border-gray-700">
        <div className="flex justify-between items-start">
          <div className="flex">
            <div className="h-10 w-10 rounded-full bg-primary-600/30 mr-4 flex items-center justify-center text-base font-medium text-primary-400 uppercase overflow-hidden">
              {!avatarError ? (
                <img
                  src={getGravatarUrl(message.from.email, 80)}
                  alt={message.from.name}
                  className="h-full w-full object-cover"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                message.from.name?.charAt(0) || message.from.email?.charAt(0) || '?'
              )}
            </div>
            <div>
              <div className="flex items-center">
                <p className="text-base font-medium text-white">
                  {message.from.name}
                  {message.encryptedBody && (
                    <LockClosedIcon className="inline ml-1.5 h-4 w-4 text-primary-400" />
                  )}
                </p>
                <button
                  onClick={(e) => handleEmailClick(e, message.from.email)}
                  className="ml-2 text-xs text-gray-400 hover:text-primary-400"
                >
                  &lt;{message.from.email}&gt;
                </button>
              </div>
              <p className="text-sm text-gray-400 mt-1">
                To: {message.to.email}
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-sm text-gray-400">
              {formattedDate(message.timestamp)}
            </p>
          </div>
        </div>
      </div>
      
      {/* Action toolbar */}
      <div className="px-6 py-3 border-b border-gray-700 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleReply}
          className="inline-flex items-center px-3 py-1.5 border border-gray-700 rounded-md text-sm font-medium text-white hover:bg-gray-700 transition-colors"
        >
          <ArrowUturnLeftIcon className="h-4 w-4 mr-1.5" />
          Reply
        </button>
        
        <button
          type="button"
          onClick={handleForward}
          className="inline-flex items-center px-3 py-1.5 border border-gray-700 rounded-md text-sm font-medium text-white hover:bg-gray-700 transition-colors"
        >
          <ArrowTopRightOnSquareIcon className="h-4 w-4 mr-1.5" />
          Forward
        </button>
        
        <div className="flex-grow"></div>
        
        <button
          type="button"
          className="inline-flex items-center px-2 py-1.5 border border-gray-700 rounded-md text-sm font-medium text-white hover:bg-gray-700 transition-colors"
        >
          <ArchiveBoxIcon className="h-4 w-4" />
        </button>
        
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="inline-flex items-center px-2 py-1.5 border border-gray-700 rounded-md text-sm font-medium text-white hover:bg-red-700 transition-colors"
        >
          {isDeleting ? (
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <TrashIcon className="h-4 w-4" />
          )}
        </button>
      </div>
      
      {/* Email body */}
      <div className="px-6 py-6">
        {/* Only show decrypt UI if message is actually PGP encrypted */}
        {isActuallyEncrypted() && !decrypted ? (
          <div className="py-16 flex flex-col items-center justify-center">
            <motion.div
              className="mb-6 bg-primary-600/20 p-6 rounded-full"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, type: "spring" }}
            >
              <LockClosedIcon className="h-12 w-12 text-primary-400" />
            </motion.div>
            <h3 className="text-xl font-semibold text-white mb-3">
              This message is encrypted
            </h3>
            <p className="text-center text-gray-400 mb-6 max-w-md">
              Your message is protected with end-to-end encryption using OpenPGP. Only you can read its contents.
            </p>
            <motion.button
              type="button"
              onClick={handleDecrypt}
              className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-500 transition-colors shadow-md"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <EyeIcon className="h-5 w-5 mr-2" />
              Decrypt Message
            </motion.button>
          </div>
        ) : (
          <div>
            {isActuallyEncrypted() && decrypted && (
              <div className="bg-green-900/20 text-green-300 text-sm p-3 rounded-md mb-6 flex items-center">
                <LockClosedIcon className="h-5 w-5 mr-2 text-green-400" />
                This message was decrypted with your private key
              </div>
            )}

            {/* Email content */}
            <div className="prose dark:prose-invert max-w-none text-gray-300">
              {/* If we have HTML content, render it safely */}
              {message.html ? (
                <div dangerouslySetInnerHTML={{ __html: message.html }} />
              ) : (
                // Otherwise show text content with proper line breaks
                <div>
                  {(message.text || message.snippet || "No content available").split('\n').map((paragraph, idx) => (
                    <p key={idx} className="my-4">{paragraph}</p>
                  ))}
                </div>
              )}
            </div>
            
            {/* Attachments */}
            {message.attachments?.length > 0 && (
              <div className="mt-8 border-t border-gray-700 pt-6">
                <div className="flex items-center text-base font-medium text-white mb-4">
                  <PaperClipIcon className="h-5 w-5 mr-2 text-gray-400" />
                  Attachments ({message.attachments.length})
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {message.attachments.map((attachment, index) => {
                    const isPgpKey = attachment.filename?.endsWith('.asc') || 
                                    attachment.contentType === 'application/pgp-keys';
                    
                    return (
                      <div 
                        key={index}
                        className={`flex items-center p-3 rounded-md border ${
                          isPgpKey 
                            ? 'border-green-700 bg-green-900/20 hover:bg-green-900/30 cursor-pointer' 
                            : 'border-gray-700 bg-dashboard/60 hover:bg-dashboard'
                        } group transition-colors`}
                        onClick={isPgpKey ? () => router.push('/dashboard/contacts') : undefined}
                      >
                        <div className={`mr-3 p-2 rounded-md ${
                          isPgpKey ? 'bg-green-600/20' : 'bg-primary-600/20'
                        }`}>
                          {isPgpKey ? (
                            <KeyIcon className="h-6 w-6 text-green-400" />
                          ) : (
                            <DocumentTextIcon className="h-6 w-6 text-primary-400" />
                          )}
                        </div>
                        <div className="flex-grow min-w-0">
                          <p className={`text-sm font-medium truncate ${
                            isPgpKey ? 'text-green-300' : 'text-white'
                          }`}>
                            {isPgpKey ? 'PGP Public Key' : attachment.filename}
                          </p>
                          <p className={`text-xs ${
                            isPgpKey ? 'text-green-400' : 'text-gray-500'
                          }`}>
                            {isPgpKey 
                              ? `From: ${message.from.email}` 
                              : `${(attachment.size / 1000).toFixed(1)} KB`
                            }
                          </p>
                        </div>
                        {isPgpKey ? (
                          <span className="ml-2 text-xs text-green-400">
                            View Contact →
                          </span>
                        ) : (
                          <button 
                            type="button"
                            className="ml-2 inline-flex items-center p-1.5 rounded-md text-gray-400 hover:text-primary-400 transition-colors"
                          >
                            <ArrowTopRightOnSquareIcon className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Show Original Modal */}
      <AnimatePresence>
        {showOriginalModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
              onClick={() => setShowOriginalModal(false)}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, type: "spring" }}
              className="fixed inset-4 md:inset-10 z-50 bg-gray-900 rounded-xl border border-gray-700 shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
                <div className="flex items-center gap-3">
                  <CodeBracketIcon className="h-6 w-6 text-primary-400" />
                  <div>
                    <h3 className="text-lg font-semibold text-white">Original Message</h3>
                    <p className="text-sm text-gray-400">Raw email source with headers</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowOriginalModal(false)}
                  className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-800"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-auto p-6">
                <div className="bg-gray-950 rounded-lg border border-gray-800 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 bg-gray-800/50 border-b border-gray-700">
                    <span className="text-xs font-mono text-gray-400">Email Source</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(getRawEmailSource());
                        // You could add a toast notification here
                      }}
                      className="text-xs text-primary-400 hover:text-primary-300 font-medium flex items-center gap-1"
                    >
                      <ClipboardDocumentIcon className="h-4 w-4" />
                      Copy to clipboard
                    </button>
                  </div>
                  <pre className="p-4 text-xs font-mono text-gray-300 whitespace-pre-wrap break-all leading-relaxed">
                    {getRawEmailSource()}
                  </pre>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-gray-700 bg-gray-800/30">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    This is the raw source of the email as it would appear in transit through email servers
                  </p>
                  <button
                    onClick={() => setShowOriginalModal(false)}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}