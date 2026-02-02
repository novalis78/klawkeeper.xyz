'use client';

import { 
  EnvelopeIcon, 
  KeyIcon, 
  ClockIcon, 
  ShieldCheckIcon,
  ArrowUpCircleIcon,
  BoltIcon
} from '@heroicons/react/24/outline';

export default function StatsCard({ stats, userProfile }) {
  // Format bytes to human readable format
  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };
  
  // Calculate storage usage percentage
  const storagePercentage = Math.round((userProfile.storageQuota.used / userProfile.storageQuota.total) * 100);
  
  // Calculate address usage percentage
  const addressPercentage = Math.round((userProfile.addressQuota.used / userProfile.addressQuota.total) * 100);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Email Stats */}
      <div className="bg-sidebar shadow-sm rounded-lg p-6 border border-gray-700">
        <div className="flex items-center">
          <div className="p-2 rounded-md bg-primary-600/30 text-primary-400">
            <EnvelopeIcon className="h-6 w-6" />
          </div>
          <h3 className="ml-3 text-lg font-medium text-white">Email Stats</h3>
        </div>
        
        <div className="mt-6 space-y-4">
          <div className="flex justify-between">
            <span className="text-gray-400">Emails Received</span>
            <span className="font-medium text-white">{stats.emailsReceived}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Emails Forwarded</span>
            <span className="font-medium text-white">{stats.emailsForwarded}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Emails Encrypted</span>
            <span className="font-medium text-white">{stats.emailsEncrypted}</span>
          </div>
        </div>
      </div>
      
      {/* Address Stats */}
      <div className="bg-sidebar shadow-sm rounded-lg p-6 border border-gray-700">
        <div className="flex items-center">
          <div className="p-2 rounded-md bg-primary-600/30 text-primary-400">
            <KeyIcon className="h-6 w-6" />
          </div>
          <h3 className="ml-3 text-lg font-medium text-white">Address Usage</h3>
        </div>
        
        <div className="mt-6 space-y-4">
          <div className="flex justify-between">
            <span className="text-gray-400">Active Addresses</span>
            <span className="font-medium text-white">{stats.addressesActive}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Expired Addresses</span>
            <span className="font-medium text-white">{stats.addressesExpired}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Address Quota</span>
            <span className="font-medium text-white">
              {userProfile.addressQuota.used}/{userProfile.addressQuota.total}
            </span>
          </div>
          
          {/* Progress bar */}
          <div>
            <div className="w-full bg-gray-700 rounded-full h-2.5 mb-1">
              <div 
                className="bg-primary-500 h-2.5 rounded-full" 
                style={{ width: `${addressPercentage}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-400 text-right">
              {addressPercentage}% used
            </div>
          </div>
        </div>
      </div>
      
      {/* System Stats */}
      <div className="bg-sidebar shadow-sm rounded-lg p-6 border border-gray-700">
        <div className="flex items-center">
          <div className="p-2 rounded-md bg-primary-600/30 text-primary-400">
            <ShieldCheckIcon className="h-6 w-6" />
          </div>
          <h3 className="ml-3 text-lg font-medium text-white">System Stats</h3>
        </div>
        
        <div className="mt-6 space-y-4">
          <div className="flex justify-between">
            <span className="text-gray-400">Response Time</span>
            <span className="font-medium text-white">{stats.averageResponseTime} ms</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Subscription</span>
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary-600/30 text-primary-400">
              {userProfile.plan.charAt(0).toUpperCase() + userProfile.plan.slice(1)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Storage</span>
            <span className="font-medium text-white">
              {formatBytes(userProfile.storageQuota.used)}/{formatBytes(userProfile.storageQuota.total)}
            </span>
          </div>
          
          {/* Progress bar */}
          <div>
            <div className="w-full bg-gray-700 rounded-full h-2.5 mb-1">
              <div 
                className="bg-primary-500 h-2.5 rounded-full" 
                style={{ width: `${storagePercentage}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-400 text-right">
              {storagePercentage}% used
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}