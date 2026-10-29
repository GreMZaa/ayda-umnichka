'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  Video,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  User,
  AlertCircle,
  Trash2,
  X
} from 'lucide-react';
import { broadcastPlatformEvent } from '@/lib/platformNotifications';
import DateTimePicker from '@/components/DateTimePicker';
import { getTolyattiParts } from '@/lib/utils';

export interface LessonRecord {
  id: string;
  room_token: string;
  topic: string;
  student_public_id?: string;
  student_name: string;
  teacher_name?: string;
  scheduled_for: string;
  duration_minutes: number;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  created_at: string;
  started_at?: string;
  ended_at?: string;
}

interface StudentOption {
  publicId: string;
  fullName: string;
  phone?: string;
}

interface LessonsScheduleHistoryProps {
  onStartLesson?: (roomToken: string, topic: string) => void;
  availableStudents?: StudentOption[];
  role?: 'teacher' | 'student';
  studentPublicId?: string;
  studentName?: string;
  teacherName?: string;
  teacherPublicId?: string;
  studentBalance?: number;
}

export function isLessonOwnedByTeacher(
  lesson: LessonRecord,
  teacherName?: string,
  teacherPublicId?: string
): boolean {
  if (!teacherName && !teacherPublicId) return true;

  const lTeacher = (lesson?.teacher_name || '').toLowerCase().trim();
  if (!lTeacher) return false;

  // 1. Direct public ID match (e.g. "id180457" in "Юлия Павловна (id180457)")
  if (teacherPublicId) {
    const pubLower = teacherPublicId.toLowerCase().trim();
    if (lTeacher.includes(pubLower)) return true;
  }

  // 2. Name matching
  if (teacherName) {
    const cleanTName = teacherName
      .replace(/\s*\(.*?\)$/, '')
      .replace(/ребёнок:\s*[^)]+/i, '')
      .trim()
      .toLowerCase();

    // Check full clean name (e.g. "юлия павловна")
    if (cleanTName && (lTeacher.includes(cleanTName) || cleanTName.includes(lTeacher))) {
      return true;
    }

    // Check first name (e.g. "юлия" or "василина")
    const firstName = cleanTName.split(/\s+/)[0];
    if (firstName && firstName.length >= 3) {
      const lFirstName = lTeacher.replace(/\s*\(.*?\)$/, '').trim().split(/\s+/)[0];
      if (lFirstName && (lFirstName === firstName || lTeacher.includes(firstName))) {
        return true;
      }
    }
  }

  return false;
}

export default function LessonsScheduleHistory({
  onStartLesson,
  availableStudents = [],
  role = 'teacher',
  studentPublicId,
  studentName,
  teacherName,
  teacherPublicId,
  studentBalance,
}: LessonsScheduleHistoryProps) {
  const router = useRouter();
  const [showZeroBalanceModal, setShowZeroBalanceModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');
  const [lessons, setLessons] = useState<LessonRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [upcomingPage, setUpcomingPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const LESSONS_PER_PAGE = 3;

  // Live ticking state for active room elapsed duration
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getLessonElapsedSeconds = (l: LessonRecord) => {
    let startMs: number | null = null;
    try {
      const localRoomStart = localStorage.getItem(`aida_lesson_started_${l.room_token}`);
      if (localRoomStart) {
        startMs = parseInt(localRoomStart, 10);
      }
      if (!startMs) {
        const savedActive = localStorage.getItem('aida_active_lesson_room');
        if (savedActive) {
          const parsed = JSON.parse(savedActive);
          if (parsed?.roomId === l.room_token && parsed.timestamp) {
            startMs = parsed.timestamp;
          }
        }
      }
    } catch (_) {}

    if (!startMs && l.started_at && (l.status === 'active' || l.status === 'pending')) {
      const parsedTime = new Date(l.started_at).getTime();
      if (!isNaN(parsedTime)) {
        startMs = parsedTime;
      }
    }

    if (startMs) {
      const elapsed = Math.max(0, Math.floor((now - startMs) / 1000));
      // Cap at 4 hours max so old stale timestamps don't keep ticking forever
      if (elapsed < 4 * 3600) {
        return elapsed;
      }
    }
    return null;
  };

  // Helper to resolve child ID and child Name for teacher cabinet display
  const getStudentDisplayLabel = (l: LessonRecord) => {
    let pubId = l.student_public_id || '';

    // Extract child name if pattern "Имя (ребёнок: ИмяРебёнка)" is present
    const childMatch = (l.student_name || '').match(/ребёнок:\s*([^)]+)/i);
    let childName = childMatch ? childMatch[1].trim() : '';

    if (!childName) {
      childName = (l.student_name || '').replace(/\s*\(.*?\)$/, '').trim();
    }

    // Try to match with availableStudents to resolve missing ID or full name
    if (availableStudents && availableStudents.length > 0) {
      if (pubId) {
        const found = availableStudents.find(
          (s) => s.publicId?.toLowerCase() === pubId.toLowerCase()
        );
        if (found && (!childName || childName.toLowerCase() === pubId.toLowerCase())) {
          const mChild = (found.fullName || '').match(/ребёнок:\s*([^)]+)/i);
          childName = mChild ? mChild[1].trim() : found.fullName.replace(/\s*\(.*?\)$/, '').trim();
        }
      } else if (childName) {
        const cleanLName = childName.toLowerCase();
        const found = availableStudents.find((s) => {
          const cleanSName = (s.fullName || '').replace(/\s*\(.*?\)$/, '').trim().toLowerCase();
          return cleanSName === cleanLName || cleanSName.includes(cleanLName) || cleanLName.includes(cleanSName);
        });
        if (found?.publicId) {
          pubId = found.publicId;
        }
      }
    }

    if (!pubId) {
      const match = (l.student_name || '').match(/id\d+/i);
      if (match) pubId = match[0];
    }

    // If childName is just an id, try to lookup real name
    if (/^id\d+$/i.test(childName)) {
      if (availableStudents) {
        const found = availableStudents.find((s) => s.publicId?.toLowerCase() === childName.toLowerCase());
        if (found?.fullName) {
          const mChild = (found.fullName || '').match(/ребёнок:\s*([^)]+)/i);
          childName = mChild ? mChild[1].trim() : found.fullName.replace(/\s*\(.*?\)$/, '').trim();
        }
      }
    }

    if (pubId && childName && pubId.toLowerCase() !== childName.toLowerCase()) {
      return `${pubId} (${childName})`;
    }
    return pubId || childName || 'Ученик';
  };

  // Helper to resolve clean teacher name for student cabinet display
  const getTeacherDisplayLabel = (l: LessonRecord) => {
    const rawTeacher = l.teacher_name?.trim();
    if (rawTeacher && rawTeacher !== 'Преподаватель') {
      return rawTeacher
        .replace(/\s*\(id\d+\)/i, '')
        .replace(/\s*\(ребёнок:[^)]+\)/i, '')
        .trim();
    }
    if (teacherName && teacherName !== 'Преподаватель') {
      return teacherName
        .replace(/\s*\(id\d+\)/i, '')
        .replace(/\s*\(ребёнок:[^)]+\)/i, '')
        .trim();
    }
    return 'Василина Владимировна';
  };

  const formatElapsedTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs} мин`;
  };

  // Form states
  const [formStudent, setFormStudent] = useState('');
  const [formTopic, setFormTopic] = useState('');
  const [formDateTime, setFormDateTime] = useState(() => {
    const parts = getTolyattiParts();
    const nextHour = (parts.hours + 1) % 24;
    const y = parts.year;
    const m = String(parts.month).padStart(2, '0');
    const d = String(parts.day).padStart(2, '0');
    const h = String(nextHour).padStart(2, '0');
    return `${y}-${m}-${d}T${h}:00`;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchLessons = async () => {
    try {
      setLoading(true);
      let url = '/api/lessons';
      if (role === 'student' && studentPublicId) {
        url = `/api/lessons?studentPublicId=${encodeURIComponent(studentPublicId)}`;
      } else if (role === 'teacher') {
        const params = new URLSearchParams();
        if (teacherPublicId) params.set('teacherPublicId', teacherPublicId);
        if (teacherName) params.set('teacherName', teacherName);
        const q = params.toString();
        url = q ? `/api/lessons?${q}` : '/api/lessons';
      }
      const res = await fetch(url, { cache: 'no-store' });
      const data = await res.json();
      if (data?.lessons) {
        setLessons(data.lessons);
      }
    } catch (err) {
      console.warn('Failed to fetch lessons:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLessons();
  }, [studentPublicId, role, teacherPublicId, teacherName]);

  const handleCreateScheduledLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDateTime) return;

    try {
      setIsSubmitting(true);
      const selectedStudentObj = availableStudents.find(
        (s) => s.publicId === formStudent || s.fullName === formStudent
      );
      const studentId =
        selectedStudentObj?.publicId ||
        formStudent.match(/id\d+/i)?.[0] ||
        (formStudent.startsWith('id') ? formStudent : null);

      const cleanTName = (teacherName || 'Преподаватель').replace(/\s*\(.*?\)$/, '').trim();
      const teacherSaveIdentifier = teacherPublicId ? `${cleanTName} (${teacherPublicId})` : cleanTName;

      const topicToSave = formTopic.trim() || 'Индивидуальное занятие';

      const res = await fetch('/api/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topicToSave,
          student_name: selectedStudentObj?.fullName || formStudent || 'Ученик центра',
          student_public_id: studentId,
          teacher_name: teacherSaveIdentifier,
          scheduled_for: formDateTime,
          status: 'pending',
          duration_minutes: 45,
        }),
      });

      if (res.ok) {
        const resData = await res.json().catch(() => ({}));
        const createdLesson = resData?.lesson;

        broadcastPlatformEvent('lesson-scheduled', {
          id: createdLesson?.id || `lesson-${Date.now()}`,
          room_token: createdLesson?.room_token || '',
          topic: topicToSave,
          student_public_id: studentId,
          student_name: selectedStudentObj?.fullName || formStudent || 'Ученик центра',
          teacher_name: cleanTName,
          scheduled_for: formDateTime,
          duration_minutes: 45,
          creator_id: 'teacher',
        });

        setShowScheduleForm(false);
        setFormDateTime('');
        setFormTopic('');
        setFormStudent('');
        await fetchLessons();
      }
    } catch (err) {
      console.warn('Error scheduling lesson:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (lessonId: string, status: 'completed' | 'cancelled') => {
    const targetLesson = lessons.find((l) => l.id === lessonId);
    if (role === 'teacher' && targetLesson && !isLessonOwnedByTeacher(targetLesson, teacherName, teacherPublicId)) {
      alert('Вы можете изменять только свои собственные уроки.');
      return;
    }

    try {
      const res = await fetch('/api/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: lessonId,
          action: 'update_status',
          status,
        }),
      });
      if (res.ok) {
        await fetchLessons();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data?.error || 'Не удалось обновить статус урока');
      }
    } catch (err) {
      console.warn('Error updating lesson status:', err);
    }
  };

  const handleDeleteLesson = async (lessonId: string, topic?: string) => {
    if (role === 'student') return;
    const targetLesson = lessons.find((l) => l.id === lessonId);
    if (role === 'teacher' && targetLesson && !isLessonOwnedByTeacher(targetLesson, teacherName, teacherPublicId)) {
      alert('Вы можете удалять только свои собственные уроки.');
      return;
    }

    const confirmed = window.confirm(
      topic
        ? `Вы уверены, что хотите удалить урок «${topic}»?`
        : 'Вы уверены, что хотите удалить этот урок?'
    );
    if (!confirmed) return;

    try {
      // Optimistically remove from state
      setLessons((prev) => prev.filter((l) => l.id !== lessonId));

      const res = await fetch(`/api/lessons?id=${encodeURIComponent(lessonId)}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data?.error || 'Не удалось удалить урок');
        await fetchLessons();
      }
    } catch (err) {
      console.error('Error deleting lesson:', err);
      alert('Ошибка при удалении урока');
      await fetchLessons();
    }
  };

  const relevantLessons = role === 'student'
    ? lessons.filter((l) => {
        if (studentPublicId && l.student_public_id && l.student_public_id.toLowerCase() === studentPublicId.toLowerCase()) return true;
        if (studentName) {
          const sNorm = studentName.replace(/\s*\(.*?\)$/, '').trim().toLowerCase();
          const lNorm = (l.student_name || '').replace(/\s*\(.*?\)$/, '').trim().toLowerCase();
          if (sNorm && (lNorm.includes(sNorm) || sNorm.includes(lNorm))) return true;
        }
        return false;
      })
    : role === 'teacher'
    ? lessons.filter((l) => isLessonOwnedByTeacher(l, teacherName, teacherPublicId))
    : lessons;

  const upcomingLessons = relevantLessons.filter(
    (l) => l.status === 'pending' || l.status === 'active'
  );
  const historyLessons = relevantLessons.filter(
    (l) => l.status === 'completed' || l.status === 'cancelled'
  );

  const totalUpcomingPages = Math.max(1, Math.ceil(upcomingLessons.length / LESSONS_PER_PAGE));
  const currentUpcomingPage = Math.min(upcomingPage, totalUpcomingPages);
  const paginatedUpcoming = upcomingLessons.slice(
    (currentUpcomingPage - 1) * LESSONS_PER_PAGE,
    currentUpcomingPage * LESSONS_PER_PAGE
  );

  const totalHistoryPages = Math.max(1, Math.ceil(historyLessons.length / LESSONS_PER_PAGE));
  const currentHistoryPage = Math.min(historyPage, totalHistoryPages);
  const paginatedHistory = historyLessons.slice(
    (currentHistoryPage - 1) * LESSONS_PER_PAGE,
    currentHistoryPage * LESSONS_PER_PAGE
  );

  const formatLessonTime = (dateStr?: string) => {
    if (!dateStr) return 'Время уточняется';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    const time = date.toLocaleTimeString('ru-RU', { timeZone: 'Europe/Samara', hour: '2-digit', minute: '2-digit' });
    const dSamara = date.toLocaleDateString('ru-RU', { timeZone: 'Europe/Samara' });
    const todaySamara = new Date().toLocaleDateString('ru-RU', { timeZone: 'Europe/Samara' });
    const isToday = dSamara === todaySamara;

    if (isToday) return `Сегодня, ${time}`;

    const dateFormatted = date.toLocaleDateString('ru-RU', { timeZone: 'Europe/Samara', day: 'numeric', month: 'short' });
    return `${dateFormatted}, ${time}`;
  };

  const formatLessonDuration = (l: LessonRecord) => {
    if (l.started_at && l.ended_at) {
      const startMs = new Date(l.started_at).getTime();
      const endMs = new Date(l.ended_at).getTime();
      if (!isNaN(startMs) && !isNaN(endMs) && endMs > startMs) {
        const diffSec = Math.max(0, Math.floor((endMs - startMs) / 1000));
        const mins = Math.floor(diffSec / 60);
        const secs = diffSec % 60;
        if (mins > 0 && secs > 0) return `${mins} мин ${secs} сек`;
        if (mins > 0) return `${mins} мин`;
        if (secs > 0) return `${secs} сек`;
      }
    }
    if (l.duration_minutes && l.duration_minutes > 0) {
      return `${l.duration_minutes} мин`;
    }
    return '45 мин';
  };

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-5 border-t-4 border-t-coralAccent border-x border-b border-[#F0DCCD] shadow-xs space-y-3.5 hover:shadow-sm transition-shadow h-full flex flex-col justify-between">
      <div className="space-y-3 flex-1 flex flex-col">
        {/* Header with Title and Tabs */}
        <div className="shrink-0 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FFF2E6] text-coralAccent border border-[#FCDDC7] flex items-center justify-center shrink-0 shadow-2xs">
              <Calendar className="w-4 h-4" />
            </div>
            <h3 className="font-black text-sm sm:text-base text-[#161F38]">Уроки и история</h3>
          </div>

          {role !== 'student' && (
            <button
              type="button"
              onClick={() => setShowScheduleForm(true)}
              className="inline-flex items-center gap-1.5 text-xs font-black bg-[#FFF2E6] hover:bg-[#FFE3CC] text-coralAccent border border-[#FCDDC7] px-3.5 py-1.5 rounded-full transition-all duration-140 cursor-pointer active:scale-95 shadow-2xs shrink-0"
              title="Запланировать онлайн-урок с учеником"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Запланировать</span>
            </button>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="shrink-0 flex items-center bg-[#F8EFE7] p-1.5 rounded-2xl border border-[#EADBCC]">
          <button
            type="button"
            onClick={() => setActiveTab('upcoming')}
            className={`flex-1 py-1 px-2 rounded-lg text-xs font-black transition-colors duration-140 cursor-pointer text-center ${
              activeTab === 'upcoming'
                ? 'bg-white text-[#161F38] shadow-2xs'
                : 'text-[#6B758E] hover:text-[#161F38]'
            }`}
          >
            Предстоящие ({upcomingLessons.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-1 px-2 rounded-lg text-xs font-black transition-colors duration-140 cursor-pointer text-center ${
              activeTab === 'history'
                ? 'bg-white text-[#161F38] shadow-2xs'
                : 'text-[#6B758E] hover:text-[#161F38]'
            }`}
          >
            История ({historyLessons.length})
          </button>
        </div>

        {/* Modern Schedule Modal Window */}
        {showScheduleForm && (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowScheduleForm(false);
            }}
          >
            <div className="bg-white rounded-3xl p-5 sm:p-7 max-w-md w-full border border-[#F2DECE] shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 relative">
              {/* Header with Icon and Close Button */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#FFF2E6] text-coralAccent border border-[#FCDDC7] flex items-center justify-center shrink-0 shadow-2xs">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-[#161F38] tracking-tight">
                      Запланировать онлайн-урок
                    </h3>
                    <p className="text-xs text-[#6B758E] mt-0.5">
                      Выберите ученика, тему занятия и время
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowScheduleForm(false)}
                  className="w-8 h-8 rounded-full bg-[#FFF8F1] hover:bg-[#FFF2E6] text-[#8A95A8] hover:text-[#161F38] border border-[#F2DECE] flex items-center justify-center transition-colors cursor-pointer shrink-0"
                  title="Закрыть"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateScheduledLesson} className="space-y-4">
                {/* Student selector */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-[#161F38]">
                    Ученик:
                  </label>
                  {availableStudents.length > 0 ? (
                    <select
                      value={formStudent}
                      onChange={(e) => setFormStudent(e.target.value)}
                      required
                      className="w-full bg-[#FFFDFB] border border-[#EADBCC] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#161F38] focus:outline-none focus:border-coralAccent focus:ring-2 focus:ring-coralAccent/20 transition-all cursor-pointer"
                    >
                      <option value="">Выберите ученика из списка</option>
                      {availableStudents.map((s) => (
                        <option key={s.publicId || s.fullName} value={s.publicId || s.fullName}>
                          {s.fullName}{s.publicId ? ` (${s.publicId})` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-3 rounded-2xl bg-[#FFF2E2] border border-[#FAD6B5] text-xs text-[#9B5115] space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 shrink-0 text-[#E26928]" />
                        <span>Нет закрепленных учеников</span>
                      </div>
                      <p className="text-[11px] leading-relaxed">
                        Чтобы запланировать онлайн-урок, сначала прикрепите ученика в блоке «Закрепленные ученики» справа.
                      </p>
                    </div>
                  )}
                </div>

                {/* Topic input with quick tags */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-[#161F38]">
                    Тема урока:
                  </label>
                  <input
                    type="text"
                    value={formTopic}
                    onChange={(e) => setFormTopic(e.target.value)}
                    className="w-full bg-[#FFFDFB] border border-[#EADBCC] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#161F38] focus:outline-none focus:border-coralAccent focus:ring-2 focus:ring-coralAccent/20 transition-all"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    {[
                      'Английский язык',
                      'Математика',
                      'Русский язык',
                      'Биология',
                      'Логопедия',
                      'Подготовка к школе',
                      'Диагностика',
                    ].map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => setFormTopic(chip)}
                        className="text-[10px] font-bold bg-[#FFF8F1] hover:bg-[#FFEEDE] text-[#6B758E] hover:text-[#161F38] border border-[#F2DECE] px-2.5 py-0.5 rounded-full transition-colors cursor-pointer"
                      >
                        + {chip}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Modern Date & Time Picker */}
                <DateTimePicker
                  value={formDateTime}
                  onChange={(val) => setFormDateTime(val)}
                  label="Дата и время проведения:"
                />

                {/* Action buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#F8EDE1]">
                  <button
                    type="button"
                    onClick={() => setShowScheduleForm(false)}
                    className="text-xs font-bold text-[#8A95A8] hover:text-[#161F38] px-4 py-2 rounded-xl transition-colors cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || availableStudents.length === 0 || !formStudent}
                    className="text-xs font-black bg-coralAccent hover:bg-coralAccent-hover text-white px-5 py-2.5 rounded-full shadow-md active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Сохранение...</span>
                      </>
                    ) : (
                      <>
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Запланировать</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Content list & Pagination container */}
        <div className="space-y-3">
          {loading ? (
            <div className="p-6 text-center text-xs font-bold text-[#6B758E] flex items-center justify-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-coralAccent" />
              <span>Загрузка уроков...</span>
            </div>
          ) : activeTab === 'upcoming' ? (
            /* Upcoming Lessons List */
            upcomingLessons.length === 0 ? (
              <div className="p-5 rounded-xl border border-dashed border-[#F2DECE] bg-[#FFFAF5] text-center space-y-1">
                <Calendar className="w-6 h-6 text-coralAccent mx-auto opacity-50" />
                <h4 className="font-bold text-xs text-[#161F38]">Нет запланированных уроков</h4>
                <p className="text-[11px] text-[#6B758E]">
                  {role === 'student'
                    ? 'Преподаватель центра назначит время урока в вашем кабинете.'
                    : 'Запланируйте занятие через кнопку выше или начните мгновенный урок слева.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="space-y-2 pr-1">
                  {paginatedUpcoming.map((l) => {
                    const elapsedSec = getLessonElapsedSeconds(l);
                    const isRoomActive = elapsedSec !== null;

                    return (
                      <div
                        key={l.id}
                        className="p-2.5 rounded-xl border border-[#F2DECE] bg-[#FFFDFB] hover:bg-white transition-colors space-y-1.5 shadow-2xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-black text-[#161F38] truncate" title={l.student_name}>
                                {role === 'student'
                                  ? getTeacherDisplayLabel(l)
                                  : getStudentDisplayLabel(l)}
                              </span>
                              <span className="text-[9px] font-bold bg-[#FFF2E6] text-coralAccent px-1.5 py-0.5 rounded-full shrink-0">
                                {formatLessonTime(l.scheduled_for)}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#6B758E] truncate mt-0.5">{l.topic}</p>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const currentBal =
                                studentBalance !== undefined
                                  ? studentBalance
                                  : typeof window !== 'undefined'
                                  ? Number(localStorage.getItem('aida_student_balance') ?? 0)
                                  : 0;

                              if (role === 'student' && currentBal <= 0) {
                                setShowZeroBalanceModal(true);
                                return;
                              }

                              if (onStartLesson) {
                                onStartLesson(l.room_token, l.topic);
                              } else {
                                router.push(`/room/${l.room_token}?role=${role}&topic=${encodeURIComponent(l.topic)}`);
                              }
                            }}
                            className={`text-[10px] font-black ${
                              isRoomActive
                                ? 'bg-[#5C8519] hover:bg-[#4E7214] text-white shadow-xs animate-pulse'
                                : 'bg-coralAccent hover:bg-coralAccent-hover text-white'
                            } px-3 py-1 rounded-full transition-colors cursor-pointer active:scale-95 flex items-center gap-1 shrink-0`}
                          >
                            <Video className="w-3 h-3" />
                            <span>{isRoomActive ? 'Вернуться в урок' : 'Войти'}</span>
                          </button>
                        </div>

                        {/* Status footer */}
                        <div className="pt-1 border-t border-[#F8EDE1] flex items-center justify-between text-[10px] flex-wrap gap-1">
                          {role === 'student' ? (
                            <>
                              <span className="text-[#8A95A8]">Статус:</span>
                              {isRoomActive ? (
                                <span className="inline-flex items-center gap-1.5 font-bold text-[#5C8519]">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#5C8519] animate-ping" />
                                  <span>В эфире • Идёт урок: <strong>{formatElapsedTimer(elapsedSec)}</strong></span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 font-bold text-[#5C8519]">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#5C8519] animate-pulse" />
                                  <span>Готов к подключению (45 мин)</span>
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[#8A95A8]">Статус:</span>
                                {isRoomActive ? (
                                  <span className="text-[#5C8519] font-black flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#5C8519] animate-ping" />
                                    <span>Урок идёт: <strong>{formatElapsedTimer(elapsedSec)}</strong></span>
                                  </span>
                                ) : (
                                  <span className="text-[#6B758E] font-medium">Ожидание начала (45 мин)</span>
                                )}
                              </div>

                              {isLessonOwnedByTeacher(l, teacherName, teacherPublicId) && (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateStatus(l.id, 'completed')}
                                    className="inline-flex items-center gap-1 font-bold text-[#5C8519] bg-[#EAF7CF] hover:bg-[#DDF4B2] px-2 py-0.5 rounded-md transition-colors cursor-pointer active:scale-95"
                                    title="Отметить, что урок состоялся"
                                  >
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Прошёл</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateStatus(l.id, 'cancelled')}
                                    className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-md transition-colors cursor-pointer active:scale-95"
                                    title="Отметить, что урок не состоялся"
                                  >
                                    <XCircle className="w-3 h-3" />
                                    <span>Не прошёл</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteLesson(l.id, l.topic)}
                                    className="inline-flex items-center gap-1 font-bold text-red-600 bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded-md transition-colors cursor-pointer active:scale-95"
                                    title="Удалить урок"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    <span>Удалить</span>
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Upcoming pagination controls */}
                {totalUpcomingPages > 1 && (
                  <div className="pt-2 flex items-center justify-between text-xs shrink-0 select-none border-t border-[#F8EDE1]">
                    <button
                      type="button"
                      disabled={currentUpcomingPage <= 1}
                      onClick={() => setUpcomingPage((p) => Math.max(1, p - 1))}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#F2DECE] bg-white text-[#161F38] hover:bg-[#FFF2E6] disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-bold text-[11px] cursor-pointer shadow-2xs"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Назад</span>
                    </button>
                    <div className="flex items-center gap-1 font-bold text-[11px] text-[#6B758E]">
                      <span>Стр. {currentUpcomingPage} из {totalUpcomingPages}</span>
                    </div>
                    <button
                      type="button"
                      disabled={currentUpcomingPage >= totalUpcomingPages}
                      onClick={() => setUpcomingPage((p) => Math.min(totalUpcomingPages, p + 1))}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#F2DECE] bg-white text-[#161F38] hover:bg-[#FFF2E6] disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-bold text-[11px] cursor-pointer shadow-2xs"
                    >
                      <span>Вперёд</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )
          ) : (
            /* History Lessons List */
            historyLessons.length === 0 ? (
              <div className="p-5 rounded-xl border border-dashed border-[#F2DECE] bg-[#FFFAF5] text-center space-y-1">
                <Clock className="w-6 h-6 text-coralAccent mx-auto opacity-50" />
                <h4 className="font-bold text-xs text-[#161F38]">История пуста</h4>
                <p className="text-[11px] text-[#6B758E]">
                  Здесь будут сохраняться прошедшие и отмененные занятия с пометкой статуса.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="space-y-2 pr-1">
                  {paginatedHistory.map((l) => {
                    const passed = l.status === 'completed';
                    return (
                      <div
                        key={l.id}
                        className="p-2.5 rounded-xl border border-[#F2DECE] bg-[#FFFDFB] flex items-center justify-between gap-2 shadow-2xs"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-black text-[#161F38] truncate" title={l.student_name}>
                              {role === 'student'
                                ? getTeacherDisplayLabel(l)
                                : getStudentDisplayLabel(l)}
                            </span>
                            <span className="text-[10px] text-[#8A95A8]">
                              • {formatLessonTime(l.scheduled_for || l.created_at)}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#6B758E] truncate">{l.topic}</p>
                        </div>

                        <div className="shrink-0 flex flex-col items-end gap-1">
                          {passed ? (
                            <>
                              <span className="inline-flex items-center gap-1 text-[10px] font-black bg-[#EAF7CF] text-[#5C8519] border border-[#D5ECA3] px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3 text-[#5C8519]" />
                                <span>Прошёл</span>
                              </span>
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#6B758E]">
                                <Clock className="w-2.5 h-2.5 text-coralAccent" />
                                <span>{formatLessonDuration(l)}</span>
                              </span>
                            </>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full">
                              <XCircle className="w-3 h-3 text-rose-600" />
                              <span>Не прошёл</span>
                            </span>
                          )}

                          {role !== 'student' && isLessonOwnedByTeacher(l, teacherName, teacherPublicId) && (
                            <button
                              type="button"
                              onClick={() => handleDeleteLesson(l.id, l.topic)}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded-md transition-colors cursor-pointer active:scale-95"
                              title="Удалить запись об уроке"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                              <span>Удалить</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* History pagination controls */}
                {totalHistoryPages > 1 && (
                  <div className="pt-2 flex items-center justify-between text-xs shrink-0 select-none border-t border-[#F8EDE1]">
                    <button
                      type="button"
                      disabled={currentHistoryPage <= 1}
                      onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#F2DECE] bg-white text-[#161F38] hover:bg-[#FFF2E6] disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-bold text-[11px] cursor-pointer shadow-2xs"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Назад</span>
                    </button>
                    <div className="flex items-center gap-1 font-bold text-[11px] text-[#6B758E]">
                      <span>Стр. {currentHistoryPage} из {totalHistoryPages}</span>
                    </div>
                    <button
                      type="button"
                      disabled={currentHistoryPage >= totalHistoryPages}
                      onClick={() => setHistoryPage((p) => Math.min(totalHistoryPages, p + 1))}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#F2DECE] bg-white text-[#161F38] hover:bg-[#FFF2E6] disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-bold text-[11px] cursor-pointer shadow-2xs"
                    >
                      <span>Вперёд</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 pt-2 border-t border-[#F8EDE1] flex items-center justify-between text-[11px] text-[#6B758E]">
        <span>Всего уроков: <strong className="text-[#161F38]">{relevantLessons.length}</strong></span>
        <button
          type="button"
          onClick={fetchLessons}
          title="Обновить список уроков"
          className="text-[10px] text-coralAccent hover:underline flex items-center gap-1 font-bold cursor-pointer"
        >
          <RefreshCw className="w-2.5 h-2.5" />
          <span>Обновить</span>
        </button>
      </div>

      {/* Zero Balance Payment Reminder Modal for Student */}
      {showZeroBalanceModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 border border-[#F2DECE] shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
              <AlertCircle className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-100/80 px-2.5 py-0.5 rounded-full border border-amber-300">
                Остаток: 0 уроков
              </span>
              <h3 className="text-lg font-black text-[#161F38]">Сначала необходимо оплатить</h3>
              <p className="text-xs text-[#6B758E] leading-relaxed">
                У вас закончились оплаченные уроки на балансе. Чтобы войти в урок, сначала нужно оплатить занятия. Пожалуйста, обратитесь к вашему преподавателю для оплаты занятий.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <a
                href="/messenger?role=student"
                className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#5C8519] hover:bg-[#4E7214] text-white text-xs font-black py-2.5 px-4 rounded-xl shadow-xs transition-colors"
              >
                <span>Написать преподавателю</span>
              </a>
              <button
                type="button"
                onClick={() => setShowZeroBalanceModal(false)}
                className="flex-1 inline-flex items-center justify-center bg-[#FFF7EE] hover:bg-[#FCEFE3] border border-[#F2DECE] text-[#161F38] text-xs font-black py-2.5 px-4 rounded-xl transition-colors cursor-pointer"
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
