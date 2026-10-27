import { createClient } from '@supabase/supabase-js';
import { env } from './env';

// Public/Anon client
export const supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

// Server-side service-role client (for API queries bypassing RLS when appropriate)
export const supabaseServer = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Admin client specifically configured for user management
export const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
