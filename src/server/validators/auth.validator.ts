import { AppError } from '../middleware/apiErrors';

export interface RegisterDTO {
  email: string;
  password: string;
  fullName: string;
  childName?: string;
  role?: string;
  publicId: string;
}

export function validateRegisterInput(body: any): RegisterDTO {
  if (!body || typeof body !== 'object') {
    throw new AppError('Некорректное тело запроса', 400);
  }

  const { email, password, fullName, childName, role = 'student', publicId } = body;

  if (!email || !password || !fullName || !publicId) {
    throw new AppError('Пожалуйста, заполните все обязательные поля', 400);
  }

  if (typeof email !== 'string' || !email.includes('@')) {
    throw new AppError('Укажите корректный email адрес', 400);
  }

  if (role === 'admin') {
    throw new AppError('Регистрация с ролью Администратора запрещена', 403);
  }

  return {
    email: email.trim().toLowerCase(),
    password: String(password),
    fullName: fullName.trim(),
    childName: childName ? String(childName).trim() : undefined,
    role: String(role),
    publicId: String(publicId).trim().toLowerCase(),
  };
}

export interface BindUserDTO {
  publicId: string;
  fullName?: string;
  phone?: string;
  email?: string;
  authUserId?: string;
  isRegistered?: boolean;
  role?: string;
  balanceLessons?: number;
  metadata?: Record<string, any>;
}

export function validateBindInput(body: any): BindUserDTO {
  if (!body || typeof body !== 'object') {
    throw new AppError('Missing body', 400);
  }

  const publicId = body.publicId ? String(body.publicId).trim().toLowerCase() : '';
  if (!publicId) {
    throw new AppError('Missing publicId', 400);
  }

  return {
    publicId,
    fullName: body.fullName,
    phone: body.phone,
    email: body.email,
    authUserId: body.authUserId,
    isRegistered: body.isRegistered,
    role: body.role,
    balanceLessons: body.balanceLessons,
    metadata: body.metadata,
  };
}

export interface RenameHandleDTO {
  oldPublicId: string;
  newPublicId: string;
  fullName?: string;
}

export function validateRenameHandleInput(body: any): RenameHandleDTO {
  if (!body || typeof body !== 'object') {
    throw new AppError('Missing body', 400);
  }

  const oldPublicId = body.oldPublicId ? String(body.oldPublicId).trim().toLowerCase() : '';
  const newPublicId = body.newPublicId ? String(body.newPublicId).trim().toLowerCase() : '';

  if (!oldPublicId || !newPublicId) {
    throw new AppError('Missing oldPublicId or newPublicId', 400);
  }

  return {
    oldPublicId,
    newPublicId,
    fullName: body.fullName,
  };
}
