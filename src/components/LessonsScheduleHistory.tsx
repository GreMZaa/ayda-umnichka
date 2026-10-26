'use client';

import React, { useState, useEffect } from 'react';
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
  Trash2
} from 'lucide-react';

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
}

export default function LessonsScheduleHistory({
  onStartLesson,
  availableStudents = [],
  role = 'teacher',
  studentPublicId,
  studentName,
  teacherName,
}: LessonsScheduleHistoryProps) {
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

  const formatElapsedTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs} мин`;
  };

  // Form states
  const [formStudent, setFormStudent] = useState('');
  const [formTopic, setFormTopic] = useState('Индивидуальное занятие: Логопедия');
  const [formDateTime, setFormDateTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchLessons = async () => {
    try {
      setLoading(true);
      const url = role === 'student' && studentPublicId
        ? `/api/lessons?studentPublicId=${encodeURIComponent(studentPublicId)}`
        : '/api/lessons';
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
  }, [studentPublicId, role]);

  const handleCreateScheduledLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDateTime) return;

    try {
      setIsSubmitting(true);
      const selectedStudentObj = availableStudents.find(
        (s) => s.publicId === formStudent || s.fullName === formStudent
      );

      const res = await fetch('/api/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: formTopic,
          student_name: selectedStudentObj?.fullName || formStudent || 'Ученик центра',
          student_public_id: selectedStudentObj?.publicId || (formStudent.startsWith('id') ? formStudent : null),
          teacher_name: teacherName || 'Преподаватель',
          scheduled_for: formDateTime,
          status: 'pending',
          duration_minutes: 45,
        }),
      });

      if (res.ok) {
        setShowScheduleForm(false);
        setFormDateTime('');
        setFormTopic('Индивидуальное занятие: Логопедия');
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
      }
    } catch (err) {
      console.warn('Error updating lesson status:', err);
    }
  };

  const handleDeleteLesson = async (lessonId: string, topic?: string) => {
    if (role === 'student') return;
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

    const today = new Date();
    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    const time = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `Сегодня, ${time}`;

    const dateFormatted = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
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
    <div className="bg-white rounded-3xl p-4 sm:p-5 border-t-4 border-t-coralAccent border-x border-b border-[#F0DCCD] shadow-xs space-y-3.5 hover:shadow-sm transition-shadow">
      <div className="space-y-3">
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
              onClick={() => setShowScheduleForm(!showScheduleForm)}
              className="inline-flex items-center gap-1 text-[11px] font-black bg-[#FFF2E6] hover:bg-[#FFE3CC] text-coralAccent border border-[#FCDDC7] px-2.5 py-1 rounded-full transition-colors duration-140 cursor-pointer active:scale-95 shrink-0"
            >
              <Plus className="w-3 h-3" />
              <span>{showScheduleForm ? 'Отмена' : 'Запланировать'}</span>
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

        {/* Schedule Form */}
        {showScheduleForm && (
          <form
            onSubmit={handleCreateScheduledLesson}
            className="shrink-0 p-3 bg-[#FFF8F1] border border-[#F2DECE] rounded-xl space-y-2 animate-in fade-in"
          >
            <div className="text-[11px] font-black text-[#161F38]">
              Запланировать онлайн-урок:
            </div>

            <div className="space-y-1.5">
              <div>
                <label className="block text-[10px] font-bold text-[#6B758E] mb-0.5">
                  Ученик:
                </label>
                {availableStudents.length > 0 ? (
                  <select
                    value={formStudent}
                    onChange={(e) => setFormStudent(e.target.value)}
                    required
                    className="w-full bg-white border border-[#EADBCC] rounded-lg px-2.5 py-1.5 text-xs text-[#161F38] focus:outline-none focus:border-coralAccent"
                  >
                    <option value="">Выберите ученика из списка</option>
                    {availableStudents.map((s) => (
                      <option key={s.publicId || s.fullName} value={s.publicId || s.fullName}>
                        {s.fullName}{s.publicId ? ` (${s.publicId})` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-2.5 rounded-lg bg-[#FFF2E2] border border-[#FAD6B5] text-xs text-[#9B5115] space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-[#E26928]" />
                      <span>Нет закрепленных учеников</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      Чтобы запланировать онлайн-урок, сначала прикрепите ученика в блоке «Закрепленные ученики» справа.
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#6B758E] mb-0.5">
                  Тема урока:
                </label>
                <input
                  type="text"
                  value={formTopic}
                  onChange={(e) => setFormTopic(e.target.value)}
                  placeholder="Тема урока"
                  required
                  className="w-full bg-white border border-[#EADBCC] rounded-lg px-2.5 py-1.5 text-xs text-[#161F38] focus:outline-none focus:border-coralAccent"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#6B758E] mb-0.5">
                  Дата и время:
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formDateTime}
                  onChange={(e) => setFormDateTime(e.target.value)}
                  className="w-full bg-white border border-[#EADBCC] rounded-lg px-2.5 py-1.5 text-xs text-[#161F38] focus:outline-none focus:border-coralAccent"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowScheduleForm(false)}
                className="text-xs font-bold text-[#8A95A8] hover:text-[#161F38] px-3 py-1"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={isSubmitting || availableStudents.length === 0 || !formStudent}
                className="text-xs font-black bg-coralAccent hover:bg-coralAccent-hover text-white px-4 py-1.5 rounded-full shadow-2xs active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Сохранение...' : 'Запланировать'}
              </button>
            </div>
          </form>
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
                                {role === 'student' ? (l.teacher_name || 'Преподаватель') : getStudentDisplayLabel(l)}
                              </span>
                              <span className="text-[9px] font-bold bg-[#FFF2E6] text-coralAccent px-1.5 py-0.5 rounded-full shrink-0">
                                {formatLessonTime(l.scheduled_for)}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#6B758E] truncate mt-0.5">{l.topic}</p>
                          </div>

                          <a
                            href={`/room/${l.room_token}?role=${role}&topic=${encodeURIComponent(l.topic)}`}
                            className={`text-[10px] font-black ${
                              isRoomActive
                                ? 'bg-[#5C8519] hover:bg-[#4E7214] text-white shadow-xs animate-pulse'
                                : 'bg-coralAccent hover:bg-coralAccent-hover text-white'
                            } px-3 py-1 rounded-full transition-colors cursor-pointer active:scale-95 flex items-center gap-1 shrink-0`}
                          >
                            <Video className="w-3 h-3" />
                            <span>{isRoomActive ? 'Вернуться в урок' : 'Войти'}</span>
                          </a>
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
                              {role === 'student' ? (l.teacher_name || 'Преподаватель') : getStudentDisplayLabel(l)}
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

                          {role !== 'student' && (
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
        <span>Всего уроков: <strong className="text-[#161F38]">{lessons.length}</strong></span>
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
    </div>
  );
}
