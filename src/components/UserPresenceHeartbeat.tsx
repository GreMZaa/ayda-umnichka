'use client';

import { useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

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

    // Direct Supabase Presence Channel (ZERO Vercel function calls — protects Vercel quotas!)
    let presenceChannel: any = null;

    const updateDirectDatabasePresence = async (status: 'online' | 'offline') => {
      const id = activeIdRef.current;
      if (!id || !isSupabaseConfigured) return;

      const now = new Date().toISOString();
      try {
        // Direct update to Supabase via browser client — bypasses Vercel Serverless completely!
        await supabase
          .from('user_bindings')
          .update({
            metadata: {
              is_online: status === 'online',
              last_seen_at: now,
            },
            updated_at: now,
          })
          .eq('public_id', id);
      } catch (err) {
        console.warn('Direct Supabase presence update error:', err);
      }
    };

    if (isSupabaseConfigured) {
      try {
        presenceChannel = supabase.channel(`presence_${currentId}`, {
          config: { presence: { key: currentId } },
        });

        presenceChannel
          .on('presence', { event: 'sync' }, () => {})
          .subscribe(async (status: string) => {
            if (status === 'SUBSCRIBED') {
              await presenceChannel.track({
                public_id: currentId,
                is_online: true,
                online_at: new Date().toISOString(),
              });
            }
          });
      } catch (err) {
        console.warn('Supabase Realtime presence channel init failed:', err);
      }
    }

    // Initial direct update to Supabase
    updateDirectDatabasePresence('online');

    // Recurring direct heartbeat every 90 seconds (instead of 25s, directly to Supabase!)
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        updateDirectDatabasePresence('online');
      }
    }, 90000);

    // Visibility change listener
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateDirectDatabasePresence('online');
        if (presenceChannel) {
          presenceChannel.track({
            public_id: currentId,
            is_online: true,
            online_at: new Date().toISOString(),
          }).catch(() => {});
        }
      } else {
        if (presenceChannel) {
          presenceChannel.untrack().catch(() => {});
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Before unload listener
    const handleBeforeUnload = () => {
      updateDirectDatabasePresence('offline');
      if (presenceChannel) {
        presenceChannel.untrack().catch(() => {});
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (presenceChannel) {
        supabase.removeChannel(presenceChannel);
      }
    };
  }, []);

  return null;
}
