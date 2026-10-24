'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import VoiceRecorder from '@/components/VoiceRecorder';
import { INITIAL_MESSAGES } from '@/lib/store';
import { ChatMessage } from '@/types';
import { MessageCircle, Send, Paperclip, Video, Play, Pause, Bell, ArrowRight } from 'lucide-react';
import { formatTime } from '@/lib/utils';

export default function MessengerPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [activeChat, setActiveChat] = useState<'teacher' | 'system'>('teacher');
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: 'user-student-1',
      senderName: 'Тимофей (мама: Елена)',
      senderRole: 'student',
      type: 'text',
      text: inputText.trim(),
      createdAt: new Date().toISOString(),
    };

    setMessages([...messages, newMsg]);
    setInputText('');
  };

  const handleSendVoice = (durationSec: number) => {
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: 'user-student-1',
      senderName: 'Тимофей',
      senderRole: 'student',
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
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden h-[calc(100vh-140px)] min-h-[620px] grid grid-cols-1 md:grid-cols-3">
      {/* Left Chat List Column */}
      <div className="border-r border-slate-200 bg-slate-50 flex flex-col">
        <div className="p-4 border-b border-slate-200 bg-white">
          <h2 className="font-bold text-base text-slate-800">Диалоги и Уведомления</h2>
          <p className="text-xs text-slate-500">Мессенджер центра «АйДаУмничка»</p>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {/* Teacher Chat */}
          <button
            onClick={() => setActiveChat('teacher')}
            className={`w-full p-4 text-left transition-colors flex items-start gap-3 ${
              activeChat === 'teacher' ? 'bg-indigo-50/70 border-l-4 border-brand-600' : 'hover:bg-slate-100/60'
            }`}
          >
            <div className="w-11 h-11 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">
              СВ
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <h4 className="font-bold text-xs text-slate-800 truncate">
                  Светлана Васильевна (Логопед)
                </h4>
                <span className="text-[10px] text-slate-400">12:45</span>
              </div>
              <p className="text-xs text-slate-500 truncate">
                Приготовьте цветные карандаши для интерактивной доски...
              </p>
            </div>
          </button>

          {/* System Notifications Chat */}
          <button
            onClick={() => setActiveChat('system')}
            className={`w-full p-4 text-left transition-colors flex items-start gap-3 ${
              activeChat === 'system' ? 'bg-indigo-50/70 border-l-4 border-brand-600' : 'hover:bg-slate-100/60'
            }`}
          >
            <div className="w-11 h-11 rounded-2xl bg-solar-100 text-solar-700 flex items-center justify-center font-bold text-sm shrink-0">
              <Bell className="w-5 h-5 text-solar-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <h4 className="font-bold text-xs text-slate-800 truncate">
                  Уведомления «АйДаУмничка»
                </h4>
                <span className="text-[10px] text-slate-400">Вчера</span>
              </div>
              <p className="text-xs text-slate-500 truncate">
                Баланс пополнен на +8 занятий. Приятных уроков!
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Right Chat Thread Column */}
      <div className="md:col-span-2 flex flex-col bg-white">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm">
              {activeChat === 'teacher' ? 'СВ' : '🔔'}
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-800">
                {activeChat === 'teacher' ? 'Светлана Васильевна Морозова' : 'Системный сервисный чат'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {activeChat === 'teacher' ? 'Логопед-дефектолог • В сети' : 'Центр развития «АйДаУмничка»'}
              </p>
            </div>
          </div>

          {activeChat === 'teacher' && (
            <Link
              href="/room/room-logoped-timofey"
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition-all"
            >
              <Video className="w-3.5 h-3.5" />
              <span>Войти в урок</span>
            </Link>
          )}
        </div>

        {/* Message Thread */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
          {activeChat === 'system' ? (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-slate-800">
                <div className="font-bold text-amber-900 mb-1">Пополнение абонемента</div>
                Вам начислено +8 занятий по абонементу «Юный оратор». Текущий баланс: 6 уроков.
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800">
                <div className="font-bold text-slate-800 mb-1">Урок успешно проведен</div>
                Занятие «Автоматизация звука [Р]» завершено (45 мин). Списано 1 занятие с баланса.
              </div>
            </div>
          ) : (
            <>
              {/* On-Demand Call Invite Card in Chat (Solid brand tint, no gradient) */}
              <div className="p-4 rounded-2xl bg-brand-50 border-2 border-brand-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center shrink-0">
                    <Video className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-brand-700 uppercase tracking-wider">
                      Приглашение на On-Demand урок
                    </span>
                    <h4 className="text-xs font-bold text-slate-800">
                      Тема: Автоматизация звука [Р] в словах и скороговорках
                    </h4>
                  </div>
                </div>
                <Link
                  href="/room/room-logoped-timofey"
                  className="inline-flex items-center gap-1 bg-brand-600 hover:bg-brand-700 text-white px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm shrink-0"
                >
                  <span>Присоединиться</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${
                    m.senderRole === 'student' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div className="text-[10px] text-slate-400 mb-1 px-1">
                    {m.senderName}
                  </div>

                  {m.type === 'voice' ? (
                    <div
                      className={`p-3 rounded-2xl flex items-center gap-3 shadow-sm max-w-sm ${
                        m.senderRole === 'student'
                          ? 'bg-brand-600 text-white rounded-br-none'
                          : 'bg-slate-100 text-slate-800 rounded-bl-none'
                      }`}
                    >
                      <button
                        onClick={() => toggleVoicePlayback(m.id)}
                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                          m.senderRole === 'student'
                            ? 'bg-white text-brand-600 hover:bg-white/90'
                            : 'bg-brand-600 text-white hover:bg-brand-700'
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
                                m.senderRole === 'student' ? 'bg-white/80' : 'bg-brand-500'
                              } ${playingVoiceId === m.id ? 'animate-pulse' : ''}`}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] opacity-80 block mt-1">
                          Голосовое сообщение ({formatTime(m.voiceDurationSec || 15)})
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`p-3.5 rounded-2xl text-xs max-w-md leading-relaxed shadow-sm ${
                        m.senderRole === 'student'
                          ? 'bg-brand-600 text-white rounded-br-none'
                          : 'bg-slate-100 text-slate-800 rounded-bl-none'
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
          <div className="p-3 border-t border-slate-200 bg-slate-50 space-y-2">
            <div className="flex items-center gap-2">
              <VoiceRecorder onSendVoice={handleSendVoice} />
            </div>

            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Сообщение педагогу..."
                className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button
                type="submit"
                className="p-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-sm transition-all"
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
