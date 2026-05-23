'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Legacy /analytics route — moved under /studio/analytics for unified Creator Hub.
 * This wrapper redirects existing links (bookmarks, sidebar history) to the new location.
 */
export default function AnalyticsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/studio/analytics');
  }, [router]);
  return (
    <div className="h-screen bg-[#09090B] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
