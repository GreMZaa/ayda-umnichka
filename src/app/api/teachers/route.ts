import { UserController } from '@/server/controllers/user.controller';

export const dynamic = 'force-dynamic';

export type { TeacherRecord } from '@/server/services/user.service';

export async function GET() {
  return UserController.getTeachers();
}
