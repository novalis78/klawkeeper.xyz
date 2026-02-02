'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Disclosure } from '@headlessui/react';
import { Bars3Icon, XMarkIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

export default function NavBar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navigation = [
    { name: 'Features', href: '#features' },
    { name: 'Security', href: '#security' },
    { name: 'Pricing', href: '#pricing' },
    { name: 'Documentation', href: '#docs' },
  ];

  return (
    <Disclosure as="nav" 
      className={`fixed w-full z-10 transition-all duration-300 ${
        scrolled ? 'bg-white/80 dark:bg-primary-950/80 backdrop-blur shadow-md' : 'bg-transparent'
      }`}
    >
      {({ open }) => (
        <>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 justify-between">
              <div className="flex">
                <div className="flex flex-shrink-0 items-center">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="flex items-center"
                  >
                    <LockClosedIcon className="h-8 w-8 text-primary-600" />
                    <span className="ml-2 text-xl font-bold text-primary-800 dark:text-white">KeyKeeper.world</span>
                  </motion.div>
                </div>
                <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                  {navigation.map((item) => (
                    <a
                      key={item.name}
                      href={item.href}
                      className="inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-sm font-medium text-gray-500 hover:border-primary-500 hover:text-primary-700 transition-colors"
                    >
                      {item.name}
                    </a>
                  ))}
                </div>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:items-center">
                <Link
                  href="/login"
                  className="btn-secondary mr-2"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="btn-primary"
                >
                  Sign up
                </Link>
              </div>
              <div className="-mr-2 flex items-center sm:hidden">
                <Disclosure.Button className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500">
                  <span className="sr-only">Open main menu</span>
                  {open ? (
                    <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                  ) : (
                    <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                  )}
                </Disclosure.Button>
              </div>
            </div>
          </div>

          <Disclosure.Panel className="sm:hidden">
            <div className="space-y-1 pt-2 pb-3">
              {navigation.map((item) => (
                <Disclosure.Button
                  key={item.name}
                  as="a"
                  href={item.href}
                  className="block border-l-4 border-transparent py-2 pl-3 pr-4 text-base font-medium text-gray-500 hover:border-primary-500 hover:bg-gray-50 hover:text-primary-700"
                >
                  {item.name}
                </Disclosure.Button>
              ))}
            </div>
            <div className="border-t border-gray-200 pt-4 pb-3">
              <div className="flex items-center px-4">
                <Link
                  href="/login"
                  className="block text-center w-full px-4 py-2 text-base font-medium text-primary-700 hover:bg-gray-100 mb-2"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="block text-center w-full px-4 py-2 text-base font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md"
                >
                  Sign up
                </Link>
              </div>
            </div>
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
}