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
 * Очищает все авторизационные cookie
 */
export function clearAuthCookies() {
  if (typeof document === "undefined") return;
  document.cookie = "ayda_session=; path=/; max-age=0; SameSite=Lax";
  document.cookie = "ayda_role=; path=/; max-age=0; SameSite=Lax";
  document.cookie = "ayda_user_id=; path=/; max-age=0; SameSite=Lax";
  document.cookie = "sb-access-token=; path=/; max-age=0; SameSite=Lax";
  document.cookie = "admin_session=; path=/; max-age=0; SameSite=Lax";
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
 * Хук защиты страниц кабинетов: гарантирует, что каждый пользователь
 * входит под своей учётной записью и имеет доступ только к своему кабинету
 */
export function useAuthGuard(requiredRole: AllowedRole, options: { allowAdmin?: boolean } = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [sessionData, setSessionData] = useState<UserSessionData | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(null);

  const checkAccess = useCallback(async () => {
    setLoading(true);
    const client = getSupabase();
    if (!client) {
      setLoading(false);
      return;
    }

    try {
      const { data: sessionData } = await client.auth.getSession();
      const user = sessionData?.session?.user;

      if (!user) {
        // Пользователь не авторизован -> перенаправляем на логин
        clearAuthCookies();
        const redirectUrl = `/login?role=${requiredRole}&redirect=${encodeURIComponent(pathname)}`;
        router.replace(redirectUrl);
        return;
      }

      // Проверяем роль в базе данных profiles
      let dbRole: string | null = null;
      let profile: any = null;
      const { data: prof } = await client
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (prof) {
        profile = prof;
        dbRole = prof.role;
      }

      const verifiedRole = normalizeRole(dbRole || user.user_metadata?.role);

      // Синхронизируем cookie для middleware
      setAuthCookies(verifiedRole, user.id, sessionData?.session?.access_token);

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
      router.replace(`/login?role=${requiredRole}`);
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
          router.replace(`/login?role=${requiredRole}`);
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
 * Красивый полноэкранный экран проверки прав доступа
 */
export function AuthLoadingScreen({ roleTitle }: { roleTitle?: string }) {
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
    </div>
  );
}
