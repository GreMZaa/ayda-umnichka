import { NextRequest } from 'next/server';
import { extractAuthContext } from '../middleware/authGuard';
import { apiSuccess, apiError, AppError } from '../middleware/apiErrors';
import { AdminUserService } from '../services/adminUser.service';
import { checkRateLimit, getClientIp } from '../middleware/rateLimiter';

export class AdminController {
  static async deleteUserAccount(req: NextRequest) {
    try {
      const auth = extractAuthContext(req);
      if (!auth.isAdmin) {
        return apiError('Доступ запрещен. Требуются права администратора.', 403);
      }

      const ip = getClientIp(req);
      const limit = checkRateLimit(`admin_delete_user_${ip}`, 20, 15 * 60 * 1000);
      if (!limit.allowed) {
        return apiError(`Слишком много удалений. Повторите через ${limit.retryAfter} сек.`, 429);
      }

      const body = await req.json();
      const publicId = body?.publicId ? String(body.publicId) : '';
      const result = await AdminUserService.deleteStudentOrTeacherAccount(publicId);
      return apiSuccess(result, 200);
    } catch (err: unknown) {
      if (err instanceof AppError) {
        return apiError(err.message, err.statusCode, err.details);
      }
      const e = err as { message?: string };
      return apiError(e.message || 'Internal error', 500);
    }
  }
}
