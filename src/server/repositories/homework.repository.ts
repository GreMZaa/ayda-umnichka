import { supabaseServer, supabaseClient } from '../config/database';

export class HomeworkRepository {
  static async findHomework(studentPublicId?: string) {
    let query = supabaseClient
      .from('homework')
      .select('*')
      .order('created_at', { ascending: false });

    if (studentPublicId) {
      query = query.or(
        `student_public_id.eq.${studentPublicId},student_public_id.is.null,student_public_id.eq.all`
      );
    }

    return await query;
  }

  static async updateHomework(id: string, updates: Record<string, any>) {
    return await supabaseServer
      .from('homework')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
  }

  static async createHomework(record: Record<string, any>) {
    return await supabaseServer
      .from('homework')
      .insert([record])
      .select()
      .single();
  }

  static async deleteHomework(id: string) {
    return await supabaseServer
      .from('homework')
      .delete()
      .eq('id', id);
  }
}
