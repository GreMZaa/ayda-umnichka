'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { LogIn, GraduationCap, UserCheck, Shield, MessageCircle, Sparkles, Coins } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const [balance, setBalance] = useState<number>(6);

  useEffect(() => {
    const savedBalance = localStorage.getItem('aida_student_balance');
    if (savedBalance) setBalance(parseInt(savedBalance, 10));
  }, []);

  const navigateToSlide = (index: number) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('aida-navigate-slide', { detail: index }));
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-[#FFF7EE]/95 backdrop-blur-md border-b border-[#F4E4D3]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo with Professional Vector Mark from logo-design */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl overflow-hidden relative shadow-xs border border-white group-hover:scale-105 transition-transform shrink-0">
              <Image
                src="/logo.svg"
                alt="Логотип АйДаУмничка"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xl tracking-tight text-[#161F38]">АйДаУмничка</span>
                <span className="text-[10px] uppercase font-bold bg-[#FDEEDC] text-coralAccent px-2 py-0.5 rounded-full border border-[#F4DEC6]">
                  Тольятти
                </span>
              </div>
              <p className="text-[11px] text-[#6B758E] hidden sm:block font-medium">
                Детский центр развития речи и интеллекта
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
                  Запись на урок
                </button>
                <button
                  onClick={() => navigateToSlide(2)}
                  className="text-sm font-semibold text-[#161F38]/80 hover:text-coralAccent transition-colors cursor-pointer"
                >
                  Программа и успехи
                </button>
                <button
                  onClick={() => navigateToSlide(3)}
                  className="text-sm font-semibold text-[#161F38]/80 hover:text-coralAccent transition-colors cursor-pointer"
                >
                  Кабинеты
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

          {/* Right Section: Hidden on Home, or Login / Registration CTA */}
          <div className="flex items-center gap-3">
            {/* Balance Pill — Only visible when NOT on homepage */}
            {!isHome && (
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

            {/* In place of "Войти в урок" -> "Вход / Регистрация" */}
            <Link
              href="/student"
              className="bg-[#C5E87D] hover:bg-[#B6DC67] text-[#161F38] font-black px-5 py-2.5 rounded-full text-xs tracking-tight transition-all shadow-xs flex items-center gap-2 active:scale-95"
            >
              <LogIn className="w-3.5 h-3.5 text-[#161F38]" />
              <span>Вход / Регистрация</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
