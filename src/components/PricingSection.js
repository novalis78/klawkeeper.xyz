'use client';

import { motion } from 'framer-motion';
import { CheckIcon } from '@heroicons/react/20/solid';
import Link from 'next/link';

export default function PricingSection() {
  const tiers = [
    {
      name: 'Free Trial',
      id: 'tier-free',
      price: {
        monthly: '$0',
        annually: '$0',
      },
      description: 'Try KeyKeeper with basic features at no cost.',
      features: [
        '100 emails max inbox capacity',
        '100MB storage',
        'Basic encryption features',
        'KeyKeeper branding in email footer',
        'Community support',
      ],
      cta: 'Start for free',
      mostPopular: false,
    },
    {
      name: 'Bitcoin Plan',
      id: 'tier-bitcoin',
      price: {
        monthly: '$30',
        annually: 'for 3 years',
      },
      description: 'Privacy-focused payment for 3 years (only $0.85/month).',
      features: [
        'Full features for 3 years',
        '1GB storage',
        'Advanced encryption features',
        'No KeyKeeper branding in emails',
        'Priority message routing',
        'Regular updates for 3 years',
        'Community support',
      ],
      cta: 'Pay with Bitcoin',
      mostPopular: true,
    },
    {
      name: 'Card Plan',
      id: 'tier-card',
      price: {
        monthly: '$4.99',
        annually: '$49.99',
      },
      description: 'Monthly subscription with credit card for privacy enthusiasts.',
      features: [
        'Unlimited disposable email addresses',
        '1GB storage',
        'Advanced encryption features',
        'No KeyKeeper branding in emails',
        'Priority message routing',
        'Extended address lifetime options',
        'Priority support',
      ],
      cta: 'Pay with Card',
      mostPopular: false,
    },
  ];

  return (
    <motion.div
      id="pricing"
      className="py-24 sm:py-32"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-base font-semibold leading-7 text-primary-600">Pricing</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            Simple, transparent pricing
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
            Choose the plan that's right for your privacy needs. All plans include our core security features.
          </p>
        </div>

        <div className="isolate mx-auto mt-16 grid max-w-md grid-cols-1 gap-8 md:max-w-2xl md:grid-cols-2 lg:max-w-4xl xl:mx-0 xl:max-w-none xl:grid-cols-3">
          {tiers.map((tier, tierIdx) => (
            <motion.div
              key={tier.id}
              className={`${tier.mostPopular ? 'ring-2 ring-primary-600' : 'ring-1 ring-gray-200 dark:ring-gray-800'} rounded-3xl p-8 shadow-sm bg-white dark:bg-gray-900`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: tierIdx * 0.1 }}
            >
              <div className="flex items-center justify-between gap-x-4">
                <h3 className="text-lg font-semibold leading-8 text-gray-900 dark:text-white">
                  {tier.name}
                  {tier.name === 'Bitcoin Plan' && (
                    <span className="ml-2 inline-block">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="#f7931a" className="inline-block">
                        <path d="M23.638 14.904c-1.602 6.43-8.113 10.34-14.542 8.736C2.67 22.05-1.244 15.525.362 9.105 1.962 2.67 8.475-1.243 14.9.358c6.43 1.605 10.342 8.115 8.738 14.548v-.002zm-6.35-4.613c.24-1.59-.974-2.45-2.64-3.03l.54-2.153-1.315-.33-.525 2.107c-.345-.087-.705-.167-1.064-.25l.526-2.127-1.32-.33-.54 2.165c-.285-.067-.565-.132-.84-.2l-1.815-.45-.35 1.407s.975.225.955.236c.535.136.63.486.615.766l-1.477 5.92c-.075.166-.24.406-.614.314.015.02-.96-.24-.96-.24l-.66 1.51 1.71.426.93.242-.54 2.19 1.32.327.54-2.17c.36.1.705.19 1.05.273l-.51 2.154 1.32.33.545-2.19c2.24.427 3.93.257 4.64-1.774.57-1.637-.03-2.58-1.217-3.196.854-.193 1.5-.76 1.68-1.93h.01zm-3.01 4.22c-.404 1.64-3.157.75-4.05.53l.72-2.9c.896.23 3.757.67 3.33 2.37zm.41-4.24c-.37 1.49-2.662.735-3.405.55l.654-2.64c.744.18 3.137.524 2.75 2.084v.006z" />
                      </svg>
                    </span>
                  )}
                </h3>
                {tier.mostPopular ? (
                  <p className="rounded-full bg-primary-600/10 px-2.5 py-1 text-xs font-semibold leading-5 text-primary-600">
                    Most popular
                  </p>
                ) : null}
              </div>
              <p className="mt-4 text-sm leading-6 text-gray-600 dark:text-gray-300">{tier.description}</p>
              <p className="mt-6 flex items-baseline gap-x-1">
                <span className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">{tier.price.monthly}</span>
                <span className="text-sm font-semibold leading-6 text-gray-600 dark:text-gray-300">
                  {tier.name === 'Bitcoin Plan' ? '' : tier.price.monthly !== 'Custom' ? '/month' : ''}
                </span>
              </p>
              <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-400">
                {tier.name === 'Bitcoin Plan' 
                  ? 'One-time payment ($0.85/month equivalent)' 
                  : tier.price.annually !== 'Custom' 
                    ? `${tier.price.annually} billed annually` 
                    : ''}
              </p>
              <ul className="mt-8 space-y-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex gap-x-3">
                    <CheckIcon className="h-6 w-5 flex-none text-primary-600" aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href={tier.name === 'Enterprise' ? '/contact' : '/signup'}
                className={`${tier.mostPopular ? 'bg-primary-600 text-white shadow-sm hover:bg-primary-500 focus-visible:outline-primary-600' : 'text-primary-600 ring-1 ring-inset ring-primary-200 hover:ring-primary-300 dark:ring-primary-800 dark:hover:ring-primary-700'} mt-8 block rounded-md py-2.5 px-3.5 text-center text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2`}
              >
                {tier.cta}
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="mx-auto mt-16 max-w-7xl rounded-3xl bg-primary-100 dark:bg-primary-900/40 p-8 sm:p-10"  
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="md:flex md:items-center md:justify-between">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Still have questions?</h3>
              <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">
                Contact our team to learn more about enterprise options or get answers to your questions.
              </p>
            </div>
            <Link
              href="/contact"
              className="mt-6 md:mt-0 inline-flex items-center rounded-md bg-primary-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
            >
              Contact sales
            </Link>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}