"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  User,
  GraduationCap,
  X,
  LogIn,
  ArrowRight,
  Menu,
  ChevronRight,
} from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Для входа только Ученик и Родитель (Преподаватели работают непосредственно в центре)
  const roles = [
    {
      href: "/student",
      title: "Кабинет Ученика",
      name: "Миша Смирнов (3 класс)",
      desc: "Подключиться к уроку, интерактивная доска, мои звёзды и награды",
      icon: User,
      color: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-100/70",
    },
    {
      href: "/parent",
      title: "Кабинет Родителя",
      name: "Елена Смирнова",
      desc: "Отчёты репетитора после каждого урока, баланс занятий и прогресс",
      icon: Users,
      color: "bg-amber-50 text-amber-800 border-amber-200 hover:border-amber-400 hover:bg-amber-100/70",
    },
  ];

  const isRoom = pathname.startsWith("/room");

  return (
    <>
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
              ) : (
                <>
                  {/* ГЛАВНАЯ КНОПКА: ВОЙТИ В КАБИНЕТ (или На главную, если уже на /login) */}
                  {pathname === "/login" ? (
                    <Link
                      href="/"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition border border-slate-200"
                    >
                      <span>← На главную</span>
                    </Link>
                  ) : (
                    <button
                      onClick={() => setShowLoginModal(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/25 transition transform active:scale-95 cursor-pointer"
                      id="btn-login-header"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>Войти в кабинет</span>
                    </button>
                  )}

                  {/* Мобильная кнопка меню */}
                  <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="sm:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition"
                    aria-label="Меню"
                  >
                    {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Мобильное меню */}
        {mobileMenuOpen && !isRoom && (
          <div className="sm:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-3">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">
              Личные кабинеты:
            </div>
            <div className="grid grid-cols-1 gap-2">
              {roles.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-blue-400 bg-slate-50 transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-600 flex items-center justify-center">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">{item.title}</div>
                        <div className="text-[11px] text-slate-500">{item.name}</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </Link>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-100">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold bg-blue-600 text-white"
              >
                <LogIn className="w-4 h-4" />
                <span>Войти по логину и паролю</span>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* МОДАЛЬНОЕ ОКНО: «ВОЙТИ В ЛИЧНЫЙ КАБИНЕТ» (ТОЛЬКО УЧЕНИК И РОДИТЕЛЬ) */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-200 relative">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Вход в личный кабинет
                </h3>
                <p className="text-xs text-slate-500">
                  Выберите кабинет для быстрого перехода
                </p>
              </div>
              <button
                onClick={() => setShowLoginModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Карточки ролей (Ученик и Родитель) */}
            <div className="space-y-2.5">
              {roles.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowLoginModal(false)}
                    className={`block p-3.5 rounded-xl border transition group ${item.color}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white shadow-xs flex items-center justify-center shrink-0">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-sm text-slate-900">
                            {item.title}
                          </div>
                          <p className="text-xs text-slate-600 mt-0.5 leading-tight">
                            {item.desc}
                          </p>
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-white/80 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center text-slate-400 transition shrink-0 ml-2">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Вход по логину и паролю */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Есть постоянный аккаунт?</span>
              <Link
                href="/login"
                onClick={() => setShowLoginModal(false)}
                className="font-bold text-blue-600 hover:text-blue-700 underline underline-offset-2"
              >
                Войти по паролю →
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
