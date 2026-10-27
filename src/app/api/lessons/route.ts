import { NextRequest } from 'next/server';
import { LessonController } from '@/server/controllers/lesson.controller';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return LessonController.getLessons(req);
}

export async function POST(req: NextRequest) {
  return LessonController.saveLesson(req);
}

export async function DELETE(req: NextRequest) {
  return LessonController.deleteLesson(req);
}
