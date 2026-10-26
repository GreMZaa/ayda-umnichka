import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

function isUuid(id?: string | null): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      body = await req.json();
    } else {
      const text = await req.text();
      try {
        body = JSON.parse(text);
      } catch {
        body = {};
      }
    }

    const { publicId, status = 'online' } = body;
    if (!publicId) {
      return NextResponse.json({ error: 'publicId is required' }, { status: 400 });
    }

    const isIdUuid = isUuid(publicId);

    let query = supabaseServer.from('user_bindings').select('id, metadata');
    if (isIdUuid) {
      query = query.or(`id.eq.${publicId},auth_user_id.eq.${publicId}`);
    } else {
      query = query.eq('public_id', publicId);
    }
    const { data: binding } = await query.maybeSingle();

    if (!binding) {
      return NextResponse.json({ success: false, message: 'User binding not found' }, { status: 404 });
    }

    const existingMetadata = binding.metadata && typeof binding.metadata === 'object' ? binding.metadata : {};
    const now = new Date();

    const lastSeenAt = status === 'offline' ? null : now.toISOString();

    const updatedMetadata = {
      ...existingMetadata,
      last_seen_at: lastSeenAt,
      is_online: status === 'online',
    };

    await supabaseServer
      .from('user_bindings')
      .update({
        metadata: updatedMetadata,
        updated_at: now.toISOString(),
      })
      .eq('id', binding.id);

    return NextResponse.json({ success: true, status, lastSeenAt });
  } catch (err: any) {
    console.error('Presence POST error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const publicId = searchParams.get('id') || searchParams.get('userId');
    if (!publicId) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const isIdUuid = isUuid(publicId);
    let query = supabaseServer.from('user_bindings').select('id, public_id, metadata, updated_at');
    if (isIdUuid) {
      query = query.or(`id.eq.${publicId},auth_user_id.eq.${publicId}`);
    } else {
      query = query.eq('public_id', publicId);
    }
    const { data: binding } = await query.maybeSingle();

    if (!binding) {
      return NextResponse.json({ isOnline: false, lastSeenAt: null });
    }

    const lastSeenAt = binding.metadata?.last_seen_at;
    const isOnline = Boolean(
      lastSeenAt && Date.now() - new Date(lastSeenAt).getTime() < 90_000
    );

    return NextResponse.json({
      success: true,
      publicId: binding.public_id,
      isOnline,
      lastSeenAt: lastSeenAt || null,
    });
  } catch (err: any) {
    console.error('Presence GET error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
