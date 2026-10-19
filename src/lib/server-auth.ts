import { getSupabase } from "@/lib/supabase";

export type UserRole = "admin" | "teacher" | "student" | "parent";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  name: string;
}

/**
 * Извлекает токен Bearer из заголовка Authorization или cookie sb-access-token
 */
export function extractAuthToken(request: Request): string | null {
  const authHeader = request.headers.get("Authorization") || request.headers.get("authorization");
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    return authHeader.substring(7).trim();
  }

  // Проверка cookie
  const cookieHeader = request.headers.get("cookie") || "";
  const match =
    cookieHeader.match(/sb-access-token=([^;]+)/i) ||
    cookieHeader.match(/sb-[a-z0-9]+-auth-token=([^;]+)/i) ||
    cookieHeader.match(/supabase-auth-token=([^;]+)/i);
  if (match) {
    try {
      const decoded = decodeURIComponent(match[1]);
      if (decoded.startsWith("[")) {
        const parsed = JSON.parse(decoded);
        return parsed[0] || null;
      }
      return decoded;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Проверяет подлинность токена пользователя через Supabase Auth и определяет его подтвержденную роль
 */
export async function authenticateRequest(request: Request): Promise<{
  user: AuthenticatedUser | null;
  error?: string;
  statusCode?: number;
}> {
  const token = extractAuthToken(request);
  if (!token) {
    return { user: null, error: "Требуется аутентификация. Передайте Bearer-токен.", statusCode: 401 };
  }

  const client = getSupabase();
  try {
    const { data: authData, error: authError } = await client.auth.getUser(token);
    if (authError || !authData?.user) {
      return { user: null, error: "Недействительный или истекший токен сессии.", statusCode: 401 };
    }

    const sbUser = authData.user;
    const metadata = sbUser.user_metadata || {};

    // Загружаем подтвержденную роль из базы profiles
    let role: UserRole = "student";
    let name: string = metadata.full_name || sbUser.email?.split("@")[0] || "Пользователь";

    try {
      const { data: profile } = await client
        .from("profiles")
        .select("role, full_name")
        .eq("id", sbUser.id)
        .single();

      if (profile) {
        if (profile.role) role = profile.role.toLowerCase() as UserRole;
        if (profile.full_name) name = profile.full_name;
      } else if (metadata.role) {
        role = metadata.role.toLowerCase() as UserRole;
      }
    } catch {
      if (metadata.role) {
        role = metadata.role.toLowerCase() as UserRole;
      }
    }

    return {
      user: {
        id: sbUser.id,
        email: sbUser.email || "",
        role,
        name,
      },
    };
  } catch (err: any) {
    return { user: null, error: "Ошибка проверки сессии пользователя.", statusCode: 401 };
  }
}
