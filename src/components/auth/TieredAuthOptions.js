'use client';

import { useState } from 'react';
import { LockClosedIcon, KeyIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { LockClosedIcon as LockClosedSolid } from '@heroicons/react/24/solid';
import { motion } from 'framer-motion';

export default function TieredAuthOptions({ onOptionSelect }) {
  const [selectedOption, setSelectedOption] = useState(null);
  
  const handleSelect = (option) => {
    setSelectedOption(option);
    if (onOptionSelect) onOptionSelect(option);
  };
  
  const options = [
    {
      id: 'browser-key',
      name: 'Browser-Generated Key',
      description: 'Quick setup with a key generated in your browser. Good for trying the service.',
      securityLevel: 'Basic',
      icon: LockClosedIcon,
      details: 'Your key will be generated right in this browser. You must download and save this key securely to sign in later.',
      recommended: false,
      buttonText: 'Generate Key in Browser',
      tier: 1
    },
    {
      id: 'password-manager',
      name: 'Password Manager Integration',
      description: 'Store your key in a password manager like Bitwarden or 1Password for better security.',
      securityLevel: 'Recommended',
      icon: KeyIcon,
      details: 'We will guide you through saving your key in your password manager for convenient and secure access.',
      recommended: true,
      buttonText: 'Use Password Manager',
      tier: 2
    },
    {
      id: 'hardware-key',
      name: 'Hardware Security Key',
      description: 'Maximum security using YubiKey or other hardware security devices.',
      securityLevel: 'Advanced',
      icon: ShieldCheckIcon,
      details: 'Connect your YubiKey or other security key to manage your encryption keys with the highest level of protection.',
      recommended: false,
      buttonText: 'Use Hardware Key',
      tier: 3
    }
  ];
  
  // Detect if Bitwarden extension is present
  const detectBitwarden = () => {
    // Simple detection - will need enhancement for production
    const bitwardenElements = document.querySelectorAll('[data-testid="bitwarden"]');
    return bitwardenElements.length > 0 || window.bitwardenAutofill !== undefined;
  };
  
  // Check if WebAuthn/FIDO2 is supported for hardware keys
  const isWebAuthnSupported = () => {
    return window.PublicKeyCredential !== undefined;
  };
  
  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Choose Your Security Level</h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Select how you'd like to secure your KeyKeeper account. Each option offers different levels of security and convenience.
        </p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-3">
        {options.map((option) => (
          <motion.div
            key={option.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`relative rounded-xl border ${
              selectedOption === option.id 
                ? 'border-primary-500 ring-2 ring-primary-500 shadow-lg' 
                : 'border-gray-200 dark:border-gray-700 shadow'
            } bg-white dark:bg-gray-800 p-6 cursor-pointer`}
            onClick={() => handleSelect(option.id)}
          >
            {option.recommended && (
              <span className="absolute -top-3 left-1/2 transform -translate-x-1/2 inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-300">
                Recommended
              </span>
            )}
            
            <div className="flex justify-center">
              <div className={`p-3 rounded-full ${
                selectedOption === option.id 
                  ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}>
                <option.icon className="h-6 w-6" />
              </div>
            </div>
            
            <h3 className="mt-4 text-center text-lg font-medium text-gray-900 dark:text-white">
              {option.name}
            </h3>
            
            <div className="mt-1 text-center text-sm font-medium text-primary-600 dark:text-primary-400">
              {option.securityLevel} Security
            </div>
            
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 text-center">
              {option.description}
            </p>
            
            <div className="mt-5">
              <button
                type="button"
                className={`w-full py-2 px-4 border rounded-md shadow-sm text-sm font-medium ${
                  selectedOption === option.id 
                    ? 'border-transparent text-white bg-primary-600 hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-600' 
                    : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(option.id);
                }}
              >
                {option.buttonText}
              </button>
            </div>
            
            {selectedOption === option.id && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-4"
              >
                {option.details}
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>
      
      {detectBitwarden() && selectedOption === 'password-manager' && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800"
        >
          <div className="flex items-center">
            <LockClosedSolid className="h-5 w-5 text-green-500 dark:text-green-400 mr-2" />
            <p className="text-sm text-green-700 dark:text-green-300">
              Bitwarden detected! We'll help you save your key securely in your password manager.
            </p>
          </div>
        </motion.div>
      )}
      
      {!isWebAuthnSupported() && selectedOption === 'hardware-key' && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800"
        >
          <div className="flex items-center">
            <LockClosedSolid className="h-5 w-5 text-yellow-500 dark:text-yellow-400 mr-2" />
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              Your browser doesn't appear to support WebAuthn for hardware security keys. Try using a modern browser like Chrome, Edge, or Firefox.
            </p>
          </div>
        </motion.div>
      )}
      
      <div className="mt-8 text-center">
        <button
          type="button"
          className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm ${
            selectedOption 
              ? 'text-white bg-primary-600 hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-600' 
              : 'text-gray-400 bg-gray-200 dark:bg-gray-700 cursor-not-allowed'
          }`}
          disabled={!selectedOption}
          onClick={() => selectedOption && onOptionSelect(selectedOption)}
        >
          Continue with Selected Option
        </button>
      </div>
    </div>
  );
}