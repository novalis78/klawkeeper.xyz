'use client';

import { motion } from 'framer-motion';
import { LockClosedIcon, EyeSlashIcon, NoSymbolIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

export default function SecuritySection() {
  const securityFeatures = [
    {
      title: 'End-to-End Encryption',
      description: 'All messages are encrypted using OpenPGP standards, ensuring that only the intended recipient can read the content.',
      icon: LockClosedIcon,
    },
    {
      title: 'Metadata Protection',
      description: 'Disposable email addresses help minimize tracking and protect your identity when communicating with various services.',
      icon: EyeSlashIcon,
    },
    {
      title: 'Zero Access',
      description: 'We have zero access to your message contents due to our encryption architecture. Your privacy is guaranteed by design.',
      icon: NoSymbolIcon,
    },
    {
      title: 'Open Source',
      description: 'Our codebase is open source, allowing security researchers to validate our security claims and identify vulnerabilities.',
      icon: ShieldCheckIcon,
    },
  ];

  return (
    <motion.div
      id="security"
      className="py-24 sm:py-32 bg-primary-50 dark:bg-primary-900/50"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-base font-semibold leading-7 text-primary-600 dark:text-primary-300">Security First</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            Built with privacy at its core
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
            KeyKeeper.world is designed from the ground up with security best practices and privacy-preserving technologies.
          </p>
        </div>

        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
            {securityFeatures.map((feature, index) => (
              <motion.div
                key={feature.title}
                className="relative rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-primary-800/30 p-8 shadow-sm"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-800 text-primary-600 dark:text-primary-200">
                  <feature.icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{feature.title}</h3>
                <p className="mt-4 text-base text-gray-600 dark:text-gray-300">{feature.description}</p>
              </motion.div>
            ))}
          </div>

          <motion.div
            className="mt-16 rounded-2xl bg-primary-600 p-8 md:p-12 text-white shadow-lg"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="md:flex md:items-start md:justify-between">
              <div>
                <h3 className="text-2xl font-bold">Our Security Promise</h3>
                <p className="mt-4 max-w-2xl text-primary-100">
                  We believe that privacy is a fundamental right. That's why we've built KeyKeeper.world with a zero-knowledge architecture
                  that makes it mathematically impossible for us to access your messages.
                </p>
              </div>
              <div className="mt-6 md:mt-0 md:ml-12">
                <a
                  href="#security-whitepaper"
                  className="inline-flex items-center rounded-md border border-white bg-transparent px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
                >
                  Security Whitepaper
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}