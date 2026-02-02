'use client';

import { motion } from 'framer-motion';
import { LockClosedIcon, EnvelopeIcon, KeyIcon, ShieldCheckIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { LockClosedIcon as LockClosedSolid } from '@heroicons/react/24/solid';
import Link from 'next/link';

export default function HeroSection() {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } },
  };

  const orbitAnimation = {
    animate: {
      rotate: 360,
      transition: {
        duration: 40,
        ease: "linear",
        repeat: Infinity,
      }
    }
  };

  return (
    <div className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-b from-gray-50 to-primary-50 dark:from-gray-950 dark:to-primary-950">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        {/* Gradient Orbs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary-200 dark:bg-primary-800 rounded-full blur-3xl opacity-30"></div>
        <div className="absolute top-1/3 -left-24 w-72 h-72 bg-primary-300 dark:bg-primary-700 rounded-full blur-3xl opacity-20"></div>
        <div className="absolute bottom-0 right-1/4 w-60 h-60 bg-primary-100 dark:bg-primary-900 rounded-full blur-3xl opacity-20"></div>
        
        {/* Abstract Shapes */}
        <motion.div 
          className="absolute top-1/4 right-1/4 opacity-20 dark:opacity-10"
          animate={{ rotate: 360 }}
          transition={{ duration: 30, ease: "linear", repeat: Infinity }}
        >
          <div className="w-72 h-72 border-2 border-primary-400 dark:border-primary-700 rounded-full"></div>
        </motion.div>
        
        <motion.div 
          className="absolute top-1/3 right-1/3 opacity-20 dark:opacity-10"
          animate={{ rotate: -360 }}
          transition={{ duration: 45, ease: "linear", repeat: Infinity }}
        >
          <div className="w-96 h-96 border-2 border-primary-300 dark:border-primary-800 rounded-full"></div>
        </motion.div>
        
        {/* Grid pattern with reduced opacity */}
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-center opacity-[0.03] dark:opacity-[0.05]"></div>
      </div>

      {/* Hero Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 lg:py-40">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Side Content */}
          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="relative z-10"
          >
            <motion.div variants={item} className="mb-6">
              <span className="inline-flex items-center rounded-full bg-primary-100 dark:bg-primary-900/50 px-3 py-1.5 text-sm font-medium text-primary-800 dark:text-primary-300 shadow-sm">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 dark:bg-primary-700 mr-2">
                  <span className="text-white text-xs">✦</span>
                </span> 
                Launching Soon — Join Waitlist
              </span>
            </motion.div>
            
            <motion.h1 
              variants={item}
              className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-gray-900 dark:text-white leading-tight"
            >
              <span className="block">Private Email</span>
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-teal-500 dark:from-primary-400 dark:to-teal-300">
                Reinvented
              </span>
            </motion.h1>
            
            <motion.p 
              variants={item}
              className="mt-6 text-xl text-gray-600 dark:text-gray-300 max-w-2xl leading-relaxed"
            >
              Secure your communications with disposable email addresses, end-to-end 
              PGP encryption, and zero knowledge of your messages.
            </motion.p>
            
            <motion.div
              variants={item}
              className="mt-10 flex flex-wrap gap-4"
            >
              <Link
                href="/signup"
                className="relative inline-flex items-center justify-center px-8 py-4 font-medium text-lg text-white bg-primary-600 dark:bg-primary-700 rounded-lg shadow-lg hover:bg-primary-700 dark:hover:bg-primary-600 transition-all duration-300 group overflow-hidden"
              >
                <span className="absolute w-0 h-0 transition-all duration-500 ease-out bg-white rounded-full group-hover:w-80 group-hover:h-80 opacity-10"></span>
                <LockClosedSolid className="mr-2 h-5 w-5" />
                <span>Get Early Access</span>
              </Link>
              
              <Link
                href="#features"
                className="inline-flex items-center justify-center px-8 py-4 font-medium text-lg text-primary-700 dark:text-primary-300 bg-white dark:bg-gray-800 border border-primary-300 dark:border-primary-700 rounded-lg shadow-sm hover:bg-primary-50 dark:hover:bg-gray-700 transition-all duration-300"
              >
                Discover Features
              </Link>
            </motion.div>
            
            {/* Security Indicators */}
            <motion.div
              variants={item}
              className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800"
            >
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-200 uppercase tracking-wider mb-4">
                Privacy by Design
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-md bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300">
                    <LockClosedIcon className="h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <p className="text-base font-medium text-gray-900 dark:text-white">End-to-End Encryption</p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">OpenPGP encryption standard</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-md bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300">
                    <EnvelopeIcon className="h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <p className="text-base font-medium text-gray-900 dark:text-white">Disposable Addresses</p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Minimize tracking and exposure</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-md bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300">
                    <ShieldCheckIcon className="h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <p className="text-base font-medium text-gray-900 dark:text-white">Zero Knowledge</p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">No access to your content</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-md bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300">
                    <UserGroupIcon className="h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <p className="text-base font-medium text-gray-900 dark:text-white">Open Source</p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Transparent and auditable</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
          
          {/* Right Side - 3D visualization */}
          <motion.div 
            className="relative hidden lg:block"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            {/* Email Shield Visualization */}
            <div className="relative w-full aspect-square max-w-md mx-auto">
              {/* Central Lock Icon */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
                <div className="bg-primary-600 dark:bg-primary-500 h-20 w-20 rounded-full flex items-center justify-center shadow-lg">
                  <LockClosedSolid className="h-10 w-10 text-white" />
                </div>
              </div>
              
              {/* Inner Orbit */}
              <motion.div 
                className="absolute inset-0 flex items-center justify-center"
                {...orbitAnimation}
              >
                <div className="absolute top-0 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="bg-white dark:bg-gray-800 h-12 w-12 rounded-full flex items-center justify-center shadow-md border border-primary-200 dark:border-primary-800">
                    <EnvelopeIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                  </div>
                </div>
              </motion.div>
              
              {/* Middle Orbit */}
              <motion.div 
                className="absolute inset-0 h-64 w-64 rounded-full border-2 border-dashed border-primary-200 dark:border-primary-800 mx-auto my-auto"
                initial={{ opacity: 0.2 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 2 }}
              ></motion.div>
              
              {/* Outer Orbit with Key Icons */}
              <motion.div 
                className="absolute inset-0 h-96 w-96 rounded-full border-2 border-dashed border-primary-100 dark:border-primary-900 mx-auto my-auto"
                initial={{ opacity: 0.2 }}
                animate={{ opacity: 0.7 }}
                transition={{ duration: 2 }}
              ></motion.div>
              
              <motion.div 
                className="absolute inset-0 flex items-center justify-center"
                animate={{ rotate: -360 }}
                transition={{ duration: 60, ease: "linear", repeat: Infinity }}
              >
                <div className="absolute top-0 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="bg-white dark:bg-gray-800 h-10 w-10 rounded-full flex items-center justify-center shadow-md border border-primary-200 dark:border-primary-800">
                    <KeyIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                  </div>
                </div>
                
                <div className="absolute bottom-0 transform -translate-x-1/2 translate-y-1/2">
                  <div className="bg-white dark:bg-gray-800 h-10 w-10 rounded-full flex items-center justify-center shadow-md border border-primary-200 dark:border-primary-800">
                    <ShieldCheckIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                  </div>
                </div>
                
                <div className="absolute left-0 transform -translate-x-1/2">
                  <div className="bg-white dark:bg-gray-800 h-10 w-10 rounded-full flex items-center justify-center shadow-md border border-primary-200 dark:border-primary-800">
                    <EnvelopeIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                  </div>
                </div>
                
                <div className="absolute right-0 transform translate-x-1/2">
                  <div className="bg-white dark:bg-gray-800 h-10 w-10 rounded-full flex items-center justify-center shadow-md border border-primary-200 dark:border-primary-800">
                    <LockClosedIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                  </div>
                </div>
              </motion.div>
              
              {/* Shield Glow Effect */}
              <div className="absolute inset-0 rounded-full bg-primary-500/10 dark:bg-primary-500/5 blur-2xl z-[-1]"></div>
            </div>
            
            {/* Stats Display */}
            <div className="absolute -bottom-4 right-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 border border-gray-100 dark:border-gray-700">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Protected Messages</div>
              <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">100% Encrypted</div>
            </div>
            
            <div className="absolute -bottom-4 left-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 border border-gray-100 dark:border-gray-700">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Data Mining</div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">Zero Tracking</div>
            </div>
          </motion.div>
        </div>
      </div>
      
      {/* Floating Card */}
      <motion.div 
        className="absolute bottom-6 left-1/2 transform -translate-x-1/2 w-full max-w-md mx-auto hidden lg:block"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1.2 }}
      >
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-5 border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="bg-primary-100 dark:bg-primary-900/50 p-2 rounded-full">
                <ShieldCheckIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Trusted by Security Experts</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Join thousands of privacy-focused users</p>
              </div>
            </div>
            <Link 
              href="/security" 
              className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
            >
              Learn more
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}