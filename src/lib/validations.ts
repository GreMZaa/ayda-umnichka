import { z } from "zod";

export const LessonStatusEnum = z.enum(["SCHEDULED", "LIVE", "COMPLETED", "CANCELLED"]);

// Схема создания урока (только разрешенные поля, исключение mass assignment)
export const CreateLessonSchema = z.object({
  title: z
    .string()
    .min(1, "Название урока не может быть пустым")
    .max(120, "Название урока не может превышать 120 символов")
    .trim(),
  subjectId: z.string().optional(),
  subjectName: z.string().optional().default("Предмет"),
  subjectColor: z.string().optional().default("#2563eb"),
  teacherId: z.string().optional(),
  teacherName: z.string().optional(),
  studentId: z.string().optional(),
  studentName: z.string().optional(),
  startTime: z.string(),
  endTime: z.string(),
  status: LessonStatusEnum.default("SCHEDULED"),
  roomName: z.string().optional(),
  allowOverlap: z.boolean().optional(),
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
