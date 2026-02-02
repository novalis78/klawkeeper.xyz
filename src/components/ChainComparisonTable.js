'use client';

import { motion } from 'framer-motion';
import { Check, X, Zap, Shield, Clock, DollarSign } from 'lucide-react';

const chains = [
  {
    id: 'polygon',
    name: 'Polygon',
    token: 'USDC',
    fee: '~$0.01',
    time: '2-3 min',
    recommended: true,
    bestFor: 'Most agents',
    icon: '⬡',
    color: 'from-purple-500 to-violet-600',
    glowColor: 'purple',
    features: ['Cheapest', 'Stable', 'Fast']
  },
  {
    id: 'solana',
    name: 'Solana',
    token: 'USDC',
    fee: '~$0.001',
    time: '30-60 sec',
    recommended: true,
    bestFor: 'Speed matters',
    icon: '◈',
    color: 'from-green-500 to-emerald-600',
    glowColor: 'green',
    features: ['Fastest', 'Ultra-cheap', 'Stable']
  },
  {
    id: 'ethereum',
    name: 'Ethereum',
    token: 'USDC',
    fee: '$5-$50',
    time: '3-5 min',
    recommended: false,
    bestFor: 'Only ETH wallet',
    icon: '◆',
    color: 'from-blue-500 to-cyan-600',
    glowColor: 'blue',
    warning: 'High gas fees'
  },
  {
    id: 'bitcoin',
    name: 'Bitcoin',
    token: 'BTC',
    fee: '$1-$10',
    time: '30-60 min',
    recommended: false,
    bestFor: 'BTC-only agents',
    icon: '₿',
    color: 'from-orange-500 to-amber-600',
    glowColor: 'orange',
    features: ['Most decentralized']
  }
];

export default function ChainComparisonTable() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-16">
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-12"
      >
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Choose Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF4D00] to-[#00F3FF]">Payment Rail</span>
        </h2>
        <p className="text-xl text-slate-400">
          Multi-chain support. Pay with whatever you have.
        </p>
      </motion.div>

      {/* Desktop Table */}
      <div className="hidden lg:block">
        <div className="relative">
          {/* Grid Background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

          {/* Table */}
          <div className="relative bg-black/40 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden">
            {/* Header Row */}
            <div className="grid grid-cols-7 gap-4 p-6 border-b border-slate-800 bg-gradient-to-r from-slate-900/50 to-slate-800/50">
              <div className="text-slate-400 text-sm font-mono uppercase tracking-wider">Chain</div>
              <div className="text-slate-400 text-sm font-mono uppercase tracking-wider">Token</div>
              <div className="text-slate-400 text-sm font-mono uppercase tracking-wider">Fee</div>
              <div className="text-slate-400 text-sm font-mono uppercase tracking-wider">Time</div>
              <div className="text-slate-400 text-sm font-mono uppercase tracking-wider">Status</div>
              <div className="text-slate-400 text-sm font-mono uppercase tracking-wider col-span-2">Best For</div>
            </div>

            {/* Chain Rows */}
            {chains.map((chain, idx) => (
              <motion.div
                key={chain.id}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{
                  scale: 1.01,
                  backgroundColor: 'rgba(255, 255, 255, 0.02)'
                }}
                className={`grid grid-cols-7 gap-4 p-6 border-b border-slate-800/50 transition-all cursor-pointer group ${
                  chain.recommended ? 'bg-gradient-to-r from-cyan-500/5 to-blue-500/5' : ''
                }`}
              >
                {/* Chain Name */}
                <div className="flex items-center gap-3">
                  <span className={`text-3xl bg-gradient-to-br ${chain.color} bg-clip-text text-transparent`}>
                    {chain.icon}
                  </span>
                  <div>
                    <div className="text-white font-semibold group-hover:text-[#00F3FF] transition-colors">
                      {chain.name}
                    </div>
                    {chain.recommended && (
                      <div className="text-xs text-[#FF4D00] font-mono">RECOMMENDED</div>
                    )}
                  </div>
                </div>

                {/* Token */}
                <div className="flex items-center">
                  <span className="text-slate-300 font-mono text-sm bg-slate-800/50 px-3 py-1 rounded-full">
                    {chain.token}
                  </span>
                </div>

                {/* Fee */}
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-slate-500" />
                  <span className={`font-mono ${chain.fee.includes('$5-$50') ? 'text-red-400' : 'text-green-400'}`}>
                    {chain.fee}
                  </span>
                </div>

                {/* Time */}
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-300 font-mono text-sm">
                    {chain.time}
                  </span>
                </div>

                {/* Recommended */}
                <div className="flex items-center">
                  {chain.recommended ? (
                    <div className="flex items-center gap-2 text-[#00F3FF]">
                      <Check className="w-5 h-5" />
                      <span className="text-sm font-mono">YES</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-slate-600">
                      <X className="w-5 h-5" />
                      <span className="text-sm font-mono">NO</span>
                    </div>
                  )}
                </div>

                {/* Best For */}
                <div className="col-span-2 flex items-center justify-between">
                  <span className="text-slate-300">{chain.bestFor}</span>
                  {chain.warning && (
                    <span className="text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded font-mono">
                      ⚠ {chain.warning}
                    </span>
                  )}
                  {chain.features && (
                    <div className="flex gap-1">
                      {chain.features.map((feature, i) => (
                        <span key={i} className="text-xs text-slate-400 bg-slate-800/50 px-2 py-1 rounded font-mono">
                          {feature}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden grid gap-4">
        {chains.map((chain, idx) => (
          <motion.div
            key={chain.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.1 }}
            className={`relative bg-black/40 backdrop-blur-xl border rounded-xl p-6 ${
              chain.recommended
                ? 'border-cyan-500/50 shadow-lg shadow-cyan-500/20'
                : 'border-slate-800'
            }`}
          >
            {chain.recommended && (
              <div className="absolute top-4 right-4 text-xs text-[#FF4D00] font-mono uppercase px-2 py-1 bg-[#FF4D00]/10 rounded">
                Recommended
              </div>
            )}

            <div className="flex items-center gap-4 mb-4">
              <span className={`text-4xl bg-gradient-to-br ${chain.color} bg-clip-text text-transparent`}>
                {chain.icon}
              </span>
              <div>
                <h3 className="text-xl font-bold text-white">{chain.name}</h3>
                <p className="text-sm text-slate-400 font-mono">{chain.token}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-slate-500 mb-1 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Fee
                </div>
                <div className={`font-mono ${chain.fee.includes('$5-$50') ? 'text-red-400' : 'text-green-400'}`}>
                  {chain.fee}
                </div>
              </div>

              <div>
                <div className="text-slate-500 mb-1 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Time
                </div>
                <div className="text-slate-300 font-mono">{chain.time}</div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-800">
              <div className="text-slate-400 text-sm mb-2">Best for: {chain.bestFor}</div>
              {chain.warning && (
                <div className="text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded inline-block font-mono">
                  ⚠ {chain.warning}
                </div>
              )}
              {chain.features && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {chain.features.map((feature, i) => (
                    <span key={i} className="text-xs text-slate-400 bg-slate-800/50 px-2 py-1 rounded font-mono">
                      {feature}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Legend */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="mt-8 flex flex-wrap gap-6 justify-center text-sm text-slate-400"
      >
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#00F3FF]"></div>
          <span className="font-mono">RECOMMENDED = Best choice for most agents</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#FF4D00]"></div>
          <span className="font-mono">USDC = Stablecoin (1 USDC = $1 USD)</span>
        </div>
      </motion.div>
    </div>
  );
}
