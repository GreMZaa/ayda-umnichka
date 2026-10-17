"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  GraduationCap,
  Users,
  User,
  ShieldCheck,
  Video,
  HelpCircle,
  X,
  LogIn,
  ArrowRight,
  Menu,
  ChevronRight,
  Sparkles,
} from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const [showGuide, setShowGuide] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const roles = [
    {
      href: "/teacher",
      title: "Преподаватель",
      name: "Анна Сергеевна",
      desc: "Начать онлайн-урок, поставить оценки, журнал и расписание",
      icon: GraduationCap,
      color: "bg-blue-50 text-blue-700 border-blue-200 hover:border-blue-400 hover:bg-blue-100/70",
      badgeColor: "bg-blue-100 text-blue-700",
    },
    {
      href: "/student",
      title: "Ученик",
      name: "Миша Смирнов (3 класс)",
      desc: "Подключиться к уроку, интерактивная доска, мои звёзды",
      icon: User,
      color: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-100/70",
      badgeColor: "bg-emerald-100 text-emerald-700",
    },
    {
      href: "/parent",
      title: "Родитель",
      name: "Елена Смирнова",
      desc: "Отчёты репетитора после каждого урока, баланс занятий",
      icon: Users,
      color: "bg-amber-50 text-amber-800 border-amber-200 hover:border-amber-400 hover:bg-amber-100/70",
      badgeColor: "bg-amber-100 text-amber-800",
    },
    {
      href: "/admin",
      title: "Администратор",
      name: "Управление центром",
      desc: "CRM, расписание всех преподавателей, добавление учеников",
      icon: ShieldCheck,
      color: "bg-purple-50 text-purple-700 border-purple-200 hover:border-purple-400 hover:bg-purple-100/70",
      badgeColor: "bg-purple-100 text-purple-700",
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
              {!isRoom && (
                <button
                  onClick={() => setShowGuide(true)}
                  className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-medium transition"
                  title="Как устроен сайт?"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                  <span>Гид</span>
                </button>
              )}

              {isRoom ? (
                <Link
                  href="/"
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                >
                  Выйти из урока
                </Link>
              ) : (
                <>
                  {/* Кнопка прямого перехода в эфир */}
                  <Link
                    href="/room/umnichka-live-room-demo"
                    className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 transition border border-slate-200/80"
                  >
                    <Video className="w-3.5 h-3.5 text-blue-600" />
                    <span>Эфир урока</span>
                  </Link>

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
                    className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition"
                    aria-label="Меню"
                  >
                    {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Мобильное выпадающее меню */}
        {mobileMenuOpen && !isRoom && (
          <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-3">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">
              Выберите личный кабинет:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
              <Link
                href="/room/umnichka-live-room-demo"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-800"
              >
                <Video className="w-3.5 h-3.5 text-blue-600" />
                <span>Эфир урока</span>
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowGuide(true);
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200"
              >
                Гид
              </button>
            </div>
          </div>
        )}
      </header>

      {/* МОДАЛЬНОЕ ОКНО: «ВОЙТИ В ЛИЧНЫЙ КАБИНЕТ» */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200 relative">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-semibold mb-1.5">
                  <Sparkles className="w-3 h-3" />
                  <span>Вход без пароля (демо-режим)</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  В какой личный кабинет войти?
                </h3>
                <p className="text-xs text-slate-500">
                  Выберите вашу роль для мгновенного входа в рабочее пространство
                </p>
              </div>
              <button
                onClick={() => setShowLoginModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Карточки ролей */}
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
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900">
                              {item.title}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200">
                              {item.name}
                            </span>
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

            {/* Вход по email / паролю */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <span>Нужен вход по email и паролю?</span>
              <Link
                href="/login"
                onClick={() => setShowLoginModal(false)}
                className="font-semibold text-blue-600 hover:text-blue-700 underline underline-offset-2"
              >
                Открыть страницу авторизации →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* МОДАЛЬНОЕ ОКНО: «ГИД ПО ПЛАТФОРМЕ» */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">Как устроена платформа?</h3>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <p className="font-bold text-slate-900">1. Личные кабинеты (кнопка «Войти в кабинет»):</p>
                <p>• <strong>Преподаватель</strong> — начинает онлайн-урок, ставит оценки и пишет отчеты родителям.</p>
                <p>• <strong>Ученик</strong> — подключается к уроку по одной кнопке, видит расписание и копит звёзды.</p>
                <p>• <strong>Родитель</strong> — читает отчёты репетиторов, следит за посещаемостью и балансом.</p>
                <p>• <strong>Управление</strong> — распределяет расписание, добавляет учеников и репетиторов.</p>
              </div>

              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200/80 space-y-1.5 text-slate-800">
                <p className="font-bold text-blue-900">2. Видеокомната урока:</p>
                <p>Встроенная надежная видеосвязь в браузере. Интерактивная доска для рисования формул и задач, одновременное видео преподавателя и ученика, микрофон и чат.</p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowGuide(false)}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition"
              >
                Понятно, спасибо!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
