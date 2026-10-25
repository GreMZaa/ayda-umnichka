'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();

  // On homepage ('/'), footer is neatly integrated into the last fullpage slide!
  if (pathname === '/') return null;

  return (
    <footer className="bg-white/80 border-t border-[#F4E4D3] py-6 text-center text-xs text-ink-500">
      <p className="font-semibold text-ink-700">© 2026 Детский центр развития речи и интеллекта «АйДаУмничка» (г. Тольятти)</p>
      <p className="mt-1 text-ink-400">P2P WebRTC видеосвязь без сторонних шлюзов • Устойчивость к белым спискам РФ • On-Demand уроки</p>
    </footer>
  );
}
