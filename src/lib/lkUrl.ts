/**
 * Calculates the LK (Личный Кабинет) subdomain URL
 * Requirement:
 * In front of the main domain, prefix with 'lk-' on vercel.com:
 * e.g. aidaumnichka.vercel.app -> https://lk-aidaumnichka.vercel.app
 */

export function getLkUrl(path: string = ''): string {
  if (typeof window !== 'undefined') {
    if (process.env.NEXT_PUBLIC_LK_URL) {
      const base = process.env.NEXT_PUBLIC_LK_URL.replace(/\/$/, '');
      return `${base}${path}`;
    }

    const { hostname, protocol } = window.location;

    // 1. If currently on Vercel (e.g. aidaumnichka.vercel.app)
    if (hostname.endsWith('.vercel.app')) {
      if (hostname.startsWith('lk-')) {
        return `${protocol}//${hostname}${path}`;
      }
      return `${protocol}//lk-${hostname}${path}`;
    }

    // 2. If running locally on localhost, point to the vercel lk- subdomain
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `https://lk-ayda-umnichka.vercel.app${path}`;
    }

    // 3. If on custom domain (e.g. domain.ru -> lk-domain.ru)
    if (!hostname.startsWith('lk-') && !hostname.startsWith('lk.')) {
      return `${protocol}//lk-${hostname}${path}`;
    }

    return `${protocol}//${hostname}${path}`;
  }

  return `https://lk-ayda-umnichka.vercel.app${path}`;
}
