'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Agentation } from 'agentation';

function AgentationInner() {
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);

  useEffect(() => {
    // Enable if ?agentation=1 (or if previously enabled in session)
    const param = searchParams.get('agentation');
    if (param === '1' || param === 'true') {
      setActive(true);
      try {
        localStorage.setItem('agentation_active', '1');
      } catch {}
    } else if (param === '0' || param === 'false') {
      setActive(false);
      try {
        localStorage.removeItem('agentation_active');
      } catch {}
    } else {
      try {
        if (localStorage.getItem('agentation_active') === '1') {
          setActive(true);
        }
      } catch {}
    }
  }, [searchParams]);

  if (!active) return null;

  return <Agentation endpoint="http://localhost:4747" />;
}

export default function AgentationToolbar() {
  return (
    <Suspense fallback={null}>
      <AgentationInner />
    </Suspense>
  );
}
