'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Wifi,
  Coins,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  MessageCircle,
  PlusCircle,
  HelpCircle
} from 'lucide-react';

interface BalanceWidgetProps {
  balance: number;
  studentName?: string;
  studentPublicId?: string;
  className?: string;
}

export default function BalanceWidget({
  balance = 0,
  studentName = 'Ученик',
  studentPublicId = '',
  className = '',
}: BalanceWidgetProps) {
  const maxLessons = 8;
  const progressPercent = Math.min(100, Math.max(0, (balance / maxLessons) * 100));
  const isLowBalance = balance <= 1;

  // Format card number with student ID suffix
  const formattedId = studentPublicId
    ? studentPublicId.replace(/[^0-9]/g, '').slice(-4) || '8745'
    : '8745';

  const getBalanceEnding = (count: number) => {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod100 >= 11 && mod100 <= 19) return 'уроков';
    if (mod10 === 1) return 'урок';
    if (mod10 >= 2 && mod10 <= 4) return 'урока';
    return 'уроков';
  };

  return (
    <div
      className={`bg-white rounded-3xl p-4 sm:p-5 border border-[#F2E0CF] shadow-xs space-y-4 hover:shadow-sm transition-shadow ${className}`}
    >
      {/* Widget Header */}
      <div className="flex items-center justify-between gap-2 border-b border-[#F8EDE1] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#FFF2E6] text-coralAccent border border-[#FCDDC7] flex items-center justify-center shrink-0 shadow-2xs">
            <Coins className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-black text-sm sm:text-base text-[#161F38] leading-tight">
              Баланс и абонемент
            </h3>
            <p className="text-[11px] text-[#6B758E]">
              Учет оплаченных занятий
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 text-[10px] font-black bg-[#EAF7CF] text-[#5C8519] border border-[#D5ECA3] px-2.5 py-0.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-[#5C8519] animate-pulse" />
          Активен
        </span>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          THE STYLISH PASTEL PEACH STUDENT CARD WITH PHOTO
          ───────────────────────────────────────────────────────────── */}
      <div className="w-full h-44 sm:h-48 rounded-2xl bg-gradient-to-br from-[#FFE0CB] via-[#FFB894] to-[#FFA278] p-4 text-[#161F38] shadow-sm border border-white/80 flex flex-col justify-between relative overflow-hidden select-none">
        {/* Soft gloss highlight */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/30 rounded-full blur-xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-white/20 rounded-full blur-lg pointer-events-none" />

        {/* Card Top: Brand / Mastercard Circles & EMV Chip */}
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2">
            <div className="flex items-center -space-x-2">
              <div className="w-6 h-6 rounded-full bg-[#FA9669]/90 border border-white/70 shadow-xs" />
              <div className="w-6 h-6 rounded-full bg-[#FFE8D6]/90 border border-white/70 shadow-xs" />
            </div>
            <span className="text-[11px] font-black tracking-tight text-[#161F38]/90">
              АйДаУмничка
            </span>
          </div>

          {/* Golden EMV Chip */}
          <div className="w-7 h-5 rounded-md bg-[#F1A27A] border border-[#DC8253] flex items-center justify-center shadow-2xs">
            <div className="w-4 h-3 border border-[#161F38]/30 rounded-sm" />
          </div>
        </div>

        {/* Card Center: Card Number */}
        <div className="relative z-10 py-1">
          <span className="text-[9px] uppercase tracking-widest text-[#161F38]/70 block font-bold">
            Номер карты ученика
          </span>
          <div className="font-mono text-sm sm:text-base tracking-widest font-black text-[#161F38]/95 drop-shadow-2xs">
            4149 •••• •••• {formattedId}
          </div>
        </div>

        {/* Card Bottom: Photo, Student Name, Validity & Contactless */}
        <div className="flex items-end justify-between relative z-10 pt-1 border-t border-white/30">
          <div className="flex items-center gap-2 min-w-0">
            {/* Student Photo as requested ("фото как раньше у нас было") */}
            <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white shadow-2xs relative bg-white shrink-0">
              <Image
                src="/images/child-avatar.png"
                alt={studentName}
                width={32}
                height={32}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback if image not rendered
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div className="min-w-0">
              <span className="text-[8px] uppercase tracking-wider block opacity-75 font-bold">
                Владелец абонемента
              </span>
              <span className="truncate max-w-[140px] block font-black text-xs text-[#161F38]">
                {studentName}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right">
              <span className="text-[8px] uppercase tracking-wider block opacity-75 font-bold">
                Срок
              </span>
              <span className="font-mono text-[11px] font-black text-[#161F38]">07/26</span>
            </div>
            <Wifi className="w-4 h-4 rotate-90 text-[#161F38]/85 shrink-0" />
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          BALANCE PROGRESS & DETAILS
          ───────────────────────────────────────────────────────────── */}
      <div className="space-y-3 pt-1">
        {/* Large Counter Row */}
        <div className="p-3 bg-[#FFF8F1] border border-[#FCDDC7] rounded-2xl flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-[#8A95A8] block">
              Остаток на балансе:
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-black text-[#5C8519] leading-none">
                {balance}
              </span>
              <span className="text-xs font-black text-[#161F38]">
                {getBalanceEnding(balance)}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-extrabold text-coralAccent bg-[#FFF2E6] border border-[#FCDDC7] px-2.5 py-1 rounded-full inline-block">
              {balance} из {maxLessons} уроков
            </span>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] font-bold text-[#6B758E]">
            <span>Заполненность пакета:</span>
            <span className="text-[#161F38] font-black">{Math.round(progressPercent)}%</span>
          </div>
          <div className="w-full bg-[#F5E5D4] h-2.5 rounded-full overflow-hidden relative shadow-inner">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isLowBalance
                  ? 'bg-amber-500'
                  : 'bg-gradient-to-r from-coralAccent to-[#5C8519]'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Explanatory Note */}
        <div className="p-2.5 bg-[#FFFAF5] border border-[#F2DECE] rounded-xl text-[11px] text-[#6B758E] flex items-start gap-2 leading-relaxed">
          <CheckCircle2 className="w-4 h-4 text-[#5C8519] shrink-0 mt-0.5" />
          <span>
            Списание 1 занятия происходит автоматически только после завершения онлайн-урока с преподавателем.
          </span>
        </div>

        {/* Action Button: Top Up / Message Admin */}
        <div className="pt-1 flex items-center gap-2">
          <Link
            href={`/messenger?id=${encodeURIComponent(studentPublicId || '')}`}
            className="w-full inline-flex items-center justify-center gap-2 bg-[#FFF2E6] hover:bg-[#FFE3CC] text-coralAccent border border-[#FCDDC7] font-black text-xs py-2.5 rounded-xl transition-all duration-140 active:scale-95 cursor-pointer shadow-2xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Пополнить баланс уроков</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
