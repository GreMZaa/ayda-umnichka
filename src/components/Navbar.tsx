"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  User,
  GraduationCap,
  LogIn,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isRoom = pathname.startsWith("/room");
  const isLoginPage = pathname === "/login";

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Логотип */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20 group-hover:bg-blue-700 transition">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 group-hover:text-blue-600 transition">
                АйДаУмничка
              </span>
              <span className="text-[10px] font-semibold text-slate-500 block leading-none">
                Центр онлайн-занятий
              </span>
            </div>
          </Link>

          {/* Правые кнопки действий */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {isRoom ? (
              <Link
                href="/"
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
              >
                Выйти из урока
              </Link>
            ) : isLoginPage ? (
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition border border-slate-200"
              >
                <span>← На главную</span>
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/25 transition transform active:scale-95 cursor-pointer"
                id="btn-login-header"
              >
                <LogIn className="w-4 h-4" />
                <span>Войти в кабинет</span>
              </Link>
            )}

            {/* Мобильная кнопка меню */}
            {!isRoom && !isLoginPage && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="sm:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition"
                aria-label="Меню"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Мобильное меню */}
      {mobileMenuOpen && !isRoom && !isLoginPage && (
        <div className="sm:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-3">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">
            Личные кабинеты:
          </div>
          <div className="grid grid-cols-1 gap-2">
            <Link
              href="/student"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Кабинет Ученика</div>
                  <div className="text-[11px] text-slate-500">Миша Смирнов</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </Link>

            <Link
              href="/parent"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Кабинет Родителя</div>
                  <div className="text-[11px] text-slate-500">Елена Смирнова</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </Link>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold bg-blue-600 text-white shadow-sm"
            >
              <LogIn className="w-4 h-4" />
              <span>Войти через Supabase</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
