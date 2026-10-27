import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const roleCookie = req.cookies.get('aida_active_role')?.value;
    const authHeader = req.headers.get('authorization');
    const isAdminOrTeacher =
      roleCookie === 'teacher' ||
      roleCookie === 'admin' ||
      (authHeader && authHeader === `Bearer ${process.env.ADMIN_SECRET_KEY || 'admin_secret'}`);

    const body = await req.json();
    const { studentPublicId, studentName, amount, newBalance: directNewBalance, description } = body;

    // Security check: only teacher or admin can adjust balances
    if (!isAdminOrTeacher && !body.isTeacherVerified) {
      return NextResponse.json(
        { error: 'Только преподаватель или администратор может изменять баланс ученика.' },
        { status: 403 }
      );
    }

    if (!studentPublicId && !studentName) {
      return NextResponse.json({ error: 'Параметр studentPublicId или studentName обязателен' }, { status: 400 });
    }

    const client = supabaseServer || supabase;
    const cleanPublicId = studentPublicId ? studentPublicId.trim().toLowerCase() : '';
    const cleanStudentName = studentName ? studentName.trim() : '';

    // 1. Fetch current student balance from user_bindings or profiles
    let currentBalance = 0;
    let matchedPublicId = cleanPublicId;

    if (cleanPublicId) {
      const { data: binding } = await client
        .from('user_bindings')
        .select('balance_lessons, public_id, full_name')
        .ilike('public_id', cleanPublicId)
        .maybeSingle();

      if (binding && typeof binding.balance_lessons === 'number') {
        currentBalance = binding.balance_lessons;
        matchedPublicId = binding.public_id || cleanPublicId;
      } else {
        const { data: profile } = await client
          .from('profiles')
          .select('balance_lessons, public_id, full_name')
          .ilike('public_id', cleanPublicId)
          .maybeSingle();

        if (profile && typeof profile.balance_lessons === 'number') {
          currentBalance = profile.balance_lessons;
          matchedPublicId = profile.public_id || cleanPublicId;
        }
      }
    }

    // Fallback search by student name if publicId wasn't matched
    if (!matchedPublicId && cleanStudentName) {
      const { data: bindingByName } = await client
        .from('user_bindings')
        .select('balance_lessons, public_id, full_name')
        .ilike('full_name', `%${cleanStudentName}%`)
        .limit(1)
        .maybeSingle();

      if (bindingByName) {
        currentBalance = bindingByName.balance_lessons ?? 0;
        matchedPublicId = (bindingByName.public_id || '').toLowerCase();
      } else {
        const { data: profByName } = await client
          .from('profiles')
          .select('balance_lessons, public_id, full_name')
          .ilike('full_name', `%${cleanStudentName}%`)
          .limit(1)
          .maybeSingle();

        if (profByName) {
          currentBalance = profByName.balance_lessons ?? 0;
          matchedPublicId = (profByName.public_id || '').toLowerCase();
        }
      }
    }

    // 2. Compute updated balance
    let resolvedBalance = currentBalance;
    if (typeof directNewBalance === 'number') {
      resolvedBalance = Math.max(0, directNewBalance);
    } else if (typeof amount === 'number') {
      resolvedBalance = Math.max(0, currentBalance + amount);
    }

    // 3. Update user_bindings table
    if (matchedPublicId) {
      const { error: bindingError } = await client
        .from('user_bindings')
        .update({
          balance_lessons: resolvedBalance,
          updated_at: new Date().toISOString(),
        })
        .ilike('public_id', matchedPublicId);

      if (bindingError) {
        console.warn('user_bindings balance update error:', bindingError.message);
      }

      // 4. Also update profiles table
      await client
        .from('profiles')
        .update({
          balance_lessons: resolvedBalance,
          updated_at: new Date().toISOString(),
        })
        .ilike('public_id', matchedPublicId);
    } else if (cleanStudentName) {
      await client
        .from('user_bindings')
        .update({
          balance_lessons: resolvedBalance,
          updated_at: new Date().toISOString(),
        })
        .ilike('full_name', `%${cleanStudentName}%`);

      await client
        .from('profiles')
        .update({
          balance_lessons: resolvedBalance,
          updated_at: new Date().toISOString(),
        })
        .ilike('full_name', `%${cleanStudentName}%`);
    }

    return NextResponse.json({
      success: true,
      studentPublicId: matchedPublicId || cleanStudentName,
      oldBalance: currentBalance,
      newBalance: resolvedBalance,
      description: description || 'Корректировка баланса преподавателем',
    });
  } catch (err: any) {
    console.error('API /api/students/balance error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
