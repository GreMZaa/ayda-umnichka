'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import VideoCall from '@/components/VideoCall';
import Whiteboard from '@/components/Whiteboard';
import { MessageCircle, Send, Video, Layout } from 'lucide-react';

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
      {/* Top Banner Bar (Warm cream, rounded-full pill buttons) */}
      <div className="bg-white rounded-3xl px-6 py-3 border border-[#F2E3D5] shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-[#FFF7EE] text-coralAccent border border-[#F4DEC6] flex items-center justify-center font-black text-xs">
            P2P
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm text-ink-900">
                Комната урока «АйДаУмничка» ({roomId})
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-limeAccent animate-pulse" />
            </div>
            <p className="text-[11px] text-ink-500 font-medium">
              Формат: 1-на-1 • Прямое шифрованное WebRTC соединение внутри РФ
            </p>
          </div>
        </div>

        {/* View Switcher Controls in Pill style */}
        <div className="flex items-center gap-2 bg-[#FFF7EE] p-1 rounded-full border border-[#F4DEC6]">
          <button
            onClick={() => setIsWhiteboardActive(false)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-[background-color,color,box-shadow] duration-140 ease-out-emil active:scale-95 cursor-pointer flex items-center gap-1.5 ${
              !isWhiteboardActive
                ? 'bg-white text-ink-900 shadow-sm'
                : 'text-ink-600 hover:text-ink-900'
            }`}
          >
            <Video className="w-3.5 h-3.5 text-coralAccent" />
            <span>Видео (Главный)</span>
          </button>
          <button
            onClick={() => setIsWhiteboardActive(true)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-[background-color,color,box-shadow] duration-140 ease-out-emil active:scale-95 cursor-pointer flex items-center gap-1.5 ${
              isWhiteboardActive
                ? 'bg-white text-ink-900 shadow-sm'
                : 'text-ink-600 hover:text-ink-900'
            }`}
          >
            <Layout className="w-3.5 h-3.5 text-coralAccent" />
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

        {/* Right Area: In-Call Text Chat in warm card style */}
        <div className="hidden lg:flex flex-col bg-white rounded-3xl border border-[#F2E3D5] shadow-sm overflow-hidden h-full">
          <div className="p-4 border-b border-[#F4E3D2] bg-[#FFF7EE] flex items-center gap-2 text-xs font-black text-ink-900">
            <MessageCircle className="w-4 h-4 text-coralAccent" />
            <span>Чат урока</span>
          </div>

          {/* Messages list */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`p-3 rounded-2xl ${
                  m.sender === 'Вы'
                    ? 'bg-[#FFF7EE] border border-[#F4DEC6] ml-4'
                    : 'bg-[#F8FAFC] border border-slate-200 mr-4'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-ink-400 mb-1">
                  <span className="font-extrabold text-ink-900">{m.sender}</span>
                  <span>{m.time}</span>
                </div>
                <p className="text-ink-700 leading-relaxed font-medium">{m.text}</p>
              </div>
            ))}
          </div>

          {/* Message input */}
          <form onSubmit={sendMessage} className="p-3 border-t border-[#F4E3D2] bg-[#FFF7EE] flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Написать сообщение..."
              className="flex-1 bg-white border border-[#EADBCC] rounded-full px-4 py-2 text-xs text-ink-900 focus:outline-none focus:ring-2 focus:ring-coralAccent"
            />
            <button
              type="submit"
              className="w-9 h-9 bg-coralAccent hover:bg-coralAccent-hover text-white rounded-full flex items-center justify-center transition-colors shadow-sm shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
