import { supabaseServer, supabaseClient } from '../config/database';

export class TeacherStudentRepository {
  static async findStudentsByTeacher(teacherPublicId?: string) {
    let query = supabaseClient
      .from('teacher_students')
      .select('*')
      .order('created_at', { ascending: false });

    if (teacherPublicId) {
      query = query.or(`teacher_public_id.eq.${teacherPublicId},teacher_public_id.is.null`);
    }

    return await query;
  }

  static async findExisting(teacherId: string, studentPublicId?: string, studentName?: string) {
    let existingQuery = supabaseClient
      .from('teacher_students')
      .select('*')
      .eq('teacher_public_id', teacherId);

    if (studentPublicId) {
      existingQuery = existingQuery.eq('student_public_id', studentPublicId);
    } else if (studentName) {
      existingQuery = existingQuery.ilike('student_name', studentName);
    }

    return await existingQuery.maybeSingle();
  }

  static async createBinding(record: Record<string, any>) {
    return await supabaseServer
      .from('teacher_students')
      .insert([record])
      .select()
      .single();
  }
}
