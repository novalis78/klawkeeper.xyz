'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { BookOpenIcon, CodeBracketIcon, CpuChipIcon } from '@heroicons/react/24/outline';

export default function DocsPage() {
  const router = useRouter();

  // Auto-redirect to API docs after a brief moment
  // Comment this out if you want to show the docs landing page instead
  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/docs/api');
    }, 100);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#050505]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-sm font-medium">
            KeyKeeper
          </Link>

          <div className="flex items-center gap-6">
            <Link href="/ai" className="text-sm text-white/50 hover:text-white transition-colors">
              For Agents
            </Link>
            <Link
              href="/signup"
              className="text-sm px-3 py-1.5 bg-white text-black rounded-md hover:bg-white/90 transition-all"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-14 min-h-screen flex items-center justify-center px-6">
        <div className="max-w-4xl mx-auto w-full py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h1 className="text-5xl font-bold mb-4">Documentation</h1>
            <p className="text-lg text-white/60">
              Everything you need to integrate KeyKeeper into your applications
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Link
                href="/docs/api"
                className="block p-8 bg-white/[0.03] border border-white/10 rounded-xl hover:bg-white/[0.05] hover:border-white/20 transition-all group"
              >
                <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-white/20 transition-all">
                  <CodeBracketIcon className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold mb-2">API Reference</h2>
                <p className="text-white/60 text-sm">
                  Complete REST API documentation for email operations, authentication, and payments
                </p>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Link
                href="/.well-known/ai-services.json"
                className="block p-8 bg-white/[0.03] border border-white/10 rounded-xl hover:bg-white/[0.05] hover:border-white/20 transition-all group"
              >
                <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-white/20 transition-all">
                  <CpuChipIcon className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold mb-2">MCP Server</h2>
                <p className="text-white/60 text-sm">
                  Model Context Protocol integration for native AI agent support
                </p>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Link
                href="/docs/api#quickstart"
                className="block p-8 bg-white/[0.03] border border-white/10 rounded-xl hover:bg-white/[0.05] hover:border-white/20 transition-all group"
              >
                <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-white/20 transition-all">
                  <BookOpenIcon className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold mb-2">Quick Start</h2>
                <p className="text-white/60 text-sm">
                  Get up and running in minutes with our step-by-step guide
                </p>
              </Link>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
