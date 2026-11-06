/** Full name: exactly three words, Cyrillic/Latin letters and hyphens only. */
const FIO_THREE_WORDS =
  /^[А-Яа-яA-Za-zЁё](?:[А-Яа-яA-Za-zЁё\-]*[А-Яа-яA-Za-zЁё])?(?:\s+[А-Яа-яA-Za-zЁё](?:[А-Яа-яA-Za-zЁё\-]*[А-Яа-яA-Za-zЁё])?){2}$/;

export function normalizeFioSpaces(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function isValidFioThreeWords(value: string): boolean {
  const normalized = normalizeFioSpaces(value);
  if (!normalized) return false;
  return FIO_THREE_WORDS.test(normalized);
}

export function sanitizeFioInput(value: string): string {
  return value.replace(/[^А-Яа-яA-Za-zЁё \-]/g, '');
}

export function fioValidationMessage(fieldLabel: string): string {
  return `${fieldLabel}: укажите полное ФИО — ровно три слова (Фамилия Имя Отчество), только буквы и дефис`;
}

export function validateFioField(value: string, fieldLabel: string): string | null {
  if (!isValidFioThreeWords(value)) {
    return fioValidationMessage(fieldLabel);
  }
  return null;
}
