import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateRequest } from "@/lib/server-auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limiter";
import { CreateLessonSchema } from "@/lib/validations";

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

  // 2. Серверная аутентификация
  const auth = await authenticateRequest(request);
  if (!auth.user) {
    return NextResponse.json(
      { error: auth.error || "Требуется авторизация для просмотра уроков." },
      { status: auth.statusCode || 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const statusFilter = (searchParams.get("status") as any) || undefined;
  const user = auth.user;

  // 3. Серверное разграничение доступа (защита от IDOR)
  let lessons = [];

  if (user.role === "admin") {
    // Администратор имеет доступ ко всем урокам или фильтрует по запросу
    const teacherId = searchParams.get("teacherId") || undefined;
    const studentId = searchParams.get("studentId") || undefined;
    lessons = db.getLessons({ teacherId, studentId, status: statusFilter });
  } else if (user.role === "teacher") {
    // Преподаватель видит ТОЛЬКО свои уроки
    lessons = db.getLessons({ teacherId: user.id, status: statusFilter });
  } else if (user.role === "student") {
    // Ученик видит ТОЛЬКО свои уроки
    lessons = db.getLessons({ studentId: user.id, status: statusFilter });
  } else if (user.role === "parent") {
    // Родитель видит уроки ТОЛЬКО своих привязанных детей
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

  // 2. Серверная аутентификация
  const auth = await authenticateRequest(request);
  if (!auth.user) {
    return NextResponse.json(
      { error: auth.error || "Требуется авторизация." },
      { status: auth.statusCode || 401 }
    );
  }

  // 3. Проверка прав: создавать уроки могут только преподаватели и администраторы
  if (auth.user.role !== "teacher" && auth.user.role !== "admin") {
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

    // 5. Защита от подмены преподавателя (если создает учитель, teacherId принудительно его собственный)
    if (auth.user.role === "teacher") {
      lessonData.teacherId = auth.user.id;
      if (auth.user.name) lessonData.teacherName = auth.user.name;
    }

    const newLesson = db.createLesson(lessonData as any);
    return NextResponse.json(newLesson, { status: 201 });
  } catch (err: any) {
    // Безопасная обработка без раскрытия стека клиенту
    return NextResponse.json(
      { error: "Некорректный запрос или сбой при обработке данных." },
      { status: 400 }
    );
  }
}
