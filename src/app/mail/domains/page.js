'use client';

import { useState } from 'react';
import DomainSetup from '@/components/mail/DomainSetup';
import EmailAccountsManager from '@/components/mail/EmailAccountsManager';

export default function DomainsPage() {
  const [selectedDomainId, setSelectedDomainId] = useState(null);
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Domain Management</h1>
      
      <div className="space-y-8">
        <DomainSetup onDomainSelect={setSelectedDomainId} />
        
        {selectedDomainId && (
          <EmailAccountsManager domainId={selectedDomainId} />
        )}
      </div>
    </div>
  );
}