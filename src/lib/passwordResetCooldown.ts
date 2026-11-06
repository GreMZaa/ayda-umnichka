/** Must match Supabase auth.email.max_frequency (see supabase/config.toml). */
export const PASSWORD_RESET_COOLDOWN_MS = 5 * 60 * 1000;

const STORAGE_KEY = 'ayda_lk_password_reset_cooldown';

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function getPasswordResetCooldownRemainingMs(emailRaw: string): number {
  if (typeof window === 'undefined') return 0;
  const email = normalizeEmail(emailRaw);
  if (!email) return 0;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { email?: string; until?: number };
    if (parsed.email !== email || typeof parsed.until !== 'number') return 0;
    return Math.max(0, parsed.until - Date.now());
  } catch {
    return 0;
  }
}

export function markPasswordResetSent(emailRaw: string): void {
  if (typeof window === 'undefined') return;
  const email = normalizeEmail(emailRaw);
  if (!email) return;
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ email, until: Date.now() + PASSWORD_RESET_COOLDOWN_MS })
  );
}

export function formatCooldownRu(remainingMs: number): string {
  const totalSec = Math.ceil(remainingMs / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min > 0 && sec > 0) return `${min} мин ${sec} сек`;
  if (min > 0) return `${min} мин`;
  return `${sec} сек`;
}

export function mapPasswordResetEmailError(message: string | undefined): string {
  const m = (message || '').toLowerCase();
  if (m.includes('rate limit') || m.includes('over_email_send')) {
    return 'Письма отправляются не чаще одного раза в 5 минут. Подождите и попробуйте снова.';
  }
  if (m.includes('email address not authorized')) {
    return 'Этот адрес не может получить письмо. Проверьте email или обратитесь к администратору.';
  }
  return message || 'Не удалось отправить письмо';
}
