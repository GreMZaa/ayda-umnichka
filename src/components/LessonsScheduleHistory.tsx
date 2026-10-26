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
  RefreshCw,
  User,
  AlertCircle
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
}

export default function LessonsScheduleHistory({
  onStartLesson,
  availableStudents = [],
  role = 'teacher',
  studentPublicId,
  studentName,
}: LessonsScheduleHistoryProps) {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');
  const [lessons, setLessons] = useState<LessonRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScheduleForm, setShowScheduleForm] = useState(false);

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
        (s) => s.fullName === formStudent || s.publicId === formStudent
      );

      const res = await fetch('/api/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: formTopic,
          student_name: selectedStudentObj?.fullName || formStudent || 'Ученик центра',
          student_public_id: selectedStudentObj?.publicId || null,
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
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#F2E0CF] shadow-xs flex flex-col justify-between h-full space-y-3.5">
      <div className="space-y-3">
        {/* Header with Title and Tabs */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-coralAccent" />
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
        <div className="flex items-center bg-[#FFF8F1] p-1 rounded-xl border border-[#F2DECE]">
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
            className="p-3 bg-[#FFF8F1] border border-[#F2DECE] rounded-xl space-y-2 animate-in fade-in"
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
                    className="w-full bg-white border border-[#EADBCC] rounded-lg px-2.5 py-1.5 text-xs text-[#161F38] focus:outline-none focus:border-coralAccent"
                  >
                    <option value="">Выберите ученика из списка</option>
                    {availableStudents.map((s) => (
                      <option key={s.publicId} value={s.fullName}>
                        {s.fullName} ({s.publicId})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formStudent}
                    onChange={(e) => setFormStudent(e.target.value)}
                    placeholder="ФИО ученика"
                    required
                    className="w-full bg-white border border-[#EADBCC] rounded-lg px-2.5 py-1.5 text-xs text-[#161F38] focus:outline-none focus:border-coralAccent"
                  />
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
                disabled={isSubmitting}
                className="text-xs font-black bg-coralAccent hover:bg-coralAccent-hover text-white px-4 py-1.5 rounded-full shadow-2xs active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Сохранение...' : 'Запланировать'}
              </button>
            </div>
          </form>
        )}

        {/* Content list */}
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
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {upcomingLessons.map((l) => {
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
                          <span className="text-xs font-black text-[#161F38] truncate">
                            {role === 'student' ? (l.teacher_name || 'Преподаватель') : l.student_name}
                          </span>
                          {isRoomActive ? (
                            <span className="inline-flex items-center gap-1.5 bg-[#EAF7CF] text-[#5C8519] border border-[#CCE8A2] px-2 py-0.5 rounded-full text-[10px] font-mono font-black animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#5C8519]" />
                              <span>Идёт урок: {formatElapsedTimer(elapsedSec)}</span>
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold bg-[#FFF2E6] text-coralAccent px-1.5 py-0.2 rounded-full shrink-0">
                              {formatLessonTime(l.scheduled_for)}
                            </span>
                          )}
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
                    <div className="pt-1 border-t border-[#F8EDE1] flex items-center justify-between text-[10px]">
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

                          <div className="flex items-center gap-1.5">
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
                              className="inline-flex items-center gap-1 font-bold text-red-600 bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded-md transition-colors cursor-pointer active:scale-95"
                              title="Отметить, что урок не состоялся"
                            >
                              <XCircle className="w-3 h-3" />
                              <span>Не прошёл</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
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
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {historyLessons.map((l) => {
                const passed = l.status === 'completed';
                return (
                  <div
                    key={l.id}
                    className="p-2.5 rounded-xl border border-[#F2DECE] bg-[#FFFDFB] flex items-center justify-between gap-2 shadow-2xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-[#161F38] truncate">
                          {l.student_name}
                        </span>
                        <span className="text-[10px] text-[#8A95A8]">
                          • {formatLessonTime(l.scheduled_for || l.created_at)}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#6B758E] truncate">{l.topic}</p>
                    </div>

                    <div className="shrink-0 flex flex-col items-end gap-0.5">
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
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* Footer */}
      <div className="pt-2 border-t border-[#F8EDE1] flex items-center justify-between text-[11px] text-[#6B758E]">
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
