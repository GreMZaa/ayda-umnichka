import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateRequest } from "@/lib/server-auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limiter";
import { UpdateLessonStatusSchema, AddLessonNoteSchema } from "@/lib/validations";
import { getSupabase } from "@/lib/supabase";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  // 1. Rate Limiting
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(`get-lesson-id:${clientIp}`, 120, 60);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Слишком много запросов. Пожалуйста, подождите.", retryAfter: rateLimit.retryAfter },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter || 60) } }
    );
  }

  // 2. Аутентификация
  const auth = await authenticateRequest(request);
  const user = auth.user || {
    id: "00000000-0000-0000-0000-000000000001",
    email: "demo-teacher@ayda-umnichka.ru",
    role: "teacher",
    name: "Анна Сергеевна Иванова",
  };

  // Поиск в Supabase
  const client = getSupabase();
  if (client) {
    try {
      const { data: sbLesson } = await client
        .from("lessons")
        .select(`
          id,
          title,
          start_time,
          end_time,
          status,
          room_name,
          subject_id,
          teacher_id,
          student_id,
          subjects:subject_id (name, color),
          teacher:teacher_id (name, avatar_url),
          student:student_id (name, avatar_url)
        `)
        .eq("id", params.id)
        .single();

      if (sbLesson) {
        return NextResponse.json({
          id: sbLesson.id,
          title: sbLesson.title,
          subjectId: sbLesson.subject_id,
          subjectName: (sbLesson.subjects as any)?.name || "Предмет",
          subjectColor: (sbLesson.subjects as any)?.color || "#2563eb",
          teacherId: sbLesson.teacher_id,
          teacherName: (sbLesson.teacher as any)?.name || "Преподаватель",
          teacherAvatar: (sbLesson.teacher as any)?.avatar_url,
          studentId: sbLesson.student_id,
          studentName: (sbLesson.student as any)?.name || "Ученик",
          studentAvatar: (sbLesson.student as any)?.avatar_url,
          startTime: sbLesson.start_time,
          endTime: sbLesson.end_time,
          status: sbLesson.status,
          roomName: sbLesson.room_name,
        });
      }
    } catch (e) {}
  }

  const lesson = db.getLessonById(params.id);
  if (!lesson) {
    return NextResponse.json({ error: "Урок не найден." }, { status: 404 });
  }

  return NextResponse.json(lesson);
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  // 1. Rate Limiting
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(`patch-lesson:${clientIp}`, 40, 60);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Слишком много запросов на изменение. Пожалуйста, подождите.", retryAfter: rateLimit.retryAfter },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter || 60) } }
    );
  }

  // 2. Аутентификация
  const auth = await authenticateRequest(request);
  const user = auth.user || {
    id: "00000000-0000-0000-0000-000000000001",
    email: "demo-teacher@ayda-umnichka.ru",
    role: "teacher",
    name: "Анна Сергеевна Иванова",
  };

  try {
    const rawBody = await request.json();

    // Сценарий 1: Обновление статуса урока
    if (rawBody.status) {
      const parsed = UpdateLessonStatusSchema.safeParse(rawBody);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Недопустимый статус урока.", details: parsed.error.issues.map((i) => i.message) },
          { status: 400 }
        );
      }

      const client = getSupabase();
      if (client) {
        try {
          await client.from("lessons").update({ status: parsed.data.status }).eq("id", params.id);
        } catch (e) {}
      }

      const updated = db.updateLessonStatus(params.id, parsed.data.status);
      return NextResponse.json(updated || { id: params.id, status: parsed.data.status });
    }

    // Сценарий 2: Добавление заметки / выставление оценки
    if (rawBody.content) {
      const parsed = AddLessonNoteSchema.safeParse(rawBody);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Некорректные данные заметки.", details: parsed.error.issues.map((i) => i.message) },
          { status: 400 }
        );
      }

      // Защита от подмены автора: authorId и authorName всегда берутся из сессии
      const note = db.addLessonNote(
        params.id,
        user.id,
        parsed.data.content,
        parsed.data.grade,
        parsed.data.feedback
      );

      return NextResponse.json(note, { status: 201 });
    }

    return NextResponse.json({ error: "Отсутствуют допустимые действия для обновления." }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Ошибка при обработке запроса." },
      { status: 400 }
    );
  }
}
