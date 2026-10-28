#!/usr/bin/env node
/**
 * Automated Load Testing Suite for AyDaUmnichka Platform
 * 
 * Powered by autocannon:
 * Tests serverless routing latency, database responsiveness, and error rates under load.
 * 
 * Usage:
 *   node scripts/load-test.mjs
 *   TARGET_URL=http://localhost:3000 node scripts/load-test.mjs
 */

import autocannon from 'autocannon';

const TARGET_URL = process.env.TARGET_URL || process.argv[2] || 'https://ayda-umnichka.vercel.app';
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '30', 10);
const DURATION = parseInt(process.env.DURATION || '6', 10);

console.log(`\n⚡ [LOAD TESTING SUITE] Starting performance & stress benchmarks`);
console.log(`   Target Host: ${TARGET_URL}`);
console.log(`   Concurrency: ${CONCURRENCY} connections`);
console.log(`   Duration per test: ${DURATION}s\n`);

const SCENARIOS = [
  {
    name: '1. Health Check Endpoint (/api/health)',
    url: `${TARGET_URL}/api/health`,
    method: 'GET',
    connections: CONCURRENCY,
    duration: DURATION,
  },
  {
    name: '2. Public Landing Page (/)',
    url: `${TARGET_URL}/`,
    method: 'GET',
    connections: CONCURRENCY,
    duration: DURATION,
  },
  {
    name: '3. Login & Registration Portal (/login)',
    url: `${TARGET_URL}/login`,
    method: 'GET',
    connections: 20,
    duration: DURATION,
  },
  {
    name: '4. Secured API Homework Endpoint (/api/homework)',
    url: `${TARGET_URL}/api/homework`,
    method: 'GET',
    connections: 25,
    duration: DURATION,
  },
  {
    name: '5. Presence Heartbeat Ping (/api/presence)',
    url: `${TARGET_URL}/api/presence`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ publicId: 'id179017', status: 'online' }),
    connections: 20,
    duration: DURATION,
  },
];

async function runScenario(scenario) {
  console.log(`👉 Testing: ${scenario.name}...`);

  return new Promise((resolve) => {
    const instance = autocannon(
      {
        url: scenario.url,
        method: scenario.method || 'GET',
        headers: scenario.headers || {},
        body: scenario.body || undefined,
        connections: scenario.connections,
        duration: scenario.duration,
        pipelining: 1,
      },
      (err, result) => {
        if (err) {
          console.error(`❌ Scenario ${scenario.name} failed:`, err.message);
          resolve({ name: scenario.name, error: err.message, passed: false });
          return;
        }

        const totalReqs = result.requests.total;
        const reqPerSec = result.requests.average;
        const latencyP50 = result.latency.p50;
        const latencyP97 = result.latency.p97_5;
        const latencyP99 = result.latency.p99;
        const error5xx = result['5xx'] || 0;
        const timeouts = result.timeouts || 0;

        const passed = error5xx === 0 && (latencyP97 || latencyP99 || latencyP50) < 3500;

        console.log(`   Requests: ${totalReqs} total (${reqPerSec.toFixed(1)} req/s)`);
        console.log(`   Latency : p50=${latencyP50}ms | p97.5=${latencyP97}ms | p99=${latencyP99}ms`);
        console.log(`   Errors  : 5xx=${error5xx} | Timeouts=${timeouts}`);
        console.log(`   Status  : ${passed ? '✅ PASS' : '⚠️ WARNING (5xx errors or high latency)'}\n`);

        resolve({
          name: scenario.name,
          totalReqs,
          reqPerSec: reqPerSec.toFixed(1),
          latencyP50,
          latencyP97,
          latencyP99,
          error5xx,
          timeouts,
          passed,
        });
      }
    );

    autocannon.track(instance, { renderProgressBar: false });
  });
}

async function runAll() {
  const results = [];
  for (const s of SCENARIOS) {
    const res = await runScenario(s);
    results.push(res);
  }

  console.log('='.repeat(70));
  console.log('📋 [LOAD TEST SUMMARY REPORT]');
  console.log('='.repeat(70));
  console.table(
    results.map((r) => ({
      Scenario: r.name,
      'Req/s': r.reqPerSec || 'N/A',
      'p50 (ms)': r.latencyP50 || 'N/A',
      'p97.5 (ms)': r.latencyP97 || 'N/A',
      'p99 (ms)': r.latencyP99 || 'N/A',
      '5xx Errors': r.error5xx ?? 'ERR',
      Status: r.passed ? '✅ PASS' : '⚠️ WARN',
    }))
  );

  const allPassed = results.every((r) => r.passed);
  if (allPassed) {
    console.log(`🎉 All load test scenarios PASSED within SLA thresholds!`);
  } else {
    console.warn(`⚠️ Some endpoints exhibited elevated latency or 5xx under high concurrency.`);
  }
}

runAll().catch(console.error);
