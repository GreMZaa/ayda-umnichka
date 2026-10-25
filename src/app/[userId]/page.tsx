'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import LessonsScheduleHistory from '@/components/LessonsScheduleHistory';
import VoiceRecorder from '@/components/VoiceRecorder';
import { LessonSession, HomeworkItem } from '@/types';
import {
  Video,
  Clock,
  BookOpen,
  CheckCircle2,
  Copy,
  Check,
  Edit2,
  ArrowRight,
  UserCheck,
  AlertCircle,
  Paperclip,
  GraduationCap,
  RefreshCw,
  ChevronRight,
  Shield,
  Coins,
  Send,
  MessageCircle
} from 'lucide-react';
import {
  setCustomSlug,
  updateSlugInSupabase,
} from '@/lib/userSession';

interface PageProps {
  params: Promise<{ userId: string }>;
}

export default function UserPersonalCabinetPage({ params }: PageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const routeUserId = resolvedParams.userId;

  const [currentId, setCurrentId] = useState<string>(routeUserId);
  const [isEditingSlug, setIsEditingSlug] = useState(false);
  const [newSlugInput, setNewSlugInput] = useState(routeUserId);
  const [copiedLink, setCopiedLink] = useState(false);

  // Verification & Status states
  const [isChecking, setIsChecking] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [isAccessBlocked, setIsAccessBlocked] = useState(false);
  const [isSupabaseSynced, setIsSupabaseSynced] = useState(false);

  // Dashboard states
  const [studentName, setStudentName] = useState<string>('Ученик');
  const [balance, setBalance] = useState<number>(0);
  const [lessons, setLessons] = useState<LessonSession[]>([]);
  const [homeworks, setHomeworks] = useState<HomeworkItem[]>([]);
  const [recordingHwId, setRecordingHwId] = useState<string | null>(null);

  // Active lesson room state (to re-enter after exit)
  const [activeLessonRoom, setActiveLessonRoom] = useState<{ roomId: string; topic: string } | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('aida_active_lesson_room');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.roomId && Date.now() - (parsed.timestamp || 0) < 3 * 3600 * 1000) {
          setActiveLessonRoom(parsed);
        }
      }
    } catch (_) {}
  }, []);

  const fetchStudentData = async (uid: string) => {
    try {
      setIsChecking(true);

      // 1. Verify existence of cabinet in Supabase database
      const res = await fetch(`/api/user/bind?publicId=${encodeURIComponent(uid)}`);
      const data = await res.json();

      if (!data?.exists) {
        setIsNotFound(true);
        setIsChecking(false);
        return;
      }

      // 2. The cabinet exists: check session credentials & ownership
      const activeAuthUser =
        localStorage.getItem('aida_auth_user_id') ||
        document.cookie.match(/(?:^|; )aida_auth_user_id=([^;]*)/)?.[1] ||
        localStorage.getItem('aida_user_id') ||
        document.cookie.match(/(?:^|; )aida_user_id=([^;]*)/)?.[1];
      const activeRole =
        localStorage.getItem('aida_active_role') ||
        document.cookie.match(/(?:^|; )aida_active_role=([^;]*)/)?.[1];

      const decodedAuth = activeAuthUser ? decodeURIComponent(activeAuthUser).toLowerCase() : '';
      const isOwner = Boolean(activeRole) && (decodedAuth === uid.toLowerCase() || activeRole === 'admin');

      if (!isOwner) {
        setIsAccessBlocked(true);
        setIsChecking(false);
        return;
      }

      // If authenticated user is a teacher, route to teacher cabinet
      if (data.binding?.role === 'teacher' || activeRole === 'teacher') {
        router.replace(`/teacher?id=${encodeURIComponent(uid)}`);
        return;
      }

      setIsSupabaseSynced(true);
      if (data.binding?.full_name) {
        setStudentName(data.binding.full_name);
        try {
          localStorage.setItem('aida_full_name', data.binding.full_name);
          localStorage.setItem('aida_active_role', 'student');
          localStorage.setItem('aida_auth_user_id', uid);
          window.dispatchEvent(new Event('aida-user-updated'));
        } catch (_) {}
      }
      if (data.binding?.balance_lessons !== undefined) {
        setBalance(data.binding.balance_lessons);
        try {
          localStorage.setItem('aida_student_balance', String(data.binding.balance_lessons));
          window.dispatchEvent(new Event('aida-user-updated'));
        } catch (_) {}
      }

      // 3. Fetch homework assigned to this student from Supabase
      try {
        const hwRes = await fetch(`/api/homework?studentPublicId=${encodeURIComponent(uid)}`);
        const hwData = await hwRes.json();
        if (hwData?.homework) {
          const mappedHw: HomeworkItem[] = hwData.homework.map((h: any) => ({
            id: h.id,
            title: h.title,
            taskDescription: h.task_description,
            taskFileUrl: h.task_file_url,
            fileName: h.file_name,
            teacherName: h.teacher_name || 'Преподаватель',
            studentId: h.student_public_id || uid,
            status: h.status || 'assigned',
            studentSolutionText: h.student_solution_text,
            createdAt: h.created_at,
          }));
          setHomeworks(mappedHw);
        }
      } catch (err) {
        console.warn('Failed to load homework:', err);
      }

      // 4. Fetch scheduled lessons for this student from Supabase
      try {
        const lessRes = await fetch(`/api/lessons?studentPublicId=${encodeURIComponent(uid)}`);
        const lessData = await lessRes.json();
        if (lessData?.lessons) {
          const activeLessons = lessData.lessons.filter(
            (l: any) => l.status === 'pending' || l.status === 'active'
          );
          const mappedLessons: LessonSession[] = activeLessons.map((l: any) => ({
            id: l.id,
            roomToken: l.room_token,
            teacherId: l.teacher_id || '',
            teacherName: l.teacher_name || 'Преподаватель',
            studentId: l.student_public_id || uid,
            studentName: l.student_name || 'Ученик',
            topic: l.topic,
            status: l.status,
            durationMinutes: l.duration_minutes || 45,
            createdAt: l.created_at,
          }));
          setLessons(mappedLessons);
        }
      } catch (err) {
        console.warn('Failed to load lessons:', err);
      }
    } catch (err) {
      console.warn('Cabinet verification check error:', err);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    if (!routeUserId) return;
    setCurrentId(routeUserId);
    setNewSlugInput(routeUserId);
    fetchStudentData(routeUserId);
  }, [routeUserId]);

  const copyCabinetLink = () => {
    if (typeof window !== 'undefined') {
      const fullUrl = `${window.location.origin}/${currentId}`;
      navigator.clipboard.writeText(fullUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleSaveCustomSlug = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSlugInput.trim()) return;

    const saved = setCustomSlug(newSlugInput.trim());
    if (saved) {
      await updateSlugInSupabase(currentId, saved);
      setCurrentId(saved);
      setIsEditingSlug(false);
      router.push(`/${saved}`);
    }
  };

  const handleVoiceSubmission = async (hwId: string, durationSec: number) => {
    const solutionText = `Аудиоответ отправлен педагогу (${durationSec} сек.)`;
    try {
      await fetch('/api/homework', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_solution',
          id: hwId,
          student_solution_text: solutionText,
        }),
      });

      setHomeworks((prev) =>
        prev.map((hw) =>
          hw.id === hwId
            ? {
                ...hw,
                status: 'submitted',
                studentSolutionText: solutionText,
              }
            : hw
        )
      );
      setRecordingHwId(null);
      alert('Домашнее задание успешно отправлено на проверку преподавателю!');
    } catch (err) {
      console.warn('Error submitting voice homework:', err);
    }
  };

  // Clean student display name
  const cleanStudentDisplayName = studentName.replace(/\s*\(.*?\)$/, '').trim() || 'Ученик';

  // Loading state
  if (isChecking) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-coralAccent animate-spin" />
          <p className="text-xs font-bold text-[#6B758E]">Загрузка личного кабинета...</p>
        </div>
      </div>
    );
  }

  // 404: Cabinet Does Not Exist
  if (isNotFound) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-[#F2DECE] shadow-lg text-center space-y-4 animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-3xl bg-[#FFF2E6] text-coralAccent flex items-center justify-center mx-auto border border-[#FCDDC7]">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <span className="text-[10px] font-black text-coralAccent uppercase tracking-widest bg-[#FFF2E6] px-2.5 py-0.5 rounded-full border border-[#FCDDC7]">
              Кабинет не найден
            </span>
            <h2 className="text-xl font-black text-[#161F38]">
              Кабинет /{routeUserId} не существует
            </h2>
            <p className="text-xs text-[#6B758E] leading-relaxed">
              Такой личный кабинет не зарегистрирован на платформе центра «АйДаУмничка». Персональный адрес присваивается автоматически после входа или регистрации.
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-2">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 w-full bg-coralAccent hover:bg-coralAccent-hover text-white py-3 rounded-full text-xs font-black transition-[background-color,transform,box-shadow] duration-140 ease-out-emil active:scale-[0.97] shadow-xs cursor-pointer"
            >
              <span>Зарегистрироваться или войти</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/"
              className="text-xs font-bold text-[#8A95A8] hover:text-[#161F38] py-2 transition-colors"
            >
              Вернуться на главную страницу
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Protected / Unauthorized Access
  if (isAccessBlocked) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-[#F2DECE] shadow-lg text-center space-y-4 animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-3xl bg-[#FFF2E6] text-coralAccent flex items-center justify-center mx-auto border border-[#FCDDC7]">
            <Shield className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <span className="text-[10px] font-black text-coralAccent uppercase tracking-widest bg-[#FFF2E6] px-2.5 py-0.5 rounded-full border border-[#FCDDC7]">
              Защищенный кабинет
            </span>
            <h2 className="text-xl font-black text-[#161F38]">
              Кабинет /{routeUserId} защищен
            </h2>
            <p className="text-xs text-[#6B758E] leading-relaxed">
              Этот личный кабинет привязан к зарегистрированному ученику в центре «АйДаУмничка». Для входа введите данные вашей учетной записи.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href={`/login?redirect=/${encodeURIComponent(routeUserId)}`}
              className="inline-flex items-center justify-center gap-2 w-full bg-coralAccent hover:bg-coralAccent-hover text-white py-3 rounded-full text-xs font-black transition-[background-color,transform,box-shadow] duration-140 ease-out-emil active:scale-[0.97] shadow-xs cursor-pointer"
            >
              <span>Войти через форму входа</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* 1. Student Profile Compact Header (Unified Teacher Style) */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#F2E0CF] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#FFF2E6] border border-[#FCDDC7] flex items-center justify-center text-coralAccent font-black text-xl shrink-0 shadow-2xs">
            {cleanStudentDisplayName[0] || 'У'}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-black text-[#161F38] tracking-tight">
                {cleanStudentDisplayName}
              </h1>
              <span className="text-[10px] bg-[#EAF7CF] text-[#5C8519] border border-[#D5ECA3] font-black px-2 py-0.5 rounded-full">
                Ученик центра
              </span>
              <span className="text-[10px] bg-[#FFF2E6] text-coralAccent border border-[#FCDDC7] font-extrabold px-2 py-0.5 rounded-full">
                ★ ID: {currentId}
              </span>

              {/* Copy Cabinet Link */}
              <button
                type="button"
                onClick={copyCabinetLink}
                className="inline-flex items-center gap-1 text-[10px] text-[#8A95A8] hover:text-[#161F38] bg-[#FFF8F1] hover:bg-[#FFF2E6] border border-[#F2DECE] px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                title="Скопировать ссылку на личный кабинет"
              >
                {copiedLink ? <Check className="w-3 h-3 text-[#5C8519]" /> : <Copy className="w-3 h-3 text-[#8A95A8]" />}
                <span>{copiedLink ? 'Скопировано!' : 'Ссылка'}</span>
              </button>

              {/* Edit Vanity Handle */}
              {!isEditingSlug ? (
                <button
                  type="button"
                  onClick={() => setIsEditingSlug(true)}
                  className="text-[10px] text-[#8A95A8] hover:text-[#161F38] p-1 rounded transition-colors"
                  title="Изменить адрес кабинета (например: ivan.ivanov)"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              ) : null}
            </div>

            {isEditingSlug ? (
              <form onSubmit={handleSaveCustomSlug} className="flex items-center gap-1.5 pt-1">
                <span className="text-xs font-mono text-[#8A95A8]">/</span>
                <input
                  type="text"
                  autoFocus
                  value={newSlugInput}
                  onChange={(e) => setNewSlugInput(e.target.value)}
                  placeholder="ivan.ivanov"
                  className="bg-[#FFF8F1] border border-coralAccent rounded-lg px-2 py-0.5 text-xs font-mono font-bold text-[#161F38] outline-none w-36"
                />
                <button
                  type="submit"
                  className="bg-coralAccent hover:bg-coralAccent-hover text-white text-[10px] font-bold px-2.5 py-0.5 rounded-lg shadow-2xs"
                >
                  OK
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingSlug(false)}
                  className="text-[10px] text-[#8A95A8] hover:text-[#161F38] px-1"
                >
                  ✕
                </button>
              </form>
            ) : (
              <p className="text-[11px] text-[#6B758E] mt-0.5">
                Детский развивающий центр «АйДаУмничка», г. Тольятти • Личный кабинет занятий
              </p>
            )}
          </div>
        </div>

        {/* Header Right Stat Cards */}
        <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
          <div className="bg-[#FFF8F1] border border-[#F2DECE] px-3 py-1.5 rounded-xl text-center min-w-[70px]">
            <span className="text-[9px] text-[#6B758E] font-extrabold uppercase tracking-wider block">Баланс</span>
            <p className="text-sm font-black text-[#5C8519]">{balance} зан.</p>
          </div>
          <div className="bg-[#FFF8F1] border border-[#F2DECE] px-3 py-1.5 rounded-xl text-center min-w-[70px]">
            <span className="text-[9px] text-[#6B758E] font-extrabold uppercase tracking-wider block">Домашек</span>
            <p className="text-sm font-black text-[#161F38]">{homeworks.length}</p>
          </div>
          <div className="bg-[#FFF8F1] border border-[#F2DECE] px-3 py-1.5 rounded-xl text-center min-w-[70px]">
            <span className="text-[9px] text-[#6B758E] font-extrabold uppercase tracking-wider block">Статус</span>
            <span className="text-xs font-black text-[#5C8519] flex items-center justify-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5C8519] animate-pulse" />
              В сети
            </span>
          </div>
        </div>
      </div>

      {/* Quick Re-Entry to Active Lesson if room is open */}
      {activeLessonRoom && (
        <div className="p-3.5 bg-[#EAF7CF] border border-[#CCE8A2] rounded-2xl flex items-center justify-between gap-3 animate-in fade-in shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-[#5C8519] animate-pulse shrink-0" />
            <div className="text-xs text-[#161F38] truncate">
              <span className="font-extrabold">Урок сейчас активен:</span>{' '}
              <span className="text-[#5C8519] font-bold">{activeLessonRoom.topic}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/room/${activeLessonRoom.roomId}?role=student&topic=${encodeURIComponent(activeLessonRoom.topic)}`}
              className="inline-flex items-center gap-1.5 bg-[#5C8519] hover:bg-[#4E7214] text-white font-black text-xs px-4 py-2 rounded-full shadow-2xs active:scale-95 cursor-pointer"
            >
              <Video className="w-3.5 h-3.5" />
              <span>Вернуться в урок</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem('aida_active_lesson_room');
                setActiveLessonRoom(null);
              }}
              className="text-[#8A95A8] hover:text-[#161F38] text-xs px-1.5"
              title="Скрыть напоминание"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 2. Schedule & Lesson History */}
      <div className="w-full">
        <LessonsScheduleHistory
          role="student"
          studentPublicId={currentId}
          studentName={cleanStudentDisplayName}
          onStartLesson={(token, topic) => {
            router.push(`/room/${token}?role=student&topic=${encodeURIComponent(topic)}`);
          }}
        />
      </div>

      {/* 3. Homeworks List */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#F2E0CF] shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-coralAccent" />
            <h3 className="font-black text-sm sm:text-base text-[#161F38]">
              Домашние задания от преподавателя
            </h3>
          </div>
          <span className="text-[10px] font-black bg-[#FFF2E6] text-coralAccent px-2 py-0.5 rounded-full border border-[#FCDDC7]">
            {homeworks.length} {homeworks.length === 1 ? 'задание' : 'заданий'}
          </span>
        </div>

        {homeworks.length === 0 ? (
          <div className="p-6 rounded-xl border border-dashed border-[#F2DECE] bg-[#FFFAF5] text-center space-y-1.5">
            <CheckCircle2 className="w-7 h-7 text-[#5C8519] mx-auto opacity-70" />
            <h4 className="font-bold text-xs text-[#161F38]">Все задания выполнены</h4>
            <p className="text-[11px] text-[#6B758E] max-w-xs mx-auto">
              Новые упражнения от преподавателя появятся здесь сразу после проведения занятия.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
            {homeworks.map((hw) => {
              const isSubmitted = hw.status === 'submitted';
              return (
                <div
                  key={hw.id}
                  className="p-3.5 rounded-xl border border-[#F2DECE] bg-[#FFFDFB] hover:bg-white transition-colors space-y-2.5 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-black text-xs sm:text-sm text-[#161F38]">{hw.title}</h4>
                      <span className="text-[10px] text-[#8A95A8]">Педагог: {hw.teacherName || 'Василина Владимировна'}</span>
                    </div>
                    {isSubmitted ? (
                      <span className="text-[10px] font-extrabold bg-[#EAF7CF] text-[#5C8519] border border-[#D5ECA3] px-2 py-0.5 rounded-full shrink-0">
                        ✓ На проверке
                      </span>
                    ) : (
                      <span className="text-[10px] font-extrabold bg-[#FFF2E6] text-coralAccent border border-[#FCDDC7] px-2 py-0.5 rounded-full shrink-0">
                        К выполнению
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[#6B758E] leading-relaxed whitespace-pre-line">
                    {hw.taskDescription}
                  </p>

                  {hw.taskFileUrl && (
                    <div className="pt-0.5">
                      <a
                        href={hw.taskFileUrl}
                        download={hw.fileName || 'material'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-coralAccent bg-[#FFF2E6] hover:bg-[#FFE3CC] border border-[#FCDDC7] px-2.5 py-1 rounded-xl transition-colors cursor-pointer"
                      >
                        <Paperclip className="w-3 h-3" />
                        <span>Скачать файл: {hw.fileName || 'Материалы задания'}</span>
                      </a>
                    </div>
                  )}

                  {/* Solution status or Voice submission */}
                  <div className="pt-2 border-t border-[#F8EDE1]">
                    {isSubmitted ? (
                      <div className="text-[11px] text-[#5C8519] font-medium flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{hw.studentSolutionText || 'Ответ отправлен педагогу'}</span>
                      </div>
                    ) : recordingHwId === hw.id ? (
                      <VoiceRecorder
                        onSendVoice={(duration) => handleVoiceSubmission(hw.id, duration)}
                        onCancel={() => setRecordingHwId(null)}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setRecordingHwId(hw.id)}
                        className="w-full bg-[#FFF7EE] hover:bg-[#FFF2E6] text-coralAccent border border-[#F2DECE] font-black text-xs py-2 rounded-xl transition-colors cursor-pointer active:scale-[0.98] flex items-center justify-center gap-1.5"
                      >
                        <span>🎤 Записать голосовой ответ педагогу</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="pt-2 border-t border-[#F8EDE1] flex items-center justify-between text-[11px] text-[#6B758E]">
          <span>Статус: <strong className="text-[#5C8519]">Кабинет подключен</strong></span>
          <Link
            href="/messenger"
            className="inline-flex items-center gap-1 font-bold text-coralAccent hover:text-coralAccent-hover text-xs"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Написать преподавателю</span>
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
