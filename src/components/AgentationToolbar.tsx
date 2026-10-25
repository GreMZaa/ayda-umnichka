'use client';

import React, { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Agentation } from 'agentation';

function AgentationInner() {
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);
  const [isLocalhost, setIsLocalhost] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const evaluateState = useCallback(() => {
    if (typeof window === 'undefined') return false;

    // 1. Direct window URL search inspection (immune to SSR/hydration delays)
    const urlParams = new URLSearchParams(window.location.search);
    const hasSearchParam = urlParams.has('agentation');
    const paramVal = urlParams.get('agentation');

    // 2. Next.js router search params check
    const hookHasParam = searchParams ? searchParams.has('agentation') : false;
    const hookVal = searchParams ? searchParams.get('agentation') : null;

    const effectiveVal = (paramVal !== null ? paramVal : hookVal)?.toLowerCase();
    const isParamPresent = hasSearchParam || hookHasParam;

    // Explicit disable
    if (effectiveVal === '0' || effectiveVal === 'false' || effectiveVal === 'off') {
      try {
        localStorage.removeItem('agentation_active');
        document.cookie = 'agentation=; path=/; max-age=0; SameSite=Lax';
      } catch {}
      return false;
    }

    // Explicit enable (supports ?agentation, ?agentation=1, ?agentation=true)
    if (effectiveVal === '1' || effectiveVal === 'true' || isParamPresent) {
      try {
        localStorage.setItem('agentation_active', '1');
        document.cookie = 'agentation=1; path=/; max-age=2592000; SameSite=Lax';
      } catch {}
      return true;
    }

    // Hash check (#agentation)
    if (window.location.hash.toLowerCase().includes('agentation')) {
      try {
        localStorage.setItem('agentation_active', '1');
        document.cookie = 'agentation=1; path=/; max-age=2592000; SameSite=Lax';
      } catch {}
      return true;
    }

    // LocalStorage persistence
    try {
      if (localStorage.getItem('agentation_active') === '1') {
        return true;
      }
    } catch {}

    // Cookie persistence
    try {
      if (document.cookie.includes('agentation=1')) {
        return true;
      }
    } catch {}

    return false;
  }, [searchParams]);

  useEffect(() => {
    const isAct = evaluateState();
    setActive(isAct);
    if (isAct) {
      setShowToast(true);
      const timer = setTimeout(() => setShowToast(false), 4500);
      return () => clearTimeout(timer);
    }
  }, [evaluateState]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsLocalhost(
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'
    );

    // Keyboard shortcut listener: Alt + A or Ctrl + Shift + A to quickly toggle
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.altKey && (e.key === 'a' || e.key === 'A' || e.code === 'KeyA')) ||
        (e.ctrlKey && e.shiftKey && (e.key === 'a' || e.key === 'A' || e.code === 'KeyA'))
      ) {
        e.preventDefault();
        setActive((prev) => {
          const next = !prev;
          try {
            if (next) {
              localStorage.setItem('agentation_active', '1');
              document.cookie = 'agentation=1; path=/; max-age=2592000; SameSite=Lax';
              setShowToast(true);
              setTimeout(() => setShowToast(false), 4500);
            } else {
              localStorage.removeItem('agentation_active');
              document.cookie = 'agentation=; path=/; max-age=0; SameSite=Lax';
            }
          } catch {}
          return next;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!active) return null;

  return (
    <>
      {showToast && (
        <div
          role="status"
          className="fixed bottom-24 right-6 z-[999999] bg-[#161F38] text-white px-4 py-2.5 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2.5 border-2 border-[#C5E87D] animate-bounce"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-[#C5E87D] inline-block shadow-xs" />
          <span>Agentation Toolbar активен (Ctrl+Shift+F)</span>
        </div>
      )}

      {/* When on production HTTPS, omit endpoint so Agentation uses reliable standalone clipboard mode */}
      <Agentation
        endpoint={isLocalhost ? 'http://localhost:4747' : undefined}
        appName="АйДаУмничка"
      />
    </>
  );
}

export default function AgentationToolbar() {
  return (
    <Suspense fallback={null}>
      <AgentationInner />
    </Suspense>
  );
}
