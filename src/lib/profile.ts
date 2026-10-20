/**
 * Утилиты для безопасного парсинга и форматирования профилей пользователей
 */

export interface ParsedProfileBio {
  username?: string;
  grade?: string;
  school?: string;
  subjects?: string;
  experience?: string;
  education?: string;
  bio?: string;
  preferredContact?: string;
  [key: string]: any;
}

/**
 * Безопасно парсит поле bio, которое может быть как простой строкой, так и JSON-объектом
 */
export function parseProfileBio(raw: any): ParsedProfileBio {
  if (!raw) return {};
  if (typeof raw === "object" && raw !== null) return raw;

  const str = String(raw).trim();
  if (str.startsWith("{")) {
    try {
      const obj = JSON.parse(str);
      if (typeof obj === "object" && obj !== null) {
        return obj as ParsedProfileBio;
      }
    } catch {
      // Игнорируем ошибку и отдаем строку
    }
  }

  // Если это не JSON, трактуем как обычное био / класс
  return { bio: str, grade: str };
}

/**
 * Обновляет поля в существующем bio (если это был JSON, сохраняет все остальные поля; если нет - создает JSON)
 */
export function mergeProfileBio(currentRaw: any, updates: Partial<ParsedProfileBio>): string {
  const parsed = parseProfileBio(currentRaw);
  const merged = { ...parsed, ...updates };

  // Очищаем пустые строковые значения от мусора
  Object.keys(merged).forEach((k) => {
    if (merged[k] === undefined || merged[k] === null) {
      delete merged[k];
    }
  });

  return JSON.stringify(merged);
}
