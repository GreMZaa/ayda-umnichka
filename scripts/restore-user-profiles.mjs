/**
 * Restore auth users + profiles from user_bindings (and sync from old project if available).
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^([A-Z_]+)="([^"]*)"/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch (_) {}
}

loadEnvLocal();

const NEW_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const NEW_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OLD_URL = process.env.OLD_SUPABASE_URL || 'https://ljixwbcwhmqekrssbsqg.supabase.co';
const OLD_KEY =
  process.env.OLD_SUPABASE_SERVICE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqaXh3YmN3aG1xZWtyc3Nic3FnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjkxOTc3MiwiZXhwIjoyMTA4NDk1NzcyfQ.-hSXFXMxD-apJXoAuhblOEFicSkoxMyjL9LntAI0Qqk';

if (!NEW_URL || !NEW_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const newDb = createClient(NEW_URL, NEW_KEY, { auth: { persistSession: false } });
const oldDb = createClient(OLD_URL, OLD_KEY, { auth: { persistSession: false } });

function normalizeRole(role) {
  const r = String(role || 'student').trim().toLowerCase();
  if (r === 'teacher' || r === 'admin' || r === 'student') return r;
  return 'student';
}

async function listAuthUsers(client) {
  const users = [];
  let page = 1;
  while (true) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    users.push(...(data.users || []));
    if (!data.users?.length || data.users.length < 200) break;
    page += 1;
  }
  return users;
}

async function upsertProfile(authUserId, binding) {
  const role = normalizeRole(binding.role);
  const row = {
    id: authUserId,
    full_name: binding.full_name || 'Пользователь',
    role,
    phone: binding.phone || null,
    balance_lessons:
      typeof binding.balance_lessons === 'number' ? binding.balance_lessons : Number(binding.balance_lessons) || 0,
    public_id: binding.public_id,
    updated_at: new Date().toISOString(),
  };
  const { error } = await newDb.from('profiles').upsert(row, { onConflict: 'id' });
  if (error) {
    console.error(`  profile upsert ${binding.public_id}:`, error.message);
    return false;
  }
  return true;
}

async function linkBinding(binding, authUserId) {
  const { error } = await newDb
    .from('user_bindings')
    .update({
      auth_user_id: authUserId,
      is_registered: true,
      email: binding.email || undefined,
      updated_at: new Date().toISOString(),
    })
    .eq('public_id', binding.public_id);
  if (error) console.error(`  binding link ${binding.public_id}:`, error.message);
}

async function main() {
  const { data: bindings, error: bErr } = await newDb.from('user_bindings').select('*').order('created_at');
  if (bErr) throw bErr;

  console.log(`user_bindings on new project: ${bindings?.length || 0}`);

  const existingAuth = await listAuthUsers(newDb);
  const emailToAuthId = new Map();
  for (const u of existingAuth) {
    if (u.email) emailToAuthId.set(u.email.toLowerCase(), u.id);
  }
  console.log(`Existing auth users on new: ${existingAuth.length}`);

  const oldAuthByEmail = new Map();
  try {
    const oldUsers = await listAuthUsers(oldDb);
    for (const u of oldUsers) {
      if (u.email) oldAuthByEmail.set(u.email.toLowerCase(), u);
    }
    console.log(`Old auth users (reference): ${oldUsers.length}`);
  } catch (e) {
    console.warn('Old project unreachable, using bindings only');
  }

  let created = 0;
  let profilesOk = 0;

  for (const binding of bindings || []) {
    const email = binding.email?.trim().toLowerCase();
    if (!email) {
      console.warn(`Skip binding ${binding.public_id}: no email`);
      continue;
    }

    let authUserId = binding.auth_user_id || emailToAuthId.get(email);

    if (!authUserId) {
      const oldRef = oldAuthByEmail.get(email);
      const meta = oldRef?.user_metadata || {};
      const user_metadata = {
        public_id: binding.public_id,
        full_name: binding.full_name || meta.full_name || 'Пользователь',
        role: normalizeRole(binding.role || meta.role),
        balance_lessons: binding.balance_lessons ?? meta.balance_lessons ?? 0,
        phone: binding.phone || meta.phone || undefined,
      };

      const { data: createdUser, error: createErr } = await newDb.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata,
        password: `RestoreAida_${binding.public_id.replace(/[^a-z0-9]/gi, '')}_${Date.now().toString(36)}!7`,
      });

      if (createErr) {
        console.error(`Create auth failed ${email}:`, createErr.message);
        continue;
      }
      authUserId = createdUser.user?.id;
      if (!authUserId) continue;
      emailToAuthId.set(email, authUserId);
      created += 1;
      console.log(`Created auth: ${email} → ${authUserId}`);
    } else {
      console.log(`Reuse auth: ${email}`);
    }

    if (await upsertProfile(authUserId, binding)) {
      profilesOk += 1;
      console.log(`  profile OK: ${binding.public_id} (${binding.full_name})`);
    }
    await linkBinding(binding, authUserId);
  }

  console.log(`\nDone. Auth created: ${created}, profiles upserted: ${profilesOk}/${bindings?.length || 0}`);
  console.log('Users must use «Забыли пароль» or admin-set password to sign in (passwords were not copied from old DB).');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
