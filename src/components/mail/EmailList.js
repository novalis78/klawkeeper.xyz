'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  StarIcon, 
  InboxIcon, 
  PaperClipIcon,
  ShieldCheckIcon,
  ArchiveBoxIcon,
  TrashIcon,
  EnvelopeIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { motion } from 'framer-motion';
// Email operations are handled through API routes

export default function EmailList({ onSelectEmail, folder = 'inbox' }) {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEmailId, setSelectedEmailId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Fetch emails on mount and when folder changes
  useEffect(() => {
    async function loadEmails() {
      setLoading(true);
      setError(null);
      
      try {
        const options = searchQuery ? { search: searchQuery } : {};
        const fetchedEmails = await fetchEmails('user@phoneshield.ai', folder, options);
        setEmails(fetchedEmails);
      } catch (err) {
        console.error('Error fetching emails:', err);
        setError('Failed to load emails. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    
    loadEmails();
  }, [folder, searchQuery]);
  
  // Helper function to get icon for the current folder
  const getFolderIcon = () => {
    switch(folder) {
      case 'inbox': return <InboxIcon className="h-5 w-5" />;
      case 'sent': return <EnvelopeIcon className="h-5 w-5" />;
      case 'archive': return <ArchiveBoxIcon className="h-5 w-5" />;
      case 'trash': return <TrashIcon className="h-5 w-5" />;
      default: return <InboxIcon className="h-5 w-5" />;
    }
  };
  
  // Handle search input changes
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };
  
  // Handle toggling star status
  const handleToggleStar = async (e, emailId) => {
    e.stopPropagation();
    
    // Find email to toggle
    const emailToUpdate = emails.find(email => email.id === emailId);
    if (!emailToUpdate) return;
    
    try {
      // Optimistic update
      const updatedEmails = emails.map(email => 
        email.id === emailId 
          ? { ...email, isStarred: !email.isStarred } 
          : email
      );
      setEmails(updatedEmails);
      
      // Update on server
      await updateEmail(emailId, { isStarred: !emailToUpdate.isStarred });
    } catch (err) {
      console.error('Error updating star status:', err);
      
      // Revert changes if error
      setEmails(emails);
    }
  };
  
  // Handle selecting an email
  const handleSelectEmail = (emailId) => {
    setSelectedEmailId(emailId);
    onSelectEmail(emailId);
    
    // Mark as read optimistically
    const updatedEmails = emails.map(email => 
      email.id === emailId 
        ? { ...email, isRead: true } 
        : email
    );
    setEmails(updatedEmails);
    
    // Update on server
    updateEmail(emailId, { isRead: true }).catch(err => {
      console.error('Error marking email as read:', err);
    });
  };
  
  // Get email summary text (truncate body text)
  const getEmailSummary = (html) => {
    // Create a temporary element to convert HTML to plain text
    const temp = document.createElement('div');
    temp.innerHTML = html;
    const text = temp.textContent || temp.innerText || '';
    return text.length > 90 ? text.substring(0, 90) + '...' : text;
  };
  
  if (loading && emails.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="rounded-full bg-primary-200 dark:bg-primary-900 h-12 w-12 flex items-center justify-center mb-3">
            {getFolderIcon()}
          </div>
          <div className="text-gray-500 dark:text-gray-400">Loading emails...</div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-2">Error: {error}</div>
          <button 
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  
  if (emails.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center">
            {getFolderIcon()}
            <h2 className="ml-2 font-semibold capitalize">{folder}</h2>
          </div>
          
          <div className="relative w-64">
            <input
              type="text"
              placeholder="Search emails..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              value={searchQuery}
              onChange={handleSearchChange}
            />
            <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          </div>
        </div>
        
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-6">
            <div className="mx-auto w-16 h-16 mb-4 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              {getFolderIcon()}
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">No emails found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {searchQuery 
                ? `No results for "${searchQuery}"`
                : `Your ${folder} folder is empty`}
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center">
          {getFolderIcon()}
          <h2 className="ml-2 font-semibold capitalize">{folder}</h2>
          <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
            {emails.length} {emails.length === 1 ? 'message' : 'messages'}
          </span>
        </div>
        
        <div className="relative w-64">
          <input
            type="text"
            placeholder="Search emails..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            value={searchQuery}
            onChange={handleSearchChange}
          />
          <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {emails.map((email) => (
            <motion.li
              key={email.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`
                hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer
                ${selectedEmailId === email.id ? 'bg-blue-50 dark:bg-primary-900/20' : ''}
                ${!email.isRead ? 'bg-primary-50 dark:bg-primary-900/10' : ''}
              `}
              onClick={() => handleSelectEmail(email.id)}
            >
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center min-w-0">
                    <button 
                      onClick={(e) => handleToggleStar(e, email.id)}
                      className="mr-2 text-gray-400 hover:text-yellow-400 dark:hover:text-yellow-300"
                    >
                      {email.isStarred ? (
                        <StarSolidIcon className="h-5 w-5 text-yellow-400 dark:text-yellow-300" />
                      ) : (
                        <StarIcon className="h-5 w-5" />
                      )}
                    </button>
                    
                    <p className={`text-sm font-medium truncate ${!email.isRead ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                      {folder === 'sent' ? email.to[0].name || email.to[0].email : email.from.name || email.from.email}
                    </p>
                  </div>
                  <div className="ml-2 flex-shrink-0 flex text-sm text-gray-500 dark:text-gray-400">
                    {format(new Date(email.date), 'MMM d')}
                  </div>
                </div>
                <div className="sm:flex sm:justify-between">
                  <p className={`text-sm ${!email.isRead ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                    {email.subject}
                  </p>
                  <div className="mt-1 flex items-center text-sm text-gray-500 sm:mt-0">
                    {email.hasAttachments && (
                      <PaperClipIcon className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </div>
                <div className="mt-1">
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                    {getEmailSummary(email.body)}
                  </p>
                </div>
              </div>
            </motion.li>
          ))}
        </ul>
      </div>
    </div>
  );
}