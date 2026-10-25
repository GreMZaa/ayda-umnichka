'use client';

import React from 'react';
import Link from 'next/link';
import { Wifi, ArrowRight, Sparkles, AlertTriangle } from 'lucide-react';

interface BalanceWidgetProps {
  balance: number;
  studentName?: string;
  compact?: boolean;
}

export default function BalanceWidget({ balance, studentName = 'Тимофей Смирнов', compact = false }: BalanceWidgetProps) {
  const isLowBalance = balance <= 1;

  if (compact) {
    return (
      <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-[#F2E3D5] flex flex-col justify-between">
        <div className="flex items-center gap-3">
          {/* Compact Card */}
          <div className="w-36 sm:w-44 h-22 sm:h-24 rounded-xl bg-[#FDBA96] p-2.5 text-ink-900 shadow-xs border border-[#F5A57A] flex flex-col justify-between relative overflow-hidden select-none shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center -space-x-1.5">
                <div className="w-4 h-4 rounded-full bg-[#FA9669]/90 border border-white/40" />
                <div className="w-4 h-4 rounded-full bg-[#FFE3D1]/80 border border-white/40" />
              </div>
              <Wifi className="w-3 h-3 text-ink-900/70 rotate-90" />
            </div>
            <div className="font-mono text-[10px] tracking-wider font-extrabold text-ink-900/90">
              4149 •••• 8745
            </div>
            <div className="flex items-end justify-between text-[9px] font-bold text-ink-900/80">
              <span className="truncate max-w-[80px]">{studentName}</span>
              <span>07/26</span>
            </div>
          </div>

          {/* Compact Lesson Balance Info */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="text-[10px] font-black text-coralAccent uppercase tracking-wider">
              Абонемент
            </div>
            <h4 suppressHydrationWarning className="text-sm sm:text-base font-extrabold text-ink-900 tracking-tight leading-tight">
              Баланс: {balance} {balance === 1 ? 'занятие' : balance >= 2 && balance <= 4 ? 'занятия' : 'занятий'}
            </h4>
            <div className="flex items-center gap-2 pt-0.5">
              <div className="flex-1 bg-[#FDEEDC] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-coralAccent h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (balance / 8) * 100)}%` }}
                />
              </div>
              <span className="text-[10px] font-bold text-ink-700 whitespace-nowrap">
                {balance}/8
              </span>
            </div>
            <p className="text-[10px] text-ink-500 truncate">
              Автоматическое списание после P2P урока
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[32px] p-5 sm:p-6 shadow-sm border border-[#F2E3D5] flex flex-col justify-between">
      {/* Top Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        {/* The Card Component directly inspired by Reference Image 1 */}
        <div className="w-full sm:w-64 h-36 rounded-2xl bg-[#FDBA96] p-4 text-ink-900 shadow-sm border border-[#F5A57A] flex flex-col justify-between relative overflow-hidden select-none">
          {/* Card Top: Circles Logo & Contactless */}
          <div className="flex items-center justify-between">
            <div className="flex items-center -space-x-2">
              <div className="w-6 h-6 rounded-full bg-[#FA9669]/90 border border-white/40" />
              <div className="w-6 h-6 rounded-full bg-[#FFE3D1]/80 border border-white/40" />
            </div>
            {/* EMV Chip icon simulation */}
            <div className="w-7 h-5 rounded bg-[#ED9466] border border-[#DE7E4E] flex items-center justify-center">
              <div className="w-4 h-3 border border-ink-900/30 rounded-sm" />
            </div>
          </div>

          {/* Card Middle: Student ID / Card Number */}
          <div className="font-mono text-sm tracking-wider font-extrabold text-ink-900/90">
            4149 7358 6754 8745
          </div>

          {/* Card Bottom: Date, Contactless & Student Name */}
          <div className="flex items-end justify-between text-[11px] font-bold text-ink-900/80">
            <div>
              <span className="text-[9px] uppercase tracking-wider block opacity-70">Ученик</span>
              <span className="truncate max-w-[120px] block">{studentName}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>07/26</span>
              <Wifi className="w-3.5 h-3.5 rotate-90" />
            </div>
          </div>
        </div>

        {/* Lesson Balance Info */}
        <div className="flex-1 space-y-2">
          <div className="text-[11px] font-extrabold text-coralAccent uppercase tracking-widest">
            Абонемент «АйДаУмничка»
          </div>
          <h4 suppressHydrationWarning className="text-xl font-extrabold text-ink-900 tracking-tight leading-snug">
            Баланс: {balance} {balance === 1 ? 'занятие' : balance >= 2 && balance <= 4 ? 'занятия' : 'занятий'}
          </h4>
          <p className="text-xs text-ink-500 leading-relaxed">
            Индивидуальные занятия с логопедом и развивающие уроки. Списание происходит автоматически только после фактического завершения занятия.
          </p>

          {/* Pill Slider Indicator matching the reference */}
          <div className="pt-2 flex items-center gap-3">
            <div className="flex-1 bg-[#FDEEDC] h-2 rounded-full overflow-hidden">
              <div
                className="bg-coralAccent h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (balance / 8) * 100)}%` }}
              />
            </div>
            <span className="text-xs font-bold text-ink-700 whitespace-nowrap">
              {balance} / 8 уроков
            </span>
          </div>
        </div>
      </div>

      {/* Warning or Status Notice */}
      {isLowBalance ? (
        <div className="mt-2 p-3 bg-[#FEF2E8] border border-[#FCD5B5] rounded-2xl flex items-center justify-between gap-3 text-xs text-ink-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-coralAccent shrink-0" />
            <span className="font-semibold">Осталось мало уроков! Пополните абонемент у администратора.</span>
          </div>
          <Link
            href="/admin"
            className="text-coralAccent font-extrabold hover:underline whitespace-nowrap flex items-center gap-1"
          >
            <span>Продлить</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="mt-2 flex items-center justify-between text-xs text-ink-500 pt-2 border-t border-[#F7EBE0]">
          <span className="flex items-center gap-1.5 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-coralAccent" />
            Пакет активен • Тольятти
          </span>
          <Link href="/admin" className="text-ink-800 font-bold hover:text-coralAccent transition-colors">
            История начислений →
          </Link>
        </div>
      )}
    </div>
  );
}
