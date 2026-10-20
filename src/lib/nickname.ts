/**
 * Утилиты для работы с Telegram-style никнеймами (@username)
 */

export function cleanUsername(input?: string | null): string {
  if (!input) return "";
  return input
    .replace(/^@+/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_{2,}/g, "_")
    .slice(0, 30);
}

export function formatUsername(input?: string | null): string {
  const cleaned = cleanUsername(input);
  return cleaned ? `@${cleaned}` : "";
}

const TRANSLIT_MAP: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh",
  з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts",
  ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

export function resolveProfileUsername(profile: {
  id?: string;
  name?: string;
  email?: string;
  bio?: any;
}): string {
  // 1. Проверяем bio на наличие сохранённого username
  if (profile.bio) {
    try {
      const parsed =
        typeof profile.bio === "string" && profile.bio.startsWith("{")
          ? JSON.parse(profile.bio)
          : typeof profile.bio === "object"
          ? profile.bio
          : null;
      if (parsed?.username) {
        return cleanUsername(parsed.username);
      }
    } catch {}
  }

  // 2. Если есть email, берём часть до @
  if (profile.email) {
    const emailPrefix = profile.email.split("@")[0];
    const cleaned = cleanUsername(emailPrefix);
    if (cleaned.length >= 3) return cleaned;
  }

  // 3. Иначе транслитерируем имя
  if (profile.name) {
    const lower = profile.name.toLowerCase();
    let translit = "";
    for (const char of lower) {
      if (TRANSLIT_MAP[char] !== undefined) translit += TRANSLIT_MAP[char];
      else if (/[a-z0-9]/.test(char)) translit += char;
      else if (char === " " || char === "-") translit += "_";
    }
    const cleaned = cleanUsername(translit);
    if (cleaned.length >= 3) return cleaned;
  }

  // 4. Фоллбек по ID
  if (profile.id) {
    return `user_${profile.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toLowerCase()}`;
  }

  return "user";
}
