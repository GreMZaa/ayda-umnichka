'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import VoiceRecorder from '@/components/VoiceRecorder';
import { INITIAL_MESSAGES } from '@/lib/store';
import { ChatMessage } from '@/types';
import { MessageCircle, Send, Video, Play, Pause, Bell, ArrowRight } from 'lucide-react';
import { formatTime } from '@/lib/utils';

export default function MessengerPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [activeChat, setActiveChat] = useState<'teacher' | 'system'>('teacher');
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const currentName = typeof window !== 'undefined' ? localStorage.getItem('aida_full_name') || 'Пользователь' : 'Пользователь';
    const currentRole = typeof window !== 'undefined' ? (localStorage.getItem('aida_active_role') || 'student') as 'student' | 'teacher' | 'admin' : 'student';

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: typeof window !== 'undefined' ? localStorage.getItem('aida_auth_user_id') || 'me' : 'me',
      senderName: currentName,
      senderRole: currentRole,
      type: 'text',
      text: inputText.trim(),
      createdAt: new Date().toISOString(),
    };

    setMessages([...messages, newMsg]);
    setInputText('');
  };

  const handleSendVoice = (durationSec: number) => {
    const currentName = typeof window !== 'undefined' ? localStorage.getItem('aida_full_name') || 'Пользователь' : 'Пользователь';
    const currentRole = typeof window !== 'undefined' ? (localStorage.getItem('aida_active_role') || 'student') as 'student' | 'teacher' | 'admin' : 'student';

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: typeof window !== 'undefined' ? localStorage.getItem('aida_auth_user_id') || 'me' : 'me',
      senderName: currentName,
      senderRole: currentRole,
      type: 'voice',
      voiceDurationSec: durationSec,
      createdAt: new Date().toISOString(),
    };

    setMessages([...messages, newMsg]);
  };

  const toggleVoicePlayback = (id: string) => {
    if (playingVoiceId === id) {
      setPlayingVoiceId(null);
    } else {
      setPlayingVoiceId(id);
    }
  };

  return (
    <div className="bg-white rounded-[36px] border border-[#F2E3D5] shadow-sm overflow-hidden h-[calc(100vh-140px)] min-h-[620px] grid grid-cols-1 md:grid-cols-3">
      {/* Left Chat List Column */}
      <div className="border-r border-[#F4E3D2] bg-[#FFF8F1] flex flex-col">
        <div className="p-5 border-b border-[#F4E3D2] bg-white">
          <h2 className="font-black text-base text-ink-900">Диалоги и Уведомления</h2>
          <p className="text-xs text-ink-500">Мессенджер центра «АйДаУмничка»</p>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[#F7EBE0]">
          {/* Teacher Chat */}
          <button
            onClick={() => setActiveChat('teacher')}
            className={`w-full p-4 text-left transition-colors flex items-start gap-3 ${
              activeChat === 'teacher' ? 'bg-[#FFF2E4] border-l-4 border-coralAccent' : 'hover:bg-white/80'
            }`}
          >
            <div className="w-11 h-11 rounded-2xl bg-white border border-[#F4DEC6] text-coralAccent flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
              💬
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <h4 className="font-extrabold text-xs text-ink-900 truncate">
                  Преподаватель центра
                </h4>
                <span className="text-[10px] text-ink-400">В сети</span>
              </div>
              <p className="text-xs text-ink-500 truncate">
                {messages.length > 0 ? messages[messages.length - 1].text : 'Нажмите, чтобы начать диалог'}
              </p>
            </div>
          </button>

          {/* System Notifications Chat */}
          <button
            onClick={() => setActiveChat('system')}
            className={`w-full p-4 text-left transition-colors flex items-start gap-3 ${
              activeChat === 'system' ? 'bg-[#FFF2E4] border-l-4 border-coralAccent' : 'hover:bg-white/80'
            }`}
          >
            <div className="w-11 h-11 rounded-2xl bg-[#FFF7EE] border border-[#F4DEC6] text-ink-900 flex items-center justify-center font-bold text-sm shrink-0">
              <Bell className="w-5 h-5 text-coralAccent" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <h4 className="font-extrabold text-xs text-ink-900 truncate">
                  Уведомления «АйДаУмничка»
                </h4>
                <span className="text-[10px] text-ink-400">Система</span>
              </div>
              <p className="text-xs text-ink-500 truncate">
                Важные системные уведомления и статус занятий
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Right Chat Thread Column */}
      <div className="md:col-span-2 flex flex-col bg-white">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#F4E3D2] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#FFF7EE] border border-[#F4DEC6] text-coralAccent flex items-center justify-center font-black text-sm">
              {activeChat === 'teacher' ? '💬' : '🔔'}
            </div>
            <div>
              <h3 className="font-black text-sm text-ink-900">
                {activeChat === 'teacher' ? 'Чат с преподавателем' : 'Системный сервисный чат'}
              </h3>
              <p className="text-[11px] text-ink-500">
                {activeChat === 'teacher' ? 'Центр развития «АйДаУмничка»' : 'Уведомления платформы'}
              </p>
            </div>
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
          {activeChat === 'system' ? (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-[#FFF7EE] border border-[#F2E2D0] text-xs text-ink-800 text-center py-8">
                <Bell className="w-8 h-8 text-coralAccent mx-auto mb-2 opacity-60" />
                <div className="font-bold text-ink-900 mb-1">Новых системных уведомлений нет</div>
                <p className="text-[11px] text-ink-500">
                  Здесь будут отображаться операции пополнения баланса и отчеты после проведенных занятий.
                </p>
              </div>
            </div>
          ) : (
            <>
              {messages.length === 0 ? (
                <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center p-6 space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-[#FFF7EE] text-coralAccent border border-[#F2DECE] flex items-center justify-center text-xl">
                    👋
                  </div>
                  <h4 className="font-black text-sm text-ink-900">Диалог пуст</h4>
                  <p className="text-xs text-ink-500 max-w-sm">
                    Напишите сообщение педагогу или отправьте голосовой ответ на домашнее задание.
                  </p>
                </div>
              ) : null}

              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${
                    m.senderRole === 'student' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div className="text-[10px] text-ink-400 mb-1 px-1 font-medium">
                    {m.senderName}
                  </div>

                  {m.type === 'voice' ? (
                    <div
                      className={`p-3.5 rounded-3xl flex items-center gap-3 shadow-xs max-w-sm ${
                        m.senderRole === 'student'
                          ? 'bg-coralAccent text-white rounded-br-none'
                          : 'bg-[#FFF7EE] border border-[#F2E2D0] text-ink-900 rounded-bl-none'
                      }`}
                    >
                      <button
                        onClick={() => toggleVoicePlayback(m.id)}
                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-[background-color,transform] duration-140 ease-out-emil active:scale-90 ${
                          m.senderRole === 'student'
                            ? 'bg-white text-coralAccent hover:bg-white/90'
                            : 'bg-coralAccent text-white hover:bg-coralAccent-hover'
                        }`}
                      >
                        {playingVoiceId === m.id ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4 translate-x-0.5" />
                        )}
                      </button>

                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 h-5">
                          {[40, 70, 30, 90, 60, 100, 45, 80, 50, 75, 30, 60].map((h, i) => (
                            <span
                              key={i}
                              style={{ height: `${h}%` }}
                              className={`w-1 rounded-full ${
                                m.senderRole === 'student' ? 'bg-white/80' : 'bg-coralAccent'
                              } ${playingVoiceId === m.id ? 'animate-pulse' : ''}`}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] opacity-80 block mt-1 font-medium">
                          Голосовое сообщение ({formatTime(m.voiceDurationSec || 15)})
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`p-4 rounded-3xl text-xs max-w-md leading-relaxed shadow-xs ${
                        m.senderRole === 'student'
                          ? 'bg-coralAccent text-white rounded-br-none font-medium'
                          : 'bg-[#FFF7EE] border border-[#F2E2D0] text-ink-800 rounded-bl-none font-medium'
                      }`}
                    >
                      {m.text}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>

        {/* Input Bar with Voice Recorder integration */}
        {activeChat === 'teacher' && (
          <div className="p-4 border-t border-[#F4E3D2] bg-[#FFF8F1] space-y-3">
            <div className="flex items-center gap-2">
              <VoiceRecorder onSendVoice={handleSendVoice} />
            </div>

            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Напишите сообщение педагогу..."
                className="flex-1 bg-white border border-[#EADBCC] rounded-full px-5 py-2.5 text-base sm:text-xs text-ink-900 focus:outline-none focus:ring-2 focus:ring-coralAccent"
              />
              <button
                type="submit"
                className="w-10 h-10 bg-coralAccent hover:bg-coralAccent-hover text-white rounded-full flex items-center justify-center shadow-xs transition-[background-color,transform] duration-140 ease-out-emil active:scale-90 shrink-0 cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
