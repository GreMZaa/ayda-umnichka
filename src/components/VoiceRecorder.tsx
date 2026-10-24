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
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
    // Create simulated voice record url
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
    <div className="flex items-center gap-2 bg-indigo-50 border border-brand-200 p-2.5 rounded-2xl w-full max-w-md">
      {!isRecording && !audioUrl && (
        <button
          onClick={startRecording}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition-transform active:scale-95"
        >
          <Mic className="w-4 h-4 text-solar-400 animate-pulse" />
          <span>Начать запись голоса</span>
        </button>
      )}

      {isRecording && (
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
            <span className="text-xs font-bold text-slate-800">Идет запись... {formatTime(recordingSeconds)}</span>
          </div>
          <button
            onClick={stopRecording}
            className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Остановить</span>
          </button>
        </div>
      )}

      {audioUrl && !isRecording && (
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center hover:bg-brand-700 shadow-sm"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 translate-x-0.5" />}
            </button>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-800">Голосовая запись ({formatTime(recordingSeconds)})</span>
              <div className="w-24 h-1.5 bg-brand-200 rounded-full mt-1 overflow-hidden">
                <div className={`h-full bg-brand-600 ${isPlaying ? 'w-full transition-all duration-3000' : 'w-1/2'}`} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleDiscard}
              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-white rounded-lg transition-colors"
              title="Удалить"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleSend}
              className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-xl text-xs font-semibold shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Отправить</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
