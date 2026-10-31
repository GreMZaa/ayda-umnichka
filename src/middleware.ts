import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// System paths that have dedicated page handlers or are public assets
const SYSTEM_ROUTES = new Set([
  'admin',
  'teacher',
  'student',
  'login',
  'messenger',
  'room',
  'api',
  'sw.js',
  'manifest.json',
  'manifest.webmanifest',
  'icon-192.png',
  'icon-512.png',
  'apple-touch-icon.png',
  'favicon.ico',
  'icon.png',
  'logo.png',
  'logo.svg',
  'robots.txt',
  'sitemap.xml',
]);

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const { pathname, search } = request.nextUrl;

  // Check if request is coming to the LK subdomain (e.g. lk-ayda-umnichka.vercel.app or lk.example.ru)
  const isLkSubdomain = host.startsWith('lk-') || host.startsWith('lk.');

  // Current session cookies (Only present IF user has already registered/logged in!)
  const cookieUserId = request.cookies.get('aida_user_id')?.value;
  const activeRole = request.cookies.get('aida_active_role')?.value;
  const authUserId = request.cookies.get('aida_auth_user_id')?.value;

  const applySecurityHeaders = (res: NextResponse) => {
    // 1. Delete any legacy agentation cookie
    if (request.cookies.has('agentation')) {
      res.cookies.delete('agentation');
    }

    // 2. Security Headers (Defense-in-depth: CWE-693)
    res.headers.set('X-Content-Type-Options', 'nosniff');
    res.headers.set(
      'Content-Security-Policy',
      "frame-ancestors 'self' https://ayda-umnichka.vercel.app https://lk-ayda-umnichka.vercel.app https://*.vercel.app;"
    );
    res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.headers.set('X-XSS-Protection', '1; mode=block');
    res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.headers.set('Permissions-Policy', 'camera=(self), microphone=(self), display-capture=(self)');

    return res;
  };

  // ─────────────────────────────────────────────────────────
  // 0. LOGIN ROUTE REDIRECT (MAIN DOMAIN -> LK SUBDOMAIN)
  // ─────────────────────────────────────────────────────────
  if (pathname.startsWith('/login') && !isLkSubdomain && !host.includes('localhost') && !host.includes('127.0.0.1')) {
    const targetUrl = new URL(`https://lk-ayda-umnichka.vercel.app${pathname}${search}`);
    const response = NextResponse.redirect(targetUrl, 307);
    return applySecurityHeaders(response);
  }

  // ─────────────────────────────────────────────────────────
  // 1. ROOT PATH HANDLING
  // ─────────────────────────────────────────────────────────
  if (pathname === '/') {
    // On LK subdomain:
    // If authenticated user, forward to their assigned personal cabinet
    // If NOT authenticated, forward to /login (ID is only issued after registration!)
    if (isLkSubdomain) {
      const targetId = authUserId || cookieUserId;
      let effectiveRole = activeRole;
      if (!effectiveRole && targetId) {
        if (targetId.startsWith('admin_') || targetId === 'admin_head' || targetId === 'admin_session') {
          effectiveRole = 'admin';
        } else if (targetId.startsWith('teacher_') || targetId.startsWith('id17') || targetId.startsWith('id18')) {
          effectiveRole = 'teacher';
        } else {
          effectiveRole = 'student';
        }
      }

      if (targetId && effectiveRole) {
        const url = request.nextUrl.clone();
        if (effectiveRole === 'admin') {
          url.pathname = '/admin';
        } else if (effectiveRole === 'teacher') {
          url.pathname = '/teacher';
          url.searchParams.set('id', targetId);
        } else {
          url.pathname = `/${targetId}`;
        }
        const response = NextResponse.redirect(url);
        return applySecurityHeaders(response);
      }

      // Guest / unregistered: send to official login/registration page
      const loginUrl = new URL('/login', request.url);
      const response = NextResponse.redirect(loginUrl);
      return applySecurityHeaders(response);
    }

    // On main domain root, allow public landing
    const response = NextResponse.next();
    return applySecurityHeaders(response);
  }

  // ─────────────────────────────────────────────────────────
  // 2. RESTRICTED ROLE PAGES RBAC GUARD (CWE-306, CWE-285)
  // ─────────────────────────────────────────────────────────

  // Admin Portal: strictly for verified 'admin'
  if (pathname.startsWith('/admin')) {
    const isAdmin =
      activeRole === 'admin' &&
      (cookieUserId === 'admin_session' ||
        cookieUserId === 'admin_head' ||
        Boolean(cookieUserId && cookieUserId.startsWith('admin_')) ||
        Boolean(authUserId && authUserId.startsWith('admin_')));

    if (!isAdmin) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      loginUrl.searchParams.set('error', 'forbidden');
      const response = NextResponse.redirect(loginUrl);
      return applySecurityHeaders(response);
    }
  }

  // Teacher Portal: strictly for 'teacher' or 'admin'
  if (pathname.startsWith('/teacher')) {
    const isTeacher =
      activeRole === 'teacher' ||
      activeRole === 'admin' ||
      Boolean(
        cookieUserId &&
          (cookieUserId.startsWith('teacher_') ||
            cookieUserId.startsWith('id17') ||
            cookieUserId.startsWith('id18') ||
            cookieUserId.includes('teacher'))
      ) ||
      Boolean(
        authUserId &&
          (authUserId.startsWith('teacher_') ||
            authUserId.startsWith('id17') ||
            authUserId.startsWith('id18') ||
            authUserId.includes('teacher'))
      );

    if (!isTeacher) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname + search);
      loginUrl.searchParams.set('error', 'forbidden');
      const response = NextResponse.redirect(loginUrl);
      return applySecurityHeaders(response);
    }
  }

  // Generic /student: redirect to user's personal ID or require login
  if (pathname === '/student') {
    const targetId = authUserId || cookieUserId;
    if (targetId) {
      const url = request.nextUrl.clone();
      url.pathname = `/${targetId}`;
      const response = NextResponse.redirect(url);
      return applySecurityHeaders(response);
    }

    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', '/student');
    const response = NextResponse.redirect(loginUrl);
    return applySecurityHeaders(response);
  }

  // Messenger and Video Rooms: require authenticated role
  if (pathname.startsWith('/messenger') || pathname.startsWith('/room/')) {
    if (!activeRole) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname + search);
      loginUrl.searchParams.set('error', 'auth_required');
      const response = NextResponse.redirect(loginUrl);
      return applySecurityHeaders(response);
    }
  }

  // ─────────────────────────────────────────────────────────
  // 3. CABINET ID PROTECTION (IDOR / BOLA GUARD: CWE-639)
  // "если в строке ввел id кабинета то в него можно было войти только через наш вход в лк"
  // "свободный просмотр разрешается только для свежего временного гостевого ID, который принадлежит именно этому посетителю (по aida_user_id)"
  // ─────────────────────────────────────────────────────────
  const pathParts = pathname.split('/').filter(Boolean);
  if (pathParts.length === 1 && !SYSTEM_ROUTES.has(pathParts[0].toLowerCase())) {
    const requestedId = pathParts[0].toLowerCase();
    const rawCookieUser = cookieUserId ? decodeURIComponent(cookieUserId).toLowerCase() : '';
    const rawAuthUser = authUserId ? decodeURIComponent(authUserId).toLowerCase() : '';

    const isOwner =
      rawCookieUser === requestedId ||
      rawAuthUser === requestedId ||
      activeRole === 'teacher' ||
      activeRole === 'admin';

    // If caller has no credentials at all, prompt login
    // If caller has session credentials (e.g. UUID), pass to /[userId] page for DB verification to avoid false-positive redirect loops
    if (!isOwner && !rawCookieUser && !rawAuthUser) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', `/${requestedId}`);
      loginUrl.searchParams.set('cabinetId', requestedId);
      loginUrl.searchParams.set('auth_required', '1');
      const response = NextResponse.redirect(loginUrl);
      return applySecurityHeaders(response);
    }
  }

  const response = NextResponse.next();
  return applySecurityHeaders(response);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, images, logos, static image files
     */
    '/((?!api|_next/static|_next/image|images|favicon.ico|icon.png|logo.png|logo.svg|sw.js|manifest.json|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)',
  ],
};
