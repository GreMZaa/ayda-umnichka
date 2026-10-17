import { getSupabase } from "@/lib/supabase";

/**
 * Клиентская обёртка fetch с автоматической передачей Bearer-токена Supabase Auth
 */
export async function fetchWithAuth(url: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers || {});

  try {
    const client = getSupabase();
    if (client) {
      const { data } = await client.auth.getSession();
      const token = data?.session?.access_token;
      if (token && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    }
  } catch (err) {
    // В случае сбоя чтения сессии запрос отправляется как есть
  }

  return fetch(url, {
    ...init,
    headers,
  });
}
