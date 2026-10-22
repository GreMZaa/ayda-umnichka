import { NextResponse } from "next/server";
import { db, HomeworkSubmission } from "@/lib/db";
import { authenticateRequest } from "@/lib/server-auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limiter";
import { getSupabase } from "@/lib/supabase";
import { incrementBioNumericField } from "@/lib/profile";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId") || undefined;
  const teacherId = searchParams.get("teacherId") || undefined;
  const lessonId = searchParams.get("lessonId") || undefined;

  try {
    // 1. Попытка прочитать из Supabase (если таблица homework_submissions существует)
    const client = getSupabase();
    if (client) {
      try {
        let query = client
          .from("homework_submissions")
          .select("*")
          .order("submitted_at", { ascending: false });

        if (studentId) query = query.eq("student_id", studentId);
        if (teacherId) query = query.eq("teacher_id", teacherId);
        if (lessonId) query = query.eq("lesson_id", lessonId);

        const { data: sbHw, error } = await query;
        if (!error && sbHw && sbHw.length > 0) {
          const mapped: HomeworkSubmission[] = sbHw.map((h: any) => ({
            id: h.id,
            lessonId: h.lesson_id,
            studentId: h.student_id,
            studentName: h.student_name,
            teacherId: h.teacher_id,
            title: h.title,
            subject: h.subject,
            studentAnswer: h.student_answer,
            fileUrl: h.file_url,
            fileName: h.file_name,
            fileSize: h.file_size,
            status: h.status || "SUBMITTED",
            grade: h.grade,
            teacherFeedback: h.teacher_feedback,
            submittedAt: h.submitted_at,
            reviewedAt: h.reviewed_at,
          }));
          return NextResponse.json({ submissions: mapped });
        }
      } catch (e) {
        // Fallback to local DB
      }
    }

    // 2. Fallback на серверный db.json
    const submissions = db.getHomeworkSubmissions({ studentId, teacherId, lessonId });
    return NextResponse.json({ submissions });
  } catch (err: any) {
    console.error("GET /api/homework error:", err);
    return NextResponse.json({ submissions: [] });
  }
}

export async function POST(request: Request) {
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(`homework-submit:${clientIp}`, 30, 60);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Слишком много попыток сдачи ДЗ. Подождите минуту." },
      { status: 429 }
    );
  }

  try {
    const auth = await authenticateRequest(request);
    const body = await request.json();

    const studentId = auth.user?.id || body.studentId;
    const studentName = auth.user?.name || body.studentName || "Ученик";
    const lessonId = body.lessonId || undefined;
    const teacherId = body.teacherId || undefined;
    const title = (body.title || "Домашнее задание").trim();
    const subject = (body.subject || "Занятие").trim();
    const studentAnswer = (body.studentAnswer || "").trim();
    const fileUrl = body.fileUrl || undefined;
    const fileName = body.fileName || undefined;
    const fileSize = body.fileSize || undefined;

    if (!studentId) {
      return NextResponse.json({ error: "Не указан ID ученика." }, { status: 400 });
    }

    if (!studentAnswer && !fileUrl) {
      return NextResponse.json(
        { error: "Пожалуйста, введите ответ или прикрепите файл с решением." },
        { status: 400 }
      );
    }

    const submissionData = {
      lessonId,
      studentId,
      studentName,
      teacherId,
      title,
      subject,
      studentAnswer,
      fileUrl,
      fileName,
      fileSize,
      status: "SUBMITTED" as const,
      grade: undefined,
      teacherFeedback: undefined,
    };

    // 1. Попытка сохранить в Supabase
    const client = getSupabase();
    if (client) {
      try {
        const isUuid = (str: string) =>
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

        if (isUuid(studentId)) {
          await client.from("homework_submissions").upsert({
            lesson_id: lessonId && isUuid(lessonId) ? lessonId : null,
            student_id: studentId,
            student_name: studentName,
            teacher_id: teacherId && isUuid(teacherId) ? teacherId : null,
            title,
            subject,
            student_answer: studentAnswer,
            file_url: fileUrl || null,
            file_name: fileName || null,
            file_size: fileSize || null,
            status: "SUBMITTED",
            submitted_at: new Date().toISOString(),
          });
        }
      } catch (sbErr) {
        console.warn("Supabase homework upsert fallback:", sbErr);
      }
    }

    // 2. Сохранение в постоянный серверный db.json
    const saved = db.saveHomeworkSubmission(submissionData);

    return NextResponse.json({ submission: saved }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/homework error:", err);
    return NextResponse.json(
      { error: err?.message || "Ошибка сервера при отправке ДЗ." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await authenticateRequest(request);
    const body = await request.json();

    const submissionId = body.submissionId || body.id;
    const grade = typeof body.grade === "number" ? body.grade : parseInt(body.grade, 10);
    const teacherFeedback = (body.teacherFeedback || "").trim();

    if (!submissionId) {
      return NextResponse.json({ error: "Не указан ID домашней работы." }, { status: 400 });
    }

    if (!grade || grade < 1 || grade > 5) {
      return NextResponse.json({ error: "Оценка должна быть числом от 1 до 5." }, { status: 400 });
    }

    // 1. Попытка обновить в Supabase
    const client = getSupabase();
    if (client) {
      try {
        await client
          .from("homework_submissions")
          .update({
            grade,
            teacher_feedback: teacherFeedback,
            status: "CHECKED",
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", submissionId);
      } catch (sbErr) {
        console.warn("Supabase homework patch fallback:", sbErr);
      }
    }

    // 2. Обновление в серверном db.json
    const updated = db.gradeHomeworkSubmission(submissionId, grade, teacherFeedback);

    // 3. Если оценка 5, начисляем звезду ученику в Supabase profiles bio
    if (client && updated?.studentId && grade >= 5) {
      try {
        await incrementBioNumericField(client, updated.studentId, "stars", 5);
      } catch (e) {
        console.warn("Star increment warning:", e);
      }
    }

    return NextResponse.json({ success: true, submission: updated });
  } catch (err: any) {
    console.error("PATCH /api/homework error:", err);
    return NextResponse.json(
      { error: err?.message || "Ошибка сервера при проверке ДЗ." },
      { status: 500 }
    );
  }
}
