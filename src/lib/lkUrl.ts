import { DEFAULT_LK_ORIGIN, getLkOrigin, lkHostForMainHost } from '@/lib/publicOrigins';

/**
 * Calculates the LK (Личный Кабинет) URL.
 * Vercel: ayda-um.vercel.app → lk-ayda-um.vercel.app
 * Custom .ru: aidaumnichka.ru → lk.aidaumnichka.ru (or NEXT_PUBLIC_LK_URL)
 */

export function getLkUrl(path: string = ''): string {
  const cleanPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';

  if (typeof window !== 'undefined') {
    const configured = process.env.NEXT_PUBLIC_LK_URL?.replace(/\/$/, '');
    if (configured) {
      return `${configured}${cleanPath}`;
    }

    const { hostname, protocol } = window.location;

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${DEFAULT_LK_ORIGIN}${cleanPath}`;
    }

    if (hostname.startsWith('lk-') || hostname.startsWith('lk.')) {
      return `${protocol}//${hostname}${cleanPath}`;
    }

    const lkHost = lkHostForMainHost(hostname);
    return `${protocol}//${lkHost}${cleanPath}`;
  }

  return `${getLkOrigin()}${cleanPath}`;
}
