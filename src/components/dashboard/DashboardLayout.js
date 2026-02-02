'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bars3Icon,
  XMarkIcon,
  EnvelopeIcon,
  KeyIcon,
  ShieldCheckIcon,
  CogIcon,
  PlusIcon,
  ArrowRightOnRectangleIcon,
  ArrowPathIcon,
  PaperAirplaneIcon,
  UsersIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/lib/auth/useAuth';

export default function DashboardLayout({ children, onInboxClick }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, loading, getToken } = useAuth();
  const pathname = usePathname();

  const [userEmail, setUserEmail] = useState('Loading...');
  const [userInitials, setUserInitials] = useState('');
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [draftCount, setDraftCount] = useState(0);

  useEffect(() => {
    if (loading) return;

    if (user && user.email) {
      setUserEmail(user.email);

      // Set initials from the email username
      const username = user.email.split('@')[0];
      if (username) {
        // Get up to two characters for initials
        const initials = username.substring(0, 2).toUpperCase();
        setUserInitials(initials);
      } else {
        setUserInitials('US');
      }

      // Fetch subscription status and draft count
      fetchSubscriptionStatus();
      fetchDraftCount();
    } else {
      // No user logged in - try localStorage as fallback
      const storedEmail = localStorage.getItem('user_email');
      if (storedEmail) {
        setUserEmail(storedEmail);
        const username = storedEmail.split('@')[0];
        const initials = username.substring(0, 2).toUpperCase();
        setUserInitials(initials);
      } else {
        setUserEmail('User@example.com');
        setUserInitials('US');
      }
    }
  }, [user, loading]);

  const fetchSubscriptionStatus = async () => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSubscriptionStatus(data.subscriptionStatus || 'free');
      }
    } catch (error) {
      console.error('Error fetching subscription status:', error);
      setSubscriptionStatus('free');
    }
  };

  const fetchDraftCount = async () => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch('/api/drafts', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDraftCount(data.draftCount || 0);
      }
    } catch (error) {
      console.error('Error fetching draft count:', error);
    }
  };

  // Format subscription status for display
  const getSubscriptionLabel = () => {
    if (!subscriptionStatus) return '';
    const labels = {
      free: 'Free',
      trial: 'Trial',
      active: 'Pro',
      personal: 'Personal',
      pro: 'Pro',
      bitcoin: 'Pro',
      cancelled: 'Cancelled',
      expired: 'Expired'
    };
    return labels[subscriptionStatus] || subscriptionStatus;
  };

  const getSubscriptionColor = () => {
    if (!subscriptionStatus) return 'text-gray-400';
    const colors = {
      free: 'text-gray-400',
      trial: 'text-yellow-400',
      active: 'text-primary-400',
      personal: 'text-blue-400',
      pro: 'text-primary-400',
      bitcoin: 'text-orange-400',
      cancelled: 'text-red-400',
      expired: 'text-red-400'
    };
    return colors[subscriptionStatus] || 'text-gray-400';
  };

  const navigation = [
    { name: 'Inbox', href: '/dashboard', icon: EnvelopeIcon },
    { name: 'Drafts', href: '/dashboard/drafts', icon: DocumentTextIcon, count: draftCount },
    { name: 'Sent', href: '/dashboard/sent', icon: PaperAirplaneIcon },
    { name: 'Contacts', href: '/dashboard/contacts', icon: UsersIcon },
    { name: 'Addresses', href: '/dashboard/addresses', icon: KeyIcon },
    { name: 'Analytics', href: '/dashboard/analytics', icon: ArrowPathIcon },
    { name: 'Settings', href: '/dashboard/settings', icon: CogIcon },
  ];

  // Helper function to check if current route matches nav item
  const isCurrentRoute = (href) => {
    if (href === '/dashboard') {
      // Inbox is only active on exact /dashboard match (not subpaths)
      return pathname === '/dashboard';
    }
    // Other items are active if pathname starts with their href
    return pathname.startsWith(href);
  };

  return (
    <div className="flex h-screen bg-dashboard overflow-hidden">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 bg-gray-900/80 z-40 md:hidden ${sidebarOpen ? 'block' : 'hidden'}`} onClick={() => setSidebarOpen(false)} />

      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar shadow-lg transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:z-0 flex-shrink-0`}>
        <div className="flex justify-between items-center h-16 px-4 border-b border-gray-700">
          <Link href="/dashboard" className="flex items-center space-x-2 group">
            <div className="relative">
              <img
                src="/logo-small.png"
                alt="KeyKeeper"
                className="h-8 w-8 object-contain transition-all duration-300 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-teal-400/0 group-hover:bg-teal-400/30 rounded-lg blur-xl transition-all duration-300 -z-10"></div>
            </div>
            <span className="text-lg font-bold text-white group-hover:text-primary-300 transition-colors">KeyKeeper</span>
          </Link>
          <button 
            type="button" 
            className="-mr-2 p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 md:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-4">
          <Link
            href="/dashboard/compose"
            className="flex items-center justify-center w-full p-2 mb-6 text-white bg-primary-600 hover:bg-primary-500 rounded-md transition-colors"
          >
            <PaperAirplaneIcon className="h-5 w-5 mr-2 transform rotate-90" />
            <span>Compose</span>
          </Link>
          
          <nav className="space-y-1">
            {navigation.map((item) => {
              const isCurrent = isCurrentRoute(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={item.name === 'Inbox' && onInboxClick ? onInboxClick : undefined}
                  className={`flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium ${
                    isCurrent
                      ? 'bg-primary-700/20 text-primary-400'
                      : 'text-gray-300 hover:bg-sidebar hover:text-primary-400'
                  }`}
                >
                  <div className="flex items-center">
                    <item.icon className={`mr-3 h-5 w-5 ${
                      isCurrent
                        ? 'text-primary-500'
                        : 'text-gray-400'
                    }`} />
                    {item.name}
                  </div>
                  {item.count > 0 && (
                    <span className="ml-auto bg-primary-600/20 text-primary-400 text-xs font-medium px-2 py-0.5 rounded-full">
                      {item.count}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
        
        <div className="absolute bottom-0 w-full p-4 border-t border-gray-700">
          <Link
            href="/logout"
            className="flex items-center px-3 py-2 text-sm font-medium text-gray-300 hover:text-primary-400 hover:bg-sidebar rounded-md"
          >
            <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5 text-gray-400" />
            Sign out
          </Link>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-auto">
        {/* Top header */}
        <header className="sticky top-0 z-10 bg-dashboard shadow-sm">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              type="button"
              className="p-2 -ml-2 rounded-md text-gray-400 md:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
            
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-medium">
                  {userInitials}
                </div>
              </div>
              <div className="ml-3">
                <div className="text-sm font-medium text-gray-200">{userEmail}</div>
                <div className={`text-xs ${getSubscriptionColor()}`}>{getSubscriptionLabel()}</div>
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 text-gray-200">
          {children}
        </main>
      </div>
    </div>
  );
}