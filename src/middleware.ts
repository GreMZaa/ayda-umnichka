import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const { pathname } = request.nextUrl;

  // Check if request is coming to the LK subdomain (e.g. lk-ayda-umnichka.vercel.app or lk.example.ru)
  const isLkSubdomain = host.startsWith('lk-') || host.startsWith('lk.');

  if (isLkSubdomain) {
    // If user opens root of the LK subdomain
    if (pathname === '/') {
      const activeRole = request.cookies.get('aida_active_role')?.value;
      const url = request.nextUrl.clone();

      if (activeRole === 'teacher') {
        url.pathname = '/teacher';
      } else if (activeRole === 'admin') {
        url.pathname = '/admin';
      } else if (activeRole === 'student') {
        url.pathname = '/student';
      } else {
        // By default show the Login portal
        url.pathname = '/login';
      }

      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
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
