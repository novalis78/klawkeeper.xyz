'use client';

import dynamic from 'next/dynamic';

// Dynamically import the component with SSR disabled
const YubicoWebAuthnTest = dynamic(
  () => import('./YubicoWebAuthnTest'),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-gray-900 p-8 flex items-center justify-center">
        <div className="text-white">Loading YubiKey test...</div>
      </div>
    )
  }
);

export default function Page() {
  return <YubicoWebAuthnTest />;
}