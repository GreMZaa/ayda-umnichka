import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const PROD_SUPABASE_URL = "https://vvxtprfawnpmmtnpsavq.supabase.co";
export const PROD_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2eHRwcmZhd25wbW10bnBzYXZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyMjQ3NTUsImV4cCI6MjEwNzgwMDc1NX0.RCiNDYVaLpWIWnQmo68QdPzLDmrLxQ1XXFgOh2X-Q5g";

function cleanAscii(str: string | undefined | null): string {
  if (!str) return "";
  return str.replace(/[^\x20-\x7E]/g, "").trim();
}

// Очистка поврежденных данных в браузере с не-ASCII символами
if (typeof window !== "undefined") {
  try {
    const rawKey = localStorage.getItem("umnichka_supabase_anon_key") || "";
    if (rawKey && (/[^\x20-\x7E]/.test(rawKey) || !rawKey.startsWith("ey"))) {
      localStorage.removeItem("umnichka_supabase_anon_key");
      localStorage.removeItem("umnichka_supabase_url");
    }
  } catch {
    // ignore
  }
}

let clientInstance: SupabaseClient | null = null;

export const getSupabaseConfig = () => {
  const envUrl = cleanAscii(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const envKey = cleanAscii(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (envUrl && envKey && envKey.startsWith("ey")) {
    return { url: envUrl, key: envKey, source: "env" as const };
  }

  if (typeof window !== "undefined") {
    try {
      const localUrl = cleanAscii(localStorage.getItem("umnichka_supabase_url") || "");
      const localKey = cleanAscii(localStorage.getItem("umnichka_supabase_anon_key") || "");
      if (localUrl && localKey && localKey.startsWith("ey")) {
        return { url: localUrl, key: localKey, source: "local" as const };
      }
    } catch {
      // ignore
    }
  }

  return {
    url: PROD_SUPABASE_URL,
    key: PROD_SUPABASE_ANON_KEY,
    source: "env" as const,
  };
};

export const getSupabase = (): SupabaseClient => {
  if (!clientInstance) {
    const config = getSupabaseConfig();
    clientInstance = createClient(config.url, config.key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return clientInstance;
};

export const setCustomSupabaseConfig = (url: string, key: string) => {
  if (typeof window !== "undefined") {
    const cleanedUrl = cleanAscii(url);
    const cleanedKey = cleanAscii(key);
    if (cleanedUrl && cleanedKey && cleanedKey.startsWith("ey")) {
      localStorage.setItem("umnichka_supabase_url", cleanedUrl);
      localStorage.setItem("umnichka_supabase_anon_key", cleanedKey);
      clientInstance = createClient(cleanedUrl, cleanedKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
    } else {
      localStorage.removeItem("umnichka_supabase_url");
      localStorage.removeItem("umnichka_supabase_anon_key");
      clientInstance = createClient(PROD_SUPABASE_URL, PROD_SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
    }
  }
};

export const isSupabaseConfigured = true;

export const supabase = getSupabase();
