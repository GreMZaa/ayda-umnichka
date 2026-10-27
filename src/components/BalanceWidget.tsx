'use client';

import React, { useState, useEffect } from 'react';
import {
  Wifi,
  Coins,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

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
  const [liveBalance, setLiveBalance] = useState<number>(balance);
  const [isLoadingBalance, setIsLoadingBalance] = useState<boolean>(false);

  useEffect(() => {
    setLiveBalance(balance);
  }, [balance]);

  // Direct fetch and live Realtime subscription to Supabase balance
  useEffect(() => {
    if (!studentPublicId) return;

    const fetchLiveBalanceFromSupabase = async () => {
      try {
        setIsLoadingBalance(true);
        // 1. Direct query to Supabase user_bindings table
        const { data: binding } = await supabase
          .from('user_bindings')
          .select('balance_lessons')
          .ilike('public_id', studentPublicId)
          .maybeSingle();

        if (binding && typeof binding.balance_lessons === 'number') {
          setLiveBalance(binding.balance_lessons);
          try {
            localStorage.setItem('aida_student_balance', String(binding.balance_lessons));
            window.dispatchEvent(new Event('aida-user-updated'));
          } catch (_) {}
          return;
        }

        // 2. Fallback to profiles table
        const { data: profile } = await supabase
          .from('profiles')
          .select('balance_lessons')
          .ilike('public_id', studentPublicId)
          .maybeSingle();

        if (profile && typeof profile.balance_lessons === 'number') {
          setLiveBalance(profile.balance_lessons);
          try {
            localStorage.setItem('aida_student_balance', String(profile.balance_lessons));
            window.dispatchEvent(new Event('aida-user-updated'));
          } catch (_) {}
        }
      } catch (err) {
        console.warn('BalanceWidget Supabase fetch error:', err);
      } finally {
        setIsLoadingBalance(false);
      }
    };

    fetchLiveBalanceFromSupabase();

    // Live subscription to postgres_changes on user_bindings with unique channel ID
    const channelName = `widget-balance-${studentPublicId}-${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_bindings', filter: `public_id=eq.${studentPublicId}` },
        (payload: any) => {
          if (payload.new && typeof payload.new.balance_lessons === 'number') {
            setLiveBalance(payload.new.balance_lessons);
            try {
              localStorage.setItem('aida_student_balance', String(payload.new.balance_lessons));
              window.dispatchEvent(new Event('aida-user-updated'));
            } catch (_) {}
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [studentPublicId]);

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
      className={`bg-white rounded-3xl p-4 sm:p-5 border border-[#F2E0CF] shadow-xs hover:shadow-sm transition-shadow h-full flex flex-col justify-between ${className}`}
    >
      <div className="space-y-4">
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
        </div>

        {/* ─────────────────────────────────────────────────────────────
            THE STYLISH PASTEL PEACH STUDENT CARD WITH MONOGRAM AVATAR
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

          {/* Card Center: Card Number & Remaining Lessons */}
          <div className="relative z-10 py-1 flex items-center justify-between">
            <div>
              <span className="text-[9px] uppercase tracking-widest text-[#161F38]/70 block font-bold">
                Номер карты ученика
              </span>
              <div className="font-mono text-sm sm:text-base tracking-widest font-black text-[#161F38]/95 drop-shadow-2xs">
                4149 •••• •••• {formattedId}
              </div>
            </div>
            <div className="bg-white/40 backdrop-blur-xs px-2.5 py-1 rounded-xl border border-white/60 text-right shadow-2xs">
              <span className="text-[8px] uppercase tracking-wider text-[#161F38]/70 block font-bold">
                Остаток
              </span>
              <span className="font-black text-xs text-[#161F38]">
                {liveBalance} {getBalanceEnding(liveBalance)}
              </span>
            </div>
          </div>

          {/* Card Bottom: Monogram Avatar, Student Name, Validity & Contactless */}
          <div className="flex items-end justify-between relative z-10 pt-1 border-t border-white/30">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-white text-coralAccent font-black text-sm flex items-center justify-center shadow-2xs border-2 border-white uppercase shrink-0">
                {studentName[0] || 'У'}
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
      </div>
    </div>
  );
}
