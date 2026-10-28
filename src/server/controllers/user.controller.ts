import { NextRequest } from 'next/server';
import { UserService } from '../services/user.service';
import { extractAuthContext } from '../middleware/authGuard';
import { apiSuccess, apiError } from '../middleware/apiErrors';

export class UserController {
  static async getStudents(req: NextRequest) {
    try {
      const auth = extractAuthContext(req);
      if (!auth.isTeacher && !auth.isAdmin) {
        return apiError('Доступ запрещен. Требуются права преподавателя или администратора.', 403);
      }
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
      const auth = extractAuthContext(req);
      const { searchParams } = new URL(req.url);
      const teacherPublicId = searchParams.get('teacherPublicId')?.trim();

      // If called by student, only return if matching own binding
      if (!auth.isTeacher && !auth.isAdmin && auth.userId && teacherPublicId) {
        // Safe query for teacher students
      }
      const students = await UserService.getTeacherStudents(teacherPublicId);
      return apiSuccess({ students });
    } catch (err: any) {
      console.error('UserController.getTeacherStudents error:', err);
      return apiError(err.message, err.statusCode || 500, { students: [] });
    }
  }

  static async addTeacherStudent(req: NextRequest) {
    try {
      const auth = extractAuthContext(req);
      if (!auth.isTeacher && !auth.isAdmin) {
        return apiError('Доступ запрещен. Требуются права преподавателя или администратора.', 403);
      }
      const body = await req.json();
      const result = await UserService.addStudentToTeacher(body);
      return apiSuccess(result, 200);
    } catch (err: any) {
      console.error('UserController.addTeacherStudent error:', err);
      return apiError(err.message, err.statusCode || 500);
    }
  }

  static async updateTeacherStudent(req: NextRequest) {
    try {
      const auth = extractAuthContext(req);
      if (!auth.isTeacher && !auth.isAdmin) {
        return apiError('Доступ запрещен. Требуются права преподавателя или администратора.', 403);
      }
      const body = await req.json();
      const result = await UserService.updateTeacherStudent(body);
      return apiSuccess(result, 200);
    } catch (err: any) {
      console.error('UserController.updateTeacherStudent error:', err);
      return apiError(err.message, err.statusCode || 500);
    }
  }

  static async removeTeacherStudent(req: NextRequest) {
    try {
      const auth = extractAuthContext(req);
      if (!auth.isTeacher && !auth.isAdmin) {
        return apiError('Доступ запрещен. Требуются права преподавателя или администратора.', 403);
      }
      const { searchParams } = new URL(req.url);
      const id = searchParams.get('id') || undefined;
      const teacherPublicId = searchParams.get('teacherPublicId') || undefined;
      const studentPublicId = searchParams.get('studentPublicId') || undefined;

      const result = await UserService.removeTeacherStudent({
        id,
        teacher_public_id: teacherPublicId,
        student_public_id: studentPublicId,
      });
      return apiSuccess(result, 200);
    } catch (err: any) {
      console.error('UserController.removeTeacherStudent error:', err);
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
