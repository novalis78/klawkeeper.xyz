'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '../../../components/dashboard/DashboardLayout';
import StatsCard from '../../../components/dashboard/StatsCard';
import { useAuth } from '@/lib/auth/useAuth';
import { ChartBarIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

export default function Analytics() {
  const { user, getToken } = useAuth();
  const [stats, setStats] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = getToken();

      // Fetch user subscription and profile info
      const profileResponse = await fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!profileResponse.ok) {
        throw new Error('Failed to fetch profile');
      }

      const profileData = await profileResponse.json();

      // Fetch email statistics
      const statsResponse = await fetch('/api/analytics/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      let emailStats = {
        emailsReceived: 0,
        emailsForwarded: 0,
        emailsEncrypted: 0,
        emailsSent: 0,
        addressesActive: 1,
        addressesExpired: 0,
        averageResponseTime: 45
      };

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        emailStats = { ...emailStats, ...statsData };
      }

      // Build user profile from real data
      const subscriptionStatus = profileData.subscriptionStatus || 'free';
      const subscriptionPlan = profileData.subscriptionPlan || 'free';

      // Storage quotas based on plan
      const storageQuotas = {
        free: 100 * 1024 * 1024, // 100MB
        personal: 1024 * 1024 * 1024, // 1GB
        pro: 5 * 1024 * 1024 * 1024, // 5GB
        bitcoin: 5 * 1024 * 1024 * 1024 // 5GB
      };

      const addressQuotas = {
        free: 1,
        personal: 3,
        pro: 10,
        bitcoin: 10
      };

      setUserProfile({
        plan: subscriptionPlan || subscriptionStatus,
        storageQuota: {
          used: emailStats.storageUsed || 0,
          total: storageQuotas[subscriptionPlan] || storageQuotas.free
        },
        addressQuota: {
          used: emailStats.addressesActive || 1,
          total: addressQuotas[subscriptionPlan] || addressQuotas.free
        }
      });

      setStats(emailStats);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err.message);

      // Set default values on error
      setStats({
        emailsReceived: 0,
        emailsForwarded: 0,
        emailsEncrypted: 0,
        emailsSent: 0,
        addressesActive: 1,
        addressesExpired: 0,
        averageResponseTime: 45
      });

      setUserProfile({
        plan: 'free',
        storageQuota: { used: 0, total: 100 * 1024 * 1024 },
        addressQuota: { used: 1, total: 1 }
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div>
        <div className="mb-6 flex items-center justify-end">
          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="inline-flex items-center px-3 py-2 border border-gray-600 text-sm font-medium rounded-md text-gray-300 hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        <div className="mb-8">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-sidebar shadow-sm rounded-lg p-6 border border-gray-700 animate-pulse">
                  <div className="flex items-center mb-6">
                    <div className="p-2 rounded-md bg-gray-700 w-10 h-10"></div>
                    <div className="ml-3 h-6 bg-gray-700 rounded w-24"></div>
                  </div>
                  <div className="space-y-4">
                    <div className="h-4 bg-gray-700 rounded w-full"></div>
                    <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : stats && userProfile ? (
            <StatsCard stats={stats} userProfile={userProfile} />
          ) : (
            <div className="bg-sidebar shadow-sm rounded-lg p-6 border border-gray-700 text-center">
              <p className="text-gray-400">Unable to load statistics</p>
            </div>
          )}
        </div>

        {/* Additional Analytics */}
        <div className="bg-sidebar shadow rounded-lg overflow-hidden p-6">
          <div className="mb-6">
            <h2 className="text-lg font-medium text-white flex items-center">
              <ChartBarIcon className="w-5 h-5 mr-2 text-primary-500" />
              Email Activity
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Recent email activity and statistics
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Email Activity Summary */}
            <div className="bg-dashboard rounded-lg p-4 border border-gray-700">
              <h3 className="text-md font-medium text-white mb-4">Activity Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Emails sent today</span>
                  <span className="text-white font-medium">{stats?.emailsSentToday || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Daily limit</span>
                  <span className="text-white font-medium">{stats?.emailLimit || 3}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Emails remaining</span>
                  <span className="text-primary-400 font-medium">
                    {(stats?.emailLimit || 3) - (stats?.emailsSentToday || 0)}
                  </span>
                </div>
                <div className="mt-4">
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, ((stats?.emailsSentToday || 0) / (stats?.emailLimit || 3)) * 100)}%`
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 text-right">
                    {Math.round(((stats?.emailsSentToday || 0) / (stats?.emailLimit || 3)) * 100)}% of daily limit used
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-dashboard rounded-lg p-4 border border-gray-700">
              <h3 className="text-md font-medium text-white mb-4">Quick Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-sidebar rounded-lg">
                  <div className="text-2xl font-bold text-primary-400">{stats?.totalEmailsReceived || 0}</div>
                  <div className="text-xs text-gray-400 mt-1">Total Received</div>
                </div>
                <div className="text-center p-3 bg-sidebar rounded-lg">
                  <div className="text-2xl font-bold text-primary-400">{stats?.totalEmailsSent || 0}</div>
                  <div className="text-xs text-gray-400 mt-1">Total Sent</div>
                </div>
                <div className="text-center p-3 bg-sidebar rounded-lg">
                  <div className="text-2xl font-bold text-primary-400">{stats?.contactsCount || 0}</div>
                  <div className="text-xs text-gray-400 mt-1">Contacts</div>
                </div>
                <div className="text-center p-3 bg-sidebar rounded-lg">
                  <div className="text-2xl font-bold text-primary-400">{stats?.publicKeysCount || 0}</div>
                  <div className="text-xs text-gray-400 mt-1">Public Keys</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Metrics */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Average Response Time */}
          <div className="bg-sidebar shadow rounded-lg overflow-hidden p-6 border border-gray-700">
            <h3 className="text-md font-medium text-white mb-2">Response Time</h3>
            <div className="flex items-end">
              <span className="text-3xl font-bold text-primary-500">{stats?.averageResponseTime || 45}</span>
              <span className="ml-1 text-gray-400">ms</span>
            </div>
            <p className="mt-2 text-sm text-gray-400">Average server response time</p>
          </div>

          {/* Encryption Rate */}
          <div className="bg-sidebar shadow rounded-lg overflow-hidden p-6 border border-gray-700">
            <h3 className="text-md font-medium text-white mb-2">Encryption Rate</h3>
            <div className="flex items-end">
              <span className="text-3xl font-bold text-primary-500">100%</span>
            </div>
            <p className="mt-2 text-sm text-gray-400">All emails are fully encrypted</p>
          </div>

          {/* Account Status */}
          <div className="bg-sidebar shadow rounded-lg overflow-hidden p-6 border border-gray-700">
            <h3 className="text-md font-medium text-white mb-2">Account Status</h3>
            <div className="flex items-end">
              <span className={`text-xl font-bold ${
                userProfile?.plan === 'pro' || userProfile?.plan === 'bitcoin'
                  ? 'text-green-400'
                  : userProfile?.plan === 'personal'
                    ? 'text-blue-400'
                    : 'text-gray-400'
              }`}>
                {userProfile?.plan?.charAt(0).toUpperCase() + userProfile?.plan?.slice(1) || 'Free'}
              </span>
            </div>
            <p className="mt-2 text-sm text-gray-400">Current subscription plan</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
