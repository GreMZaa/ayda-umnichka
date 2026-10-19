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
  UserPlus,
} from "lucide-react";
import { getSupabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [selectedRole, setSelectedRole] = useState<"student" | "parent">("student");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setMessage({ type: "error", text: "Пожалуйста, введите e-mail и пароль." });
      return;
    }

    setLoading(true);
    setMessage(null);

    const client = getSupabase();

    if (mode === "signin") {
      try {
        const { data, error } = await client.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            setMessage({
              type: "error",
              text: "Неверный e-mail или пароль. Если у вас ещё нет аккаунта, перейдите на вкладку «Регистрация».",
            });
          } else {
            setMessage({ type: "error", text: error.message });
          }
          setLoading(false);
          return;
        }

        const userRole = data.user?.user_metadata?.role || selectedRole;
        setMessage({
          type: "success",
          text: "Вход выполнен успешно! Перенаправляем в личный кабинет...",
        });
        setTimeout(() => {
          router.push(`/${userRole}`);
        }, 500);
      } catch (err: any) {
        setMessage({
          type: "error",
          text: err?.message || "Ошибка подключения к серверу авторизации.",
        });
        setLoading(false);
      }
    } else {
      try {
        const { data, error } = await client.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            data: {
              role: selectedRole,
              full_name: fullName.trim() || (selectedRole === "student" ? "Ученик" : "Родитель"),
            },
          },
        });

        if (error) {
          if (error.message.includes("User already registered")) {
            setMessage({
              type: "error",
              text: "Пользователь с таким e-mail уже зарегистрирован. Переключитесь на «Вход по Email».",
            });
          } else {
            setMessage({ type: "error", text: error.message });
          }
          setLoading(false);
          return;
        }

        if (data.session) {
          setMessage({
            type: "success",
            text: "Регистрация успешна! Входим в ваш личный кабинет...",
          });
          setTimeout(() => {
            router.push(`/${selectedRole}`);
          }, 600);
        } else {
          setMessage({
            type: "success",
            text: "Аккаунт успешно создан! Теперь вы можете войти, используя указанный e-mail и пароль.",
          });
          setMode("signin");
        }
      } catch (err: any) {
        setMessage({
          type: "error",
          text: err?.message || "Ошибка регистрации.",
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      setMessage({ type: "error", text: "Для сброса пароля сначала введите ваш e-mail выше." });
      return;
    }
    const client = getSupabase();
    try {
      const { error } = await client.auth.resetPasswordForEmail(email.trim());
      if (error) {
        setMessage({ type: "error", text: error.message });
      } else {
        setMessage({ type: "info", text: "Инструкция по восстановлению пароля отправлена на " + email });
      }
    } catch {
      setMessage({ type: "error", text: "Не удалось отправить письмо для сброса пароля." });
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
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-[1.2]">
            {mode === "signin" ? "Вход в личный кабинет" : "Регистрация в центре"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {mode === "signin"
              ? "Введите e-mail и пароль для входа"
              : "Создайте аккаунт ученика или родителя"}
          </p>
        </div>

        {/* Переключатель Вход / Регистрация (Спокойный стиль табов по Правилу 6) */}
        <div className="flex p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
              mode === "signin"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <LogIn className={`w-3.5 h-3.5 ${mode === "signin" ? "text-slate-700" : "text-slate-400"}`} />
            <span>Вход по Email</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
              mode === "signup"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <UserPlus className={`w-3.5 h-3.5 ${mode === "signup" ? "text-slate-700" : "text-slate-400"}`} />
            <span>Регистрация</span>
          </button>
        </div>

        {/* Форма авторизации */}
        <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-5">
          {message && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 transition ${
                message.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : message.type === "info"
                  ? "bg-blue-50 text-blue-800 border border-blue-200"
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

          {/* Выбор роли (Ученик или Родитель) как сегментированный контрол (Правило 12, Правило 6) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Личный кабинет:
            </label>
            <div className="flex p-1 bg-slate-100 rounded-xl gap-1">
              {[
                { id: "student" as const, label: "Ученик", icon: User },
                { id: "parent" as const, label: "Родитель", icon: Users },
              ].map((r) => {
                const Icon = r.icon;
                const isSelected = selectedRole === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      setSelectedRole(r.id);
                      setMessage(null);
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition ${
                      isSelected
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isSelected ? "text-slate-800" : "text-slate-400"}`} />
                    <span>{r.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Поле имени при регистрации */}
            {mode === "signup" && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Имя и фамилия:
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Например: Анна Смирнова"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 font-medium placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
                  />
                </div>
              </div>
            )}

            {/* Поле Email (Правило 13: серый плейсхолдер с примером) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Электронная почта (Email):
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Например: ivan@mail.ru"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 font-medium placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
                />
              </div>
            </div>

            {/* Поле пароля */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Пароль:
                </label>
                {mode === "signin" && (
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    className="text-[11px] font-medium text-blue-600 hover:underline"
                  >
                    Забыли пароль?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Не менее 6 символов"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 font-medium placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
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
            {mode === "signin" && (
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
            )}

            {/* Главная кнопка сабмита */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-98"
            >
              {loading ? (
                <span>Выполняется запрос...</span>
              ) : mode === "signin" ? (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Войти в личный кабинет</span>
                  <ArrowRight className="w-4 h-4 ml-0.5" />
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Зарегистрироваться</span>
                  <ArrowRight className="w-4 h-4 ml-0.5" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Ссылка на главную страницу */}
        <div className="text-center">
          <Link
            href="/"
            className="text-xs text-slate-600 hover:text-slate-900 transition font-medium underline underline-offset-4"
          >
            ← Вернуться на главную страницу
          </Link>
        </div>
      </div>
    </div>
  );
}
