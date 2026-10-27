import { LessonRepository } from '../repositories/lesson.repository';
import { CreateLessonDTO, UpdateLessonDTO } from '../validators/lesson.validator';
import { AppError } from '../middleware/apiErrors';
import { supabaseServer } from '../config/database';

export class LessonService {
  static async getLessons(options: { studentPublicId?: string; status?: string }) {
    const { data, error } = await LessonRepository.findLessons(options);
    if (error) {
      console.error('Error fetching lessons from Supabase:', error);
      throw new AppError(error.message, 500);
    }
    return data || [];
  }

  static async handleLessonPost(dto: UpdateLessonDTO & CreateLessonDTO) {
    const {
      id,
      action,
      status,
      room_token,
      topic,
      student_public_id,
      student_name,
      teacher_name,
      scheduled_for,
      duration_minutes,
      teacher_summary,
      started_at,
    } = dto;

    // 1. Update existing lesson status (e.g. start room, mark completed/cancelled)
    if ((id || room_token) && (action === 'update_status' || action === 'start_room' || status)) {
      const updates: any = {};
      if (status) {
        updates.status = status;
      }
      if (action === 'start_room' || status === 'active') {
        updates.status = 'active';
        if (started_at) {
          updates.started_at = started_at;
        }
      }
      if (status === 'completed') {
        updates.status = 'completed';
        updates.ended_at = new Date().toISOString();
      }
      if (duration_minutes) {
        updates.duration_minutes = duration_minutes;
      }
      if (teacher_summary) {
        updates.teacher_summary = teacher_summary;
      }

      const { data, error } = await LessonRepository.updateLesson({ id, room_token }, updates);
      if (error) {
        console.error('Error updating lesson in Supabase:', error);
        throw new AppError(error.message, 500);
      }

      // If room row didn't exist yet, insert it now
      if ((!data || data.length === 0) && room_token) {
        const { data: inserted, error: insertError } = await LessonRepository.createLesson({
          room_token,
          topic: topic?.trim() || 'Индивидуальное занятие',
          status: 'active',
          started_at: started_at || new Date().toISOString(),
          student_name: student_name || 'Ученик',
          teacher_name: teacher_name || 'Преподаватель',
        });

        if (insertError) {
          console.error('Error inserting initial lesson row:', insertError);
        } else {
          try {
            const ch = supabaseServer.channel('platform_messenger_global');
            await ch.send({
              type: 'broadcast',
              event: 'lesson-started',
              payload: {
                room_token,
                topic: topic || 'Индивидуальное занятие',
                student_name: student_name || 'Ученик',
                teacher_name: teacher_name || 'Преподаватель',
              },
            });
          } catch (_) {}
          return { success: true, lesson: inserted };
        }
      }

      if (action === 'start_room' || status === 'active') {
        const anyData = data as any;
        try {
          const ch = supabaseServer.channel('platform_messenger_global');
          await ch.send({
            type: 'broadcast',
            event: 'lesson-started',
            payload: {
              room_token,
              topic: topic || (Array.isArray(anyData) ? anyData[0]?.topic : anyData?.topic) || 'Онлайн-урок',
              student_public_id: student_public_id || (Array.isArray(anyData) ? anyData[0]?.student_public_id : anyData?.student_public_id),
              teacher_name: teacher_name || (Array.isArray(anyData) ? anyData[0]?.teacher_name : anyData?.teacher_name) || 'Преподаватель',
            },
          });
        } catch (_) {}
      }

      return { success: true, lesson: data };
    }

    // 2. Insert new scheduled lesson
    const token = room_token || `room-${Math.floor(1000 + Math.random() * 9000)}`;
    const newLesson = {
      room_token: token,
      topic: topic?.trim() || 'Индивидуальное занятие',
      student_public_id: student_public_id?.trim() || null,
      student_name: student_name?.trim() || 'Ученик центра',
      teacher_name: teacher_name?.trim() || 'Преподаватель',
      scheduled_for: scheduled_for
        ? new Date(scheduled_for).toISOString()
        : new Date().toISOString(),
      duration_minutes: duration_minutes || 45,
      status: status || 'pending',
      created_at: new Date().toISOString(),
    };

    const { data, error } = await LessonRepository.createLesson(newLesson);
    if (error) {
      console.error('Error creating lesson in Supabase:', error);
      throw new AppError(error.message, 500);
    }

    const createdLesson = Array.isArray(data) ? data[0] : data;
    try {
      const ch = supabaseServer.channel('platform_messenger_global');
      await ch.send({
        type: 'broadcast',
        event: 'lesson-scheduled',
        payload: {
          id: createdLesson?.id,
          room_token: createdLesson?.room_token || newLesson.room_token,
          topic: newLesson.topic,
          student_public_id: newLesson.student_public_id,
          student_name: newLesson.student_name,
          teacher_name: newLesson.teacher_name,
          scheduled_for: newLesson.scheduled_for,
          duration_minutes: newLesson.duration_minutes,
        },
      });
    } catch (_) {}

    return { success: true, lesson: data };
  }

  static async deleteLesson(id: string) {
    const { error } = await LessonRepository.deleteLesson(id);
    if (error) {
      console.error('Error deleting lesson from Supabase:', error);
      throw new AppError(error.message, 500);
    }
    return { success: true, message: 'Урок успешно удален' };
  }
}
