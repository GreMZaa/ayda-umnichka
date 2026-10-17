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

  // 2. Безопасность: защитные заголовки для всех путей, доступ к админке защищен на странице /admin


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
