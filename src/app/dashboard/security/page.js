'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Security page has been merged into Settings > Security tab
 * This page redirects to the unified location
 */
export default function SecurityRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to Settings with security section active
    router.replace('/dashboard/settings?section=security');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-dashboard">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto mb-4"></div>
        <p className="text-gray-400">Redirecting to Settings...</p>
      </div>
    </div>
  );
}
