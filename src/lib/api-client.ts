import { getSupabase } from "@/lib/supabase";

/**
 * Клиентская обёртка fetch с автоматической передачей Bearer-токена Supabase Auth
 */
export async function fetchWithAuth(url: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers || {});

  try {
    const client = getSupabase();
    if (client) {
      // Таймаут 800мс, чтобы не зависать на мобильных устройствах при блокировке IndexedDB/localStorage
      const sessionPromise = client.auth.getSession();
      const timeoutPromise = new Promise<{ data: { session: null } }>((resolve) =>
        setTimeout(() => resolve({ data: { session: null } }), 800)
      );
      const { data } = await Promise.race([sessionPromise, timeoutPromise]);
      const token = data?.session?.access_token;
      if (token && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    }
  } catch (err) {
    // В случае сбоя чтения сессии запрос отправляется как есть
  }

  // Защита от вечных зависаний сети на мобильных устройствах: таймаут 9 секунд
  if (!init?.signal) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);
    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
        headers,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (e) {
      clearTimeout(timeoutId);
      throw e;
    }
  }

  return fetch(url, {
    ...init,
    headers,
  });
}
