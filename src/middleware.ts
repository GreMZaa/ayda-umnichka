import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Автоматический редирект для путей с заглавными буквами (например, /ADMIN -> /admin)
  if (pathname !== pathname.toLowerCase()) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.toLowerCase();
    return NextResponse.redirect(url, 308);
  }

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
