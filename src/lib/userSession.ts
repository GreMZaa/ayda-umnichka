/**
 * Utility to manage pre-registration and persistent user IDs
 * Format:
 * Default: id[6 random digits], e.g. "id749210"
 * Custom slug: e.g. "s.sharonovv" (like in VK)
 */

export const COOKIE_USER_ID = 'aida_user_id';
export const STORAGE_USER_ID = 'aida_user_id';
export const STORAGE_CUSTOM_SLUG = 'aida_custom_slug';

export function generatePreRegistrationId(): string {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `id${randomNum}`;
}

export function getClientUserId(): string {
  if (typeof window === 'undefined') return 'id000000';

  // 1. Check custom slug first
  const customSlug = localStorage.getItem(STORAGE_CUSTOM_SLUG);
  if (customSlug) return customSlug;

  // 2. Check localStorage
  let userId = localStorage.getItem(STORAGE_USER_ID);
  if (userId) return userId;

  // 3. Check cookies
  const cookieMatch = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_USER_ID}=([^;]*)`));
  if (cookieMatch && cookieMatch[1]) {
    userId = decodeURIComponent(cookieMatch[1]);
    localStorage.setItem(STORAGE_USER_ID, userId);
    return userId;
  }

  // 4. Generate new pre-registration ID
  userId = generatePreRegistrationId();
  setClientUserId(userId);
  return userId;
}

export function setClientUserId(userId: string) {
  if (typeof window === 'undefined') return;

  const cleanId = userId.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
  if (!cleanId) return;

  localStorage.setItem(STORAGE_USER_ID, cleanId);
  document.cookie = `${COOKIE_USER_ID}=${encodeURIComponent(cleanId)}; path=/; max-age=31536000; SameSite=Lax`;
}

export function setCustomSlug(slug: string): string {
  if (typeof window === 'undefined') return slug;

  const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
  if (!cleanSlug) return '';

  localStorage.setItem(STORAGE_CUSTOM_SLUG, cleanSlug);
  setClientUserId(cleanSlug);
  return cleanSlug;
}
