'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  ArchiveBoxIcon,
  TrashIcon,
  EyeIcon,
  ShieldCheckIcon,
  PaperClipIcon,
  EnvelopeIcon,
  PencilSquareIcon,
  LockClosedIcon,
  TagIcon,
  StarIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { motion } from 'framer-motion';
// Email operations are handled through API routes

export default function EmailDetail({ emailId, onClose, onReply, onForward }) {
  const [email, setEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showLabels, setShowLabels] = useState(false);
  
  // Fetch email on mount and when emailId changes
  useEffect(() => {
    async function loadEmail() {
      if (!emailId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const fetchedEmail = await fetchEmail(emailId);
        setEmail(fetchedEmail);
      } catch (err) {
        console.error('Error fetching email:', err);
        setError('Failed to load email. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    
    loadEmail();
  }, [emailId]);
  
  // Handle toggling star status
  const handleToggleStar = async () => {
    if (!email) return;
    
    try {
      // Optimistic update
      setEmail({ ...email, isStarred: !email.isStarred });
      
      // Update on server
      await updateEmail(emailId, { isStarred: !email.isStarred });
    } catch (err) {
      console.error('Error updating star status:', err);
      
      // Revert changes if error
      setEmail({ ...email, isStarred: email.isStarred });
    }
  };
  
  // Handle moving email to trash
  const handleMoveToTrash = async () => {
    if (!email) return;
    
    try {
      await deleteEmail(emailId);
      onClose(); // Close detail view after deleting
    } catch (err) {
      console.error('Error moving email to trash:', err);
    }
  };
  
  // Handle archiving email
  const handleArchive = async () => {
    if (!email) return;
    
    try {
      await updateEmail(emailId, { folder: 'archive' });
      onClose(); // Close detail view after archiving
    } catch (err) {
      console.error('Error archiving email:', err);
    }
  };
  
  // Format recipient list for display
  const formatRecipients = (recipients) => {
    if (!recipients || recipients.length === 0) return '';
    
    return recipients.map(r => r.name || r.email).join(', ');
  };
  
  // Render email attachments
  const renderAttachments = () => {
    if (!email?.attachments || email.attachments.length === 0) return null;
    
    return (
      <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white flex items-center">
          <PaperClipIcon className="h-5 w-5 mr-2 text-gray-400" />
          Attachments ({email.attachments.length})
        </h3>
        <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {email.attachments.map((attachment) => (
            <li 
              key={attachment.id}
              className="col-span-1 bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 flex items-center p-3"
            >
              <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 bg-primary-100 dark:bg-primary-900 rounded-md">
                <PaperClipIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="ml-3 overflow-hidden">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {attachment.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {(attachment.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <div className="ml-auto">
                <button className="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 text-xs font-medium">
                  Download
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  };
  
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-white dark:bg-gray-900 p-6">
        <div className="animate-pulse flex flex-col items-center">
          <div className="rounded-full bg-primary-200 dark:bg-primary-900 h-12 w-12 flex items-center justify-center mb-3">
            <EnvelopeIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div className="text-gray-500 dark:text-gray-400">Loading email...</div>
        </div>
      </div>
    );
  }
  
  if (error || !email) {
    return (
      <div className="h-full flex items-center justify-center bg-white dark:bg-gray-900 p-6">
        <div className="text-center">
          <div className="text-red-500 mb-2">
            {error || 'Email not found'}
          </div>
          <button 
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            onClick={onClose}
          >
            Back to inbox
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col bg-white dark:bg-gray-900"
    >
      {/* Email header */}
      <div className="border-b border-gray-200 dark:border-gray-700 py-4 px-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              title="Back to inbox"
            >
              <ArrowUturnLeftIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
            <button
              onClick={handleArchive}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              title="Archive"
            >
              <ArchiveBoxIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
            <button
              onClick={handleMoveToTrash}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              title="Delete"
            >
              <TrashIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
            <button
              onClick={handleToggleStar}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              title={email.isStarred ? "Unstar" : "Star"}
            >
              {email.isStarred ? (
                <StarSolidIcon className="h-5 w-5 text-yellow-400 dark:text-yellow-300" />
              ) : (
                <StarIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              )}
            </button>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => onReply(email)}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              title="Reply"
            >
              <ArrowUturnLeftIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
            <button
              onClick={() => onForward(email)}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              title="Forward"
            >
              <ArrowUturnRightIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
            <div className="relative">
              <button
                onClick={() => setShowLabels(!showLabels)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                title="Labels"
              >
                <TagIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
              
              {showLabels && (
                <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-10">
                  <div className="py-1">
                    {['important', 'work', 'personal', 'bills', 'travel', 'updates'].map((label) => (
                      <div key={label} className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <input
                          type="checkbox"
                          className="mr-2 h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                          checked={email.labels?.includes(label)}
                          onChange={() => {}}
                        />
                        <span className="capitalize">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
          {email.subject}
        </h1>
        
        <div className="mt-2 flex items-center space-x-2">
          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
            <span className="text-primary-600 dark:text-primary-400 font-medium">
              {(email.from.name || email.from.email).charAt(0).toUpperCase()}
            </span>
          </div>
          
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {email.from.name || email.from.email}
              {email.from.name && (
                <span className="ml-1 text-gray-500 dark:text-gray-400 font-normal">
                  ({email.from.email})
                </span>
              )}
            </p>
            
            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center flex-wrap">
              <span className="mr-1">to {formatRecipients(email.to)}</span>
              {email.cc?.length > 0 && (
                <span>cc {formatRecipients(email.cc)}</span>
              )}
            </div>
          </div>
          
          <div className="flex-shrink-0 flex items-center">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {format(new Date(email.date), 'MMM d, yyyy h:mm a')}
            </span>
            {/* Encryption status icon */}
            <LockClosedIcon className="ml-2 h-4 w-4 text-green-500" title="End-to-end encrypted" />
          </div>
        </div>
        
        {/* Labels display */}
        {email.labels?.length > 0 && (
          <div className="mt-2 flex flex-wrap">
            {email.labels.map((label) => (
              <span 
                key={label}
                className="mr-2 mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-300"
              >
                <TagIcon className="h-3 w-3 mr-1" />
                {label}
              </span>
            ))}
          </div>
        )}
      </div>
      
      {/* Email body */}
      <div className="flex-1 overflow-auto p-6">
        <div 
          className="prose prose-sm dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: email.body }}
        />
        
        {renderAttachments()}
        
        {/* Public key attachment banner */}
        <div className="mt-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <ShieldCheckIcon className="h-5 w-5 text-green-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800 dark:text-green-300">
                End-to-end encryption available
              </h3>
              <div className="mt-2 text-sm text-green-700 dark:text-green-400">
                <p>
                  This message was sent with the sender's public PGP key attached. 
                  You can use it to send encrypted messages back to them.
                </p>
              </div>
              <div className="mt-3">
                <div className="-mx-2 -my-1.5 flex">
                  <button
                    type="button"
                    className="px-2 py-1.5 rounded-md text-sm font-medium text-green-800 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30"
                  >
                    View public key
                  </button>
                  <button
                    type="button"
                    className="ml-3 px-2 py-1.5 rounded-md text-sm font-medium text-green-800 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30"
                  >
                    Import to keychain
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Quick reply area */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
              <span className="text-primary-600 dark:text-primary-400 font-medium">Y</span>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:border-primary-500 dark:hover:border-primary-500 transition-colors">
              <div className="p-3 cursor-text" onClick={() => onReply(email)}>
                <div className="text-gray-500 dark:text-gray-400">
                  Click here to reply...
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}