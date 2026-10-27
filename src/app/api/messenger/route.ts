import { NextRequest } from 'next/server';
import { MessengerController } from '@/server/controllers/messenger.controller';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return MessengerController.getMessengerData(req);
}

export async function POST(req: NextRequest) {
  return MessengerController.sendMessage(req);
}
