import { AppError } from '../middleware/apiErrors';

export interface CreateHomeworkDTO {
  title: string;
  task_description: string;
  student_public_id?: string | null;
  student_name?: string;
  teacher_name?: string;
  task_file_url?: string | null;
  file_name?: string | null;
}

export function validateCreateHomeworkInput(body: any): CreateHomeworkDTO {
  if (!body || typeof body !== 'object') {
    throw new AppError('Некорректное тело запроса', 400);
  }

  const { title, task_description } = body;
  if (!title || !task_description) {
    throw new AppError('Необходимо указать название и описание задания', 400);
  }

  return {
    title: String(title).trim(),
    task_description: String(task_description).trim(),
    student_public_id: body.student_public_id ? String(body.student_public_id).trim() : null,
    student_name: body.student_name ? String(body.student_name).trim() : undefined,
    teacher_name: body.teacher_name ? String(body.teacher_name).trim() : undefined,
    task_file_url: body.task_file_url || null,
    file_name: body.file_name || null,
  };
}

export interface SubmitSolutionDTO {
  id: string;
  student_solution_text?: string;
  student_solution_file_url?: string;
}

export function validateSubmitSolutionInput(body: any): SubmitSolutionDTO {
  if (!body || typeof body !== 'object') {
    throw new AppError('Некорректное тело запроса', 400);
  }

  if (!body.id) {
    throw new AppError('Missing homework id', 400);
  }

  return {
    id: String(body.id).trim(),
    student_solution_text: body.student_solution_text !== undefined ? String(body.student_solution_text) : undefined,
    student_solution_file_url: body.student_solution_file_url !== undefined ? String(body.student_solution_file_url) : undefined,
  };
}
