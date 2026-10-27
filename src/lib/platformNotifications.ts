'use client';

import { supabase } from '@/lib/supabase';

export type PlatformNotificationEvent =
  | 'lesson-scheduled'
  | 'lesson-started'
  | 'homework-assigned'
  | 'homework-submitted'
  | 'homework-reviewed'
  | 'new-message';

export interface LessonScheduledPayload {
  id?: string;
  room_token: string;
  topic: string;
  student_public_id?: string | null;
  student_name?: string;
  teacher_name?: string;
  scheduled_for: string;
  duration_minutes?: number;
  creator_id?: string;
}

export interface LessonStartedPayload {
  id?: string;
  room_token: string;
  topic?: string;
  teacher_name?: string;
  student_public_id?: string | null;
  student_name?: string;
}

export interface HomeworkAssignedPayload {
  id: string;
  title: string;
  task_description?: string;
  student_public_id?: string | null;
  student_name?: string;
  teacher_name?: string;
  task_file_url?: string | null;
  file_name?: string | null;
  due_date?: string | null;
  creator_id?: string;
}

export interface HomeworkSubmittedPayload {
  id: string;
  title: string;
  student_public_id?: string | null;
  student_name?: string;
  student_solution_text?: string;
  student_solution_file_url?: string | null;
  submitted_at?: string;
}

/**
 * Broadcasts an instant platform notification to all connected PWA and browser clients
 * via the shared Supabase Realtime channel.
 * Ensures channel is subscribed before sending.
 */
export async function broadcastPlatformEvent(
  event: PlatformNotificationEvent,
  payload: Record<string, any>
) {
  try {
    let channel = supabase.getChannels().find(
      (c) => c.topic === 'realtime:platform_messenger_global'
    );

    if (!channel || channel.state !== 'joined') {
      channel = supabase.channel('platform_messenger_global');
      await new Promise<void>((resolve) => {
        channel!.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            resolve();
          }
        });
        setTimeout(resolve, 1500);
      });
    }

    await channel.send({
      type: 'broadcast',
      event,
      payload: {
        ...payload,
        _sentAt: Date.now(),
        _eventId: `${event}-${payload.id || payload.room_token || Date.now()}`,
      },
    });
  } catch (err) {
    console.warn('Error broadcasting platform notification:', err);
  }
}
