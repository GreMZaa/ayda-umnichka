export const env = {
  SUPABASE_URL:
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock-aidaumnichka.supabase.co',
  SUPABASE_ANON_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-anon-key-aidaumnichka',
  SUPABASE_SERVICE_ROLE_KEY:
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'mock-key',
  ADMIN_SECRET_KEY: process.env.ADMIN_SECRET_KEY || 'admin_secret',
  isSupabaseConfigured: Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ),
};
