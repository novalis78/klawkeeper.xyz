'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export default function PrivacyPage() {
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
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Privacy Policy</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-12">
            Last updated: January 21, 2025
          </p>

          <div className="prose prose-gray dark:prose-invert max-w-none">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 space-y-8">
              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">1. Introduction</h2>
                <p className="text-gray-700 dark:text-gray-300">
                  KeyKeeper.world ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our secure email service.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">2. Zero-Knowledge Architecture</h2>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  KeyKeeper implements zero-knowledge encryption, which means:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                  <li>We cannot access the content of your encrypted messages</li>
                  <li>Your messages are encrypted end-to-end with PGP</li>
                  <li>Your private keys are stored locally and never transmitted to our servers</li>
                  <li>We cannot decrypt your messages even if compelled by law</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">3. Information We Collect</h2>

                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">3.1 Account Information</h3>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  When you create an account, we collect:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                  <li>Email address (username@keykeeper.world)</li>
                  <li>Hashed password (we never store passwords in plain text)</li>
                  <li>Optional display name</li>
                  <li>PGP public key fingerprint</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">3.2 Usage Information</h3>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  We collect minimal usage data:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                  <li>Login timestamps (for security purposes)</li>
                  <li>Email metadata (sender, recipient, timestamp, subject line)</li>
                  <li>Credit usage for AI agent accounts</li>
                  <li>IP addresses (temporarily, for abuse prevention)</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">3.3 Payment Information</h3>
                <p className="text-gray-700 dark:text-gray-300">
                  For AI agent accounts using cryptocurrency payments, we only record blockchain transaction IDs. We do not collect traditional payment information as all payments are processed via blockchain networks.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">4. How We Use Your Information</h2>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  We use the collected information to:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                  <li>Provide and maintain the email service</li>
                  <li>Authenticate users and prevent unauthorized access</li>
                  <li>Detect and prevent spam, abuse, and fraud</li>
                  <li>Process cryptocurrency payments and credit management</li>
                  <li>Improve our services and user experience</li>
                  <li>Comply with legal obligations</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">5. Data Storage and Security</h2>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  We implement industry-standard security measures:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                  <li>End-to-end PGP encryption for all messages</li>
                  <li>Encrypted database storage</li>
                  <li>Regular security audits and updates</li>
                  <li>Two-factor authentication (2FA) support</li>
                  <li>Secure HTTPS connections for all web traffic</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">6. Data Retention</h2>
                <p className="text-gray-700 dark:text-gray-300">
                  We retain your account data for as long as your account is active. Encrypted messages are stored according to your account settings. IP addresses and login logs are retained for 30 days for security purposes. You may request account deletion at any time.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">7. Third-Party Services</h2>
                <p className="text-gray-700 dark:text-gray-300">
                  KeyKeeper does not share your data with third-party advertisers or data brokers. We may use essential service providers (hosting, infrastructure) who are contractually bound to protect your data and may not use it for any other purpose.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">8. Your Rights</h2>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  You have the right to:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                  <li>Access your personal data</li>
                  <li>Correct inaccurate data</li>
                  <li>Request deletion of your account and data</li>
                  <li>Export your data</li>
                  <li>Object to data processing</li>
                  <li>Withdraw consent at any time</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">9. Cookies and Tracking</h2>
                <p className="text-gray-700 dark:text-gray-300">
                  We use minimal, essential cookies for authentication and session management. We do not use tracking cookies, analytics cookies, or advertising cookies. You can disable cookies in your browser, but this may limit functionality.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">10. Children's Privacy</h2>
                <p className="text-gray-700 dark:text-gray-300">
                  KeyKeeper is not intended for users under 13 years of age. We do not knowingly collect personal information from children. If we become aware that a child has provided us with personal information, we will delete it immediately.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">11. International Users</h2>
                <p className="text-gray-700 dark:text-gray-300">
                  Our services are operated globally. By using KeyKeeper, you consent to the transfer of your information to countries where we operate. We ensure appropriate safeguards are in place to protect your data.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">12. Changes to This Policy</h2>
                <p className="text-gray-700 dark:text-gray-300">
                  We may update this Privacy Policy from time to time. We will notify you of any material changes by email or through a notice on our website. Your continued use of the service after changes constitutes acceptance of the updated policy.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">13. Contact Us</h2>
                <p className="text-gray-700 dark:text-gray-300">
                  For privacy-related questions or to exercise your rights, please contact us at:
                </p>
                <p className="text-gray-700 dark:text-gray-300 mt-4">
                  Email: privacy@keykeeper.world<br />
                  Security Issues: security@keykeeper.world
                </p>
              </section>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
