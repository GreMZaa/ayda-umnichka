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
  const isUuid = (str: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
  
  const user = auth.user || {
    id: "d22f670c-3a38-41cd-95aa-80afdb94eab5",
    email: "teacher@ayda-umnichka.ru",
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
      if (studentIdParam && isUuid(studentIdParam)) {
        query = query.eq("student_id", studentIdParam);
      } else if (auth.user && auth.user.role === "student" && isUuid(auth.user.id)) {
        query = query.eq("student_id", auth.user.id);
      }

      if (teacherIdParam && isUuid(teacherIdParam)) {
        query = query.eq("teacher_id", teacherIdParam);
      } else if (auth.user && auth.user.role === "teacher" && isUuid(auth.user.id)) {
        query = query.eq("teacher_id", auth.user.id);
      }

      const { data: sbLessons, error: sbError } = await query;
      if (!sbError && sbLessons) {
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
    id: "d22f670c-3a38-41cd-95aa-80afdb94eab5",
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
    const isUuid = (str: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

    // Сохранение в Supabase
    const client = getSupabase();
    if (client) {
      try {
        // Разрешение ID преподавателя в Supabase
        let teacherIdToSave = isUuid(lessonData.teacherId) ? lessonData.teacherId : null;
        if (!teacherIdToSave) {
          const { data: tProf } = await client.from("profiles").select("id").eq("role", "TEACHER").limit(1).maybeSingle();
          teacherIdToSave = tProf?.id || "d22f670c-3a38-41cd-95aa-80afdb94eab5";
        }

        // Разрешение или автоматическое создание профиля ученика в Supabase
        let studentIdToSave = isUuid(lessonData.studentId) ? lessonData.studentId : null;
        if (!studentIdToSave) {
          if (lessonData.studentName) {
            const { data: sProf } = await client
              .from("profiles")
              .select("id")
              .eq("role", "STUDENT")
              .ilike("name", lessonData.studentName.trim())
              .maybeSingle();

            if (sProf) {
              studentIdToSave = sProf.id;
            } else {
              // Создаем профиль нового ученика в Supabase
              const newStId = crypto.randomUUID();
              await client.from("profiles").insert({
                id: newStId,
                name: lessonData.studentName.trim(),
                role: "STUDENT",
                email: `student.${Date.now()}@umnichka.ru`,
                avatar_url: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop&crop=faces",
                bio: JSON.stringify({ grade: "3 класс", school: "АйДаУмничка", balance: 8, stars: 10 }),
              });
              studentIdToSave = newStId;
            }
          } else {
            const { data: sProf } = await client.from("profiles").select("id").eq("role", "STUDENT").limit(1).maybeSingle();
            studentIdToSave = sProf?.id || "2a62e436-f539-4ec5-b3af-a1afabfa0eec";
          }
        }

        // Разрешение или создание учебного предмета в Supabase
        let subjectIdToSave = isUuid(lessonData.subjectId) ? lessonData.subjectId : null;
        if (!subjectIdToSave) {
          if (lessonData.subjectName) {
            const { data: sSub } = await client
              .from("subjects")
              .select("id")
              .ilike("name", lessonData.subjectName.trim())
              .maybeSingle();

            if (sSub) {
              subjectIdToSave = sSub.id;
            } else {
              const newSubId = crypto.randomUUID();
              await client.from("subjects").insert({
                id: newSubId,
                name: lessonData.subjectName.trim(),
                color: lessonData.subjectColor || "#2563eb",
              });
              subjectIdToSave = newSubId;
            }
          } else {
            subjectIdToSave = "fd8c024a-ff45-40e1-99ea-9afa55e1bf3d";
          }
        }

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
          console.error("Supabase insert lesson error in API:", error);
        }
      } catch (sbErr) {
        console.error("Supabase insert exception in API:", sbErr);
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
