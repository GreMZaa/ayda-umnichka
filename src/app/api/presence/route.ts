import { NextRequest } from 'next/server';
import { PresenceController } from '@/server/controllers/presence.controller';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return PresenceController.getPresence(req);
}

export async function POST(req: NextRequest) {
  return PresenceController.updatePresence(req);
}
