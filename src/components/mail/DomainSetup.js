'use client';

import { useState, useEffect } from 'react';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  InformationCircleIcon,
  ClipboardDocumentIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { 
  getDomains, 
  addDomain, 
  verifyDomain, 
  generateDnsRecords,
  getDomain
} from '@/lib/mail/domains';

export default function DomainSetup({ onDomainSelect }) {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newDomain, setNewDomain] = useState('');
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [dnsRecords, setDnsRecords] = useState({});
  const [verifying, setVerifying] = useState(false);
  const [copied, setCopied] = useState(null);

  // Fetch domains on component mount
  useEffect(() => {
    fetchDomains();
  }, []);

  // Fetch DNS records when a domain is selected
  useEffect(() => {
    if (selectedDomain) {
      fetchDnsRecords(selectedDomain);
      if (onDomainSelect) {
        onDomainSelect(selectedDomain);
      }
    }
  }, [selectedDomain, onDomainSelect]);

  // Fetch all domains
  const fetchDomains = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const domainsData = await getDomains();
      setDomains(domainsData);
      
      // Select the first domain if available and none selected
      if (domainsData.length > 0 && !selectedDomain) {
        setSelectedDomain(domainsData[0].id);
      }
    } catch (err) {
      console.error('Error fetching domains:', err);
      setError('Failed to load domains. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch DNS records for a domain
  const fetchDnsRecords = async (domainId) => {
    try {
      const domain = await getDomain(domainId);
      const records = await generateDnsRecords(domain.domain);
      setDnsRecords(records);
    } catch (err) {
      console.error('Error fetching DNS records:', err);
      setDnsRecords({});
    }
  };

  // Add a new domain
  const handleAddDomain = async (e) => {
    e.preventDefault();
    
    if (!newDomain.trim()) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const domain = await addDomain(null, newDomain.trim());
      setNewDomain('');
      await fetchDomains(); // Refresh the domain list
      setSelectedDomain(domain.id); // Select the newly added domain
    } catch (err) {
      console.error('Error adding domain:', err);
      setError(err.message || 'Failed to add domain. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Verify domain DNS records
  const handleVerifyDomain = async (domainId) => {
    setVerifying(true);
    
    try {
      const result = await verifyDomain(domainId);
      
      // Update the domain status in the local state
      setDomains(domains.map(domain => 
        domain.id === domainId 
          ? { ...domain, isVerified: Object.values(result).every(r => r.verified), status: 'active' } 
          : domain
      ));
      
      // Refresh DNS records
      await fetchDnsRecords(domainId);
    } catch (err) {
      console.error('Error verifying domain:', err);
      setError('Failed to verify domain. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  // Copy DNS record to clipboard
  const copyToClipboard = (text, recordId) => {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopied(recordId);
        setTimeout(() => setCopied(null), 2000);
      },
      () => {
        console.error('Failed to copy text');
      }
    );
  };

  // Get badge color based on status
  const getStatusBadgeClass = (status) => {
    switch(status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'pending_verification':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  // Get domain by ID
  const getDomainById = (domainId) => {
    return domains.find(d => d.id === domainId);
  };

  // Transform DNS records for display
  const getDnsRecordsForDisplay = () => {
    if (!dnsRecords || Object.keys(dnsRecords).length === 0) {
      return [];
    }

    const recordsArray = [];

    // MX Records
    if (dnsRecords.mx) {
      dnsRecords.mx.forEach((mx, index) => {
        recordsArray.push({
          id: `mx-${index}`,
          type: 'MX',
          host: '@',
          value: mx.value || `${mx.priority} ${mx.host}`,
          priority: mx.priority,
          status: selectedDomain ? getDomainById(selectedDomain)?.isVerified : false
        });
      });
    }

    // SPF Record
    if (dnsRecords.spf) {
      recordsArray.push({
        id: 'spf',
        type: 'TXT',
        host: '@',
        value: dnsRecords.spf.value,
        priority: '-',
        status: selectedDomain ? getDomainById(selectedDomain)?.isVerified : false
      });
    }

    // DKIM Record
    if (dnsRecords.dkim) {
      recordsArray.push({
        id: 'dkim',
        type: 'TXT',
        host: dnsRecords.dkim.name.split('.')[0],
        value: dnsRecords.dkim.value,
        priority: '-',
        status: selectedDomain ? getDomainById(selectedDomain)?.isVerified : false
      });
    }

    // DMARC Record
    if (dnsRecords.dmarc) {
      recordsArray.push({
        id: 'dmarc',
        type: 'TXT',
        host: dnsRecords.dmarc.name.split('.')[0],
        value: dnsRecords.dmarc.value,
        priority: '-',
        status: selectedDomain ? getDomainById(selectedDomain)?.isVerified : false
      });
    }

    return recordsArray;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Domain Setup</h1>
      
      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 p-4 rounded-md">
          <div className="flex">
            <XCircleIcon className="h-5 w-5 text-red-400 dark:text-red-500 mr-2" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}
      
      {/* Add new domain form */}
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6 mb-8">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Add a New Domain</h2>
        <form onSubmit={handleAddDomain} className="flex gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="example.com"
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm py-2 px-4 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !newDomain.trim()}
            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
              loading || !newDomain.trim()
                ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                : 'bg-primary-600 hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-600'
            }`}
          >
            {loading ? 'Adding...' : 'Add Domain'}
          </button>
        </form>
      </div>
      
      {/* Domains list */}
      {loading && domains.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 dark:border-gray-600 border-t-primary-600"></div>
          <p className="mt-2 text-gray-500 dark:text-gray-400">Loading domains...</p>
        </div>
      ) : domains.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 shadow-sm rounded-lg">
          <p className="text-gray-500 dark:text-gray-400">No domains added yet. Add your first domain to get started.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden">
          {/* Domain tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="flex overflow-x-auto">
              {domains.map((domain) => (
                <button
                  key={domain.id}
                  onClick={() => setSelectedDomain(domain.id)}
                  className={`py-4 px-6 text-sm font-medium whitespace-nowrap ${
                    selectedDomain === domain.id
                      ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  {domain.domain}
                  <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    getStatusBadgeClass(domain.status)
                  }`}>
                    {domain.isVerified ? 'Verified' : 'Pending'}
                  </span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Selected domain details */}
          {selectedDomain && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">DNS Configuration</h2>
                <button
                  onClick={() => handleVerifyDomain(selectedDomain)}
                  disabled={verifying}
                  className={`inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md ${
                    verifying
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                      : 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  <ArrowPathIcon className={`-ml-0.5 mr-2 h-4 w-4 ${verifying ? 'animate-spin' : ''}`} />
                  {verifying ? 'Verifying...' : 'Verify DNS'}
                </button>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md mb-6">
                <div className="flex items-start">
                  <InformationCircleIcon className="h-5 w-5 text-blue-400 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Add the following DNS records to your domain registrar to set up email for this domain. After adding these records, click the "Verify DNS" button to check if they are configured correctly.
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      DNS propagation can take up to 24-48 hours, but typically happens much faster.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* DNS Records table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Type
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Host
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Value
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Priority
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {getDnsRecordsForDisplay().map((record) => (
                      <tr key={record.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {record.type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {record.host}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-md truncate">
                          {record.value}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {record.priority || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            record.status 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                          }`}>
                            {record.status ? (
                              <CheckCircleIcon className="h-4 w-4 mr-1" />
                            ) : null}
                            {record.status ? 'Verified' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => copyToClipboard(record.value, record.id)}
                            className="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300"
                          >
                            {copied === record.id ? (
                              'Copied!'
                            ) : (
                              <ClipboardDocumentIcon className="h-5 w-5" />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}