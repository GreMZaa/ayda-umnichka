import { NextRequest } from 'next/server';
import { LessonService } from '../services/lesson.service';
import {
  validateCreateLessonInput,
  validateUpdateLessonInput,
} from '../validators/lesson.validator';
import { extractAuthContext } from '../middleware/authGuard';
import { apiSuccess, apiError } from '../middleware/apiErrors';

export class LessonController {
  static async getLessons(req: NextRequest) {
    try {
      const auth = extractAuthContext(req);
      const { searchParams } = new URL(req.url);
      const studentPublicId = searchParams.get('studentPublicId')?.trim();
      const teacherPublicId = searchParams.get('teacherPublicId')?.trim();
      const teacherName = searchParams.get('teacherName')?.trim();
      const status = searchParams.get('status')?.trim();

      // If user is a student or unauthenticated guest, restrict query strictly to their own ID
      let effectiveStudentId = studentPublicId;
      if (!auth.isTeacher && !auth.isAdmin) {
        if (!auth.userId) {
          return apiSuccess({ lessons: [] });
        }
        effectiveStudentId = auth.userId;
      }

      // If user is a teacher (and not admin), restrict query strictly to their teacher identity
      let effectiveTeacherId = teacherPublicId;
      let effectiveTeacherName = teacherName;
      if (auth.isTeacher && !auth.isAdmin) {
        effectiveTeacherId = auth.userId;
      }

      const lessons = await LessonService.getLessons({
        studentPublicId: effectiveStudentId,
        teacherPublicId: effectiveTeacherId,
        teacherName: effectiveTeacherName,
        status,
      });
      return apiSuccess({ lessons });
    } catch (err: any) {
      console.error('LessonController.getLessons error:', err);
      return apiError(err.message, err.statusCode || 500, { lessons: [] });
    }
  }

  static async saveLesson(req: NextRequest) {
    try {
      const auth = extractAuthContext(req);
      if (!auth.isTeacher && !auth.isAdmin && !auth.userId) {
        return apiError('Требуется авторизация для управления уроком', 403);
      }

      const body = await req.json();

      // Check ownership on status updates if caller is teacher (not admin)
      if (body.id && auth.isTeacher && !auth.isAdmin && body.action === 'update_status') {
        const canManage = await LessonService.canTeacherManageLesson(body.id, auth.userId);
        if (!canManage) {
          return apiError('Вы можете изменять статус только своих собственных уроков', 403);
        }
      }

      const validatedUpdate = validateUpdateLessonInput(body);
      const validatedCreate = validateCreateLessonInput(body);
      const result = await LessonService.handleLessonPost({
        ...validatedUpdate,
        ...validatedCreate,
      });
      return apiSuccess(result, 200);
    } catch (err: any) {
      console.error('LessonController.saveLesson error:', err);
      return apiError(err.message, err.statusCode || 500);
    }
  }

  static async deleteLesson(req: NextRequest) {
    try {
      const auth = extractAuthContext(req);
      if (!auth.isTeacher && !auth.isAdmin) {
        return apiError('Только преподаватель или администратор может удалять уроки', 403);
      }

      const { searchParams } = new URL(req.url);
      const isAll = searchParams.get('all') === 'true';

      if (isAll) {
        if (!auth.isAdmin) {
          return apiError('Только администратор платформы может удалять все уроки одновременно', 403);
        }
        const statusFilter = searchParams.get('status') || undefined;
        const result = await LessonService.deleteAllLessons(statusFilter);
        return apiSuccess(result, 200);
      }

      let id = searchParams.get('id')?.trim();

      if (!id) {
        try {
          const body = await req.json();
          id = body.id?.trim();
        } catch (_) {}
      }

      if (!id) {
        return apiError('ID урока обязателен для удаления', 400);
      }

      // Check ownership if caller is teacher (not admin)
      if (auth.isTeacher && !auth.isAdmin) {
        const canManage = await LessonService.canTeacherManageLesson(id, auth.userId);
        if (!canManage) {
          return apiError('Вы можете удалять только свои собственные уроки', 403);
        }
      }

      const result = await LessonService.deleteLesson(id);
      return apiSuccess(result, 200);
    } catch (err: any) {
      console.error('LessonController.deleteLesson error:', err);
      return apiError(err.message, err.statusCode || 500);
    }
  }

  static async createQuickLesson(request: Request) {
    try {
      const body = await request.json();
      const { student_id, topic } = body;
      const roomToken = `room-${Math.floor(1000 + Math.random() * 9000)}`;

      return apiSuccess(
        {
          success: true,
          lesson_id: `lesson-${Date.now()}`,
          room_token: roomToken,
          student_id: student_id || null,
          topic: topic || 'Индивидуальное занятие',
          join_url: `https://app.aidaumnichka.ru/room/${roomToken}`,
          status: 'pending',
          created_at: new Date().toISOString(),
        },
        200
      );
    } catch (err: any) {
      return apiError(err.message || 'Internal error', 400);
    }
  }
}
