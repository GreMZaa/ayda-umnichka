"use client";

import { useState, useEffect } from "react";
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
  Settings,
  Database,
  Check,
} from "lucide-react";
import {
  getSupabase,
  getSupabaseConfig,
  setCustomSupabaseConfig,
} from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [selectedRole, setSelectedRole] = useState<"student" | "parent">("student");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("misha@umnichka.ru");
  const [password, setPassword] = useState("123456");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Настройки Supabase
  const [supabaseConfig, setSupabaseConfig] = useState({ url: "", key: "", source: "none" });
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [inputUrl, setInputUrl] = useState("");
  const [inputKey, setInputKey] = useState("");

  useEffect(() => {
    const conf = getSupabaseConfig();
    setSupabaseConfig(conf);
    setInputUrl(conf.url);
    setInputKey(conf.key);
  }, []);

  const handleQuickFill = (role: "student" | "parent") => {
    setSelectedRole(role);
    if (role === "student") {
      setEmail("misha@umnichka.ru");
      setFullName("Миша Смирнов");
    } else {
      setEmail("elena@umnichka.ru");
      setFullName("Елена Смирнова");
    }
    setPassword("123456");
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomSupabaseConfig(inputUrl.trim(), inputKey.trim());
    const conf = getSupabaseConfig();
    setSupabaseConfig(conf);
    setShowConfigModal(false);
    setMessage({
      type: "success",
      text: "Параметры Supabase сохранены! Теперь вы можете авторизоваться.",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const client = getSupabase();

    if (mode === "signin") {
      // 1. ВХОД ЧЕРЕЗ SUPABASE
      if (client) {
        try {
          const { data, error } = await client.auth.signInWithPassword({
            email: email.trim(),
            password: password,
          });

          if (error) {
            setMessage({ type: "error", text: error.message });
            setLoading(false);
            return;
          }

          const userRole = data.user?.user_metadata?.role || selectedRole;
          setMessage({
            type: "success",
            text: `Вход через Supabase выполнен! Перенаправляем в личный кабинет...`,
          });
          setTimeout(() => {
            router.push(`/${userRole}`);
          }, 600);
          return;
        } catch (err: any) {
          setMessage({
            type: "error",
            text: err?.message || "Ошибка подключения к серверу Supabase.",
          });
          setLoading(false);
          return;
        }
      } else {
        // Если переменные Supabase пока не заданы в проекте, выполняем демо-вход и подсказываем
        setMessage({
          type: "success",
          text: "Вход выполнен в демо-режиме! Перенаправляем в кабинет...",
        });
        setTimeout(() => {
          router.push(`/${selectedRole}`);
        }, 500);
      }
    } else {
      // 2. РЕГИСТРАЦИЯ ЧЕРЕЗ SUPABASE
      if (client) {
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
            setMessage({ type: "error", text: error.message });
            setLoading(false);
            return;
          }

          if (data.session) {
            setMessage({
              type: "success",
              text: "Регистрация в Supabase успешна! Входим в личный кабинет...",
            });
            setTimeout(() => {
              router.push(`/${selectedRole}`);
            }, 700);
          } else {
            setMessage({
              type: "info",
              text: "Аккаунт создан в Supabase! Проверьте вашу почту для подтверждения или войдите по паролю.",
            });
            setMode("signin");
          }
        } catch (err: any) {
          setMessage({
            type: "error",
            text: err?.message || "Ошибка регистрации в Supabase.",
          });
        } finally {
          setLoading(false);
        }
      } else {
        setMessage({
          type: "success",
          text: "Регистрация успешна (демо-режим)! Перенаправляем в личный кабинет...",
        });
        setTimeout(() => {
          router.push(`/${selectedRole}`);
        }, 600);
      }
    }

    setLoading(false);
  };

  const handleResetPassword = async () => {
    if (!email) {
      alert("Введите ваш Email для восстановления пароля");
      return;
    }
    const client = getSupabase();
    if (!client) {
      alert("Для восстановления пароля обратитесь к администратору центра «АйДаУмничка»");
      return;
    }
    try {
      const { error } = await client.auth.resetPasswordForEmail(email.trim());
      if (error) {
        alert("Ошибка: " + error.message);
      } else {
        alert("Ссылка для сброса пароля отправлена на " + email);
      }
    } catch {
      alert("Не удалось отправить письмо для сброса пароля.");
    }
  };

  const isConnected = Boolean(supabaseConfig.url && supabaseConfig.key);

  return (
    <div className="min-h-[calc(100vh-14rem)] flex items-center justify-center py-6 sm:py-10 px-4">
      <div className="max-w-md w-full space-y-6">
        {/* Шапка формы */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20 mb-1">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {mode === "signin" ? "Вход в личный кабинет" : "Регистрация в центре"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {mode === "signin"
              ? "Авторизация через Supabase Auth"
              : "Создайте аккаунт ученика или родителя"}
          </p>
        </div>

        {/* Переключатель Вход / Регистрация */}
        <div className="flex p-1 bg-slate-200/80 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
              mode === "signin"
                ? "bg-white text-blue-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
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
                ? "bg-white text-blue-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
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

          {/* Выбор роли (Ученик или Родитель) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Личный кабинет:
            </label>
            <div className="grid grid-cols-2 gap-2">
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
                    onClick={() => handleQuickFill(r.id)}
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
                    placeholder={selectedRole === "student" ? "Миша Смирнов" : "Елена Смирнова"}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
                  />
                </div>
              </div>
            )}

            {/* Поле Email */}
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
                  placeholder="name@example.com"
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
                  placeholder="Минимум 6 символов"
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
                <span>Подключение к Supabase...</span>
              ) : mode === "signin" ? (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Войти через Supabase</span>
                  <ArrowRight className="w-4 h-4 ml-0.5" />
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Создать аккаунт в Supabase</span>
                  <ArrowRight className="w-4 h-4 ml-0.5" />
                </>
              )}
            </button>
          </form>

          {/* Быстрое переключение тестовых пользователей */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Тестовые данные:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill("student")}
                className={`text-[11px] font-semibold px-2 py-0.5 rounded transition ${
                  selectedRole === "student" ? "bg-emerald-100 text-emerald-800" : "hover:text-slate-900"
                }`}
              >
                Ученик
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => handleQuickFill("parent")}
                className={`text-[11px] font-semibold px-2 py-0.5 rounded transition ${
                  selectedRole === "parent" ? "bg-amber-100 text-amber-900" : "hover:text-slate-900"
                }`}
              >
                Родитель
              </button>
            </div>
          </div>
        </div>

        {/* Статус подключения к Supabase и настройки */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
              }`}
            />
            <span>
              {isConnected ? "Supabase Auth: Подключен" : "Supabase: Демо-режим (ключи не заданы)"}
            </span>
            <button
              type="button"
              onClick={() => setShowConfigModal(!showConfigModal)}
              className="text-blue-600 hover:text-blue-800 underline font-semibold ml-1 flex items-center gap-0.5"
            >
              <Settings className="w-3 h-3" />
              <span>{showConfigModal ? "скрыть" : "настроить"}</span>
            </button>
          </div>

          {/* Панель настройки ключей Supabase прямо из браузера */}
          {showConfigModal && (
            <div className="bg-white p-4 rounded-xl border border-slate-200 text-left space-y-3 shadow-md">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                <Database className="w-4 h-4 text-blue-600" />
                <span>Настройка подключения к вашему проекту Supabase</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">
                Получите эти данные в вашем кабинете Supabase: <em>Project Settings ➔ API</em>. Они сохранятся в вашем браузере.
              </p>
              <form onSubmit={handleSaveConfig} className="space-y-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                    Project URL:
                  </label>
                  <input
                    type="text"
                    required
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    placeholder="https://xyzcompany.supabase.co"
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                    Anon Public Key:
                  </label>
                  <input
                    type="text"
                    required
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR..."
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 font-mono"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomSupabaseConfig("", "");
                      setInputUrl("");
                      setInputKey("");
                      setSupabaseConfig({ url: "", key: "", source: "none" });
                      setShowConfigModal(false);
                    }}
                    className="px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded"
                  >
                    Сбросить
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
                  >
                    Сохранить подключение
                  </button>
                </div>
              </form>
            </div>
          )}
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
