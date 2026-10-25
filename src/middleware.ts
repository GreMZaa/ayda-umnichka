import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const { pathname } = request.nextUrl;

  // Check if request is coming to the LK subdomain (e.g. lk-aidaumnichka.vercel.app or lk.example.ru)
  const isLkSubdomain = host.startsWith('lk-') || host.startsWith('lk.');

  if (isLkSubdomain) {
    // If user opens root of the LK subdomain, rewrite/redirect to /student dashboard
    if (pathname === '/') {
      const url = request.nextUrl.clone();
      url.pathname = '/student';
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
