import { UserRepository } from '../repositories/user.repository';
import { TeacherStudentRepository } from '../repositories/teacherStudent.repository';
import { supabaseClient } from '../config/database';
import { AppError } from '../middleware/apiErrors';
import { formatLastSeenTolyatti } from '@/lib/utils';

export interface TeacherRecord {
  id: string;
  publicId: string;
  fullName: string;
  cleanName: string;
  specialization: string;
  role: 'teacher' | 'admin';
  email: string | null;
  phone: string | null;
  status: 'online' | 'offline' | 'available';
  statusText: string;
  avatarLetter: string;
  createdAt: string;
}

function getPresenceInfo(metadata?: any) {
  const lastSeenAt = metadata?.last_seen_at;
  const isOnline = Boolean(
    lastSeenAt && Date.now() - new Date(lastSeenAt).getTime() < 90_000
  );

  let statusText = 'Не в сети';
  if (isOnline) {
    statusText = 'В сети • Готов к занятиям';
  } else if (lastSeenAt) {
    const formatted = formatLastSeenTolyatti(lastSeenAt);
    statusText = formatted === 'В сети' ? 'В сети • Готов к занятиям' : formatted;
  }

  return {
    status: (isOnline ? 'online' : 'offline') as 'online' | 'offline',
    statusText,
  };
}

export class UserService {
  static async getStudents(q: string = '') {
    const { bindings, profiles } = await UserRepository.findAllStudents();
    const map = new Map<string, any>();

    bindings.forEach((b: any) => {
      const publicId = b.public_id || b.id;
      map.set(publicId, {
        id: b.id,
        publicId,
        fullName: b.full_name || 'Ученик центра',
        phone: b.phone || null,
        email: b.email || null,
        balanceLessons: b.balance_lessons ?? 1,
        createdAt: b.created_at,
      });
    });

    profiles.forEach((p: any) => {
      const publicId = p.public_id || p.id;
      if (!map.has(publicId)) {
        map.set(publicId, {
          id: p.id,
          publicId,
          fullName: p.full_name || 'Ученик центра',
          phone: p.phone || null,
          email: null,
          balanceLessons: p.balance_lessons ?? 1,
          createdAt: p.created_at,
        });
      }
    });

    let students = Array.from(map.values()).filter(
      (s) =>
        !s.publicId.toLowerCase().startsWith('probe_') &&
        !s.fullName.toLowerCase().includes('probe') &&
        !s.fullName.toLowerCase().includes('security probe')
    );

    if (q) {
      students = students.filter(
        (s) =>
          s.fullName.toLowerCase().includes(q) ||
          s.publicId.toLowerCase().includes(q) ||
          (s.phone && s.phone.includes(q))
      );
    }

    return students;
  }

  static async getTeachers(): Promise<TeacherRecord[]> {
    const { bindings, profiles } = await UserRepository.findAllTeachers();
    const map = new Map<string, TeacherRecord>();

    bindings.forEach((b: any) => {
      const key = b.public_id || b.id;
      const rawName = b.full_name || 'Педагог центра';

      let cleanName = rawName;
      let specialization =
        b.role === 'admin'
          ? 'Администрация и методическое руководство'
          : 'Логопедия и развитие интеллекта';

      const parenMatch = rawName.match(/^(.*?)\s*\((.*?)\)$/);
      if (parenMatch) {
        cleanName = parenMatch[1].trim();
        const specPart = parenMatch[2]
          .replace(/^ребёнок:\s*/i, '')
          .replace(/^специализация:\s*/i, '')
          .trim();
        if (specPart) {
          specialization = specPart;
        }
      }

      const presence = getPresenceInfo(b.metadata);

      map.set(key, {
        id: b.id,
        publicId: b.public_id || 'id_teacher',
        fullName: rawName,
        cleanName,
        specialization,
        role: b.role as 'teacher' | 'admin',
        email: b.email || null,
        phone: b.phone || null,
        status: presence.status,
        statusText: presence.statusText,
        avatarLetter: (cleanName.trim()[0] || 'П').toUpperCase(),
        createdAt: b.created_at,
      });
    });

    profiles.forEach((p: any) => {
      const key = p.public_id || p.id;
      if (!map.has(key)) {
        const rawName = p.full_name || 'Педагог центра';
        let cleanName = rawName;
        let specialization =
          p.role === 'admin'
            ? 'Администрация и методическое руководство'
            : 'Логопедия и развитие интеллекта';

        const parenMatch = rawName.match(/^(.*?)\s*\((.*?)\)$/);
        if (parenMatch) {
          cleanName = parenMatch[1].trim();
          const specPart = parenMatch[2]
            .replace(/^ребёнок:\s*/i, '')
            .replace(/^специализация:\s*/i, '')
            .trim();
          if (specPart) {
            specialization = specPart;
          }
        }

        map.set(key, {
          id: p.id,
          publicId: p.public_id || 'id_teacher',
          fullName: rawName,
          cleanName,
          specialization,
          role: p.role as 'teacher' | 'admin',
          email: null,
          phone: p.phone || null,
          status: 'offline',
          statusText: 'Не в сети',
          avatarLetter: (cleanName.trim()[0] || 'П').toUpperCase(),
          createdAt: p.created_at,
        });
      }
    });

    return Array.from(map.values());
  }

  static async getTeacherStudents(teacherPublicId?: string) {
    const { data: rawStudents, error } =
      await TeacherStudentRepository.findStudentsByTeacher(teacherPublicId);

    if (error) {
      console.error('Error fetching teacher_students from Supabase:', error);
      throw new AppError(error.message, 500);
    }

    const studentsList = rawStudents || [];
    const publicIds = studentsList.map((s: any) => s.student_public_id).filter(Boolean);

    const balanceMap = new Map<string, number>();

    if (publicIds.length > 0) {
      const { data: bindings } = await supabaseClient
        .from('user_bindings')
        .select('public_id, balance_lessons')
        .in('public_id', publicIds);

      (bindings || []).forEach((b: any) => {
        if (b.public_id && typeof b.balance_lessons === 'number') {
          balanceMap.set(b.public_id.toLowerCase(), b.balance_lessons);
        }
      });

      const missing = publicIds.filter((p: string) => !balanceMap.has(p.toLowerCase()));
      if (missing.length > 0) {
        const { data: profs } = await supabaseClient
          .from('profiles')
          .select('public_id, balance_lessons')
          .in('public_id', missing);

        (profs || []).forEach((p: any) => {
          if (p.public_id && typeof p.balance_lessons === 'number') {
            balanceMap.set(p.public_id.toLowerCase(), p.balance_lessons);
          }
        });
      }
    }

    return studentsList.map((s: any) => {
      const pubId = (s.student_public_id || '').toLowerCase();
      const balance = pubId && balanceMap.has(pubId) ? balanceMap.get(pubId) : 1;
      return {
        ...s,
        balance_lessons: balance,
      };
    });
  }

  static async addStudentToTeacher(body: {
    teacher_public_id?: string;
    student_public_id?: string;
    student_name?: string;
    notes?: string;
  }) {
    const { teacher_public_id, student_public_id, student_name, notes } = body;

    if (!teacher_public_id) {
      throw new AppError('Необходимо указать ID преподавателя', 400);
    }
    if (!student_name && !student_public_id) {
      throw new AppError('Необходимо указать имя или ID ученика', 400);
    }

    const teacherId = teacher_public_id;
    const existing = await TeacherStudentRepository.findExisting(
      teacherId,
      student_public_id,
      student_name
    );

    if (existing) {
      return {
        success: true,
        message: 'Ученик уже добавлен к этому преподавателю',
        student: existing,
      };
    }

    const newRecord = {
      teacher_public_id: teacherId,
      student_public_id: student_public_id?.trim() || null,
      student_name: student_name?.trim() || 'Ученик центра',
      notes: notes?.trim() || null,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await TeacherStudentRepository.createBinding(newRecord);
    if (error) {
      console.error('Error inserting into teacher_students:', error);
      throw new AppError(error.message, 500);
    }

    return { success: true, student: data };
  }

  static async updateTeacherStudent(body: {
    id?: string;
    teacher_public_id?: string;
    student_public_id?: string;
    notes?: string;
    student_name?: string;
  }) {
    const { id, teacher_public_id, student_public_id, notes, student_name } = body;
    const updates: Record<string, any> = {};
    if (notes !== undefined) updates.notes = notes;
    if (student_name !== undefined) updates.student_name = student_name;

    const { data, error } = await TeacherStudentRepository.updateBinding(
      { id, teacherPublicId: teacher_public_id, studentPublicId: student_public_id },
      updates
    );
    if (error) {
      console.error('Error updating teacher_students:', error);
      throw new AppError(error.message, 500);
    }
    return { success: true, updated: data };
  }

  static async removeTeacherStudent(filter: {
    id?: string;
    teacher_public_id?: string;
    student_public_id?: string;
  }) {
    const { error } = await TeacherStudentRepository.deleteBinding({
      id: filter.id,
      teacherPublicId: filter.teacher_public_id,
      studentPublicId: filter.student_public_id,
    });
    if (error) {
      console.error('Error deleting from teacher_students:', error);
      throw new AppError(error.message, 500);
    }
    return { success: true, message: 'Ученик успешно откреплен' };
  }
}
