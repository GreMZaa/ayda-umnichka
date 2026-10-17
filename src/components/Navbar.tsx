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
  ArrowRight,
  Check,
} from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const [showGuide, setShowGuide] = useState(false);

  const navLinks = [
    { href: "/teacher", label: "Преподаватель", icon: GraduationCap },
    { href: "/student", label: "Ученик", icon: User },
    { href: "/parent", label: "Родитель", icon: Users },
    { href: "/admin", label: "Управление", icon: ShieldCheck },
  ];

  const isRoom = pathname.startsWith("/room");

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Чистый логотип */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <span className="text-lg font-bold tracking-tight text-slate-900">
                  АйДаУмничка
                </span>
                <span className="text-[10px] font-semibold text-slate-500 block leading-none">
                  Онлайн-центр
                </span>
              </div>
            </Link>

            {/* Единая спокойная навигация по кабинетам */}
            {!isRoom && (
              <nav className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                {navLinks.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                        isActive
                          ? "bg-white text-blue-600 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            )}

            {/* Правые кнопки */}
            <div className="flex items-center gap-2">
              {!isRoom && (
                <button
                  onClick={() => setShowGuide(true)}
                  className="hidden md:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-medium transition"
                  title="Как устроен сайт?"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Гид</span>
                </button>
              )}

              {isRoom ? (
                <Link
                  href="/"
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                >
                  Выйти
                </Link>
              ) : (
                <Link
                  href="/room/umnichka-live-room-demo"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Эфир урока</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Модальное окно "Гид по платформе" */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-5 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">Как устроена платформа?</h3>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                <p className="font-bold text-slate-900">1. Личные кабинеты (вверху страницы):</p>
                <p>• <strong>Преподаватель</strong> — начинает онлайн-урок, ставит оценки и пишет отчеты.</p>
                <p>• <strong>Ученик</strong> — подключается к уроку по одной кнопке, видит расписание и звезды.</p>
                <p>• <strong>Родитель</strong> — читает отчёты репетиторов, следит за посещаемостью и балансом.</p>
                <p>• <strong>Управление</strong> — назначает новые уроки и распределяет расписание.</p>
              </div>

              <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 space-y-1 text-slate-800">
                <p className="font-bold text-blue-900">2. Видеокомната урока:</p>
                <p>Встроенная надежная видеосвязь в браузере. Слева расположена интерактивная доска для рисования формул и задач, справа — видео преподавателя и ученика, внизу — микрофон и камера.</p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowGuide(false)}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition"
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
