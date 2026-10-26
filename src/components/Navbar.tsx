'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  LogIn,
  GraduationCap,
  UserCheck,
  Shield,
  MessageCircle,
  Coins,
  ChevronDown,
  LogOut,
  ExternalLink,
  LayoutDashboard,
} from 'lucide-react';
import { getLkUrl } from '@/lib/lkUrl';
import { supabase } from '@/lib/supabase';

// Helper to clean technical registration suffixes like (ребёнок: ...) from display name
const cleanDisplayName = (name: string): string => {
  if (!name) return '';
  return name.replace(/\s*\(.*?\)$/, '').trim();
};

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname() || '';
  const isHome = pathname === '/' || pathname === '';
  const isLogin = pathname.startsWith('/login');
  const isTeacher = pathname.startsWith('/teacher');
  const isAdmin = pathname.startsWith('/admin');
  const isRoom = pathname.startsWith('/room');
  const isInsideLk = !isHome && !isLogin;
  const isStudent = isInsideLk && !isTeacher && !isAdmin && !isRoom;

  const [balance, setBalance] = useState<number>(0);
  const [userName, setUserName] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [lkUrl, setLkUrl] = useState<string>('https://lk-ayda-umnichka.vercel.app/login');
  const [logoClicks, setLogoClicks] = useState(0);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setProfileOpen(false);
      }
    };
    if (profileOpen) {
      document.addEventListener('pointerdown', handlePointerDown);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [profileOpen]);

  useEffect(() => {
    const updateFromStorage = () => {
      const savedBalance = localStorage.getItem('aida_student_balance');
      if (savedBalance) setBalance(parseInt(savedBalance, 10));
      const savedName = localStorage.getItem('aida_full_name');
      if (savedName) setUserName(savedName);

      const savedRole =
        localStorage.getItem('aida_active_role') ||
        document.cookie.match(/(?:^|; )aida_active_role=([^;]*)/)?.[1] ||
        '';
      if (savedRole) setUserRole(savedRole);

      const savedUid =
        localStorage.getItem('aida_auth_user_id') ||
        localStorage.getItem('aida_user_id') ||
        document.cookie.match(/(?:^|; )aida_auth_user_id=([^;]*)/)?.[1] ||
        '';
      if (savedUid) setUserId(savedUid);
    };

    updateFromStorage();
    window.addEventListener('storage', updateFromStorage);
    window.addEventListener('aida-user-updated', updateFromStorage);
    setLkUrl(getLkUrl('/login'));

    return () => {
      window.removeEventListener('storage', updateFromStorage);
      window.removeEventListener('aida-user-updated', updateFromStorage);
    };
  }, []);

  // Real-time Supabase sync for student balance
  useEffect(() => {
    const pathPart = pathname.match(/^\/([^/?#]+)/)?.[1];
    const isSpecialPath = ['admin', 'teacher', 'student', 'login', 'messenger', 'room', 'api'].includes(pathPart || '');
    const activePublicId = (!isSpecialPath && pathPart)
      ? pathPart
      : userId ||
        (typeof window !== 'undefined'
          ? localStorage.getItem('aida_auth_user_id') ||
            localStorage.getItem('aida_user_id') ||
            document.cookie.match(/(?:^|; )aida_auth_user_id=([^;]*)/)?.[1]
          : null);

    if (!activePublicId) return;

    const fetchBalanceFromSupabase = async () => {
      try {
        const { data } = await supabase
          .from('user_bindings')
          .select('balance_lessons, full_name, role')
          .ilike('public_id', activePublicId)
          .maybeSingle();

        if (data) {
          if (typeof data.balance_lessons === 'number') {
            setBalance(data.balance_lessons);
            localStorage.setItem('aida_student_balance', String(data.balance_lessons));
          }
          if (data.full_name) {
            setUserName(data.full_name);
            localStorage.setItem('aida_full_name', cleanDisplayName(data.full_name));
          }
          if (data.role) {
            setUserRole(data.role);
          }
        }
      } catch (err) {
        console.warn('Navbar Supabase fetch error:', err);
      }
    };

    fetchBalanceFromSupabase();

    const channel = supabase
      .channel(`navbar-balance-${activePublicId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_bindings', filter: `public_id=eq.${activePublicId}` },
        (payload: any) => {
          if (payload.new && typeof payload.new.balance_lessons === 'number') {
            setBalance(payload.new.balance_lessons);
            localStorage.setItem('aida_student_balance', String(payload.new.balance_lessons));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pathname, userId]);

  if (isRoom) return null;

  const handleLogoClick = (e: React.MouseEvent) => {
    const nextCount = logoClicks + 1;
    if (nextCount >= 3) {
      e.preventDefault();
      setLogoClicks(0);
      router.push('/admin');
    } else {
      setLogoClicks(nextCount);
      setTimeout(() => setLogoClicks(0), 1200);
    }
  };

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

  const displayName =
    cleanDisplayName(userName) ||
    (isStudent ? 'Ученик' : isTeacher ? 'Преподаватель' : 'Администратор');
  const roleLabel = isTeacher
    ? 'Педагог центра'
    : isAdmin
    ? 'Администратор'
    : 'Ученик';
  const initialLetter = displayName ? displayName[0].toUpperCase() : 'П';
  const myCabinetUrl = isTeacher
    ? `/teacher?id=${userId || 'id179017'}`
    : isAdmin
    ? '/admin'
    : userId
    ? `/${userId}`
    : '/student';

  const myMessengerUrl = `/messenger?id=${userId || (isTeacher ? 'id179017' : 'id571210')}`;

  const isActuallyTeacher =
    userRole === 'teacher' ||
    pathname.startsWith('/teacher') ||
    userId === 'id179017' ||
    userId === 'id180457';
  const isActuallyAdmin =
    userRole === 'admin' ||
    pathname.startsWith('/admin') ||
    userId === 'admin_head';
  const showStudentBalance =
    !isActuallyTeacher &&
    !isActuallyAdmin &&
    userRole === 'student' &&
    !isRoom &&
    !pathname.startsWith('/messenger') &&
    pathname !== '/' &&
    pathname !== '/login';

  return (
    <header className="sticky top-0 z-50 bg-[#FFF7EE] border-b border-[#F4E4D3] shadow-2xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Brand Logo with Official Center Logo (Triple-click secret gateway to /admin) */}
          <Link href="/" onClick={handleLogoClick} className="flex items-center gap-2.5 sm:gap-3 group cursor-pointer" title="Нажмите 3 раза для перехода в админку">
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

          {/* Navigation Links — Hidden on /login and inside personal cabinets */}
          {!isLogin && !isInsideLk && (
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
                    href={myMessengerUrl}
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
          )}

          {/* Right Section */}
          <div className="flex items-center gap-3">
            {/* Balance Pill — Only visible for student */}
            {showStudentBalance && (
              <Link
                href={userId ? `/${userId}` : '/student'}
                suppressHydrationWarning
                className="hidden sm:flex items-center gap-2 bg-white border border-[#EADBCC] px-3.5 py-1.5 rounded-full text-xs font-bold text-[#161F38] shadow-xs hover:border-coralAccent transition-[border-color,box-shadow,transform] duration-140 ease-out-emil active:scale-[0.98]"
              >
                <Coins className="w-4 h-4 text-coralAccent" />
                <span suppressHydrationWarning>
                  Баланс: <strong className="text-[#161F38]">{balance}</strong> зан.
                </span>
              </Link>
            )}

            {isRoom ? (
              // Inside Video Lesson Room: Clean button to return to personal cabinet
              <Link
                href={
                  userRole === 'teacher'
                    ? `/teacher?id=${userId || 'id179017'}`
                    : userRole === 'admin'
                    ? '/admin'
                    : userId
                    ? `/${userId}`
                    : '/student'
                }
                className="bg-[#C5E87D] hover:bg-[#B6DC67] text-[#161F38] font-black px-4 py-2 sm:px-5 sm:py-2.5 rounded-full text-xs tracking-tight transition-[background-color,transform,box-shadow] duration-140 ease-out-emil shadow-xs flex items-center gap-1.5 active:scale-[0.97] cursor-pointer whitespace-nowrap"
              >
                <GraduationCap className="w-3.5 h-3.5 text-[#161F38]" />
                <span>Личный кабинет</span>
              </Link>
            ) : isInsideLk ? (
              // Inside LK: Modern Messenger shortcut & Interactive Profile Capsule with Popover
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                {/* Messenger Quick Access Pill */}
                <Link
                  href={myMessengerUrl}
                  title="Мессенджер и чаты"
                  className={`inline-flex items-center justify-center gap-1.5 px-3.5 h-8 rounded-full text-xs font-black transition-all duration-140 border shadow-2xs active:scale-95 cursor-pointer text-center leading-none ${
                    pathname === '/messenger'
                      ? 'bg-coralAccent text-white border-coralAccent shadow-xs shadow-orange-500/20'
                      : 'bg-white text-[#161F38] border-[#EADBCC] hover:border-coralAccent hover:text-coralAccent'
                  }`}
                >
                  <MessageCircle className={`w-3.5 h-3.5 shrink-0 ${pathname === '/messenger' ? 'text-white' : 'text-coralAccent'}`} />
                  <span className="hidden md:inline leading-none pt-0.5">Чаты</span>
                </Link>

                {/* Modern User Profile Menu */}
                <div className="relative" ref={profileMenuRef}>
                  <button
                    type="button"
                    onClick={() => setProfileOpen((prev) => !prev)}
                    className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full bg-white border border-[#EADBCC] hover:border-coralAccent/60 hover:shadow-xs shadow-2xs transition-[border-color,box-shadow,transform] duration-140 active:scale-[0.98] cursor-pointer select-none"
                    title="Меню профиля"
                  >
                    {/* Avatar Circle with role gradient + online green dot */}
                    <div className="relative shrink-0">
                      <div
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-black text-xs text-white shadow-2xs ${
                          isAdmin
                            ? 'bg-gradient-to-tr from-indigo-500 to-purple-600'
                            : isTeacher
                            ? 'bg-gradient-to-tr from-[#FF6B4A] to-[#FFA259]'
                            : 'bg-gradient-to-tr from-[#5C8519] to-[#8BC34A]'
                        }`}
                      >
                        {initialLetter}
                      </div>
                      <span className="w-2.5 h-2.5 rounded-full absolute -bottom-0.5 -right-0.5 border-2 border-white bg-[#5C8519]" />
                    </div>

                    {/* User Info & Role (visible on sm+) */}
                    <div className="hidden sm:flex flex-col items-start text-left min-w-0 max-w-[130px] md:max-w-[170px]">
                      <span
                        className="text-xs font-black text-[#161F38] truncate w-full leading-tight"
                        suppressHydrationWarning
                      >
                        {displayName}
                      </span>
                      <span
                        className="text-[10px] text-[#8A95A8] font-bold leading-tight truncate w-full"
                        suppressHydrationWarning
                      >
                        {roleLabel}
                      </span>
                    </div>

                    <ChevronDown
                      className={`w-3.5 h-3.5 text-[#8A95A8] transition-transform duration-200 shrink-0 ${
                        profileOpen ? 'rotate-180 text-coralAccent' : ''
                      }`}
                    />
                  </button>

                  {/* Modern Floating Dropdown Popover */}
                  {profileOpen && (
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl border border-[#F0DCCD] shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 ease-out origin-top-right space-y-1">
                      {/* User Header Card */}
                      <div className="p-2.5 bg-gradient-to-r from-[#FFFBF7] to-[#FFF4EA] rounded-xl border border-[#F6E6D8]">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm text-white shrink-0 shadow-2xs ${
                              isAdmin
                                ? 'bg-gradient-to-tr from-indigo-500 to-purple-600'
                                : isTeacher
                                ? 'bg-gradient-to-tr from-[#FF6B4A] to-[#FFA259]'
                                : 'bg-gradient-to-tr from-[#5C8519] to-[#8BC34A]'
                            }`}
                          >
                            {initialLetter}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-black text-[#161F38] truncate">
                              {displayName}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-[#EAF7CF] text-[#5C8519] border border-[#CCE8A2]">
                                {roleLabel}
                              </span>
                              {userId && (
                                <span className="text-[9px] text-[#8A95A8] font-mono">
                                  {userId}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Dropdown Navigation Actions */}
                      <div className="pt-1 space-y-0.5">
                        <Link
                          href={myCabinetUrl}
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-[#161F38] hover:bg-[#FFF7EE] hover:text-coralAccent rounded-xl transition-colors cursor-pointer"
                        >
                          <LayoutDashboard className="w-4 h-4 text-coralAccent shrink-0" />
                          <span>Личный кабинет</span>
                        </Link>



                        <a
                          href="https://ayda-umnichka.vercel.app"
                          className="flex items-center justify-between px-3 py-2 text-xs font-bold text-[#6B758E] hover:bg-[#FFF7EE] hover:text-[#161F38] rounded-xl transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <ExternalLink className="w-4 h-4 text-[#8A95A8] shrink-0" />
                            <span>Перейти на сайт</span>
                          </div>
                          <span className="text-[10px] text-[#8A95A8]">↗</span>
                        </a>
                      </div>

                      <div className="border-t border-[#F4E4D3] my-1" />

                      {/* Logout Action */}
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer text-left"
                      >
                        <LogOut className="w-4 h-4 text-red-500 shrink-0" />
                        <span>Выйти из аккаунта</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : isLogin ? (
              <a
                href="https://ayda-umnichka.vercel.app"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#161F38] bg-white border border-[#EADBCC] px-4 py-2 rounded-full hover:border-coralAccent transition-[border-color,box-shadow,transform] duration-140 ease-out-emil shadow-xs active:scale-[0.97]"
              >
                <span>← На главную</span>
              </a>
            ) : (
              // On landing page: Direct real link to LK subdomain (lk-[project].vercel.app)
              <a
                href={lkUrl}
                className="bg-[#C5E87D] hover:bg-[#B6DC67] text-[#161F38] font-black px-3.5 py-2 sm:px-5 sm:py-2.5 rounded-full text-xs tracking-tight transition-[background-color,transform,box-shadow] duration-140 ease-out-emil shadow-xs flex items-center gap-1.5 sm:gap-2 active:scale-[0.97] cursor-pointer whitespace-nowrap"
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
