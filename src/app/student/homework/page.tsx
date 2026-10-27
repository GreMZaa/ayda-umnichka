'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  Send,
  Paperclip,
  FileText,
  Image as ImageIcon,
  Edit3,
  AlertCircle,
  Download,
  ExternalLink,
  RefreshCw,
  Check,
  Volume2,
  X,
  User,
  GraduationCap,
  Calendar
} from 'lucide-react';
import VoiceRecorder from '@/components/VoiceRecorder';
import { broadcastPlatformEvent } from '@/lib/platformNotifications';

interface HomeworkItem {
  id: string;
  title: string;
  task_description: string;
  student_public_id?: string;
  student_name?: string;
  teacher_name?: string;
  task_file_url?: string;
  file_name?: string;
  due_date?: string;
  status: 'assigned' | 'submitted' | 'completed' | 'reviewed';
  student_solution_text?: string;
  student_solution_file_url?: string;
  teacher_feedback?: string;
  created_at: string;
  updated_at?: string;
}

const formatDateSafe = (dateStr?: string | null) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  } catch {
    return dateStr || '';
  }
};

function StudentHomeworkContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const studentIdParam = searchParams.get('studentId') || '';
  const teacherNameParam = searchParams.get('teacherName') || '';

  const [studentId, setStudentId] = useState<string>(studentIdParam);
  const [studentName, setStudentName] = useState<string>('');
  const [homeworkList, setHomeworkList] = useState<HomeworkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'submitted'>('all');

  // Solution submission state
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

  // 1. Resolve student ID from params or localStorage
  useEffect(() => {
    let effectiveId = studentIdParam;
    if (!effectiveId && typeof window !== 'undefined') {
      effectiveId =
        localStorage.getItem('aida_auth_user_id') ||
        document.cookie.match(/(?:^|; )aida_auth_user_id=([^;]*)/)?.[1] ||
        localStorage.getItem('aida_user_id') ||
        document.cookie.match(/(?:^|; )aida_user_id=([^;]*)/)?.[1] ||
        '';
    }
    setStudentId(effectiveId);

    if (typeof window !== 'undefined') {
      const storedName = localStorage.getItem('aida_full_name');
      if (storedName) {
        setStudentName(storedName.replace(/\s*\(.*?\)$/, '').trim());
      }
    }
  }, [studentIdParam]);

  // 2. Fetch homework for student
  const fetchHomework = async () => {
    if (!studentId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/homework?studentPublicId=${encodeURIComponent(studentId)}`, {
        cache: 'no-store',
      });
      const data = await res.json();

      if (data?.homework && Array.isArray(data.homework)) {
        setHomeworkList(data.homework);
      } else {
        setHomeworkList([]);
      }
    } catch (err) {
      console.warn('Error loading student homework:', err);
      setHomeworkList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (studentId) {
      fetchHomework();
    }
  }, [studentId]);

  // Handle opening submission form
  const handleStartSubmit = (hw: HomeworkItem) => {
    setOpenSubmitId(hw.id);
    setSolutionText(hw.student_solution_text || '');
    if (hw.student_solution_file_url) {
      const isAud =
        /\.(mp3|wav|ogg|webm|m4a|aac)($|\?)/i.test(hw.student_solution_file_url) ||
        Boolean(hw.student_solution_text?.includes('Аудиоответ'));
      setSolutionFile({
        url: hw.student_solution_file_url,
        name: isAud ? 'Ранее прикрепленная аудиозапись' : 'Ранее прикрепленный файл',
        isImage: !isAud && /\.(png|jpe?g|webp|gif)($|\?)/i.test(hw.student_solution_file_url),
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

  // Upload attachment file (image, doc, pdf, audio)
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

  // Submit solution to backend
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
        const currentHw = homeworkList.find((h) => h.id === hwId);
        broadcastPlatformEvent('homework-submitted', {
          id: hwId,
          title: currentHw?.title || 'Домашнее задание',
          student_public_id: studentIdParam || studentId,
          student_name: studentName || 'Ученик',
          student_solution_text: finalSolutionText,
          student_solution_file_url: finalFileUrl,
        });

        setSubmitSuccessId(hwId);
        setTimeout(() => setSubmitSuccessId(null), 3500);
        setOpenSubmitId(null);
        await fetchHomework();
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

  // Filtered list
  const filteredHomework = homeworkList.filter((hw) => {
    const isSubmitted = hw.status === 'submitted' || hw.status === 'completed' || hw.status === 'reviewed' || Boolean(hw.student_solution_text) || Boolean(hw.student_solution_file_url);
    if (filter === 'pending') return !isSubmitted;
    if (filter === 'submitted') return isSubmitted;
    return true;
  });

  const pendingCount = homeworkList.filter(
    (h) => h.status !== 'submitted' && h.status !== 'completed' && h.status !== 'reviewed' && !h.student_solution_text && !h.student_solution_file_url
  ).length;

  const submittedCount = homeworkList.filter(
    (h) => h.status === 'submitted' || h.status === 'completed' || h.status === 'reviewed' || Boolean(h.student_solution_text) || Boolean(h.student_solution_file_url)
  ).length;

  // Resolve Teacher display name:
  // "только вместо ученика преподаватель кто сделал урок ему"
  const distinctTeachers = Array.from(
    new Set(homeworkList.map((h) => h.teacher_name).filter(Boolean))
  ) as string[];

  const resolvedTeacherName =
    teacherNameParam.trim() ||
    distinctTeachers[0] ||
    'Преподаватель центра';

  const studentReturnUrl = studentId ? `/${encodeURIComponent(studentId)}` : '/student';

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-5">
      {/* Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-3xl p-4 sm:p-6 border border-[#F2DECE] shadow-xs">
        <div className="space-y-1.5">
          <Link
            href={studentReturnUrl}
            className="inline-flex items-center gap-1.5 text-xs font-black text-[#5C8519] hover:text-[#456512] transition-colors mb-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Вернуться в личный кабинет</span>
          </Link>

          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-[#161F38] tracking-tight">
              Домашние задания: {resolvedTeacherName}
            </h1>
            <span className="inline-flex items-center gap-1 bg-[#FFF2E6] text-coralAccent border border-[#FCDDC7] text-xs font-black px-2.5 py-0.5 rounded-full">
              <GraduationCap className="w-3.5 h-3.5" />
              Преподаватель
            </span>
          </div>

          <p className="text-xs text-[#6B758E]">
            {studentName ? `Ученик: ${studentName}` : 'Личный кабинет ученика'}
            {studentId && ` • ID: ${studentId}`}
          </p>
        </div>

        {/* Counter badges */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <span className="bg-[#FFF9F3] text-[#161F38] text-xs font-bold px-3 py-1.5 rounded-xl border border-[#F2DECE]">
            Всего: <strong className="font-black">{homeworkList.length}</strong>
          </span>
          {pendingCount > 0 && (
            <span className="bg-[#FFF2E6] text-coralAccent text-xs font-bold px-3 py-1.5 rounded-xl border border-[#FCDDC7] animate-pulse">
              К сдаче: <strong className="font-black">{pendingCount}</strong>
            </span>
          )}
          {submittedCount > 0 && (
            <span className="bg-[#EAF7CF] text-[#5C8519] text-xs font-bold px-3 py-1.5 rounded-xl border border-[#CCE8A2]">
              Сдано: <strong className="font-black">{submittedCount}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-3 bg-white rounded-2xl p-2 border border-[#F2DECE] shadow-2xs">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              filter === 'all'
                ? 'bg-coralAccent text-white shadow-2xs font-black'
                : 'text-[#6B758E] hover:text-[#161F38] hover:bg-[#FFF9F3]'
            }`}
          >
            Все ({homeworkList.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('pending')}
            className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              filter === 'pending'
                ? 'bg-coralAccent text-white shadow-2xs font-black'
                : 'text-[#6B758E] hover:text-[#161F38] hover:bg-[#FFF9F3]'
            }`}
          >
            К выполнению ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('submitted')}
            className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              filter === 'submitted'
                ? 'bg-[#5C8519] text-white shadow-2xs font-black'
                : 'text-[#6B758E] hover:text-[#161F38] hover:bg-[#FFF9F3]'
            }`}
          >
            Сдано ({submittedCount})
          </button>
        </div>

        <button
          type="button"
          onClick={fetchHomework}
          disabled={loading}
          className="text-xs font-bold text-[#6B758E] hover:text-[#161F38] p-1.5 rounded-lg hover:bg-[#FFF9F3] transition-colors cursor-pointer"
          title="Обновить список"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-coralAccent' : ''}`} />
        </button>
      </div>

      {/* Homework Items List */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-[#F2DECE] space-y-2">
          <RefreshCw className="w-6 h-6 animate-spin text-coralAccent mx-auto" />
          <p className="text-xs font-bold text-[#6B758E]">Загрузка домашних заданий...</p>
        </div>
      ) : filteredHomework.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 sm:p-14 text-center border border-dashed border-[#F2DECE] space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#EAF7CF] text-[#5C8519] border border-[#CCE8A2] flex items-center justify-center mx-auto shadow-2xs">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="font-black text-base text-[#161F38]">
            {filter === 'pending'
              ? 'Все задания уже выполнены!'
              : filter === 'submitted'
              ? 'Пока нет сданных заданий'
              : 'Домашних заданий пока нет'}
          </h3>
          <p className="text-xs text-[#6B758E] max-w-md mx-auto">
            {filter === 'pending'
              ? 'Вы отлично поработали. Новые задания появятся здесь сразу после проведения урока.'
              : 'Преподаватель подготовит задания и прикрепит материалы к следующему занятию.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredHomework.map((hw) => {
            const isSubmitted =
              hw.status === 'submitted' ||
              hw.status === 'completed' ||
              hw.status === 'reviewed' ||
              Boolean(hw.student_solution_text) ||
              Boolean(hw.student_solution_file_url);
            const isReviewed = hw.status === 'reviewed';
            const isEditing = openSubmitId === hw.id;
            const isJustSent = submitSuccessId === hw.id;

            return (
              <div
                key={hw.id}
                className={`bg-white rounded-3xl p-4 sm:p-6 border transition-all space-y-4 shadow-xs ${
                  isEditing
                    ? 'border-coralAccent ring-2 ring-coralAccent/20'
                    : isSubmitted
                    ? 'border-[#CCE8A2]'
                    : 'border-[#F2DECE] hover:border-[#E8C5AC]'
                }`}
              >
                {/* Top Banner: Status, Teacher, Due Date */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 min-w-0">
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

                      <span className="text-[10px] text-[#6B758E] font-bold">
                        Педагог: <strong className="text-[#161F38]">{hw.teacher_name || resolvedTeacherName}</strong>
                      </span>

                      {hw.due_date && (
                        <span className="text-[10px] text-[#6B758E] font-medium flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-coralAccent" />
                          Срок: {formatDateSafe(hw.due_date)}
                        </span>
                      )}

                      {hw.created_at && (
                        <span className="text-[10px] text-[#8A95A8]">
                          • {formatDateSafe(hw.created_at)}
                        </span>
                      )}
                    </div>

                    <h3 className="font-black text-base sm:text-lg text-[#161F38] leading-tight">
                      {hw.title}
                    </h3>
                  </div>

                  {isJustSent && (
                    <span className="inline-flex items-center gap-1 bg-[#EAF7CF] text-[#5C8519] border border-[#CCE8A2] text-xs font-bold px-3 py-1 rounded-full animate-bounce shrink-0">
                      <Check className="w-3.5 h-3.5" />
                      Решение успешно отправлено!
                    </span>
                  )}
                </div>

                {/* Requirement / Task Description Box */}
                <div className="bg-[#FFF8F1] rounded-2xl p-3.5 sm:p-4 border border-[#F2DECE] space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#8A95A8] block">
                    Условие задания:
                  </span>
                  <p className="text-xs sm:text-sm text-[#374151] leading-relaxed whitespace-pre-wrap">
                    {hw.task_description}
                  </p>
                </div>

                {/* Teacher Attached Material / File */}
                {hw.task_file_url && (
                  <div className="flex items-center justify-between gap-3 p-3 bg-[#FFF9F3] border border-[#FCDDC7] rounded-2xl">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-[#FFE3CC] text-coralAccent flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 truncate">
                        <span className="text-xs font-bold text-[#161F38] block truncate">
                          {hw.file_name || 'Материалы к домашнему заданию'}
                        </span>
                        <span className="text-[10px] text-[#6B758E]">
                          Прикрепленный файл от преподавателя
                        </span>
                      </div>
                    </div>

                    <a
                      href={hw.task_file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={hw.file_name || 'homework_material'}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-coralAccent bg-white hover:bg-coralAccent hover:text-white px-3.5 py-1.5 rounded-xl border border-[#FCDDC7] transition-all shrink-0 cursor-pointer shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Скачать</span>
                    </a>
                  </div>
                )}

                {/* Teacher Feedback / Review Note */}
                {hw.teacher_feedback && (
                  <div className="p-3.5 bg-[#EFF6FF] border border-[#BFDBFE] rounded-2xl space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#2563EB] block">
                      Комментарий преподавателя:
                    </span>
                    <p className="text-xs text-[#1E3A8A] leading-relaxed whitespace-pre-wrap">
                      {hw.teacher_feedback}
                    </p>
                  </div>
                )}

                {/* SOLUTION AREA: 3 States (Submitted View, Prominent Action, or Form) */}

                {/* State 1: Submitted View */}
                {isSubmitted && !isEditing ? (
                  <div className="p-3.5 sm:p-4 bg-[#F9FCF3] border border-[#CCE8A2] rounded-2xl space-y-3">
                    <div className="flex items-center justify-between gap-2 border-b border-[#E0F0C6] pb-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#5C8519]" />
                        <span className="text-xs font-black text-[#5C8519]">
                          Ваше отправленное решение:
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleStartSubmit(hw)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#6B758E] hover:text-[#161F38] bg-white border border-[#CCE8A2] px-2.5 py-1 rounded-xl transition-all cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3 text-coralAccent" />
                        <span>Изменить</span>
                      </button>
                    </div>

                    {hw.student_solution_text && (
                      <p className="text-xs text-[#161F38] bg-white p-3 rounded-xl border border-[#CCE8A2] whitespace-pre-wrap leading-relaxed">
                        {hw.student_solution_text}
                      </p>
                    )}

                    {hw.student_solution_file_url && (
                      <div className="pt-1">
                        {/\.(mp3|wav|ogg|webm|m4a)($|\?)/i.test(hw.student_solution_file_url) ? (
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-[#6B758E] block">
                              Аудиозапись решения:
                            </span>
                            <audio controls src={hw.student_solution_file_url} className="w-full h-8" />
                          </div>
                        ) : /\.(png|jpe?g|webp|gif)($|\?)/i.test(hw.student_solution_file_url) ? (
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-[#6B758E] block">
                              Прикрепленное фото тетради:
                            </span>
                            <a
                              href={hw.student_solution_file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block overflow-hidden rounded-xl border border-[#CCE8A2] max-w-xs hover:opacity-95"
                            >
                              <img
                                src={hw.student_solution_file_url}
                                alt="Фото решения"
                                className="max-h-56 object-contain bg-white"
                              />
                            </a>
                          </div>
                        ) : (
                          <a
                            href={hw.student_solution_file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5C8519] bg-white border border-[#CCE8A2] px-3.5 py-2 rounded-xl hover:bg-[#F2F7E5] transition-colors"
                          >
                            <Paperclip className="w-3.5 h-3.5" />
                            <span>Скачать прикрепленный файл с решением</span>
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                ) : null}

                {/* State 2: Not submitted yet & form is closed -> Prominent Call to Action */}
                {!isSubmitted && !isEditing ? (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#FFF8F1] p-4 rounded-2xl border border-[#FCDDC7]">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs sm:text-sm font-black text-[#161F38]">
                        <AlertCircle className="w-4 h-4 text-coralAccent shrink-0" />
                        <span>Задание ожидает вашего решения</span>
                      </div>
                      <p className="text-[11px] text-[#6B758E]">
                        Прикрепите фото тетради, напишите ответ текстом или наговорите голосом
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleStartSubmit(hw)}
                      className="inline-flex items-center justify-center gap-2 bg-coralAccent hover:bg-coralAccent-hover text-white font-black text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
                    >
                      <Send className="w-4 h-4" />
                      <span>Отправить решение</span>
                    </button>
                  </div>
                ) : null}

                {/* State 3: Solution Submission Form Open */}
                {isEditing ? (
                  <div className="bg-[#FFFDFB] border border-coralAccent/40 rounded-2xl p-4 sm:p-5 space-y-4 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between border-b border-[#F8EDE1] pb-2.5">
                      <div className="flex items-center gap-2">
                        <Send className="w-4 h-4 text-coralAccent" />
                        <h4 className="font-black text-xs sm:text-sm text-[#161F38]">
                          Сдача решения преподавателю ({hw.teacher_name || resolvedTeacherName})
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={handleCancelSubmit}
                        className="text-[#8A95A8] hover:text-[#161F38] text-xs p-1"
                        title="Отмена"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Hidden file input */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/*,audio/*,.pdf,.doc,.docx,.txt,.mp3,.wav,.m4a,.ogg,.webm"
                      className="hidden"
                    />

                    {/* Textarea answer */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#161F38] flex items-center justify-between">
                        <span>1. Текст ответа или пояснения:</span>
                        <span className="text-[10px] text-[#8A95A8] font-normal">
                          (ответ на задание или вопросы педагогу)
                        </span>
                      </label>
                      <textarea
                        rows={3}
                        value={solutionText}
                        onChange={(e) => setSolutionText(e.target.value)}
                        placeholder="Напишите здесь ваше решение или ответ на задание..."
                        className="w-full text-xs p-3 rounded-xl border border-[#F2DECE] focus:border-coralAccent focus:ring-2 focus:ring-coralAccent/20 outline-none bg-white text-[#161F38] placeholder-[#A0ABC0] transition-all resize-y"
                      />
                    </div>

                    {/* Attached file/audio indicator */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#161F38] block">
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
                                  {solutionFile.isAudio
                                    ? '✓ Аудиозапись решения прикреплена'
                                    : '✓ Файл успешно прикреплен'}
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
                              <audio controls src={solutionFile.url} className="w-full h-8" />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            disabled={isUploadingFile}
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#161F38] bg-white hover:bg-[#FFF9F3] border border-[#F2DECE] px-3.5 py-2 rounded-xl transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                          >
                            <Paperclip className="w-3.5 h-3.5 text-coralAccent" />
                            <span>{isUploadingFile ? 'Загрузка...' : 'Прикрепить фото / файл'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setIsVoiceMode(!isVoiceMode)}
                            className={`inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-2xs cursor-pointer ${
                              isVoiceMode
                                ? 'bg-coralAccent text-white border border-coralAccent'
                                : 'bg-white text-[#161F38] hover:bg-[#FFF9F3] border border-[#F2DECE]'
                            }`}
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>{isVoiceMode ? 'Скрыть микрофон' : 'Наговорить голосом'}</span>
                          </button>
                        </div>
                      )}

                      {/* Voice recorder widget */}
                      {isVoiceMode && !solutionFile && (
                        <div className="p-3 bg-[#FFF8F1] border border-[#FCDDC7] rounded-xl space-y-2">
                          <span className="text-[11px] font-bold text-[#161F38] block">
                            Запись аудиоответа:
                          </span>
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

                    {/* Action buttons */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F8EDE1]">
                      <button
                        type="button"
                        onClick={handleCancelSubmit}
                        disabled={isSubmitting}
                        className="text-xs font-bold text-[#6B758E] hover:text-[#161F38] px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
                      >
                        Отмена
                      </button>
                      <button
                        type="button"
                        disabled={isSubmitting || (!solutionText.trim() && !solutionFile)}
                        onClick={() => handleSendSolution(hw.id)}
                        className="inline-flex items-center gap-1.5 bg-coralAccent hover:bg-coralAccent-hover text-white text-xs font-black px-5 py-2 rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                      >
                        {isSubmitting ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Отправка...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Отправить на проверку</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function StudentHomeworkPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FFF7EE] flex items-center justify-center p-6 text-center">
          <div className="space-y-2">
            <div className="w-8 h-8 border-4 border-coralAccent border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-[#6B758E]">Загрузка домашних заданий...</p>
          </div>
        </div>
      }
    >
      <StudentHomeworkContent />
    </Suspense>
  );
}
