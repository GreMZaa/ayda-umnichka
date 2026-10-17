"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  Users,
  User,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Lock,
  Mail,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"quick" | "password">("quick");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<"teacher" | "student" | "parent" | "admin">("teacher");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const demoRoles = [
    {
      role: "teacher" as const,
      title: "Преподаватель",
      name: "Анна Сергеевна",
      desc: "Ведение онлайн-уроков, интерактивная доска, журнал оценок",
      href: "/teacher",
      icon: GraduationCap,
      color: "border-blue-200 bg-blue-50/60 hover:bg-blue-100/70 text-blue-700",
      badge: "Репетитор",
    },
    {
      role: "student" as const,
      title: "Ученик",
      name: "Миша Смирнов (3 класс)",
      desc: "Подключение к уроку по 1 кнопке, расписание, звёзды",
      href: "/student",
      icon: User,
      color: "border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/70 text-emerald-700",
      badge: "Ученик",
    },
    {
      role: "parent" as const,
      title: "Родитель",
      name: "Елена Смирнова",
      desc: "Отчёты преподавателей, контроль посещаемости, баланс",
      href: "/parent",
      icon: Users,
      color: "border-amber-200 bg-amber-50/60 hover:bg-amber-100/70 text-amber-800",
      badge: "Родитель",
    },
    {
      role: "admin" as const,
      title: "Администратор",
      name: "Центр «АйДаУмничка»",
      desc: "CRM, расписание всех репетиторов, управление центром",
      href: "/admin",
      icon: ShieldCheck,
      color: "border-purple-200 bg-purple-50/60 hover:bg-purple-100/70 text-purple-700",
      badge: "Управление",
    },
  ];

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          setMessage({ type: "error", text: error.message });
          setLoading(false);
          return;
        }
      }

      // Если демо или авторизация успешна, перенаправляем в выбранный кабинет
      setMessage({ type: "success", text: "Успешный вход! Перенаправляем в личный кабинет..." });
      setTimeout(() => {
        router.push(`/${selectedRole}`);
      }, 700);
    } catch {
      setMessage({ type: "error", text: "Произошла ошибка при входе. Попробуйте быстрый вход." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-8 sm:py-12 space-y-6">
      {/* Шапка формы */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20 mb-1">
          <GraduationCap className="w-6 h-6" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Вход в личный кабинет
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Образовательная платформа центра «АйДаУмничка»
        </p>
      </div>

      {/* Переключатель вкладок: Быстрый демо-вход vs Логин/Пароль */}
      <div className="flex p-1 bg-slate-200/80 rounded-xl">
        <button
          type="button"
          onClick={() => setTab("quick")}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
            tab === "quick"
              ? "bg-white text-blue-600 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Быстрый вход</span>
        </button>
        <button
          type="button"
          onClick={() => setTab("password")}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
            tab === "password"
              ? "bg-white text-blue-600 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>По логину и паролю</span>
        </button>
      </div>

      {/* Вкладка 1: Быстрый демо-вход */}
      {tab === "quick" && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
          <div className="text-xs font-semibold text-slate-500">
            Выберите пользователя для входа в 1 клик:
          </div>

          <div className="space-y-2.5">
            {demoRoles.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.role}
                  href={item.href}
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

          <div className="pt-3 text-center">
            <p className="text-[11px] text-slate-400">
              В демо-режиме пароль не требуется. Все кабинеты сразу активны.
            </p>
          </div>
        </div>
      )}

      {/* Вкладка 2: Форма логина и пароля */}
      {tab === "password" && (
        <form
          onSubmit={handlePasswordLogin}
          className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4"
        >
          {message && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                message.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-rose-50 text-rose-800 border border-rose-200"
              }`}
            >
              {message.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Роль аккаунта:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "teacher", label: "Преподаватель" },
                { id: "student", label: "Ученик" },
                { id: "parent", label: "Родитель" },
                { id: "admin", label: "Администратор" },
              ].map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedRole(r.id as any)}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border text-center transition ${
                    selectedRole === r.id
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-slate-200 hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Email или Телефон:
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teacher@umnichka.ru"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Пароль:
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded border-slate-300 text-blue-600" />
              <span>Запомнить меня</span>
            </label>
            <span className="text-blue-600 hover:underline cursor-pointer">Забыли пароль?</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? "Выполняется вход..." : "Войти в кабинет"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* Ссылка на главную */}
      <div className="text-center">
        <Link
          href="/"
          className="text-xs text-slate-500 hover:text-slate-800 transition underline underline-offset-4"
        >
          ← Вернуться на главную страницу
        </Link>
      </div>
    </div>
  );
}
