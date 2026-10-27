import { AppError } from '../middleware/apiErrors';

export interface CreateLessonDTO {
  room_token?: string;
  topic?: string;
  student_public_id?: string | null;
  student_name?: string;
  teacher_name?: string;
  scheduled_for?: string;
  duration_minutes?: number;
  status?: string;
}

export function validateCreateLessonInput(body: any): CreateLessonDTO {
  if (!body || typeof body !== 'object') {
    throw new AppError('Некорректное тело запроса', 400);
  }

  return {
    room_token: body.room_token ? String(body.room_token).trim() : undefined,
    topic: body.topic ? String(body.topic).trim() : undefined,
    student_public_id: body.student_public_id ? String(body.student_public_id).trim() : null,
    student_name: body.student_name ? String(body.student_name).trim() : undefined,
    teacher_name: body.teacher_name ? String(body.teacher_name).trim() : undefined,
    scheduled_for: body.scheduled_for ? String(body.scheduled_for) : undefined,
    duration_minutes: typeof body.duration_minutes === 'number' ? body.duration_minutes : undefined,
    status: body.status ? String(body.status) : undefined,
  };
}

export interface UpdateLessonDTO {
  id?: string;
  room_token?: string;
  action?: string;
  status?: string;
  started_at?: string;
  duration_minutes?: number;
  teacher_summary?: string;
  topic?: string;
  student_name?: string;
  teacher_name?: string;
}

export function validateUpdateLessonInput(body: any): UpdateLessonDTO {
  if (!body || typeof body !== 'object') {
    throw new AppError('Некорректное тело запроса', 400);
  }

  return {
    id: body.id ? String(body.id).trim() : undefined,
    room_token: body.room_token ? String(body.room_token).trim() : undefined,
    action: body.action ? String(body.action).trim() : undefined,
    status: body.status ? String(body.status).trim() : undefined,
    started_at: body.started_at ? String(body.started_at) : undefined,
    duration_minutes: typeof body.duration_minutes === 'number' ? body.duration_minutes : undefined,
    teacher_summary: body.teacher_summary !== undefined ? String(body.teacher_summary) : undefined,
    topic: body.topic ? String(body.topic).trim() : undefined,
    student_name: body.student_name ? String(body.student_name).trim() : undefined,
    teacher_name: body.teacher_name ? String(body.teacher_name).trim() : undefined,
  };
}
