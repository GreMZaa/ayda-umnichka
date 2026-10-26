'use client';

import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, ArrowDown } from 'lucide-react';

const THRESHOLD = 65; // Pull distance in pixels required to trigger refresh
const MAX_PULL = 110; // Max visual displacement with resistance

export default function PullToRefresh() {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  const startYRef = useRef(0);
  const currentYRef = useRef(0);
  const isPullingRef = useRef(false);
  const hasVibratedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleTouchStart = (e: TouchEvent) => {
      // Only initiate pull-to-refresh if the user is at the very top of the page
      const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
      if (scrollTop <= 2 && e.touches.length === 1) {
        startYRef.current = e.touches[0].clientY;
        currentYRef.current = e.touches[0].clientY;
        isPullingRef.current = false;
        hasVibratedRef.current = false;
      } else {
        startYRef.current = 0;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!startYRef.current || isRefreshing) return;

      const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
      const clientY = e.touches[0].clientY;
      const diffY = clientY - startYRef.current;

      // Only pull down when at top of page and dragging downwards
      if (scrollTop <= 0 && diffY > 5) {
        if (!isPullingRef.current) {
          isPullingRef.current = true;
          setIsPulling(true);
        }

        // Apply logarithmic / diminishing resistance
        const damped = Math.min(MAX_PULL, Math.pow(diffY, 0.85) * 1.5);
        setPullDistance(damped);

        // Haptic feedback once when threshold is reached
        if (damped >= THRESHOLD && !hasVibratedRef.current) {
          hasVibratedRef.current = true;
          if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            try {
              navigator.vibrate(12);
            } catch (_) {}
          }
        } else if (damped < THRESHOLD) {
          hasVibratedRef.current = false;
        }

        // Prevent native overscroll glitching while pulling
        if (e.cancelable && diffY > 10) {
          e.preventDefault();
        }
      } else if (diffY < 0 && isPullingRef.current) {
        setPullDistance(0);
        setIsPulling(false);
        isPullingRef.current = false;
      }
    };

    const handleTouchEnd = async () => {
      if (!isPullingRef.current || isRefreshing) {
        startYRef.current = 0;
        setPullDistance(0);
        setIsPulling(false);
        return;
      }

      const shouldRefresh = pullDistance >= THRESHOLD;
      isPullingRef.current = false;
      setIsPulling(false);
      startYRef.current = 0;

      if (shouldRefresh) {
        setIsRefreshing(true);
        setPullDistance(50); // Keep indicator visible while reloading

        // Haptic buzz on release
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate([15, 30, 20]);
          } catch (_) {}
        }

        try {
          // 1. Force update service worker to get latest deployment
          if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const reg of registrations) {
              await reg.update().catch(() => {});
              if (reg.waiting) {
                reg.waiting.postMessage({ type: 'SKIP_WAITING' });
              }
            }
          }

          // 2. Clear caches to ensure stale version is flushed
          if ('caches' in window) {
            const cacheKeys = await caches.keys();
            await Promise.all(
              cacheKeys.map((key) => {
                // Delete old caches
                return caches.delete(key);
              })
            );
          }
        } catch (err) {
          console.warn('Pull-to-refresh cache clear warning:', err);
        }

        // 3. Hard reload to pick up fresh server build
        setTimeout(() => {
          window.location.reload();
        }, 350);
      } else {
        // Cancelled pull
        setPullDistance(0);
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [pullDistance, isRefreshing]);

  if (pullDistance <= 0 && !isRefreshing) return null;

  const isReady = pullDistance >= THRESHOLD || isRefreshing;
  const rotationDeg = Math.min(180, (pullDistance / THRESHOLD) * 180);

  return (
    <div
      className="fixed inset-x-0 top-0 z-[100] flex justify-center pointer-events-none transition-transform duration-140 ease-out select-none"
      style={{
        transform: `translateY(${Math.max(8, pullDistance - 20)}px)`,
      }}
    >
      <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/95 backdrop-blur-md border border-[#FCDDC7] shadow-lg text-[#161F38] text-xs font-black animate-in fade-in duration-100">
        <div
          className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-transform duration-140 ${
            isRefreshing
              ? 'animate-spin text-coralAccent'
              : isReady
              ? 'text-[#5C8519] rotate-180'
              : 'text-coralAccent'
          }`}
          style={!isRefreshing ? { transform: `rotate(${rotationDeg}deg)` } : undefined}
        >
          {isRefreshing ? (
            <RefreshCw className="w-3.5 h-3.5" />
          ) : isReady ? (
            <ArrowDown className="w-3.5 h-3.5" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
        </div>

        <span className="truncate">
          {isRefreshing
            ? 'Обновление страницы...'
            : isReady
            ? 'Отпустите для обновления'
            : 'Потяните вниз для обновления'}
        </span>
      </div>
    </div>
  );
}
