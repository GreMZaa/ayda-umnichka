import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateRequest } from "@/lib/server-auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limiter";
import { UpdateLessonStatusSchema, AddLessonNoteSchema } from "@/lib/validations";

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
  if (!auth.user) {
    return NextResponse.json(
      { error: auth.error || "Требуется авторизация." },
      { status: auth.statusCode || 401 }
    );
  }

  const lesson = db.getLessonById(params.id);
  if (!lesson) {
    return NextResponse.json({ error: "Урок не найден." }, { status: 404 });
  }

  const user = auth.user;

  // 3. Серверная проверка прав (IDOR): доступ имеют только участники урока и администратор
  const isTeacher = user.role === "teacher" && lesson.teacherId === user.id;
  const isStudent = user.role === "student" && lesson.studentId === user.id;
  const isAdmin = user.role === "admin";
  let isParentOfStudent = false;

  if (user.role === "parent") {
    const children = db.getParentChildren(user.id);
    isParentOfStudent = children.some((c) => c.id === lesson.studentId);
  }

  if (!isAdmin && !isTeacher && !isStudent && !isParentOfStudent) {
    return NextResponse.json(
      { error: "Доступ к информации о данном уроке запрещён." },
      { status: 403 }
    );
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
  if (!auth.user) {
    return NextResponse.json(
      { error: auth.error || "Требуется авторизация." },
      { status: auth.statusCode || 401 }
    );
  }

  const lesson = db.getLessonById(params.id);
  if (!lesson) {
    return NextResponse.json({ error: "Урок не найден." }, { status: 404 });
  }

  const user = auth.user;

  // 3. Авторизация: изменять статус и выставлять оценки может только преподаватель этого урока или администратор
  const isAuthorizedTeacher = user.role === "teacher" && lesson.teacherId === user.id;
  const isAdmin = user.role === "admin";

  if (!isAuthorizedTeacher && !isAdmin) {
    return NextResponse.json(
      { error: "Недостаточно прав. Только назначенный преподаватель или администратор может изменять этот урок." },
      { status: 403 }
    );
  }

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
      const updated = db.updateLessonStatus(params.id, parsed.data.status);
      return NextResponse.json(updated);
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
