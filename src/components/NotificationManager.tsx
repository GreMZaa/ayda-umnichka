'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Bell, X, Check, Volume2 } from 'lucide-react';
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

    gainNode.gain.setValueAtTime(0.2, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.5);
    osc2.stop(now + 0.5);
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
    tag: payload.tag || 'aida-chat-msg',
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

export default function NotificationManager() {
  const pathname = usePathname() || '';
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [showPromptBanner, setShowPromptBanner] = useState(false);
  const [justEnabled, setJustEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    setPermission(Notification.permission);

    // Show prompt in messenger or dashboard if user hasn't made a choice yet
    const dismissed = localStorage.getItem('aida_notification_prompt_dismissed');
    if (Notification.permission === 'default' && !dismissed) {
      // Delay slightly for smooth page render
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
          title: 'АйДаУмничка: Уведомления включены!',
          body: 'Теперь вы мгновенно узнаете о новых сообщениях и домашних заданиях.',
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

  // Global listener for incoming messages via Supabase Realtime
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const channel = supabase.channel('platform_messenger_global');

    channel
      .on('broadcast', { event: 'new-message' }, async (payload) => {
        const msg = payload?.payload;
        if (!msg) return;

        // Verify if message is from another user
        const activePublicId =
          localStorage.getItem('aida_auth_user_id') ||
          localStorage.getItem('aida_user_id') ||
          document.cookie.match(/(?:^|; )aida_auth_user_id=([^;]*)/)?.[1] ||
          '';

        const senderPubId = msg.senderPublicId || '';
        if (senderPubId && activePublicId && senderPubId.toLowerCase() === activePublicId.toLowerCase()) {
          return; // Sent by myself
        }

        // Notify Navbar and other components to update badge counters
        window.dispatchEvent(new Event('aida-user-updated'));

        // Play gentle audio chime
        playNotificationChime();

        // Check if tab is in background or another chat is currently active
        const isTabHidden = document.visibilityState === 'hidden';
        const isNotOnMessenger = !window.location.pathname.startsWith('/messenger');

        if (isTabHidden || isNotOnMessenger) {
          const senderName = msg.senderName || msg.senderRole === 'teacher' ? 'Преподаватель' : 'Ученик';
          let previewText = msg.text || '';
          if (msg.file_type?.startsWith('audio/') || msg.voice_duration_sec) {
            previewText = '🎙 Голосовое сообщение';
          } else if (msg.file_url) {
            previewText = '📎 Прикреплен файл или фото';
          }

          await showSystemNotification({
            title: `💬 АйДаУмничка: ${senderName}`,
            body: previewText || 'Вам отправлено новое сообщение в чате',
            url: `/messenger${senderPubId ? `?chatWith=${encodeURIComponent(senderPubId)}` : ''}`,
            tag: `msg-${msg.conversation_id || 'general'}`,
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <>
      {/* Toast confirmation when permission granted */}
      {justEnabled && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#161F38] text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs animate-in slide-in-from-bottom-3 duration-200">
          <div className="w-6 h-6 rounded-full bg-[#5C8519] flex items-center justify-center shrink-0">
            <Check className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold">Уведомления PWA успешно подключены!</span>
        </div>
      )}

      {/* Discreet Banner to request notification permission in Messenger & LK */}
      {showPromptBanner && permission === 'default' && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 bg-white border border-[#F2DECE] rounded-3xl p-4 shadow-xl shadow-orange-950/10 animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FFF2E6] text-coralAccent border border-[#FCDDC7] flex items-center justify-center shrink-0 shadow-2xs">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              <h4 className="font-black text-xs sm:text-sm text-[#161F38] leading-tight">
                Включить уведомления о сообщениях?
              </h4>
              <p className="text-[11px] text-[#6B758E] leading-relaxed">
                Вы будете моментально получать пуши при входящих сообщениях от преподавателей и учеников, даже когда приложение свёрнуто.
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
