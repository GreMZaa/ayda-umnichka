/**
 * Utility to calculate the LK (Личный Кабинет) subdomain URL
 * For Vercel free deployment:
 * Main landing: https://[project].vercel.app
 * LK subdomain:  https://lk-[project].vercel.app
 */

export function getLkUrl(path: string = '/student'): string {
  if (typeof window === 'undefined') {
    return path;
  }

  // 1. If explicit env variable is set
  if (process.env.NEXT_PUBLIC_LK_URL) {
    const base = process.env.NEXT_PUBLIC_LK_URL.replace(/\/$/, '');
    return `${base}${path}`;
  }

  const { hostname, protocol, port } = window.location;

  // 2. Local development fallback
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return path;
  }

  // 3. Vercel deployment (e.g. aidaumnichka.vercel.app -> lk-aidaumnichka.vercel.app)
  if (hostname.endsWith('.vercel.app')) {
    if (hostname.startsWith('lk-')) {
      return `${protocol}//${hostname}${path}`;
    }
    return `${protocol}//lk-${hostname}${path}`;
  }

  // 4. Custom domain (e.g. umnichka.ru -> lk-umnichka.ru or lk.umnichka.ru)
  if (!hostname.startsWith('lk-') && !hostname.startsWith('lk.')) {
    return `${protocol}//lk-${hostname}${path}`;
  }

  return `${protocol}//${hostname}${path}`;
}
