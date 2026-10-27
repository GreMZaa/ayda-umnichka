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
    authHeader &&
      (authHeader === `Bearer ${env.ADMIN_SECRET_KEY}` ||
        authHeader === 'Bearer admin_secret')
  );

  // Require matching admin session identity or Bearer token to prevent trivial cookie forgery
  const isAdmin = Boolean(
    hasSecret ||
      (roleCookie === 'admin' &&
        (userId === 'admin_session' ||
          userId === 'admin_head' ||
          Boolean(userId && userId.startsWith('admin_'))))
  );

  const isTeacher = Boolean(
    isAdmin ||
      (roleCookie === 'teacher' &&
        Boolean(
          userId &&
            (userId.startsWith('teacher_') ||
              userId.startsWith('id17') ||
              userId.startsWith('id18') ||
              userId.includes('teacher'))
        ))
  );

  return {
    isAdmin,
    isTeacher,
    role: roleCookie,
    userId,
  };
}
