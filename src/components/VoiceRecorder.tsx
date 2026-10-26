'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Trash2, RefreshCw, Volume2 } from 'lucide-react';
import { formatTime } from '@/lib/utils';

interface VoiceRecorderProps {
  onSendVoice: (durationSec: number, audioUrl: string) => void;
  onCancel?: () => void;
  submitLabel?: string;
}

export default function VoiceRecorder({
  onSendVoice,
  onCancel,
  submitLabel = 'Прикрепить аудиозапись',
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [localAudioUrl, setLocalAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
          mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
        } catch (_) {}
      }
      if (localAudioUrl) {
        URL.revokeObjectURL(localAudioUrl);
      }
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current = null;
      }
    };
  }, [localAudioUrl]);

  const startRecording = async () => {
    setMicError(null);
    setAudioBlob(null);
    if (localAudioUrl) {
      URL.revokeObjectURL(localAudioUrl);
      setLocalAudioUrl(null);
    }
    audioChunksRef.current = [];

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        setMicError('Ваш браузер не поддерживает запись аудио с микрофона.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Detect supported mimeType
      let options: MediaRecorderOptions = {};
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          options = { mimeType: 'audio/webm;codecs=opus' };
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          options = { mimeType: 'audio/webm' };
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          options = { mimeType: 'audio/mp4' };
        }
      }

      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        const objUrl = URL.createObjectURL(blob);
        setLocalAudioUrl(objUrl);
      };

      recorder.start(100);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Microphone access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMicError('Доступ к микрофону заблокирован. Разрешите использование микрофона в настройках браузера.');
      } else {
        setMicError('Не удалось включить микрофон. Проверьте подключение микрофона и разрешения браузера.');
      }
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.error('Error stopping recorder:', err);
      }
    }
  };

  const handleTogglePlay = () => {
    if (!localAudioUrl) return;

    if (!audioElementRef.current) {
      const audio = new Audio(localAudioUrl);
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => setIsPlaying(false);
      audioElementRef.current = audio;
    }

    if (isPlaying) {
      audioElementRef.current.pause();
      setIsPlaying(false);
    } else {
      audioElementRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((e) => {
          console.error('Playback error:', e);
          setIsPlaying(false);
        });
    }
  };

  const handleConfirmAndUpload = async () => {
    if (!audioBlob) return;
    setIsUploading(true);
    try {
      const isMp4 = audioBlob.type.includes('mp4');
      const ext = isMp4 ? 'mp4' : 'webm';
      const file = new File([audioBlob], `voice_homework_${Date.now()}.${ext}`, {
        type: audioBlob.type || 'audio/webm',
      });

      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/room/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.url) {
        onSendVoice(recordingSeconds || 1, data.url);
        // Clear audio state
        setAudioBlob(null);
        if (localAudioUrl) URL.revokeObjectURL(localAudioUrl);
        setLocalAudioUrl(null);
        setRecordingSeconds(0);
      } else {
        alert(data.error || 'Ошибка при сохранении аудиозаписи на сервере');
      }
    } catch (err) {
      console.error('Audio upload error:', err);
      alert('Не удалось загрузить аудиозапись. Проверьте соединение.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDiscard = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      } catch (_) {}
    }
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current = null;
    }
    setIsRecording(false);
    setIsPlaying(false);
    setRecordingSeconds(0);
    setAudioBlob(null);
    if (localAudioUrl) {
      URL.revokeObjectURL(localAudioUrl);
      setLocalAudioUrl(null);
    }
    setMicError(null);
  };

  return (
    <div className="space-y-2 w-full animate-in fade-in">
      {micError && (
        <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 p-2.5 rounded-xl font-medium">
          {micError}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#FFF7EE] border border-[#F4DEC6] p-2.5 rounded-2xl w-full shadow-2xs">
        {!isRecording && !localAudioUrl && (
          <div className="flex items-center justify-between w-full">
            <button
              type="button"
              onClick={startRecording}
              className="flex items-center gap-2 bg-coralAccent hover:bg-coralAccent-hover text-white px-4 py-2 rounded-full text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Mic className="w-4 h-4" />
              <span>Начать запись голоса</span>
            </button>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="text-xs font-bold text-[#8A95A8] hover:text-[#161F38] px-2 py-1 cursor-pointer"
              >
                Отмена
              </button>
            )}
          </div>
        )}

        {isRecording && (
          <div className="flex items-center justify-between w-full px-1">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
              <span className="text-xs font-extrabold text-[#161F38]">
                Идет запись... {formatTime(recordingSeconds)}
              </span>
            </div>
            <button
              type="button"
              onClick={stopRecording}
              className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-1.5 rounded-full text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>Остановить</span>
            </button>
          </div>
        )}

        {localAudioUrl && !isRecording && (
          <div className="flex flex-wrap items-center justify-between w-full gap-2 px-1">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleTogglePlay}
                className="w-8 h-8 rounded-full bg-coralAccent text-white flex items-center justify-center hover:bg-coralAccent-hover shadow-xs transition-all active:scale-90 cursor-pointer"
                title={isPlaying ? 'Пауза' : 'Прослушать запись'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 translate-x-0.5" />}
              </button>
              <div className="flex flex-col">
                <span className="text-xs font-black text-[#161F38]">
                  Запись готова ({formatTime(recordingSeconds || 1)})
                </span>
                <span className="text-[10px] text-[#5C8519] font-medium">
                  {isPlaying ? '▶ Воспроизведение...' : 'Нажмите, чтобы прослушать'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isUploading}
                onClick={handleDiscard}
                className="p-1.5 text-[#8A95A8] hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                title="Перезаписать / удалить"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={isUploading}
                onClick={handleConfirmAndUpload}
                className="flex items-center gap-1.5 bg-[#5C8519] hover:bg-[#4E7214] text-white px-3.5 py-1.5 rounded-full text-xs font-black shadow-2xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Загрузка...</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>{submitLabel}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
