'use client';

import { useEffect, useRef } from 'react';

export default function UserPresenceHeartbeat() {
  const activeIdRef = useRef<string | null>(null);

  useEffect(() => {
    // 1. Resolve current active user ID from multiple sources
    function resolveCurrentUserId(): string | null {
      if (typeof window === 'undefined') return null;

      // URL search parameters
      const sp = new URLSearchParams(window.location.search);
      const urlId = sp.get('id') || sp.get('userId');
      if (urlId && urlId.trim()) return urlId.trim();

      // Path matching /id123456
      const pathMatch = window.location.pathname.match(/^\/(id\d+)/i);
      if (pathMatch && pathMatch[1]) return pathMatch[1].trim();

      // Local storage
      const storageId =
        localStorage.getItem('aida_user_id') ||
        localStorage.getItem('aida_auth_user_id');
      if (storageId && storageId.trim()) return storageId.trim();

      // Cookies
      const cookieMatch = document.cookie.match(/(?:^|; )(?:aida_user_id|aida_auth_user_id)=([^;]*)/);
      if (cookieMatch && cookieMatch[1]) {
        try {
          return decodeURIComponent(cookieMatch[1]).trim();
        } catch {
          return cookieMatch[1].trim();
        }
      }

      return null;
    }

    const currentId = resolveCurrentUserId();
    activeIdRef.current = currentId;
    if (!currentId) return;

    // Send heartbeat
    const sendHeartbeat = (status: 'online' | 'offline' = 'online') => {
      const id = activeIdRef.current;
      if (!id) return;

      if (status === 'offline' && typeof navigator !== 'undefined' && navigator.sendBeacon) {
        try {
          const blob = new Blob([JSON.stringify({ publicId: id, status: 'offline' })], {
            type: 'application/json',
          });
          navigator.sendBeacon('/api/presence', blob);
          return;
        } catch {
          // fallback to fetch keepalive
        }
      }

      fetch('/api/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicId: id, status }),
        keepalive: status === 'offline',
      }).catch(() => {
        // Silently ignore network failures in heartbeat
      });
    };

    // Initial heartbeat
    sendHeartbeat('online');

    // Recurring heartbeat every 25 seconds (must be well below 90s timeout)
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        sendHeartbeat('online');
      }
    }, 25000);

    // Visibility change listener
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat('online');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Before unload listener
    const handleBeforeUnload = () => {
      sendHeartbeat('offline');
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return null;
}
