'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Coins, Users, CheckCircle, Calendar } from 'lucide-react';
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
      {/* Admin Header (Warm cream, pill badges) */}
      <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-[#F2E3D5] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-3xl bg-[#FFF7EE] border-2 border-[#F4DEC6] flex items-center justify-center text-coralAccent font-bold text-xl shrink-0">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-ink-900">Панель Управления Центром</h1>
              <span className="text-[11px] bg-limeAccent text-ink-900 font-extrabold px-3 py-0.5 rounded-full">
                Администрация
              </span>
            </div>
            <p className="text-xs text-ink-500 mt-1">
              Детский развивающий центр «АйДаУмничка» (г. Тольятти) • Управление абонементами и преподавателями
            </p>
          </div>
        </div>

        {/* Quick Stats Pill Cards */}
        <div className="flex items-center gap-3">
          <div className="bg-[#FFF7EE] border border-[#F4DEC6] px-4 py-2 rounded-2xl text-center">
            <span className="text-[10px] text-ink-400 font-bold uppercase tracking-wider">Учеников</span>
            <p className="text-lg font-black text-ink-900">28</p>
          </div>
          <div className="bg-[#FFF7EE] border border-[#F4DEC6] px-4 py-2 rounded-2xl text-center">
            <span className="text-[10px] text-ink-400 font-bold uppercase tracking-wider">Уроков за месяц</span>
            <p className="text-lg font-black text-coralAccent">142</p>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-[#F2FBE8] border border-[#C5E87D] rounded-2xl text-ink-900 text-xs font-bold flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Grid: Recharge Card + Student List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Quick Balance Recharge Card */}
        <div className="lg:col-span-4 bg-white rounded-[36px] p-6 sm:p-8 border border-[#F2E3D5] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Coins className="w-5 h-5 text-coralAccent" />
              <h2 className="text-lg font-black text-ink-900">Пополнение абонемента</h2>
            </div>

            <div className="p-4 bg-[#FFF7EE] rounded-2xl border border-[#F2E2D0] mb-6">
              <span className="text-xs text-ink-500 font-medium">Выбранный ученик:</span>
              <p className="text-sm font-extrabold text-ink-900 mt-0.5">Тимофей Смирнов (6 лет)</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-xs text-ink-500">Текущий баланс:</span>
                <span className="text-xl font-black text-coralAccent">{studentBalance} уроков</span>
              </div>
            </div>

            <p className="text-xs font-bold text-ink-700 mb-3">Начислить пакет занятий:</p>

            <div className="space-y-2.5">
              <button
                onClick={() => adjustBalance(4, 'Оплата мини-абонемента (+4 урока)')}
                className="w-full py-3 px-4 bg-[#FFFDFB] hover:bg-[#FFF7EE] border border-[#EADBCC] text-ink-900 rounded-2xl text-xs font-bold transition-all flex items-center justify-between"
              >
                <span>Пакет «Старт» (+4 занятия)</span>
                <span className="text-coralAccent font-black">+4</span>
              </button>
              <button
                onClick={() => adjustBalance(8, 'Оплата стандартного абонемента (+8 уроков)')}
                className="w-full py-3 px-4 bg-[#FFF7EE] hover:bg-[#FDEEDC] text-ink-900 rounded-2xl text-xs font-extrabold transition-all flex items-center justify-between border-2 border-[#F4DEC6]"
              >
                <span>Пакет «Оптимальный» (+8 занятий)</span>
                <span className="text-coralAccent font-black">+8</span>
              </button>
              <button
                onClick={() => adjustBalance(16, 'Оплата расширенного абонемента (+16 уроков)')}
                className="w-full py-3 px-4 bg-limeAccent/30 hover:bg-limeAccent/50 text-ink-900 rounded-2xl text-xs font-extrabold transition-all flex items-center justify-between border border-[#C5E87D]"
              >
                <span>Пакет «Интенсив» (+16 занятий)</span>
                <span className="text-emerald-800 font-black">+16</span>
              </button>
              <button
                onClick={() => adjustBalance(-1, 'Ручная корректировка / внеочередное списание')}
                className="w-full py-2 px-4 text-[#B91C1C] hover:bg-[#FEE2E2] rounded-xl text-xs font-medium transition-all text-center"
              >
                Списать 1 занятие (ручная корректировка)
              </button>
            </div>
          </div>

          <p className="text-[11px] text-ink-400 mt-4 text-center">
            Все операции автоматически фиксируются в аудит-журнале
          </p>
        </div>

        {/* Student List Table */}
        <div className="lg:col-span-8 bg-white rounded-[36px] p-6 sm:p-8 border border-[#F2E3D5] shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-coralAccent" />
              <h2 className="text-lg font-black text-ink-900">Ученики центра «АйДаУмничка»</h2>
            </div>
            <span className="text-xs text-ink-400">Тольятти</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FFF7EE] text-ink-500 font-bold border-b border-[#F4E3D2]">
                <tr>
                  <th className="py-3 px-4">Ученик / Родитель</th>
                  <th className="py-3 px-4">Преподаватель</th>
                  <th className="py-3 px-4">Баланс</th>
                  <th className="py-3 px-4">Статус</th>
                  <th className="py-3 px-4">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F7EBE0] text-ink-700">
                <tr className="hover:bg-[#FFFAF5]">
                  <td className="py-4 px-4 font-extrabold text-ink-900">
                    Тимофей Смирнов
                    <span className="block text-[11px] text-ink-400 font-normal">Елена (мама), +7 927...</span>
                  </td>
                  <td className="py-4 px-4">Светлана Васильевна (Логопед)</td>
                  <td className="py-4 px-4 font-black text-coralAccent">{studentBalance} уроков</td>
                  <td className="py-4 px-4">
                    <span className="px-3 py-1 rounded-full bg-limeAccent text-ink-900 text-[10px] font-extrabold">
                      Активен
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <button
                      onClick={() => adjustBalance(8, 'Быстрое продление +8')}
                      className="text-coralAccent hover:underline font-extrabold"
                    >
                      +8 зан.
                    </button>
                  </td>
                </tr>

                <tr className="hover:bg-[#FFFAF5]">
                  <td className="py-4 px-4 font-extrabold text-ink-900">
                    Алиса Васильева
                    <span className="block text-[11px] text-ink-400 font-normal">Анна (мама), +7 937...</span>
                  </td>
                  <td className="py-4 px-4">Светлана Васильевна (Логопед)</td>
                  <td className="py-4 px-4 font-bold text-ink-900">4 урока</td>
                  <td className="py-4 px-4">
                    <span className="px-3 py-1 rounded-full bg-limeAccent text-ink-900 text-[10px] font-extrabold">
                      Активен
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <button className="text-coralAccent hover:underline font-extrabold">+8 зан.</button>
                  </td>
                </tr>

                <tr className="hover:bg-[#FFFAF5]">
                  <td className="py-4 px-4 font-extrabold text-ink-900">
                    Максим Кузнецов
                    <span className="block text-[11px] text-ink-400 font-normal">Игорь (папа), +7 917...</span>
                  </td>
                  <td className="py-4 px-4">Ирина Петровна (Дефектолог)</td>
                  <td className="py-4 px-4 font-bold text-[#B45309]">1 урок ⚠️</td>
                  <td className="py-4 px-4">
                    <span className="px-3 py-1 rounded-full bg-[#FEF3C7] text-[#92400E] text-[10px] font-extrabold">
                      Заканчивается
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <button className="text-coralAccent hover:underline font-extrabold">+8 зан.</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Balance Transactions Log */}
      <div className="bg-white rounded-[36px] p-6 sm:p-8 border border-[#F2E3D5] shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-ink-700" />
            <h2 className="text-lg font-black text-ink-900">Журнал транзакций баланса (Аудит)</h2>
          </div>
          <span className="text-xs text-ink-400">Записей: {transactions.length}</span>
        </div>

        <div className="space-y-3">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="p-4 rounded-2xl border border-[#F4E3D2] bg-[#FFFDFB] flex items-center justify-between gap-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`font-black text-xs px-2.5 py-1 rounded-full ${
                      tx.amount > 0 ? 'bg-limeAccent text-ink-900' : 'bg-[#FEE2E2] text-[#991B1B]'
                    }`}
                  >
                    {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                  </span>
                  <span className="font-extrabold text-xs text-ink-900">{tx.description}</span>
                </div>
                <p className="text-[11px] text-ink-500 mt-1">
                  Ученик: {tx.studentName} • Инициатор: {tx.adminName}
                </p>
              </div>

              <span className="text-[11px] text-ink-400 shrink-0">
                {formatDate(tx.createdAt)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
