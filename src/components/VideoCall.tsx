'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, Monitor, PhoneOff, Layout, ShieldCheck, Maximize2 } from 'lucide-react';
import { formatTime } from '@/lib/utils';

interface VideoCallProps {
  roomToken: string;
  isTeacher?: boolean;
  participantName?: string;
  onEndLesson?: (durationSec: number) => void;
  onToggleWhiteboard?: () => void;
  isWhiteboardActive?: boolean;
}

export default function VideoCall({
  roomToken,
  isTeacher = false,
  participantName = 'Светлана Васильевна (Преподаватель)',
  onEndLesson,
  onToggleWhiteboard,
  isWhiteboardActive = false,
}: VideoCallProps) {
  const [micActive, setMicActive] = useState(true);
  const [camActive, setCamActive] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  // Lesson duration clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // WebRTC UserMedia initialization
  useEffect(() => {
    let stream: MediaStream | null = null;
    navigator.mediaDevices?.getUserMedia({ video: true, audio: true })
      .then((s) => {
        stream = s;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = s;
        }
      })
      .catch((err) => {
        console.warn('WebRTC camera preview fallback (virtual mode):', err);
      });

    return () => {
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        await navigator.mediaDevices?.getDisplayMedia({ video: true });
        setIsScreenSharing(true);
      } else {
        setIsScreenSharing(false);
      }
    } catch {
      setIsScreenSharing(!isScreenSharing);
    }
  };

  const handleEnd = () => {
    if (confirm('Вы уверены, что хотите завершить урок? Будет зафиксировано время и списан 1 урок с баланса.')) {
      if (onEndLesson) onEndLesson(callDuration);
    }
  };

  if (isWhiteboardActive) {
    // PiP (Picture in Picture) mode when Whiteboard is open (Light, solid theme)
    return (
      <div className="fixed bottom-6 right-6 z-40 w-72 bg-white rounded-2xl shadow-xl border-2 border-brand-500 overflow-hidden text-slate-800 animate-in slide-in-from-bottom-4">
        <div className="p-2.5 bg-brand-50 flex items-center justify-between text-xs border-b border-brand-100 font-bold">
          <span className="truncate text-brand-900">{participantName}</span>
          <button
            onClick={onToggleWhiteboard}
            className="p-1 hover:bg-brand-100 rounded text-brand-700"
            title="Развернуть видео"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="relative aspect-video bg-slate-50 flex items-center justify-center">
          <div className="text-center p-3">
            <div className="w-12 h-12 rounded-full bg-brand-100 border border-brand-300 flex items-center justify-center mx-auto mb-1 text-brand-700 font-bold">
              {participantName[0]}
            </div>
            <p className="text-[11px] text-slate-500 font-medium">P2P видеоканал активен</p>
          </div>
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-slate-800 text-white px-2 py-0.5 rounded text-[10px] font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{formatTime(callDuration)}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full bg-slate-100 rounded-3xl overflow-hidden border-2 border-slate-200 shadow-md min-h-[520px]">
      {/* Header Info Bar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-full border border-slate-200 text-slate-800 text-xs shadow-sm pointer-events-auto">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-mono font-bold">{formatTime(callDuration)}</span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-600 font-medium">Комната: {roomToken}</span>
        </div>

        <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-slate-200 text-[11px] text-emerald-700 font-bold shadow-sm pointer-events-auto">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>WebRTC P2P (Прямой Рунет канал • STUN РФ)</span>
        </div>
      </div>

      {/* Main Video Streams Grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 pt-16 pb-24 h-full">
        {/* Remote participant video tile */}
        <div className="relative rounded-2xl overflow-hidden bg-white border-2 border-brand-200 flex items-center justify-center shadow-sm">
          <div className="text-center p-6">
            <div className="w-24 h-24 rounded-full bg-brand-50 border-2 border-brand-400 flex items-center justify-center mx-auto mb-3 text-brand-700 text-3xl font-black shadow-sm">
              {participantName[0]}
            </div>
            <h3 className="text-slate-800 font-bold text-base">{participantName}</h3>
            <p className="text-xs text-slate-500 mt-1">
              {isTeacher ? 'Ученик подключен • Качество связи отличное' : 'Преподаватель центра «АйДаУмничка»'}
            </p>
          </div>
          <div className="absolute bottom-3 left-3 bg-slate-800/90 px-3 py-1 rounded-xl text-white text-xs font-semibold shadow-sm">
            {participantName}
          </div>
        </div>

        {/* Local user video stream */}
        <div className="relative rounded-2xl overflow-hidden bg-white border-2 border-slate-200 flex items-center justify-center shadow-sm">
          {camActive ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
          ) : (
            <div className="text-center p-6 text-slate-400">
              <VideoOff className="w-12 h-12 mx-auto mb-2 text-slate-400" />
              <p className="text-xs font-medium text-slate-500">Камера отключена</p>
            </div>
          )}
          <div className="absolute bottom-3 left-3 bg-slate-800/90 px-3 py-1 rounded-xl text-white text-xs font-semibold shadow-sm flex items-center gap-1.5">
            <span>Вы ({isTeacher ? 'Преподаватель' : 'Ученик'})</span>
            {!micActive && <MicOff className="w-3 h-3 text-rose-400" />}
          </div>
        </div>
      </div>

      {/* Bottom Floating Control Bar (Clean light theme, solid buttons) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-white px-4 py-2.5 rounded-2xl border-2 border-slate-200 shadow-xl">
        {/* Mic Toggle */}
        <button
          onClick={() => setMicActive(!micActive)}
          className={`p-3 rounded-xl transition-all ${
            micActive ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-rose-100 text-rose-700 border border-rose-300 hover:bg-rose-200'
          }`}
          title={micActive ? 'Выключить микрофон' : 'Включить микрофон'}
        >
          {micActive ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>

        {/* Cam Toggle */}
        <button
          onClick={() => setCamActive(!camActive)}
          className={`p-3 rounded-xl transition-all ${
            camActive ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-rose-100 text-rose-700 border border-rose-300 hover:bg-rose-200'
          }`}
          title={camActive ? 'Выключить камеру' : 'Включить камеру'}
        >
          {camActive ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>

        {/* Screen Share */}
        <button
          onClick={toggleScreenShare}
          className={`p-3 rounded-xl transition-all ${
            isScreenSharing ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
          title="Демонстрация экрана"
        >
          <Monitor className="w-5 h-5" />
        </button>

        {/* Whiteboard Switch */}
        {onToggleWhiteboard && (
          <button
            onClick={onToggleWhiteboard}
            className="p-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl transition-all flex items-center gap-1.5 font-bold text-xs px-4 shadow-sm"
            title="Переключить на интерактивную доску"
          >
            <Layout className="w-4 h-4 text-solar-300" />
            <span>Интерактивная доска</span>
          </button>
        )}

        {/* End Call */}
        <button
          onClick={handleEnd}
          className="p-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-all flex items-center gap-1.5 font-bold text-xs px-4 shadow-sm"
          title="Завершить занятие"
        >
          <PhoneOff className="w-4 h-4" />
          <span>Завершить урок</span>
        </button>
      </div>
    </div>
  );
}

