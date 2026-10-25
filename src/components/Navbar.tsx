'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Video, MessageCircle, UserCheck, Shield, GraduationCap, Coins, Sparkles } from 'lucide-react';
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
    <header className="sticky top-0 z-50 bg-[#FFF7EE]/90 backdrop-blur-md border-b border-[#F4E4D3]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo matching the reference style */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-coralAccent text-white flex items-center justify-center font-black text-lg shadow-sm group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight text-ink-900">АйДаУмничка</span>
                <span className="text-[10px] uppercase font-bold bg-[#FDEEDC] text-coralAccent px-2 py-0.5 rounded-full border border-[#F4DEC6]">
                  Тольятти
                </span>
              </div>
              <p className="text-[11px] text-ink-500 hidden sm:block">Детский центр развития речи и интеллекта</p>
            </div>
          </Link>

          {/* Navigation Links (Clean, minimal, spacious like reference) */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8">
            <Link
              href="/"
              className={`text-sm font-semibold transition-colors ${
                pathname === '/' ? 'text-ink-900 underline underline-offset-8 decoration-coralAccent decoration-2' : 'text-ink-700 hover:text-ink-900'
              }`}
            >
              Главная
            </Link>
            <Link
              href="/student"
              className={`text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                pathname === '/student' ? 'text-ink-900 underline underline-offset-8 decoration-coralAccent decoration-2' : 'text-ink-700 hover:text-ink-900'
              }`}
            >
              <GraduationCap className="w-4 h-4 text-coralAccent" />
              Ученик
            </Link>
            <Link
              href="/teacher"
              className={`text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                pathname === '/teacher' ? 'text-ink-900 underline underline-offset-8 decoration-coralAccent decoration-2' : 'text-ink-700 hover:text-ink-900'
              }`}
            >
              <UserCheck className="w-4 h-4 text-ink-700" />
              Педагог
            </Link>
            <Link
              href="/admin"
              className={`text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                pathname === '/admin' ? 'text-ink-900 underline underline-offset-8 decoration-coralAccent decoration-2' : 'text-ink-700 hover:text-ink-900'
              }`}
            >
              <Shield className="w-4 h-4 text-ink-700" />
              Админка
            </Link>
            <Link
              href="/messenger"
              className={`text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                pathname === '/messenger' ? 'text-ink-900 underline underline-offset-8 decoration-coralAccent decoration-2' : 'text-ink-700 hover:text-ink-900'
              }`}
            >
              <MessageCircle className="w-4 h-4 text-ink-700" />
              Чат и ДЗ
            </Link>
          </nav>

          {/* Right Section: Balance Pill + Sign Up / Room Action */}
          <div className="flex items-center gap-3">
            {/* Balance Pill like the card balance */}
            <Link
              href="/student"
              className="hidden sm:flex items-center gap-2 bg-white border border-[#EADBCC] px-3.5 py-1.5 rounded-full text-xs font-bold text-ink-800 shadow-sm hover:border-coralAccent transition-all"
            >
              <Coins className="w-4 h-4 text-coralAccent" />
              <span>Баланс: <strong className="text-ink-900">{balance}</strong> зан.</span>
            </Link>

            {/* Signature Lime Pill Button from the reference design! */}
            <Link
              href="/room/demo-live-room"
              className="bg-limeAccent hover:bg-limeAccent-hover text-ink-900 font-extrabold px-5 py-2.5 rounded-full text-xs tracking-tight transition-all shadow-sm flex items-center gap-2 active:scale-95"
            >
              <Video className="w-3.5 h-3.5 text-ink-900" />
              <span>Войти в урок</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
