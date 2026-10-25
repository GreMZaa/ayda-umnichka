import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function generateRandomId(): string {
  const num = Math.floor(100000 + Math.random() * 900000);
  return `id${num}`;
}

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const { pathname } = request.nextUrl;

  // Check if request is coming to the LK subdomain (e.g. lk-ayda-umnichka.vercel.app or lk.example.ru)
  const isLkSubdomain = host.startsWith('lk-') || host.startsWith('lk.');

  // Check for pre-registration user ID
  let userId = request.cookies.get('aida_user_id')?.value;
  let shouldSetCookie = false;

  if (!userId) {
    userId = generateRandomId();
    shouldSetCookie = true;
  }

  // Check for agentation query parameter
  const agentationParam = request.nextUrl.searchParams.get('agentation');
  const hasAgentation = request.nextUrl.searchParams.has('agentation');
  const enableAgentation = agentationParam === '1' || agentationParam === 'true' || (hasAgentation && agentationParam !== '0' && agentationParam !== 'false');
  const disableAgentation = agentationParam === '0' || agentationParam === 'false';

  const applyCookies = (res: NextResponse) => {
    if (shouldSetCookie) {
      res.cookies.set('aida_user_id', userId, {
        path: '/',
        maxAge: 31536000,
        sameSite: 'lax',
      });
    }
    if (enableAgentation) {
      res.cookies.set('agentation', '1', {
        path: '/',
        maxAge: 2592000,
        sameSite: 'lax',
      });
    } else if (disableAgentation) {
      res.cookies.delete('agentation');
    }
  };

  // Handle root "/" on LK subdomain:
  // Immediately redirect to user's personal ID in the address bar (e.g. /id749210 or /s.sharonovv)
  if (isLkSubdomain && pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = `/${userId}`;
    const response = NextResponse.redirect(url);
    applyCookies(response);
    return response;
  }

  // If user navigates to generic "/student", forward to their personal ID URL
  if (pathname === '/student') {
    const url = request.nextUrl.clone();
    url.pathname = `/${userId}`;
    const response = NextResponse.redirect(url);
    applyCookies(response);
    return response;
  }

  // When visiting any dynamic /[userId], ensure the cookie is preserved
  const response = NextResponse.next();
  applyCookies(response);
  return response;
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
