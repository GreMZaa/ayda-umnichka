'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Coins, Users, PlusCircle, CheckCircle, TrendingUp, Calendar, Search } from 'lucide-react';
import { INITIAL_PROFILES, INITIAL_TRANSACTIONS } from '@/lib/store';
import { BalanceTransaction } from '@/types';
import { formatDate } from '@/lib/utils';

export default function AdminDashboard() {
  const [studentBalance, setStudentBalance] = useState<number>(6);
  const [transactions, setTransactions] = useState<BalanceTransaction[]>(INITIAL_TRANSACTIONS);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('aida_student_balance');
    if (saved) {
      setStudentBalance(parseInt(saved, 10));
    }
  }, []);

  const adjustBalance = (amount: number, description: string) => {
    const newBalance = studentBalance + amount;
    setStudentBalance(newBalance);
    localStorage.setItem('aida_student_balance', newBalance.toString());

    const newTx: BalanceTransaction = {
      id: `tx-${Date.now()}`,
      studentId: 'user-student-1',
      studentName: 'Тимофей Смирнов',
      adminName: 'Ольга Николаевна (Руководитель)',
      amount: amount,
      description: description,
      createdAt: new Date().toISOString(),
    };

    setTransactions([newTx, ...transactions]);
    setSuccessMsg(`Баланс успешно изменен на ${amount > 0 ? `+${amount}` : amount} занятий. Текущий баланс: ${newBalance}.`);

    setTimeout(() => {
      setSuccessMsg(null);
    }, 4000);
  };

  return (
    <div className="space-y-8">
      {/* Admin Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 border-2 border-amber-200 flex items-center justify-center text-amber-700 font-bold text-xl">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Панель Управления Центром</h1>
              <span className="text-[11px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full">
                Администрация
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Детский развивающий центр «АйДаУмничка» (г. Тольятти) • Управление абонементами и преподавателями
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-2xl text-center">
            <span className="text-xs text-slate-500 font-medium">Активных учеников</span>
            <p className="text-lg font-black text-slate-900">28</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-2xl text-center">
            <span className="text-xs text-slate-500 font-medium">Уроков в этом месяце</span>
            <p className="text-lg font-black text-brand-600">142</p>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Balance Recharge & Student Management Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Balance Recharge Card */}
        <div className="lg:col-span-1 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Coins className="w-5 h-5 text-solar-500" />
              <h2 className="text-lg font-bold text-slate-900">Пополнение абонемента</h2>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-6">
              <span className="text-xs text-slate-500 font-medium">Выбранный ученик:</span>
              <p className="text-sm font-bold text-slate-900 mt-0.5">Тимофей Смирнов (6 лет)</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-xs text-slate-600">Текущий баланс:</span>
                <span className="text-xl font-black text-brand-600">{studentBalance} уроков</span>
              </div>
            </div>

            <p className="text-xs font-semibold text-slate-700 mb-3">Начислить пакет занятий:</p>

            <div className="space-y-2">
              <button
                onClick={() => adjustBalance(4, 'Оплата мини-абонемента (+4 урока)')}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center justify-between"
              >
                <span>Пакет «Старт» (+4 занятия)</span>
                <span className="text-brand-600">+4</span>
              </button>
              <button
                onClick={() => adjustBalance(8, 'Оплата стандартного абонемента (+8 уроков)')}
                className="w-full py-2.5 px-4 bg-brand-50 hover:bg-brand-100 text-brand-800 rounded-xl text-xs font-bold transition-all flex items-center justify-between border border-brand-200"
              >
                <span>Пакет «Оптимальный» (+8 занятий)</span>
                <span className="text-brand-600 font-black">+8</span>
              </button>
              <button
                onClick={() => adjustBalance(16, 'Оплата расширенного абонемента (+16 уроков)')}
                className="w-full py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold transition-all flex items-center justify-between border border-emerald-200"
              >
                <span>Пакет «Интенсив» (+16 занятий)</span>
                <span className="text-emerald-700 font-black">+16</span>
              </button>
              <button
                onClick={() => adjustBalance(-1, 'Ручная корректировка / внеочередное списание')}
                className="w-full py-2 px-4 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-medium transition-all text-center"
              >
                Списать 1 занятие (ручная корректировка)
              </button>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 mt-4 text-center">
            Все изменения баланса автоматически фиксируются в аудит-журнале
          </p>
        </div>

        {/* Student List Table */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-brand-600" />
              <h2 className="text-lg font-bold text-slate-900">Ученики и преподаватели</h2>
            </div>
            <span className="text-xs text-slate-500">База центра «АйДаУмничка»</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">Ученик / Родитель</th>
                  <th className="py-3 px-3">Преподаватель</th>
                  <th className="py-3 px-3">Баланс уроков</th>
                  <th className="py-3 px-3">Статус</th>
                  <th className="py-3 px-3">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr className="hover:bg-slate-50/80">
                  <td className="py-3.5 px-3 font-semibold text-slate-900">
                    Тимофей Смирнов
                    <span className="block text-[11px] text-slate-500 font-normal">Елена (мама), +7 927...</span>
                  </td>
                  <td className="py-3.5 px-3">Светлана Васильевна (Логопед)</td>
                  <td className="py-3.5 px-3 font-bold text-brand-600">{studentBalance} уроков</td>
                  <td className="py-3.5 px-3">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      Активен
                    </span>
                  </td>
                  <td className="py-3.5 px-3">
                    <button
                      onClick={() => adjustBalance(8, 'Быстрое продление +8')}
                      className="text-brand-600 hover:underline font-bold"
                    >
                      +8 зан.
                    </button>
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/80">
                  <td className="py-3.5 px-3 font-semibold text-slate-900">
                    Алиса Васильева
                    <span className="block text-[11px] text-slate-500 font-normal">Анна (мама), +7 937...</span>
                  </td>
                  <td className="py-3.5 px-3">Светлана Васильевна (Логопед)</td>
                  <td className="py-3.5 px-3 font-bold text-slate-800">4 урока</td>
                  <td className="py-3.5 px-3">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      Активен
                    </span>
                  </td>
                  <td className="py-3.5 px-3">
                    <button className="text-brand-600 hover:underline font-bold">+8 зан.</button>
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/80">
                  <td className="py-3.5 px-3 font-semibold text-slate-900">
                    Максим Кузнецов
                    <span className="block text-[11px] text-slate-500 font-normal">Игорь (папа), +7 917...</span>
                  </td>
                  <td className="py-3.5 px-3">Ирина Петровна (Дефектолог)</td>
                  <td className="py-3.5 px-3 font-bold text-amber-600">1 урок ⚠️</td>
                  <td className="py-3.5 px-3">
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                      Заканчивается
                    </span>
                  </td>
                  <td className="py-3.5 px-3">
                    <button className="text-brand-600 hover:underline font-bold">+8 зан.</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Balance Transactions Log */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900">Журнал транзакций баланса (Аудит)</h2>
          </div>
          <span className="text-xs text-slate-500">Записей: {transactions.length}</span>
        </div>

        <div className="space-y-3">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between gap-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`font-black text-sm px-2 py-0.5 rounded ${
                      tx.amount > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                  </span>
                  <span className="font-bold text-xs text-slate-900">{tx.description}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Ученик: {tx.studentName} • Инициатор: {tx.adminName}
                </p>
              </div>

              <span className="text-[11px] text-slate-400 shrink-0">
                {formatDate(tx.createdAt)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
