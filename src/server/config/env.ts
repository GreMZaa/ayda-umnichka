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
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
  SMTP_PORT: Number(process.env.SMTP_PORT || 587),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_FROM: process.env.SMTP_FROM || process.env.SMTP_USER || '',
  SMTP_FROM_NAME: process.env.SMTP_FROM_NAME || 'АйДаУмничка',
};
