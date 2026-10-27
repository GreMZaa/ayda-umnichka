import { NextRequest } from 'next/server';
import { LessonService } from '../services/lesson.service';
import {
  validateCreateLessonInput,
  validateUpdateLessonInput,
} from '../validators/lesson.validator';
import { apiSuccess, apiError } from '../middleware/apiErrors';

export class LessonController {
  static async getLessons(req: NextRequest) {
    try {
      const { searchParams } = new URL(req.url);
      const studentPublicId = searchParams.get('studentPublicId')?.trim();
      const status = searchParams.get('status')?.trim();

      const lessons = await LessonService.getLessons({ studentPublicId, status });
      return apiSuccess({ lessons });
    } catch (err: any) {
      console.error('LessonController.getLessons error:', err);
      return apiError(err.message, err.statusCode || 500, { lessons: [] });
    }
  }

  static async saveLesson(req: NextRequest) {
    try {
      const body = await req.json();
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
      const { searchParams } = new URL(req.url);
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
