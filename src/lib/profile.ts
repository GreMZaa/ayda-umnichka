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
  balance?: number;
  stars?: number;
  friendTeachers?: any[];
  friendStudents?: any[];
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

  // Очищаем пустые строковые значения от мусора, но сохраняем 0, false, массивы
  Object.keys(merged).forEach((k) => {
    if (merged[k] === undefined || merged[k] === null) {
      delete merged[k];
    }
  });

  return JSON.stringify(merged);
}

/**
 * Атомарное безопасное обновление bio в Supabase:
 * сначала читает актуальный профиль, мерджит поля (не затирая balance, stars, friends),
 * и записывает обратно в базу данных.
 */
export async function safeUpdateProfileBio(
  supabaseClient: any,
  userId: string,
  updates: Partial<ParsedProfileBio>
): Promise<{ success: boolean; mergedBio: ParsedProfileBio; error?: any }> {
  if (!supabaseClient || !userId) {
    return { success: false, mergedBio: updates as ParsedProfileBio, error: "No client or userId" };
  }

  try {
    const { data: profile, error: readError } = await supabaseClient
      .from("profiles")
      .select("bio")
      .eq("id", userId)
      .maybeSingle();

    if (readError) {
      console.warn("Could not read profile bio before update:", readError.message);
    }

    const currentBioRaw = profile?.bio || null;
    const mergedStr = mergeProfileBio(currentBioRaw, updates);
    const parsedMerged = parseProfileBio(mergedStr);

    const { error: writeError } = await supabaseClient
      .from("profiles")
      .update({
        bio: mergedStr,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (writeError) {
      return { success: false, mergedBio: parsedMerged, error: writeError };
    }

    return { success: true, mergedBio: parsedMerged };
  } catch (err) {
    return { success: false, mergedBio: updates as ParsedProfileBio, error: err };
  }
}

/**
 * Безопасное увеличение числового поля (balance, stars) в bio
 */
export async function incrementBioNumericField(
  supabaseClient: any,
  userId: string,
  field: "balance" | "stars",
  delta: number
): Promise<{ success: boolean; newValue: number }> {
  try {
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("bio")
      .eq("id", userId)
      .maybeSingle();

    const parsed = parseProfileBio(profile?.bio);
    const currentVal = typeof parsed[field] === "number" ? parsed[field] : 0;
    const nextVal = Math.max(0, currentVal + delta);

    await safeUpdateProfileBio(supabaseClient, userId, { [field]: nextVal });
    return { success: true, newValue: nextVal };
  } catch (err) {
    return { success: false, newValue: 0 };
  }
}
