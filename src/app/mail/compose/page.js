'use client';

import { useState } from 'react';
import ComposeEmail from '@/components/mail/ComposeEmail';

export default function ComposePage() {
  const [showCompose, setShowCompose] = useState(true);
  
  const handleClose = () => {
    setShowCompose(false);
    window.history.back(); // Go back to previous page
  };
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Compose Email</h1>
      
      {!showCompose && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
          <p className="font-bold">Email Closed</p>
          <p>You've closed the compose window. Click the button below to start a new email.</p>
          <button
            onClick={() => setShowCompose(true)}
            className="mt-2 bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded"
          >
            New Email
          </button>
        </div>
      )}
      
      {showCompose && (
        <ComposeEmail 
          onClose={handleClose}
          initialData={{}}
          mode="new"
        />
      )}
      
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">How to Use</h2>
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
          <p className="mb-2">This compose window connects to a real Postfix mail server. You can send actual emails from it.</p>
          <ul className="list-disc list-inside space-y-2">
            <li>Enter recipient email addresses in the "To" field (comma-separated)</li>
            <li>Add CC or BCC recipients if needed</li>
            <li>Enter a subject and compose your message</li>
            <li>Click "Send" to deliver your email</li>
            <li>The email will be sent from <strong>test@keykeeper.world</strong></li>
          </ul>
        </div>
      </div>
    </div>
  );
}