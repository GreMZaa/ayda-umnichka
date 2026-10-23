import { z } from "zod";

export const LessonStatusEnum = z.enum(["SCHEDULED", "LIVE", "COMPLETED", "CANCELLED"]);

// Схема создания урока (только разрешенные поля, исключение mass assignment)
export const CreateLessonSchema = z.object({
  title: z
    .string()
    .min(3, "Название урока должно быть не менее 3 символов")
    .max(120, "Название урока не может превышать 120 символов")
    .trim(),
  subjectId: z.string().min(1).max(50).trim(),
  subjectName: z.string().min(1).max(80).trim(),
  subjectColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Некорректный HEX-код цвета"),
  teacherId: z.string().min(1).max(100).trim(),
  teacherName: z.string().min(1).max(100).trim().optional(),
  studentId: z.string().min(1).max(100).trim(),
  studentName: z.string().min(1).max(100).trim().optional(),
  startTime: z.string().datetime("Некорректный формат времени начала (ISO 8601)"),
  endTime: z.string().datetime("Некорректный формат времени окончания (ISO 8601)"),
  status: LessonStatusEnum.default("SCHEDULED"),
  roomName: z
    .string()
    .min(3, "Имя комнаты должно содержать минимум 3 символа")
    .max(64, "Имя комнаты не должно превышать 64 символа")
    .regex(/^[a-zA-Z0-9_-]+$/, "Имя комнаты может содержать только латинские буквы, цифры, дефис и подчеркивание"),
});

// Схема обновления статуса
export const UpdateLessonStatusSchema = z.object({
  status: LessonStatusEnum,
});

// Схема добавления заметки/оценки учителя к уроку
export const AddLessonNoteSchema = z.object({
  content: z
    .string()
    .min(1, "Комментарий не может быть пустым")
    .max(2000, "Комментарий не должен превышать 2000 символов")
    .trim(),
  grade: z
    .number()
    .int("Оценка должна быть целым числом")
    .min(1, "Минимальная оценка 1")
    .max(5, "Максимальная оценка 5")
    .optional(),
  feedback: z
    .string()
    .max(1000, "Рекомендация не должна превышать 1000 символов")
    .trim()
    .optional(),
  award: z.string().max(100).optional(),
  awardIcon: z.string().max(20).optional(),
});
