'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  PhoneOff,
  Layout,
  Maximize2,
  Minimize2,
  RefreshCw,
  ExternalLink,
  ArrowLeftRight,
  Sparkles,
  Camera
} from 'lucide-react';
import { formatTime } from '@/lib/utils';

interface VideoCallProps {
  roomToken: string;
  isTeacher?: boolean;
  participantName?: string;
  topic?: string;
  onEndLesson?: (durationSec: number) => void;
  onToggleWhiteboard?: () => void;
  isWhiteboardActive?: boolean;
}

export default function VideoCall({
  roomToken,
  isTeacher = false,
  participantName,
  topic,
  onEndLesson,
  onToggleWhiteboard,
  isWhiteboardActive = false,
}: VideoCallProps) {
  // Resolve participant label based on role
  const resolvedParticipantName = participantName || (isTeacher ? 'Ученик центра' : 'Василина Владимировна (Педагог)');

  const [micActive, setMicActive] = useState(true);
  const [camActive, setCamActive] = useState(true);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isSwapped, setIsSwapped] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isPipActive, setIsPipActive] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const pipVideoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Duration clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // WebRTC UserMedia stream acquisition
  const startCamera = async (mode: 'user' | 'environment') => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices?.getUserMedia({
        video: { facingMode: mode },
        audio: true,
      });

      streamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      if (pipVideoRef.current) {
        pipVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn('WebRTC camera preview fallback:', err);
    }
  };

  useEffect(() => {
    startCamera(facingMode);

    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  // Re-bind video srcObject if ref attaches or mode switches
  useEffect(() => {
    if (streamRef.current) {
      if (localVideoRef.current && localVideoRef.current.srcObject !== streamRef.current) {
        localVideoRef.current.srcObject = streamRef.current;
      }
      if (pipVideoRef.current && pipVideoRef.current.srcObject !== streamRef.current) {
        pipVideoRef.current.srcObject = streamRef.current;
      }
    }
  }, [isWhiteboardActive, camActive, isSwapped]);

  // Flip front/back camera (phone & tablet)
  const toggleCameraFacing = async () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    await startCamera(nextMode);
  };

  // Native Picture-in-Picture (stays floating on top of all OS apps like in Telegram/VK)
  const togglePictureInPicture = async () => {
    try {
      const activeVideo = localVideoRef.current || pipVideoRef.current;
      if (!activeVideo) return;

      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPipActive(false);
      } else if (document.pictureInPictureEnabled) {
        await activeVideo.requestPictureInPicture();
        setIsPipActive(true);
      }
    } catch (err) {
      console.warn('Picture-in-Picture error:', err);
    }
  };

  // Auto Picture-in-Picture when user minimizes tab or switches to another app
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden') {
        try {
          const activeVideo = localVideoRef.current || pipVideoRef.current;
          if (activeVideo && document.pictureInPictureEnabled && !document.pictureInPictureElement) {
            await activeVideo.requestPictureInPicture();
            setIsPipActive(true);
          }
        } catch {
          // Ignore background auto-PiP gesture restriction
        }
      }
    };

    const handleLeavePiP = () => {
      setIsPipActive(false);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('leavepictureinpicture', handleLeavePiP);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('leavepictureinpicture', handleLeavePiP);
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

  const toggleMic = () => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !micActive;
      });
    }
    setMicActive(!micActive);
  };

  const toggleCam = () => {
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !camActive;
      });
    }
    setCamActive(!camActive);
  };

  const handleEnd = () => {
    if (confirm('Вы уверены, что хотите завершить урок? Будет зафиксировано время и сохранен результат.')) {
      if (onEndLesson) onEndLesson(callDuration);
    }
  };

  // PiP (Picture in Picture) mode when Whiteboard is open
  if (isWhiteboardActive) {
    return (
      <div className="fixed bottom-6 right-6 z-40 w-72 sm:w-80 bg-white rounded-3xl shadow-2xl border-2 border-coralAccent overflow-hidden text-ink-900 animate-in slide-in-from-bottom-4">
        <div className="p-2.5 bg-[#FFF7EE] flex items-center justify-between text-xs border-b border-[#F4E3D2] font-black">
          <div className="flex items-center gap-1.5 truncate">
            <span className="w-2 h-2 rounded-full bg-[#5C8519] animate-pulse shrink-0" />
            <span className="truncate text-[#161F38] text-[11px]">{resolvedParticipantName}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={toggleCameraFacing}
              className="p-1 hover:bg-[#FDEEDC] rounded-lg text-[#161F38]"
              title="Переключить камеру (передняя/задняя)"
            >
              <RefreshCw className="w-3.5 h-3.5 text-coralAccent" />
            </button>
            <button
              onClick={togglePictureInPicture}
              className="p-1 hover:bg-[#FDEEDC] rounded-lg text-[#161F38]"
              title="Поверх всех окон (как в Telegram/VK)"
            >
              <ExternalLink className="w-3.5 h-3.5 text-coralAccent" />
            </button>
            <button
              onClick={onToggleWhiteboard}
              className="p-1 hover:bg-[#FDEEDC] rounded-lg text-[#161F38]"
              title="Развернуть видео на весь экран"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Real Live Video in PiP Container */}
        <div className="relative aspect-video bg-[#161F38] flex items-center justify-center overflow-hidden">
          {camActive ? (
            <video
              ref={pipVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
            />
          ) : (
            <div className="text-center p-3 text-white">
              <VideoOff className="w-8 h-8 mx-auto mb-1 opacity-70" />
              <p className="text-[10px] font-bold">Камера выключена</p>
            </div>
          )}

          {/* Time Pill */}
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-md text-white px-2 py-0.5 rounded-full text-[10px] font-mono font-bold shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#5C8519] animate-pulse" />
            <span>{formatTime(callDuration)}</span>
          </div>

          {/* Role badge in PiP */}
          <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-white px-2 py-0.5 rounded-full text-[9px] font-bold">
            Вы: {isTeacher ? 'Преподаватель' : 'Ученик'}
          </div>
        </div>
      </div>
    );
  }

  // Full Video Workspace (100% spacious, no squeezed sidebars)
  return (
    <div className="relative flex flex-col h-full bg-[#FFF8F1] rounded-[32px] overflow-hidden border border-[#F4E3D2] shadow-sm min-h-[520px]">
      {/* Header Info Bar */}
      <div className="absolute top-3.5 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-[#EADBCC] text-[#161F38] text-xs shadow-xs pointer-events-auto">
          <span className="w-2.5 h-2.5 rounded-full bg-[#5C8519] animate-pulse" />
          <span className="font-mono font-black">{formatTime(callDuration)}</span>
          <span className="text-[#EADBCC]">|</span>
          <span className="text-[#6B758E] font-bold">
            {topic || `Комната: ${roomToken}`}
          </span>
        </div>

        {/* Action Controls in Top Right */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Swap Video View (Student <-> Teacher) */}
          <button
            type="button"
            onClick={() => setIsSwapped(!isSwapped)}
            className="inline-flex items-center gap-1.5 bg-white/95 backdrop-blur-md border border-[#EADBCC] text-[#161F38] hover:border-coralAccent font-extrabold text-xs px-3 py-1.5 rounded-full shadow-xs transition-colors cursor-pointer active:scale-95"
            title="Поменять камеры / вид местами"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-coralAccent" />
            <span className="hidden sm:inline">Поменять камеры</span>
          </button>

          {/* Camera Flip (Mobile / Front & Rear) */}
          <button
            type="button"
            onClick={toggleCameraFacing}
            className="inline-flex items-center gap-1.5 bg-white/95 backdrop-blur-md border border-[#EADBCC] text-[#161F38] hover:border-coralAccent font-extrabold text-xs px-3 py-1.5 rounded-full shadow-xs transition-colors cursor-pointer active:scale-95"
            title="Переключить камеру (селфи / основная)"
          >
            <RefreshCw className="w-3.5 h-3.5 text-coralAccent" />
            <span className="hidden sm:inline">Камера: {facingMode === 'user' ? 'Передняя' : 'Задняя'}</span>
          </button>

          {/* Picture in Picture Button (Float over all OS apps) */}
          <button
            type="button"
            onClick={togglePictureInPicture}
            className="inline-flex items-center gap-1.5 bg-white/95 backdrop-blur-md border border-[#EADBCC] text-[#161F38] hover:border-coralAccent font-extrabold text-xs px-3 py-1.5 rounded-full shadow-xs transition-colors cursor-pointer active:scale-95"
            title="Окно поверх всех приложений (как в Telegram/VK)"
          >
            <ExternalLink className="w-3.5 h-3.5 text-coralAccent" />
            <span className="hidden sm:inline">Поверх всех окон</span>
          </button>
        </div>
      </div>

      {/* Main Video Streams Grid (Takes 100% available space) */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 pt-14 pb-20 h-full">
        {/* Tile 1: Remote Participant */}
        <div
          onClick={() => setIsSwapped(!isSwapped)}
          className={`relative rounded-3xl overflow-hidden bg-white border-2 border-[#F2E3D5] flex items-center justify-center shadow-xs transition-all duration-200 cursor-pointer ${
            isSwapped ? 'order-2 md:order-2' : 'order-1 md:order-1'
          }`}
          title="Нажмите, чтобы поменять местами"
        >
          <div className="text-center p-6">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-[#FFF7EE] border-2 border-[#F4DEC6] flex items-center justify-center mx-auto mb-3 text-coralAccent text-3xl font-black shadow-xs">
              {resolvedParticipantName[0]}
            </div>
            <h3 className="text-[#161F38] font-black text-base">{resolvedParticipantName}</h3>
            <p className="text-xs text-[#6B758E] mt-1 font-medium">
              {isTeacher
                ? 'Ученик центра «АйДаУмничка» • Онлайн'
                : 'Педагог детского центра «АйДаУмничка» • В сети'}
            </p>
          </div>
          <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md border border-[#EADBCC] px-3.5 py-1.5 rounded-full text-[#161F38] text-xs font-black shadow-xs flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#5C8519]" />
            <span>{resolvedParticipantName}</span>
          </div>
        </div>

        {/* Tile 2: Local User Camera Stream */}
        <div
          className={`relative rounded-3xl overflow-hidden bg-[#161F38] border-2 border-[#F2E3D5] flex items-center justify-center shadow-xs transition-all duration-200 ${
            isSwapped ? 'order-1 md:order-1' : 'order-2 md:order-2'
          }`}
        >
          {camActive ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
            />
          ) : (
            <div className="text-center p-6 text-white/70">
              <VideoOff className="w-12 h-12 mx-auto mb-2 opacity-60" />
              <p className="text-xs font-bold">Камера отключена</p>
            </div>
          )}

          {/* Local user badge: Correctly reflects teacher vs student */}
          <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md border border-white/20 px-3.5 py-1.5 rounded-full text-white text-xs font-black shadow-xs flex items-center gap-2">
            <span>Вы ({isTeacher ? 'Преподаватель' : 'Ученик'})</span>
            {!micActive && <MicOff className="w-3.5 h-3.5 text-rose-400" />}
          </div>

          {/* Quick camera switch pill inside local tile */}
          <button
            type="button"
            onClick={toggleCameraFacing}
            className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 backdrop-blur-md text-white p-2 rounded-xl transition-colors cursor-pointer"
            title="Сменить камеру"
          >
            <Camera className="w-4 h-4 text-coralAccent" />
          </button>
        </div>
      </div>

      {/* Bottom Floating Control Bar */}
      <div className="absolute bottom-3.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 sm:gap-2.5 bg-white/95 backdrop-blur-md px-4 sm:px-5 py-2.5 rounded-full border border-[#EADBCC] shadow-xl">
        {/* Mic Toggle */}
        <button
          type="button"
          onClick={toggleMic}
          className={`p-2.5 sm:p-3 rounded-full transition-transform active:scale-90 cursor-pointer ${
            micActive
              ? 'bg-[#FFF7EE] hover:bg-[#FDEEDC] text-[#161F38]'
              : 'bg-rose-100 text-rose-700 border border-rose-300'
          }`}
          title={micActive ? 'Выключить микрофон' : 'Включить микрофон'}
        >
          {micActive ? <Mic className="w-4 h-4 sm:w-5 sm:h-5 text-[#161F38]" /> : <MicOff className="w-4 h-4 sm:w-5 sm:h-5" />}
        </button>

        {/* Cam Toggle */}
        <button
          type="button"
          onClick={toggleCam}
          className={`p-2.5 sm:p-3 rounded-full transition-transform active:scale-90 cursor-pointer ${
            camActive
              ? 'bg-[#FFF7EE] hover:bg-[#FDEEDC] text-[#161F38]'
              : 'bg-rose-100 text-rose-700 border border-rose-300'
          }`}
          title={camActive ? 'Выключить камеру' : 'Включить камеру'}
        >
          {camActive ? <Video className="w-4 h-4 sm:w-5 sm:h-5 text-[#161F38]" /> : <VideoOff className="w-4 h-4 sm:w-5 sm:h-5" />}
        </button>

        {/* Screen Share */}
        <button
          type="button"
          onClick={toggleScreenShare}
          className={`p-2.5 sm:p-3 rounded-full transition-transform active:scale-90 cursor-pointer ${
            isScreenSharing
              ? 'bg-[#EAF7CF] text-[#5C8519] border border-[#CCE8A2]'
              : 'bg-[#FFF7EE] hover:bg-[#FDEEDC] text-[#161F38]'
          }`}
          title="Демонстрация экрана"
        >
          <Monitor className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Whiteboard Switch */}
        {onToggleWhiteboard && (
          <button
            type="button"
            onClick={onToggleWhiteboard}
            className="bg-[#EAF7CF] hover:bg-[#DDF4B2] text-[#5C8519] border border-[#CCE8A2] rounded-full transition-transform active:scale-95 flex items-center gap-1.5 font-black text-xs px-4 py-2.5 shadow-2xs cursor-pointer"
            title="Переключить на интерактивную доску"
          >
            <Layout className="w-4 h-4 text-[#5C8519]" />
            <span className="hidden sm:inline">Интерактивная доска</span>
          </button>
        )}

        {/* End Call */}
        <button
          type="button"
          onClick={handleEnd}
          className="bg-coralAccent hover:bg-coralAccent-hover text-white rounded-full transition-transform active:scale-95 flex items-center gap-1.5 font-black text-xs px-4 sm:px-5 py-2.5 shadow-xs cursor-pointer"
          title="Завершить занятие"
        >
          <PhoneOff className="w-4 h-4" />
          <span>Завершить урок</span>
        </button>
      </div>
    </div>
  );
}
