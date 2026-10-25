import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const studentPublicId = searchParams.get('studentPublicId')?.trim();
    const status = searchParams.get('status')?.trim();

    let query = supabase
      .from('lessons')
      .select('*')
      .order('scheduled_for', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (studentPublicId) {
      query = query.or(`student_public_id.eq.${studentPublicId},student_public_id.is.null`);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching lessons from Supabase:', error);
      return NextResponse.json({ lessons: [], error: error.message }, { status: 500 });
    }

    return NextResponse.json({ lessons: data || [] });
  } catch (err: any) {
    console.error('Lessons GET handler error:', err);
    return NextResponse.json({ lessons: [], error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      action,
      status,
      room_token,
      topic,
      student_public_id,
      student_name,
      teacher_name,
      scheduled_for,
      duration_minutes,
      teacher_summary,
    } = body;

    // 1. Update existing lesson status (e.g. mark passed/completed or missed/cancelled)
    if (id && (action === 'update_status' || status)) {
      const updates: any = {
        status: status || 'completed',
      };
      if (status === 'completed') {
        updates.ended_at = new Date().toISOString();
      }
      if (teacher_summary) {
        updates.teacher_summary = teacher_summary;
      }

      const { data, error } = await supabase
        .from('lessons')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating lesson in Supabase:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, lesson: data });
    }

    // 2. Insert new lesson (scheduled or ready to launch)
    const token = room_token || `room-${Math.floor(1000 + Math.random() * 9000)}`;
    const newLesson = {
      room_token: token,
      topic: topic?.trim() || 'Индивидуальное занятие',
      student_public_id: student_public_id?.trim() || null,
      student_name: student_name?.trim() || 'Ученик центра',
      teacher_name: teacher_name?.trim() || 'Преподаватель',
      scheduled_for: scheduled_for ? new Date(scheduled_for).toISOString() : new Date().toISOString(),
      duration_minutes: duration_minutes || 45,
      status: status || 'pending',
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('lessons')
      .insert([newLesson])
      .select()
      .single();

    if (error) {
      console.error('Error creating lesson in Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, lesson: data });
  } catch (err: any) {
    console.error('Lessons POST handler error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
