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
              СВ
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <h4 className="font-extrabold text-xs text-ink-900 truncate">
                  Светлана Васильевна (Логопед)
                </h4>
                <span className="text-[10px] text-ink-400">12:45</span>
              </div>
              <p className="text-xs text-ink-500 truncate">
                Приготовьте цветные карандаши для интерактивной доски...
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
                <span className="text-[10px] text-ink-400">Вчера</span>
              </div>
              <p className="text-xs text-ink-500 truncate">
                Баланс пополнен на +8 занятий. Приятных уроков!
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
              {activeChat === 'teacher' ? 'СВ' : '🔔'}
            </div>
            <div>
              <h3 className="font-black text-sm text-ink-900">
                {activeChat === 'teacher' ? 'Светлана Васильевна Морозова' : 'Системный сервисный чат'}
              </h3>
              <p className="text-[11px] text-ink-500">
                {activeChat === 'teacher' ? 'Логопед-дефектолог • В сети' : 'Центр развития «АйДаУмничка»'}
              </p>
            </div>
          </div>

          {activeChat === 'teacher' && (
            <Link
              href="/room/room-logoped-timofey"
              className="inline-flex items-center gap-2 bg-limeAccent hover:bg-limeAccent-hover text-ink-900 px-4 py-2 rounded-full text-xs font-black shadow-xs transition-[background-color,transform,box-shadow] duration-140 ease-out-emil active:scale-[0.97] cursor-pointer"
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
              <div className="p-4 rounded-2xl bg-[#FFF7EE] border border-[#F2E2D0] text-xs text-ink-800">
                <div className="font-bold text-coralAccent mb-1">Пополнение абонемента</div>
                Вам начислено +8 занятий по абонементу «Юный оратор». Текущий баланс: 6 уроков.
              </div>
              <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-200 text-xs text-ink-800">
                <div className="font-bold text-ink-900 mb-1">Урок успешно проведен</div>
                Занятие «Автоматизация звука [Р]» завершено (45 мин). Списано 1 занятие с баланса.
              </div>
            </div>
          ) : (
            <>
              {/* On-Demand Call Invite Card in Chat */}
              <div className="p-4 rounded-3xl bg-[#FFF8F1] border-2 border-coralAccent/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-coralAccent text-white flex items-center justify-center shrink-0">
                    <Video className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-coralAccent uppercase tracking-wider">
                      Приглашение на On-Demand урок
                    </span>
                    <h4 className="text-xs font-black text-ink-900">
                      Тема: Автоматизация звука [Р] в словах и скороговорках
                    </h4>
                  </div>
                </div>
                <Link
                  href="/room/room-logoped-timofey"
                  className="inline-flex items-center gap-1.5 bg-limeAccent hover:bg-limeAccent-hover text-ink-900 px-4 py-2 rounded-full text-xs font-black transition-[background-color,transform,box-shadow] duration-140 ease-out-emil active:scale-[0.97] shadow-xs shrink-0"
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
                className="flex-1 bg-white border border-[#EADBCC] rounded-full px-5 py-2.5 text-xs text-ink-900 focus:outline-none focus:ring-2 focus:ring-coralAccent"
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
