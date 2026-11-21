'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function SiteTrafficTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith('/df-admin77')) return;

    let isNewSession = false;
    try {
      const seen = sessionStorage.getItem('df_visit_tracked');
      if (!seen) {
        isNewSession = true;
        sessionStorage.setItem('df_visit_tracked', '1');
      }
    } catch {
      // ignore storage errors
    }

    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pathname, isNewSession }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
