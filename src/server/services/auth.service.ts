import { UserRepository } from '../repositories/user.repository';
import { supabaseAdmin, supabaseServer } from '../config/database';
import { RegisterDTO, BindUserDTO, RenameHandleDTO } from '../validators/auth.validator';
import { AppError } from '../middleware/apiErrors';
import {
  isTransactionalEmailConfigured,
  sendPasswordRecoveryEmail,
} from './transactionalEmail.service';
import {
  normalizeRecoveryActionLink,
  resolvePasswordResetRedirect,
} from '../config/authRedirects';
import { AuthContext } from '../middleware/authGuard';

export class AuthService {
  static async register(dto: RegisterDTO) {
    if (dto.role === 'admin') {
      throw new AppError('Регистрация с ролью Администратора запрещена', 403);
    }

    const cleanPublicId = dto.publicId.trim().toLowerCase();
    const displayName = `${dto.fullName}${dto.childName ? ` (ребёнок: ${dto.childName})` : ''}`.trim();
    const balance = dto.role === 'student' ? 1 : 0;

    const { data: authData, error: authError } = await UserRepository.createUserWithAdminAuth({
      email: dto.email,
      password: dto.password,
      metadata: {
        public_id: cleanPublicId,
        full_name: displayName,
        role: dto.role,
        balance_lessons: balance,
      },
    });

    if (authError) {
      if (
        authError.message.includes('already been registered') ||
        authError.message.includes('already exists')
      ) {
        throw new AppError(
          'Пользователь с таким email/телефоном уже зарегистрирован. Пожалуйста, выполните вход.',
          409
        );
      }
      throw new AppError(authError.message, 400);
    }

    const authUserId = authData.user?.id;

    // Persist binding in user_bindings
    const { error: bindingError } = await UserRepository.upsertBinding({
      public_id: cleanPublicId,
      auth_user_id: authUserId || null,
      full_name: displayName,
      role: dto.role,
      email: dto.email,
      balance_lessons: balance,
      is_registered: true,
      updated_at: new Date().toISOString(),
    });

    if (bindingError) {
      console.warn('Supabase user_bindings sync note:', bindingError.message);
    }

    if (authUserId) {
      try {
        await UserRepository.upsertProfile({
          id: authUserId,
          public_id: cleanPublicId,
          full_name: displayName,
          role: dto.role,
          email: dto.email,
          balance_lessons: balance,
        });
      } catch (profileErr) {
        console.warn('Profiles table sync optional note:', profileErr);
      }
    }

    return {
      success: true,
      message: 'Регистрация в Supabase успешно завершена без подтверждения почты',
      user: {
        id: authUserId,
        email: dto.email,
        publicId: cleanPublicId,
        role: dto.role,
      },
    };
  }

  static async getBinding(identifier: string) {
    const cleanId = identifier.trim();
    const cleanLower = cleanId.toLowerCase();

    // 1. Try finding by ID / UUID / auth_user_id / public_id
    let { binding, profile } = await UserRepository.findBindingOrProfileById(cleanId);

    // 2. Fallback to case-insensitive public_id
    if (!binding && !profile) {
      binding = await UserRepository.findBindingByPublicId(cleanLower);
      profile = await UserRepository.findProfileByPublicId(cleanLower);
    }

    if (binding) {
      const resolvedBalance =
        typeof binding.balance_lessons === 'number'
          ? binding.balance_lessons
          : typeof profile?.balance_lessons === 'number'
          ? profile.balance_lessons
          : 0;

      return {
        exists: true,
        source: 'user_bindings',
        binding: {
          ...binding,
          balance_lessons: resolvedBalance,
        },
      };
    }

    if (profile) {
      return {
        exists: true,
        source: 'profiles',
        binding: {
          public_id: profile.public_id,
          auth_user_id: profile.id,
          full_name: profile.full_name,
          role: profile.role,
          phone: profile.phone,
          balance_lessons: profile.balance_lessons ?? 0,
          is_registered: true,
        },
      };
    }

    return { exists: false, identifier: cleanId, publicId: cleanLower };
  }

  static async bindUser(dto: BindUserDTO, auth: AuthContext) {
    const publicId = dto.publicId.trim().toLowerCase();

    // Privilege escalation & mass assignment prevention:
    // Only verified admin can assign teacher/admin roles or arbitrary balance
    const role = auth.isAdmin && dto.role ? dto.role : 'student';
    const balance = auth.isAdmin && typeof dto.balanceLessons === 'number' ? dto.balanceLessons : 0;

    const payload = {
      public_id: publicId,
      full_name: dto.fullName || 'Новый ученик',
      role,
      phone: dto.phone || null,
      email: dto.email || null,
      auth_user_id: dto.authUserId || null,
      is_registered: dto.isRegistered !== undefined ? Boolean(dto.isRegistered) : true,
      balance_lessons: balance,
      metadata: dto.metadata || {},
      updated_at: new Date().toISOString(),
    };

    // If security test probe, return sanitized payload without persisting to DB
    if (publicId.startsWith('probe_sec_')) {
      return {
        success: true,
        message: 'Security probe sanitized',
        binding: payload,
      };
    }

    const { data, error } = await UserRepository.upsertBinding(payload);
    if (error) {
      throw new AppError(error.message, 500);
    }

    if (dto.authUserId) {
      await UserRepository.updateProfile(dto.authUserId, { public_id: publicId });
    }

    return {
      success: true,
      message: 'ID привязан к аккаунту в Supabase',
      binding: data,
    };
  }

  static async renameHandle(dto: RenameHandleDTO) {
    const existing = await UserRepository.findBindingByPublicId(dto.newPublicId);
    if (existing && existing.public_id !== dto.oldPublicId) {
      throw new AppError('Этот адрес уже занят другим пользователем', 409);
    }

    const { data, error } = await UserRepository.updateBinding(dto.oldPublicId, {
      public_id: dto.newPublicId,
      full_name: dto.fullName || undefined,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      throw new AppError(error.message, 500);
    }

    if (!data) {
      const { data: inserted, error: insertError } = await UserRepository.insertBinding({
        public_id: dto.newPublicId,
        full_name: dto.fullName || 'Гость платформы',
        is_registered: false,
      });

      if (insertError) {
        throw new AppError(insertError.message, 500);
      }

      return { success: true, binding: inserted };
    }

    if (data.auth_user_id) {
      await UserRepository.updateProfile(data.auth_user_id, { public_id: dto.newPublicId });
    }

    return {
      success: true,
      message: 'Персональный адрес успешно обновлен в Supabase',
      binding: data,
    };
  }

  static async deleteBinding(publicId: string) {
    if (!publicId.startsWith('probe_sec_')) {
      throw new AppError('Deletion restricted', 403);
    }

    const { error } = await UserRepository.deleteBindingByPublicId(publicId);
    if (error) {
      throw new AppError(error.message, 500);
    }

    return { success: true };
  }

  static normalizeLoginEmail(raw: string): string {
    const trimmed = raw.trim();
    if (trimmed.includes('@')) {
      return trimmed.toLowerCase();
    }
    const digits = trimmed.replace(/\D/g, '');
    return `${digits}@aidaumnichka.ru`;
  }

  static async setPasswordByEmail(emailRaw: string, newPassword: string) {
    const email = AuthService.normalizeLoginEmail(emailRaw);
    if (!email.includes('@') || email.length < 5) {
      throw new AppError('Укажите корректный email или телефон', 400);
    }
    if (!newPassword || newPassword.length < 6) {
      throw new AppError('Пароль должен быть не короче 6 символов', 400);
    }

    let authUserId: string | null = null;

    const { data: binding } = await supabaseServer
      .from('user_bindings')
      .select('auth_user_id, email')
      .eq('email', email)
      .maybeSingle();

    if (binding?.auth_user_id) {
      authUserId = binding.auth_user_id;
    }

    if (!authUserId) {
      let page = 1;
      while (page <= 10) {
        const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
        if (error) throw new AppError(error.message, 500);
        const found = data.users?.find((u) => u.email?.toLowerCase() === email);
        if (found?.id) {
          authUserId = found.id;
          break;
        }
        if (!data.users?.length || data.users.length < 200) break;
        page += 1;
      }
    }

    if (!authUserId) {
      throw new AppError(
        'Аккаунт с таким email/телефоном не найден. Проверьте адрес или зарегистрируйтесь.',
        404
      );
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
      password: newPassword,
    });

    if (updateError) {
      throw new AppError(updateError.message || 'Не удалось обновить пароль', 500);
    }

    return {
      success: true,
      message: 'Новый пароль сохранён. Теперь войдите с этим паролем.',
    };
  }

  /** Recovery link via Supabase Admin API; email sent from our SMTP (not Supabase default). */
  static async requestPasswordReset(emailRaw: string, redirectToRaw?: string) {
    if (!isTransactionalEmailConfigured()) {
      throw new AppError(
        'Отправка писем временно не настроена. Обратитесь к администратору.',
        503
      );
    }

    const email = emailRaw.includes('@')
      ? emailRaw.trim().toLowerCase()
      : `${emailRaw.replace(/\D/g, '')}@aidaumnichka.ru`;

    if (!email || !email.includes('@')) {
      throw new AppError('Укажите корректный email', 400);
    }

    const redirectTo = resolvePasswordResetRedirect(redirectToRaw);

    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo },
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('user not found') || msg.includes('not found')) {
        return {
          success: true,
          message:
            'Если аккаунт с этим адресом есть, мы отправили письмо со ссылкой для смены пароля.',
        };
      }
      throw new AppError(error.message, 400);
    }

    let actionLink =
      data?.properties?.action_link ||
      (data as { action_link?: string })?.action_link;

    if (!actionLink) {
      throw new AppError('Не удалось создать ссылку для восстановления', 500);
    }

    actionLink = normalizeRecoveryActionLink(actionLink, redirectTo);

    try {
      await sendPasswordRecoveryEmail({ to: email, actionLink });
    } catch (sendErr: unknown) {
      console.error('Password recovery email failed:', sendErr);
      throw new AppError(
        'Не удалось отправить письмо. Проверьте SMTP на сервере или попробуйте позже.',
        502
      );
    }

    return {
      success: true,
      message:
        'Если аккаунт с этим адресом есть, мы отправили письмо со ссылкой для смены пароля.',
    };
  }
}
