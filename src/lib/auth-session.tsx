"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { GraduationCap, ShieldCheck, User, Users } from "lucide-react";

export type AllowedRole = "student" | "teacher" | "parent" | "admin";

export function normalizeRole(role: string | null | undefined): AllowedRole {
  if (!role) return "student";
  const r = role.toLowerCase().trim();
  if (r === "teacher" || r === "преподаватель" || r === "учитель") return "teacher";
  if (r === "parent" || r === "родитель") return "parent";
  if (r === "admin" || r === "администратор" || r === "админ") return "admin";
  return "student";
}

export function roleTitleRu(role: AllowedRole): string {
  switch (role) {
    case "teacher":
      return "Преподаватель";
    case "parent":
      return "Родитель";
    case "admin":
      return "Администратор";
    case "student":
    default:
      return "Ученик";
  }
}

/**
 * Синхронизирует cookie сессии для middleware Next.js
 */
export function setAuthCookies(role: string, userId: string, token?: string) {
  if (typeof document === "undefined") return;
  const normalized = normalizeRole(role);
  const maxAge = 60 * 60 * 24 * 7; // 7 дней
  document.cookie = `ayda_session=true; path=/; max-age=${maxAge}; SameSite=Lax`;
  document.cookie = `ayda_role=${normalized}; path=/; max-age=${maxAge}; SameSite=Lax`;
  document.cookie = `ayda_user_id=${userId}; path=/; max-age=${maxAge}; SameSite=Lax`;
  if (token) {
    document.cookie = `sb-access-token=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
  }
  if (normalized === "admin") {
    document.cookie = `admin_session=true; path=/; max-age=${maxAge}; SameSite=Lax`;
  }
}

/**
 * Очищает все авторизационные cookie и локальные хранилища
 */
export function clearAuthCookies() {
  if (typeof document === "undefined") return;
  const expired = "expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; max-age=0; SameSite=Lax";
  document.cookie = `ayda_session=; ${expired}`;
  document.cookie = `ayda_role=; ${expired}`;
  document.cookie = `ayda_user_id=; ${expired}`;
  document.cookie = `sb-access-token=; ${expired}`;
  document.cookie = `admin_session=; ${expired}`;

  try {
    const host = window.location.hostname;
    document.cookie = `ayda_session=; domain=${host}; ${expired}`;
    document.cookie = `ayda_role=; domain=${host}; ${expired}`;
    document.cookie = `ayda_user_id=; domain=${host}; ${expired}`;
    document.cookie = `sb-access-token=; domain=${host}; ${expired}`;
    document.cookie = `admin_session=; domain=${host}; ${expired}`;
  } catch (e) {}

  try {
    localStorage.removeItem("ayda_session");
    localStorage.removeItem("ayda_role");
    localStorage.removeItem("ayda_user_id");
    localStorage.removeItem("ayda_current_user_profile");
    localStorage.removeItem("ayda_profile_student");
    localStorage.removeItem("ayda_profile_teacher");
    localStorage.removeItem("ayda_profile_parent");
    localStorage.removeItem("ayda_profile_admin");

    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && (k.startsWith("sb-") || k.includes("supabase") || k.startsWith("ayda_tg_msgs_"))) {
        localStorage.removeItem(k);
      }
    }
    sessionStorage.clear();
  } catch (e) {}
}

/**
 * Надежный выход из системы: очищает все сессии, отключает Supabase с таймаутом
 * и выполняет жесткий переход на /login?logout=1 (не блокируется middleware)
 */
export async function performLogout() {
  clearAuthCookies();
  try {
    const client = getSupabase();
    if (client) {
      await Promise.race([
        client.auth.signOut(),
        new Promise((resolve) => setTimeout(resolve, 600)),
      ]);
    }
  } catch (e) {
    console.warn("SignOut timeout or error:", e);
  }
  clearAuthCookies();
  window.location.replace("/login?logout=1");
}


export interface UserSessionData {
  user: any | null;
  profile: any | null;
  role: AllowedRole;
}

/**
 * Получение текущей проверенной сессии и профиля из Supabase
 */
export async function getVerifiedUserSession(): Promise<UserSessionData | null> {
  const client = getSupabase();
  if (!client) return null;

  try {
    const { data: sessionData } = await client.auth.getSession();
    const session = sessionData?.session;
    const user = session?.user;

    if (!user) return null;

    // Читаем подтвержденный профиль из таблицы profiles
    let profile: any = null;
    let confirmedRole: AllowedRole = "student";

    const { data: profData } = await client
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (profData) {
      profile = profData;
      confirmedRole = normalizeRole(profData.role);
    } else {
      confirmedRole = normalizeRole(user.user_metadata?.role);
    }

    // Синхронизируем cookie
    setAuthCookies(confirmedRole, user.id, session?.access_token);

    return {
      user,
      profile,
      role: confirmedRole,
    };
  } catch (err) {
    console.error("Ошибка проверки сессии пользователя:", err);
    return null;
  }
}

/**
 * Синхронное чтение сохранённой сессии из cookie и localStorage
 */
export function getStoredAuthSession(): {
  isAuthenticated: boolean;
  role: AllowedRole | null;
  userId: string | null;
  profile: any | null;
} {
  if (typeof document === "undefined") {
    return { isAuthenticated: false, role: null, userId: null, profile: null };
  }

  const cookies = document.cookie;
  const hasSession = cookies.includes("ayda_session=true");
  const roleMatch = cookies.match(/ayda_role=([^;]+)/);
  const userIdMatch = cookies.match(/ayda_user_id=([^;]+)/);

  const role = roleMatch ? normalizeRole(roleMatch[1].trim()) : null;
  const userId = userIdMatch ? userIdMatch[1].trim() : null;

  let profile: any = null;
  if (typeof localStorage !== "undefined") {
    try {
      const savedProf =
        (role && localStorage.getItem(`ayda_profile_${role}`)) ||
        localStorage.getItem("ayda_current_user_profile");
      if (savedProf) {
        profile = JSON.parse(savedProf);
      }
    } catch (e) {}
  }

  return {
    isAuthenticated: hasSession,
    role,
    userId,
    profile,
  };
}

/**
 * Хук защиты страниц кабинетов: гарантирует, что каждый пользователь
 * входит под своей учётной записью и имеет доступ только к своему кабинету
 */
export function useAuthGuard(requiredRole: AllowedRole, options: { allowAdmin?: boolean } = {}) {
  const router = useRouter();
  const pathname = usePathname();

  // Синхронная инициализация: если пользователь уже авторизован по cookie/localStorage,
  // личный кабинет открывается МГНОВЕННО без подвисания на экране загрузки!
  const [sessionData, setSessionData] = useState<UserSessionData | null>(() => {
    const stored = getStoredAuthSession();
    if (stored.isAuthenticated && stored.role) {
      const hasAccess =
        stored.role === requiredRole ||
        (options.allowAdmin !== false && stored.role === "admin");
      if (hasAccess) {
        return {
          user: stored.userId ? { id: stored.userId } : null,
          profile: stored.profile,
          role: stored.role,
        };
      }
    }
    return null;
  });

  const [isAuthorized, setIsAuthorized] = useState<boolean>(() => {
    const stored = getStoredAuthSession();
    if (stored.isAuthenticated && stored.role) {
      return (
        stored.role === requiredRole ||
        (options.allowAdmin !== false && stored.role === "admin")
      );
    }
    return false;
  });

  const [loading, setLoading] = useState<boolean>(() => {
    const stored = getStoredAuthSession();
    if (stored.isAuthenticated && stored.role) {
      const hasAccess =
        stored.role === requiredRole ||
        (options.allowAdmin !== false && stored.role === "admin");
      if (hasAccess) return false;
    }
    return true;
  });

  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(null);

  const checkAccess = useCallback(async () => {
    // Если уже авторизованы по валидным cookies, не блокируем интерфейс спиннером
    const storedOnStart = getStoredAuthSession();
    const alreadyValid =
      storedOnStart.isAuthenticated &&
      (storedOnStart.role === requiredRole ||
        (options.allowAdmin !== false && storedOnStart.role === "admin"));

    if (!alreadyValid) {
      setLoading(true);
    }

    const client = getSupabase();
    if (!client) {
      setLoading(false);
      return;
    }

    try {
      // Защищаем получение сессии тайм-аутом 3.5 сек для надежности на мобильных устройствах
      const sessionPromise = client.auth.getSession();
      const timeoutPromise = new Promise<{ data: { session: null } }>((resolve) =>
        setTimeout(() => resolve({ data: { session: null } }), 3500)
      );

      const { data: sessionDataRes } = await Promise.race([sessionPromise, timeoutPromise]);
      const user = sessionDataRes?.session?.user;

      if (!user) {
        // Если Supabase ответил пустой сессией (или тайм-аут), но в cookies есть валидная сессия:
        const stored = getStoredAuthSession();
        if (stored.isAuthenticated && stored.role) {
          const hasAccess =
            stored.role === requiredRole ||
            (options.allowAdmin !== false && stored.role === "admin");
          if (hasAccess) {
            setIsAuthorized(true);
            setLoading(false);
            return;
          }
        }

        // Пользователь действительно не авторизован -> перенаправляем на логин
        clearAuthCookies();
        const redirectUrl = `/login?role=${requiredRole}&redirect=${encodeURIComponent(pathname)}&logout=1`;
        router.replace(redirectUrl);
        return;
      }

      // Проверяем роль в базе данных profiles с тайм-аутом 3.5 сек
      let dbRole: string | null = null;
      let profile: any = null;

      try {
        const profPromise = client
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();
        const profTimeout = new Promise<any>((resolve) =>
          setTimeout(() => resolve({ data: null, error: "timeout" }), 3500)
        );

        const { data: prof } = await Promise.race([profPromise, profTimeout]);
        if (prof) {
          profile = prof;
          dbRole = prof.role;
        }
      } catch (e) {
        console.warn("Profiles fetch warning:", e);
      }

      const verifiedRole = normalizeRole(dbRole || user.user_metadata?.role);

      // Синхронизируем cookie для middleware
      setAuthCookies(verifiedRole, user.id, sessionDataRes?.session?.access_token);

      const hasAccess =
        verifiedRole === requiredRole ||
        (options.allowAdmin !== false && verifiedRole === "admin");

      if (!hasAccess) {
        // Пользователь пытается зайти в чужой кабинет!
        // Блокируем доступ и перенаправляем в его собственный кабинет
        const correctCabinet = `/${verifiedRole}`;
        const errorMsg = `Доступ ограничен: ваша учётная запись «${roleTitleRu(verifiedRole)}». Перенаправляем в ваш личный кабинет...`;
        setAccessDeniedMessage(errorMsg);
        try {
          sessionStorage.setItem("ayda_auth_toast", errorMsg);
        } catch (e) {}

        setTimeout(() => {
          router.replace(correctCabinet);
        }, 300);
        return;
      }

      setSessionData({
        user,
        profile,
        role: verifiedRole,
      });
      setIsAuthorized(true);
    } catch (e) {
      console.error("Auth guard error:", e);
      // При сетевой ошибке не выбрасываем пользователя, если у него есть валидные cookies
      const stored = getStoredAuthSession();
      if (stored.isAuthenticated && stored.role === requiredRole) {
        setIsAuthorized(true);
      } else {
        clearAuthCookies();
        router.replace(`/login?role=${requiredRole}&logout=1`);
      }
    } finally {
      setLoading(false);
    }
  }, [requiredRole, pathname, router, options.allowAdmin]);

  useEffect(() => {
    checkAccess();

    const client = getSupabase();
    if (client) {
      const { data: listener } = client.auth.onAuthStateChange((event, session) => {
        if (event === "SIGNED_OUT") {
          clearAuthCookies();
          router.replace(`/login?role=${requiredRole}&logout=1`);
        } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          if (session?.user) {
            checkAccess();
          }
        }
      });
      return () => {
        listener?.subscription?.unsubscribe();
      };
    }
  }, [checkAccess, requiredRole, router]);

  return {
    loading,
    isAuthorized,
    user: sessionData?.user || null,
    profile: sessionData?.profile || null,
    role: sessionData?.role || null,
    accessDeniedMessage,
    refetch: checkAccess,
  };
}

/**
 * Красивый полноэкранный экран проверки прав доступа с аварийным выходом
 */
export function AuthLoadingScreen({
  roleTitle,
  onBypass,
}: {
  roleTitle?: string;
  onBypass?: () => void;
}) {
  const [showRescue, setShowRescue] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowRescue(true);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  const handleForceEnter = () => {
    if (onBypass) {
      onBypass();
    } else {
      window.location.reload();
    }
  };

  const handleResetLogin = () => {
    clearAuthCookies();
    window.location.href = "/login?logout=1";
  };

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 animate-pulse mb-4">
        <GraduationCap className="w-8 h-8" />
      </div>
      <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
        Проверка учётной записи...
      </h3>
      <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm">
        {roleTitle ? `Проверяем доступ к разделу: ${roleTitle}` : "Загрузка персонального кабинета и проверка прав доступа..."}
      </p>
      <div className="mt-4 flex items-center gap-1.5 text-xs text-blue-600 font-semibold">
        <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
        <span>Безопасное соединение</span>
      </div>

      {/* Если загрузка длится дольше 2.5 секунд, даём пользователю прямое управление */}
      {showRescue && (
        <div className="mt-6 flex flex-col sm:flex-row items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <button
            onClick={handleForceEnter}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white shadow-md hover:bg-blue-700 transition active:scale-95 cursor-pointer"
          >
            Войти в кабинет прямо сейчас
          </button>
          <button
            onClick={handleResetLogin}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
          >
            Войти заново
          </button>
        </div>
      )}
    </div>
  );
}
