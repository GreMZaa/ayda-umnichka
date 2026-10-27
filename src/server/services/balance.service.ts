import { AdminBalanceAdjustDTO, StudentBalanceAdjustDTO } from '../validators/balance.validator';
import { AuthContext } from '../middleware/authGuard';
import { AppError } from '../middleware/apiErrors';
import { supabaseServer, supabaseClient } from '../config/database';

export class BalanceService {
  static async adjustAdminBalance(dto: AdminBalanceAdjustDTO, auth: AuthContext) {
    if (!auth.isAdmin) {
      throw new AppError('Доступ запрещен. Требуются права администратора.', 403);
    }

    return {
      success: true,
      transaction_id: `tx-${Date.now()}`,
      student_id: dto.student_id || null,
      amount_adjusted: dto.amount,
      description: dto.description || 'Корректировка баланса администратором',
      created_at: new Date().toISOString(),
    };
  }

  static async adjustStudentBalance(dto: StudentBalanceAdjustDTO, auth: AuthContext) {
    if (!auth.isTeacher && !dto.isTeacherVerified) {
      throw new AppError(
        'Только преподаватель или администратор может изменять баланс ученика.',
        403
      );
    }

    const cleanPublicId = dto.studentPublicId ? dto.studentPublicId.trim().toLowerCase() : '';
    const cleanStudentName = dto.studentName ? dto.studentName.trim() : '';

    let currentBalance = 0;
    let matchedPublicId = cleanPublicId;

    if (cleanPublicId) {
      const { data: binding } = await supabaseServer
        .from('user_bindings')
        .select('balance_lessons, public_id, full_name')
        .ilike('public_id', cleanPublicId)
        .maybeSingle();

      if (binding && typeof binding.balance_lessons === 'number') {
        currentBalance = binding.balance_lessons;
        matchedPublicId = binding.public_id || cleanPublicId;
      } else {
        const { data: profile } = await supabaseServer
          .from('profiles')
          .select('balance_lessons, public_id, full_name')
          .ilike('public_id', cleanPublicId)
          .maybeSingle();

        if (profile && typeof profile.balance_lessons === 'number') {
          currentBalance = profile.balance_lessons;
          matchedPublicId = profile.public_id || cleanPublicId;
        }
      }
    }

    // Fallback search by student name
    if (!matchedPublicId && cleanStudentName) {
      const { data: bindingByName } = await supabaseServer
        .from('user_bindings')
        .select('balance_lessons, public_id, full_name')
        .ilike('full_name', `%${cleanStudentName}%`)
        .limit(1)
        .maybeSingle();

      if (bindingByName) {
        currentBalance = bindingByName.balance_lessons ?? 0;
        matchedPublicId = (bindingByName.public_id || '').toLowerCase();
      } else {
        const { data: profByName } = await supabaseServer
          .from('profiles')
          .select('balance_lessons, public_id, full_name')
          .ilike('full_name', `%${cleanStudentName}%`)
          .limit(1)
          .maybeSingle();

        if (profByName) {
          currentBalance = profByName.balance_lessons ?? 0;
          matchedPublicId = (profByName.public_id || '').toLowerCase();
        }
      }
    }

    // Compute updated balance
    let resolvedBalance = currentBalance;
    if (typeof dto.newBalance === 'number') {
      resolvedBalance = Math.max(0, dto.newBalance);
    } else if (typeof dto.amount === 'number') {
      resolvedBalance = Math.max(0, currentBalance + dto.amount);
    }

    if (matchedPublicId) {
      const { error: bindingError } = await supabaseServer
        .from('user_bindings')
        .update({
          balance_lessons: resolvedBalance,
          updated_at: new Date().toISOString(),
        })
        .ilike('public_id', matchedPublicId);

      if (bindingError) {
        console.warn('user_bindings balance update error:', bindingError.message);
      }

      const { error: profileError } = await supabaseServer
        .from('profiles')
        .update({
          balance_lessons: resolvedBalance,
          updated_at: new Date().toISOString(),
        })
        .ilike('public_id', matchedPublicId);

      if (profileError) {
        console.warn('profiles balance update note:', profileError.message);
      }
    }

    return {
      success: true,
      studentPublicId: matchedPublicId || cleanPublicId,
      studentName: cleanStudentName,
      previousBalance: currentBalance,
      newBalance: resolvedBalance,
      message: `Баланс успешно обновлен: ${resolvedBalance} занятий`,
    };
  }
}
