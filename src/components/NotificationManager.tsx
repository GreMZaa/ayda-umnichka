'use client';

import React, { useEffect, useState, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  X,
  Check,
  Calendar,
  BookOpen,
  CheckCircle2,
  Video,
  MessageCircle,
  ExternalLink,
  Volume2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// Play a crystal-clear, gentle notification chime via Web Audio API (zero external assets needed)
export const playNotificationChime = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Harmonic bell chime: Two oscillators (F#5 and C#6)
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(739.99, now); // F#5
    osc1.frequency.exponentialRampToValueAtTime(1108.73, now + 0.12); // C#6

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1108.73, now); // C#6
    osc2.frequency.exponentialRampToValueAtTime(1479.98, now + 0.15); // F#6

    gainNode.gain.setValueAtTime(0.25, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.55);
    osc2.stop(now + 0.55);
  } catch (_) {}
};

// Dispatch native system OS notification (Appears directly in the Android / iOS / Windows notification shade)
export const showSystemNotification = async (payload: {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}) => {
  if (typeof window === 'undefined') return;
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const targetUrl = payload.url || '/messenger';
  const uniqueTag = payload.tag ? `${payload.tag}-${Date.now()}` : `aida-${Date.now()}`;

  const options: any = {
    body: payload.body,
    icon: '/icon-192.png',
    badge: '/icon.png',
    data: { url: targetUrl },
    tag: uniqueTag,
    renotify: true,
    requireInteraction: true,
    vibrate: [300, 100, 300, 100, 300],
    actions: [{ action: 'open', title: 'Открыть' }],
  };

  // 1. Try Service Worker first (Required for PWA & Android notification shade)
  if ('serviceWorker' in navigator) {
    try {
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 1200)),
      ]);

      if (reg && 'showNotification' in reg) {
        await reg.showNotification(payload.title, options);
        return;
      }
    } catch (swErr) {
      console.warn('SW notification error:', swErr);
    }
  }

  // 2. Fallback to standard Notification API
  try {
    const notif = new Notification(payload.title, options);
    notif.onclick = () => {
      window.focus();
      if (targetUrl) {
        window.location.href = targetUrl;
      }
      notif.close();
    };
  } catch (_) {}
};

interface InAppAlert {
  id: string;
  type: 'message' | 'lesson' | 'homework' | 'live';
  title: string;
  body: string;
  url: string;
  iconBg: string;
  iconColor: string;
  category: string;
}

export default function NotificationManager() {
  const router = useRouter();
  const pathname = usePathname() || '';
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [showPromptBanner, setShowPromptBanner] = useState(false);
  const [justEnabled, setJustEnabled] = useState(false);
  const [activeAlert, setActiveAlert] = useState<InAppAlert | null>(null);

  // Deduplication cache to prevent twin alerts
  const seenEventsRef = useRef<Set<string>>(new Set());

  // Helper to get active user ID, role and name
  const getUserContext = () => {
    if (typeof window === 'undefined') {
      return { publicId: '', role: 'student', fullName: '' };
    }

    const pathPart = pathname.match(/^\/([^/?#]+)/)?.[1]?.toLowerCase();
    const isSpecialPath = ['admin', 'teacher', 'student', 'login', 'messenger', 'room', 'api'].includes(pathPart || '');
    
    // Check path ID first (e.g. /id571210) so student is recognized immediately on their page
    const publicId = (
      (!isSpecialPath && pathPart ? pathPart : '') ||
      localStorage.getItem('aida_auth_user_id') ||
      localStorage.getItem('aida_user_id') ||
      localStorage.getItem('aida_custom_slug') ||
      document.cookie.match(/(?:^|; )aida_auth_user_id=([^;]*)/)?.[1] ||
      document.cookie.match(/(?:^|; )aida_user_id=([^;]*)/)?.[1] ||
      ''
    ).toLowerCase();

    const role = (
      localStorage.getItem('aida_role') ||
      localStorage.getItem('aida_active_role') ||
      document.cookie.match(/(?:^|; )aida_active_role=([^;]*)/)?.[1] ||
      document.cookie.match(/(?:^|; )aida_role=([^;]*)/)?.[1] ||
      (pathname.startsWith('/teacher')
        ? 'teacher'
        : pathname.startsWith('/admin')
        ? 'admin'
        : 'student')
    ).toLowerCase();

    const fullName = (
      localStorage.getItem('aida_full_name') ||
      localStorage.getItem('aida_user_name') ||
      ''
    ).toLowerCase();

    return { publicId, role, fullName };
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    setPermission(Notification.permission);

    const dismissed = localStorage.getItem('aida_notification_prompt_dismissed');
    if (Notification.permission === 'default' && !dismissed) {
      const timer = setTimeout(() => setShowPromptBanner(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  const requestPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      setShowPromptBanner(false);

      if (result === 'granted') {
        setJustEnabled(true);
        setTimeout(() => setJustEnabled(false), 3500);

        playNotificationChime();
        await showSystemNotification({
          title: '🎉 АйДаУмничка: Уведомления в шторку включены!',
          body: 'Отлично! Теперь все напоминания об уроках, домашних заданиях и сообщениях будут приходить прямо сюда.',
          url: '/messenger',
        });
      }
    } catch (err) {
      console.warn('Notification permission error:', err);
    }
  };

  const dismissPrompt = () => {
    setShowPromptBanner(false);
    try {
      localStorage.setItem('aida_notification_prompt_dismissed', 'true');
    } catch (_) {}
  };

  const triggerPlatformAlert = async (alert: InAppAlert, tag: string) => {
    // Notify other components (Navbar badge, lists)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('aida-user-updated'));
    }

    // Always dispatch system OS / PWA notification strictly into phone/desktop notification shade
    await showSystemNotification({
      title: alert.title,
      body: alert.body,
      url: alert.url,
      tag,
    });
  };

  // 1. Global listener for platform events via Supabase Realtime
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const channel = supabase.channel('platform_messenger_global');

    // 1.1 New Messenger & Lesson Chat Messages
    channel.on('broadcast', { event: 'new-message' }, async (eventPayload) => {
      const msg = eventPayload?.payload;
      if (!msg) return;

      const eventKey = `msg-${msg.id || msg.created_at || msg.text}`;
      if (seenEventsRef.current.has(eventKey)) return;
      seenEventsRef.current.add(eventKey);
      setTimeout(() => seenEventsRef.current.delete(eventKey), 5000);

      const { publicId } = getUserContext();
      const senderPubId = (msg.senderPublicId || '').toLowerCase();
      if (senderPubId && publicId && senderPubId === publicId) {
        return; // Don't notify self
      }

      const senderName = msg.senderName || (msg.senderRole === 'teacher' ? 'Преподаватель' : 'Ученик');
      let previewText = msg.text || '';
      if (msg.file_type?.startsWith('audio/') || msg.voice_duration_sec) {
        previewText = '🎙 Голосовое сообщение';
      } else if (msg.file_url) {
        previewText = '📎 Прикреплен файл или фото';
      }

      const isCurrentChat = pathname.startsWith('/messenger') && window.location.search.includes(senderPubId);
      if (!isCurrentChat) {
        await triggerPlatformAlert(
          {
            id: `msg-${Date.now()}`,
            type: 'message',
            category: 'Новое сообщение',
            title: `💬 АйДаУмничка: ${senderName}`,
            body: previewText || 'Вам отправлено сообщение в чате',
            url: `/messenger${senderPubId ? `?chatWith=${encodeURIComponent(senderPubId)}` : ''}`,
            iconBg: 'bg-[#FFF2E6]',
            iconColor: 'text-coralAccent',
          },
          `msg-${msg.conversation_id || 'chat'}`
        );
      }
    });

    // 1.2 Lesson Scheduled / Created (Realtime)
    channel.on('broadcast', { event: 'lesson-scheduled' }, async (eventPayload) => {
      const l = eventPayload?.payload;
      if (!l) return;

      const eventKey = `lesson-sched-${l.id || l.room_token || l.scheduled_for}`;
      if (seenEventsRef.current.has(eventKey)) return;
      seenEventsRef.current.add(eventKey);
      setTimeout(() => seenEventsRef.current.delete(eventKey), 5000);

      const { publicId, role, fullName } = getUserContext();
      if (l.creator_id && l.creator_id.toLowerCase() === publicId && publicId !== '') {
        return; // Don't notify creator
      }

      // Check if student matches by publicId, by name, or if user is on student cabinet
      const targetStudent = (l.student_public_id || '').toLowerCase();
      const targetName = (l.student_name || '').toLowerCase();
      const isRecipient =
        targetStudent === publicId ||
        (targetStudent && pathname.toLowerCase().includes(targetStudent)) ||
        (targetName && fullName && (targetName.includes(fullName) || fullName.includes(targetName))) ||
        (role === 'student' && (!targetStudent || targetStudent === 'all'));

      if (isRecipient || role === 'admin') {
        let timeStr = '';
        if (l.scheduled_for) {
          try {
            const d = new Date(l.scheduled_for);
            timeStr = ` на ${d.toLocaleDateString('ru-RU', { timeZone: 'Europe/Samara', day: 'numeric', month: 'short' })} в ${d.toLocaleTimeString('ru-RU', { timeZone: 'Europe/Samara', hour: '2-digit', minute: '2-digit' })}`;
          } catch (_) {}
        }

        const teacher = l.teacher_name || 'Преподаватель';
        const topic = l.topic || 'Индивидуальное занятие';

        await triggerPlatformAlert(
          {
            id: `lesson-${Date.now()}`,
            type: 'lesson',
            category: 'Расписание уроков',
            title: '📅 АйДаУмничка: Назначен урок!',
            body: `${teacher}: ${topic}${timeStr}`,
            url: targetStudent ? `/${targetStudent}` : publicId ? `/${publicId}` : '/student',
            iconBg: 'bg-[#EFF6FF]',
            iconColor: 'text-[#2563EB]',
          },
          `lesson-${l.room_token || l.id || 'sched'}`
        );
      }
    });

    // 1.3 Lesson Started / Teacher in Room
    channel.on('broadcast', { event: 'lesson-started' }, async (eventPayload) => {
      const l = eventPayload?.payload;
      if (!l || !l.room_token) return;

      const eventKey = `lesson-start-${l.room_token}`;
      if (seenEventsRef.current.has(eventKey)) return;
      seenEventsRef.current.add(eventKey);
      setTimeout(() => seenEventsRef.current.delete(eventKey), 10000);

      const { publicId, role } = getUserContext();
      if (pathname.includes(`/room/${l.room_token}`)) return;

      const targetStudent = (l.student_public_id || '').toLowerCase();
      const isRecipient =
        targetStudent === publicId ||
        (targetStudent && pathname.toLowerCase().includes(targetStudent)) ||
        (role === 'student' && (!targetStudent || targetStudent === 'all'));

      if (isRecipient) {
        const teacher = l.teacher_name || 'Преподаватель';
        const topic = l.topic || 'Индивидуальное занятие';

        await triggerPlatformAlert(
          {
            id: `live-${Date.now()}`,
            type: 'live',
            category: 'Урок начался',
            title: '🔴 АйДаУмничка: Урок начался!',
            body: `${teacher} ждёт вас в онлайн-классе «${topic}»`,
            url: `/room/${l.room_token}`,
            iconBg: 'bg-[#FEF2F2]',
            iconColor: 'text-[#DC2626]',
          },
          `room-${l.room_token}`
        );
      }
    });

    // 1.4 Homework Assigned
    channel.on('broadcast', { event: 'homework-assigned' }, async (eventPayload) => {
      const hw = eventPayload?.payload;
      if (!hw) return;

      const eventKey = `hw-assign-${hw.id || hw.title}`;
      if (seenEventsRef.current.has(eventKey)) return;
      seenEventsRef.current.add(eventKey);
      setTimeout(() => seenEventsRef.current.delete(eventKey), 5000);

      const { publicId, role } = getUserContext();
      if (hw.creator_id && hw.creator_id.toLowerCase() === publicId && publicId !== '') {
        return;
      }

      const targetStudent = (hw.student_public_id || '').toLowerCase();
      const isRecipient =
        targetStudent === publicId ||
        (targetStudent && pathname.toLowerCase().includes(targetStudent)) ||
        (role === 'student' && (!targetStudent || targetStudent === 'all'));

      if (isRecipient || role === 'admin') {
        const teacher = hw.teacher_name || 'Преподаватель';
        const title = hw.title || 'Новое задание';
        const hasAttachment = Boolean(hw.task_file_url);

        await triggerPlatformAlert(
          {
            id: `hw-${Date.now()}`,
            type: 'homework',
            category: 'Домашнее задание',
            title: '📚 АйДаУмничка: Загружено ДЗ!',
            body: `${teacher} назначил задание «${title}»${hasAttachment ? ' 📎 (с материалами)' : ''}`,
            url: `/student/homework`,
            iconBg: 'bg-[#F0FDF4]',
            iconColor: 'text-[#16A34A]',
          },
          `hw-${hw.id || 'assigned'}`
        );
      }
    });

    // 1.5 Homework Submitted
    channel.on('broadcast', { event: 'homework-submitted' }, async (eventPayload) => {
      const hw = eventPayload?.payload;
      if (!hw) return;

      const eventKey = `hw-sub-${hw.id || hw.title}-${hw.submitted_at || ''}`;
      if (seenEventsRef.current.has(eventKey)) return;
      seenEventsRef.current.add(eventKey);
      setTimeout(() => seenEventsRef.current.delete(eventKey), 5000);

      const { role } = getUserContext();
      if (role === 'teacher' || role === 'admin') {
        const student = hw.student_name || 'Ученик';
        const title = hw.title || 'Задание';

        await triggerPlatformAlert(
          {
            id: `sub-${Date.now()}`,
            type: 'homework',
            category: 'ДЗ сдано на проверку',
            title: '✅ АйДаУмничка: Домашка сдана!',
            body: `${student} сдал решение по теме «${title}»`,
            url: `/teacher/homework${hw.student_public_id ? `?studentId=${hw.student_public_id}&studentName=${encodeURIComponent(student)}` : ''}`,
            iconBg: 'bg-[#F0FDF4]',
            iconColor: 'text-[#16A34A]',
          },
          `hw-sub-${hw.id || 'submit'}`
        );
      }
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pathname]);

  return (
    <>
      {/* Toast confirmation when permission granted */}
      {justEnabled && (
        <div className="fixed bottom-5 right-5 z-[9999] bg-[#161F38] text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs animate-in slide-in-from-bottom-3 duration-200">
          <div className="w-6 h-6 rounded-full bg-[#5C8519] flex items-center justify-center shrink-0">
            <Check className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold">Уведомления в шторку успешно подключены!</span>
        </div>
      )}

      {/* 3. Banner to request notification permission for Android / iOS shade */}
      {showPromptBanner && permission === 'default' && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-[9999] bg-white border border-[#F2DECE] rounded-3xl p-4 shadow-xl shadow-orange-950/10 animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FFF2E6] text-coralAccent border border-[#FCDDC7] flex items-center justify-center shrink-0 shadow-2xs">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              <h4 className="font-black text-xs sm:text-sm text-[#161F38] leading-tight">
                Включить уведомления в шторку?
              </h4>
              <p className="text-[11px] text-[#6B758E] leading-relaxed">
                Вы будете моментально получать пуши в шторку телефона при назначении уроков, новых домашних заданиях и сообщениях, даже когда приложение свёрнуто.
              </p>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={requestPermission}
                  className="bg-coralAccent hover:bg-coralAccent-hover text-white text-xs font-black px-4 py-1.5 rounded-full shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  Включить в шторку
                </button>
                <button
                  type="button"
                  onClick={dismissPrompt}
                  className="text-xs font-bold text-[#8A95A8] hover:text-[#161F38] px-2.5 py-1.5 rounded-full transition-colors cursor-pointer"
                >
                  Позже
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={dismissPrompt}
              className="text-[#8A95A8] hover:text-[#161F38] p-1 rounded-lg transition-colors cursor-pointer -mt-1 -mr-1"
              title="Закрыть"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
