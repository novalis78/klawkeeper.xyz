'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-primary-50 dark:from-gray-950 dark:to-primary-950">
      {/* Nav */}
      <nav className="border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-sm font-medium text-gray-900 dark:text-white">
            KeyKeeper
          </Link>
          <Link
            href="/login"
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Sign in
          </Link>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Terms of Service</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-12">
            Last updated: January 21, 2025
          </p>

          <div className="prose prose-gray dark:prose-invert max-w-none">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 space-y-8">
              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">1. Acceptance of Terms</h2>
                <p className="text-gray-700 dark:text-gray-300">
                  By accessing and using KeyKeeper.world ("the Service"), you accept and agree to be bound by the terms and provision of this agreement.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">2. Description of Service</h2>
                <p className="text-gray-700 dark:text-gray-300">
                  KeyKeeper provides secure email services with end-to-end PGP encryption, disposable email addresses, and zero-knowledge architecture. The Service is provided for both human users and AI agents.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">3. User Accounts</h2>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                  <li>Provide accurate and complete information during registration</li>
                  <li>Keep your password secure and confidential</li>
                  <li>Notify us immediately of any unauthorized use of your account</li>
                  <li>Be responsible for all activities under your account</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">4. Acceptable Use</h2>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  You agree not to use the Service to:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                  <li>Send spam, unsolicited emails, or bulk messages</li>
                  <li>Violate any laws or regulations</li>
                  <li>Transmit malware, viruses, or harmful code</li>
                  <li>Harass, abuse, or harm others</li>
                  <li>Impersonate any person or entity</li>
                  <li>Interfere with the proper functioning of the Service</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">5. Privacy and Security</h2>
                <p className="text-gray-700 dark:text-gray-300">
                  We implement zero-knowledge encryption, meaning we cannot access the content of your encrypted messages. Please review our <Link href="/privacy" className="text-primary-600 dark:text-primary-400 hover:underline">Privacy Policy</Link> for details on how we handle your data.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">6. Payment and Credits</h2>
                <p className="text-gray-700 dark:text-gray-300">
                  AI agent accounts operate on a credit system. Credits are purchased via cryptocurrency and are non-refundable once issued. Human accounts may have different pricing structures as outlined on our website.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">7. Termination</h2>
                <p className="text-gray-700 dark:text-gray-300">
                  We reserve the right to suspend or terminate your account if you violate these terms or engage in activities that harm the Service or other users. You may also terminate your account at any time.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">8. Disclaimer of Warranties</h2>
                <p className="text-gray-700 dark:text-gray-300">
                  The Service is provided "as is" without warranties of any kind, either express or implied. We do not guarantee that the Service will be uninterrupted, secure, or error-free.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">9. Limitation of Liability</h2>
                <p className="text-gray-700 dark:text-gray-300">
                  To the maximum extent permitted by law, KeyKeeper shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">10. Changes to Terms</h2>
                <p className="text-gray-700 dark:text-gray-300">
                  We reserve the right to modify these terms at any time. We will notify users of any material changes via email or through the Service.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">11. Contact</h2>
                <p className="text-gray-700 dark:text-gray-300">
                  For questions about these Terms of Service, please contact us at legal@keykeeper.world
                </p>
              </section>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
