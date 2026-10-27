'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Send,
  Paperclip,
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  Mic,
  Edit3,
  AlertCircle,
  Download,
  ExternalLink,
  HelpCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  MessageCircle,
  FileCheck,
  Check,
  Volume2
} from 'lucide-react';
import VoiceRecorder from '@/components/VoiceRecorder';
import { HomeworkItem } from '@/types';
import { broadcastPlatformEvent } from '@/lib/platformNotifications';

interface StudentHomeworkBlockProps {
  homeworks: HomeworkItem[];
  currentUserId: string;
  onHomeworkUpdated?: () => void;
}

export default function StudentHomeworkBlock({
  homeworks,
  currentUserId,
  onHomeworkUpdated,
}: StudentHomeworkBlockProps) {
  // Filter tabs: 'all' | 'pending' | 'submitted'
  const [filter, setFilter] = useState<'all' | 'pending' | 'submitted'>('all');

  // Active submission editing per homework ID
  const [openSubmitId, setOpenSubmitId] = useState<string | null>(null);
  const [solutionText, setSolutionText] = useState('');
  const [solutionFile, setSolutionFile] = useState<{
    url: string;
    name: string;
    isImage?: boolean;
    isAudio?: boolean;
  } | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [submitSuccessId, setSubmitSuccessId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Counts
  const pendingCount = homeworks.filter((h) => h.status === 'assigned').length;
  const submittedCount = homeworks.filter((h) => h.status === 'submitted' || h.status === 'reviewed').length;

  const filteredHomeworks = homeworks.filter((h) => {
    if (filter === 'pending') return h.status === 'assigned';
    if (filter === 'submitted') return h.status === 'submitted' || h.status === 'reviewed';
    return true;
  });

  const handleStartSubmit = (hw: HomeworkItem) => {
    setOpenSubmitId(hw.id);
    setSolutionText(hw.studentSolutionText || '');
    if (hw.studentSolutionFileUrl) {
      const isAud =
        /\.(mp3|wav|ogg|webm|m4a|aac)($|\?)/i.test(hw.studentSolutionFileUrl) ||
        Boolean(hw.studentSolutionText?.includes('Аудиоответ'));
      setSolutionFile({
        url: hw.studentSolutionFileUrl,
        name: isAud ? 'Ранее прикрепленная аудиозапись' : 'Ранее прикрепленный файл',
        isImage: !isAud && /\.(png|jpe?g|webp|gif)($|\?)/i.test(hw.studentSolutionFileUrl),
        isAudio: isAud,
      });
    } else {
      setSolutionFile(null);
    }
    setIsVoiceMode(false);
  };

  const handleCancelSubmit = () => {
    setOpenSubmitId(null);
    setSolutionText('');
    setSolutionFile(null);
    setIsVoiceMode(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert('Размер файла не должен превышать 15 МБ');
      return;
    }

    setIsUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/room/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.success && data.url) {
        const isAud = Boolean(
          file.type.startsWith('audio/') ||
          /\.(mp3|wav|ogg|m4a|webm|aac)($|\?)/i.test(file.name)
        );
        const isImg = Boolean(data.isImage || file.type.startsWith('image/'));

        setSolutionFile({
          url: data.url,
          name: data.name || file.name,
          isImage: isImg,
          isAudio: isAud,
        });
      } else {
        alert(data.error || 'Ошибка загрузки файла');
      }
    } catch (err) {
      console.error('File upload error:', err);
      alert('Не удалось загрузить файл. Попробуйте еще раз.');
    } finally {
      setIsUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSendSolution = async (hwId: string, voiceDurationSec?: number, voiceUrl?: string) => {
    setIsSubmitting(true);
    try {
      let finalSolutionText = solutionText.trim();
      let finalFileUrl = voiceUrl || solutionFile?.url || null;

      if (voiceDurationSec) {
        finalSolutionText = `Аудиоответ (${voiceDurationSec} сек.)${finalSolutionText ? `: ${finalSolutionText}` : ''}`;
      } else if (solutionFile?.isAudio && !finalSolutionText.includes('Аудиоответ')) {
        finalSolutionText = `Аудиоответ${finalSolutionText ? `: ${finalSolutionText}` : ''}`;
      }

      if (!finalSolutionText && !finalFileUrl) {
        finalSolutionText = 'Решение отправлено на проверку';
      }

      const res = await fetch('/api/homework', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_solution',
          id: hwId,
          student_solution_text: finalSolutionText,
          student_solution_file_url: finalFileUrl,
        }),
      });

      const resData = await res.json();

      if (resData.success) {
        const currentHw = homeworks.find((h) => h.id === hwId);
        const studentName =
          (typeof window !== 'undefined' &&
            (localStorage.getItem('aida_full_name') ||
              localStorage.getItem('aida_user_name'))) ||
          'Ученик';

        broadcastPlatformEvent('homework-submitted', {
          id: hwId,
          title: currentHw?.title || 'Домашнее задание',
          student_public_id: currentUserId,
          student_name: studentName,
          student_solution_text: finalSolutionText,
          student_solution_file_url: finalFileUrl,
        });

        setSubmitSuccessId(hwId);
        setTimeout(() => setSubmitSuccessId(null), 3000);
        setOpenSubmitId(null);
        if (onHomeworkUpdated) {
          onHomeworkUpdated();
        }
      } else {
        alert(resData.error || 'Ошибка при отправке решения');
      }
    } catch (err) {
      console.error('Submit solution error:', err);
      alert('Не удалось отправить решение. Проверьте соединение.');
    } finally {
      setIsSubmitting(false);
      setIsVoiceMode(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#F2E0CF] shadow-xs space-y-3.5 hover:shadow-sm transition-shadow">
      {/* 1. Header with title & counter badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F8EDE1] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#FFF2E6] border border-[#FCDDC7] flex items-center justify-center text-coralAccent shrink-0 shadow-2xs">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-sm sm:text-base text-[#161F38] leading-tight">
                Домашние задания
              </h3>
              {pendingCount > 0 ? (
                <span className="text-[10px] font-black bg-[#FFF2E6] text-coralAccent px-2 py-0.5 rounded-full border border-[#FCDDC7] animate-pulse">
                  {pendingCount} к сдаче
                </span>
              ) : (
                <span className="text-[10px] font-extrabold bg-[#EAF7CF] text-[#5C8519] px-2 py-0.5 rounded-full border border-[#D5ECA3]">
                  Все выполнено ✓
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#6B758E]">
              Упражнения и материалы от педагога
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 bg-[#FFF9F3] p-1 rounded-xl border border-[#F2DECE] self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              filter === 'all'
                ? 'bg-white text-[#161F38] shadow-xs font-black'
                : 'text-[#6B758E] hover:text-[#161F38]'
            }`}
          >
            Все ({homeworks.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('pending')}
            className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              filter === 'pending'
                ? 'bg-coralAccent text-white shadow-xs font-black'
                : 'text-[#6B758E] hover:text-[#161F38]'
            }`}
          >
            <span>К выполнению</span>
            {pendingCount > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                filter === 'pending' ? 'bg-white/20 text-white' : 'bg-coralAccent/15 text-coralAccent'
              }`}>
                {pendingCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setFilter('submitted')}
            className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              filter === 'submitted'
                ? 'bg-[#5C8519] text-white shadow-xs font-black'
                : 'text-[#6B758E] hover:text-[#161F38]'
            }`}
          >
            <span>Сдано</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
              filter === 'submitted' ? 'bg-white/20 text-white' : 'bg-[#EAF7CF] text-[#5C8519]'
            }`}>
              {submittedCount}
            </span>
          </button>
        </div>
      </div>

      {/* 2. Homework Cards List */}
      {filteredHomeworks.length === 0 ? (
        <div className="p-5 rounded-2xl border border-dashed border-[#F2DECE] bg-[#FFFAF5] text-center space-y-1.5">
          <div className="w-9 h-9 rounded-xl bg-[#EAF7CF] text-[#5C8519] border border-[#CCE8A2] flex items-center justify-center mx-auto shadow-2xs">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <h4 className="font-black text-xs text-[#161F38]">
            {filter === 'pending'
              ? 'Все задания уже выполнены!'
              : filter === 'submitted'
              ? 'Пока нет сданных заданий'
              : 'Домашних заданий пока нет'}
          </h4>
          <p className="text-[11px] text-[#6B758E] max-w-sm mx-auto">
            {filter === 'pending'
              ? 'Вы отлично поработали. Новые задания появятся здесь после урока.'
              : 'Новые упражнения от преподавателя появятся здесь сразу после проведения занятия.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredHomeworks.map((hw) => {
            const isSubmitted = hw.status === 'submitted' || Boolean(hw.studentSolutionText) || Boolean(hw.studentSolutionFileUrl);
            const isReviewed = hw.status === 'reviewed';
            const isEditing = openSubmitId === hw.id;
            const isJustSent = submitSuccessId === hw.id;

            return (
              <div
                key={hw.id}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden shadow-2xs ${
                  isEditing
                    ? 'border-coralAccent bg-white ring-2 ring-coralAccent/20'
                    : isSubmitted
                    ? 'border-[#CCE8A2] bg-[#FFFDFB]'
                    : 'border-[#F2DECE] bg-[#FFFDFB] hover:border-[#E8C5AC]'
                }`}
              >
                {/* Card Top Banner */}
                <div className="p-3.5 sm:p-4 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isReviewed ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black bg-[#E6F0FA] text-[#2563EB] border border-[#BFDBFE] px-2.5 py-0.5 rounded-full">
                            ★ Проверено учителем
                          </span>
                        ) : isSubmitted ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black bg-[#EAF7CF] text-[#5C8519] border border-[#CCE8A2] px-2.5 py-0.5 rounded-full">
                            <Check className="w-3 h-3" />
                            На проверке у педагога
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black bg-[#FFF2E6] text-coralAccent border border-[#FCDDC7] px-2.5 py-0.5 rounded-full">
                            <Clock className="w-3 h-3" />
                            К выполнению
                          </span>
                        )}

                        <span className="text-[10px] text-[#8A95A8]">
                          Педагог: <strong className="text-[#161F38]">{hw.teacherName || 'Преподаватель'}</strong>
                        </span>

                        {hw.createdAt && (
                          <span className="text-[10px] text-[#8A95A8]">
                            • {new Date(hw.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                          </span>
                        )}
                      </div>

                      <h4 className="font-black text-sm sm:text-base text-[#161F38] leading-snug">
                        {hw.title}
                      </h4>
                    </div>
                  </div>

                  {/* Task Description / Requirement Box */}
                  <div className="p-3.5 bg-white rounded-xl border border-[#F2DECE] space-y-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#8A95A8] block">
                      Условие задания:
                    </span>
                    <p className="text-xs sm:text-sm text-[#374151] leading-relaxed whitespace-pre-line">
                      {hw.taskDescription}
                    </p>
                  </div>

                  {/* Teacher Attached File */}
                  {hw.taskFileUrl && (
                    <div className="flex items-center gap-2 p-2.5 bg-[#FFF8F1] border border-[#FCDDC7] rounded-xl">
                      <div className="w-8 h-8 rounded-lg bg-[#FFE3CC] text-coralAccent flex items-center justify-center shrink-0">
                        <Paperclip className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-bold text-[#8A95A8] block">
                          Материалы к уроку от педагога:
                        </span>
                        <p className="text-xs font-bold text-[#161F38] truncate">
                          {hw.fileName || 'Файл с упражнениями'}
                        </p>
                      </div>
                      <a
                        href={hw.taskFileUrl}
                        download={hw.fileName || 'homework_task'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 bg-coralAccent hover:bg-coralAccent-hover text-white text-xs font-black px-3 py-1.5 rounded-lg shadow-2xs transition-all active:scale-95 cursor-pointer shrink-0"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Скачать</span>
                      </a>
                    </div>
                  )}

                  {/* Teacher Feedback if reviewed */}
                  {hw.teacherFeedback && (
                    <div className="p-3 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#2563EB] flex items-center gap-1">
                        ★ Отзыв преподавателя:
                      </span>
                      <p className="text-xs text-[#1E3A8A] font-medium leading-relaxed">
                        {hw.teacherFeedback}
                      </p>
                    </div>
                  )}

                  {/* Just sent notification banner */}
                  {isJustSent && (
                    <div className="p-3 bg-[#EAF7CF] border border-[#CCE8A2] rounded-xl flex items-center gap-2 text-xs font-black text-[#5C8519] animate-in fade-in">
                      <CheckCircle2 className="w-4 h-4 text-[#5C8519]" />
                      <span>Отлично! Ваше решение успешно отправлено педагогу на проверку.</span>
                    </div>
                  )}

                  {/* SOLUTION DISPLAY OR SUBMISSION SECTION */}
                  <div className="pt-2 border-t border-[#F8EDE1]">
                    {/* STATE 1: ALREADY SUBMITTED (SHOW DETAILS & ALLOW EDIT) */}
                    {isSubmitted && !isEditing ? (
                      <div className="space-y-3">
                        <div className="p-3.5 bg-[#F7FAEF] border border-[#CCE8A2] rounded-xl space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-xs font-black text-[#5C8519]">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Ваше отправленное решение:</span>
                            </div>
                            <span className="text-[10px] text-[#8A95A8] font-bold">
                              Ожидает проверки педагогом
                            </span>
                          </div>

                          {/* Submitted Text */}
                          {hw.studentSolutionText && (
                            <p className="text-xs text-[#161F38] bg-white p-2.5 rounded-lg border border-[#D5ECA3] whitespace-pre-line leading-relaxed">
                              {hw.studentSolutionText}
                            </p>
                          )}

                          {/* Submitted File / Image / Audio */}
                          {hw.studentSolutionFileUrl && (
                            <div className="pt-1">
                              {/\.(mp3|wav|ogg|webm|m4a)($|\?)/i.test(hw.studentSolutionFileUrl) ? (
                                <div className="space-y-1">
                                  <span className="text-[10px] font-bold text-[#6B758E] block">
                                    Аудиозапись решения:
                                  </span>
                                  <audio
                                    controls
                                    src={hw.studentSolutionFileUrl}
                                    className="w-full h-8"
                                  />
                                </div>
                              ) : /\.(png|jpe?g|webp|gif)($|\?)/i.test(hw.studentSolutionFileUrl) ? (
                                <div className="space-y-1">
                                  <span className="text-[10px] font-bold text-[#6B758E] block">
                                    Прикрепленное фото тетради:
                                  </span>
                                  <a
                                    href={hw.studentSolutionFileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-block overflow-hidden rounded-lg border border-[#D5ECA3] max-w-xs hover:opacity-95"
                                  >
                                    <img
                                      src={hw.studentSolutionFileUrl}
                                      alt="Фото решения"
                                      className="max-h-48 object-contain bg-white"
                                    />
                                  </a>
                                </div>
                              ) : (
                                <a
                                  href={hw.studentSolutionFileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download
                                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5C8519] bg-white border border-[#D5ECA3] px-3 py-1.5 rounded-lg hover:bg-[#F2F7E5] transition-colors"
                                >
                                  <Paperclip className="w-3.5 h-3.5" />
                                  <span>Скачать прикрепленный файл с решением</span>
                                </a>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Button to edit / augment solution */}
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleStartSubmit(hw)}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6B758E] hover:text-[#161F38] bg-[#FFF8F1] hover:bg-[#FFF2E6] border border-[#F2DECE] px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-coralAccent" />
                            <span>Дополнить или изменить решение</span>
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {/* STATE 2: NOT SUBMITTED YET & FORM IS CLOSED -> BIG CLEAR PROMINENT SUBMIT BUTTON */}
                    {!isSubmitted && !isEditing ? (
                      <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#FFF8F1] p-3 rounded-xl border border-[#FCDDC7]">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-xs font-black text-[#161F38]">
                            <AlertCircle className="w-4 h-4 text-coralAccent shrink-0" />
                            <span>Задание ожидает вашего решения</span>
                          </div>
                          <p className="text-[11px] text-[#6B758E]">
                            Прикрепите фото тетради, напишите ответ текстом или наговорите голосом
                          </p>
                        </div>

                        {/* THE PROMINENT SUBMIT BUTTON REQUESTED BY USER */}
                        <button
                          type="button"
                          onClick={() => handleStartSubmit(hw)}
                          className="inline-flex items-center justify-center gap-2 bg-coralAccent hover:bg-coralAccent-hover text-white font-black text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-xs transition-all duration-140 active:scale-95 cursor-pointer shrink-0"
                        >
                          <Send className="w-4 h-4" />
                          <span>Отправить решение</span>
                        </button>
                      </div>
                    ) : null}

                    {/* STATE 3: SOLUTION FORM IS EXPANDED / OPEN */}
                    {isEditing ? (
                      <div className="bg-[#FFFDFB] border border-coralAccent/40 rounded-xl p-4 space-y-3.5 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between border-b border-[#F8EDE1] pb-2">
                          <div className="flex items-center gap-2">
                            <Send className="w-4 h-4 text-coralAccent" />
                            <h5 className="font-black text-xs sm:text-sm text-[#161F38]">
                              Сдача решения преподавателю
                            </h5>
                          </div>
                          <span className="text-[10px] text-[#8A95A8]">
                            Педагог: {hw.teacherName || 'Преподаватель'}
                          </span>
                        </div>

                        {/* Hidden File Input */}
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileUpload}
                          accept="image/*,audio/*,.pdf,.doc,.docx,.txt,.mp3,.wav,.m4a,.ogg,.webm"
                          className="hidden"
                        />

                        {/* Solution Input Area: Text */}
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-[#161F38] flex items-center justify-between">
                            <span>1. Текст ответа или комментарий к решению:</span>
                            <span className="text-[10px] text-[#8A95A8] font-normal">
                              (ответ на вопрос, сочинение или пояснения)
                            </span>
                          </label>
                          <textarea
                            rows={3}
                            value={solutionText}
                            onChange={(e) => setSolutionText(e.target.value)}
                            placeholder="Напишите здесь ваше решение, ответ на задание или вопросы преподавателю..."
                            className="w-full text-xs p-3 rounded-xl border border-[#F2DECE] focus:border-coralAccent focus:ring-2 focus:ring-coralAccent/20 outline-none bg-white text-[#161F38] placeholder-[#A0ABC0] transition-all resize-y"
                          />
                        </div>

                        {/* Attachment Area: File / Photo / Audio */}
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-[#161F38] block">
                            2. Прикрепить фото тетради, аудиозапись или файл:
                          </label>

                          {solutionFile ? (
                            <div className="p-3 bg-white border border-[#CCE8A2] rounded-xl shadow-2xs space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  {solutionFile.isAudio ? (
                                    <Volume2 className="w-4 h-4 text-[#5C8519] shrink-0" />
                                  ) : solutionFile.isImage ? (
                                    <ImageIcon className="w-4 h-4 text-[#5C8519] shrink-0" />
                                  ) : (
                                    <FileText className="w-4 h-4 text-[#5C8519] shrink-0" />
                                  )}
                                  <div className="min-w-0 truncate">
                                    <span className="text-xs font-bold text-[#161F38] truncate block">
                                      {solutionFile.name}
                                    </span>
                                    <span className="text-[10px] text-[#5C8519] font-medium block">
                                      {solutionFile.isAudio ? '✓ Аудиозапись решения прикреплена' : '✓ Файл успешно прикреплен'}
                                    </span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setSolutionFile(null)}
                                  className="text-[#8A95A8] hover:text-rose-600 p-1 rounded-lg transition-colors cursor-pointer"
                                  title="Удалить прикрепленный файл"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>

                              {solutionFile.isAudio && (
                                <div className="pt-1">
                                  <audio
                                    controls
                                    src={solutionFile.url}
                                    className="w-full h-8"
                                  />
                                </div>
                              )}
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={isUploadingFile}
                              onClick={() => fileInputRef.current?.click()}
                              className="w-full border-2 border-dashed border-[#F2DECE] hover:border-coralAccent bg-white hover:bg-[#FFF9F3] text-[#6B758E] hover:text-[#161F38] p-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 text-xs font-bold disabled:opacity-50"
                            >
                              {isUploadingFile ? (
                                <>
                                  <RefreshCw className="w-4 h-4 animate-spin text-coralAccent" />
                                  <span>Загрузка файла...</span>
                                </>
                              ) : (
                                <>
                                  <Upload className="w-4 h-4 text-coralAccent" />
                                  <span>Нажмите, чтобы прикрепить фото тетради, аудиозапись или файл (до 15 МБ)</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>

                        {/* Optional Voice Recording Toggle */}
                        <div className="pt-1">
                          {!isVoiceMode ? (
                            <button
                              type="button"
                              onClick={() => setIsVoiceMode(true)}
                              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-coralAccent hover:text-coralAccent-hover cursor-pointer"
                            >
                              <Mic className="w-3.5 h-3.5" />
                              <span>
                                {solutionFile?.isAudio
                                  ? 'Записать заново голосовой ответ (микрофон)'
                                  : 'Или прикрепить голосовой ответ (аудиозапись)'}
                              </span>
                            </button>
                          ) : (
                            <div className="space-y-1.5 p-3 bg-white border border-[#FCDDC7] rounded-xl shadow-2xs animate-in fade-in">
                              <div className="flex items-center justify-between text-[11px] font-bold text-[#161F38]">
                                <span className="flex items-center gap-1">
                                  <Mic className="w-3.5 h-3.5 text-coralAccent" />
                                  <span>Запись голосового ответа:</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setIsVoiceMode(false)}
                                  className="text-[10px] text-[#8A95A8] hover:text-[#161F38] cursor-pointer"
                                >
                                  Скрыть
                                </button>
                              </div>
                              <VoiceRecorder
                                submitLabel="Прикрепить аудиозапись к ответу"
                                onSendVoice={(durationSec, uploadedUrl) => {
                                  setSolutionFile({
                                    url: uploadedUrl,
                                    name: `Голосовой ответ (${durationSec} сек.)`,
                                    isAudio: true,
                                  });
                                  setIsVoiceMode(false);
                                }}
                                onCancel={() => setIsVoiceMode(false)}
                              />
                            </div>
                          )}
                        </div>

                        {/* Final Action Buttons */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F8EDE1]">
                          <button
                            type="button"
                            onClick={handleCancelSubmit}
                            disabled={isSubmitting || isUploadingFile}
                            className="px-4 py-2 text-xs font-bold text-[#6B758E] hover:text-[#161F38] hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                          >
                            Отмена
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSendSolution(hw.id)}
                            disabled={
                              isSubmitting ||
                              isUploadingFile ||
                              (!solutionText.trim() && !solutionFile)
                            }
                            className="inline-flex items-center gap-2 bg-coralAccent hover:bg-coralAccent-hover text-white text-xs font-black px-5 py-2.5 rounded-xl shadow-xs transition-all duration-140 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isSubmitting ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span>Отправка решения...</span>
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4" />
                                <span>Отправить решение на проверку</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer support / message teacher */}
      <div className="pt-2 border-t border-[#F8EDE1] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-[#6B758E]">
        <div className="flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-coralAccent" />
          <span>Возникли трудности с заданием? Вы всегда можете задать вопрос педагогу в чате.</span>
        </div>
        <Link
          href={`/messenger?id=${encodeURIComponent(currentUserId)}`}
          className="inline-flex items-center gap-1 font-bold text-coralAccent hover:text-coralAccent-hover text-xs shrink-0"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          <span>Написать педагогу в чат</span>
        </Link>
      </div>
    </div>
  );
}
