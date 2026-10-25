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
  'favicon.ico',
  'icon.png',
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
    res.headers.set('X-Frame-Options', 'DENY');
    res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.headers.set('X-XSS-Protection', '1; mode=block');

    return res;
  };

  // ─────────────────────────────────────────────────────────
  // 1. ROOT PATH HANDLING
  // ─────────────────────────────────────────────────────────
  if (pathname === '/') {
    // On LK subdomain:
    // If authenticated student, forward to their assigned personal ID
    // If NOT authenticated, forward to /login (ID is only issued after registration!)
    if (isLkSubdomain) {
      const targetId = authUserId || cookieUserId;
      if (targetId && activeRole) {
        const url = request.nextUrl.clone();
        url.pathname = `/${targetId}`;
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
    if (activeRole !== 'admin') {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      loginUrl.searchParams.set('error', 'forbidden');
      const response = NextResponse.redirect(loginUrl);
      return applySecurityHeaders(response);
    }
  }

  // Teacher Portal: strictly for 'teacher' or 'admin'
  if (pathname.startsWith('/teacher')) {
    if (activeRole !== 'teacher' && activeRole !== 'admin') {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
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
    const isOwner =
      cookieUserId?.toLowerCase() === requestedId ||
      authUserId?.toLowerCase() === requestedId ||
      activeRole === 'admin';

    // If caller does not own this cabinet ID or is not authenticated:
    // Require logging in or registering through our official login page!
    if (!isOwner) {
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
     * - favicon.ico, images, logos
     */
    '/((?!api|_next/static|_next/image|images|favicon.ico|logo.svg).*)',
  ],
};
