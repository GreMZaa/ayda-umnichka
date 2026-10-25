'use client';

import React from 'react';
import Link from 'next/link';
import { Wifi, ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';

interface BalanceWidgetProps {
  balance: number;
  studentName?: string;
  className?: string;
}

export default function BalanceWidget({
  balance = 6,
  studentName = 'Тимофей Смирнов',
  className = '',
}: BalanceWidgetProps) {
  const maxLessons = 8;
  const progressPercent = Math.min(100, Math.max(0, (balance / maxLessons) * 100));

  return (
    <div
      className={`bg-[#FFFBF7]/90 rounded-[32px] p-4 sm:p-5 border border-[#F2E0CE] shadow-sm flex flex-col sm:flex-row items-center gap-4 sm:gap-5 ${className}`}
    >
      {/* ─────────────────────────────────────────────────────────────
          THE PASTEL PEACH CARD (Matching Reference Image 2)
          ───────────────────────────────────────────────────────────── */}
      <div className="w-full sm:w-56 h-32 sm:h-34 rounded-2xl bg-gradient-to-br from-[#FFE0CB] via-[#FFB894] to-[#FFA278] p-3.5 text-[#161F38] shadow-sm border border-white/70 flex flex-col justify-between relative overflow-hidden select-none shrink-0">
        {/* Soft gloss highlight */}
        <div className="absolute -top-12 -right-12 w-28 h-28 bg-white/25 rounded-full blur-xl pointer-events-none" />

        {/* Card Top: Mastercard Circles & EMV Chip */}
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center -space-x-2">
            <div className="w-6 h-6 rounded-full bg-[#FA9669]/90 border border-white/60 shadow-xs" />
            <div className="w-6 h-6 rounded-full bg-[#FFE8D6]/90 border border-white/60 shadow-xs" />
          </div>

          {/* Golden EMV Chip */}
          <div className="w-7 h-5 rounded bg-[#F1A27A] border border-[#DC8253] flex items-center justify-center shadow-2xs">
            <div className="w-4 h-3 border border-[#161F38]/25 rounded-sm" />
          </div>
        </div>

        {/* Card Center: Card Number */}
        <div className="font-mono text-xs sm:text-[13px] tracking-wider font-extrabold text-[#161F38]/95 relative z-10">
          4149 7358 6754 8745
        </div>

        {/* Card Bottom: Date & Contactless */}
        <div className="flex items-end justify-between text-[10px] font-bold text-[#161F38]/85 relative z-10">
          <div>
            <span className="text-[8px] uppercase tracking-wider block opacity-70">Ученик</span>
            <span className="truncate max-w-[110px] block font-extrabold">{studentName}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>07/26</span>
            <Wifi className="w-3.5 h-3.5 rotate-90 text-[#161F38]/80" />
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          CARD RIGHT CONTENT (Title, Description & Slider)
          ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-2 w-full">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black text-[#5C8519] uppercase tracking-widest bg-[#EEF8D5] px-2 py-0.5 rounded-full border border-[#DFEFC0]">
            УРОК 1 • АБОНЕМЕНТ
          </span>
          <span className="text-[11px] font-extrabold text-coralAccent">
            {balance} из {maxLessons} уроков
          </span>
        </div>

        <div>
          <h4 className="text-sm sm:text-base font-black text-[#161F38] tracking-tight leading-snug">
            Баланс занятий
          </h4>
          <p className="text-[11px] text-[#5A657C] leading-relaxed mt-0.5">
            Индивидуальные уроки с логопедом в г. Тольятти. Автоматическое списание только после завершения занятия.
          </p>
        </div>

        {/* The Exact Reference Slider: ← [ ===( • )=== ] → */}
        <div className="pt-1 flex items-center gap-2">
          <button
            aria-label="Предыдущий урок"
            className="w-5 h-5 rounded-full flex items-center justify-center text-[#161F38]/60 hover:text-[#161F38] hover:bg-[#FDEEDC] transition-colors duration-140 active:scale-90 cursor-pointer"
          >
            <ArrowLeft className="w-3 h-3" />
          </button>

          <div className="flex-1 bg-[#F5E5D4] h-2 rounded-full overflow-hidden relative">
            <div
              className="bg-coralAccent h-full rounded-full transition-[width] duration-220 ease-out-emil"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <button
            aria-label="Следующий урок"
            className="w-5 h-5 rounded-full flex items-center justify-center text-[#161F38]/60 hover:text-[#161F38] hover:bg-[#FDEEDC] transition-colors duration-140 active:scale-90 cursor-pointer"
          >
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
