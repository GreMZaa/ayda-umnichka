"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Users,
  User,
  GraduationCap,
  LogIn,
  LogOut,
  Menu,
  X,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { getSupabase } from "@/lib/supabase";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  // Состояние модального окна мгновенного входа по паролю на главной странице
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Поля авторизации в модальном окне
  const [selectedRole, setSelectedRole] = useState<"student" | "parent">("student");
  const [email, setEmail] = useState("misha@umnichka.ru");
  const [password, setPassword] = useState("123456");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isRoom = pathname.startsWith("/room");
  const isLoginPage = pathname === "/login";
  const isParent = pathname.startsWith("/parent");
  const isStudent = pathname.startsWith("/student");
  const isTeacher = pathname.startsWith("/teacher");
  const isAdmin = pathname.startsWith("/admin");
  const isInsideCabinet = isParent || isStudent || isTeacher || isAdmin;

  // Определение профиля текущего вошедшего пользователя
  const currentUser = isParent
    ? { name: "Елена Смирнова", role: "Родитель", icon: Users, color: "bg-amber-100 text-amber-800" }
    : isStudent
    ? { name: "Миша Смирнов", role: "Ученик (3 класс)", icon: User, color: "bg-emerald-100 text-emerald-800" }
    : isTeacher
    ? { name: "Анна Сергеевна", role: "Преподаватель", icon: GraduationCap, color: "bg-blue-100 text-blue-800" }
    : isAdmin
    ? { name: "Администратор", role: "Управление", icon: ShieldCheck, color: "bg-purple-100 text-purple-800" }
    : null;

  const handleRoleQuickSelect = (role: "student" | "parent") => {
    setSelectedRole(role);
    if (role === "student") {
      setEmail("misha@umnichka.ru");
    } else {
      setEmail("elena@umnichka.ru");
    }
    setPassword("123456");
  };

  const handleModalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const client = getSupabase();

    if (client) {
      try {
        const { data, error } = await client.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

        if (error) {
          setErrorMsg(error.message);
          setLoading(false);
          return;
        }

        const role = data.user?.user_metadata?.role || selectedRole;
        setShowLoginModal(false);
        router.push(`/${role}`);
        return;
      } catch (err: any) {
        setErrorMsg(err?.message || "Ошибка соединения с Supabase.");
        setLoading(false);
        return;
      }
    } else {
      setShowLoginModal(false);
      router.push(`/${selectedRole}`);
    }

    setLoading(false);
  };

  const handleLogout = async () => {
    const client = getSupabase();
    if (client) {
      try {
        await client.auth.signOut();
      } catch (e) {
        console.error(e);
      }
    }
    router.push("/");
  };

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
            <div className="flex items-center gap-2 sm:gap-3">
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
              ) : isInsideCabinet && currentUser ? (
                /* Пользователь УЖЕ в личном кабинете: показываем его бейдж и кнопку Выйти */
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <span className={`w-2 h-2 rounded-full ${isParent ? "bg-amber-500" : isStudent ? "bg-emerald-500" : "bg-blue-500"}`} />
                    <span className="font-bold text-slate-800">{currentUser.name}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-500">{currentUser.role}</span>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition cursor-pointer"
                    title="Выйти из личного кабинета"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Выйти</span>
                  </button>
                </div>
              ) : (
                /* На главной странице: заметная кнопка Войти в кабинет */
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/25 transition transform active:scale-95 cursor-pointer"
                  id="btn-login-header"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Войти в кабинет</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* МОДАЛЬНОЕ ОКНО ПРЯМОГО ВХОДА ПО EMAIL И ПАРОЛЮ */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 relative">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Вход в личный кабинет
                </h3>
                <p className="text-xs text-slate-500">
                  Введите ваш email и пароль для входа
                </p>
              </div>
              <button
                onClick={() => setShowLoginModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl text-xs flex items-center gap-2 bg-rose-50 text-rose-800 border border-rose-200">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Выбор роли (Ученик или Родитель) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
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
                      onClick={() => handleRoleQuickSelect(r.id)}
                      className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition border ${
                        isSelected
                          ? "border-blue-600 bg-blue-50/70 text-blue-700 shadow-2xs"
                          : "border-slate-200 hover:bg-slate-50 text-slate-600"
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-blue-600" : "text-slate-400"}`} />
                      <span>{r.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Форма ввода Email и Пароля */}
            <form onSubmit={handleModalLogin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Электронная почта (Email):
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-none focus:border-blue-600 transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Пароль:
                  </label>
                  <Link
                    href="/login"
                    onClick={() => setShowLoginModal(false)}
                    className="text-[11px] font-medium text-blue-600 hover:underline"
                  >
                    Забыли пароль?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Введите пароль"
                    className="w-full pl-9 pr-9 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-none focus:border-blue-600 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                  />
                  <span className="text-xs text-slate-600">Запомнить меня на этом устройстве</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <span>Выполняется вход...</span>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Войти в личный кабинет</span>
                    <ArrowRight className="w-4 h-4 ml-0.5" />
                  </>
                )}
              </button>
            </form>

            {/* Подвал модалки: ссылка на регистрацию */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Нет аккаунта?</span>
              <Link
                href="/login"
                onClick={() => setShowLoginModal(false)}
                className="font-bold text-blue-600 hover:text-blue-700 underline underline-offset-2"
              >
                Зарегистрироваться →
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
