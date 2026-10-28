import { NextRequest } from 'next/server';
import { UserController } from '@/server/controllers/user.controller';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return UserController.getTeacherStudents(req);
}

export async function POST(req: NextRequest) {
  return UserController.addTeacherStudent(req);
}

export async function PUT(req: NextRequest) {
  return UserController.updateTeacherStudent(req);
}

export async function PATCH(req: NextRequest) {
  return UserController.updateTeacherStudent(req);
}

export async function DELETE(req: NextRequest) {
  return UserController.removeTeacherStudent(req);
}
