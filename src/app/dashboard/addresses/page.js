'use client';

import { useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '../../../components/dashboard/DashboardLayout';
import AddressCard from '../../../components/dashboard/AddressCard';
import { mockDisposableAddresses } from '../../../lib/email/mock-data';
import { 
  MagnifyingGlassIcon, 
  PlusIcon,
  FunnelIcon,
  KeyIcon
} from '@heroicons/react/24/outline';

export default function Addresses() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'expired'
  
  const filteredAddresses = mockDisposableAddresses
    .filter(address => 
      address.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (address.note && address.note.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .filter(address => 
      statusFilter === 'all' || 
      address.status === statusFilter
    );
  
  const activeCount = mockDisposableAddresses.filter(a => a.status === 'active').length;
  const expiredCount = mockDisposableAddresses.filter(a => a.status === 'expired').length;
  
  return (
    <DashboardLayout>
      <div>
        {/* Control Bar */}
        <div className="mb-6 bg-white dark:bg-gray-800 p-4 shadow rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="relative rounded-md shadow-sm max-w-xs w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white dark:bg-gray-700 dark:border-gray-600 placeholder-gray-500 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:text-white"
                placeholder="Search addresses"
              />
            </div>
            
            <div className="flex gap-2">
              <div className="relative w-full sm:w-auto">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:text-white"
                >
                  <option value="all">All Addresses</option>
                  <option value="active">Active ({activeCount})</option>
                  <option value="expired">Expired ({expiredCount})</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <FunnelIcon className="h-4 w-4 text-gray-400" />
                </div>
              </div>
              
              <Link
                href="/dashboard/addresses/new"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                New Address
              </Link>
            </div>
          </div>
        </div>
        
        {/* Address Grid */}
        {filteredAddresses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAddresses.map(address => (
              <AddressCard key={address.id} address={address} />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg py-12 flex flex-col items-center justify-center text-center px-4">
            <div className="mb-4 bg-gray-100 dark:bg-gray-700 p-3 rounded-full">
              <KeyIcon className="h-8 w-8 text-gray-500 dark:text-gray-400" />
            </div>
            {searchQuery || statusFilter !== 'all' ? (
              <>
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No addresses found</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Try adjusting your search or filter criteria.
                </p>
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                    }}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200 dark:text-primary-200 dark:bg-primary-900/30 dark:hover:bg-primary-800/50 transition-colors"
                  >
                    Clear filters
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No addresses yet</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Create your first disposable email address to get started.
                </p>
                <div className="mt-6">
                  <Link
                    href="/dashboard/addresses/new"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none"
                  >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    New Address
                  </Link>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}