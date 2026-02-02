'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth/useAuth';

export default function LogoutPage() {
  const { logout } = useAuth();
  
  useEffect(() => {
    const handleLogout = async () => {
      await logout();
    };
    
    handleLogout();
  }, [logout]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="max-w-md w-full space-y-8 p-10 bg-white dark:bg-gray-800 rounded-xl shadow-md">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
            Signing out...
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            You are being logged out of your account.
          </p>
          <div className="mt-6">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 dark:border-gray-600 border-t-primary-600"></div>
          </div>
        </div>
      </div>
    </div>
  );
}