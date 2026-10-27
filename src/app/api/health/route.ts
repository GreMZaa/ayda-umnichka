import { NextResponse } from 'next/server';
import { supabaseServer } from '@/server/config/database';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const startTime = Date.now();
  let dbStatus = 'ok';
  let latencyMs = 0;

  try {
    const { error } = await supabaseServer.from('user_bindings').select('id').limit(1);
    latencyMs = Date.now() - startTime;
    if (error) {
      dbStatus = 'degraded';
    }
  } catch {
    dbStatus = 'error';
    latencyMs = Date.now() - startTime;
  }

  const isHealthy = dbStatus === 'ok' || dbStatus === 'degraded';

  return NextResponse.json(
    {
      status: dbStatus === 'ok' ? 'healthy' : 'degraded',
      service: 'ayda-umnichka-platform',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        database: dbStatus,
        latencyMs,
      },
    },
    {
      status: isHealthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}
