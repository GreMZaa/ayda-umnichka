import { NextRequest } from 'next/server';
import { MessengerService } from '../services/messenger.service';
import { apiSuccess, apiError } from '../middleware/apiErrors';

export class MessengerController {
  static async getMessengerData(req: NextRequest) {
    try {
      const { searchParams } = new URL(req.url);
      const queryUserId = searchParams.get('userId')?.trim() || searchParams.get('id')?.trim();
      const queryRole = searchParams.get('role')?.trim();

      const cookieUserId =
        req.cookies.get('aida_auth_user_id')?.value?.trim() ||
        req.cookies.get('aida_user_id')?.value?.trim();
      const cookieRole =
        req.cookies.get('aida_active_role')?.value?.trim() ||
        req.cookies.get('aida_role')?.value?.trim();

      const result = await MessengerService.getMessengerData({
        queryUserId,
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
      const body = await req.json();
      const result = await MessengerService.sendMessage(body);
      return apiSuccess(result, 200);
    } catch (err: any) {
      console.error('MessengerController.sendMessage error:', err);
      return apiError(err.message || 'Ошибка отправки', err.statusCode || 500);
    }
  }
}
