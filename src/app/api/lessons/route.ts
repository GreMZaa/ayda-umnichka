import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateRequest } from "@/lib/server-auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limiter";
import { CreateLessonSchema } from "@/lib/validations";
import { getSupabase } from "@/lib/supabase";

export async function GET(request: Request) {
  // 1. Rate Limiting
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(`get-lessons:${clientIp}`, 100, 60);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Слишком много запросов. Пожалуйста, подождите.", retryAfter: rateLimit.retryAfter },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter || 60) } }
    );
  }

  // 2. Серверная аутентификация с поддержкой демо-режима
  const auth = await authenticateRequest(request);
  const { searchParams } = new URL(request.url);
  const statusFilter = (searchParams.get("status") as any) || undefined;
  
  const user = auth.user || {
    id: "00000000-0000-0000-0000-000000000001",
    email: "demo-teacher@ayda-umnichka.ru",
    role: (searchParams.get("role") as any) || "teacher",
    name: "Анна Сергеевна Иванова",
  };

  // 3. Запрос уроков из Supabase (продакшн БД)
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
          teacher:teacher_id (name, avatar_url),
          student:student_id (name, avatar_url)
        `)
        .order("start_time", { ascending: false });

      const studentIdParam = searchParams.get("studentId");
      const teacherIdParam = searchParams.get("teacherId");

      if (statusFilter) {
        query = query.eq("status", statusFilter);
      }
      if (studentIdParam) {
        query = query.eq("student_id", studentIdParam);
      } else if (user.role === "student") {
        query = query.eq("student_id", user.id);
      }

      if (teacherIdParam) {
        query = query.eq("teacher_id", teacherIdParam);
      } else if (user.role === "teacher") {
        query = query.eq("teacher_id", user.id);
      }

      const { data: sbLessons } = await query;
      if (sbLessons && sbLessons.length > 0) {
        const mappedLessons = sbLessons.map((l: any) => ({
          id: l.id,
          title: l.title,
          subjectId: l.subject_id,
          subjectName: l.subjects?.name || "Предмет",
          subjectColor: l.subjects?.color || "#2563eb",
          teacherId: l.teacher_id,
          teacherName: l.teacher?.name || "Преподаватель",
          teacherAvatar: l.teacher?.avatar_url,
          studentId: l.student_id,
          studentName: l.student?.name || "Ученик",
          studentAvatar: l.student?.avatar_url,
          startTime: l.start_time,
          endTime: l.end_time,
          status: l.status,
          roomName: l.room_name,
        }));
        return NextResponse.json(mappedLessons);
      }
    } catch (err) {
      console.error("Supabase lessons query error:", err);
    }
  }

  // Fallback к локальной базе при необходимости
  let lessons = [];

  if (user.role === "admin") {
    const teacherId = searchParams.get("teacherId") || undefined;
    const studentId = searchParams.get("studentId") || undefined;
    lessons = db.getLessons({ teacherId, studentId, status: statusFilter });
  } else if (user.role === "teacher") {
    lessons = db.getLessons({ teacherId: user.id, status: statusFilter });
  } else if (user.role === "student") {
    lessons = db.getLessons({ studentId: user.id, status: statusFilter });
  } else if (user.role === "parent") {
    const children = db.getParentChildren(user.id);
    const childIds = children.map((c) => c.id);
    lessons = db.getLessons({ studentIds: childIds, status: statusFilter });
  } else {
    return NextResponse.json({ error: "Доступ запрещен для текущей роли." }, { status: 403 });
  }

  return NextResponse.json(lessons);
}

export async function POST(request: Request) {
  // 1. Rate Limiting
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(`post-lessons:${clientIp}`, 30, 60);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Превышен лимит создания уроков. Пожалуйста, подождите.", retryAfter: rateLimit.retryAfter },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter || 60) } }
    );
  }

  // 2. Серверная аутентификация с поддержкой демо-режима
  const auth = await authenticateRequest(request);
  const user = auth.user || {
    id: "00000000-0000-0000-0000-000000000001",
    email: "teacher@ayda-umnichka.ru",
    role: "teacher",
    name: "Анна Сергеевна Иванова",
  };

  // 3. Проверка прав: создавать уроки могут преподаватели и администраторы
  if (user.role !== "teacher" && user.role !== "admin") {
    return NextResponse.json(
      { error: "Недостаточно прав. Только преподаватели и администраторы могут создавать уроки." },
      { status: 403 }
    );
  }

  try {
    const rawBody = await request.json();

    // 4. Строгая валидация входных данных (Zod)
    const validation = CreateLessonSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Ошибка валидации входных данных.",
          details: validation.error.issues.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    const lessonData = validation.data;

    // 5. Защита от подмены преподавателя
    if (user.role === "teacher" && !lessonData.teacherId) {
      lessonData.teacherId = user.id;
      if (user.name) lessonData.teacherName = user.name;
    }

    // Сохранение в Supabase
    const client = getSupabase();
    if (client) {
      try {
        const isUuid = (str: string) =>
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

        const subjectIdToSave = isUuid(lessonData.subjectId)
          ? lessonData.subjectId
          : "fd8c024a-ff45-40e1-99ea-9afa55e1bf3d";

        const studentIdToSave = isUuid(lessonData.studentId)
          ? lessonData.studentId
          : "00000000-0000-0000-0000-000000000003";

        const teacherIdToSave = isUuid(lessonData.teacherId)
          ? lessonData.teacherId
          : "00000000-0000-0000-0000-000000000001";

        const { data: created, error } = await client
          .from("lessons")
          .insert({
            title: lessonData.title,
            subject_id: subjectIdToSave,
            teacher_id: teacherIdToSave,
            student_id: studentIdToSave,
            start_time: lessonData.startTime,
            end_time: lessonData.endTime,
            status: lessonData.status || "SCHEDULED",
            room_name: lessonData.roomName || `room-${Date.now()}`,
          })
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
          .single();

        if (created && !error) {
          return NextResponse.json(
            {
              id: created.id,
              title: created.title,
              subjectId: created.subject_id,
              subjectName: lessonData.subjectName || (created.subjects as any)?.name || "Предмет",
              subjectColor: lessonData.subjectColor || (created.subjects as any)?.color || "#2563eb",
              teacherId: created.teacher_id,
              teacherName: lessonData.teacherName || (created.teacher as any)?.name || "Преподаватель",
              teacherAvatar: (created.teacher as any)?.avatar_url,
              studentId: created.student_id,
              studentName: lessonData.studentName || (created.student as any)?.name || "Ученик",
              studentAvatar: (created.student as any)?.avatar_url,
              startTime: created.start_time,
              endTime: created.end_time,
              status: created.status,
              roomName: created.room_name,
            },
            { status: 201 }
          );
        } else if (error) {
          console.error("Supabase insert lesson error:", error);
        }
      } catch (sbErr) {
        console.error("Supabase create lesson exception:", sbErr);
      }
    }

    const newLesson = db.createLesson(lessonData as any);
    return NextResponse.json(newLesson, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Некорректный запрос или сбой при обработке данных." },
      { status: 400 }
    );
  }
}
