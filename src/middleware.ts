import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // 1. Установка защитных HTTP-заголовков (Hardening)
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set(
    "Permissions-Policy",
    "camera=(self), microphone=(self), display-capture=(self)"
  );

  // 2. Защита маршрута /admin на уровне сервера
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/admin")) {
    const authHeader = request.headers.get("authorization");
    const hasAuthToken =
      Boolean(authHeader) ||
      request.cookies.has("sb-access-token") ||
      request.cookies.has("supabase-auth-token") ||
      request.cookies.getAll().some((c) => c.name.startsWith("sb-"));

    // Если нет признака сессии в cookies/заголовках, отправляем на страницу входа
    if (!hasAuthToken) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Применяем ко всем маршрутам, кроме статических ресурсов и _next
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
