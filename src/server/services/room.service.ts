import { supabaseServer } from '../config/database';
import { AppError } from '../middleware/apiErrors';

export class RoomService {
  static async getRoomMessages(roomToken: string) {
    if (!roomToken) {
      throw new AppError('roomToken required', 400);
    }

    const { data: lesson, error } = await supabaseServer
      .from('lessons')
      .select('id, room_token, teacher_summary, started_at, ended_at, status, duration_minutes')
      .eq('room_token', roomToken)
      .maybeSingle();

    if (error) {
      console.error('Error fetching room messages:', error);
      throw new AppError(error.message, 500);
    }

    if (!lesson) {
      return { messages: [], startedAt: null, status: 'active', durationMinutes: 0 };
    }

    let messages: any[] = [];
    if (lesson.teacher_summary) {
      try {
        const parsed = JSON.parse(lesson.teacher_summary);
        messages = Array.isArray(parsed?.messages) ? parsed.messages : [];
      } catch {
        messages = [];
      }
    }

    return {
      messages,
      startedAt: lesson.started_at || null,
      status: lesson.status || 'active',
      durationMinutes: lesson.duration_minutes || 0,
    };
  }

  static async addRoomMessage(roomToken: string, message: any) {
    if (!roomToken || !message || !message.id) {
      throw new AppError('roomToken and valid message required', 400);
    }

    const { data: lesson, error: fetchError } = await supabaseServer
      .from('lessons')
      .select('id, room_token, teacher_summary')
      .eq('room_token', roomToken)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching lesson for message insert:', fetchError);
      throw new AppError(fetchError.message, 500);
    }

    let existingData: Record<string, any> = {};
    if (lesson?.teacher_summary) {
      try {
        existingData = JSON.parse(lesson.teacher_summary);
      } catch {
        existingData = { summary_text: lesson.teacher_summary };
      }
    }

    const messages = Array.isArray(existingData.messages) ? existingData.messages : [];
    const exists = messages.some((m: any) => m.id === message.id);
    if (!exists) {
      messages.push(message);
    }
    existingData.messages = messages;

    const summaryPayload = JSON.stringify(existingData);

    if (lesson) {
      const { error: updateError } = await supabaseServer
        .from('lessons')
        .update({ teacher_summary: summaryPayload })
        .eq('room_token', roomToken);

      if (updateError) {
        console.error('Error updating lesson messages:', updateError);
        throw new AppError(updateError.message, 500);
      }
    } else {
      const { error: insertError } = await supabaseServer
        .from('lessons')
        .insert({
          room_token: roomToken,
          topic: 'Индивидуальное занятие',
          status: 'active',
          started_at: new Date().toISOString(),
          teacher_summary: summaryPayload,
        });

      if (insertError) {
        console.error('Error creating lesson for message insert:', insertError);
        throw new AppError(insertError.message, 500);
      }
    }

    return { success: true, message };
  }

  static async uploadRoomFile(file: File) {
    if (!file) {
      throw new AppError('Файл не найден', 400);
    }

    // Limit to 15MB
    if (file.size > 15 * 1024 * 1024) {
      throw new AppError('Размер файла превышает 15 МБ', 400);
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Sanitize file name
    const sanitizedName = (file.name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `room-files/${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${sanitizedName}`;

    const { error: uploadError } = await supabaseServer.storage
      .from('chat-attachments')
      .upload(storagePath, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: true,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new AppError(uploadError.message, 500);
    }

    const { data: publicData } = supabaseServer.storage
      .from('chat-attachments')
      .getPublicUrl(storagePath);

    return {
      success: true,
      url: publicData.publicUrl,
      name: file.name,
      type: file.type,
      size: file.size,
      isImage: file.type.startsWith('image/'),
    };
  }
}
