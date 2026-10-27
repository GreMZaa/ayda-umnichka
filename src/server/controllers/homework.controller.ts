import { NextRequest } from 'next/server';
import { HomeworkService } from '../services/homework.service';
import {
  validateCreateHomeworkInput,
  validateSubmitSolutionInput,
} from '../validators/homework.validator';
import { apiSuccess, apiError } from '../middleware/apiErrors';

export class HomeworkController {
  static async getHomework(req: NextRequest) {
    try {
      const { searchParams } = new URL(req.url);
      const studentPublicId = searchParams.get('studentPublicId')?.trim();
      const homework = await HomeworkService.getHomework(studentPublicId);
      return apiSuccess({ homework });
    } catch (err: any) {
      console.error('HomeworkController.getHomework error:', err);
      return apiError(err.message, err.statusCode || 500, { homework: [] });
    }
  }

  static async saveHomework(req: NextRequest) {
    try {
      const body = await req.json();

      // Solution submission action
      if (body.action === 'submit_solution') {
        const validated = validateSubmitSolutionInput(body);
        const result = await HomeworkService.submitSolution(validated);
        return apiSuccess(result, 200);
      }

      // Homework assignment creation
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
