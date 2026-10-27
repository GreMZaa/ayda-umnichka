import { NextRequest } from 'next/server';
import { RoomController } from '@/server/controllers/room.controller';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return RoomController.getMessages(req);
}

export async function POST(req: NextRequest) {
  return RoomController.addMessage(req);
}
