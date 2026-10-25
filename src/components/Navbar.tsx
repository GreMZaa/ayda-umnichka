'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LogIn,
  GraduationCap,
  UserCheck,
  Shield,
  MessageCircle,
  Coins,
  ChevronDown,
} from 'lucide-react';
import { getLkUrl } from '@/lib/lkUrl';

export default function Navbar() {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const isLogin = pathname === '/login';
  const isStudent = pathname === '/student';
  const isTeacher = pathname === '/teacher';
  const isAdmin = pathname === '/admin';
  const isInsideLk = isStudent || isTeacher || isAdmin;

  const [balance, setBalance] = useState<number>(6);
  const [lkUrl, setLkUrl] = useState<string>('https://lk-ayda-umnichka.vercel.app/login');

  useEffect(() => {
    const savedBalance = localStorage.getItem('aida_student_balance');
    if (savedBalance) setBalance(parseInt(savedBalance, 10));
    setLkUrl(getLkUrl('/login'));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('aida_active_role');
    document.cookie = 'aida_active_role=; path=/; max-age=0';
    window.location.href = '/login';
  };

  const navigateToSlide = (index: number) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('aida-navigate-slide', { detail: index }));
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-[#FFF7EE]/95 backdrop-blur-md border-b border-[#F4E4D3]">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Brand Logo with Official Center Logo */}
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden relative shadow-xs border-2 border-white bg-white group-hover:scale-105 transition-transform shrink-0">
              <Image
                src="/images/logo-official.png"
                alt="Логотип АйДаУмничка"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-black text-lg sm:text-xl tracking-tight text-[#161F38]">АйДаУмничка</span>
              </div>
              <p className="text-[11px] text-[#6B758E] hidden sm:block font-medium">
                Центр подготовки к школе и развития детей
              </p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8">
            {isHome ? (
              <>
                <button
                  onClick={() => navigateToSlide(0)}
                  className="text-sm font-semibold text-[#161F38] hover:text-coralAccent transition-colors cursor-pointer"
                >
                  Главная
                </button>
                <button
                  onClick={() => navigateToSlide(1)}
                  className="text-sm font-semibold text-[#161F38]/80 hover:text-coralAccent transition-colors cursor-pointer"
                >
                  Записаться на урок
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/"
                  className="text-sm font-semibold text-[#161F38]/80 hover:text-[#161F38] transition-colors"
                >
                  Главная
                </Link>
                <Link
                  href="/student"
                  className={`text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                    pathname === '/student'
                      ? 'text-[#161F38] font-bold underline underline-offset-8 decoration-coralAccent decoration-2'
                      : 'text-[#161F38]/80 hover:text-[#161F38]'
                  }`}
                >
                  <GraduationCap className="w-4 h-4 text-coralAccent" />
                  Ученик
                </Link>
                <Link
                  href="/teacher"
                  className={`text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                    pathname === '/teacher'
                      ? 'text-[#161F38] font-bold underline underline-offset-8 decoration-coralAccent decoration-2'
                      : 'text-[#161F38]/80 hover:text-[#161F38]'
                  }`}
                >
                  <UserCheck className="w-4 h-4 text-[#161F38]" />
                  Педагог
                </Link>
                <Link
                  href="/admin"
                  className={`text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                    pathname === '/admin'
                      ? 'text-[#161F38] font-bold underline underline-offset-8 decoration-coralAccent decoration-2'
                      : 'text-[#161F38]/80 hover:text-[#161F38]'
                  }`}
                >
                  <Shield className="w-4 h-4 text-[#161F38]" />
                  Админка
                </Link>
                <Link
                  href="/messenger"
                  className={`text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                    pathname === '/messenger'
                      ? 'text-[#161F38] font-bold underline underline-offset-8 decoration-coralAccent decoration-2'
                      : 'text-[#161F38]/80 hover:text-[#161F38]'
                  }`}
                >
                  <MessageCircle className="w-4 h-4 text-[#161F38]" />
                  Чат и ДЗ
                </Link>
              </>
            )}
          </nav>

          {/* Right Section */}
          <div className="flex items-center gap-3">
            {/* Balance Pill — Only visible when inside cabinet pages */}
            {!isHome && !isLogin && (
              <Link
                href="/student"
                suppressHydrationWarning
                className="hidden sm:flex items-center gap-2 bg-white border border-[#EADBCC] px-3.5 py-1.5 rounded-full text-xs font-bold text-[#161F38] shadow-xs hover:border-coralAccent transition-all"
              >
                <Coins className="w-4 h-4 text-coralAccent" />
                <span suppressHydrationWarning>
                  Баланс: <strong className="text-[#161F38]">{balance}</strong> зан.
                </span>
              </Link>
            )}

            {isInsideLk ? (
              // Inside LK: Shows active role pill, logout, and navigation back to main site
              <div className="flex items-center gap-2">
                <div className="bg-white border border-[#F2DECE] text-[#161F38] font-extrabold px-3.5 py-2 rounded-full text-xs tracking-tight shadow-2xs flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#5C8519]" />
                  <span>
                    {isStudent
                      ? 'Тимофей (Ученик)'
                      : isTeacher
                      ? 'Елена М. (Педагог)'
                      : 'Администратор'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  title="Сменить роль или выйти"
                  className="text-xs font-bold text-[#8A95A8] hover:text-coralAccent px-2.5 py-1.5 rounded-full hover:bg-white border border-transparent hover:border-[#F2DECE] transition-all cursor-pointer"
                >
                  Выйти
                </button>

                <a
                  href="https://ayda-umnichka.vercel.app"
                  className="hidden sm:inline-flex text-xs font-semibold text-[#8A95A8] hover:text-[#161F38] px-2 py-1 transition-colors"
                >
                  На сайт →
                </a>
              </div>
            ) : isLogin ? (
              <a
                href="https://ayda-umnichka.vercel.app"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#161F38] bg-white border border-[#EADBCC] px-4 py-2 rounded-full hover:border-coralAccent transition-all shadow-xs"
              >
                <span>← На главную</span>
              </a>
            ) : (
              // On landing page: Direct real link to LK subdomain (lk-[project].vercel.app)
              <a
                href={lkUrl}
                className="bg-[#C5E87D] hover:bg-[#B6DC67] text-[#161F38] font-black px-3.5 py-2 sm:px-5 sm:py-2.5 rounded-full text-xs tracking-tight transition-all shadow-xs flex items-center gap-1.5 sm:gap-2 active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <LogIn className="w-3.5 h-3.5 text-[#161F38]" />
                <span>Вход / Регистрация</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
