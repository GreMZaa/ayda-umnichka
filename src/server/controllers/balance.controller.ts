import { NextRequest } from 'next/server';
import { BalanceService } from '../services/balance.service';
import {
  validateAdminBalanceAdjust,
  validateStudentBalanceAdjust,
} from '../validators/balance.validator';
import { extractAuthContext } from '../middleware/authGuard';
import { apiSuccess, apiError } from '../middleware/apiErrors';

export class BalanceController {
  static async adjustAdmin(req: NextRequest) {
    try {
      const auth = extractAuthContext(req);
      if (!auth.isAdmin) {
        return apiError('Доступ запрещен. Требуются права администратора.', 403);
      }

      const body = await req.json();
      const validated = validateAdminBalanceAdjust(body);
      const result = await BalanceService.adjustAdminBalance(validated, auth);
      return apiSuccess(result, 200);
    } catch (err: any) {
      return apiError(err.message || 'Internal error', err.statusCode || 400);
    }
  }

  static async adjustStudent(req: NextRequest) {
    try {
      const auth = extractAuthContext(req);
      const body = await req.json();

      if (!auth.isTeacher && !body.isTeacherVerified) {
        return apiError(
          'Только преподаватель или администратор может изменять баланс ученика.',
          403
        );
      }

      const validated = validateStudentBalanceAdjust(body);
      const result = await BalanceService.adjustStudentBalance(validated, auth);
      return apiSuccess(result, 200);
    } catch (err: any) {
      console.error('BalanceController.adjustStudent error:', err);
      return apiError(err.message || 'Internal server error', err.statusCode || 500);
    }
  }
}
