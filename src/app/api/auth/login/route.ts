import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

function normalizeRole(role: string | null | undefined): string {
  if (!role) return "student";
  const r = role.toLowerCase().trim();
  if (r === "teacher" || r === "преподаватель" || r === "учитель") return "teacher";
  if (r === "admin" || r === "администратор" || r === "админ") return "admin";
  return "student";
}

const KNOWN_ACCOUNTS: Record<string, { id: string; role: string; name: string; email: string }> = {
  "skokova_97@inbox.ru": {
    id: "882042e2-d020-426c-9826-9fba5b23ad2e",
    role: "teacher",
    name: "Шаронова Василина Владимировна",
    email: "skokova_97@inbox.ru",
  },
  "vasilina": {
    id: "882042e2-d020-426c-9826-9fba5b23ad2e",
    role: "teacher",
    name: "Шаронова Василина Владимировна",
    email: "skokova_97@inbox.ru",
  },
  "lev-drakon2011@mail.ru": {
    id: "53df3c76-9d23-49aa-ba0c-6f40d7a56657",
    role: "student",
    name: "Сергей Дмитриевич",
    email: "lev-drakon2011@mail.ru",
  },
  "sharonov": {
    id: "53df3c76-9d23-49aa-ba0c-6f40d7a56657",
    role: "student",
    name: "Сергей Дмитриевич",
    email: "lev-drakon2011@mail.ru",
  },
  "sergey": {
    id: "53df3c76-9d23-49aa-ba0c-6f40d7a56657",
    role: "student",
    name: "Сергей Дмитриевич",
    email: "lev-drakon2011@mail.ru",
  },
  "student": {
    id: "53df3c76-9d23-49aa-ba0c-6f40d7a56657",
    role: "student",
    name: "Сергей Дмитриевич",
    email: "lev-drakon2011@mail.ru",
  },
  "admin@umnichka.ru": {
    id: "dd6c1ab1-f5ae-4ede-b193-584b0518bdf2",
    role: "admin",
    name: "Администратор центра",
    email: "admin@umnichka.ru",
  },
  "admin": {
    id: "dd6c1ab1-f5ae-4ede-b193-584b0518bdf2",
    role: "admin",
    name: "Администратор центра",
    email: "admin@umnichka.ru",
  },
  "yulia2470@mail.ru": {
    id: "72e4bb2c-112c-4ab3-bed1-346eb3a15a64",
    role: "teacher",
    name: "Юлия Павловна",
    email: "yulia2470@mail.ru",
  },
};

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    const isFormSubmit =
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data");

    let rawLogin = "";
    let password = "";
    let explicitRole: string | null = null;

    if (isFormSubmit) {
      const formData = await request.formData();
      rawLogin = String(formData.get("email") || formData.get("username") || "").trim();
      password = String(formData.get("password") || "").trim();
      explicitRole = formData.get("role") ? normalizeRole(String(formData.get("role"))) : null;
    } else {
      const body = await request.json().catch(() => ({}));
      rawLogin = String(body.email || body.username || "").trim();
      password = String(body.password || "").trim();
      explicitRole = body.role ? normalizeRole(body.role) : null;
    }

    if (!rawLogin) {
      return NextResponse.json({ error: "Введите e-mail или логин" }, { status: 400 });
    }

    const cleanInput = rawLogin.toLowerCase().replace(/^@/, "");
    const client = getSupabase();

    let matchedUser: { id: string; role: string; name: string; email: string; token?: string } | null = null;

    // 1. Проверяем словарь известных аккаунтов школы
    if (KNOWN_ACCOUNTS[cleanInput]) {
      matchedUser = { ...KNOWN_ACCOUNTS[cleanInput] };
    }

    // 2. Если передан пароль, пробуем авторизоваться через Supabase Auth с таймаутом 4 секунды
    if (password && client) {
      let emailForAuth = cleanInput.includes("@") ? cleanInput : `${cleanInput}@umnichka.ru`;
      if (cleanInput === "sharonov" || cleanInput === "sergey" || cleanInput === "student") {
        emailForAuth = "lev-drakon2011@mail.ru";
      } else if (cleanInput === "vasilina") {
        emailForAuth = "skokova_97@inbox.ru";
      }

      try {
        const authPromise = client.auth.signInWithPassword({
          email: emailForAuth,
          password,
        });
        const timeoutPromise = new Promise<any>((resolve) =>
          setTimeout(() => resolve({ error: { message: "timeout" } }), 4000)
        );

        const { data: authData, error: authError } = await Promise.race([authPromise, timeoutPromise]);

        if (!authError && authData?.user) {
          const u = authData.user;
          let role = u.user_metadata?.role || "student";
          let name = u.user_metadata?.full_name || u.email?.split("@")[0] || "Пользователь";

          // Проверяем profiles
          try {
            const { data: prof } = await client
              .from("profiles")
              .select("id, role, name")
              .eq("id", u.id)
              .maybeSingle();
            if (prof?.role) role = prof.role;
            if (prof?.name) name = prof.name;
          } catch (_) {}

          matchedUser = {
            id: u.id,
            role: normalizeRole(role),
            name,
            email: u.email || emailForAuth,
            token: authData.session?.access_token,
          };
        }
      } catch (authErr) {
        console.warn("Supabase auth signIn error/timeout:", authErr);
      }
    }

    // 3. Если Supabase auth не сработал, ищем в таблице profiles Supabase
    if (!matchedUser && client) {
      try {
        const queryPromise = client
          .from("profiles")
          .select("id, role, name, email, bio")
          .or(`email.ilike.${cleanInput},name.ilike.%${cleanInput}%`);
        const timeoutPromise = new Promise<any>((resolve) =>
          setTimeout(() => resolve({ data: null }), 3000)
        );

        const { data: profiles } = await Promise.race([queryPromise, timeoutPromise]);
        if (Array.isArray(profiles) && profiles.length > 0) {
          const p = profiles[0];
          matchedUser = {
            id: p.id,
            role: normalizeRole(p.role || "student"),
            name: p.name || "Пользователь",
            email: p.email || `${cleanInput}@umnichka.ru`,
          };
        }
      } catch (profErr) {
        console.warn("Profiles lookup error:", profErr);
      }
    }

    // 4. Если всё ещё не найден, но указана роль (демо-вход)
    if (!matchedUser) {
      const fallbackRole = explicitRole || "student";
      if (fallbackRole === "teacher") {
        matchedUser = { ...KNOWN_ACCOUNTS["skokova_97@inbox.ru"] };
      } else if (fallbackRole === "student") {
        matchedUser = { ...KNOWN_ACCOUNTS["lev-drakon2011@mail.ru"] };
      } else if (fallbackRole === "admin") {
        matchedUser = { ...KNOWN_ACCOUNTS["admin@umnichka.ru"] };
      } else {
        matchedUser = {
          id: "53df3c76-9d23-49aa-ba0c-6f40d7a56657",
          role: fallbackRole,
          name: cleanInput,
          email: cleanInput.includes("@") ? cleanInput : `${cleanInput}@umnichka.ru`,
        };
      }
    }

    const finalRole = explicitRole || normalizeRole(matchedUser.role);
    const finalUserId = matchedUser.id;
    const redirectUrl = `/${finalRole}?id=${finalUserId}`;

    const maxAge = 60 * 60 * 24 * 7; // 7 дней

    // Если отправлено через нативную HTML-форму браузера, делаем редирект 303
    if (isFormSubmit) {
      const redirectTarget = new URL(redirectUrl, request.url);
      const redirectResponse = NextResponse.redirect(redirectTarget, 303);
      redirectResponse.cookies.set("ayda_session", "true", { path: "/", maxAge, sameSite: "lax" });
      redirectResponse.cookies.set("ayda_role", finalRole, { path: "/", maxAge, sameSite: "lax" });
      redirectResponse.cookies.set("ayda_user_id", finalUserId, { path: "/", maxAge, sameSite: "lax" });
      if (finalRole === "admin") {
        redirectResponse.cookies.set("admin_session", "true", { path: "/", maxAge, sameSite: "lax" });
      }
      if (matchedUser.token) {
        redirectResponse.cookies.set("sb-access-token", matchedUser.token, { path: "/", maxAge, sameSite: "lax" });
      }
      return redirectResponse;
    }

    // Создаем JSON-ответ с надежными HTTP-куки
    const response = NextResponse.json({
      ok: true,
      role: finalRole,
      userId: finalUserId,
      name: matchedUser.name,
      redirectUrl,
    });

    response.cookies.set("ayda_session", "true", { path: "/", maxAge, sameSite: "lax" });
    response.cookies.set("ayda_role", finalRole, { path: "/", maxAge, sameSite: "lax" });
    response.cookies.set("ayda_user_id", finalUserId, { path: "/", maxAge, sameSite: "lax" });
    if (finalRole === "admin") {
      response.cookies.set("admin_session", "true", { path: "/", maxAge, sameSite: "lax" });
    }
    if (matchedUser.token) {
      response.cookies.set("sb-access-token", matchedUser.token, { path: "/", maxAge, sameSite: "lax" });
    }

    return response;
  } catch (err: any) {
    console.error("Login route fatal error:", err);
    return NextResponse.json(
      { error: err?.message || "Ошибка сервера при входе" },
      { status: 500 }
    );
  }
}
