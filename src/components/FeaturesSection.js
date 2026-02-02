'use client';

import { motion } from 'framer-motion';
import { 
  KeyIcon, 
  ShieldCheckIcon, 
  EnvelopeIcon, 
  ClockIcon,
  ArrowPathIcon,
  UserGroupIcon,
  LockClosedIcon,
  CubeIcon
} from '@heroicons/react/24/outline';

export default function FeaturesSection() {
  const features = [
    {
      name: 'PGP Key Management',
      description: 'Generate and manage OpenPGP keys directly through the secure client.',
      icon: KeyIcon,
    },
    {
      name: 'Encrypted Key Backup',
      description: 'Optional secure storage of encrypted master keys for recovery.',
      icon: ShieldCheckIcon,
    },
    {
      name: 'Disposable Email Addresses',
      description: 'Generate random addresses tied to your public key on demand.',
      icon: EnvelopeIcon,
    },
    {
      name: 'Customizable Expiration',
      description: 'Set time limits for temporary addresses to enhance privacy.',
      icon: ClockIcon,
    },
    {
      name: 'Automatic Forwarding',
      description: 'Messages arrive securely at your main account after processing.',
      icon: ArrowPathIcon,
    },
    {
      name: 'Key Verification',
      description: 'Email verification similar to keys.openpgp.org to maintain trust.',
      icon: UserGroupIcon,
    },
    {
      name: 'End-to-End Encryption',
      description: 'All communications fully encrypted for maximum security.',
      icon: LockClosedIcon,
    },
    {
      name: 'YubiKey Support',
      description: 'Hardware security through existing YubiKey integration.',
      icon: CubeIcon,
    },
  ];

  return (
    <motion.div 
      id="features"
      className="py-24 sm:py-32"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-base font-semibold leading-7 text-primary-600">Features</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            Everything you need for secure email
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
            Our privacy-focused mail service combines OpenPGP encryption with disposable
            email addresses for a comprehensive security solution.
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-4 md:grid-cols-2">
            {features.map((feature, index) => (
              <motion.div 
                key={feature.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="flex flex-col"
              >
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900 dark:text-white">
                  <feature.icon className="h-5 w-5 flex-none text-primary-600" aria-hidden="true" />
                  {feature.name}
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600 dark:text-gray-300">
                  <p className="flex-auto">{feature.description}</p>
                </dd>
              </motion.div>
            ))}
          </dl>
        </div>
      </div>
    </motion.div>
  );
}