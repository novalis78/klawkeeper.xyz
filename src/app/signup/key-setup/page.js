'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowRightIcon, 
  LockClosedIcon, 
  KeyIcon, 
  ComputerDesktopIcon,
  ShieldCheckIcon,
  ArrowLeftIcon,
  ExclamationCircleIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import pgpUtils from '@/lib/auth/pgp';

export default function KeySetupPage() {
  const router = useRouter();
  const [selectedOption, setSelectedOption] = useState(null);
  const [step, setStep] = useState(1); // 1: options, 2: process specific option, 3: success
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [generatedKey, setGeneratedKey] = useState(null);
  const [signupData, setSignupData] = useState(null);
  const [displayName, setDisplayName] = useState('');
  
  // Check if we have signup data from the previous step
  useEffect(() => {
    try {
      const savedData = localStorage.getItem('signup_data');
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        if (parsedData.email && parsedData.step === 'email_selected') {
          setSignupData(parsedData);
        } else {
          // If data is incomplete or step is wrong, redirect back to signup
          router.push('/signup');
        }
      } else {
        // No signup data, redirect back to signup
        router.push('/signup');
      }
    } catch (err) {
      console.error('Error loading saved signup data:', err);
      router.push('/signup');
    }
  }, [router]);
  
  const handleOptionSelect = (option) => {
    setSelectedOption(option);
  };
  
  const handleContinue = () => {
    if (!selectedOption) return;
    
    setStep(2);
  };
  
  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    } else {
      router.push('/signup');
    }
  };
  
  const handleGenerateKey = async () => {
    if (!signupData || !signupData.email) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Generate key using the pgpUtils library
      const email = signupData.email;
      const name = displayName || email.split('@')[0]; // Use username as name if no display name
      
      const key = await pgpUtils.generateKey(name, email);
      setGeneratedKey(key);
      
      // Update signup data in localStorage
      localStorage.setItem('signup_data', JSON.stringify({
        ...signupData,
        step: 'key_generated',
        publicKey: key.publicKey,
        keyId: key.keyId,
        fingerprint: key.fingerprint,
        name: name,
        authMethod: 'browser'
      }));
      
      // Move to success step
      setStep(3);
    } catch (error) {
      console.error('Error generating key:', error);
      setError('Failed to generate your encryption key. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDownloadKey = () => {
    if (!generatedKey || !signupData) return;
    
    // Create a Blob containing the private key
    const blob = new Blob([generatedKey.privateKey], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    // Create a temporary link element and trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = `keykeeper_${signupData.email.split('@')[0]}_private.asc`;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };
  
  const handleUploadKeySubmit = () => {
    // Mock for now - this would process the uploaded key
    // and move to success screen
    setError('Public key upload is not yet implemented.');
  };
  
  const handleYubikeySubmit = () => {
    // Mock for now - this would interface with YubiKey
    // and move to success screen
    setError('YubiKey integration is not yet implemented.');
  };
  
  const handleCompleteSetup = async () => {
    if (!generatedKey || !signupData) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Submit registration to the API
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: signupData.email,
          name: displayName || signupData.email.split('@')[0],
          publicKey: generatedKey.publicKey,
          keyId: generatedKey.keyId,
          fingerprint: generatedKey.fingerprint,
          authMethod: 'browser'
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to register');
      }
      
      // Store session data
      if (data.userId) {
        try {
          localStorage.setItem('userId', data.userId);
          localStorage.setItem('userEmail', signupData.email);
        } catch (err) {
          console.error('Error saving user session data:', err);
        }
      }
      
      // Redirect to dashboard with new_account flag
      router.push('/dashboard?new_account=true');
    } catch (error) {
      console.error('Registration error:', error);
      setError(error.message || 'Failed to complete registration. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const renderOptionsStep = () => (
    <div>
      <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">
        Choose Your Security Method
      </h2>
      <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
        Select how you want to secure your KeyKeeper account
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Option 1: Generate New Key */}
        <motion.div 
          className={`border ${
            selectedOption === 'generate' 
              ? 'border-primary-500 dark:border-primary-400 ring-2 ring-primary-500/50 dark:ring-primary-400/50' 
              : 'border-gray-200 dark:border-gray-700'
          } rounded-xl p-6 cursor-pointer hover:border-primary-500 dark:hover:border-primary-400 transition-all duration-200 bg-white dark:bg-gray-800`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleOptionSelect('generate')}
        >
          <div className="flex flex-col items-center text-center">
            <div className={`rounded-full p-4 ${
              selectedOption === 'generate' 
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' 
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}>
              <KeyIcon className="h-8 w-8" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
              Generate New Key
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              We'll create a new PGP key pair for you. Fast, simple, and secure.
            </p>
            <div className="mt-4 text-xs text-gray-400 dark:text-gray-500">
              Recommended for most users
            </div>
          </div>
        </motion.div>
        
        {/* Option 2: Upload Existing Key */}
        <motion.div 
          className={`border ${
            selectedOption === 'upload' 
              ? 'border-primary-500 dark:border-primary-400 ring-2 ring-primary-500/50 dark:ring-primary-400/50' 
              : 'border-gray-200 dark:border-gray-700'
          } rounded-xl p-6 cursor-pointer hover:border-primary-500 dark:hover:border-primary-400 transition-all duration-200 bg-white dark:bg-gray-800`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleOptionSelect('upload')}
        >
          <div className="flex flex-col items-center text-center">
            <div className={`rounded-full p-4 ${
              selectedOption === 'upload' 
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' 
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}>
              <ComputerDesktopIcon className="h-8 w-8" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
              Use Existing Key
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Already have a PGP key? Use it with KeyKeeper for a seamless experience.
            </p>
            <div className="mt-4 text-xs text-gray-400 dark:text-gray-500">
              Best for PGP enthusiasts
            </div>
          </div>
        </motion.div>
        
        {/* Option 3: Use YubiKey */}
        <motion.div 
          className={`border ${
            selectedOption === 'yubikey' 
              ? 'border-primary-500 dark:border-primary-400 ring-2 ring-primary-500/50 dark:ring-primary-400/50' 
              : 'border-gray-200 dark:border-gray-700'
          } rounded-xl p-6 cursor-pointer hover:border-primary-500 dark:hover:border-primary-400 transition-all duration-200 bg-white dark:bg-gray-800`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleOptionSelect('yubikey')}
        >
          <div className="flex flex-col items-center text-center">
            <div className={`rounded-full p-4 ${
              selectedOption === 'yubikey' 
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' 
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}>
              <ShieldCheckIcon className="h-8 w-8" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
              Use YubiKey
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Connect your YubiKey for ultimate security with hardware-based protection.
            </p>
            <div className="mt-4 text-xs text-gray-400 dark:text-gray-500">
              Most secure option
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
  
  const renderGenerateKeyStep = () => (
    <div>
      <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">
        Generate Your PGP Key
      </h2>
      <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
        We'll create a secure encryption key for {signupData?.email}
      </p>
      
      <div className="max-w-lg mx-auto">
        <div className="mb-6">
          <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Your Display Name (Optional)
          </label>
          <input
            type="text"
            id="displayName"
            name="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="block w-full rounded-lg border-0 py-3 px-4 text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-primary-500 dark:focus:ring-primary-400 transition-all duration-200 bg-white dark:bg-gray-800"
            placeholder="Your full name (optional)"
          />
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            This name will be included in your PGP key to help others verify your identity.
          </p>
        </div>
        
        <div className="bg-primary-50 dark:bg-primary-900/10 rounded-lg border border-primary-100 dark:border-primary-800 p-4 mb-6">
          <h3 className="text-sm font-medium text-primary-800 dark:text-primary-300 mb-2">
            About PGP Keys
          </h3>
          <ul className="list-disc pl-5 text-xs text-primary-700 dark:text-primary-400">
            <li>Your public key will be used to encrypt emails sent to you</li>
            <li>Your private key will never leave your device</li>
            <li>We'll help you securely back up your private key</li>
            <li>You'll need your private key to sign in to KeyKeeper</li>
          </ul>
        </div>
      </div>
    </div>
  );
  
  const renderUploadKeyStep = () => (
    <div>
      <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">
        Use Your Existing PGP Key
      </h2>
      <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
        Upload your public key to use with {signupData?.email}
      </p>
      
      <div className="max-w-lg mx-auto">
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
          <div className="space-y-4">
            <KeyIcon className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto" />
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <label htmlFor="file-upload" className="cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500">
                <span>Upload your public key</span>
                <input id="file-upload" name="file-upload" type="file" className="sr-only" />
              </label>
              <p className="pl-1">or drag and drop (.asc or .gpg file)</p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">PGP public key only</p>
          </div>
        </div>
        
        <div className="bg-yellow-50 dark:bg-yellow-900/10 rounded-lg border border-yellow-100 dark:border-yellow-800 p-4 mt-6">
          <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-2">
            Important Note
          </h3>
          <p className="text-xs text-yellow-700 dark:text-yellow-400">
            Make sure the email address in your PGP key matches {signupData?.email} exactly. Other email addresses in the key won't work with this account.
          </p>
        </div>
      </div>
    </div>
  );
  
  const renderYubikeyStep = () => (
    <div>
      <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">
        Set Up YubiKey Protection
      </h2>
      <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
        Connect your YubiKey to secure {signupData?.email}
      </p>
      
      <div className="max-w-lg mx-auto">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
          <ShieldCheckIcon className="h-16 w-16 text-primary-500 dark:text-primary-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Insert Your YubiKey
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Please insert your YubiKey into a USB port on your device and make sure it's ready to use.
          </p>
          <div className="animate-pulse inline-block w-8 h-8 rounded-full bg-green-100 dark:bg-green-900"></div>
          <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            Waiting for your YubiKey...
          </p>
        </div>
        
        <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-800 p-4 mt-6">
          <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
            How It Works
          </h3>
          <ul className="list-disc pl-5 text-xs text-blue-700 dark:text-blue-400 space-y-1">
            <li>Your YubiKey stores your private key securely</li>
            <li>You'll need your YubiKey to sign in to KeyKeeper</li>
            <li>The private key never leaves your YubiKey device</li>
            <li>This provides the highest level of security for your email</li>
          </ul>
        </div>
      </div>
    </div>
  );
  
  const renderSuccessStep = () => (
    <div>
      <div className="text-center">
        <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-green-100 dark:bg-green-900 mb-6">
          <CheckIcon className="h-10 w-10 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Your Key Is Ready!
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
          Your secure PGP key for {signupData?.email} has been generated successfully.
        </p>
      </div>
      
      <div className="max-w-lg mx-auto">
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-6">
          <div className="text-sm font-mono overflow-hidden">
            <div className="mb-2">
              <span className="text-gray-500 dark:text-gray-400">Key ID:</span>{' '}
              <span className="text-gray-900 dark:text-gray-100">{generatedKey?.keyId}</span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Fingerprint:</span>{' '}
              <span className="text-gray-900 dark:text-gray-100">{generatedKey?.fingerprint}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-800 p-4 rounded-lg mb-6">
          <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-2">
            Important Security Step
          </h3>
          <p className="text-xs text-yellow-700 dark:text-yellow-400">
            Please download your private key now. This is the only time you'll be able to download it.
            You'll need this key to sign in to your account.
          </p>
        </div>
        
        <button
          type="button"
          onClick={handleDownloadKey}
          className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 dark:bg-primary-600 dark:hover:bg-primary-500 mb-4"
        >
          <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
          Download Private Key
        </button>
        
        <p className="mb-6 text-xs text-center text-red-600 dark:text-red-400">
          🚨 Without this key, you will not be able to access your account!
        </p>
      </div>
    </div>
  );
  
  const renderCurrentStep = () => {
    if (step === 1) {
      return renderOptionsStep();
    }
    
    if (step === 2) {
      if (selectedOption === 'generate') {
        return renderGenerateKeyStep();
      } else if (selectedOption === 'upload') {
        return renderUploadKeyStep();
      } else if (selectedOption === 'yubikey') {
        return renderYubikeyStep();
      }
    }
    
    if (step === 3) {
      return renderSuccessStep();
    }
    
    return null;
  };
  
  const renderActionButtons = () => {
    if (step === 1) {
      return (
        <div className="flex justify-between">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back
          </button>
          
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 dark:from-primary-600 dark:to-primary-500 dark:hover:from-primary-500 dark:hover:to-primary-400 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleContinue}
            disabled={!selectedOption}
          >
            Continue
            <ArrowRightIcon className="ml-2 h-5 w-5" />
          </motion.button>
        </div>
      );
    }
    
    if (step === 2) {
      return (
        <div className="flex justify-between">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back
          </button>
          
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 dark:from-primary-600 dark:to-primary-500 dark:hover:from-primary-500 dark:hover:to-primary-400 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={
              selectedOption === 'generate' 
                ? handleGenerateKey 
                : selectedOption === 'upload' 
                ? handleUploadKeySubmit 
                : handleYubikeySubmit
            }
            disabled={loading}
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
                {selectedOption === 'generate' ? 'Generate Key' : selectedOption === 'upload' ? 'Upload Key' : 'Connect YubiKey'}
                <ArrowRightIcon className="ml-2 h-5 w-5" />
              </>
            )}
          </motion.button>
        </div>
      );
    }
    
    if (step === 3) {
      return (
        <div className="flex justify-center">
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 dark:from-primary-600 dark:to-primary-500 dark:hover:from-primary-500 dark:hover:to-primary-400 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleCompleteSetup}
            disabled={loading}
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
              'Complete Setup & Go to Inbox'
            )}
          </motion.button>
        </div>
      );
    }
    
    return null;
  };

  // If no signup data, show loading
  if (!signupData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="animate-pulse flex justify-center">
            <div className="h-20 w-20 rounded-full bg-gray-700"></div>
          </div>
          <div className="animate-pulse mt-6 h-8 bg-gray-700 rounded max-w-xs mx-auto"></div>
        </div>
      </div>
    );
  }
  
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

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-3xl">
        <div className="bg-white dark:bg-gray-800 py-10 px-8 shadow-2xl sm:rounded-2xl border border-gray-100 dark:border-gray-700 backdrop-blur-lg bg-opacity-95 dark:bg-opacity-90">
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
          
          {/* Current email display */}
          <div className="mb-8 flex justify-center">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm">
              <span className="font-medium">{signupData.email}</span>
            </div>
          </div>
          
          {/* Progress steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary-600 text-white">
                  <CheckIcon className="h-6 w-6" />
                </div>
                <span className="mt-2 text-xs text-gray-500 dark:text-gray-400">Email Address</span>
              </div>
              
              <div className="flex-1 h-1 mx-2 bg-primary-600"></div>
              
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  step >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                }`}>
                  <KeyIcon className="h-6 w-6" />
                </div>
                <span className="mt-2 text-xs text-gray-500 dark:text-gray-400">Security Setup</span>
              </div>
              
              <div className={`flex-1 h-1 mx-2 ${
                step >= 3 ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'
              }`}></div>
              
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  step >= 3 ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                }`}>
                  <CheckIcon className="h-6 w-6" />
                </div>
                <span className="mt-2 text-xs text-gray-500 dark:text-gray-400">Complete</span>
              </div>
            </div>
          </div>
          
          <AnimatePresence mode="wait">
            <motion.div
              key={`step-${step}-${selectedOption || 'none'}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderCurrentStep()}
            </motion.div>
          </AnimatePresence>
          
          <div className="mt-8">
            {renderActionButtons()}
          </div>
        </div>
      </div>
    </div>
  );
}