import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const roomToken = searchParams.get('roomToken')?.trim();

    if (!roomToken) {
      return NextResponse.json({ error: 'roomToken required' }, { status: 400 });
    }

    const { data: lesson, error } = await supabaseServer
      .from('lessons')
      .select('id, room_token, teacher_summary, started_at, ended_at, status, duration_minutes')
      .eq('room_token', roomToken)
      .maybeSingle();

    if (error) {
      console.error('Error fetching room messages:', error);
      return NextResponse.json({ messages: [], error: error.message }, { status: 500 });
    }

    if (!lesson) {
      return NextResponse.json({ messages: [], startedAt: null });
    }

    let messages: any[] = [];
    if (lesson.teacher_summary) {
      try {
        const parsed = JSON.parse(lesson.teacher_summary);
        messages = Array.isArray(parsed?.messages) ? parsed.messages : [];
      } catch {
        messages = [];
      }
    }

    return NextResponse.json({
      messages,
      startedAt: lesson.started_at || null,
      status: lesson.status || 'active',
      durationMinutes: lesson.duration_minutes || 0,
    });
  } catch (err: any) {
    console.error('Room messages GET error:', err);
    return NextResponse.json({ messages: [], error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { roomToken, message } = body;

    if (!roomToken || !message || !message.id) {
      return NextResponse.json({ error: 'roomToken and valid message required' }, { status: 400 });
    }

    // 1. Fetch current lesson
    const { data: lesson, error: fetchError } = await supabaseServer
      .from('lessons')
      .select('id, room_token, teacher_summary')
      .eq('room_token', roomToken)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching lesson for message insert:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    let existingData: Record<string, any> = {};
    if (lesson?.teacher_summary) {
      try {
        existingData = JSON.parse(lesson.teacher_summary);
      } catch {
        existingData = { summary_text: lesson.teacher_summary };
      }
    }

    const messages = Array.isArray(existingData.messages) ? existingData.messages : [];
    // Prevent duplicate insertion if already exists
    const exists = messages.some((m: any) => m.id === message.id);
    if (!exists) {
      messages.push(message);
    }
    existingData.messages = messages;

    const summaryPayload = JSON.stringify(existingData);

    if (lesson) {
      const { error: updateError } = await supabaseServer
        .from('lessons')
        .update({ teacher_summary: summaryPayload })
        .eq('room_token', roomToken);

      if (updateError) {
        console.error('Error updating lesson messages:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    } else {
      // Create new lesson entry for this room token
      const { error: insertError } = await supabaseServer
        .from('lessons')
        .insert([
          {
            room_token: roomToken,
            topic: 'Индивидуальное занятие',
            teacher_name: message.senderRole === 'teacher' ? message.senderName : 'Преподаватель',
            student_name: message.senderRole === 'student' ? message.senderName : 'Ученик',
            status: 'active',
            teacher_summary: summaryPayload,
            created_at: new Date().toISOString(),
          },
        ]);

      if (insertError) {
        console.error('Error creating lesson record for room:', insertError);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, message });
  } catch (err: any) {
    console.error('Room messages POST error:', err);
    return NextResponse.json({ error: err.message || 'Ошибка сохранения сообщения' }, { status: 500 });
  }
}
