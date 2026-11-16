'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const POLL_INTERVAL_MS = 3000;

/**
 * Renders nothing — a pure side-effect wrapper. While `hasPending` is true
 * (the Bookshelf server render it was given found at least one book with
 * generationStatus: 'pending'), it polls by calling router.refresh() every
 * 3 seconds. Once a refreshed server render re-renders this component with
 * hasPending: false (no more pending books), the interval is cleared and
 * polling stops — the simplest signal available without a dedicated
 * single-book status endpoint.
 */
export default function BookshelfPendingPoller({ hasPending }: { hasPending: boolean }) {
  const router = useRouter();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (hasPending) {
      if (intervalRef.current == null) {
        intervalRef.current = setInterval(() => {
          router.refresh();
        }, POLL_INTERVAL_MS);
      }
    } else if (intervalRef.current != null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current != null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [hasPending, router]);

  return null;
}
