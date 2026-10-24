'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles, Video, MessageCircle, UserCheck, Shield, GraduationCap, Coins } from 'lucide-react';
import { UserRole } from '@/types';

export default function Navbar() {
  const pathname = usePathname();
  const [activeRole, setActiveRole] = useState<UserRole>('student');
  const [balance, setBalance] = useState<number>(6);

  useEffect(() => {
    const savedRole = localStorage.getItem('aida_active_role') as UserRole;
    if (savedRole) setActiveRole(savedRole);
    const savedBalance = localStorage.getItem('aida_student_balance');
    if (savedBalance) setBalance(parseInt(savedBalance, 10));
  }, []);

  const switchRole = (role: UserRole) => {
    setActiveRole(role);
    localStorage.setItem('aida_active_role', role);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 text-solar-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg tracking-tight text-slate-800">АйДаУмничка</span>
                <span className="text-[10px] uppercase font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full">Тольятти</span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">Образовательная P2P онлайн-платформа</p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            <Link
              href="/student"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                pathname === '/student'
                  ? 'bg-brand-50 text-brand-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              <GraduationCap className="w-4 h-4 text-brand-600" />
              Кабинет Ученика
            </Link>
            <Link
              href="/teacher"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                pathname === '/teacher'
                  ? 'bg-brand-50 text-brand-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              <UserCheck className="w-4 h-4 text-indigo-600" />
              Преподаватель
            </Link>
            <Link
              href="/admin"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                pathname === '/admin'
                  ? 'bg-brand-50 text-brand-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              <Shield className="w-4 h-4 text-amber-600" />
              Админка
            </Link>
            <Link
              href="/messenger"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                pathname === '/messenger'
                  ? 'bg-brand-50 text-brand-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              Чат и ДЗ
            </Link>
            <Link
              href="/room/demo-live-room"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                pathname.startsWith('/room')
                  ? 'bg-brand-50 text-brand-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              <Video className="w-4 h-4 text-rose-500 animate-pulse" />
              Комната урока
            </Link>
          </nav>

          {/* Right Section: Balance & Role selector */}
          <div className="flex items-center gap-3">
            <Link
              href="/student"
              className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm"
              title="Баланс оплаченных занятий"
            >
              <Coins className="w-3.5 h-3.5 text-solar-500" />
              <span>Баланс: {balance} зан.</span>
            </Link>

            {/* Quick Role Switcher Pill */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-medium border border-slate-200">
              <button
                onClick={() => switchRole('student')}
                className={`px-2 py-1 rounded-lg transition-all ${
                  activeRole === 'student' ? 'bg-white text-slate-800 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Ученик
              </button>
              <button
                onClick={() => switchRole('teacher')}
                className={`px-2 py-1 rounded-lg transition-all ${
                  activeRole === 'teacher' ? 'bg-white text-slate-800 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Педагог
              </button>
              <button
                onClick={() => switchRole('admin')}
                className={`px-2 py-1 rounded-lg transition-all ${
                  activeRole === 'admin' ? 'bg-white text-slate-800 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Админ
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

