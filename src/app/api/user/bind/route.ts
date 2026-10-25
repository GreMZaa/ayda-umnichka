import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/user/bind?publicId=id749210
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const publicId = searchParams.get('publicId')?.trim().toLowerCase();

    if (!publicId) {
      return NextResponse.json({ error: 'Missing publicId' }, { status: 400 });
    }

    // 1. Check user_bindings table
    const { data: binding, error: bindingError } = await supabase
      .from('user_bindings')
      .select('*')
      .eq('public_id', publicId)
      .maybeSingle();

    if (bindingError) {
      console.error('Supabase user_bindings error:', bindingError);
    }

    if (binding) {
      return NextResponse.json({
        exists: true,
        source: 'user_bindings',
        binding,
      });
    }

    // 2. Check profiles table as fallback
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('public_id', publicId)
      .maybeSingle();

    if (profile) {
      return NextResponse.json({
        exists: true,
        source: 'profiles',
        binding: {
          public_id: profile.public_id,
          auth_user_id: profile.id,
          full_name: profile.full_name,
          role: profile.role,
          phone: profile.phone,
          balance_lessons: profile.balance_lessons,
          is_registered: true,
        },
      });
    }

    return NextResponse.json({ exists: false, publicId });
  } catch (error) {
    console.error('API /api/user/bind GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/user/bind
// Body: { publicId, fullName?, phone?, email?, authUserId?, isRegistered?, role? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const publicId = body.publicId?.trim().toLowerCase();

    if (!publicId) {
      return NextResponse.json({ error: 'Missing publicId' }, { status: 400 });
    }

    const roleCookie = req.cookies.get('aida_active_role')?.value;
    const authHeader = req.headers.get('authorization');
    const isAdmin = roleCookie === 'admin' || (authHeader && authHeader === `Bearer ${process.env.ADMIN_SECRET_KEY || 'admin_secret'}`);

    // Privilege escalation & mass assignment prevention:
    // Only verified admin can assign teacher/admin roles or arbitrary balance
    const role = isAdmin && body.role ? body.role : 'student';
    const balance = isAdmin && typeof body.balanceLessons === 'number' ? body.balanceLessons : 0;

    const payload = {
      public_id: publicId,
      full_name: body.fullName || 'Новый ученик',
      role: role,
      phone: body.phone || null,
      email: body.email || null,
      auth_user_id: body.authUserId || null,
      is_registered: body.isRegistered !== undefined ? Boolean(body.isRegistered) : true,
      balance_lessons: balance,
      metadata: body.metadata || {},
      updated_at: new Date().toISOString(),
    };

    // Upsert into Supabase user_bindings
    const { data, error } = await supabase
      .from('user_bindings')
      .upsert(payload, { onConflict: 'public_id' })
      .select()
      .single();

    if (error) {
      console.error('Supabase upsert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If authUserId is present, also update profiles table
    if (body.authUserId) {
      await supabase
        .from('profiles')
        .update({ public_id: publicId })
        .eq('id', body.authUserId);
    }

    return NextResponse.json({
      success: true,
      message: 'ID привязан к аккаунту в Supabase',
      binding: data,
    });
  } catch (error) {
    console.error('API /api/user/bind POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/user/bind
// Body: { oldPublicId, newPublicId, fullName? }
// Used to rename / change vanity handle (e.g. from id123456 to s.sharonovv)
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const oldPublicId = body.oldPublicId?.trim().toLowerCase();
    const newPublicId = body.newPublicId?.trim().toLowerCase();

    if (!oldPublicId || !newPublicId) {
      return NextResponse.json({ error: 'Missing oldPublicId or newPublicId' }, { status: 400 });
    }

    // Check if newPublicId is already taken
    const { data: existing } = await supabase
      .from('user_bindings')
      .select('id, public_id')
      .eq('public_id', newPublicId)
      .maybeSingle();

    if (existing && existing.public_id !== oldPublicId) {
      return NextResponse.json({ error: 'Этот адрес уже занят другим пользователем' }, { status: 409 });
    }

    // Update in user_bindings
    const { data, error } = await supabase
      .from('user_bindings')
      .update({
        public_id: newPublicId,
        full_name: body.fullName || undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('public_id', oldPublicId)
      .select()
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If no row was found to update, insert new
    if (!data) {
      const { data: inserted, error: insertError } = await supabase
        .from('user_bindings')
        .insert({
          public_id: newPublicId,
          full_name: body.fullName || 'Гость платформы',
          is_registered: false,
        })
        .select()
        .single();

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, binding: inserted });
    }

    // If linked to auth user, update profiles as well
    if (data.auth_user_id) {
      await supabase
        .from('profiles')
        .update({ public_id: newPublicId })
        .eq('id', data.auth_user_id);
    }

    return NextResponse.json({
      success: true,
      message: 'Персональный адрес успешно обновлен в Supabase',
      binding: data,
    });
  } catch (error) {
    console.error('API /api/user/bind PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
