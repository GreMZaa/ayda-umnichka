/** Public site origins (safe for client + server via NEXT_PUBLIC_*). */

export const DEFAULT_MAIN_ORIGIN = 'https://ayda-um.vercel.app';
export const DEFAULT_LK_ORIGIN = 'https://lk-ayda-um.vercel.app';

export function getMainSiteOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_MAIN_ORIGIN).replace(/\/$/, '');
}

export function getLkOrigin(): string {
  return (process.env.NEXT_PUBLIC_LK_URL || DEFAULT_LK_ORIGIN).replace(/\/$/, '');
}

/** Hostnames allowed for password-reset and auth redirect targets (incl. .ru mirror). */
export function isAllowedAppHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h === '127.0.0.1') return true;
  if (h.endsWith('.vercel.app')) return true;
  if (h.includes('ayda-um') || h.includes('aidaumnichka')) return true;
  return false;
}

/** Map main site host to LK host when NEXT_PUBLIC_LK_URL is not set in the browser. */
export function lkHostForMainHost(hostname: string): string {
  const host = hostname.replace(/^www\./i, '');
  if (host.startsWith('lk-') || host.startsWith('lk.')) return host;
  if (host.endsWith('.vercel.app')) return `lk-${host}`;
  return `lk.${host}`;
}
