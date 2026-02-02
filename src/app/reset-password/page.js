'use client';

import { useState, useEffect, Suspense } from 'react';
import { 
  ArrowRightIcon, 
  LockClosedIcon, 
  CheckIcon,
  ExclamationCircleIcon,
  XMarkIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

function ResetPasswordContent() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState(null);
  
  // Get token and userId from URL params
  useEffect(() => {
    // Parse URL parameters manually to avoid useSearchParams hook
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    const urlUserId = urlParams.get('id');
    
    if (urlToken && urlUserId) {
      setToken(urlToken);
      setUserId(urlUserId);
      // TODO: Validate token with server
      setTokenValid(true);
    }
  }, []);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!token || !userId || !password || !confirmPassword) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          userId,
          password
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Password reset failed');
      }
      
      console.log('Password reset successful:', data);
      setSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (error) {
      console.error('Password reset error:', error);
      setError(error.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white dark:bg-gray-800 py-8 px-6 shadow-lg sm:rounded-lg">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900">
                <CheckIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
                Password Reset Successful
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Your password has been successfully reset. You will be redirected to the login page...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Invalid token state
  if (tokenValid === false) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white dark:bg-gray-800 py-8 px-6 shadow-lg sm:rounded-lg">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900">
                <XMarkIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
                Invalid Reset Link
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                This password reset link is invalid or has expired. Please request a new password reset.
              </p>
              <Link
                href="/forgot-password"
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Request New Reset
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main form
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Logo and brand */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex justify-center">
          <span className="sr-only">KeyKeeper</span>
          <div className="h-14 w-14 rounded-full bg-primary-600 flex items-center justify-center">
            <LockClosedIcon className="h-8 w-8 text-white" />
          </div>
        </Link>
        <h1 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          KeyKeeper.world
        </h1>
        <p className="mt-2 text-center text-xl text-gray-600 dark:text-gray-400">
          Reset your password
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start">
              <ExclamationCircleIcon className="h-5 w-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="ml-3">
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
              <button 
                type="button" 
                className="ml-auto flex-shrink-0 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300"
                onClick={() => setError(null)}
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* New password field */}
            <div>
              <label htmlFor="password" className="block text-lg font-medium text-gray-700 dark:text-gray-200 mb-2">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="block w-full rounded-lg border-0 py-4 pr-10 text-lg text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-primary-500 dark:focus:ring-primary-400 transition-all duration-200 bg-white dark:bg-gray-800 dark:bg-opacity-80 px-4"
                  placeholder="Enter your new password"
                  autoComplete="new-password"
                />
              </div>
              
              {/* Password strength indicator */}
              {password && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Password strength: {password.length >= 8 ? 'Good' : 'Too short'}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {password.length >= 8 ? '✓' : '✗'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${password.length >= 8 ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.min(password.length / 12 * 100, 100)}%` }}
                    />
                  </div>
                  {password.length < 8 && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Password must be at least 8 characters long
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Confirm password field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-lg font-medium text-gray-700 dark:text-gray-200 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="block w-full rounded-lg border-0 py-4 pr-10 text-lg text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-primary-500 dark:focus:ring-primary-400 transition-all duration-200 bg-white dark:bg-gray-800 dark:bg-opacity-80 px-4"
                  placeholder="Confirm your new password"
                  autoComplete="new-password"
                />
              </div>
              {confirmPassword && password && confirmPassword !== password && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  Passwords do not match
                </p>
              )}
            </div>
            
            {/* Reset button */}
            <div className="mt-8">
              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center px-6 py-4 border border-transparent text-base font-medium rounded-lg shadow-lg text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 dark:from-primary-600 dark:to-primary-500 dark:hover:from-primary-500 dark:hover:to-primary-400 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading || !password || !confirmPassword || password !== confirmPassword || password.length < 8}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Resetting Password...
                  </>
                ) : (
                  <>
                    Reset Password
                    <ArrowRightIcon className="ml-2 h-5 w-5" />
                  </>
                )}
              </motion.button>
            </div>
            
            {/* Back to login link */}
            <div className="mt-6 text-center text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                Remember your password?{' '}
              </span>
              <Link
                href="/login"
                className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
              >
                Sign in
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center"><div className="text-gray-600 dark:text-gray-400">Loading...</div></div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}