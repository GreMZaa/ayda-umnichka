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
import LoginModal from '@/components/LoginModal';
import { getLkUrl } from '@/lib/lkUrl';

export default function Navbar() {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const isStudent = pathname === '/student';
  const isTeacher = pathname === '/teacher';
  const isAdmin = pathname === '/admin';
  const isInsideLk = isStudent || isTeacher || isAdmin;

  const [balance, setBalance] = useState<number>(6);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  useEffect(() => {
    const savedBalance = localStorage.getItem('aida_student_balance');
    if (savedBalance) setBalance(parseInt(savedBalance, 10));
  }, []);

  const navigateToSlide = (index: number) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('aida-navigate-slide', { detail: index }));
    }
  };

  const handleLkClick = () => {
    if (typeof window !== 'undefined') {
      const lkUrl = getLkUrl('/student');
      // If we are in production with an external LK subdomain, navigate there directly!
      if (lkUrl.startsWith('http')) {
        window.location.href = lkUrl;
        return;
      }
    }
    // On localhost, open the role selection / login modal
    setIsLoginModalOpen(true);
  };

  return (
    <>
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
                  Онлайн-уроки и репетиторы
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

              {isInsideLk ? (
                // Inside LK: Shows active role pill and role switcher
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsLoginModalOpen(true)}
                    className="bg-white hover:bg-[#FFF8F1] border border-[#F2DECE] text-[#161F38] font-extrabold px-3.5 py-2 rounded-full text-xs tracking-tight transition-all shadow-2xs flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <span className="w-2 h-2 rounded-full bg-[#5C8519]" />
                    <span>
                      {isStudent
                        ? 'Тимофей (Ученик)'
                        : isTeacher
                        ? 'Елена М. (Педагог)'
                        : 'Администратор'}
                    </span>
                    <ChevronDown className="w-3 h-3 text-[#8A95A8]" />
                  </button>

                  <Link
                    href="/"
                    className="hidden sm:inline-flex text-xs font-semibold text-[#8A95A8] hover:text-[#161F38] px-2 py-1 transition-colors"
                  >
                    На сайт →
                  </Link>
                </div>
              ) : (
                // On landing page: "Вход / Регистрация" button linking to LK
                <button
                  onClick={handleLkClick}
                  className="bg-[#C5E87D] hover:bg-[#B6DC67] text-[#161F38] font-black px-5 py-2.5 rounded-full text-xs tracking-tight transition-all shadow-xs flex items-center gap-2 active:scale-95 cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5 text-[#161F38]" />
                  <span>Вход / Регистрация</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Auth / Role Switcher Modal */}
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </>
  );
}
