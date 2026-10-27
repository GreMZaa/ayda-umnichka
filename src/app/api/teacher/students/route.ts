import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const teacherPublicId = searchParams.get('teacherPublicId')?.trim();

    let query = supabase
      .from('teacher_students')
      .select('*')
      .order('created_at', { ascending: false });

    if (teacherPublicId) {
      query = query.or(`teacher_public_id.eq.${teacherPublicId},teacher_public_id.is.null`);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching teacher_students from Supabase:', error);
      return NextResponse.json({ students: [], error: error.message }, { status: 500 });
    }

    return NextResponse.json({ students: data || [] });
  } catch (err: any) {
    console.error('Teacher students GET handler error:', err);
    return NextResponse.json({ students: [], error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      teacher_public_id,
      student_public_id,
      student_name,
      notes,
    } = body;

    if (!student_name && !student_public_id) {
      return NextResponse.json({ error: 'Необходимо указать имя или ID ученика' }, { status: 400 });
    }

    const teacherId = teacher_public_id || 'id179017';

    // Prevent duplicate student bindings for the same teacher
    let existingQuery = supabase
      .from('teacher_students')
      .select('*')
      .eq('teacher_public_id', teacherId);

    if (student_public_id) {
      existingQuery = existingQuery.eq('student_public_id', student_public_id);
    } else {
      existingQuery = existingQuery.eq('student_name', student_name);
    }

    const { data: existing } = await existingQuery.maybeSingle();
    if (existing) {
      return NextResponse.json({ success: true, student: existing, isDuplicate: true });
    }

    const newBinding = {
      teacher_public_id: teacherId,
      student_public_id: student_public_id || null,
      student_name: student_name || 'Ученик центра',
      notes: notes || 'Индивидуальное сопровождение',
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('teacher_students')
      .insert([newBinding])
      .select()
      .single();

    if (error) {
      console.error('Error inserting teacher_students in Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, student: data });
  } catch (err: any) {
    console.error('Teacher students POST handler error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const studentPublicId = searchParams.get('studentPublicId');

    if (!id && !studentPublicId) {
      return NextResponse.json({ error: 'ID записи обязателен для удаления' }, { status: 400 });
    }

    let query = supabase.from('teacher_students').delete();
    if (id) {
      query = query.eq('id', id);
    } else if (studentPublicId) {
      query = query.eq('student_public_id', studentPublicId);
    }

    const { error } = await query;
    if (error) {
      console.error('Error deleting teacher_students from Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Teacher students DELETE handler error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
