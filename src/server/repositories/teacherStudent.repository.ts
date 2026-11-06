import { supabaseServer, supabaseClient } from '../config/database';

export class TeacherStudentRepository {
  static async findTeachersByStudent(studentPublicId: string) {
    return await supabaseClient
      .from('teacher_students')
      .select('*')
      .eq('student_public_id', studentPublicId)
      .order('created_at', { ascending: false });
  }

  static async findStudentsByTeacher(teacherPublicId?: string) {
    let query = supabaseClient
      .from('teacher_students')
      .select('*')
      .order('created_at', { ascending: false });

    const trimmed = teacherPublicId?.trim();
    if (!trimmed) {
      return await query;
    }

    const normalized = trimmed.toLowerCase();

    const { data: teacherProfile } = await supabaseClient
      .from('profiles')
      .select('id')
      .ilike('public_id', normalized)
      .maybeSingle();

    const orFilters = [`teacher_public_id.ilike.${normalized}`];
    if (teacherProfile?.id) {
      orFilters.push(`teacher_id.eq.${teacherProfile.id}`);
    }

    query = query.or(orFilters.join(','));
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

  static async updateBinding(
    filter: { id?: string; teacherPublicId?: string; studentPublicId?: string },
    updates: Record<string, any>
  ) {
    let query = supabaseServer.from('teacher_students').update(updates);
    if (filter.id) {
      query = query.eq('id', filter.id);
    } else {
      if (filter.teacherPublicId) query = query.eq('teacher_public_id', filter.teacherPublicId);
      if (filter.studentPublicId) query = query.eq('student_public_id', filter.studentPublicId);
    }
    return await query.select();
  }

  static async deleteBinding(filter: { id?: string; teacherPublicId?: string; studentPublicId?: string }) {
    let query = supabaseServer.from('teacher_students').delete();
    if (filter.id) {
      query = query.eq('id', filter.id);
      if (filter.teacherPublicId) {
        query = query.eq('teacher_public_id', filter.teacherPublicId.trim());
      }
    } else {
      if (filter.teacherPublicId) {
        query = query.ilike('teacher_public_id', filter.teacherPublicId.trim());
      }
      if (filter.studentPublicId) {
        query = query.ilike('student_public_id', filter.studentPublicId);
      }
    }
    return await query.select('id');
  }
}
