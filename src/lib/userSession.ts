/**
 * Utility to manage user IDs issued strictly AFTER registration
 * Default: id[6 random digits], e.g. "id749210"
 * Custom slug: e.g. "ivan.ivanov"
 */

export const COOKIE_USER_ID = 'aida_user_id';
export const STORAGE_USER_ID = 'aida_user_id';
export const STORAGE_CUSTOM_SLUG = 'aida_custom_slug';

/**
 * Generates a unique user ID of format "idXXXXXX"
 */
export function generateNewUserId(): string {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `id${randomNum}`;
}

/**
 * Returns the currently authenticated user's ID, or null if unregistered/guest
 */
export function getClientUserId(): string | null {
  if (typeof window === 'undefined') return null;

  // 1. Check custom slug first
  const customSlug = localStorage.getItem(STORAGE_CUSTOM_SLUG);
  if (customSlug) return customSlug;

  // 2. Check verified auth user id
  const authUserId = localStorage.getItem('aida_auth_user_id');
  if (authUserId) return authUserId;

  // 3. Check localStorage
  const userId = localStorage.getItem(STORAGE_USER_ID);
  if (userId) return userId;

  // 4. Check cookies
  const cookieMatch = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_USER_ID}=([^;]*)`));
  if (cookieMatch && cookieMatch[1]) {
    return decodeURIComponent(cookieMatch[1]);
  }

  // An unregistered visitor has NO ID issued
  return null;
}

/**
 * Saves authenticated client user ID to localStorage and cookies
 */
export function setClientUserId(userId: string) {
  if (typeof window === 'undefined') return;

  const cleanId = userId.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
  if (!cleanId) return;

  localStorage.setItem(STORAGE_USER_ID, cleanId);
  localStorage.setItem('aida_auth_user_id', cleanId);
  document.cookie = `${COOKIE_USER_ID}=${encodeURIComponent(cleanId)}; path=/; max-age=31536000; SameSite=Lax`;
  document.cookie = `aida_auth_user_id=${encodeURIComponent(cleanId)}; path=/; max-age=31536000; SameSite=Lax`;
}

/**
 * Issues a brand new ID immediately upon user registration
 */
export function issueNewUserId(): string {
  const newId = generateNewUserId();
  setClientUserId(newId);
  return newId;
}

/**
 * Save custom vanity slug (e.g. ivan.ivanov)
 */
export function setCustomSlug(slug: string): string {
  if (typeof window === 'undefined') return slug;

  const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
  if (!cleanSlug) return '';

  localStorage.setItem(STORAGE_CUSTOM_SLUG, cleanSlug);
  setClientUserId(cleanSlug);
  return cleanSlug;
}

/**
 * Register or sync user ID in Supabase
 */
export async function syncUserWithSupabase(publicId: string, fullName: string) {
  try {
    const res = await fetch('/api/user/bind', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        publicId,
        fullName,
        isRegistered: false,
      }),
    });
    return await res.json();
  } catch (err) {
    console.warn('Could not sync user in Supabase:', err);
    return { error: 'Failed to sync in Supabase' };
  }
}

/**
 * Rename or update custom slug in Supabase
 */
export async function updateSlugInSupabase(oldPublicId: string, newPublicId: string) {
  try {
    const res = await fetch('/api/user/bind', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        oldPublicId,
        newPublicId,
      }),
    });
    return await res.json();
  } catch (err) {
    console.warn('Could not update slug in Supabase:', err);
    return { error: 'Failed to update in Supabase' };
  }
}

/**
 * Bind registered Supabase auth user with their unique public ID
 */
export async function bindAuthUserWithSupabase(params: {
  publicId: string;
  authUserId: string;
  fullName: string;
  email?: string;
  phone?: string;
  role?: string;
}) {
  try {
    const res = await fetch('/api/user/bind', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...params,
        isRegistered: true,
      }),
    });
    return await res.json();
  } catch (err) {
    console.warn('Could not bind auth user in Supabase:', err);
    return { error: 'Failed to bind in Supabase' };
  }
}
