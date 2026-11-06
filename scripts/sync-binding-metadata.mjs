import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const raw = readFileSync('.env.local', 'utf8');
const url = raw.match(/NEXT_PUBLIC_SUPABASE_URL="([^"]+)"/)[1];
const key = raw.match(/SUPABASE_SERVICE_ROLE_KEY="([^"]+)"/)[1];
const newDb = createClient(url, key);
const oldDb = createClient(
  'https://ljixwbcwhmqekrssbsqg.supabase.co',
  process.env.OLD_SUPABASE_SERVICE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqaXh3YmN3aG1xZWtyc3Nic3FnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjkxOTc3MiwiZXhwIjoyMTA4NDk1NzcyfQ.-hSXFXMxD-apJXoAuhblOEFicSkoxMyjL9LntAI0Qqk'
);

const { data: oldB } = await oldDb.from('user_bindings').select('public_id,metadata,balance_lessons');
for (const o of oldB || []) {
  await newDb
    .from('user_bindings')
    .update({ metadata: o.metadata, balance_lessons: o.balance_lessons })
    .eq('public_id', o.public_id);
  if (o.public_id.startsWith('id')) {
    await newDb.from('profiles').update({ balance_lessons: o.balance_lessons }).eq('public_id', o.public_id);
  }
}
console.log('Synced metadata and balances for', oldB?.length, 'bindings');
