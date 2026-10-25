'use client';

import React from 'react';
import { Wifi, Battery } from 'lucide-react';

interface PhoneMockupProps {
  children: React.ReactNode;
  title?: string;
}

export default function PhoneMockup({ children, title }: PhoneMockupProps) {
  return (
    <div className="relative mx-auto max-w-[390px] w-full rounded-[48px] bg-white p-3.5 shadow-2xl border-[8px] border-ink-900 overflow-hidden ring-1 ring-black/5">
      {/* Top Phone Frame: Dynamic Island + Status bar */}
      <div className="relative pt-2 pb-3 px-6 flex items-center justify-between text-[11px] font-bold text-ink-900 select-none">
        <span>9:41</span>
        
        {/* Dynamic Island Pill */}
        <div className="absolute left-1/2 -translate-x-1/2 top-2.5 w-24 h-6 bg-ink-900 rounded-full flex items-center justify-end px-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
        </div>

        <div className="flex items-center gap-1.5">
          <Wifi className="w-3.5 h-3.5" />
          <Battery className="w-4 h-4" />
        </div>
      </div>

      {/* Screen Inner Content */}
      <div className="max-h-[720px] overflow-y-auto space-y-4 px-1 pb-14 pt-1">
        {children}
      </div>

      {/* Bottom Phone Home Indicator Bar */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-ink-900/60 rounded-full pointer-events-none" />
    </div>
  );
}
