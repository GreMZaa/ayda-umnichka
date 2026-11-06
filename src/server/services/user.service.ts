import { UserRepository } from '../repositories/user.repository';
import { TeacherStudentRepository } from '../repositories/teacherStudent.repository';
import { supabaseClient } from '../config/database';
import { AppError } from '../middleware/apiErrors';
import { formatLastSeenTolyatti } from '@/lib/utils';
import { isValidRegistrationEmail, normalizeEmailInput } from '@/lib/emailValidation';

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

  static async getTeachersForStudent(studentPublicId: string) {
    const cleanId = studentPublicId.trim().toLowerCase();
    const { data: bindings, error } =
      await TeacherStudentRepository.findTeachersByStudent(cleanId);

    if (error) {
      console.error('Error fetching teachers for student:', error);
      throw new AppError(error.message, 500);
    }

    const rows = bindings || [];
    const teacherIds = [
      ...new Set(rows.map((r: any) => r.teacher_public_id).filter(Boolean)),
    ] as string[];

    const nameByPublicId = new Map<string, string>();

    if (teacherIds.length > 0) {
      const { data: teacherBindings } = await supabaseClient
        .from('user_bindings')
        .select('public_id, full_name')
        .in('public_id', teacherIds);

      (teacherBindings || []).forEach((b: any) => {
        if (b.public_id && b.full_name) {
          const clean = String(b.full_name)
            .replace(/\s*\(.*?\)$/, '')
            .trim();
          nameByPublicId.set(String(b.public_id).toLowerCase(), clean || b.full_name);
        }
      });
    }

    return rows.map((r: any) => {
      const pubId = (r.teacher_public_id || '').toLowerCase();
      const fromDb = pubId ? nameByPublicId.get(pubId) : undefined;
      const fallback = (r.teacher_name || r.notes || 'Преподаватель').replace(/\s*\(.*?\)$/, '').trim();
      return {
        id: r.id,
        teacher_public_id: r.teacher_public_id,
        teacher_name: fromDb || fallback,
      };
    });
  }

  static async addStudentToTeacher(body: {
    teacher_public_id?: string;
    student_public_id?: string;
    student_name?: string;
    notes?: string;
    parent_email?: string;
    initial_balance?: number;
  }) {
    const { teacher_public_id, student_public_id, student_name, notes, parent_email, initial_balance } =
      body;

    if (!teacher_public_id) {
      throw new AppError('Необходимо указать ID преподавателя', 400);
    }
    if (!student_name && !student_public_id) {
      throw new AppError('Необходимо указать имя или ID ученика', 400);
    }

    const teacherId = teacher_public_id;

    // New student typed manually — create Supabase auth + user_bindings + teacher link
    if (!student_public_id?.trim() && student_name?.trim()) {
      return this.provisionManualStudentForTeacher({
        teacher_public_id: teacherId,
        student_name: student_name.trim(),
        notes: notes?.trim(),
        parent_email: parent_email?.trim(),
        initial_balance: typeof initial_balance === 'number' ? initial_balance : 1,
      });
    }

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

  /** Create student account in Supabase when teacher adds pupil manually. */
  private static async provisionManualStudentForTeacher(params: {
    teacher_public_id: string;
    student_name: string;
    notes?: string;
    parent_email?: string;
    initial_balance: number;
  }) {
    const newStudentPublicId = `id${Math.floor(100000 + Math.random() * 900000)}`;
    const createdPassword = String(Math.floor(100000 + Math.random() * 900000));
    let targetEmail: string;

    if (params.parent_email && isValidRegistrationEmail(params.parent_email)) {
      targetEmail = normalizeEmailInput(params.parent_email);
    } else {
      targetEmail = `${newStudentPublicId}@aidaumnichka.ru`;
    }

    const fullName = params.student_name.trim();
    const balance = Math.max(0, params.initial_balance);

    const { data: authData, error: authError } = await UserRepository.createUserWithAdminAuth({
      email: targetEmail,
      password: createdPassword,
      metadata: {
        public_id: newStudentPublicId,
        full_name: fullName,
        role: 'student',
        balance_lessons: balance,
      },
    });

    if (authError || !authData?.user?.id) {
      throw new AppError(
        authError?.message || 'Не удалось создать учётную запись ученика в Supabase',
        400
      );
    }

    const authUserId = authData.user.id;
    const now = new Date().toISOString();

    const { error: bindingError } = await UserRepository.upsertBinding({
      public_id: newStudentPublicId,
      auth_user_id: authUserId,
      role: 'student',
      full_name: fullName,
      email: targetEmail,
      is_registered: true,
      balance_lessons: balance,
      metadata: {
        created_by_teacher: params.teacher_public_id,
        subject_notes: params.notes || null,
      },
      updated_at: now,
    });

    if (bindingError) {
      console.error('user_bindings upsert failed:', bindingError);
      throw new AppError(bindingError.message, 500);
    }

    try {
      await UserRepository.upsertProfile({
        id: authUserId,
        public_id: newStudentPublicId,
        full_name: fullName,
        role: 'student',
        email: targetEmail,
        balance_lessons: balance,
      });
    } catch (profileErr) {
      console.warn('Profile sync optional note:', profileErr);
    }

    const { data: linkRow, error: linkError } = await TeacherStudentRepository.createBinding({
      teacher_public_id: params.teacher_public_id,
      student_public_id: newStudentPublicId,
      student_name: fullName,
      notes: params.notes || 'Индивидуальное сопровождение',
      created_at: now,
    });

    if (linkError) {
      console.error('teacher_students insert failed:', linkError);
      throw new AppError(linkError.message, 500);
    }

    return {
      success: true,
      message: 'Ученик создан и закреплён за вами',
      student: linkRow,
      studentPublicId: newStudentPublicId,
      login: targetEmail,
      password: createdPassword,
    };
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
    const studentPublicId = filter.student_public_id?.trim().toLowerCase();
    const teacherPublicId = filter.teacher_public_id?.trim();

    const { data, error } = await TeacherStudentRepository.deleteBinding({
      id: filter.id?.trim(),
      teacherPublicId,
      studentPublicId: studentPublicId || undefined,
    });
    if (error) {
      console.error('Error deleting from teacher_students:', error);
      throw new AppError(error.message, 500);
    }
    if (!data?.length) {
      throw new AppError('Связка не найдена в базе (возможно, ученик был только в локальном кэше)', 404);
    }
    return { success: true, message: 'Ученик успешно откреплен' };
  }
}
