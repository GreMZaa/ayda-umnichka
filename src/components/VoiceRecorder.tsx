'use client';

import React, { useState, useRef } from 'react';
import { Mic, Square, Play, Pause, Trash2, Send } from 'lucide-react';
import { formatTime } from '@/lib/utils';

interface VoiceRecorderProps {
  onSendVoice: (durationSec: number, audioBlobUrl?: string) => void;
  onCancel?: () => void;
}

export default function VoiceRecorder({ onSendVoice, onCancel }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = () => {
    setIsRecording(true);
    setRecordingSeconds(0);
    setAudioUrl(null);

    timerRef.current = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    setAudioUrl('mock-voice-record.webm');
  };

  const handleSend = () => {
    onSendVoice(recordingSeconds || 1, audioUrl || undefined);
    setRecordingSeconds(0);
    setAudioUrl(null);
  };

  const handleDiscard = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    setRecordingSeconds(0);
    setAudioUrl(null);
    if (onCancel) onCancel();
  };

  return (
    <div className="flex items-center gap-2 bg-[#FFF7EE] border border-[#F4DEC6] p-2 rounded-full w-full max-w-md shadow-xs">
      {!isRecording && !audioUrl && (
        <button
          onClick={startRecording}
          className="flex items-center gap-2 bg-coralAccent hover:bg-coralAccent-hover text-white px-4 py-2 rounded-full text-xs font-bold shadow-xs transition-[background-color,transform] duration-140 ease-out-emil active:scale-[0.97] cursor-pointer"
        >
          <Mic className="w-3.5 h-3.5" />
          <span>Начать запись голоса</span>
        </button>
      )}

      {isRecording && (
        <div className="flex items-center justify-between w-full px-2">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
            <span className="text-xs font-extrabold text-ink-900">Запись... {formatTime(recordingSeconds)}</span>
          </div>
          <button
            onClick={stopRecording}
            className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-xs transition-[background-color,transform] duration-140 ease-out-emil active:scale-95 cursor-pointer"
          >
            <Square className="w-3 h-3 fill-current" />
            <span>Остановить</span>
          </button>
        </div>
      )}

      {audioUrl && !isRecording && (
        <div className="flex items-center justify-between w-full px-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-8 h-8 rounded-full bg-coralAccent text-white flex items-center justify-center hover:bg-coralAccent-hover shadow-xs transition-[background-color,transform] duration-140 ease-out-emil active:scale-90 cursor-pointer"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 translate-x-0.5" />}
            </button>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-ink-900">Запись ({formatTime(recordingSeconds)})</span>
              <div className="w-24 h-1.5 bg-[#FDEEDC] rounded-full mt-1 overflow-hidden">
                <div className={`h-full bg-coralAccent ${isPlaying ? 'w-full transition-[width] duration-3000 ease-linear' : 'w-0'}`} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleDiscard}
              className="p-1.5 text-ink-400 hover:text-rose-600 rounded-full transition-colors duration-140 active:scale-90 cursor-pointer"
              title="Удалить"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleSend}
              className="flex items-center gap-1 bg-limeAccent hover:bg-limeAccent-hover text-ink-900 px-3 py-1.5 rounded-full text-xs font-black shadow-xs transition-[background-color,transform] duration-140 ease-out-emil active:scale-[0.97] cursor-pointer"
            >
              <Send className="w-3 h-3" />
              <span>Отправить</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
