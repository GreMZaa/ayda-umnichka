import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { db, User as LocalUser } from "@/lib/db";
import { resolveProfileUsername } from "@/lib/nickname";
import { TEACHER_VASILINA_AVATAR, SHARONOV_AVATAR } from "@/lib/default-avatar";

export interface CleanUserResult {
  id: string;
  name: string;
  username: string;
  email: string;
  role: "TEACHER" | "STUDENT" | "PARENT" | "ADMIN";
  avatarUrl: string;
  phone?: string;
  grade?: string;
  subjects?: string;
  experience?: string;
  education?: string;
  school?: string;
  bio?: string;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const qRaw = searchParams.get("q") || "";
    const roleParam = searchParams.get("role")?.toUpperCase();
    const cleanQ = qRaw.trim().toLowerCase().replace(/^@/, "");

    const results: CleanUserResult[] = [];
    const seenIds = new Set<string>();

    // 1. Поиск в Supabase profiles
    try {
      const supabase = getSupabase();
      let query = supabase
        .from("profiles")
        .select("id, name, email, role, phone, avatar_url, bio");

      if (roleParam && ["TEACHER", "STUDENT", "PARENT", "ADMIN"].includes(roleParam)) {
        query = query.eq("role", roleParam);
      }

      const { data, error } = await query.order("name", { ascending: true }).limit(50);

      if (!error && Array.isArray(data)) {
        for (const p of data) {
          let parsedBio: any = {};
          try {
            if (p.bio && p.bio.startsWith("{")) {
              parsedBio = JSON.parse(p.bio);
            } else if (p.bio) {
              parsedBio.bio = p.bio;
            }
          } catch {
            // ignore
          }

          const uname = resolveProfileUsername({
            id: p.id,
            name: p.name,
            email: p.email,
            bio: p.bio,
          });

          let avatarUrl = p.avatar_url;
          if (!avatarUrl) {
            if (p.role === "TEACHER") {
              avatarUrl = TEACHER_VASILINA_AVATAR;
            } else {
              avatarUrl = SHARONOV_AVATAR;
            }
          }

          const userObj: CleanUserResult = {
            id: p.id,
            name: p.name || "Пользователь",
            username: uname,
            email: p.email || "",
            role: (p.role || "STUDENT").toUpperCase() as any,
            avatarUrl,
            phone: p.phone || parsedBio.phone || "",
            grade: parsedBio.grade || "",
            subjects: parsedBio.subjects || (p.role === "TEACHER" ? "Все дисциплины школы" : ""),
            experience: parsedBio.experience || "",
            education: parsedBio.education || "",
            school: parsedBio.school || "",
            bio: typeof parsedBio.bio === "string" ? parsedBio.bio : (typeof p.bio === "string" && !p.bio.startsWith("{") ? p.bio : ""),
          };

          // Фильтрация по строке поиска cleanQ
          if (cleanQ) {
            const matchName = userObj.name.toLowerCase().includes(cleanQ);
            const matchUsername = userObj.username.toLowerCase().includes(cleanQ);
            const matchEmail = userObj.email.toLowerCase().includes(cleanQ);
            const matchSubjects = (userObj.subjects || "").toLowerCase().includes(cleanQ);
            const matchGrade = (userObj.grade || "").toLowerCase().includes(cleanQ);
            const matchBio = (userObj.bio || "").toLowerCase().includes(cleanQ);

            if (matchName || matchUsername || matchEmail || matchSubjects || matchGrade || matchBio) {
              results.push(userObj);
              seenIds.add(userObj.id);
            }
          } else {
            results.push(userObj);
            seenIds.add(userObj.id);
          }
        }
      }
    } catch (supaErr) {
      console.warn("Supabase profiles query error in /api/users/search:", supaErr);
    }

    // 2. Дополнение из локальной базы db.json
    try {
      const localUsers: LocalUser[] = db.getUsers();
      for (const u of localUsers) {
        if (seenIds.has(u.id)) continue;
        if (roleParam && u.role !== roleParam) continue;

        let parsedBio: any = {};
        try {
          if (u.bio && u.bio.startsWith("{")) {
            parsedBio = JSON.parse(u.bio);
          } else if (u.bio) {
            parsedBio.bio = u.bio;
          }
        } catch {
          // ignore
        }

        const uname = resolveProfileUsername({
          id: u.id,
          name: u.name,
          email: u.email,
          bio: u.bio,
        });

        const userObj: CleanUserResult = {
          id: u.id,
          name: u.name,
          username: uname,
          email: u.email,
          role: u.role,
          avatarUrl: u.avatar || (u.role === "TEACHER" ? TEACHER_VASILINA_AVATAR : SHARONOV_AVATAR),
          phone: u.phone || "",
          grade: parsedBio.grade || (u.role === "STUDENT" ? "3 класс" : ""),
          subjects: parsedBio.subjects || (u.role === "TEACHER" ? "Математика и логика" : ""),
          experience: parsedBio.experience || "",
          education: parsedBio.education || "",
          school: parsedBio.school || "",
          bio: typeof parsedBio.bio === "string" ? parsedBio.bio : (typeof u.bio === "string" && !u.bio.startsWith("{") ? u.bio : ""),
        };

        if (cleanQ) {
          const matchName = userObj.name.toLowerCase().includes(cleanQ);
          const matchUsername = userObj.username.toLowerCase().includes(cleanQ);
          const matchEmail = userObj.email.toLowerCase().includes(cleanQ);
          const matchSubjects = (userObj.subjects || "").toLowerCase().includes(cleanQ);
          const matchGrade = (userObj.grade || "").toLowerCase().includes(cleanQ);
          const matchBio = (userObj.bio || "").toLowerCase().includes(cleanQ);

          if (matchName || matchUsername || matchEmail || matchSubjects || matchGrade || matchBio) {
            results.push(userObj);
            seenIds.add(userObj.id);
          }
        } else {
          results.push(userObj);
          seenIds.add(userObj.id);
        }
      }
    } catch (dbErr) {
      console.warn("Local DB fallback error in /api/users/search:", dbErr);
    }

    return NextResponse.json({
      success: true,
      users: results,
      total: results.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to search users" },
      { status: 500 }
    );
  }
}
