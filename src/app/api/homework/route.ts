import { NextRequest } from 'next/server';
import { HomeworkController } from '@/server/controllers/homework.controller';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return HomeworkController.getHomework(req);
}

export async function POST(req: NextRequest) {
  return HomeworkController.saveHomework(req);
}

export async function DELETE(req: NextRequest) {
  return HomeworkController.deleteHomework(req);
}
