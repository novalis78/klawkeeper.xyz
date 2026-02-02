'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '../../../components/dashboard/DashboardLayout';
import EmailRow from '../../../components/dashboard/EmailRow';
import EmailDetail from '../../../components/dashboard/EmailDetail';
import ComposeEmail from '../../../components/mail/ComposeEmail';
import { getCurrentUserId } from '../../../lib/auth/getCurrentUser';
import { getCredentials, getSessionKey } from '../../../lib/mail/mailCredentialManager';
import { useAuth } from '../../../lib/auth/useAuth';
import { 
  MagnifyingGlassIcon, 
  ArrowPathIcon,
  FunnelIcon,
  PaperAirplaneIcon
} from '@heroicons/react/24/outline';

export default function SentPage() {
  const { user } = useAuth();
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showComposeEmail, setShowComposeEmail] = useState(false);
  const [composeMode, setComposeMode] = useState('new');
  const [composeInitialData, setComposeInitialData] = useState({});
  
  useEffect(() => {
    async function fetchSentEmails() {
      try {
        setLoading(true);
        
        const token = localStorage.getItem('auth_token');
        
        if (!token) {
          console.error('Authentication token missing');
          setLoading(false);
          return;
        }
        
        // Fetch emails from the sent folder
        const response = await fetch('/api/mail/fetch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            folder: 'sent',
            limit: 50,
            offset: 0
          })
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch sent emails');
        }
        
        const data = await response.json();
        
        if (data.success && data.emails) {
          setEmails(data.emails);
        } else {
          // Fallback to empty array if no emails
          setEmails([]);
        }
      } catch (error) {
        console.error('Error fetching sent emails:', error);
        // Set a fallback empty array
        setEmails([]);
      } finally {
        setLoading(false);
      }
    }
    
    fetchSentEmails();
  }, []);
  
  const handleSelectEmail = (email) => {
    setSelectedEmail(email);
  };
  
  const handleCloseDetail = () => {
    setSelectedEmail(null);
  };
  
  const handleRefresh = async () => {
    setLoading(true);
    // Reuse the effect logic for refreshing
    try {
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        console.error('Authentication token missing');
        setLoading(false);
        return;
      }
      
      const response = await fetch('/api/mail/fetch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          folder: 'sent',
          limit: 50,
          offset: 0
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch sent emails');
      }
      
      const data = await response.json();
      
      if (data.success && data.emails) {
        setEmails(data.emails);
      }
    } catch (error) {
      console.error('Error refreshing sent emails:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleComposeEmail = () => {
    setComposeMode('new');
    setComposeInitialData({});
    setShowComposeEmail(true);
  };
  
  const handleReply = (replyData) => {
    setComposeInitialData(replyData);
    setComposeMode('reply');
    setShowComposeEmail(true);
  };
  
  const handleForward = (forwardData) => {
    setComposeInitialData(forwardData);
    setComposeMode('forward');
    setShowComposeEmail(true);
  };
  
  return (
    <DashboardLayout>
      <div className="h-full flex flex-col">
        {/* Toolbar */}
        <div className="flex justify-end items-center mb-4">
          <div className="flex space-x-2">
            <button
              onClick={handleRefresh}
              className={`p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 ${loading ? 'animate-spin' : ''}`}
            >
              <ArrowPathIcon className="h-5 w-5" />
            </button>
            <div className="relative">
              <input
                type="text"
                placeholder="Search sent emails..."
                className="pl-10 pr-4 py-2 rounded-full bg-gray-800 border border-gray-700 text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
            </div>
            <button
              className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700"
            >
              <FunnelIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        {/* Email list/detail view */}
        <div className="flex-grow bg-gray-800/70 backdrop-blur-md rounded-lg overflow-hidden border border-gray-700 shadow-xl">
          {selectedEmail ? (
            <EmailDetail
              message={selectedEmail}
              onBack={handleCloseDetail}
              onReply={handleReply}
              onForward={handleForward}
            />
          ) : (
            <div className="flex flex-col h-full">
              {/* Email list header */}
              <div className="bg-gray-900/60 backdrop-blur-md px-4 py-2 border-b border-gray-700 flex justify-between items-center">
                <div className="text-sm font-medium text-gray-400">
                  {emails.length} sent {emails.length === 1 ? 'message' : 'messages'}
                </div>
              </div>
              
              {/* Email list */}
              <div className="overflow-y-auto flex-grow">
                {loading ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
                  </div>
                ) : emails.length === 0 ? (
                  <div className="flex flex-col justify-center items-center h-full text-gray-400">
                    <PaperAirplaneIcon className="h-16 w-16 mb-4 transform rotate-90 text-gray-600" />
                    <p className="text-xl font-medium">No sent messages yet</p>
                    <p className="mt-2 text-center max-w-md px-4">
                      Your sent emails will appear here automatically.
                      Compose a new message to get started!
                    </p>
                    <button
                      onClick={() => window.location.href = '/dashboard/compose'}
                      className="mt-6 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-md transition-colors"
                    >
                      Compose Email
                    </button>
                  </div>
                ) : (
                  emails.map((email) => (
                    <EmailRow
                      key={email.id}
                      message={email}
                      onClick={() => handleSelectEmail(email)}
                      isSelected={selectedEmail?.id === email.id}
                    />
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Compose email modal */}
      {showComposeEmail && (
        <ComposeEmail
          onClose={() => setShowComposeEmail(false)}
          mode={composeMode}
          initialData={composeInitialData}
        />
      )}
    </DashboardLayout>
  );
}