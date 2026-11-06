const SYNTHETIC_PHONE_DOMAIN = 'aidaumnichka.ru';

/** Простая проверка формата email (регистрация, не RFC-полный парсинг). */
const EMAIL_FORMAT =
  /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

export function normalizeEmailInput(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidRegistrationEmail(raw: string): boolean {
  const email = normalizeEmailInput(raw);
  if (!email.includes('@')) return false;
  if (!EMAIL_FORMAT.test(email)) return false;
  const domain = email.split('@')[1] || '';
  if (domain === SYNTHETIC_PHONE_DOMAIN) return false;
  return true;
}

export function registrationEmailErrorMessage(): string {
  return 'Регистрация только по email (например user@mail.ru). Номер телефона для регистрации не используется.';
}
