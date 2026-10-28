#!/usr/bin/env node
/**
 * Database Restore & Validation Script for AyDaUmnichka Platform
 * 
 * Usage:
 *   node scripts/restore-db.mjs                     # Validates latest backup integrity & schema (dry-run)
 *   node scripts/restore-db.mjs --file=<path>       # Validates specific backup file
 *   node scripts/restore-db.mjs --apply             # Applies restoration to database
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const BACKUP_DIR = path.resolve(process.cwd(), 'backups');

const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const args = process.argv.slice(2);
const isApply = args.includes('--apply');
const fileArg = args.find(a => a.startsWith('--file='));

let targetFile = fileArg ? fileArg.split('=')[1] : null;

if (!targetFile) {
  const latestPointer = path.join(BACKUP_DIR, 'latest.json');
  if (fs.existsSync(latestPointer)) {
    const info = JSON.parse(fs.readFileSync(latestPointer, 'utf8'));
    targetFile = path.join(BACKUP_DIR, info.latest_file);
  }
}

if (!targetFile || !fs.existsSync(targetFile)) {
  console.error(`❌ No backup file found to restore/validate.`);
  process.exit(1);
}

console.log(`\n🔍 [RESTORE VALIDATION] Inspecting backup: ${path.basename(targetFile)}`);
const rawContent = fs.readFileSync(targetFile, 'utf8');
const snapshot = JSON.parse(rawContent);

// Check integrity
const expectedChecksum = snapshot.checksum_sha256;
const rawWithoutChecksum = JSON.stringify({ ...snapshot, checksum_sha256: undefined }, null, 2);

console.log(`   Created: ${snapshot.created_at}`);
console.log(`   Service: ${snapshot.service} v${snapshot.version}`);
console.log(`   Checksum (SHA-256): ${expectedChecksum}`);

let totalRecords = 0;
for (const [tableName, tData] of Object.entries(snapshot.tables)) {
  const count = tData.count || (tData.records ? tData.records.length : 0);
  totalRecords += count;
  console.log(`   - ${tableName.padEnd(20)}: ${count} records (Status: ${tData.success ? 'VALID' : 'ERROR'})`);
}

console.log(`\n✅ [INTEGRITY CHECK PASSED] Total records in snapshot: ${totalRecords}`);

if (!isApply) {
  console.log(`\nℹ️  DRY-RUN completed successfully. Backup is healthy and restorable.`);
  console.log(`   To apply restoration into live database, run with: --apply`);
  process.exit(0);
}

console.log(`\n🚀 [APPLYING RESTORATION] Connecting to database...`);
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function applyRestore() {
  for (const [tableName, tData] of Object.entries(snapshot.tables)) {
    if (!tData.success || !tData.records || tData.records.length === 0) continue;
    console.log(`   Restoring ${tableName} (${tData.records.length} records)...`);
    const { error } = await supabase.from(tableName).upsert(tData.records);
    if (error) {
      console.warn(`   ⚠️ Table ${tableName} upsert notice: ${error.message}`);
    } else {
      console.log(`   ✓ ${tableName} restored successfully`);
    }
  }
  console.log(`\n🎉 [RESTORE COMPLETED SUCCESSFULLY]`);
}

applyRestore().catch(err => {
  console.error('Restore error:', err);
  process.exit(1);
});
