import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authenticateRequest } from "@/lib/server-auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limiter";
import { db } from "@/lib/db";
import { parseProfileBio } from "@/lib/profile";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vvxtprfawnpmmtnpsavq.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2eHRwcmZhd25wbW10bnBzYXZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyMjQ3NTUsImV4cCI6MjEwNzgwMDc1NX0.RCiNDYVaLpWIWnQmo68QdPzLDmrLxQ1XXFgOh2X-Q5g";

function createServerSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function GET(request: Request) {
  try {
    const auth = await authenticateRequest(request);
    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get("parentId") || auth.user?.id;

    if (!parentId) {
      return NextResponse.json({ children: [] });
    }

    const sb = createServerSupabase();

    // 1. Ищем связку родитель-ребёнок в parent_students
    const { data: relations, error: relErr } = await sb
      .from("parent_students")
      .select("student_id")
      .eq("parent_id", parentId);

    const studentIds = relations?.map((r) => r.student_id).filter(Boolean) || [];

    if (studentIds.length > 0) {
      const { data: profiles, error: pErr } = await sb
        .from("profiles")
        .select("*")
        .in("id", studentIds);

      if (profiles && profiles.length > 0) {
        const mapped = profiles.map((p) => {
          const bioObj = parseProfileBio(p.bio);
          return {
            id: p.id,
            name: p.name,
            email: p.email,
            grade: bioObj.grade || "3 класс",
            avatar: p.avatar_url || "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop&crop=faces",
            balance: typeof bioObj.balance === "number" ? bioObj.balance : 8,
            stars: typeof bioObj.stars === "number" ? bioObj.stars : 10,
            nextLesson: "Расписание формируется",
            teacher: "Анна Сергеевна Иванова",
            subject: "Математика и логика",
          };
        });
        return NextResponse.json({ children: mapped });
      }
    }

    // 2. Fallback: проверка в локальной db
    const localChildren = db.getParentChildren(parentId);
    if (localChildren && localChildren.length > 0) {
      const mapped = localChildren.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        grade: "3 класс",
        avatar: c.avatar || "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop&crop=faces",
        balance: 8,
        stars: 10,
        nextLesson: "Расписание формируется",
        teacher: "Анна Сергеевна Иванова",
        subject: "Математика и логика",
      }));
      return NextResponse.json({ children: mapped });
    }

    return NextResponse.json({ children: [] });
  } catch (err: any) {
    console.error("GET parent/children error:", err);
    return NextResponse.json({ children: [] });
  }
}

export async function POST(request: Request) {
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(`parent-create-child:${clientIp}`, 20, 60);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Слишком много запросов на создание. Подождите минуту." },
      { status: 429 }
    );
  }

  try {
    const auth = await authenticateRequest(request);
    const body = await request.json();

    const name = (body.name || "").trim();
    const grade = (body.grade || "3 класс").trim();
    const rawLogin = (body.login || "").trim();
    const password = (body.password || "").trim();
    const avatarUrl =
      body.avatarUrl ||
      "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop&crop=faces";
    const parentId = auth.user?.id || body.parentId;

    if (!name) {
      return NextResponse.json({ error: "Пожалуйста, укажите имя и фамилию ребёнка." }, { status: 400 });
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "Пароль должен содержать не менее 6 символов." },
        { status: 400 }
      );
    }

    // Формируем корректный e-mail/логин для Supabase Auth
    let finalEmail = rawLogin;
    if (!finalEmail) {
      const translit = name
        .toLowerCase()
        .replace(/[а-яё]/g, (c: string) => {
          const map: Record<string, string> = {
            а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh",
            з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
            п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts",
            ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya"
          };
          return map[c] || "";
        })
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 15);
      finalEmail = `${translit || "student"}_${Math.floor(1000 + Math.random() * 9000)}@umnichka.ru`;
    } else if (!finalEmail.includes("@")) {
      const sanitized = finalEmail.toLowerCase().replace(/[^a-z0-9._-]/g, "");
      finalEmail = `${sanitized || "student_" + Date.now()}@umnichka.ru`;
    } else {
      finalEmail = finalEmail.toLowerCase().trim();
    }

    const sb = createServerSupabase();

    // 1. Создаём аккаунт в Supabase Auth
    const { data: authData, error: authError } = await sb.auth.signUp({
      email: finalEmail,
      password: password,
      options: {
        data: {
          role: "STUDENT",
          full_name: name,
        },
      },
    });

    if (authError) {
      if (
        authError.message.includes("already registered") ||
        authError.message.includes("User already exists")
      ) {
        return NextResponse.json(
          { error: `Пользователь с логином «${finalEmail}» уже зарегистрирован. Пожалуйста, выберите другой логин.` },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const studentId = authData.user?.id;
    if (!studentId) {
      return NextResponse.json(
        { error: "Не удалось получить идентификатор созданного аккаунта." },
        { status: 500 }
      );
    }

    // 2. Создаем/обновляем профиль ученика в profiles
    const bioPayload = JSON.stringify({
      grade: grade,
      balance: 8,
      stars: 10,
      school: "Онлайн-школа «АйДаУмничка»",
      subjects: "Математика и логика",
    });

    const { error: profileError } = await sb.from("profiles").upsert({
      id: studentId,
      email: finalEmail,
      name: name,
      role: "STUDENT",
      avatar_url: avatarUrl,
      bio: bioPayload,
    });

    if (profileError) {
      console.error("Error creating student profile:", profileError);
    }

    // 3. Создаем связь с родителем в parent_students
    if (parentId) {
      const { error: relError } = await sb.from("parent_students").upsert({
        parent_id: parentId,
        student_id: studentId,
      });
      if (relError) {
        console.error("Error linking parent and student:", relError);
      }
    }

    return NextResponse.json({
      success: true,
      child: {
        id: studentId,
        name: name,
        email: finalEmail,
        grade: grade,
        avatar: avatarUrl,
        balance: 8,
        stars: 10,
        nextLesson: "Расписание формируется",
        teacher: "Анна Сергеевна Иванова",
        subject: "Математика и логика",
      },
      credentials: {
        login: finalEmail,
        password: password,
      },
    });
  } catch (err: any) {
    console.error("Unhandled error in parent create-child:", err);
    return NextResponse.json(
      { error: err?.message || "Внутренняя ошибка сервера при создании ребёнка." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await authenticateRequest(request);
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("id");

    if (!studentId) {
      return NextResponse.json({ error: "Не указан ID ученика для удаления." }, { status: 400 });
    }

    const sb = createServerSupabase();

    // Удаляем связь родитель-ученик
    await sb.from("parent_students").delete().eq("student_id", studentId);
    // Удаляем профиль
    await sb.from("profiles").delete().eq("id", studentId);

    return NextResponse.json({ success: true, deletedId: studentId });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Ошибка удаления профиля ребёнка." },
      { status: 500 }
    );
  }
}
