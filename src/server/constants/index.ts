export const ROLES = {
  ADMIN: 'admin',
  TEACHER: 'teacher',
  STUDENT: 'student',
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

export const LESSON_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export type LessonStatus = (typeof LESSON_STATUS)[keyof typeof LESSON_STATUS];

export const HOMEWORK_STATUS = {
  ASSIGNED: 'assigned',
  SUBMITTED: 'submitted',
  CHECKED: 'checked',
} as const;

export type HomeworkStatus = (typeof HOMEWORK_STATUS)[keyof typeof HOMEWORK_STATUS];
