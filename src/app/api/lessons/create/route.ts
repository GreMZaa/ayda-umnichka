import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { student_id, topic } = body;

    const roomToken = `room-${Math.floor(1000 + Math.random() * 9000)}`;

    return NextResponse.json({
      success: true,
      lesson_id: `lesson-${Date.now()}`,
      room_token: roomToken,
      student_id: student_id || 'user-student-1',
      topic: topic || 'Индивидуальное занятие',
      join_url: `https://app.aidaumnichka.ru/room/${roomToken}`,
      status: 'pending',
      created_at: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 400 });
  }
}

