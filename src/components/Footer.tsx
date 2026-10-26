'use client';

import React from 'react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();

  // On homepage ('/'), login ('/login'), room ('/room/*'), and messenger ('/messenger'), footer is excluded for full workspace focus
  if (pathname === '/' || pathname === '/login' || pathname?.startsWith('/room') || pathname === '/messenger') return null;

  return (
    <footer className="bg-white/80 border-t border-[#F4E4D3] py-6 text-center text-xs text-ink-500">
      <div className="flex items-center justify-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-full overflow-hidden relative border border-white shadow-2xs shrink-0 bg-white">
          <Image
            src="/images/logo-official.png"
            alt="Логотип АйДаУмничка"
            fill
            className="object-contain"
          />
        </div>
        <span className="font-bold text-ink-700">Центр «АйДаУмничка»</span>
      </div>
      <p className="font-semibold text-ink-700">© 2026 Детский центр подготовки к школе и развития детей (г. Тольятти)</p>
      <p className="mt-1 text-ink-400">Видеоуроки прямо в браузере без сторонних программ • Индивидуальное развитие речи и интеллекта</p>
    </footer>
  );
}
