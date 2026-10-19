"use client";

import { useState, useEffect, useRef } from "react";
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
  ChevronDown,
  Phone,
  Sparkles,
  BookOpen,
  Calendar,
  Video,
  Award,
} from "lucide-react";
import { getSupabase } from "@/lib/supabase";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  // Состояние модальных окон и выпадающих меню
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Поля авторизации в модальном окне
  const [selectedRole, setSelectedRole] = useState<"student" | "parent">("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [authProfile, setAuthProfile] = useState<{ name: string; role: string; roleKey: string } | null>(null);

  const isRoom = pathname.startsWith("/room");
  const isLoginPage = pathname === "/login";
  const isParent = pathname.startsWith("/parent");
  const isStudent = pathname.startsWith("/student");
  const isTeacher = pathname.startsWith("/teacher");
  const isAdmin = pathname.startsWith("/admin");
  const isInsideCabinet = isParent || isStudent || isTeacher || isAdmin;

  // Закрытие выпадающего меню пользователя по клику снаружи
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Определение профиля текущего вошедшего пользователя из сессии Supabase или роли
  const defaultCabinetName = isParent
    ? "Личный кабинет родителя"
    : isStudent
    ? "Личный кабинет ученика"
    : isTeacher
    ? "Преподаватель"
    : "Администратор";

  const defaultRoleTitle = isParent
    ? "Родитель"
    : isStudent
    ? "Ученик"
    : isTeacher
    ? "Преподаватель"
    : "Управление";

  const currentUser = isInsideCabinet
    ? {
        name: authProfile?.name || defaultCabinetName,
        role: authProfile?.role || defaultRoleTitle,
        icon: isParent ? Users : isStudent ? User : isTeacher ? GraduationCap : ShieldCheck,
      }
    : null;

  // Загружаем реальную сессию пользователя
  useEffect(() => {
    const client = getSupabase();
    if (client) {
      const updateProfile = (user: any) => {
        if (user) {
          const meta = user.user_metadata || {};
          const rKey = (meta.role || "student").toLowerCase();
          setAuthProfile({
            name: meta.full_name || user.email?.split("@")[0] || defaultCabinetName,
            role:
              rKey === "parent"
                ? "Родитель"
                : rKey === "teacher"
                ? "Преподаватель"
                : rKey === "admin"
                ? "Управление"
                : "Ученик",
            roleKey: rKey,
          });
        } else {
          setAuthProfile(null);
        }
      };

      client.auth.getSession().then(({ data }) => {
        updateProfile(data?.session?.user);
      });

      const { data: authListener } = client.auth.onAuthStateChange((_event, session) => {
        updateProfile(session?.user);
      });

      return () => {
        authListener?.subscription?.unsubscribe();
      };
    }
  }, [pathname]);

  const handleRoleQuickSelect = (role: "student" | "parent") => {
    setSelectedRole(role);
    setErrorMsg(null);
  };

  const handleModalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg("Пожалуйста, введите e-mail и пароль.");
      return;
    }

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
          if (error.message.includes("Invalid login credentials")) {
            setErrorMsg("Неверный email или пароль. Если у вас ещё нет аккаунта, нажмите «Зарегистрироваться».");
          } else {
            setErrorMsg(error.message);
          }
          setLoading(false);
          return;
        }

        const role = data.user?.user_metadata?.role || selectedRole;
        setShowLoginModal(false);
        router.push(`/${role}`);
        return;
      } catch (err: any) {
        setErrorMsg(err?.message || "Ошибка подключения к серверу авторизации.");
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
    setAuthProfile(null);
    setUserMenuOpen(false);
    router.push("/");
  };

  return (
    <>
      {/* 1. ВЕРХНИЙ ИНФО-БАР (Белый фон, телефон + преимущества) */}
      <div className="bg-white border-b border-slate-100 text-slate-600 text-[11px] sm:text-xs py-1.5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Онлайн-уроки с репетитором по всей России
            </span>
            <span className="hidden md:inline text-slate-300">|</span>
            <span className="hidden md:inline text-slate-500 font-medium">
              Первый пробный урок — бесплатно
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="tel:+79954854667"
              className="flex items-center gap-1.5 text-slate-700 hover:text-blue-600 font-bold transition"
            >
              <Phone className="w-3.5 h-3.5 text-blue-600" />
              <span>8 995 485 46 67</span>
            </a>
          </div>
        </div>
      </div>

      {/* 2. ОСНОВНАЯ ШАПКА В СТИЛЕ FOXFORD */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-[70px]">
            {/* Левая группа: Логотип и Навигация */}
            <div className="flex items-center gap-6 sm:gap-8">
              {/* Логотип Фоксфорд-стиль */}
              <Link href="/" className="flex items-center gap-2.5 group shrink-0">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25 group-hover:scale-105 transition transform">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 group-hover:text-blue-600 transition">
                      АйДаУмничка
                    </span>
                    <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                      ШКОЛА
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-slate-500 block leading-none">
                    Онлайн-уроки и репетиторы
                  </span>
                </div>
              </Link>

              {/* Навигационные ссылки */}
              <nav className="hidden lg:flex items-center gap-6 text-xs sm:text-sm font-semibold text-slate-600">
                <Link href="/#trial" className="hover:text-blue-600 transition">
                  Пробный урок
                </Link>
                <Link href="/#faq" className="hover:text-blue-600 transition">
                  Вопросы и ответы
                </Link>
              </nav>
            </div>

            {/* Правые кнопки действий */}
            <div className="flex items-center gap-2.5 sm:gap-3">
              {isRoom ? (
                <Link
                  href="/"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
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
                /* Пользователь ВНУТРИ личного кабинета: аватар, имя и кнопка выхода */
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                      {currentUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="hidden sm:block text-left">
                      <div className="font-bold text-slate-800 leading-tight">{currentUser.name}</div>
                      <div className="text-[10px] text-slate-500">{currentUser.role}</div>
                    </div>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition cursor-pointer"
                    title="Выйти из личного кабинета"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Выйти</span>
                  </button>
                </div>
              ) : authProfile ? (
                /* Пользователь авторизован, находится на лендинге */
                <div className="relative" ref={userMenuRef}>
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition active:scale-95 cursor-pointer shadow-xs"
                    id="btn-cabinet-header"
                  >
                    <div className="w-6 h-6 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                      {authProfile.name.charAt(0).toUpperCase()}
                    </div>
                    <span>{authProfile.name}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-200/80 text-blue-800">
                      {authProfile.role}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${userMenuOpen ? "rotate-180" : ""}`} />
                  </button>

                  {/* Меню профиля */}
                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      <Link
                        href={`/${authProfile.roleKey}`}
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-800 hover:bg-blue-50 hover:text-blue-700 transition"
                      >
                        <User className="w-4 h-4 text-blue-600" />
                        <span>Перейти в кабинет</span>
                      </Link>
                      <Link
                        href={`/${authProfile.roleKey}`}
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                      >
                        <Calendar className="w-4 h-4 text-slate-500" />
                        <span>Моё расписание</span>
                      </Link>
                      <div className="my-1 border-t border-slate-100" />
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition cursor-pointer text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Выйти из аккаунта</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Для гостя: аккуратная кнопка Войти + яркая кнопка регистрации в стиле Foxford */
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowLoginModal(true)}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/90 border border-slate-200/80 transition active:scale-95 cursor-pointer"
                    id="btn-login-header"
                  >
                    <LogIn className="w-4 h-4 text-slate-500" />
                    <span>Войти</span>
                  </button>

                  <Link
                    href="/login?mode=signup"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/25 transition active:scale-95 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Регистрация</span>
                  </Link>
                </div>
              )}

              {/* Мобильная кнопка меню */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Мобильное меню в стиле Фоксфорда */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-3 shadow-lg">
            <div className="font-bold text-xs text-slate-400 uppercase tracking-wider px-2">
              Программы обучения
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/#subjects"
                onClick={() => setMobileMenuOpen(false)}
                className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs font-bold text-slate-800"
              >
                🎒 1–4 классы
              </Link>
              <Link
                href="/#subjects"
                onClick={() => setMobileMenuOpen(false)}
                className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs font-bold text-slate-800"
              >
                📐 5–8 классы
              </Link>
              <Link
                href="/#subjects"
                onClick={() => setMobileMenuOpen(false)}
                className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs font-bold text-slate-800"
              >
                🎯 9–11 классы
              </Link>
              <Link
                href="/#trial"
                onClick={() => setMobileMenuOpen(false)}
                className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-xs font-bold text-blue-700"
              >
                ✨ С репетитором 1:1
              </Link>
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-2">
              <a
                href="tel:+79954854667"
                className="flex items-center gap-2 p-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-50"
              >
                <Phone className="w-4 h-4 text-blue-600" />
                <span>8 995 485 46 67</span>
              </a>
            </div>
          </div>
        )}
      </header>

      {/* 3. МОДАЛЬНОЕ ОКНО ПРЯМОГО ВХОДА ПО EMAIL И ПАРОЛЮ */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 relative">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Вход в личный кабинет
                </h3>
                <p className="text-xs text-slate-600">
                  Введите ваш email и пароль для входа
                </p>
              </div>
              <button
                onClick={() => setShowLoginModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
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

            {/* Выбор роли (Ученик или Родитель) как сегментированный контрол */}
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
                      onClick={() => handleRoleQuickSelect(r.id)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                        isSelected
                          ? "bg-white text-slate-900 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-slate-800" : "text-slate-400"}`} />
                      <span>{r.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Форма ввода Email и Пароля */}
            <form onSubmit={handleModalLogin} className="space-y-3.5" autoComplete="off">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Электронная почта (Email):
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    name="modal_email"
                    autoComplete="off"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Например: ivan@mail.ru"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 font-medium placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-blue-600 transition"
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
                    name="modal_password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Не менее 6 символов"
                    className="w-full pl-9 pr-9 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 font-medium placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-blue-600 transition"
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
                href="/login?mode=signup"
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
