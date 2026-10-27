import { NextRequest } from 'next/server';
import { AuthController } from '@/server/controllers/auth.controller';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  return AuthController.getBinding(req);
}

export async function POST(req: NextRequest) {
  return AuthController.bindUser(req);
}

export async function PUT(req: NextRequest) {
  return AuthController.renameHandle(req);
}

export async function DELETE(req: NextRequest) {
  return AuthController.deleteBinding(req);
}
