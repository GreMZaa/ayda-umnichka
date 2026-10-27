import { LessonController } from '@/server/controllers/lesson.controller';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  return LessonController.createQuickLesson(req);
}
