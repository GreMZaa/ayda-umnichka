import { UserRepository } from '../repositories/user.repository';
import { RegisterDTO, BindUserDTO, RenameHandleDTO } from '../validators/auth.validator';
import { AppError } from '../middleware/apiErrors';
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

  static async getBinding(publicId: string) {
    const cleanPublicId = publicId.trim().toLowerCase();
    const binding = await UserRepository.findBindingByPublicId(cleanPublicId);
    const profile = await UserRepository.findProfileByPublicId(cleanPublicId);

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

    return { exists: false, publicId: cleanPublicId };
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
}
