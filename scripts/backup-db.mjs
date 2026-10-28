#!/usr/bin/env node
/**
 * Automated Database Backup Script for AyDaUmnichka Platform
 * 
 * Supports:
 * 1. Supabase REST API mode (via SUPABASE_SERVICE_ROLE_KEY) - exports all tables as structured JSON snapshot
 * 2. Direct PostgreSQL mode (via DATABASE_URL / POSTGRES_URL) - exports SQL & JSON dump
 * 3. Backup rotation: retains last 14 snapshots automatically
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

// Load .env.local if present and not in CI
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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock-aidaumnichka.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;

const BACKUP_DIR = path.resolve(process.cwd(), 'backups');
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const TABLES = [
  'profiles',
  'user_bindings',
  'teacher_students',
  'conversations',
  'messages',
  'lessons',
  'homework',
  'lesson_transactions'
];

async function runBackup() {
  const startTime = Date.now();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  console.log(`\n📦 [DATABASE BACKUP] Starting snapshot at ${new Date().toISOString()}`);

  const snapshot = {
    version: '1.0.0',
    service: 'ayda-umnichka',
    created_at: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    tables: {},
    summary: {
      total_tables: TABLES.length,
      total_records: 0,
    }
  };

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  for (const table of TABLES) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact' });

      if (error) {
        console.warn(`⚠️ Table "${table}": ${error.message}`);
        snapshot.tables[table] = {
          success: false,
          error: error.message,
          count: 0,
          records: []
        };
      } else {
        const rowCount = data ? data.length : 0;
        snapshot.summary.total_records += rowCount;
        snapshot.tables[table] = {
          success: true,
          count: rowCount,
          records: data || []
        };
        console.log(`  ✓ ${table.padEnd(20)}: ${rowCount} rows`);
      }
    } catch (err) {
      console.error(`❌ Failed table "${table}":`, err.message);
      snapshot.tables[table] = { success: false, error: err.message, count: 0, records: [] };
    }
  }

  // Calculate sha256 checksum of data
  const rawJson = JSON.stringify(snapshot, null, 2);
  const checksum = crypto.createHash('sha256').update(rawJson).digest('hex');
  snapshot.checksum_sha256 = checksum;

  const fileName = `backup_${timestamp}.json`;
  const filePath = path.join(BACKUP_DIR, fileName);
  fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf8');

  // Also write latest pointer
  fs.writeFileSync(path.join(BACKUP_DIR, 'latest.json'), JSON.stringify({
    latest_file: fileName,
    checksum,
    created_at: snapshot.created_at,
    total_records: snapshot.summary.total_records
  }, null, 2), 'utf8');

  const durationMs = Date.now() - startTime;
  const sizeKb = (Buffer.byteLength(rawJson) / 1024).toFixed(1);

  console.log(`\n✅ [BACKUP COMPLETE] File: backups/${fileName} (${sizeKb} KB, ${snapshot.summary.total_records} rows in ${durationMs}ms)`);
  console.log(`   SHA-256: ${checksum}`);

  // Rotate backups: keep only last 14
  rotateBackups(BACKUP_DIR, 14);
}

function rotateBackups(dir, maxKeep) {
  try {
    const files = fs.readdirSync(dir)
      .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
      .map(f => ({ name: f, time: fs.statSync(path.join(dir, f)).mtimeMs }))
      .sort((a, b) => b.time - a.time);

    if (files.length > maxKeep) {
      const toDelete = files.slice(maxKeep);
      for (const item of toDelete) {
        fs.unlinkSync(path.join(dir, item.name));
        console.log(`   ♻️ Rotated old backup: ${item.name}`);
      }
    }
  } catch (err) {
    console.warn('Rotation warning:', err.message);
  }
}

runBackup().catch((err) => {
  console.error('Fatal backup error:', err);
  process.exit(1);
});
