#!/usr/bin/env node
/**
 * Set SMTP env on Vercel (linked project, production).
 * Usage (PowerShell):
 *   cd E:\WEBBOT\PLATFORMA
 *   vercel link --project lk-ayda-um --yes
 *   $env:SMTP_USER='you@gmail.com'
 *   $env:SMTP_PASS='app-password-no-spaces'
 *   node scripts/set-vercel-smtp-env.mjs
 */
import { spawnSync } from 'node:child_process';

const user = process.env.SMTP_USER || '';
const pass = process.env.SMTP_PASS || '';
const fromName = process.env.SMTP_FROM_NAME || 'АйДаУмничка';

if (!user || !pass) {
  console.error('Set SMTP_USER and SMTP_PASS in the environment.');
  process.exit(1);
}

const pairs = [
  ['SMTP_HOST', 'smtp.gmail.com', false],
  ['SMTP_PORT', '587', false],
  ['SMTP_USER', user, false],
  ['SMTP_PASS', pass, true],
  ['SMTP_FROM', user, false],
  ['SMTP_FROM_NAME', fromName, false],
];

function run(args) {
  const r = spawnSync('vercel', args, { stdio: 'inherit', shell: true });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

for (const [key, value, sensitive] of pairs) {
  console.log(`Setting ${key} (production)...`);
  const args = ['env', 'add', key, 'production', '--value', value, '--force', '--yes'];
  if (sensitive) args.push('--sensitive');
  run(args);
}

console.log('Done. Redeploy: npm run deploy:lk');
