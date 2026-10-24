'use client';

import React from 'react';
import Link from 'next/link';
import { Coins, AlertTriangle, ArrowUpRight, CheckCircle2 } from 'lucide-react';

interface BalanceWidgetProps {
  balance: number;
  studentName?: string;
}

export default function BalanceWidget({ balance, studentName = 'Тимофей' }: BalanceWidgetProps) {
  const isLowBalance = balance <= 1;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            isLowBalance ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
          }`}>
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Баланс занятий</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-800">{balance}</span>
              <span className="text-sm font-medium text-slate-600">
                {balance === 1 ? 'занятие' : balance >= 2 && balance <= 4 ? 'занятия' : 'занятий'}
              </span>
            </div>
          </div>
        </div>

        <Link
          href="/admin"
          className="text-xs text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1 hover:underline"
        >
          История оплат
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {isLowBalance ? (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Абонемент почти завершен!</p>
            <p className="mt-0.5 text-amber-800">
              Осталось всего {balance} занятие. Пожалуйста, пополните абонемент у администратора центра «АйДаУмничка», чтобы не прерывать учебную программу.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-4 p-2.5 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-2 text-xs text-slate-600">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Абонемент активен. Занятия списываются автоматически только по факту проведенного урока.</span>
        </div>
      )}
    </div>
  );
}

