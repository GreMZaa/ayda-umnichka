'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Coins, Users, CheckCircle, Calendar, AlertTriangle, UserCheck, RefreshCw } from 'lucide-react';
import { BalanceTransaction } from '@/types';
import { formatDate } from '@/lib/utils';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

interface StudentRecord {
  id: string;
  public_id: string;
  full_name: string;
  role: string;
  balance_lessons: number;
  phone?: string;
  created_at?: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null);
  const [transactions, setTransactions] = useState<BalanceTransaction[]>([]);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('user_bindings')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          const studentList: StudentRecord[] = data.map((b: any) => ({
            id: b.id,
            public_id: b.public_id,
            full_name: b.full_name || 'Ученик',
            role: b.role || 'student',
            balance_lessons: b.balance_lessons ?? 1,
            phone: b.phone || '',
            created_at: b.created_at,
          }));
          setStudents(studentList);
          if (studentList.length > 0) {
            setSelectedStudent(studentList[0]);
          } else {
            setSelectedStudent(null);
          }
        }
      }
    } catch (err) {
      console.warn('Could not fetch students from Supabase:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const role = localStorage.getItem('aida_active_role') || document.cookie.match(/(?:^|; )aida_active_role=([^;]*)/)?.[1];
    if (role !== 'admin') {
      setIsAuthorized(false);
      router.replace('/login?redirect=/admin&error=forbidden');
      return;
    }
    setIsAuthorized(true);
    fetchStudents();
  }, [router]);

  if (isAuthorized === false) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-6 border border-red-200 text-center max-w-sm space-y-3">
          <Shield className="w-10 h-10 text-red-500 mx-auto" />
          <h2 className="text-lg font-black text-ink-900">Доступ ограничен</h2>
          <p className="text-xs text-ink-500">Требуются права администратора. Перенаправляем на форму авторизации...</p>
        </div>
      </div>
    );
  }

  const adjustBalance = async (amount: number, description: string) => {
    if (!selectedStudent) return;
    const newBalance = Math.max(0, selectedStudent.balance_lessons + amount);

    // Update in Supabase if configured
    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('user_bindings')
          .update({ balance_lessons: newBalance })
          .eq('public_id', selectedStudent.public_id);
      } catch (err) {
        console.warn('Balance update in Supabase failed:', err);
      }
    }

    const updated = { ...selectedStudent, balance_lessons: newBalance };
    setSelectedStudent(updated);
    setStudents((prev) => prev.map((s) => (s.public_id === selectedStudent.public_id ? updated : s)));

    const newTx: BalanceTransaction = {
      id: `tx-${Date.now()}`,
      studentId: selectedStudent.public_id,
      studentName: selectedStudent.full_name,
      adminName: 'Администратор',
      amount: amount,
      description: description,
      createdAt: new Date().toISOString(),
    };

    setTransactions([newTx, ...transactions]);
    setSuccessMsg(`Баланс ${selectedStudent.full_name} изменен на ${amount > 0 ? `+${amount}` : amount}. Текущий баланс: ${newBalance}.`);

    setTimeout(() => {
      setSuccessMsg(null);
    }, 4000);
  };

  return (
    <div className="space-y-8">
      {/* Admin Header */}
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

        {/* Quick Stats */}
        <div className="flex items-center gap-3">
          <div className="bg-[#FFF7EE] border border-[#F4DEC6] px-4 py-2 rounded-2xl text-center">
            <span className="text-[10px] text-ink-400 font-bold uppercase tracking-wider">Учеников</span>
            <p className="text-lg font-black text-ink-900">{students.length}</p>
          </div>
          <div className="bg-[#FFF7EE] border border-[#F4DEC6] px-4 py-2 rounded-2xl text-center">
            <span className="text-[10px] text-ink-400 font-bold uppercase tracking-wider">Уроков за месяц</span>
            <p className="text-lg font-black text-coralAccent">0</p>
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

            {selectedStudent ? (
              <div className="p-4 bg-[#FFF7EE] rounded-2xl border border-[#F2E2D0] mb-6">
                <span className="text-xs text-ink-500 font-medium">Выбранный ученик:</span>
                <p className="text-sm font-extrabold text-ink-900 mt-0.5">{selectedStudent.full_name}</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-xs text-ink-500">Текущий баланс:</span>
                  <span className="text-xl font-black text-coralAccent">{selectedStudent.balance_lessons} уроков</span>
                </div>
              </div>
            ) : (
              <div className="p-6 bg-[#FFF7EE] rounded-2xl border border-[#F2E2D0] mb-6 text-center">
                <p className="text-xs text-ink-500">Нет выбранного ученика</p>
                <span className="text-[11px] text-ink-400 mt-1 block">Ученики появятся после регистрации</span>
              </div>
            )}

            <p className="text-xs font-bold text-ink-700 mb-3">Начислить пакет занятий:</p>

            <div className="space-y-2.5">
              <button
                disabled={!selectedStudent}
                onClick={() => adjustBalance(4, 'Оплата мини-абонемента (+4 урока)')}
                className="w-full py-3 px-4 bg-[#FFFDFB] hover:bg-[#FFF7EE] border border-[#EADBCC] text-ink-900 rounded-2xl text-xs font-bold transition-[background-color,border-color,transform] duration-140 ease-out-emil active:scale-[0.98] flex items-center justify-between disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                <span>Пакет «Старт» (+4 занятия)</span>
                <span className="text-coralAccent font-black">+4</span>
              </button>
              <button
                disabled={!selectedStudent}
                onClick={() => adjustBalance(8, 'Оплата стандартного абонемента (+8 уроков)')}
                className="w-full py-3 px-4 bg-[#FFF7EE] hover:bg-[#FDEEDC] text-ink-900 rounded-2xl text-xs font-extrabold transition-[background-color,border-color,transform] duration-140 ease-out-emil active:scale-[0.98] flex items-center justify-between border-2 border-[#F4DEC6] disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                <span>Пакет «Оптимальный» (+8 занятий)</span>
                <span className="text-coralAccent font-black">+8</span>
              </button>
              <button
                disabled={!selectedStudent}
                onClick={() => adjustBalance(16, 'Оплата расширенного абонемента (+16 уроков)')}
                className="w-full py-3 px-4 bg-limeAccent/30 hover:bg-limeAccent/50 text-ink-900 rounded-2xl text-xs font-extrabold transition-[background-color,border-color,transform] duration-140 ease-out-emil active:scale-[0.98] flex items-center justify-between border border-[#C5E87D] disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                <span>Пакет «Интенсив» (+16 занятий)</span>
                <span className="text-emerald-800 font-black">+16</span>
              </button>
              <button
                disabled={!selectedStudent}
                onClick={() => adjustBalance(-1, 'Ручная корректировка / списание')}
                className="w-full py-2 px-4 text-[#B91C1C] hover:bg-[#FEE2E2] rounded-xl text-xs font-medium transition-[background-color,transform] duration-140 ease-out-emil active:scale-[0.98] text-center disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                Списать 1 занятие (ручная корректировка)
              </button>
            </div>
          </div>

          <p className="text-[11px] text-ink-400 mt-4 text-center">
            Все операции фиксируются в журнале аудита
          </p>
        </div>

        {/* Student List Table */}
        <div className="lg:col-span-8 bg-white rounded-[36px] p-6 sm:p-8 border border-[#F2E3D5] shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-coralAccent" />
              <h2 className="text-lg font-black text-ink-900">Ученики центра «АйДаУмничка»</h2>
            </div>
            <button
              onClick={fetchStudents}
              className="text-xs text-ink-500 hover:text-coralAccent flex items-center gap-1 cursor-pointer transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Обновить</span>
            </button>
          </div>

          {students.length === 0 ? (
            <div className="p-10 text-center rounded-2xl border border-dashed border-[#F4DEC6] bg-[#FFFAF5] space-y-2">
              <Users className="w-8 h-8 text-coralAccent mx-auto opacity-50" />
              <h4 className="font-bold text-sm text-ink-900">Нет зарегистрированных учеников</h4>
              <p className="text-xs text-ink-500 max-w-sm mx-auto">
                Новые ученики и их личные кабинеты будут отображаться здесь сразу после регистрации через форму входа.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FFF7EE] text-ink-500 font-bold border-b border-[#F4E3D2]">
                  <tr>
                    <th className="py-3 px-4">Ученик / ID</th>
                    <th className="py-3 px-4">Роль</th>
                    <th className="py-3 px-4">Баланс</th>
                    <th className="py-3 px-4">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F7EBE0] text-ink-700">
                  {students.map((student) => {
                    const isSelected = selectedStudent?.public_id === student.public_id;
                    return (
                      <tr
                        key={student.public_id}
                        onClick={() => setSelectedStudent(student)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-[#FFF2E4]' : 'hover:bg-[#FFFAF5]'
                        }`}
                      >
                        <td className="py-4 px-4 font-extrabold text-ink-900">
                          {student.full_name}
                          <span className="block text-[11px] text-ink-400 font-mono">
                            /{student.public_id}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="px-2.5 py-0.5 rounded-full bg-[#EEF8D5] text-[#5C8519] text-[10px] font-bold">
                            {student.role === 'teacher' ? 'Преподаватель' : 'Ученик'}
                          </span>
                        </td>
                        <td className="py-4 px-4 font-black text-coralAccent">
                          {student.balance_lessons} зан.
                        </td>
                        <td className="py-4 px-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStudent(student);
                              adjustBalance(8, 'Быстрое продление +8');
                            }}
                            className="text-coralAccent hover:underline font-extrabold cursor-pointer"
                          >
                            +8 зан.
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
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

        {transactions.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-dashed border-[#F4DEC6] bg-[#FFFAF5] text-xs text-ink-500">
            История операций пуста. Все начисления и списания баланса будут фиксироваться здесь.
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}
