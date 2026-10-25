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
      <div className="fixed bottom-6 right-6 z-40 w-72 bg-white rounded-3xl shadow-xl border-2 border-coralAccent overflow-hidden text-ink-900 animate-in slide-in-from-bottom-4">
        <div className="p-2.5 bg-[#FFF7EE] flex items-center justify-between text-xs border-b border-[#F4E3D2] font-black">
          <span className="truncate text-ink-900">{participantName}</span>
          <button
            onClick={onToggleWhiteboard}
            className="p-1 hover:bg-[#FDEEDC] rounded-full text-ink-700"
            title="Развернуть видео"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="relative aspect-video bg-[#FFFDFB] flex items-center justify-center">
          <div className="text-center p-3">
            <div className="w-12 h-12 rounded-full bg-[#FFF7EE] border border-[#F4DEC6] flex items-center justify-center mx-auto mb-1 text-coralAccent font-black">
              {participantName[0]}
            </div>
            <p className="text-[11px] text-ink-500 font-bold">P2P видеоканал активен</p>
          </div>
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-white border border-[#EADBCC] text-ink-900 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-xs">
            <span className="w-2 h-2 rounded-full bg-limeAccent animate-pulse" />
            <span>{formatTime(callDuration)}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full bg-[#FFF8F1] rounded-[36px] overflow-hidden border border-[#F4E3D2] shadow-sm min-h-[520px]">
      {/* Header Info Bar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-[#EADBCC] text-ink-900 text-xs shadow-xs pointer-events-auto">
          <span className="w-2.5 h-2.5 rounded-full bg-limeAccent animate-pulse" />
          <span className="font-mono font-black">{formatTime(callDuration)}</span>
          <span className="text-[#EADBCC]">|</span>
          <span className="text-ink-600 font-bold">Комната: {roomToken}</span>
        </div>

        <div className="flex items-center gap-1.5 bg-white px-4 py-2 rounded-full border border-[#EADBCC] text-[11px] text-emerald-800 font-black shadow-xs pointer-events-auto">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>WebRTC P2P (Прямой канал РФ • STUN)</span>
        </div>
      </div>

      {/* Main Video Streams Grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 pt-16 pb-24 h-full">
        {/* Remote participant video tile */}
        <div className="relative rounded-3xl overflow-hidden bg-white border-2 border-[#F2E3D5] flex items-center justify-center shadow-xs">
          <div className="text-center p-6">
            <div className="w-24 h-24 rounded-3xl bg-[#FFF7EE] border-2 border-[#F4DEC6] flex items-center justify-center mx-auto mb-3 text-coralAccent text-3xl font-black shadow-xs">
              {participantName[0]}
            </div>
            <h3 className="text-ink-900 font-black text-base">{participantName}</h3>
            <p className="text-xs text-ink-500 mt-1 font-medium">
              {isTeacher ? 'Ученик на связи • Отличное качество P2P' : 'Преподаватель центра «АйДаУмничка»'}
            </p>
          </div>
          <div className="absolute bottom-3 left-3 bg-white/95 border border-[#EADBCC] px-3.5 py-1.5 rounded-full text-ink-900 text-xs font-black shadow-xs">
            {participantName}
          </div>
        </div>

        {/* Local user video stream */}
        <div className="relative rounded-3xl overflow-hidden bg-white border-2 border-[#F2E3D5] flex items-center justify-center shadow-xs">
          {camActive ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
          ) : (
            <div className="text-center p-6 text-ink-400">
              <VideoOff className="w-12 h-12 mx-auto mb-2 text-ink-300" />
              <p className="text-xs font-bold text-ink-400">Камера отключена</p>
            </div>
          )}
          <div className="absolute bottom-3 left-3 bg-white/95 border border-[#EADBCC] px-3.5 py-1.5 rounded-full text-ink-900 text-xs font-black shadow-xs flex items-center gap-1.5">
            <span>Вы ({isTeacher ? 'Преподаватель' : 'Ученик'})</span>
            {!micActive && <MicOff className="w-3 h-3 text-rose-500" />}
          </div>
        </div>
      </div>

      {/* Bottom Floating Control Bar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2.5 bg-white px-5 py-3 rounded-full border border-[#EADBCC] shadow-xl">
        {/* Mic Toggle */}
        <button
          onClick={() => setMicActive(!micActive)}
          className={`p-3 rounded-full transition-[background-color,border-color,transform] duration-140 ease-out-emil active:scale-90 cursor-pointer ${
            micActive ? 'bg-[#FFF7EE] hover:bg-[#FDEEDC] text-ink-800' : 'bg-rose-100 text-rose-700 border border-rose-300'
          }`}
          title={micActive ? 'Выключить микрофон' : 'Включить микрофон'}
        >
          {micActive ? <Mic className="w-5 h-5 text-ink-800" /> : <MicOff className="w-5 h-5" />}
        </button>

        {/* Cam Toggle */}
        <button
          onClick={() => setCamActive(!camActive)}
          className={`p-3 rounded-full transition-[background-color,border-color,transform] duration-140 ease-out-emil active:scale-90 cursor-pointer ${
            camActive ? 'bg-[#FFF7EE] hover:bg-[#FDEEDC] text-ink-800' : 'bg-rose-100 text-rose-700 border border-rose-300'
          }`}
          title={camActive ? 'Выключить камеру' : 'Включить камеру'}
        >
          {camActive ? <Video className="w-5 h-5 text-ink-800" /> : <VideoOff className="w-5 h-5" />}
        </button>

        {/* Screen Share */}
        <button
          onClick={toggleScreenShare}
          className={`p-3 rounded-full transition-[background-color,transform] duration-140 ease-out-emil active:scale-90 cursor-pointer ${
            isScreenSharing ? 'bg-limeAccent text-ink-900' : 'bg-[#FFF7EE] hover:bg-[#FDEEDC] text-ink-800'
          }`}
          title="Демонстрация экрана"
        >
          <Monitor className="w-5 h-5" />
        </button>

        {/* Whiteboard Switch */}
        {onToggleWhiteboard && (
          <button
            onClick={onToggleWhiteboard}
            className="p-3 bg-limeAccent hover:bg-limeAccent-hover text-ink-900 rounded-full transition-[background-color,transform,box-shadow] duration-140 ease-out-emil active:scale-[0.97] flex items-center gap-2 font-black text-xs px-5 shadow-xs cursor-pointer"
            title="Переключить на интерактивную доску"
          >
            <Layout className="w-4 h-4 text-ink-900" />
            <span>Интерактивная доска</span>
          </button>
        )}

        {/* End Call */}
        <button
          onClick={handleEnd}
          className="p-3 bg-coralAccent hover:bg-coralAccent-hover text-white rounded-full transition-[background-color,transform,box-shadow] duration-140 ease-out-emil active:scale-[0.97] flex items-center gap-1.5 font-black text-xs px-5 shadow-xs cursor-pointer"
          title="Завершить занятие"
        >
          <PhoneOff className="w-4 h-4" />
          <span>Завершить урок</span>
        </button>
      </div>
    </div>
  );
}
