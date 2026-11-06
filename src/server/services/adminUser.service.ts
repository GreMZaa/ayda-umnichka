import { supabaseAdmin, supabaseServer } from '../config/database';
import { UserRepository } from '../repositories/user.repository';
import { AppError } from '../middleware/apiErrors';

const PROTECTED_PUBLIC_IDS = new Set(['admin_head', 'admin', 'admin_session']);

export class AdminUserService {
  /** Permanently remove student or teacher from Supabase Auth and platform tables. */
  static async deleteStudentOrTeacherAccount(publicIdRaw: string) {
    const publicId = publicIdRaw.trim().toLowerCase();
    if (!publicId) {
      throw new AppError('Укажите ID пользователя (public_id)', 400);
    }
    if (PROTECTED_PUBLIC_IDS.has(publicId) || publicId.startsWith('admin_')) {
      throw new AppError('Нельзя удалить учётную запись администратора', 403);
    }

    const binding = await UserRepository.findBindingByPublicId(publicId);
    if (!binding) {
      throw new AppError('Пользователь не найден в базе', 404);
    }

    const role = String(binding.role || '').toLowerCase();
    if (role === 'admin') {
      throw new AppError('Нельзя удалить администратора', 403);
    }
    if (role !== 'student' && role !== 'teacher') {
      throw new AppError('Удаление доступно только для учеников и педагогов', 400);
    }

    await supabaseServer
      .from('teacher_students')
      .delete()
      .or(`student_public_id.eq.${publicId},teacher_public_id.eq.${publicId}`);

    const authUserId = binding.auth_user_id as string | null | undefined;
    if (authUserId) {
      const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(authUserId);
      if (authErr) {
        console.error('admin deleteUser failed:', authErr.message);
        throw new AppError(
          authErr.message || 'Не удалось удалить пользователя из Supabase Auth',
          502
        );
      }
    }

    const { error: bindDelErr } = await UserRepository.deleteBindingByPublicId(publicId);
    if (bindDelErr) {
      console.error('delete user_bindings failed:', bindDelErr);
      throw new AppError(
        bindDelErr.message || 'Не удалось удалить запись user_bindings',
        500
      );
    }

    return {
      success: true,
      message: `Аккаунт ${binding.full_name || publicId} (${role}) удалён`,
      publicId,
      role,
    };
  }
}
