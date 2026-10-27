import { NextRequest } from 'next/server';
import { UserController } from '@/server/controllers/user.controller';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return UserController.getStudents(req);
}
