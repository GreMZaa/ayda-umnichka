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

// Dispatch native system OS notification
export const showSystemNotification = async (payload: {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}) => {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const options: NotificationOptions & { renotify?: boolean } = {
    body: payload.body,
    icon: '/icon-192.png',
    badge: '/icon.png',
    data: { url: payload.url || '/messenger' },
    tag: payload.tag || 'aida-notif',
    renotify: true,
  };

  // Try service worker registration first (optimal for PWA on Android, Windows, Mac)
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(payload.title, options);
        return;
      }
    } catch (_) {}
  }

  // Fallback to standard Notification API
  try {
    const notif = new Notification(payload.title, options);
    notif.onclick = () => {
      window.focus();
      if (payload.url) {
        window.location.href = payload.url;
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

  // Deduplication cache to prevent twin alerts from client + server triggers
  const seenEventsRef = useRef<Set<string>>(new Set());

  // Helper to get active user ID and role
  const getUserContext = () => {
    if (typeof window === 'undefined') {
      return { publicId: '', role: 'student' };
    }

    const publicId = (
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

    return { publicId, role };
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    setPermission(Notification.permission);

    const dismissed = localStorage.getItem('aida_notification_prompt_dismissed');
    if (Notification.permission === 'default' && !dismissed) {
      const timer = setTimeout(() => setShowPromptBanner(true), 2500);
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
          title: 'АйДаУмничка: Уведомления включены!',
          body: 'Теперь вы мгновенно узнаете о новых уроках, домашних заданиях и сообщениях.',
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
    // Play bell sound
    playNotificationChime();

    // Notify other components (Navbar badge, lists)
    window.dispatchEvent(new Event('aida-user-updated'));

    // Show in-app banner
    setActiveAlert(alert);

    // Auto-hide in-app toast after 6 seconds
    setTimeout(() => {
      setActiveAlert((curr) => (curr?.id === alert.id ? null : curr));
    }, 6000);

    // Always dispatch system OS / PWA notification
    await showSystemNotification({
      title: alert.title,
      body: alert.body,
      url: alert.url,
      tag,
    });
  };

  // Global listener for platform events via Supabase Realtime
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const channel = supabase.channel('platform_messenger_global');

    // 1. New Messenger & Lesson Chat Messages
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

      const isCurrentChat = pathname.startsWith('/messenger') && (window.location.search.includes(senderPubId));
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

    // 2. Lesson Scheduled / Created
    channel.on('broadcast', { event: 'lesson-scheduled' }, async (eventPayload) => {
      const l = eventPayload?.payload;
      if (!l) return;

      const eventKey = `lesson-sched-${l.id || l.room_token || l.scheduled_for}`;
      if (seenEventsRef.current.has(eventKey)) return;
      seenEventsRef.current.add(eventKey);
      setTimeout(() => seenEventsRef.current.delete(eventKey), 5000);

      const { publicId, role } = getUserContext();
      if (l.creator_id && l.creator_id.toLowerCase() === publicId) {
        return; // Don't notify creator
      }

      // Check if this student should receive notification
      const targetStudent = (l.student_public_id || '').toLowerCase();
      const isRecipient =
        role === 'student' &&
        (!targetStudent || targetStudent === publicId || targetStudent === 'all');

      if (isRecipient || role === 'admin') {
        let timeStr = '';
        if (l.scheduled_for) {
          try {
            const d = new Date(l.scheduled_for);
            timeStr = ` на ${d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} в ${d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
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
            url: l.room_token ? `/room/${l.room_token}` : `/${publicId || 'student'}`,
            iconBg: 'bg-[#EFF6FF]',
            iconColor: 'text-[#2563EB]',
          },
          `lesson-${l.room_token || 'sched'}`
        );
      }
    });

    // 3. Lesson Started / Teacher Active in Room
    channel.on('broadcast', { event: 'lesson-started' }, async (eventPayload) => {
      const l = eventPayload?.payload;
      if (!l || !l.room_token) return;

      const eventKey = `lesson-start-${l.room_token}`;
      if (seenEventsRef.current.has(eventKey)) return;
      seenEventsRef.current.add(eventKey);
      setTimeout(() => seenEventsRef.current.delete(eventKey), 10000);

      const { publicId, role } = getUserContext();
      // Only notify student if not on room page
      const isOnRoomPage = pathname.includes(`/room/${l.room_token}`);
      if (isOnRoomPage) return;

      const targetStudent = (l.student_public_id || '').toLowerCase();
      const isRecipient =
        role === 'student' &&
        (!targetStudent || targetStudent === publicId || targetStudent === 'all');

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

    // 4. Homework Assigned / Uploaded by Teacher
    channel.on('broadcast', { event: 'homework-assigned' }, async (eventPayload) => {
      const hw = eventPayload?.payload;
      if (!hw) return;

      const eventKey = `hw-assign-${hw.id || hw.title}`;
      if (seenEventsRef.current.has(eventKey)) return;
      seenEventsRef.current.add(eventKey);
      setTimeout(() => seenEventsRef.current.delete(eventKey), 5000);

      const { publicId, role } = getUserContext();
      if (hw.creator_id && hw.creator_id.toLowerCase() === publicId) {
        return; // Don't notify creator teacher
      }

      const targetStudent = (hw.student_public_id || '').toLowerCase();
      const isRecipient =
        role === 'student' &&
        (!targetStudent || targetStudent === publicId || targetStudent === 'all');

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

    // 5. Homework Submitted by Student
    channel.on('broadcast', { event: 'homework-submitted' }, async (eventPayload) => {
      const hw = eventPayload?.payload;
      if (!hw) return;

      const eventKey = `hw-sub-${hw.id || hw.title}-${hw.submitted_at || ''}`;
      if (seenEventsRef.current.has(eventKey)) return;
      seenEventsRef.current.add(eventKey);
      setTimeout(() => seenEventsRef.current.delete(eventKey), 5000);

      const { role } = getUserContext();

      // Only notify teachers and admins
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

  const handleNavigateAlert = (url: string) => {
    setActiveAlert(null);
    if (url.startsWith('/')) {
      router.push(url);
    } else {
      window.location.href = url;
    }
  };

  return (
    <>
      {/* 1. Floating In-App Toast Alert (Modern, Animated, Clickable) */}
      {activeAlert && (
        <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-[9999] animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="bg-white/95 backdrop-blur-md border border-[#F2DECE] rounded-2xl p-3.5 shadow-2xl shadow-orange-950/15 flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-xl ${activeAlert.iconBg} ${activeAlert.iconColor} flex items-center justify-center shrink-0 border border-black/5 shadow-2xs`}
            >
              {activeAlert.type === 'message' && <MessageCircle className="w-5 h-5" />}
              {activeAlert.type === 'lesson' && <Calendar className="w-5 h-5" />}
              {activeAlert.type === 'live' && <Video className="w-5 h-5 animate-pulse" />}
              {activeAlert.type === 'homework' && <BookOpen className="w-5 h-5" />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#A06132]">
                  {activeAlert.category}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveAlert(null)}
                  className="text-[#8A95A8] hover:text-[#161F38] p-0.5 rounded cursor-pointer"
                  title="Закрыть"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <h4 className="font-black text-xs text-[#161F38] leading-tight truncate">
                {activeAlert.title}
              </h4>
              <p className="text-[11px] text-[#6B758E] leading-relaxed line-clamp-2 mt-0.5">
                {activeAlert.body}
              </p>

              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleNavigateAlert(activeAlert.url)}
                  className="inline-flex items-center gap-1.5 bg-coralAccent hover:bg-coralAccent-hover text-white text-xs font-bold px-3 py-1 rounded-full shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  <span>Открыть</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAlert(null)}
                  className="text-xs text-[#8A95A8] hover:text-[#161F38] px-2 py-1 transition-colors cursor-pointer"
                >
                  Скрыть
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Toast confirmation when permission granted */}
      {justEnabled && (
        <div className="fixed bottom-5 right-5 z-[9999] bg-[#161F38] text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs animate-in slide-in-from-bottom-3 duration-200">
          <div className="w-6 h-6 rounded-full bg-[#5C8519] flex items-center justify-center shrink-0">
            <Check className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold">Уведомления PWA успешно подключены!</span>
        </div>
      )}

      {/* 3. Discreet Banner to request notification permission */}
      {showPromptBanner && permission === 'default' && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-[9999] bg-white border border-[#F2DECE] rounded-3xl p-4 shadow-xl shadow-orange-950/10 animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FFF2E6] text-coralAccent border border-[#FCDDC7] flex items-center justify-center shrink-0 shadow-2xs">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              <h4 className="font-black text-xs sm:text-sm text-[#161F38] leading-tight">
                Включить уведомления о событиях?
              </h4>
              <p className="text-[11px] text-[#6B758E] leading-relaxed">
                Вы будете моментально узнавать о назначенных уроках, загруженных домашних заданиях и новых сообщениях, даже когда приложение свёрнуто.
              </p>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={requestPermission}
                  className="bg-coralAccent hover:bg-coralAccent-hover text-white text-xs font-black px-4 py-1.5 rounded-full shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  Включить
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
