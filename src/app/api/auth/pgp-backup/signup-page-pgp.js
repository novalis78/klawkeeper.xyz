'use client';

import { useState, useEffect } from 'react';
import { 
  ArrowRightIcon, 
  LockClosedIcon, 
  CheckIcon, 
  AtSymbolIcon,
  ExclamationCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  // Fixed domain for signup
  const domain = 'keykeeper.world';
  
  // Check username availability with debounce
  useEffect(() => {
    if (username.length < 3) {
      setIsAvailable(null);
      return;
    }
    
    const timeoutId = setTimeout(() => {
      checkUsernameAvailability(username, domain);
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [username]);
  
  const checkUsernameAvailability = async (username, domain) => {
    setIsChecking(true);
    setError(null);
    
    try {
      // In a real implementation, this would be an API call
      // For mock data, we'll pretend certain usernames are taken
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const takenUsernames = ['admin', 'info', 'test', 'user', 'support', 'hello'];
      const isUsernameTaken = takenUsernames.includes(username.toLowerCase());
      
      setIsAvailable(!isUsernameTaken);
    } catch (err) {
      console.error('Error checking username availability:', err);
      setError('Failed to check username availability. Please try again.');
    } finally {
      setIsChecking(false);
    }
  };
  
  const handleUsernameChange = (e) => {
    // Only allow alphanumeric characters, dots, underscores, and hyphens
    const sanitizedValue = e.target.value.replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase();
    setUsername(sanitizedValue);
  };
  
  // Domain is fixed to keykeeper.world
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!username || username.length < 3 || !isAvailable || !agreedToTerms) {
      return;
    }
    
    setLoading(true);
    
    try {
      // Store the email choice in localStorage for the next step
      localStorage.setItem('signup_data', JSON.stringify({
        email: `${username}@${domain}`,
        step: 'email_selected'
      }));
      
      // Redirect to key generation page
      router.push('/signup/key-setup');
    } catch (error) {
      console.error('Error saving data:', error);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Logo and brand */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex justify-center">
          <span className="sr-only">KeyKeeper</span>
          <div className="h-20 w-20 rounded-full bg-gradient-to-r from-primary-600 to-primary-500 flex items-center justify-center shadow-lg shadow-primary-500/20 hover:shadow-primary-500/40 transition-all duration-300">
            <LockClosedIcon className="h-10 w-10 text-white" />
          </div>
        </Link>
        <h1 className="mt-6 text-center text-5xl font-extrabold text-white">
          KeyKeeper<span className="text-primary-400">.world</span>
        </h1>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white dark:bg-gray-800 py-10 px-8 shadow-2xl sm:rounded-2xl border border-gray-100 dark:border-gray-700 backdrop-blur-lg bg-opacity-95 dark:bg-opacity-90">
          <form onSubmit={handleSubmit}>
            <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-8">
              Choose Your Email Address
            </h2>
            
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
            
            <div className="space-y-6">
              {/* Email input with domain selection */}
              <div>
                <label htmlFor="username" className="block text-lg font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Your New Email Address
                </label>
                <div className="flex rounded-lg shadow-sm">
                  <div className="relative flex items-stretch flex-grow focus-within:z-10">
                    <input
                      type="text"
                      id="username"
                      name="username"
                      value={username}
                      onChange={handleUsernameChange}
                      className="pl-4 block w-full rounded-l-lg border-0 py-4 text-lg text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-primary-500 dark:focus:ring-primary-400 transition-all duration-200 bg-white dark:bg-gray-800 dark:bg-opacity-80"
                      placeholder="username"
                      autoComplete="off"
                      autoFocus
                    />
                  </div>
                  <div className="flex items-center px-4 py-4 text-lg font-medium text-gray-700 dark:text-gray-300 rounded-r-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 whitespace-nowrap">
                    @keykeeper.world
                  </div>
                </div>
                
                {/* Availability indicator */}
                {username.length > 0 && (
                  <div className="mt-2">
                    {username.length < 3 ? (
                      <p className="text-sm text-amber-500 dark:text-amber-400 pl-1">
                        Username must be at least 3 characters
                      </p>
                    ) : isChecking ? (
                      <div className="flex items-center pl-1">
                        <div className="animate-spin h-4 w-4 border-t-2 border-primary-500 rounded-full mr-2" />
                        <span className="text-sm text-gray-500 dark:text-gray-400">Checking availability...</span>
                      </div>
                    ) : isAvailable ? (
                      <div className="flex items-center text-green-600 dark:text-green-500 pl-1">
                        <CheckIcon className="h-4 w-4 mr-2" />
                        <span className="text-sm">Available!</span>
                      </div>
                    ) : isAvailable === false ? (
                      <div className="flex items-center text-red-600 dark:text-red-500 pl-1">
                        <XMarkIcon className="h-4 w-4 mr-2" />
                        <span className="text-sm">This username is not available</span>
                      </div>
                    ) : null}
                  </div>
                )}
                
                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 pl-1">
                  Choose a unique username for your secure email address. Only lowercase letters, numbers, dots, 
                  underscores, and hyphens are allowed.
                </p>
              </div>
              
              {/* Terms checkbox */}
              <div className="flex items-center pt-3">
                <input
                  id="terms"
                  name="terms"
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  required
                  className="h-5 w-5 text-primary-500 focus:ring-primary-400 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 border-gray-300 dark:border-gray-600 rounded transition-all duration-200"
                />
                <div className="ml-3 text-sm">
                  <label htmlFor="terms" className="font-medium text-gray-700 dark:text-gray-200">
                    I agree to the <span className="text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 cursor-pointer underline underline-offset-2">Terms of Service</span> and <span className="text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 cursor-pointer underline underline-offset-2">Privacy Policy</span>
                  </label>
                </div>
              </div>
              
              {/* Continue button */}
              <div className="mt-8">
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center justify-center px-6 py-4 border border-transparent text-base font-medium rounded-lg shadow-lg text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 dark:from-primary-600 dark:to-primary-500 dark:hover:from-primary-500 dark:hover:to-primary-400 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-primary-600 disabled:hover:to-primary-500"
                  disabled={loading || username.length < 3 || !isAvailable || !agreedToTerms}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>
                      Continue to Security Setup
                      <ArrowRightIcon className="ml-2 h-5 w-5" />
                    </>
                  )}
                </motion.button>
              </div>
              
              {/* Login link */}
              <div className="mt-4 text-center text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  Already have an account?{' '}
                </span>
                <Link
                  href="/login"
                  className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}