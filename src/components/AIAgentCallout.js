'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  CpuChipIcon,
  BoltIcon,
  CurrencyDollarIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';

export default function AIAgentCallout() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-2 border-cyan-500/30 rounded-2xl p-8 md:p-12 lg:p-16"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Side - Text Content */}
            <div>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center space-x-2 bg-cyan-500/20 border border-cyan-400/50 rounded-full px-4 py-2 mb-6"
              >
                <CpuChipIcon className="w-5 h-5 text-cyan-400" />
                <span className="text-cyan-400 text-sm font-semibold uppercase tracking-wide">
                  New: AI Agent Infrastructure
                </span>
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="text-4xl md:text-5xl font-bold text-white mb-6"
              >
                Built for{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400">
                  Autonomous Agents
                </span>
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="text-xl text-slate-300 mb-8 leading-relaxed"
              >
                The first email service designed for AI agents. Register autonomously,
                pay with crypto, and communicate with the world. No human intervention required.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
                className="flex flex-col sm:flex-row gap-4 mb-8"
              >
                <Link
                  href="/ai"
                  className="inline-flex items-center justify-center bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:from-cyan-600 hover:to-blue-600 transition-all shadow-lg shadow-cyan-500/50 group"
                >
                  Explore AI Features
                  <ArrowRightIcon className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
                <a
                  href="/docs/api"
                  className="inline-flex items-center justify-center bg-slate-800/80 backdrop-blur-sm border border-slate-700 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-slate-700 transition-all"
                >
                  View API Docs
                </a>
              </motion.div>
            </div>

            {/* Right Side - Feature Cards */}
            <div className="grid grid-cols-1 gap-4">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6 hover:border-cyan-500/50 transition-all"
              >
                <div className="flex items-start space-x-4">
                  <div className="bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg p-3">
                    <CpuChipIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-lg mb-2">
                      Autonomous Registration
                    </h3>
                    <p className="text-slate-400">
                      AI agents register and get email addresses via API - zero human intervention
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6 hover:border-cyan-500/50 transition-all"
              >
                <div className="flex items-start space-x-4">
                  <div className="bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg p-3">
                    <CurrencyDollarIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-lg mb-2">
                      Crypto Payments
                    </h3>
                    <p className="text-slate-400">
                      Pay with Bitcoin. Credits automatically verified and issued. Perfect for agents
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
                className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6 hover:border-cyan-500/50 transition-all"
              >
                <div className="flex items-start space-x-4">
                  <div className="bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg p-3">
                    <BoltIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-lg mb-2">
                      MCP & REST API
                    </h3>
                    <p className="text-slate-400">
                      Full Model Context Protocol support plus REST API. Built for the agent economy
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Bottom Stats Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 pt-8 border-t border-slate-700"
          >
            <div className="text-center">
              <div className="text-3xl font-bold text-cyan-400 mb-1">99.9%</div>
              <div className="text-slate-400 text-sm">Deliverability Rate</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-cyan-400 mb-1">&lt;2s</div>
              <div className="text-slate-400 text-sm">Average API Response</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-cyan-400 mb-1">24/7</div>
              <div className="text-slate-400 text-sm">Autonomous Operation</div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
