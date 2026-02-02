'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import NavBar from '../components/NavBar';
import HeroSection from '../components/HeroSection';
import AIAgentCallout from '../components/AIAgentCallout';
import FeaturesSection from '../components/FeaturesSection';
import SecuritySection from '../components/SecuritySection';
import PricingSection from '../components/PricingSection';
import Footer from '../components/Footer';

export default function Home() {
  return (
    <main className="overflow-x-hidden">
      <NavBar />
      <HeroSection />
      <AIAgentCallout />
      <FeaturesSection />
      <SecuritySection />
      <PricingSection />
      <Footer />
    </main>
  );
}