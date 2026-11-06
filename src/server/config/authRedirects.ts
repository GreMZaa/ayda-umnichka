import { getLkOrigin, isAllowedAppHostname } from '@/lib/publicOrigins';

/** Canonical LK URL for auth redirects in emails (never localhost). */
export const PRODUCTION_LK_ORIGIN = getLkOrigin();

export const PRODUCTION_RESET_PASSWORD_URL = `${PRODUCTION_LK_ORIGIN}/login/reset-password`;

/** Force recovery verify links to redirect to production LK after Supabase auth. */
export function normalizeRecoveryActionLink(actionLink: string, redirectTo: string): string {
  try {
    const url = new URL(actionLink);
    url.searchParams.set('redirect_to', redirectTo);
    return url.toString();
  } catch {
    const encoded = encodeURIComponent(redirectTo);
    if (/redirect_to=[^&]*/.test(actionLink)) {
      return actionLink.replace(/redirect_to=[^&]*/, `redirect_to=${encoded}`);
    }
    const sep = actionLink.includes('?') ? '&' : '?';
    return `${actionLink}${sep}redirect_to=${encoded}`;
  }
}

export function resolvePasswordResetRedirect(clientRedirect?: string): string {
  if (!clientRedirect) return PRODUCTION_RESET_PASSWORD_URL;
  try {
    const u = new URL(clientRedirect);
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') {
      return PRODUCTION_RESET_PASSWORD_URL;
    }
    if (!u.pathname.startsWith('/login/reset-password')) {
      return PRODUCTION_RESET_PASSWORD_URL;
    }
    if (!isAllowedAppHostname(u.hostname)) {
      return PRODUCTION_RESET_PASSWORD_URL;
    }
    return u.toString();
  } catch {
    return PRODUCTION_RESET_PASSWORD_URL;
  }
}
