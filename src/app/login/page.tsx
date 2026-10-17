"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  User,
  GraduationCap,
  ArrowRight,
  Lock,
  Mail,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  LogIn,
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  // Вход предназначен для учеников и родителей
  const [selectedRole, setSelectedRole] = useState<"student" | "parent">("student");
  const [loginInput, setLoginInput] = useState("misha@umnichka.ru");
  const [password, setPassword] = useState("••••••••");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const roles = [
    { id: "student" as const, label: "Ученик", icon: User, defaultLogin: "misha@umnichka.ru" },
    { id: "parent" as const, label: "Родитель", icon: Users, defaultLogin: "elena@umnichka.ru" },
  ];

  const handleRoleSelect = (roleId: "student" | "parent") => {
    setSelectedRole(roleId);
    const roleObj = roles.find((r) => r.id === roleId);
    if (roleObj) {
      setLoginInput(roleObj.defaultLogin);
      setPassword("123456");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.auth.signInWithPassword({
          email: loginInput,
          password: password,
        });
        if (error) {
          setMessage({ type: "error", text: error.message });
          setLoading(false);
          return;
        }
      }

      setMessage({ type: "success", text: "Вход выполнен успешно! Загрузка кабинета..." });
      setTimeout(() => {
        router.push(`/${selectedRole}`);
      }, 500);
    } catch {
      setMessage({ type: "error", text: "Не удалось войти. Проверьте правильность введённых данных." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-14rem)] flex items-center justify-center py-6 sm:py-10 px-4">
      <div className="max-w-md w-full space-y-6">
        {/* Шапка формы */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20 mb-1">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Вход в систему
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Вход в личный кабинет ученика и родителя «АйДаУмничка»
          </p>
        </div>

        {/* Форма авторизации */}
        <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-5">
          {message && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 transition ${
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
              <span className="font-medium">{message.text}</span>
            </div>
          )}

          {/* Выбор роли входа (только Ученик и Родитель) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Ваш личный кабинет:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {roles.map((r) => {
                const Icon = r.icon;
                const isSelected = selectedRole === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleRoleSelect(r.id)}
                    className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition border ${
                      isSelected
                        ? "border-blue-600 bg-blue-50/70 text-blue-700 shadow-2xs"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isSelected ? "text-blue-600" : "text-slate-400"}`} />
                    <span>{r.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Поле логина / Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Логин, Email или телефон:
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  placeholder="misha@umnichka.ru"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
                />
              </div>
            </div>

            {/* Поле пароля */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Пароль:
                </label>
                <button
                  type="button"
                  onClick={() => alert("Для восстановления пароля обратитесь к администратору центра «АйДаУмничка»")}
                  className="text-[11px] font-medium text-blue-600 hover:underline"
                >
                  Забыли пароль?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Введите пароль"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 p-0.5"
                  title={showPassword ? "Скрыть пароль" : "Показать пароль"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Чекбокс Запомнить меня */}
            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span className="text-xs text-slate-600 font-medium">Запомнить меня на этом устройстве</span>
              </label>
            </div>

            {/* Главная кнопка входа */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-98"
            >
              {loading ? (
                <span>Вход в систему...</span>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Войти в личный кабинет</span>
                  <ArrowRight className="w-4 h-4 ml-0.5" />
                </>
              )}
            </button>
          </form>

          {/* Быстрая подсказка для тестирования */}
          <div className="pt-3 border-t border-slate-100 text-center space-y-2">
            <span className="text-[11px] font-semibold text-slate-400 block">
              Быстрая подстановка тестового логина:
            </span>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {roles.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleRoleSelect(r.id)}
                  className={`text-[11px] font-semibold px-3 py-1 rounded-lg border transition ${
                    selectedRole === r.id
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Ссылка на главную страницу */}
        <div className="text-center">
          <Link
            href="/"
            className="text-xs text-slate-500 hover:text-slate-800 transition font-medium underline underline-offset-4"
          >
            ← Вернуться на главную страницу
          </Link>
        </div>
      </div>
    </div>
  );
}
