'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '../../../../components/dashboard/DashboardLayout';
import { 
  ArrowLeftIcon, 
  ClockIcon,
  CheckIcon,
  ShieldCheckIcon,
  KeyIcon
} from '@heroicons/react/24/outline';

export default function NewAddress() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: form, 2: creating, 3: success
  const [formData, setFormData] = useState({
    alias: '',
    expiration: '30', // days
    forwardTo: 'user@example.com', // pre-filled with user's email
    note: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [newAddress, setNewAddress] = useState({
    address: '',
    expires: ''
  });
  
  const generateRandomAddress = () => {
    // In a real app, this would be done on the server
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result + '@keykeeper.world';
  };
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setStep(2);
    
    // Simulate API call to create address
    setTimeout(() => {
      const address = generateRandomAddress();
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + parseInt(formData.expiration));
      
      setNewAddress({
        address,
        expires: expiryDate.toISOString().split('T')[0]
      });
      
      setIsLoading(false);
      setStep(3);
    }, 1500);
  };
  
  const handleDone = () => {
    router.push('/dashboard/addresses');
  };
  
  const expirationOptions = [
    { value: '1', label: '1 day' },
    { value: '7', label: '1 week' },
    { value: '30', label: '1 month' },
    { value: '90', label: '3 months' },
    { value: '365', label: '1 year' }
  ];

  return (
    <DashboardLayout>
      <div>
        <div className="mb-6">
          <Link
            href="/dashboard/addresses"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back to Addresses
          </Link>
        </div>
        
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {step === 3 ? 'Address Created' : 'Create New Address'}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {step === 3 
              ? 'Your new disposable email address is ready to use'
              : 'Generate a new disposable email address for enhanced privacy'
            }
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          {step === 1 && (
            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-6">
                <div>
                  <label htmlFor="alias" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Alias/Purpose <span className="text-gray-500 dark:text-gray-400">(optional)</span>
                  </label>
                  <input
                    type="text"
                    id="alias"
                    name="alias"
                    value={formData.alias}
                    onChange={handleChange}
                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                    placeholder="e.g., Shopping, Newsletter, etc."
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    A nickname for this address to help you remember its purpose
                  </p>
                </div>
                
                <div>
                  <label htmlFor="expiration" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Expiration
                  </label>
                  <select
                    id="expiration"
                    name="expiration"
                    value={formData.expiration}
                    onChange={handleChange}
                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                  >
                    {expirationOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    After this period, the address will stop receiving emails
                  </p>
                </div>
                
                <div>
                  <label htmlFor="forwardTo" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Forward to
                  </label>
                  <input
                    type="email"
                    id="forwardTo"
                    name="forwardTo"
                    value={formData.forwardTo}
                    onChange={handleChange}
                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                    disabled
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Your primary email where messages will be forwarded
                  </p>
                </div>
                
                <div>
                  <label htmlFor="note" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Note <span className="text-gray-500 dark:text-gray-400">(optional)</span>
                  </label>
                  <textarea
                    id="note"
                    name="note"
                    rows="3"
                    value={formData.note}
                    onChange={handleChange}
                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                    placeholder="Add any notes about this address"
                  />
                </div>
                
                <div className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-md">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <ShieldCheckIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-primary-800 dark:text-primary-200">Privacy features</h3>
                      <div className="mt-2 text-sm text-primary-700 dark:text-primary-300">
                        <ul className="list-disc pl-5 space-y-1">
                          <li>All emails will be encrypted with your PGP key</li>
                          <li>Your real email address remains hidden</li>
                          <li>Auto-expires to minimize tracking risk</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end">
                <Link
                  href="/dashboard/addresses"
                  className="mr-3 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-transparent hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none"
                >
                  Create Address
                </button>
              </div>
            </form>
          )}
          
          {step === 2 && (
            <div className="p-6 text-center py-12">
              <div className="flex justify-center mb-6">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Creating your address...
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                This will only take a moment.
              </p>
            </div>
          )}
          
          {step === 3 && (
            <div className="p-6">
              <div className="text-center py-6 mb-6">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30">
                  <CheckIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="mt-3 text-lg font-medium text-gray-900 dark:text-white">
                  Address successfully created!
                </h3>
              </div>
              
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4 mb-6">
                <div className="flex items-center mb-3">
                  <KeyIcon className="h-5 w-5 mr-2 text-primary-600 dark:text-primary-400" />
                  <h4 className="font-medium text-gray-900 dark:text-white">Your new email address</h4>
                </div>
                
                <div className="px-2 py-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 font-mono text-sm break-all">
                  {newAddress.address}
                </div>
                
                <div className="mt-3 flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <ClockIcon className="mr-1 h-4 w-4" />
                  Expires on {newAddress.expires}
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(newAddress.address);
                    }}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-transparent hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none"
                  >
                    Copy Address
                  </button>
                </div>
                
                <div className="flex space-x-3">
                  <Link
                    href="/dashboard/addresses"
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-transparent hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none"
                  >
                    View All Addresses
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setFormData({
                        alias: '',
                        expiration: '30',
                        forwardTo: 'user@example.com',
                        note: ''
                      });
                    }}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none"
                  >
                    Create Another
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}