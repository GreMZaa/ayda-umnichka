import { UserController } from '@/server/controllers/user.controller';

export const dynamic = 'force-dynamic';

export async function GET() {
  return UserController.getProfile();
}
