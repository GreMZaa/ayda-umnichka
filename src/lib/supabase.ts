import { createClient, SupabaseClient } from "@supabase/supabase-js";

let clientInstance: SupabaseClient | null = null;

export const getSupabaseConfig = () => {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  if (envUrl && envKey) {
    return { url: envUrl, key: envKey, source: "env" as const };
  }

  if (typeof window !== "undefined") {
    const localUrl = localStorage.getItem("umnichka_supabase_url") || "";
    const localKey = localStorage.getItem("umnichka_supabase_anon_key") || "";
    if (localUrl && localKey) {
      return { url: localUrl, key: localKey, source: "local" as const };
    }
  }

  return { url: "", key: "", source: "none" as const };
};

export const getSupabase = (): SupabaseClient | null => {
  const config = getSupabaseConfig();
  if (!config.url || !config.key) {
    return null;
  }
  if (!clientInstance) {
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
    if (url && key) {
      localStorage.setItem("umnichka_supabase_url", url);
      localStorage.setItem("umnichka_supabase_anon_key", key);
      clientInstance = createClient(url, key, {
        auth: { persistSession: true, autoRefreshToken: true },
      });
    } else {
      localStorage.removeItem("umnichka_supabase_url");
      localStorage.removeItem("umnichka_supabase_anon_key");
      clientInstance = null;
    }
  }
};

export const isSupabaseConfigured = Boolean(
  (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
    (typeof window !== "undefined" &&
      localStorage.getItem("umnichka_supabase_url") &&
      localStorage.getItem("umnichka_supabase_anon_key"))
);

export const supabase = getSupabase();
