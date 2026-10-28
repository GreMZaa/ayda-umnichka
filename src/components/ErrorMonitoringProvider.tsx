'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { reportClientError } from '@/lib/errorTracker';

export default function ErrorMonitoringProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  useEffect(() => {
    // 1. Global unhandled error listener
    const handleError = (event: ErrorEvent) => {
      // Ignore extension errors or harmless resize observer loops
      if (
        event.message?.includes('ResizeObserver') ||
        event.filename?.includes('chrome-extension://')
      ) {
        return;
      }

      reportClientError(event.error || new Error(event.message), {
        path: pathname,
        component: 'WindowOnError',
        additional: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    };

    // 2. Global unhandled promise rejection listener
    const handleRejection = (event: PromiseRejectionEvent) => {
      reportClientError(event.reason || new Error('Unhandled Promise Rejection'), {
        path: pathname,
        component: 'UnhandledPromiseRejection',
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, [pathname]);

  return <>{children}</>;
}
