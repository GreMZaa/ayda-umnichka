import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock-aidaumnichka.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-key';

// Admin client to bypass email confirmation (email_confirm: true)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, fullName, childName, role = 'student', publicId } = body;

    if (!email || !password || !fullName || !publicId) {
      return NextResponse.json({ error: 'Пожалуйста, заполните все обязательные поля' }, { status: 400 });
    }

    const cleanPublicId = publicId.trim().toLowerCase();
    const displayName = `${fullName}${childName ? ` (ребёнок: ${childName})` : ''}`.trim();
    const balance = role === 'student' ? 1 : 0; // 1 welcome lesson

    // 1. Create user via Supabase Admin API with email_confirm: true (NO email confirmation needed!)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true, // <-- Automatically marks email as confirmed
      user_metadata: {
        public_id: cleanPublicId,
        full_name: displayName,
        role,
        balance_lessons: balance,
      },
    });

    if (authError) {
      // Check if user already registered
      if (authError.message.includes('already been registered') || authError.message.includes('already exists')) {
        return NextResponse.json({
          error: 'Пользователь с таким email/телефоном уже зарегистрирован. Пожалуйста, выполните вход.',
        }, { status: 409 });
      }
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const authUserId = authData.user?.id;

    // 2. Persist binding in user_bindings table
    const { error: bindingError } = await supabaseAdmin
      .from('user_bindings')
      .upsert({
        public_id: cleanPublicId,
        auth_user_id: authUserId || null,
        full_name: displayName,
        role,
        email: email.trim().toLowerCase(),
        balance_lessons: balance,
        is_registered: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'public_id' });

    if (bindingError) {
      console.warn('Supabase user_bindings sync note:', bindingError.message);
    }

    // 3. Try to upsert in profiles table if available
    if (authUserId) {
      try {
        await supabaseAdmin
          .from('profiles')
          .upsert({
            id: authUserId,
            public_id: cleanPublicId,
            full_name: displayName,
            role,
            email: email.trim().toLowerCase(),
            balance_lessons: balance,
          });
      } catch (profileErr) {
        console.warn('Profiles table sync optional note:', profileErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Регистрация в Supabase успешно завершена без подтверждения почты',
      user: {
        id: authUserId,
        email: email.trim().toLowerCase(),
        publicId: cleanPublicId,
        role,
      },
    });
  } catch (error: any) {
    console.error('API /api/auth/register error:', error);
    return NextResponse.json({ error: error?.message || 'Внутренняя ошибка сервера при регистрации' }, { status: 500 });
  }
}
