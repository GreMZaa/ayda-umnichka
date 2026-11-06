/**
 * Copy platform data old → new Supabase. Recreates auth users by email on new project.
 */
import { createClient } from '@supabase/supabase-js';

const OLD_URL = process.env.OLD_SUPABASE_URL;
const OLD_KEY = process.env.OLD_SUPABASE_SERVICE_KEY;
const NEW_URL = process.env.NEW_SUPABASE_URL;
const NEW_KEY = process.env.NEW_SUPABASE_SERVICE_KEY;

if (!OLD_URL || !OLD_KEY || !NEW_URL || !NEW_KEY) {
  console.error('Missing env vars');
  process.exit(1);
}

const oldDb = createClient(OLD_URL, OLD_KEY, { auth: { persistSession: false } });
const newDb = createClient(NEW_URL, NEW_KEY, { auth: { persistSession: false } });

async function listAllAuthUsers(client) {
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

async function migrateAuthUsers() {
  const oldUsers = await listAllAuthUsers(oldDb);
  const emailToNewId = new Map();
  console.log(`Auth users on old: ${oldUsers.length}`);

  for (const u of oldUsers) {
    if (!u.email) continue;
    const meta = u.user_metadata || {};
    const { data: created, error } = await newDb.auth.admin.createUser({
      email: u.email,
      password: `TempAida_${Math.random().toString(36).slice(2, 10)}!9`,
      email_confirm: true,
      user_metadata: meta,
    });
    if (error) {
      if (error.message?.includes('already been registered') || error.message?.includes('already exists')) {
        const { data: listed } = await newDb.auth.admin.listUsers({ page: 1, perPage: 200 });
        const found = listed?.users?.find((x) => x.email?.toLowerCase() === u.email.toLowerCase());
        if (found) emailToNewId.set(u.email.toLowerCase(), found.id);
      } else {
        console.warn(`Auth skip ${u.email}:`, error.message);
      }
    } else if (created.user) {
      emailToNewId.set(u.email.toLowerCase(), created.user.id);
    }
  }
  console.log(`Mapped auth users: ${emailToNewId.size}`);
  return emailToNewId;
}

async function copyBindings(emailToNewId) {
  const { data, error } = await oldDb.from('user_bindings').select('*');
  if (error) throw error;
  if (!data?.length) {
    console.log('user_bindings: 0');
    return;
  }
  const rows = data.map((row) => {
    const email = row.email?.toLowerCase();
    const newAuthId = email && emailToNewId.has(email) ? emailToNewId.get(email) : null;
    return { ...row, auth_user_id: newAuthId };
  });
  const { error: insErr } = await newDb.from('user_bindings').upsert(rows, { onConflict: 'public_id' });
  if (insErr) console.error('user_bindings:', insErr.message);
  else console.log(`user_bindings: ${rows.length} rows`);
}

async function copyTable(name, onConflict = 'id') {
  const { data, error } = await oldDb.from(name).select('*');
  if (error) {
    console.warn(`Skip ${name}:`, error.message);
    return;
  }
  if (!data?.length) {
    console.log(`${name}: 0`);
    return;
  }
  const { error: insErr } = await newDb.from(name).upsert(data, { onConflict });
  if (insErr) console.error(`${name}:`, insErr.message);
  else console.log(`${name}: ${data.length} rows`);
}

const emailMap = await migrateAuthUsers();
await copyBindings(emailMap);
await copyTable('teacher_students');
await copyTable('homework');
await copyTable('lessons');
await copyTable('conversations');
await copyTable('messages');

console.log('Migration finished. Users got new temp passwords unless they use password reset.');
