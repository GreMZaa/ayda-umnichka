import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const raw = readFileSync('.env.local', 'utf8');
const url = raw.match(/NEXT_PUBLIC_SUPABASE_URL="([^"]+)"/)[1];
const key = raw.match(/SUPABASE_SERVICE_ROLE_KEY="([^"]+)"/)[1];
const db = createClient(url, key, { auth: { persistSession: false } });

const { data: b } = await db.from('user_bindings').select('public_id,full_name,email,auth_user_id,role');
console.log('bindings:', b);
const { data: p } = await db.from('profiles').select('public_id,full_name,role,balance_lessons');
console.log('profiles:', p);
const { data: auth } = await db.auth.admin.listUsers({ perPage: 100 });
console.log(
  'auth:',
  auth.users.map((u) => ({ email: u.email, id: u.id }))
);
