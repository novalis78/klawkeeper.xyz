'use client';

import { useState } from 'react';
import { 
  ClockIcon, 
  EnvelopeIcon, 
  TrashIcon,
  ArrowPathIcon,
  PencilIcon,
  ClipboardIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';

export default function AddressCard({ address }) {
  const [copied, setCopied] = useState(false);
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(address.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const formatDate = (dateString) => {
    return format(new Date(dateString), 'MMM d, yyyy');
  };
  
  // Calculate days remaining for expiration
  const getDaysRemaining = () => {
    const today = new Date();
    const expiryDate = new Date(address.expires);
    
    if (address.status === 'expired') {
      return 'Expired';
    }
    
    const diffTime = Math.abs(expiryDate - today);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return `${diffDays} days`;
  };

  return (
    <div className={`rounded-lg shadow-sm overflow-hidden border ${
      address.status === 'expired' 
        ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50' 
        : 'border-primary-200 dark:border-primary-800 bg-white dark:bg-gray-800'
    }`}>
      <div className="p-5 relative">
        {address.status === 'expired' && (
          <div className="absolute top-0 right-0 m-2 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
            Expired
          </div>
        )}
        
        <div className="flex justify-between items-start mb-2">
          <div className="break-all">
            <div className="inline-flex items-center mb-2">
              <div className={`p-1.5 mr-2 rounded-md ${
                address.status === 'expired' 
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400' 
                  : 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
              }`}>
                <EnvelopeIcon className="h-5 w-5" />
              </div>
              <button 
                onClick={copyToClipboard}
                className="text-sm flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {copied ? (
                  <CheckIcon className="h-4 w-4 mr-1 text-green-500" />
                ) : (
                  <ClipboardIcon className="h-4 w-4 mr-1" />
                )}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <h3 className={`font-medium ${
              address.status === 'expired' 
                ? 'text-gray-500 dark:text-gray-400' 
                : 'text-gray-900 dark:text-white'
            }`}>
              {address.address}
            </h3>
          </div>
        </div>
        
        <div className="space-y-1 text-sm">
          <div className="flex items-center">
            <ClockIcon className="h-4 w-4 mr-1.5 text-gray-500 dark:text-gray-400" />
            <span className="text-gray-600 dark:text-gray-300">Created: {formatDate(address.created)}</span>
          </div>
          <div className="flex items-center">
            <ClockIcon className="h-4 w-4 mr-1.5 text-gray-500 dark:text-gray-400" />
            <span className="text-gray-600 dark:text-gray-300">Expires: {formatDate(address.expires)}</span>
          </div>
          <div className="flex items-center">
            <ArrowPathIcon className="h-4 w-4 mr-1.5 text-gray-500 dark:text-gray-400" />
            <span className="text-gray-600 dark:text-gray-300">Forwards to: {address.forwardTo}</span>
          </div>
          {address.note && (
            <div className="flex items-center">
              <span className="text-gray-600 dark:text-gray-300 italic">{address.note}</span>
            </div>
          )}
        </div>
        
        <div className="mt-4 flex justify-between items-center">
          <div className={`flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
            address.status === 'expired' 
              ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300' 
              : 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
          }`}>
            <span>{getDaysRemaining()} remaining</span>
          </div>
          
          <div className="flex space-x-1">
            <button className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700">
              <PencilIcon className="h-4 w-4" />
            </button>
            {address.status !== 'expired' && (
              <button className="p-1.5 rounded-md text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-200 dark:hover:bg-red-900/20">
                <TrashIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        
        {address.messageCount > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
            <span className="text-gray-600 dark:text-gray-300 text-sm">
              {address.messageCount} {address.messageCount === 1 ? 'message' : 'messages'} received
            </span>
          </div>
        )}
      </div>
    </div>
  );
}