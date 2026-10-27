import { NextRequest } from 'next/server';
import { MessengerService } from '../services/messenger.service';
import { extractAuthContext } from '../middleware/authGuard';
import { apiSuccess, apiError } from '../middleware/apiErrors';

export class MessengerController {
  static async getMessengerData(req: NextRequest) {
    try {
      const auth = extractAuthContext(req);
      const { searchParams } = new URL(req.url);
      const queryUserId = searchParams.get('userId')?.trim() || searchParams.get('id')?.trim();
      const queryRole = searchParams.get('role')?.trim();

      const cookieUserId =
        req.cookies.get('aida_auth_user_id')?.value?.trim() ||
        req.cookies.get('aida_user_id')?.value?.trim();
      const cookieRole =
        req.cookies.get('aida_active_role')?.value?.trim() ||
        req.cookies.get('aida_role')?.value?.trim();

      // IDOR guard: non-admin/teacher cannot spy on someone else's messages
      let targetUserId = cookieUserId || queryUserId || 'id179017';
      if (!auth.isTeacher && !auth.isAdmin && cookieUserId && queryUserId && queryUserId !== cookieUserId) {
        targetUserId = cookieUserId;
      }

      const result = await MessengerService.getMessengerData({
        queryUserId: targetUserId,
        queryRole,
        cookieUserId,
        cookieRole,
      });

      return apiSuccess(result, 200);
    } catch (err: any) {
      console.error('MessengerController.getMessengerData error:', err);
      return apiError(err.message || 'Ошибка сервера', err.statusCode || 500);
    }
  }

  static async sendMessage(req: NextRequest) {
    try {
      const auth = extractAuthContext(req);
      const cookieUserId =
        req.cookies.get('aida_auth_user_id')?.value?.trim() ||
        req.cookies.get('aida_user_id')?.value?.trim();

      const body = await req.json();
      const effectiveSenderPublicId = (!auth.isAdmin && cookieUserId) ? cookieUserId : (body.senderPublicId || cookieUserId);

      const result = await MessengerService.sendMessage({
        ...body,
        senderPublicId: effectiveSenderPublicId,
      });
      return apiSuccess(result, 200);
    } catch (err: any) {
      console.error('MessengerController.sendMessage error:', err);
      return apiError(err.message || 'Ошибка отправки', err.statusCode || 500);
    }
  }
}
