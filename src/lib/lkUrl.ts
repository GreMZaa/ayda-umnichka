/**
 * Calculates the LK (Личный Кабинет) subdomain URL
 * Requirement:
 * In front of the main domain, prefix with 'lk-' on vercel.com:
 * e.g. aidaumnichka.vercel.app -> https://lk-aidaumnichka.vercel.app
 */

export function getLkUrl(path: string = ''): string {
  const cleanPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';

  if (typeof window !== 'undefined') {
    if (process.env.NEXT_PUBLIC_LK_URL) {
      const base = process.env.NEXT_PUBLIC_LK_URL.replace(/\/$/, '');
      return `${base}${cleanPath}`;
    }

    const { hostname, protocol } = window.location;

    // 1. If running locally on localhost
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `https://lk-ayda-umnichka.vercel.app${cleanPath}`;
    }

    // 2. If already on LK subdomain
    if (hostname.startsWith('lk-') || hostname.startsWith('lk.')) {
      return `${protocol}//${hostname}${cleanPath}`;
    }

    // 3. If currently on Vercel main domain (e.g. ayda-umnichka.vercel.app -> https://lk-ayda-umnichka.vercel.app)
    if (hostname.endsWith('.vercel.app')) {
      return `${protocol}//lk-${hostname}${cleanPath}`;
    }

    // 4. Custom domain (e.g. domain.ru -> lk-domain.ru)
    return `${protocol}//lk-${hostname}${cleanPath}`;
  }

  return `https://lk-ayda-umnichka.vercel.app${cleanPath}`;
}
