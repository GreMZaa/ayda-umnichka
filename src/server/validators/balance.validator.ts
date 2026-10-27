import { AppError } from '../middleware/apiErrors';

export interface AdminBalanceAdjustDTO {
  student_id?: string | null;
  amount: number;
  description?: string;
}

export function validateAdminBalanceAdjust(body: any): AdminBalanceAdjustDTO {
  if (!body || typeof body !== 'object') {
    throw new AppError('Некорректное тело запроса', 400);
  }

  if (body.amount === undefined || body.amount === null) {
    throw new AppError('Параметр amount обязателен', 400);
  }

  const amount = Number(body.amount);
  if (isNaN(amount)) {
    throw new AppError('Параметр amount должен быть числом', 400);
  }

  return {
    student_id: body.student_id ? String(body.student_id) : null,
    amount,
    description: body.description ? String(body.description) : undefined,
  };
}

export interface StudentBalanceAdjustDTO {
  studentPublicId?: string;
  studentName?: string;
  amount?: number;
  newBalance?: number;
  description?: string;
  isTeacherVerified?: boolean;
}

export function validateStudentBalanceAdjust(body: any): StudentBalanceAdjustDTO {
  if (!body || typeof body !== 'object') {
    throw new AppError('Некорректное тело запроса', 400);
  }

  const studentPublicId = body.studentPublicId ? String(body.studentPublicId).trim() : undefined;
  const studentName = body.studentName ? String(body.studentName).trim() : undefined;

  if (!studentPublicId && !studentName) {
    throw new AppError('Параметр studentPublicId или studentName обязателен', 400);
  }

  return {
    studentPublicId,
    studentName,
    amount: typeof body.amount === 'number' ? body.amount : undefined,
    newBalance: typeof body.newBalance === 'number' ? body.newBalance : undefined,
    description: body.description ? String(body.description) : undefined,
    isTeacherVerified: Boolean(body.isTeacherVerified),
  };
}
