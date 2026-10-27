import { NextRequest } from 'next/server';
import { HomeworkService } from '../services/homework.service';
import {
  validateCreateHomeworkInput,
  validateSubmitSolutionInput,
} from '../validators/homework.validator';
import { extractAuthContext } from '../middleware/authGuard';
import { apiSuccess, apiError } from '../middleware/apiErrors';

export class HomeworkController {
  static async getHomework(req: NextRequest) {
    try {
      const auth = extractAuthContext(req);
      const { searchParams } = new URL(req.url);
      const studentPublicId = searchParams.get('studentPublicId')?.trim();

      // If user is a student or unauthenticated guest, restrict query strictly to their own ID
      let effectiveId = studentPublicId;
      if (!auth.isTeacher && !auth.isAdmin) {
        if (!auth.userId) {
          return apiSuccess({ homework: [] });
        }
        effectiveId = auth.userId;
      }

      const homework = await HomeworkService.getHomework(effectiveId);
      return apiSuccess({ homework });
    } catch (err: any) {
      console.error('HomeworkController.getHomework error:', err);
      return apiError(err.message, err.statusCode || 500, { homework: [] });
    }
  }

  static async saveHomework(req: NextRequest) {
    try {
      const auth = extractAuthContext(req);
      const body = await req.json();

      // Solution submission action (allowed for students and teachers)
      if (body.action === 'submit_solution') {
        const validated = validateSubmitSolutionInput(body);
        const result = await HomeworkService.submitSolution(validated);
        return apiSuccess(result, 200);
      }

      // Homework assignment creation (strictly for teachers and admins)
      if (!auth.isTeacher && !auth.isAdmin) {
        return apiError('Только преподаватель может создавать домашние задания', 403);
      }

      const validated = validateCreateHomeworkInput(body);
      const result = await HomeworkService.createHomework(validated);
      return apiSuccess(result, 200);
    } catch (err: any) {
      console.error('HomeworkController.saveHomework error:', err);
      return apiError(err.message, err.statusCode || 500);
    }
  }

  static async deleteHomework(req: NextRequest) {
    try {
      const auth = extractAuthContext(req);
      if (!auth.isTeacher && !auth.isAdmin) {
        return apiError('Только преподаватель может удалять домашние задания', 403);
      }
      const { searchParams } = new URL(req.url);
      const id = searchParams.get('id');

      if (!id) {
        return apiError('Не передан ID домашнего задания', 400);
      }

      const result = await HomeworkService.deleteHomework(id);
      return apiSuccess(result, 200);
    } catch (err: any) {
      console.error('HomeworkController.deleteHomework error:', err);
      return apiError(err.message, err.statusCode || 500);
    }
  }
}
