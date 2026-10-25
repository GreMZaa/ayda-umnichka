'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Agentation } from 'agentation';

function AgentationInner() {
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);
  const [isLocalhost, setIsLocalhost] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if ?agentation=1 or ?agentation=true is in the current URL (handling accidental double ? like ?id=123?agentation=1)
    const rawSearch = window.location.search || '';
    const rawNormalized = rawSearch.includes('?') ? rawSearch.replace(/\?/g, '&').replace(/^&/, '?') : rawSearch;
    const urlParams = new URLSearchParams(rawNormalized);
    const paramFromWindow = urlParams.get('agentation');
    const paramFromHook = searchParams ? searchParams.get('agentation') : null;

    const val = (paramFromWindow ?? paramFromHook)?.toLowerCase();
    const isActiveInUrl =
      val === '1' ||
      val === 'true' ||
      rawSearch.includes('agentation=1') ||
      rawSearch.includes('agentation=true') ||
      window.location.href.includes('agentation=1');

    if (isActiveInUrl) {
      setActive(true);
      setIsLocalhost(
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1'
      );
    } else {
      setActive(false);
      // Clean up any previously stored state so the normal site is completely clean
      try {
        localStorage.removeItem('agentation_active');
        document.cookie = 'agentation=; path=/; max-age=0; SameSite=Lax';
      } catch {}
    }
  }, [searchParams]);

  // If not explicitly requested with ?agentation=1 in the URL, do not render anything
  if (!active) return null;

  return (
    <Agentation
      endpoint={isLocalhost ? 'http://localhost:4747' : undefined}
      appName="АйДаУмничка"
    />
  );
}

export default function AgentationToolbar() {
  return (
    <Suspense fallback={null}>
      <AgentationInner />
    </Suspense>
  );
}
