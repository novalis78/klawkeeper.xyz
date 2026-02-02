'use client';

import dynamic from 'next/dynamic';

// Dynamically import with SSR disabled
const YubiKeySigningTest = dynamic(
  () => import('./YubiKeySigningTest'),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-gray-900 p-8 flex items-center justify-center">
        <div className="text-white">Loading YubiKey signing test...</div>
      </div>
    )
  }
);

export default function Page() {
  return <YubiKeySigningTest />;
}