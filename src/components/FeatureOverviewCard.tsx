'use client';

import React from 'react';
import { CheckCircle2, Clock, MapPin, Gift } from 'lucide-react';

export default function FeatureOverviewCard() {
  return (
    <div className="bg-[#FFFBF7] rounded-[28px] sm:rounded-[32px] p-3.5 sm:p-4.5 border border-[#F2E0CE] shadow-xs flex flex-col sm:flex-row items-stretch gap-3.5 sm:gap-4.5">
      {/* ─────────────────────────────────────────────────────────────
          WARM INVITATION TICKET CARD (Proportional, balanced, high visual appeal)
          ───────────────────────────────────────────────────────────── */}
      <div className="w-full sm:w-52 lg:w-56 min-h-[140px] sm:min-h-[148px] rounded-2xl bg-gradient-to-br from-[#FFE7D6] via-[#FFD2BC] to-[#FFAF8C] p-3.5 text-[#161F38] shadow-xs border border-white/80 flex flex-col justify-between relative overflow-hidden select-none shrink-0">
        <div className="absolute -top-10 -right-10 w-28 h-28 bg-white/20 rounded-full blur-xl pointer-events-none" />

        {/* Top: Center Brand Stamp & Friendly Ticket Badge */}
        <div className="flex items-center justify-between relative z-10">
          <div className="inline-flex items-center gap-1.5 bg-white/90 text-coralAccent px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black shadow-2xs">
            <Gift className="w-3 h-3 text-coralAccent" />
            <span>Вводный билет</span>
          </div>
          <span className="text-[10px] sm:text-[11px] font-extrabold text-[#161F38]/80 tracking-tight">
            АйДаУмничка
          </span>
        </div>

        {/* Center: Free Trial Offer */}
        <div className="relative z-10 my-1">
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-[#161F38]/70">
            Первое занятие
          </div>
          <div className="font-black text-xl sm:text-2xl tracking-tight text-[#161F38] leading-tight">
            0 ₽ • Бесплатно
          </div>
        </div>

        {/* Bottom: Format info & Duration */}
        <div className="flex items-center justify-between text-xs font-bold text-[#161F38] relative z-10 pt-1.5 border-t border-[#161F38]/10">
          <div>
            <span className="text-[9px] uppercase tracking-wider block text-[#161F38]/70 font-semibold leading-none">
              Формат
            </span>
            <span className="truncate max-w-[125px] block font-black text-[11px] sm:text-xs mt-0.5">
              1-на-1 с педагогом
            </span>
          </div>
          <div className="flex items-center gap-1 bg-white/80 px-2 py-0.5 rounded-lg shadow-2xs font-extrabold text-[11px]">
            <Clock className="w-3 h-3 text-[#161F38]" />
            <span>25 мин</span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          RIGHT CONTENT: Diagnostic & Trial Highlights (Cleanly aligned, zero wrapping clutter)
          ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 space-y-2">
        {/* Header tags */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] sm:text-[11px] font-extrabold text-[#5C8519] bg-[#EEF8D5] px-2.5 py-0.5 rounded-full border border-[#DFEFC0] shrink-0">
            Индивидуальный формат
          </span>
          <span className="text-[11px] font-bold text-[#6B758E] flex items-center gap-1 shrink-0">
            <MapPin className="w-3 h-3 text-coralAccent" />
            г. Тольятти
          </span>
        </div>

        {/* Title & subtitle */}
        <div>
          <h4 className="text-xs sm:text-sm font-black text-[#161F38] tracking-tight leading-snug">
            Диагностика и пробный урок
          </h4>
          <p className="text-[11px] sm:text-xs text-[#5A657C] leading-snug mt-0.5 line-clamp-2">
            Педагог определит уровень речи и знаний ребёнка и составит персональный план обучения.
          </p>
        </div>

        {/* Crisp bullets — 3 clear lines, perfectly aligned */}
        <div className="space-y-1.5 pt-0.5 text-[11px] sm:text-xs text-[#161F38] font-bold">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#5C8519] shrink-0" />
            <span className="truncate leading-tight">Игровой формат без стресса для ребёнка</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#5C8519] shrink-0" />
            <span className="truncate leading-tight">Индивидуальный тест звуков и навыков</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#5C8519] shrink-0" />
            <span className="truncate leading-tight">Консультация и обратная связь родителям</span>
          </div>
        </div>
      </div>
    </div>
  );
}
