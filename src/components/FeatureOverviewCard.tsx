'use client';

import React from 'react';
import { Wifi, CheckCircle2, Sparkles, Clock, ShieldCheck } from 'lucide-react';

export default function FeatureOverviewCard() {
  return (
    <div className="bg-[#FFFBF7]/90 rounded-[32px] p-4 sm:p-5 border border-[#F2E0CE] shadow-sm flex flex-col sm:flex-row items-center gap-4 sm:gap-5">
      {/* ─────────────────────────────────────────────────────────────
          THE PASTEL PEACH TRIAL CARD (Matching Reference Image)
          ───────────────────────────────────────────────────────────── */}
      <div className="w-full sm:w-56 h-32 sm:h-34 rounded-2xl bg-gradient-to-br from-[#FFE0CB] via-[#FFB894] to-[#FFA278] p-3.5 text-[#161F38] shadow-sm border border-white/70 flex flex-col justify-between relative overflow-hidden select-none shrink-0">
        <div className="absolute -top-12 -right-12 w-28 h-28 bg-white/25 rounded-full blur-xl pointer-events-none" />

        {/* Top: Mastercard Circles & EMV Chip */}
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center -space-x-2">
            <div className="w-6 h-6 rounded-full bg-[#FA9669]/90 border border-white/60 shadow-xs" />
            <div className="w-6 h-6 rounded-full bg-[#FFE8D6]/90 border border-white/60 shadow-xs" />
          </div>
          <div className="w-7 h-5 rounded bg-[#F1A27A] border border-[#DC8253] flex items-center justify-center shadow-2xs">
            <div className="w-4 h-3 border border-[#161F38]/25 rounded-sm" />
          </div>
        </div>

        {/* Center: Free Trial Offer */}
        <div className="relative z-10">
          <div className="text-[9px] uppercase tracking-wider font-extrabold text-[#161F38]/70">
            Вводное занятие
          </div>
          <div className="font-black text-lg sm:text-xl tracking-tight text-[#161F38] leading-tight">
            0 ₽ • Бесплатно
          </div>
        </div>

        {/* Bottom: Format info & Contactless */}
        <div className="flex items-end justify-between text-[10px] font-bold text-[#161F38]/85 relative z-10">
          <div>
            <span className="text-[8px] uppercase tracking-wider block opacity-70">Формат</span>
            <span className="truncate max-w-[120px] block font-extrabold">1-на-1 с педагогом</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>25 мин</span>
            <Wifi className="w-3.5 h-3.5 rotate-90 text-[#161F38]/80" />
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          RIGHT CONTENT: Educational Center Features
          ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-2 w-full">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black text-[#5C8519] uppercase tracking-widest bg-[#EEF8D5] px-2 py-0.5 rounded-full border border-[#DFEFC0]">
            КАК ПРОХОДИТ ОБУЧЕНИЕ
          </span>
          <span className="text-[11px] font-extrabold text-coralAccent flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            Тольятти
          </span>
        </div>

        <div>
          <h4 className="text-sm sm:text-base font-black text-[#161F38] tracking-tight leading-snug">
            Индивидуально и наглядно
          </h4>
          <p className="text-[11px] text-[#5A657C] leading-relaxed mt-0.5">
            Уроки проходят онлайн в игровой форме. Никаких скучных лекций — ребенок увлечен и сразу видит результат.
          </p>
        </div>

        {/* 4 Quick Clear Bullets for Parents */}
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 gap-x-2 gap-y-1.5 pt-1 text-[11px] text-[#161F38] font-bold">
          <div className="flex items-center gap-1.5 truncate">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#5C8519] shrink-0" />
            <span>Уроки прямо на сайте (без Zoom)</span>
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#5C8519] shrink-0" />
            <span>Интерактивная доска с играми</span>
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#5C8519] shrink-0" />
            <span>Голосовые ответы логопеду</span>
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#5C8519] shrink-0" />
            <span>Понятный баланс занятий</span>
          </div>
        </div>
      </div>
    </div>
  );
}
