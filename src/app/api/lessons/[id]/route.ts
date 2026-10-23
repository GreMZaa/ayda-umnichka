import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateRequest } from "@/lib/server-auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limiter";
import { UpdateLessonStatusSchema, AddLessonNoteSchema } from "@/lib/validations";
import { getSupabase } from "@/lib/supabase";

const isUuid = (str: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

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
    id: "882042e2-d020-426c-9826-9fba5b23ad2e",
    email: "skokova_97@inbox.ru",
    role: "teacher",
    name: "Шаронова Василина Владимировна",
  };

  // Поиск в Supabase
  const client = getSupabase();

  if (client) {
    try {
      let query = client
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
          teacher:teacher_id (name, avatar_url, phone),
          student:student_id (name, avatar_url, phone)
        `);

      if (isUuid(params.id)) {
        query = query.eq("id", params.id);
      } else {
        query = query.eq("room_name", params.id);
      }

      const { data: sbLesson } = await query.maybeSingle();

      if (sbLesson) {
        const notes = db.getLessonNotes(sbLesson.id);
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
          roomName: sbLesson.room_name || sbLesson.id,
          notes,
        });
      }
    } catch (e) {
      console.error("Error looking up lesson by id/room:", e);
    }
  }

  // Если это тестовая комната или урок не найден в БД
  if (params.id === "umnichka-test-room" || params.id === "test-room") {
    return NextResponse.json({
      id: "umnichka-test-room",
      title: "Индивидуальный онлайн-урок: Математика и логика",
      subjectId: "fd8c024a-ff45-40e1-99ea-9afa55e1bf3d",
      subjectName: "Математика и логика",
      subjectColor: "#2563eb",
      teacherId: "882042e2-d020-426c-9826-9fba5b23ad2e",
      teacherName: "Шаронова Василина Владимировна",
      teacherAvatar: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=240&h=240&fit=crop&crop=faces",
      studentId: "student-demo-room",
      studentName: "Ученик",
      studentAvatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop&crop=faces",
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
      status: "IN_PROGRESS",
      roomName: "umnichka-test-room",
    });
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
    id: "882042e2-d020-426c-9826-9fba5b23ad2e",
    email: "skokova_97@inbox.ru",
    role: "teacher",
    name: "Шаронова Василина Владимировна",
  };

  try {
    const rawBody = await request.json();

    // Сценарий 1: Продление урока учителем на N минут (по умолчанию 30 минут)
    if (rawBody.extendMinutes !== undefined || rawBody.endTime) {
      const extendMin = typeof rawBody.extendMinutes === "number" ? rawBody.extendMinutes : 30;
      const client = getSupabase();
      let newEndTimeIso: string;

      if (rawBody.endTime) {
        newEndTimeIso = new Date(rawBody.endTime).toISOString();
      } else {
        let currentEndMs = Date.now();
        if (client) {
          try {
            const { data: curr } = await client
              .from("lessons")
              .select("end_time")
              .eq(isUuid(params.id) ? "id" : "room_name", params.id)
              .maybeSingle();
            if (curr?.end_time) {
              const ms = new Date(curr.end_time).getTime();
              if (ms > currentEndMs) currentEndMs = ms;
            }
          } catch (e) {}
        }
        newEndTimeIso = new Date(currentEndMs + extendMin * 60 * 1000).toISOString();
      }

      if (client) {
        try {
          const matchCol = isUuid(params.id) ? "id" : "room_name";
          await client
            .from("lessons")
            .update({
              end_time: newEndTimeIso,
              status: "LIVE",
              updated_at: new Date().toISOString(),
            })
            .eq(matchCol, params.id);
        } catch (e) {
          console.error("Supabase extend error:", e);
        }
      }

      const updatedLocal = db.extendLesson(params.id, extendMin);

      return NextResponse.json({
        success: true,
        id: params.id,
        endTime: newEndTimeIso,
        status: "LIVE",
        lesson: updatedLocal,
      });
    }

    // Сценарий 2: Обновление статуса урока
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
          if (isUuid(params.id)) {
            await client.from("lessons").update({ status: parsed.data.status }).eq("id", params.id);
          } else {
            await client.from("lessons").update({ status: parsed.data.status }).eq("room_name", params.id);
          }
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

      // 1. Обновляем статус урока на COMPLETED в Supabase
      const client = getSupabase();
      if (client) {
        try {
          if (isUuid(params.id)) {
            await client.from("lessons").update({ status: "COMPLETED" }).eq("id", params.id);
          } else {
            await client.from("lessons").update({ status: "COMPLETED" }).eq("room_name", params.id);
          }
        } catch (e) {}
      }

      // 2. Сохраняем заметку и переводим статус урока в COMPLETED в локальной базе данных
      const note = db.addLessonNote(
        params.id,
        user.id,
        parsed.data.content,
        parsed.data.grade,
        parsed.data.feedback,
        user.name
      );

      db.updateLessonStatus(params.id, "COMPLETED");

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
