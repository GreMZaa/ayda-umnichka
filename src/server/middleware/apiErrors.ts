import { NextResponse } from 'next/server';

export class AppError extends Error {
  public statusCode: number;
  public details?: any;

  constructor(message: string, statusCode: number = 400, details?: any) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function apiSuccess<T>(data: T, status: number = 200, init?: ResponseInit) {
  return NextResponse.json(data, { status, ...init });
}

export function apiError(message: string, status: number = 400, details?: any) {
  return NextResponse.json(
    {
      error: message,
      ...(details ? { details } : {}),
    },
    { status }
  );
}

export function withErrorHandler<T extends (...args: any[]) => Promise<Response>>(handler: T): T {
  return (async (...args: any[]) => {
    try {
      return await handler(...args);
    } catch (err: any) {
      if (err instanceof AppError) {
        return apiError(err.message, err.statusCode, err.details);
      }
      console.error('Unhandled API Error:', err);
      return apiError(err?.message || 'Внутренняя ошибка сервера', 500);
    }
  }) as T;
}
