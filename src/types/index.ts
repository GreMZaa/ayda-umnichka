export type UserRole = 'student' | 'teacher' | 'admin';

export interface UserProfile {
  id: string;
  role: UserRole;
  fullName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  balanceLessons: number;
  assignedTeacherName?: string;
  studentGrade?: string;
  city: string;
}

export type LessonStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface LessonSession {
  id: string;
  roomToken: string;
  teacherId: string;
  teacherName: string;
  studentId: string;
  studentName: string;
  topic: string;
  status: LessonStatus;
  startedAt?: string;
  endedAt?: string;
  durationMinutes?: number;
  teacherSummary?: string;
  whiteboardSnapshotUrl?: string;
  createdAt: string;
}

export interface HomeworkItem {
  id: string;
  lessonId?: string;
  teacherName: string;
  studentId: string;
  title: string;
  taskDescription: string;
  taskFileUrl?: string;
  fileName?: string;
  studentSolutionText?: string;
  studentSolutionFileUrl?: string;
  status: 'assigned' | 'submitted' | 'reviewed';
  teacherFeedback?: string;
  dueDate?: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  type: 'text' | 'voice' | 'file' | 'lesson_invite';
  text?: string;
  fileUrl?: string;
  voiceDurationSec?: number;
  lessonRoomToken?: string;
  createdAt: string;
}

export interface BalanceTransaction {
  id: string;
  studentId: string;
  studentName: string;
  adminName: string;
  amount: number; // e.g. +8 or -1
  description: string;
  createdAt: string;
}

