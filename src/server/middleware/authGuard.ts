import { NextRequest } from 'next/server';
import { env } from '../config/env';

export interface AuthContext {
  isAdmin: boolean;
  isTeacher: boolean;
  role?: string;
  userId?: string;
  authUserId?: string;
}

export function extractAuthContext(req: NextRequest): AuthContext {
  const roleCookie =
    req.cookies.get('aida_active_role')?.value || req.cookies.get('aida_role')?.value;
  const authHeader = req.headers.get('authorization');
  const userId =
    req.cookies.get('aida_auth_user_id')?.value || req.cookies.get('aida_user_id')?.value;

  const hasSecret = Boolean(
    authHeader && authHeader === `Bearer ${env.ADMIN_SECRET_KEY}`
  );

  const isAdmin = roleCookie === 'admin' || hasSecret;
  const isTeacher = roleCookie === 'teacher' || isAdmin;

  return {
    isAdmin,
    isTeacher,
    role: roleCookie,
    userId,
  };
}
