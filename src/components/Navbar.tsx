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
  HelpCircle,
  Edit3,
} from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { setAuthCookies, clearAuthCookies, performLogout, normalizeRole } from "@/lib/auth-session";
import EditProfileModal from "@/components/EditProfileModal";
import { getLkUrl, getMainSiteUrl } from "@/lib/config";
import BrandLogo from "@/components/BrandLogo";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mainSiteUrl, setMainSiteUrl] = useState("/?guest=1");

  useEffect(() => {
    setMainSiteUrl(getMainSiteUrl("/?guest=1"));
  }, []);

  // Состояние модальных окон и выпадающих меню
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [editProfileModalOpen, setEditProfileModalOpen] = useState(false);
  const [currentUserAvatar, setCurrentUserAvatar] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Поля авторизации в модальном окне
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
      const updateProfile = (user: any, token?: string) => {
        if (user) {
          const meta = user.user_metadata || {};
          const rKey = normalizeRole(meta.role);
          setAuthCookies(rKey, user.id, token);
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
        updateProfile(data?.session?.user, data?.session?.access_token);
      });

      const { data: authListener } = client.auth.onAuthStateChange((_event, session) => {
        updateProfile(session?.user, session?.access_token);
      });

      // Подгрузка аватара из сохраненного профиля
      try {
        const curRole = isTeacher ? "teacher" : isStudent ? "student" : isParent ? "parent" : "admin";
        const saved =
          localStorage.getItem(`ayda_profile_${curRole}`) ||
          localStorage.getItem("ayda_current_user_profile");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.avatarUrl) setCurrentUserAvatar(parsed.avatarUrl);
        }
      } catch (e) {}

      // Слушатель событий обновления профиля
      const handleProfileUpdate = (e: any) => {
        const p = e.detail;
        if (p) {
          if (p.avatarUrl !== undefined) setCurrentUserAvatar(p.avatarUrl);
          if (p.name) {
            setAuthProfile((prev: any) =>
              prev ? { ...prev, name: p.name } : null
            );
          }
        }
      };
      window.addEventListener("ayda:profile-updated", handleProfileUpdate);

      return () => {
        authListener?.subscription?.unsubscribe();
        window.removeEventListener("ayda:profile-updated", handleProfileUpdate);
      };
    }
  }, [pathname]);

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
        let effectiveEmail = email.trim();

        // Поддержка входа как по email, так и по короткому логину/нику (например sharonov)
        if (!effectiveEmail.includes("@")) {
          const cleanNick = effectiveEmail.replace(/^@/, "").toLowerCase();
          try {
            const { data: matchedProfile } = await client
              .from("profiles")
              .select("email, bio")
              .ilike("bio", `%"username":"${cleanNick}"%`)
              .maybeSingle();

            if (matchedProfile?.email) {
              effectiveEmail = matchedProfile.email;
            } else if (cleanNick === "sharonov" || cleanNick === "sergey" || cleanNick === "student") {
              effectiveEmail = "lev-drakon2011@mail.ru";
            } else {
              effectiveEmail = `${cleanNick}@umnichka.ru`;
            }
          } catch (e) {
            if (cleanNick === "sharonov" || cleanNick === "sergey" || cleanNick === "student") {
              effectiveEmail = "lev-drakon2011@mail.ru";
            } else {
              effectiveEmail = `${cleanNick}@umnichka.ru`;
            }
          }
        } else if (
          effectiveEmail.toLowerCase() === "sharonov@umnichka.ru" ||
          effectiveEmail.toLowerCase() === "student@umnichka.ru"
        ) {
          effectiveEmail = "lev-drakon2011@mail.ru";
        }

        const { data, error } = await client.auth.signInWithPassword({
          email: effectiveEmail,
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

        let role = (data.user?.user_metadata?.role || "").toLowerCase();
        if (!role || role === "authenticated") {
          try {
            const { data: prof } = await client
              .from("profiles")
              .select("role")
              .eq("id", data.user?.id)
              .maybeSingle();
            if (prof?.role) role = prof.role.toLowerCase();
          } catch (e) {}
        }
        const confirmedRole = normalizeRole(role || "student");
        if (data.user) {
          setAuthCookies(confirmedRole, data.user.id, data.session?.access_token);
          try {
            localStorage.setItem("ayda_session", "true");
            localStorage.setItem("ayda_role", confirmedRole);
            localStorage.setItem("ayda_user_id", data.user.id);
          } catch {}
        }

        setShowLoginModal(false);
        window.location.replace(`/${confirmedRole}`);
        return;
      } catch (err: any) {
        setErrorMsg(err?.message || "Ошибка подключения к серверу авторизации.");
        setLoading(false);
        return;
      }
    } else {
      setShowLoginModal(false);
      const fallbackRole = email.includes("admin")
        ? "admin"
        : email.includes("teacher")
        ? "teacher"
        : email.includes("parent")
        ? "parent"
        : "student";
      router.push(`/${fallbackRole}`);
    }

    setLoading(false);
  };

  const handleLogout = async () => {
    setUserMenuOpen(false);
    await performLogout();
  };

  return (
    <>
      {/* 1. ВЕРХНИЙ ИНФО-БАР (Только для десктопа и планшетов, на мобильных скрыт для экономии места) */}
      {!isInsideCabinet && (
        <div className="hidden sm:block bg-white border-b border-slate-100 text-slate-600 text-[11px] sm:text-xs py-1.5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 truncate">
              <span className="flex items-center gap-1.5 text-emerald-600 font-semibold truncate">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="truncate">Онлайн-уроки с репетитором</span>
                <span className="hidden sm:inline">по всей России</span>
              </span>
              <span className="hidden md:inline text-slate-300">|</span>
              <span className="hidden md:inline text-slate-500 font-medium">
                Первый пробный урок — бесплатно
              </span>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <a
                href="tel:+79954854667"
                className="flex items-center gap-1.5 text-slate-700 hover:text-blue-600 font-bold transition"
              >
                <Phone className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="whitespace-nowrap">8 995 485 46 67</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 2. ОСНОВНАЯ ШАПКА В СТИЛЕ FOXFORD */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/90 shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className={`flex items-center justify-between ${isLoginPage ? "h-14 sm:h-16" : "h-14 sm:h-16 lg:h-[70px]"}`}>
            {/* Левая группа: Логотип и Навигация */}
            <div className="flex items-center gap-3 sm:gap-8 min-w-0 shrink">
              {/* Новый фирменный логотип АйДаУмничка */}
              <BrandLogo
                size="md"
                href={isInsideCabinet ? undefined : mainSiteUrl}
                onClick={
                  isInsideCabinet
                    ? undefined
                    : (e) => {
                        const target = getMainSiteUrl("/?guest=1");
                        if (target.startsWith("http://") || target.startsWith("https://")) {
                          e?.preventDefault?.();
                          window.location.href = target;
                        }
                      }
                }
              />

              {/* Навигационные ссылки (десктоп, только на публичных страницах) */}
              {!isInsideCabinet ? (
                <nav className="hidden lg:flex items-center gap-6 text-xs sm:text-sm font-semibold text-slate-600">
                  <Link href="/#trial" className="hover:text-blue-600 transition">
                    Пробный урок
                  </Link>
                  {!isLoginPage && (
                    <a href={getLkUrl("/login")} className="hover:text-blue-600 transition">
                      Вход в кабинет
                    </a>
                  )}
                </nav>
              ) : (
                <div className="hidden sm:flex items-center gap-2 pl-4 border-l border-slate-200">
                  <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">
                    {defaultCabinetName}
                  </span>
                </div>
              )}
            </div>

            {/* Правые кнопки действий */}
            <div className="flex items-center gap-1.5 sm:gap-3">
              {isRoom ? (
                <Link
                  href="/"
                  className="px-3 sm:px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                >
                  Выйти из урока
                </Link>
              ) : isLoginPage ? (
                <a
                  href={mainSiteUrl}
                  onClick={(e) => {
                    const target = getMainSiteUrl("/?guest=1");
                    if (target.startsWith("http://") || target.startsWith("https://")) {
                      e.preventDefault();
                      window.location.href = target;
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition border border-slate-200 cursor-pointer"
                >
                  <span>← Главная</span>
                </a>
              ) : isInsideCabinet && currentUser ? (
                /* Пользователь ВНУТРИ личного кабинета: аватар, имя и кнопка выхода */
                <div className="flex items-center gap-1.5 sm:gap-3">
                  <div
                    onClick={() => setEditProfileModalOpen(true)}
                    className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-blue-50/70 border border-slate-200 hover:border-blue-200 text-xs transition cursor-pointer group"
                    title="Нажмите для редактирования профиля"
                  >
                    <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-xs shrink-0 overflow-hidden ring-1 ring-blue-500/20">
                      {currentUserAvatar ? (
                        <img src={currentUserAvatar} alt={currentUser.name} className="w-full h-full object-cover" />
                      ) : (
                        currentUser.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="hidden sm:block text-left">
                      <div className="font-bold text-slate-800 leading-tight group-hover:text-blue-600 transition flex items-center gap-1">
                        <span>{currentUser.name}</span>
                        <Edit3 className="w-3 h-3 text-slate-400 group-hover:text-blue-500 opacity-60 transition" />
                      </div>
                      <div className="text-[10px] text-slate-500">{currentUser.role}</div>
                    </div>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition cursor-pointer"
                    title="Выйти из личного кабинета"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Выйти</span>
                  </button>
                </div>
              ) : authProfile ? (
                /* Пользователь авторизован: прямой переход в личный кабинет + меню управления */
                <div className="flex items-center gap-1.5 relative" ref={userMenuRef}>
                  <Link
                    href={`/${authProfile.roleKey}`}
                    id="btn-cabinet-header"
                    className="flex items-center gap-2 sm:gap-2.5 pl-2 pr-3 sm:pr-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-50/90 to-indigo-50/70 hover:from-blue-100 hover:to-indigo-100/90 border border-blue-200/80 hover:border-blue-300 shadow-2xs transition active:scale-98 group cursor-pointer"
                    title={`Войти в личный кабинет (${authProfile.name})`}
                  >
                    {/* Аватар */}
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0 overflow-hidden ring-2 ring-white shadow-xs">
                      {currentUserAvatar ? (
                        <img src={currentUserAvatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        authProfile.name.charAt(0).toUpperCase()
                      )}
                    </div>

                    {/* Текстовый блок: Имя и статус входа */}
                    <div className="min-w-0 max-w-[120px] sm:max-w-[170px] leading-tight text-left">
                      <div className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-blue-700 transition truncate">
                        {authProfile.name}
                      </div>
                      <div className="text-[10px] font-semibold text-blue-600 flex items-center gap-1 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span>В кабинет</span>
                        <ArrowRight className="w-2.5 h-2.5 opacity-70 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </Link>

                  {/* Дополнительная кнопка меню (редактирование, выход) */}
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="p-2 sm:py-2.5 sm:px-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 border border-slate-200/80 transition cursor-pointer"
                    title="Настройки профиля"
                    aria-label="Настройки профиля"
                  >
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${userMenuOpen ? "rotate-180" : ""}`} />
                  </button>

                  {/* Выпадающее меню профиля */}
                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200/90 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      {/* Карточка профиля в шапке меню */}
                      <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 mb-1.5">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold text-sm flex items-center justify-center shrink-0 overflow-hidden ring-2 ring-white shadow-xs">
                          {currentUserAvatar ? (
                            <img src={currentUserAvatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            authProfile.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-extrabold text-xs text-slate-900 truncate">
                            {authProfile.name}
                          </div>
                          <div className="text-[10px] font-bold text-blue-600 flex items-center gap-1 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                            <span>{authProfile.role}</span>
                          </div>
                        </div>
                      </div>

                      <Link
                        href={`/${authProfile.roleKey}`}
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-800 hover:bg-blue-50 hover:text-blue-700 transition"
                      >
                        <User className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>Перейти в личный кабинет</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setUserMenuOpen(false);
                          setEditProfileModalOpen(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition cursor-pointer text-left"
                      >
                        <Edit3 className="w-4 h-4 text-slate-500 shrink-0" />
                        <span>Редактировать профиль</span>
                      </button>
                      <Link
                        href={`/${authProfile.roleKey}`}
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                      >
                        <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
                        <span>Моё расписание</span>
                      </Link>
                      <div className="my-1 border-t border-slate-100" />
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition cursor-pointer text-left"
                      >
                        <LogOut className="w-4 h-4 shrink-0" />
                        <span>Выйти из аккаунта</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Для гостя: яркая кнопка Войти (в дизайне регистрации) + стильная кнопка регистрации */
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <a
                    href={getLkUrl("/login")}
                    className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/25 transition active:scale-95 cursor-pointer whitespace-nowrap"
                    id="btn-login-header"
                  >
                    <LogIn className="w-3.5 h-3.5 text-white" />
                    <span>Войти</span>
                  </a>

                  <a
                    href={getLkUrl("/login?mode=signup")}
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 shadow-2xs transition active:scale-95 cursor-pointer whitespace-nowrap"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Регистрация</span>
                  </a>
                </div>
              )}

              {/* Мобильная кнопка меню (только для публичных страниц) */}
              {!isInsideCabinet && (
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition active:scale-95 cursor-pointer"
                  aria-label="Открыть меню навигации"
                >
                  {mobileMenuOpen ? <X className="w-5 h-5 text-slate-900" /> : <Menu className="w-5 h-5 text-slate-700" />}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Мобильное меню в стиле Фоксфорда (только для публичных страниц) */}
        {!isInsideCabinet && mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-4 shadow-xl animate-in slide-in-from-top-2 duration-150">
            {/* Блок авторизации для мобильных гостей */}
            {!authProfile && (
              <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-100">
                <a
                  href={getLkUrl("/login")}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/25 transition cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5 text-white" />
                  <span>Войти</span>
                </a>
                <a
                  href={getLkUrl("/login?mode=signup")}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition border border-blue-200 text-center"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Регистрация</span>
                </a>
              </div>
            )}

            {/* Быстрые переходы */}
            <div className="space-y-2">
              <Link
                href="/#trial"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200 text-xs font-bold text-blue-900 transition hover:bg-blue-100"
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>Записаться на бесплатный пробный урок</span>
                </div>
                <span className="text-blue-600 font-bold">→</span>
              </Link>

              <a
                href={getLkUrl("/login")}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 hover:bg-slate-100 transition"
              >
                <div className="flex items-center gap-2.5">
                  <User className="w-4 h-4 text-slate-600" />
                  <span>Личный кабинет (Вход)</span>
                </div>
                <span className="text-slate-400">→</span>
              </a>
            </div>

            {/* Контакты центра */}
            <div className="border-t border-slate-100 pt-3">
              <a
                href="tel:+79954854667"
                className="flex items-center justify-center gap-2 p-3 rounded-2xl text-xs font-extrabold text-slate-800 bg-slate-50 border border-slate-200/80 hover:bg-slate-100 transition"
              >
                <Phone className="w-4 h-4 text-blue-600" />
                <span>Позвонить: 8 995 485 46 67</span>
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

            {/* Форма ввода Email и Пароля */}
            <form onSubmit={handleModalLogin} className="space-y-3.5" autoComplete="on">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Электронная почта (Email) или логин:
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    name="username"
                    id="nav_modal_username"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@mail.ru"
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
                    name="password"
                    id="nav_modal_password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Введите ваш пароль"
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
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
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

      {/* Модальное окно редактирования профиля */}
      <EditProfileModal
        isOpen={editProfileModalOpen}
        onClose={() => setEditProfileModalOpen(false)}
        defaultRole={isTeacher ? "TEACHER" : isStudent ? "STUDENT" : isParent ? "PARENT" : "ADMIN"}
        onProfileUpdated={(updated) => {
          if (updated.avatarUrl !== undefined) setCurrentUserAvatar(updated.avatarUrl);
          if (updated.name) {
            setAuthProfile((prev: any) =>
              prev ? { ...prev, name: updated.name } : null
            );
          }
        }}
      />
    </>
  );
}
