import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const teacherId = searchParams.get("teacherId") || undefined;
  const studentId = searchParams.get("studentId") || undefined;
  const status = (searchParams.get("status") as any) || undefined;

  const lessons = db.getLessons({ teacherId, studentId, status });
  return NextResponse.json(lessons);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newLesson = db.createLesson(body);
    return NextResponse.json(newLesson);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
