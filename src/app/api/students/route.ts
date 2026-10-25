import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim().toLowerCase();

    // 1. Fetch students from user_bindings
    const { data: bindings, error: bindError } = await supabase
      .from('user_bindings')
      .select('*')
      .eq('role', 'student')
      .order('created_at', { ascending: false });

    if (bindError) console.warn('user_bindings students warning:', bindError.message);

    // 2. Fetch students from profiles
    const { data: profiles, error: profError } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'student')
      .order('created_at', { ascending: false });

    if (profError) console.warn('profiles students warning:', profError.message);

    const map = new Map<string, any>();

    (bindings || []).forEach((b) => {
      const publicId = b.public_id || b.id;
      map.set(publicId, {
        id: b.id,
        publicId,
        fullName: b.full_name || 'Ученик центра',
        phone: b.phone || null,
        email: b.email || null,
        balanceLessons: b.balance_lessons ?? 1,
        createdAt: b.created_at,
      });
    });

    (profiles || []).forEach((p) => {
      const publicId = p.public_id || p.id;
      if (!map.has(publicId)) {
        map.set(publicId, {
          id: p.id,
          publicId,
          fullName: p.full_name || 'Ученик центра',
          phone: p.phone || null,
          email: null,
          balanceLessons: p.balance_lessons ?? 1,
          createdAt: p.created_at,
        });
      }
    });

    let students = Array.from(map.values());

    if (q) {
      students = students.filter(
        (s) =>
          s.fullName.toLowerCase().includes(q) ||
          s.publicId.toLowerCase().includes(q) ||
          (s.phone && s.phone.includes(q))
      );
    }

    return NextResponse.json({
      success: true,
      count: students.length,
      students,
    });
  } catch (err: any) {
    console.error('API /api/students error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to fetch students' }, { status: 500 });
  }
}
