#!/usr/bin/env node
/**
 * Set NEXT_PUBLIC_SITE_URL / NEXT_PUBLIC_LK_URL on both Vercel projects (production).
 *
 * Edit origins below, then for each project:
 *   vercel link --project ayda-um --yes
 *   node scripts/set-vercel-public-urls.mjs ayda-um
 *   vercel link --project lk-ayda-um --yes
 *   node scripts/set-vercel-public-urls.mjs lk-ayda-um
 */
import { spawnSync } from 'node:child_process';

const MAIN_ORIGIN = process.env.MAIN_ORIGIN || 'https://aidaumnichka.ru';
const LK_ORIGIN = process.env.LK_ORIGIN || 'https://lk.aidaumnichka.ru';
const project = process.argv[2];

if (!project) {
  console.error('Usage: node scripts/set-vercel-public-urls.mjs <vercel-project-name>');
  process.exit(1);
}

function run(args) {
  const r = spawnSync('vercel', args, { stdio: 'inherit', shell: true });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

for (const [key, value] of [
  ['NEXT_PUBLIC_SITE_URL', MAIN_ORIGIN],
  ['NEXT_PUBLIC_LK_URL', LK_ORIGIN],
]) {
  console.log(`Setting ${key} on ${project} (production)...`);
  run(['env', 'add', key, 'production', '--value', value, '--force', '--yes']);
}

console.log(`Done for ${project}. Redeploy when all env is set.`);
