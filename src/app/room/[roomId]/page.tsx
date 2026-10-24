'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import VideoCall from '@/components/VideoCall';
import Whiteboard from '@/components/Whiteboard';
import { MessageCircle, Send, CheckCircle2, Video, Layout } from 'lucide-react';

interface InCallMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
}

export default function LessonRoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = (params?.roomId as string) || 'demo-live-room';

  const [isWhiteboardActive, setIsWhiteboardActive] = useState(false);
  const [messages, setMessages] = useState<InCallMessage[]>([
    {
      id: '1',
      sender: 'Светлана Васильевна',
      text: 'Здравствуйте, Тимофей! Начинаем занятие. Открываю онлайн-доску для выполнения артикуляционной сказки.',
      time: '14:02',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMsg: InCallMessage = {
      id: Date.now().toString(),
      sender: 'Вы',
      text: inputText.trim(),
      time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages([...messages, newMsg]);
    setInputText('');
  };

  const handleEndLesson = (durationSec: number) => {
    setIsCompleted(true);

    // Deduct 1 lesson from balance
    const currentBalance = parseInt(localStorage.getItem('aida_student_balance') || '6', 10);
    const updatedBalance = Math.max(0, currentBalance - 1);
    localStorage.setItem('aida_student_balance', updatedBalance.toString());

    setTimeout(() => {
      alert(`Урок успешно завершен! Длительность: ${Math.round(durationSec / 60)} мин. Списано 1 занятие с баланса ученика. Оставшийся баланс: ${updatedBalance}`);
      router.push('/student');
    }, 1500);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[620px] gap-4">
      {/* Top Banner Bar */}
      <div className="bg-white rounded-2xl px-5 py-3 border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs">
            P2P
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-slate-900">
                Комната урока «АйДаУмничка» ({roomId})
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-[11px] text-slate-500">
              Формат: 1-на-1 • Прямое шифрованное P2P соединение
            </p>
          </div>
        </div>

        {/* View Switcher Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsWhiteboardActive(false)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              !isWhiteboardActive
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Видео (Главный)</span>
          </button>
          <button
            onClick={() => setIsWhiteboardActive(true)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              isWhiteboardActive
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Layout className="w-3.5 h-3.5" />
            <span>Интерактивная доска</span>
          </button>
        </div>
      </div>

      {/* Main Workspace: Video/Whiteboard + In-Call Chat */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 overflow-hidden">
        {/* Left / Center Area: Video or Whiteboard */}
        <div className="lg:col-span-3 h-full relative">
          {isWhiteboardActive ? (
            <>
              <Whiteboard />
              {/* Picture in Picture Video Call when whiteboard is active */}
              <VideoCall
                roomToken={roomId}
                isWhiteboardActive={true}
                onToggleWhiteboard={() => setIsWhiteboardActive(false)}
                onEndLesson={handleEndLesson}
              />
            </>
          ) : (
            <VideoCall
              roomToken={roomId}
              isWhiteboardActive={false}
              onToggleWhiteboard={() => setIsWhiteboardActive(true)}
              onEndLesson={handleEndLesson}
            />
          )}
        </div>

        {/* Right Area: In-Call Text Chat */}
        <div className="hidden lg:flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-full">
          <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center gap-2 text-xs font-bold text-slate-800">
            <MessageCircle className="w-4 h-4 text-brand-600" />
            <span>Чат урока</span>
          </div>

          {/* Messages list */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2.5 text-xs">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`p-2.5 rounded-xl ${
                  m.sender === 'Вы'
                    ? 'bg-brand-50 border border-brand-100 ml-4'
                    : 'bg-slate-100 mr-4'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                  <span className="font-bold text-slate-800">{m.sender}</span>
                  <span>{m.time}</span>
                </div>
                <p className="text-slate-700 leading-relaxed">{m.text}</p>
              </div>
            ))}
          </div>

          {/* Message input */}
          <form onSubmit={sendMessage} className="p-2.5 border-t border-slate-200 bg-slate-50 flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Написать сообщение..."
              className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              type="submit"
              className="p-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
