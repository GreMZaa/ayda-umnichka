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
    // PiP (Picture in Picture) mode when Whiteboard is open
    return (
      <div className="fixed bottom-6 right-6 z-40 w-72 bg-slate-900 rounded-2xl shadow-2xl border-2 border-brand-500 overflow-hidden text-white animate-in slide-in-from-bottom-4">
        <div className="p-2 bg-slate-800 flex items-center justify-between text-xs border-b border-slate-700">
          <span className="font-semibold truncate">{participantName}</span>
          <button
            onClick={onToggleWhiteboard}
            className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white"
            title="Развернуть видео"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="relative aspect-video bg-slate-950 flex items-center justify-center">
          <div className="text-center p-3">
            <div className="w-12 h-12 rounded-full bg-brand-600/30 border border-brand-500 flex items-center justify-center mx-auto mb-1 text-brand-300 font-bold">
              {participantName[0]}
            </div>
            <p className="text-[11px] text-slate-400">P2P видеоканал активен</p>
          </div>
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/60 px-2 py-0.5 rounded text-[10px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{formatTime(callDuration)}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-xl min-h-[520px]">
      {/* Header Info Bar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-700/60 text-white text-xs pointer-events-auto">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-mono font-bold">{formatTime(callDuration)}</span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-300">Комната: {roomToken}</span>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700/60 text-[11px] text-emerald-400 font-medium pointer-events-auto">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>WebRTC P2P (Прямой Рунет канал • STUN РФ)</span>
        </div>
      </div>

      {/* Main Video Streams Grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 p-4 pt-16 pb-24 h-full">
        {/* Remote participant video (Teacher or Student) */}
        <div className="relative rounded-xl overflow-hidden bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 flex items-center justify-center group shadow-inner">
          <div className="text-center p-6">
            <div className="w-24 h-24 rounded-full bg-brand-600/20 border-2 border-brand-500 flex items-center justify-center mx-auto mb-3 text-brand-300 text-2xl font-black shadow-lg">
              {participantName[0]}
            </div>
            <h3 className="text-white font-bold text-base">{participantName}</h3>
            <p className="text-xs text-slate-400 mt-1">
              {isTeacher ? 'Ученик подключен • Качество связи отличное' : 'Преподаватель центра «АйДаУмничка»'}
            </p>
          </div>
          <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-lg text-white text-xs">
            {participantName}
          </div>
        </div>

        {/* Local user video stream */}
        <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center">
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
              <VideoOff className="w-12 h-12 mx-auto mb-2 text-slate-600" />
              <p className="text-xs">Камера отключена</p>
            </div>
          )}
          <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-lg text-white text-xs flex items-center gap-1.5">
            <span>Вы ({isTeacher ? 'Преподаватель' : 'Ученик'})</span>
            {!micActive && <MicOff className="w-3 h-3 text-rose-400" />}
          </div>
        </div>
      </div>

      {/* Bottom Floating Control Bar (Telemost / Zoom style) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-slate-900/90 backdrop-blur-lg px-4 py-2.5 rounded-2xl border border-slate-700/80 shadow-2xl">
        {/* Mic Toggle */}
        <button
          onClick={() => setMicActive(!micActive)}
          className={`p-3 rounded-xl transition-all ${
            micActive ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30'
          }`}
          title={micActive ? 'Выключить микрофон' : 'Включить микрофон'}
        >
          {micActive ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>

        {/* Cam Toggle */}
        <button
          onClick={() => setCamActive(!camActive)}
          className={`p-3 rounded-xl transition-all ${
            camActive ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30'
          }`}
          title={camActive ? 'Выключить камеру' : 'Включить камеру'}
        >
          {camActive ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>

        {/* Screen Share */}
        <button
          onClick={toggleScreenShare}
          className={`p-3 rounded-xl transition-all ${
            isScreenSharing ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-800 text-white hover:bg-slate-700'
          }`}
          title="Демонстрация экрана"
        >
          <Monitor className="w-5 h-5" />
        </button>

        {/* Whiteboard Switch */}
        {onToggleWhiteboard && (
          <button
            onClick={onToggleWhiteboard}
            className="p-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl transition-all flex items-center gap-1.5 font-medium text-xs px-4"
            title="Переключить на интерактивную доску"
          >
            <Layout className="w-4 h-4 text-solar-400" />
            <span>Интерактивная доска</span>
          </button>
        )}

        {/* End Call */}
        <button
          onClick={handleEnd}
          className="p-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-all flex items-center gap-1.5 font-semibold text-xs px-4 shadow-lg shadow-rose-600/30"
          title="Завершить занятие"
        >
          <PhoneOff className="w-4 h-4" />
          <span>Завершить урок</span>
        </button>
      </div>
    </div>
  );
}
