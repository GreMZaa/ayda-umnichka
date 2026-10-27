import { NextRequest } from 'next/server';
import { UserService } from '../services/user.service';
import { apiSuccess, apiError } from '../middleware/apiErrors';

export class UserController {
  static async getStudents(req: NextRequest) {
    try {
      const { searchParams } = new URL(req.url);
      const q = (searchParams.get('q') || '').trim().toLowerCase();
      const students = await UserService.getStudents(q);
      return apiSuccess({
        success: true,
        count: students.length,
        students,
      });
    } catch (err: any) {
      console.error('UserController.getStudents error:', err);
      return apiError(err?.message || 'Failed to fetch students', 500);
    }
  }

  static async getTeachers() {
    try {
      const teachers = await UserService.getTeachers();
      return apiSuccess({
        success: true,
        count: teachers.length,
        teachers,
      });
    } catch (err: any) {
      console.error('UserController.getTeachers error:', err);
      return apiError(err?.message || 'Failed to fetch teachers', 500);
    }
  }

  static async getTeacherStudents(req: NextRequest) {
    try {
      const { searchParams } = new URL(req.url);
      const teacherPublicId = searchParams.get('teacherPublicId')?.trim();
      const students = await UserService.getTeacherStudents(teacherPublicId);
      return apiSuccess({ students });
    } catch (err: any) {
      console.error('UserController.getTeacherStudents error:', err);
      return apiError(err.message, err.statusCode || 500, { students: [] });
    }
  }

  static async addTeacherStudent(req: NextRequest) {
    try {
      const body = await req.json();
      const result = await UserService.addStudentToTeacher(body);
      return apiSuccess(result, 200);
    } catch (err: any) {
      console.error('UserController.addTeacherStudent error:', err);
      return apiError(err.message, err.statusCode || 500);
    }
  }

  static async getProfile() {
    return apiSuccess({
      user: null,
      center: {
        name: 'АйДаУмничка',
        city: 'Тольятти',
        administration: 'Администрация центра',
      },
    });
  }
}
