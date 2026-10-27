import { NextRequest } from 'next/server';
import { BalanceController } from '@/server/controllers/balance.controller';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  return BalanceController.adjustAdmin(req);
}
