'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Profile page - redirects to Settings
 * All profile functionality has been consolidated into the Settings page
 */
export default function ProfilePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/settings');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500 mx-auto mb-4"></div>
        <p className="text-gray-400">Redirecting to Settings...</p>
      </div>
    </div>
  );
}
