'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { LockClosedIcon, PaperClipIcon, StarIcon, KeyIcon } from '@heroicons/react/20/solid';
import { motion } from 'framer-motion';
import md5 from 'blueimp-md5';

export default function EmailRow({ message, onClick, isSelected, onStar }) {
  const [isHovered, setIsHovered] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  // Generate Gravatar URL from email using MD5 hash
  const getGravatarUrl = (email, size = 40) => {
    if (!email) return null;
    const hash = md5(email.trim().toLowerCase());
    return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=404`;
  };
  
  const formattedDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return format(date, 'h:mm a');
    } else {
      return format(date, 'MMM d');
    }
  };

  const handleStar = (e) => {
    e.stopPropagation();
    if (onStar) {
      onStar(message.id, !message.starred);
    }
  };

  const isStarred = message.starred || false;

  // Check if message has PGP key attachment
  const hasPgpKey = message.attachments?.some(att => 
    att.filename?.endsWith('.asc') || 
    att.contentType === 'application/pgp-keys'
  );

  return (
    <motion.div 
      className={`
        ${message.read ? 'bg-sidebar' : 'bg-sidebar/80 dark:bg-primary-900/10'}
        ${isSelected ? 'bg-primary-700/20 border-l-4 border-primary-500' : 'border-l-4 border-transparent'}
        flex items-center py-3 px-4 cursor-pointer border-b border-gray-700 
        hover:bg-primary-900/20 transition-colors relative
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.005 }}
    >
      {/* Star icon */}
      <div className="mr-3 flex-shrink-0">
        <button 
          onClick={handleStar}
          className="focus:outline-none"
        >
          <StarIcon 
            className={`h-5 w-5 ${isStarred ? 'text-yellow-400' : 'text-gray-500'} 
              ${isHovered && !isStarred ? 'opacity-60' : 'opacity-100'}`} 
          />
        </button>
      </div>

      {/* Sender photo */}
      <div className="mr-4 flex-shrink-0 hidden sm:block">
        <div className="h-9 w-9 rounded-full bg-primary-600/30 flex items-center justify-center text-sm font-medium text-primary-400 uppercase overflow-hidden">
          {!avatarError ? (
            <img
              src={getGravatarUrl(message.from?.email, 72)}
              alt={message.from?.name || ''}
              className="h-full w-full object-cover"
              onError={() => setAvatarError(true)}
            />
          ) : (
            message.from?.name?.charAt(0) || message.from?.email?.charAt(0) || '?'
          )}
        </div>
      </div>
      
      {/* Sender and subject */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center">
          <p className={`text-sm font-medium truncate mr-2 ${message.read ? 'text-gray-200' : 'text-white font-semibold'}`}>
            {message.from?.name || message.from?.email || 'Unknown'}
          </p>
          
          {/* Email tags and PGP key indicator */}
          <div className="ml-auto sm:ml-2 flex space-x-1">
            {hasPgpKey && (
              <span className="inline-flex items-center rounded-full bg-green-900/30 px-2 py-0.5 text-xs font-medium text-green-300">
                <KeyIcon className="h-3 w-3 mr-1" />
                PGP Key
              </span>
            )}
            {message.labels?.map(label => (
              <span 
                key={label} 
                className={`hidden sm:inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium 
                ${label === 'important' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' : 
                  label === 'alert' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' :
                  'bg-primary-100 dark:bg-primary-800/40 text-primary-800 dark:text-primary-300'}`}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
        
        <div className="flex items-baseline">
          <p className={`text-sm ${message.read ? 'text-gray-400' : 'text-gray-300'} mr-1`}>
            {message.subject}
          </p>
          
          <p className="text-xs truncate text-gray-500">
            - {message.snippet}
          </p>
        </div>
      </div>
      
      {/* Indicators and time */}
      <div className="ml-4 flex-shrink-0 flex flex-col items-end space-y-1">
        <div className="flex items-center">
          <span className={`text-xs ${message.read ? 'text-gray-500' : 'text-primary-400'}`}>
            {formattedDate(message.timestamp)}
          </span>
          
          <div className="flex ml-2">
            {message.encryptedBody && (
              <LockClosedIcon className="h-4 w-4 text-primary-500" />
            )}
            
            {message.attachments?.length > 0 && (
              <PaperClipIcon className="ml-1 h-4 w-4 text-gray-400" />
            )}
          </div>
        </div>
        
        <span className="text-xs text-gray-500">
          via {message.to.email.split('@')[0]}
        </span>
      </div>
    </motion.div>
  );
}