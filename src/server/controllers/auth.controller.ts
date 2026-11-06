import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '../services/auth.service';
import {
  validateRegisterInput,
  validateBindInput,
  validateRenameHandleInput,
} from '../validators/auth.validator';
import { extractAuthContext } from '../middleware/authGuard';
import { apiSuccess, apiError } from '../middleware/apiErrors';
import { checkRateLimit, getClientIp } from '../middleware/rateLimiter';
import { resolvePasswordResetRedirect } from '../config/authRedirects';

export class AuthController {
  static async register(req: NextRequest) {
    try {
      const ip = getClientIp(req);
      // Rate limit: max 15 registrations per 15 minutes per IP
      const rateCheck = checkRateLimit(`register_${ip}`, 15, 15 * 60 * 1000);
      if (!rateCheck.allowed) {
        return apiError(
          `Слишком много попыток регистрации. Пожалуйста, повторите через ${rateCheck.retryAfter} сек.`,
          429
        );
      }

      const body = await req.json();
      const validated = validateRegisterInput(body);
      const result = await AuthService.register(validated);
      return apiSuccess(result, 200);
    } catch (err: any) {
      return apiError(err.message, err.statusCode || 400);
    }
  }

  static async getBinding(req: NextRequest) {
    try {
      const { searchParams } = new URL(req.url);
      const publicId = searchParams.get('publicId')?.trim().toLowerCase();
      const authUserId = searchParams.get('authUserId')?.trim();
      const userId = searchParams.get('userId')?.trim();
      const target = publicId || authUserId || userId;

      if (!target) {
        return apiError('Missing publicId or authUserId', 400);
      }

      const result = await AuthService.getBinding(target);
      return NextResponse.json(result, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });
    } catch (err: any) {
      console.error('AuthController.getBinding error:', err);
      return apiError('Internal server error', 500);
    }
  }

  static async bindUser(req: NextRequest) {
    try {
      const body = await req.json();
      const validated = validateBindInput(body);
      const auth = extractAuthContext(req);
      const result = await AuthService.bindUser(validated, auth);
      return apiSuccess(result, 200);
    } catch (err: any) {
      console.error('AuthController.bindUser error:', err);
      return apiError(err.message || 'Internal server error', err.statusCode || 500);
    }
  }

  static async renameHandle(req: NextRequest) {
    try {
      const body = await req.json();
      const validated = validateRenameHandleInput(body);
      const result = await AuthService.renameHandle(validated);
      return apiSuccess(result, 200);
    } catch (err: any) {
      console.error('AuthController.renameHandle error:', err);
      return apiError(err.message || 'Internal server error', err.statusCode || 500);
    }
  }

  static async deleteBinding(req: NextRequest) {
    try {
      const { searchParams } = new URL(req.url);
      const publicId = searchParams.get('publicId')?.trim();

      if (!publicId) {
        return apiError('Missing publicId', 400);
      }

      const result = await AuthService.deleteBinding(publicId);
      return apiSuccess(result, 200);
    } catch (err: any) {
      return apiError(err.message, err.statusCode || 500);
    }
  }

  static async setPasswordByEmail(req: NextRequest) {
    try {
      const ip = getClientIp(req);
      const rateCheck = checkRateLimit(`set_password_${ip}`, 10, 15 * 60 * 1000);
      if (!rateCheck.allowed) {
        return apiError(
          `Слишком много попыток. Повторите через ${rateCheck.retryAfter} сек.`,
          429
        );
      }

      const body = await req.json();
      const email = body?.email ? String(body.email) : '';
      const newPassword = body?.newPassword ? String(body.newPassword) : '';

      const result = await AuthService.setPasswordByEmail(email, newPassword);
      return apiSuccess(result, 200);
    } catch (err: any) {
      return apiError(err.message, err.statusCode || 400);
    }
  }

  static async forgotPassword(req: NextRequest) {
    try {
      const ip = getClientIp(req);
      const ipLimit = checkRateLimit(`forgot_password_ip_${ip}`, 8, 60 * 60 * 1000);
      if (!ipLimit.allowed) {
        return apiError(
          `Слишком много запросов с вашего IP. Повторите через ${ipLimit.retryAfter} сек.`,
          429
        );
      }

      const body = await req.json();
      const emailOrPhone = body?.email ? String(body.email).trim() : '';
      const redirectTo = resolvePasswordResetRedirect(
        typeof body?.redirectTo === 'string' ? body.redirectTo : undefined
      );

      if (!emailOrPhone) {
        return apiError('Укажите email или телефон', 400);
      }

      const normalizedKey = emailOrPhone.includes('@')
        ? emailOrPhone.toLowerCase()
        : emailOrPhone.replace(/\D/g, '');
      const emailLimit = checkRateLimit(
        `forgot_password_email_${normalizedKey}`,
        1,
        5 * 60 * 1000
      );
      if (!emailLimit.allowed) {
        return apiError(
          `Письмо уже отправляли недавно. Повторите через ${emailLimit.retryAfter} сек.`,
          429
        );
      }

      const result = await AuthService.requestPasswordReset(emailOrPhone, redirectTo);
      return apiSuccess(result, 200);
    } catch (err: any) {
      return apiError(err.message, err.statusCode || 400);
    }
  }
}
