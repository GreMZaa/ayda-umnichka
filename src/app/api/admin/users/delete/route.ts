import { NextRequest } from 'next/server';
import { AdminController } from '@/server/controllers/admin.controller';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  return AdminController.deleteUserAccount(req);
}
