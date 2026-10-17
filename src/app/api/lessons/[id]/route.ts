import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const lesson = db.getLessonById(params.id);
  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }
  return NextResponse.json(lesson);
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    if (body.status) {
      const updated = db.updateLessonStatus(params.id, body.status);
      return NextResponse.json(updated);
    }
    if (body.content) {
      const note = db.addLessonNote(
        params.id,
        body.authorId || "u-teacher-1",
        body.content,
        body.grade,
        body.feedback
      );
      return NextResponse.json(note);
    }
    return NextResponse.json({ error: "No valid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
