'use client';

import React from 'react';
import { CheckCircle2, Clock, MapPin, Gift, Video } from 'lucide-react';

export default function FeatureOverviewCard() {
  return (
    <div className="bg-[#FFFBF7]/90 rounded-[32px] p-4 sm:p-5 border border-[#F2E0CE] shadow-sm flex flex-col sm:flex-row items-center gap-4 sm:gap-5">
      {/* ─────────────────────────────────────────────────────────────
          WARM INVITATION TICKET CARD (Clean, educational, zero-fintech)
          ───────────────────────────────────────────────────────────── */}
      <div className="w-full sm:w-56 h-36 rounded-2xl bg-gradient-to-br from-[#FFE7D6] via-[#FFD2BC] to-[#FFAF8C] p-3.5 text-[#161F38] shadow-sm border border-white/80 flex flex-col justify-between relative overflow-hidden select-none shrink-0">
        <div className="absolute -top-10 -right-10 w-28 h-28 bg-white/20 rounded-full blur-xl pointer-events-none" />

        {/* Top: Center Brand Stamp & Friendly Ticket Badge */}
        <div className="flex items-center justify-between relative z-10">
          <div className="inline-flex items-center gap-1.5 bg-white/90 text-coralAccent px-2.5 py-0.5 rounded-full text-[11px] font-black shadow-2xs">
            <Gift className="w-3.5 h-3.5" />
            <span>Вводный билет</span>
          </div>
          <span className="text-[11px] font-extrabold text-[#161F38]/80 tracking-tight">
            АйДаУмничка
          </span>
        </div>

        {/* Center: Free Trial Offer */}
        <div className="relative z-10 my-0.5">
          <div className="text-[11px] uppercase tracking-wider font-extrabold text-[#161F38]/75">
            Первое занятие
          </div>
          <div className="font-black text-xl sm:text-2xl tracking-tight text-[#161F38] leading-tight">
            0 ₽ • Бесплатно
          </div>
        </div>

        {/* Bottom: Format info & Duration */}
        <div className="flex items-end justify-between text-xs font-bold text-[#161F38] relative z-10 pt-1 border-t border-[#161F38]/10">
          <div>
            <span className="text-[10px] uppercase tracking-wider block text-[#161F38]/70 font-semibold">
              Формат
            </span>
            <span className="truncate max-w-[125px] block font-black text-xs">
              1-на-1 с педагогом
            </span>
          </div>
          <div className="flex items-center gap-1 bg-white/70 px-2 py-0.5 rounded-lg shadow-2xs font-extrabold text-xs">
            <Clock className="w-3 h-3 text-[#161F38]" />
            <span>25 мин</span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          RIGHT CONTENT: Educational Center Features
          ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-2 w-full">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-extrabold text-[#5C8519] bg-[#EEF8D5] px-2.5 py-0.5 rounded-full border border-[#DFEFC0] shrink-0">
            Индивидуальный формат
          </span>
          <span className="text-xs font-bold text-[#6B758E] flex items-center gap-1 shrink-0">
            <MapPin className="w-3.5 h-3.5 text-coralAccent" />
            г. Тольятти
          </span>
        </div>

        <div>
          <h4 className="text-sm sm:text-base font-black text-[#161F38] tracking-tight leading-snug">
            Обучение с увлечением и результатом
          </h4>
          <p className="text-xs text-[#5A657C] leading-relaxed mt-0.5">
            Уроки проходят онлайн в интерактивной форме: ребёнок вовлечён в процесс, а родители видят прогресс.
          </p>
        </div>

        {/* Clear Educational Benefits */}
        <div className="grid grid-cols-1 gap-1.5 pt-1 text-xs text-[#161F38] font-bold">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#5C8519] shrink-0" />
            <span className="leading-tight">Уроки прямо на сайте (без Zoom и сторонних программ)</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#5C8519] shrink-0" />
            <span className="leading-tight">Интерактивная доска с игровыми заданиями</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#5C8519] shrink-0" />
            <span className="leading-tight">Голосовые ответы и живой контакт с педагогом</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#5C8519] shrink-0" />
            <span className="leading-tight">Понятный баланс занятий и отчёты родителям</span>
          </div>
        </div>
      </div>
    </div>
  );
}
