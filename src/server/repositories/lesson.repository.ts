import { supabaseServer, supabaseClient } from '../config/database';

export class LessonRepository {
  static async findLessons(options: { studentPublicId?: string; status?: string }) {
    let query = supabaseClient
      .from('lessons')
      .select('*')
      .order('scheduled_for', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (options.studentPublicId) {
      query = query.or(`student_public_id.eq.${options.studentPublicId},student_public_id.is.null`);
    }

    if (options.status) {
      query = query.eq('status', options.status);
    }

    return await query;
  }

  static async findLessonById(id: string) {
    return await supabaseServer
      .from('lessons')
      .select('*')
      .eq('id', id)
      .maybeSingle();
  }

  static async findLessonByRoomToken(roomToken: string) {
    return await supabaseServer
      .from('lessons')
      .select('*')
      .eq('room_token', roomToken)
      .maybeSingle();
  }

  static async updateLesson(
    criteria: { id?: string; room_token?: string },
    updates: Record<string, any>
  ) {
    let q = supabaseServer.from('lessons').update(updates);
    if (criteria.id) {
      q = q.eq('id', criteria.id);
    } else if (criteria.room_token) {
      q = q.eq('room_token', criteria.room_token);
    }
    return await q.select();
  }

  static async createLesson(lesson: Record<string, any>) {
    return await supabaseServer
      .from('lessons')
      .insert([lesson])
      .select()
      .single();
  }

  static async deleteLesson(id: string) {
    return await supabaseServer
      .from('lessons')
      .delete()
      .eq('id', id);
  }
}
