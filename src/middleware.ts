import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // 1. Автоматический редирект для путей с заглавными буквами (например, /ADMIN -> /admin)
  if (pathname !== pathname.toLowerCase()) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.toLowerCase();
    return NextResponse.redirect(url, 308);
  }

  // 2. Проверка защиты кабинетов по ролям (Role-Based Route Protection)
  const isApi = pathname.startsWith("/api");
  const isStatic = pathname.includes(".") || pathname.startsWith("/_next");

  if (!isApi && !isStatic) {
    const aydaSession = request.cookies.get("ayda_session")?.value;
    const aydaRole = (request.cookies.get("ayda_role")?.value || "").toLowerCase();
    const adminSession = request.cookies.get("admin_session")?.value;

    const isStudentRoute = pathname === "/student" || pathname.startsWith("/student/");
    const isTeacherRoute = pathname === "/teacher" || pathname.startsWith("/teacher/");
    const isParentRoute = pathname === "/parent" || pathname.startsWith("/parent/");
    const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
    const isLoginRoute = pathname === "/login";

    // А) Защита кабинета ученика: доступ только для роли student (и администратора)
    if (isStudentRoute) {
      if (!aydaSession) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("role", "student");
        url.searchParams.set("redirect", pathname);
        return NextResponse.redirect(url);
      }
      if (aydaRole && aydaRole !== "student" && aydaRole !== "admin") {
        const url = request.nextUrl.clone();
        url.pathname = `/${aydaRole}`;
        return NextResponse.redirect(url);
      }
    }

    // Б) Защита кабинета учителя: доступ только для роли teacher (и администратора)
    if (isTeacherRoute) {
      if (!aydaSession) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("role", "teacher");
        url.searchParams.set("redirect", pathname);
        return NextResponse.redirect(url);
      }
      if (aydaRole && aydaRole !== "teacher" && aydaRole !== "admin") {
        const url = request.nextUrl.clone();
        url.pathname = `/${aydaRole}`;
        return NextResponse.redirect(url);
      }
    }

    // В) Защита кабинета родителя: доступ только для роли parent (и администратора)
    if (isParentRoute) {
      if (!aydaSession) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("role", "parent");
        url.searchParams.set("redirect", pathname);
        return NextResponse.redirect(url);
      }
      if (aydaRole && aydaRole !== "parent" && aydaRole !== "admin") {
        const url = request.nextUrl.clone();
        url.pathname = `/${aydaRole}`;
        return NextResponse.redirect(url);
      }
    }

    // Г) Защита панели администратора: доступ только для роли admin
    if (isAdminRoute) {
      if (aydaRole && aydaRole !== "admin" && !adminSession) {
        const url = request.nextUrl.clone();
        url.pathname = `/${aydaRole}`;
        return NextResponse.redirect(url);
      }
    }

    // Д) Страница логина: если пользователь уже авторизован, направляем в его кабинет
    if (isLoginRoute && aydaSession && aydaRole) {
      const mode = searchParams.get("mode");
      const logout = searchParams.get("logout");
      if (mode !== "signup" && !logout) {
        const url = request.nextUrl.clone();
        url.pathname = `/${aydaRole}`;
        return NextResponse.redirect(url);
      }
    }

    // Е) Главная страница: если пользователь уже авторизован, автоматически направляем в его личный кабинет
    if (pathname === "/" && aydaSession && aydaRole) {
      const mode = searchParams.get("mode");
      const logout = searchParams.get("logout");
      const guest = searchParams.get("guest");
      if (mode !== "signup" && !logout && !guest) {
        const targetRole = ["student", "teacher", "parent", "admin"].includes(aydaRole) ? aydaRole : "student";
        const url = request.nextUrl.clone();
        url.pathname = `/${targetRole}`;
        return NextResponse.redirect(url);
      }
    }

    // Ж) Если пользователь зашёл на домен личного кабинета (lk-* или lk.*) и путь "/", сразу направляем на страницу входа
    const host = request.headers.get("host") || "";
    const isLkHost = host.startsWith("lk-") || host.startsWith("lk.");
    if (isLkHost && pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }

  const response = NextResponse.next();

  // 3. Установка защитных HTTP-заголовков (Hardening)
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
