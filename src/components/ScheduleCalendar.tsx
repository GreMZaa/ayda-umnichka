"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  Clock,
  Video,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  LayoutGrid,
  List,
  X,
  Check,
  CheckCircle2,
  Sparkles,
  User,
  GraduationCap,
  RotateCcw,
  BookOpen,
  Search,
  Plus,
  Lock,
  Archive,
  Loader2,
} from "lucide-react";
import { fetchWithAuth } from "@/lib/api-client";
import {
  startOfWeek,
  addDays,
  isSameDay,
  addWeeks,
  subWeeks,
  isWithinInterval,
  isBefore,
} from "date-fns";
import {
  toTolyattiDate,
  nowInTolyatti,
  formatTolyatti,
  TOLYATTI_TZ_LABEL,
  isTodayOrFutureInTolyatti,
  isTodayInTolyatti,
  getLocalToTolyattiHourDifference,
} from "@/lib/tolyatti-time";

export interface LessonItem {
  id: string;
  title: string;
  subjectId?: string;
  subjectName: string;
  subjectColor?: string;
  startTime: string;
  endTime: string;
  status: "LIVE" | "SCHEDULED" | "COMPLETED" | string;
  roomName: string;
  teacherId?: string;
  teacherName?: string;
  teacherAvatar?: string;
  studentId?: string;
  studentName?: string;
  studentAvatar?: string;
  notes?: any[];
}

interface ScheduleCalendarProps {
  role: "student" | "teacher" | "parent";
  lessons: LessonItem[];
  title?: string;
  onUpdateStatus?: (lessonId: string, status: string) => Promise<void> | void;
  onOpenReportModal?: (lesson: LessonItem) => void;
  onCreateLesson?: (date?: string, time?: string) => void;
  onExtendLesson?: (lessonId: string, minutes: number) => Promise<void> | void;
}

const TIME_SLOTS = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
  "21:00",
  "22:00",
];

const SLOT_HEIGHT = 72; // Высота каждого часового слота в пикселях

export default function ScheduleCalendar({
  role,
  lessons,
  title = "Расписание занятий",
  onUpdateStatus,
  onOpenReportModal,
  onCreateLesson,
  onExtendLesson,
}: ScheduleCalendarProps) {
  const [calendarDate, setCalendarDate] = useState<Date>(() => nowInTolyatti());
  const [selectedMobileDay, setSelectedMobileDay] = useState<Date>(() => nowInTolyatti());
  const [calendarViewMode, setCalendarViewMode] = useState<"calendar" | "list">("list");
  const [selectedStudentFilter, setSelectedStudentFilter] = useState<string>("all");

  // Состояния фильтра («Настройки»)
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [filterSubject, setFilterSubject] = useState<string>("all");
  const [showPastLessons, setShowPastLessons] = useState<boolean>(true);

  // Состояния для режима «Списком» (ACTIVE = актуальные уроки; прошедшие уроки не высвечиваются здесь и уходят в ARCHIVE)
  const [listFilter, setListFilter] = useState<"ACTIVE" | "ARCHIVE" | "ALL">("ACTIVE");
  const [listSearchQuery, setListSearchQuery] = useState("");
  const [listScope, setListScope] = useState<"all" | "week">("all");
  const [extendingLessonId, setExtendingLessonId] = useState<string | null>(null);

  // Текущее время по Тольятти для красной линии и закрытия комнат
  const [currentTime, setCurrentTime] = useState<Date>(() => nowInTolyatti());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(nowInTolyatti()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Продление урока на 30 минут (для учителя)
  const handleExtend = async (lessonId: string, minutes = 30) => {
    try {
      setExtendingLessonId(lessonId);
      if (onExtendLesson) {
        await onExtendLesson(lessonId, minutes);
      } else {
        await fetchWithAuth(`/api/lessons/${lessonId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ extendMinutes: minutes }),
        });
        window.location.reload();
      }
    } catch (err) {
      console.error("Ошибка продления урока:", err);
      alert("Не удалось продлить урок. Пожалуйста, попробуйте еще раз.");
    } finally {
      setExtendingLessonId(null);
    }
  };

  // Недельный интервал
  const weekStart = useMemo(
    () => startOfWeek(calendarDate, { weekStartsOn: 1 }), // Понедельник
    [calendarDate]
  );
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]); // Воскресенье
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  // Список доступных предметов из уроков
  const availableSubjects = useMemo(() => {
    const set = new Set<string>();
    lessons.forEach((l) => {
      if (l.subjectName) set.add(l.subjectName);
    });
    return Array.from(set);
  }, [lessons]);

  // Список уникальных учеников (детей) из уроков
  const availableStudents = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    lessons.forEach((l) => {
      const sId = l.studentId || l.studentName;
      if (sId && l.studentName) {
        map.set(sId, { id: sId, name: l.studentName });
      }
    });
    return Array.from(map.values());
  }, [lessons]);

  // Проверка активности фильтров
  const hasActiveFilters = filterSubject !== "all" || !showPastLessons;

  // Сброс фильтров
  const handleResetFilters = () => {
    setFilterSubject("all");
    setShowPastLessons(true);
  };

  // Фильтрация уроков
  const filteredLessons = useMemo(() => {
    return lessons.filter((lesson) => {
      // Фильтр по предмету
      if (filterSubject !== "all" && lesson.subjectName !== filterSubject) {
        return false;
      }
      // Фильтр прошедших уроков
      if (!showPastLessons && lesson.status === "COMPLETED") {
        return false;
      }
      return true;
    });
  }, [lessons, filterSubject, showPastLessons]);

  // Уроки на выбранную неделю (по настенному времени Тольятти)
  const weekLessons = useMemo(() => {
    return filteredLessons.filter((l) => {
      const lDate = toTolyattiDate(l.startTime);
      const start = new Date(weekStart);
      start.setHours(0, 0, 0, 0);
      const end = new Date(weekEnd);
      end.setHours(23, 59, 59, 999);
      return isWithinInterval(lDate, { start, end });
    });
  }, [filteredLessons, weekStart, weekEnd]);

  // Проверка: завершён ли урок или истекло ли его запланированное время
  const isLessonArchived = (lesson: LessonItem) => {
    if (lesson.status === "COMPLETED") return true;
    if (lesson.status === "LIVE") return false; // Идущий сейчас урок никогда не закрыт и не в архиве
    
    // Если урок назначен на сегодня по Тольятти или на будущее — он ВСЕГДА АКТИВЕН!
    // Ни учитель, ни ученик не должны терять урок в течение дня из-за сдвига поясов
    if (lesson.startTime && isTodayOrFutureInTolyatti(lesson.startTime)) {
      return false;
    }

    if (!lesson.endTime) return false;
    const endMs = new Date(lesson.endTime).getTime();
    if (isNaN(endMs)) return false;
    // Сравниваем физическое время Date.now() (UTC ms) с реальным временем окончания урока.
    // Даём буфер 4 часа после окончания, чтобы комната и карточка не закрывались преждевременно
    return Date.now() > endMs + 4 * 60 * 60 * 1000;
  };

  const countActive = useMemo(
    () => filteredLessons.filter((l) => !isLessonArchived(l)).length,
    [filteredLessons, currentTime]
  );
  const countArchived = useMemo(
    () => filteredLessons.filter((l) => isLessonArchived(l)).length,
    [filteredLessons, currentTime]
  );

  // Уроки для режима «Списком» с поиском и фильтрами
  const listLessons = useMemo(() => {
    return filteredLessons
      .filter((lesson) => {
        // Фильтр по ученику (ребенку)
        if (selectedStudentFilter !== "all") {
          const sKey = lesson.studentId || lesson.studentName;
          if (sKey !== selectedStudentFilter && lesson.studentName !== selectedStudentFilter) {
            return false;
          }
        }

        // Если урок прошёл, он уходит в архив и не высвечивается в "Все уроки"
        const isArch = isLessonArchived(lesson);
        if (listFilter === "ACTIVE" && isArch) return false;
        if (listFilter === "ARCHIVE" && !isArch) return false;

        // Фильтр по диапазону дат
        if (listScope === "week") {
          const lDate = toTolyattiDate(lesson.startTime);
          const start = new Date(weekStart);
          start.setHours(0, 0, 0, 0);
          const end = new Date(weekEnd);
          end.setHours(23, 59, 59, 999);
          if (!isWithinInterval(lDate, { start, end })) return false;
        }

        // Поиск
        if (listSearchQuery.trim()) {
          const q = listSearchQuery.toLowerCase();
          const matchTitle = (lesson.title || "").toLowerCase().includes(q);
          const matchSubject = (lesson.subjectName || "").toLowerCase().includes(q);
          const matchStudent = (lesson.studentName || "").toLowerCase().includes(q);
          const matchTeacher = (lesson.teacherName || "").toLowerCase().includes(q);
          if (!matchTitle && !matchSubject && !matchStudent && !matchTeacher) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (listFilter === "ARCHIVE") {
          return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
        }
        return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
      });
  }, [filteredLessons, selectedStudentFilter, listFilter, listScope, weekStart, weekEnd, listSearchQuery, currentTime]);

  // Расчёт позиции красной полосы текущего времени по Тольятти
  const isCurrentWeek = isWithinInterval(nowInTolyatti(), {
    start: new Date(new Date(weekStart).setHours(0, 0, 0, 0)),
    end: new Date(new Date(weekEnd).setHours(23, 59, 59, 999)),
  });

  const redLineOffset = useMemo(() => {
    if (!isCurrentWeek) return null;
    const now = currentTime;
    const hour = now.getHours();
    const min = now.getMinutes();
    const startHour = 8; // 08:00
    if (hour < startHour || hour > 22) return null;
    const totalMinutesFromStart = (hour - startHour) * 60 + min;
    return (totalMinutesFromStart / 60) * SLOT_HEIGHT;
  }, [currentTime, isCurrentWeek]);

  // Гарантируем, что календарь всегда сразу открывается на сегодняшний день (по Тольятти)
  useEffect(() => {
    const today = nowInTolyatti();
    setCalendarDate(today);
    setSelectedMobileDay(today);
  }, []);

  const handleGoPrevWeek = () => {
    const newDate = subWeeks(calendarDate, 1);
    setCalendarDate(newDate);
    const today = nowInTolyatti();
    const newWeekStart = startOfWeek(newDate, { weekStartsOn: 1 });
    const newWeekEnd = addDays(newWeekStart, 6);
    if (isWithinInterval(today, { start: newWeekStart, end: newWeekEnd })) {
      setSelectedMobileDay(today);
    } else {
      setSelectedMobileDay(newWeekStart);
    }
  };

  const handleGoNextWeek = () => {
    const newDate = addWeeks(calendarDate, 1);
    setCalendarDate(newDate);
    const today = nowInTolyatti();
    const newWeekStart = startOfWeek(newDate, { weekStartsOn: 1 });
    const newWeekEnd = addDays(newWeekStart, 6);
    if (isWithinInterval(today, { start: newWeekStart, end: newWeekEnd })) {
      setSelectedMobileDay(today);
    } else {
      setSelectedMobileDay(newWeekStart);
    }
  };

  const handleGoToday = () => {
    const today = nowInTolyatti();
    setCalendarDate(today);
    setSelectedMobileDay(today);
  };

  return (
    <div className="space-y-4">
      {/* 1. ПАНЕЛЬ УПРАВЛЕНИЯ КАЛЕНДАРЁМ (ДЛЯ УЧИТЕЛЯ И УЧЕНИКА СКРЫТА, ТАК КАК ОТОБРАЖАЕТСЯ ЧИСТЫЙ СПИСОК УРОКОВ) */}
      {role !== "teacher" && role !== "student" && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Кнопка настроек и переключатель вида */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-start">
          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer relative ${
              hasActiveFilters
                ? "bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
            title="Настройки отображения и фильтры расписания"
          >
            <SlidersHorizontal className={`w-3.5 h-3.5 ${hasActiveFilters ? "text-blue-600" : "text-slate-500"}`} />
            <span>Настроить</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white animate-pulse" />
            )}
          </button>

          <div className="flex p-0.5 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setCalendarViewMode("calendar")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                calendarViewMode === "calendar"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Сетка</span>
            </button>
            <button
              type="button"
              onClick={() => setCalendarViewMode("list")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                calendarViewMode === "list"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Списком</span>
            </button>
          </div>
        </div>

        {/* Навигатор по неделям (для сетки или если включён фильтр по неделе) */}
        {(calendarViewMode === "calendar" || listScope === "week") ? (
          <div className="flex items-center gap-1.5 sm:gap-2 w-full md:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-1 sm:gap-1.5">
              <button
                type="button"
                onClick={handleGoPrevWeek}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition cursor-pointer active:scale-95"
                title="Предыдущая неделя"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800">
                <CalendarIcon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>
                  {formatTolyatti(weekStart, "d")} – {formatTolyatti(weekEnd, "d MMM")}
                  <span className="hidden sm:inline"> {formatTolyatti(weekEnd, "yyyy")}</span>
                </span>
              </div>

              <button
                type="button"
                onClick={handleGoNextWeek}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition cursor-pointer active:scale-95"
                title="Следующая неделя"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleGoToday}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-blue-600 hover:bg-blue-50 transition cursor-pointer"
            >
              Сегодня
            </button>

            <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-sky-50 border border-sky-200 text-sky-800 text-[11px] font-semibold" title="Все уроки отображаются по часовому поясу Тольятти (UTC+4)">
              <Clock className="w-3 h-3 text-[#2481cc]" />
              <span>Тольятти (UTC+4)</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 w-full md:w-auto justify-between sm:justify-end">
            <span className="text-xs font-semibold text-slate-500">
              Показано уроков: <strong className="text-slate-800">{listLessons.length}</strong>
            </span>
            <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-sky-50 border border-sky-200 text-sky-800 text-[11px] font-semibold" title="Все уроки отображаются по часовому поясу Тольятти (UTC+4)">
              <Clock className="w-3 h-3 text-[#2481cc]" />
              <span>Тольятти (UTC+4)</span>
            </div>

          </div>
        )}
      </div>
      )}

      {/* 2. РЕЖИМ 1: КАЛЕНДАРЬ */}
      {calendarViewMode === "calendar" && (
        <>
          {/* А. МОБИЛЬНЫЙ ВИД: ДЕНЬ ЗА ДНЕМ (md:hidden) */}
          <div className="md:hidden space-y-3">
            {/* Горизонтальный селектор дней недели */}
            <div className="bg-white p-2 rounded-2xl border border-slate-200/90 shadow-2xs">
              <div className="grid grid-cols-7 gap-1">
                {weekDays.map((day, idx) => {
                  const isSelected = isSameDay(day, selectedMobileDay);
                  const isToday = isSameDay(day, nowInTolyatti());
                  const dayLessons = filteredLessons.filter((l) => isSameDay(toTolyattiDate(l.startTime), day));

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedMobileDay(day)}
                      className={`py-2 px-1 rounded-xl flex flex-col items-center gap-0.5 transition cursor-pointer relative ${
                        isSelected
                          ? "bg-blue-600 text-white shadow-sm shadow-blue-500/25 font-black"
                          : isToday
                          ? "bg-blue-50 text-blue-700 font-bold border border-blue-200"
                          : "hover:bg-slate-50 text-slate-700 font-medium"
                      }`}
                    >
                      <span className="text-[10px] uppercase font-bold tracking-tight">
                        {formatTolyatti(day, "EE")}
                      </span>
                      <span className="text-sm font-extrabold leading-none">
                        {formatTolyatti(day, "d")}
                      </span>
                      {isToday && (
                        <span className={`text-[8px] uppercase tracking-tighter font-black leading-none ${
                          isSelected ? "text-blue-100" : "text-blue-600"
                        }`}>
                          сегодня
                        </span>
                      )}
                      <div className="h-1.5 flex items-center justify-center">
                        {dayLessons.length > 0 && (
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isSelected ? "bg-amber-300" : "bg-blue-600"
                            }`}
                          />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Заголовок выбранного дня */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-slate-900 capitalize">
                  {formatTolyatti(selectedMobileDay, "EEEE, d MMMM")}
                </span>
                {isSameDay(selectedMobileDay, nowInTolyatti()) ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                    Сегодня
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleGoToday}
                    className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 transition cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    <span>К сегодняшнему дню</span>
                  </button>
                )}
              </div>
              <span className="text-xs font-bold text-slate-500">
                {filteredLessons.filter((l) => isSameDay(toTolyattiDate(l.startTime), selectedMobileDay)).length} занятий (Тольятти)
              </span>
            </div>

            {/* Список уроков на выбранный день */}
            {(() => {
              const dayLessons = filteredLessons
                .filter((l) => isSameDay(toTolyattiDate(l.startTime), selectedMobileDay))
                .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

              if (dayLessons.length === 0) {
                return (
                  <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-2">
                    <div className="text-3xl">☕</div>
                    <h4 className="font-bold text-sm text-slate-800">Занятий нет</h4>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto">
                      На этот день уроков не запланировано. Отличное время для отдыха или повторения материала!
                    </p>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {dayLessons.map((l) => {
                    const isLive = l.status === "LIVE";
                    const isCompleted = l.status === "COMPLETED";

                    return (
                      <div
                        key={l.id}
                        className={`bg-white rounded-3xl p-5 border shadow-xs space-y-3.5 transition ${
                          isLive
                            ? "border-blue-600 ring-2 ring-blue-500/20"
                            : "border-slate-200"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className="px-2.5 py-0.5 rounded-full text-[11px] font-bold text-white"
                                style={{ backgroundColor: l.subjectColor || "#2563eb" }}
                              >
                                {l.subjectName}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isLive
                                    ? "bg-red-100 text-red-700 animate-pulse"
                                    : isCompleted
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                {isLive ? "Идёт сейчас" : isCompleted ? "Завершён" : "Запланирован"}
                              </span>
                            </div>
                            <h4 className="font-extrabold text-slate-900 text-sm leading-snug">
                              {l.title}
                            </h4>
                          </div>
                        </div>

                        <div className="bg-slate-50 rounded-2xl p-3 space-y-1 text-xs text-slate-600">
                          <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-bold text-slate-800">
                              {formatTolyatti(l.startTime, "HH:mm")} – {formatTolyatti(l.endTime, "HH:mm")}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {role === "teacher" ? "Ученик: " : "Преподаватель: "}
                              <strong className="text-slate-800">
                                {role === "teacher" ? l.studentName : l.teacherName}
                              </strong>
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {isLessonArchived(l) ? (
                            <div className="flex items-center gap-2 flex-1 min-w-[120px] flex-wrap">
                              {role === "teacher" && (
                                <button
                                  type="button"
                                  onClick={() => handleExtend(l.id, 30)}
                                  disabled={extendingLessonId === l.id}
                                  className="py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-amber-500/20 cursor-pointer disabled:opacity-50"
                                  title="Продлить урок на 30 минут"
                                >
                                  {extendingLessonId === l.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Clock className="w-3.5 h-3.5" />
                                  )}
                                  <span>+30 мин</span>
                                </button>
                              )}
                              <div className="py-2.5 px-3 rounded-xl bg-slate-100 text-slate-400 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-200 cursor-not-allowed">
                                <Lock className="w-3.5 h-3.5" />
                                <span>Комната закрыта</span>
                              </div>
                            </div>
                          ) : (
                            <Link
                              href={`/room/${l.id || l.roomName}?role=${role}`}
                              className="flex-1 min-w-[120px] py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-blue-500/20 active:scale-95"
                            >
                              <Video className="w-3.5 h-3.5" />
                              <span>Войти в видеокласс</span>
                            </Link>
                          )}

                          {role === "teacher" && onUpdateStatus && (
                            <>
                              {l.status === "SCHEDULED" && (
                                <button
                                  type="button"
                                  onClick={() => onUpdateStatus(l.id, "LIVE")}
                                  className="px-3 py-2.5 rounded-xl bg-blue-50 text-blue-700 font-bold text-xs border border-blue-200"
                                >
                                  Начать
                                </button>
                              )}
                              {l.status === "LIVE" && (
                                <button
                                  type="button"
                                  onClick={() => onUpdateStatus(l.id, "COMPLETED")}
                                  className="px-3 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200"
                                >
                                  Завершить
                                </button>
                              )}
                              {onOpenReportModal && (
                                <button
                                  type="button"
                                  onClick={() => onOpenReportModal(l)}
                                  className={`px-3 py-2 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 ${
                                    l.notes && l.notes.length > 0
                                      ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                  }`}
                                  title={l.notes && l.notes.length > 0 ? "Отчёт отправлен. Нажмите для редактирования" : "Заполнить отчёт"}
                                >
                                  {l.notes && l.notes.length > 0 ? (
                                    <>
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>Отчёт ✓</span>
                                    </>
                                  ) : (
                                    <span>Отчёт</span>
                                  )}
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Б. ДЕСКТОПНЫЙ ВИД: СЕТКА 7 ДНЕЙ (hidden md:block) */}
          <div className="hidden md:block bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
            <div className="min-w-[760px] lg:min-w-0">
              {/* Заголовки дней недели (7 колонок + 1 время) */}
              <div className="grid grid-cols-8 border-b border-slate-200 bg-slate-50/70 text-center">
                <div className="p-3 border-r border-slate-200 text-[11px] font-bold text-slate-400 flex items-center justify-center">
                  ТЛТ (UTC+4)
                </div>
                {weekDays.map((day, idx) => {
                  const isToday = isSameDay(day, nowInTolyatti());
                  return (
                    <div
                      key={idx}
                      className={`p-2.5 border-r border-slate-200 last:border-r-0 text-xs font-bold transition ${
                        isToday ? "bg-blue-50/80" : ""
                      }`}
                    >
                      <div
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition ${
                          isToday
                            ? "bg-blue-600 text-white shadow-xs font-black"
                            : "text-slate-700"
                        }`}
                      >
                        <span>{formatTolyatti(day, "EE")} · {formatTolyatti(day, "d MMM")}</span>
                        {isToday && (
                          <span className="text-[9px] uppercase px-1.5 py-0.5 bg-white text-blue-700 rounded font-black tracking-wider shadow-2xs">
                            Сегодня
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Сетка времени и уроков */}
              <div className="relative divide-y divide-slate-100">
                {/* Красная линия текущего времени (только для текущей недели) */}
                {redLineOffset !== null && (
                  <div
                    className="absolute left-0 right-0 z-20 pointer-events-none flex items-center transition-all duration-300"
                    style={{ top: `${redLineOffset}px` }}
                  >
                    <div className="w-[12.5%] text-right pr-2">
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-black bg-rose-500 text-white shadow-xs">
                        {formatTolyatti(currentTime, "HH:mm")}
                      </span>
                    </div>
                    <div className="flex-1 h-[2px] bg-rose-500 shadow-xs" />
                  </div>
                )}

                {TIME_SLOTS.map((timeStr, slotIdx) => {
                  const slotHour = parseInt(timeStr.split(":")[0], 10);

                  return (
                    <div
                      key={slotIdx}
                      className="grid grid-cols-8"
                      style={{ minHeight: `${SLOT_HEIGHT}px` }}
                    >
                      {/* Метка времени слева */}
                      <div className="p-2 border-r border-slate-200/70 text-right pr-3 text-xs font-bold text-slate-400 select-none flex items-start justify-end pt-2">
                        {timeStr}
                      </div>

                      {/* 7 колонок для уроков */}
                      {weekDays.map((day, dayIdx) => {
                        const dayLessons = filteredLessons.filter((l) => {
                          const lDate = toTolyattiDate(l.startTime);
                          return isSameDay(lDate, day) && lDate.getHours() === slotHour;
                        });

                        const isToday = isSameDay(day, nowInTolyatti());

                        return (
                          <div
                            key={dayIdx}
                            onClick={() => {
                              if (dayLessons.length === 0 && role === "teacher" && onCreateLesson) {
                                onCreateLesson(formatTolyatti(day, "yyyy-MM-dd"), timeStr);
                              }
                            }}
                            className={`p-1.5 border-r border-slate-100 last:border-r-0 relative transition flex flex-col gap-1.5 ${
                              isToday ? "bg-blue-50/30 ring-1 ring-inset ring-blue-100/70" : ""
                            } ${
                              dayLessons.length === 0 && role === "teacher" && onCreateLesson
                                ? "hover:bg-blue-50/50 cursor-pointer group"
                                : "hover:bg-slate-50/50"
                            }`}
                            title={
                              dayLessons.length === 0 && role === "teacher" && onCreateLesson
                                ? `Нажмите, чтобы создать урок на ${formatTolyatti(day, "d MMMM")} в ${timeStr} (по Тольятти)`
                                : undefined
                            }
                          >
                            {dayLessons.length === 0 && role === "teacher" && onCreateLesson && (
                              <div className="hidden group-hover:flex items-center justify-center h-full min-h-[44px] text-[11px] text-[#2481cc] font-extrabold opacity-75 select-none">
                                + {timeStr}
                              </div>
                            )}
                            {dayLessons.map((l) => {
                              const isLive = l.status === "LIVE";
                              const isCompleted = l.status === "COMPLETED";

                              return (
                                <div
                                  key={l.id}
                                  className={`p-2.5 rounded-2xl text-xs space-y-1.5 transition shadow-xs hover:shadow-md ${
                                    isLive
                                      ? "bg-gradient-to-br from-emerald-600 to-teal-700 text-white ring-2 ring-emerald-400/50"
                                      : isCompleted
                                      ? "bg-slate-100 text-slate-700 border border-slate-200"
                                      : "bg-blue-600 text-white"
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <span
                                      className={`text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                        isLive
                                          ? "bg-white/20 text-white"
                                          : isCompleted
                                          ? "bg-slate-200 text-slate-700"
                                          : "bg-blue-700/80 text-blue-100"
                                      }`}
                                    >
                                      {l.subjectName}
                                    </span>

                                    {isLive && (
                                      <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
                                    )}
                                  </div>

                                  <div className="font-bold leading-tight line-clamp-2">
                                    {l.title}
                                  </div>

                                  <div
                                    className={`text-[10px] line-clamp-1 ${
                                      isCompleted ? "text-slate-500" : "text-white/80"
                                    }`}
                                  >
                                    {role === "teacher"
                                      ? `Ученик: ${l.studentName || "Ученик"}`
                                      : `Учитель: ${l.teacherName || "Репетитор"}`}
                                  </div>

                                  <div
                                    className={`flex items-center justify-between pt-1 border-t text-[10px] ${
                                      isLive
                                        ? "border-emerald-500/50"
                                        : isCompleted
                                        ? "border-slate-200"
                                        : "border-blue-500/60"
                                    }`}
                                  >
                                    <span className="font-medium">
                                      {formatTolyatti(l.startTime, "HH:mm")}
                                    </span>

                                    {/* Кнопки действий по роли */}
                                    {isLessonArchived(l) ? (
                                      role === "teacher" ? (
                                        <div className="flex items-center gap-1">
                                          <button
                                            type="button"
                                            onClick={() => handleExtend(l.id, 30)}
                                            disabled={extendingLessonId === l.id}
                                            className="px-1.5 py-0.5 rounded bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] cursor-pointer"
                                            title="Продлить урок на 30 мин"
                                          >
                                            {extendingLessonId === l.id ? "..." : "+30м"}
                                          </button>
                                          <span className="text-slate-400 font-bold text-[10px] flex items-center gap-0.5" title="Комната закрыта">
                                            <Lock className="w-2.5 h-2.5" /> Закрыт
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-slate-400 font-bold text-[10px] flex items-center gap-0.5" title="Комната закрыта">
                                          <Lock className="w-2.5 h-2.5" /> Закрыт
                                        </span>
                                      )
                                    ) : isLive ? (
                                      <Link
                                        href={`/room/${l.id || l.roomName}?role=${role}`}
                                        className="px-2 py-0.5 rounded-lg bg-white text-emerald-800 font-extrabold hover:bg-emerald-50 shadow-xs"
                                      >
                                        Войти
                                      </Link>
                                    ) : isCompleted ? (
                                      role === "teacher" && onOpenReportModal ? (
                                        l.notes && l.notes.length > 0 ? (
                                          <button
                                            type="button"
                                            onClick={() => onOpenReportModal(l)}
                                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/80 font-bold text-[10px] transition shadow-2xs"
                                            title="Отчёт сдан родителям. Нажмите для редактирования"
                                          >
                                            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                            <span>Отчёт ✓</span>
                                          </button>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => onOpenReportModal(l)}
                                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-bold text-[10px] transition shadow-2xs"
                                            title="Заполнить отчёт по уроку для родителей"
                                          >
                                            <span>Отчёт</span>
                                          </button>
                                        )
                                      ) : (
                                        <span className="text-emerald-700 font-bold">✓ Проведён</span>
                                      )
                                    ) : (
                                      <div className="flex items-center gap-1">
                                        {role === "teacher" && onUpdateStatus && (
                                          <button
                                            type="button"
                                            onClick={() => onUpdateStatus(l.id, "LIVE")}
                                            className="px-1.5 py-0.5 rounded bg-blue-700 text-white font-bold hover:bg-blue-800"
                                            title="Открыть видеокласс"
                                          >
                                            Старт
                                          </button>
                                        )}
                                        <Link
                                          href={`/room/${l.id || l.roomName}?role=${role}`}
                                          className="px-2 py-0.5 rounded-lg bg-white text-blue-700 font-bold hover:bg-blue-50"
                                        >
                                          Класс
                                        </Link>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Пустое состояние для недели */}
          {weekLessons.length === 0 && (
            <div className="p-10 text-center space-y-3 bg-gradient-to-b from-transparent to-slate-50/80 border-t border-slate-100">
              <div className="text-4xl">🗓️</div>
              <h3 className="text-lg sm:text-xl font-extrabold text-slate-900">
                В расписании на эту неделю нет занятий
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                {hasActiveFilters
                  ? "Попробуйте сбросить фильтры или переключить неделю."
                  : "Выберите другую неделю в переключателе сверху или свяжитесь с куратором."}
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Сбросить фильтры</span>
                </button>
              )}
            </div>
          )}
        </div>
      </>
    )}

      {/* 3. РЕЖИМ 2: СПИСКОМ (ФОКСФОРД-СТИЛЬ) С ПОИСКОМ И ФИЛЬТРАМИ */}
      {calendarViewMode === "list" && (
        <div className="space-y-4">
          {/* Единая лаконичная панель фильтрации */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Статусные табы: Актуальные (сегодня и впереди) vs Все уроки vs Архив (прошедшие) */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: "ACTIVE" as const, label: "Актуальные", count: countActive },
                  { id: "ALL" as const, label: "Все уроки", count: filteredLessons.length },
                  { id: "ARCHIVE" as const, label: "Архив", count: countArchived, icon: Archive },
                ].map((f) => {
                  const Icon = f.icon;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setListFilter(f.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                        listFilter === f.id
                          ? "bg-blue-600 text-white shadow-2xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {Icon && <Icon className="w-3.5 h-3.5" />}
                      <span>{f.label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          listFilter === f.id ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {f.count}
                      </span>
                    </button>
                  );
                })}

                {/* Переключатель диапазона дат: Все даты vs Выбранная неделя */}
                <div className="flex p-0.5 bg-slate-100 rounded-xl ml-0 sm:ml-2">
                  <button
                    type="button"
                    onClick={() => setListScope("all")}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      listScope === "all" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Все даты
                  </button>
                  <button
                    type="button"
                    onClick={() => setListScope("week")}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      listScope === "week" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Неделя
                  </button>
                </div>
              </div>

              {/* Строка поиска и кнопка создания урока */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-60">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={listSearchQuery}
                    onChange={(e) => setListSearchQuery(e.target.value)}
                    placeholder="Поиск по уроку, имени..."
                    className="w-full pl-9 pr-7 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-blue-600"
                  />
                  {listSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setListSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {role === "teacher" && onCreateLesson && (
                  <button
                    type="button"
                    onClick={() => onCreateLesson()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2481cc] hover:bg-[#1f70b0] active:scale-95 text-white font-bold text-xs transition cursor-pointer shadow-xs shrink-0"
                    title="Создать новое учебное занятие"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Создать урок</span>
                    <span className="sm:hidden">Создать</span>
                  </button>
                )}
              </div>
            </div>

            {/* Фильтр по детям / ученикам (только если их несколько и не в кабинете ученика) */}
            {role !== "student" && availableStudents.length > 1 && (
              <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-slate-400 font-semibold mr-1 text-[11px] flex items-center gap-1">
                  <User className="w-3 h-3 text-blue-600" />
                  <span>Ученик:</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedStudentFilter("all")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    selectedStudentFilter === "all"
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Все ({lessons.length})
                </button>
                {availableStudents.map((st) => {
                  const count = lessons.filter(
                    (l) => (l.studentId || l.studentName) === st.id || l.studentName === st.name
                  ).length;
                  const isSelected =
                    selectedStudentFilter === st.id || selectedStudentFilter === st.name;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setSelectedStudentFilter(st.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <span>{st.name}</span>
                      <span className="text-[10px] text-slate-400 font-semibold">({count})</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Список карточек уроков */}
          {listLessons.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-sm text-slate-800">
                {listSearchQuery
                  ? "По вашему запросу ничего не найдено"
                  : listFilter === "ARCHIVE"
                  ? "В архиве пока нет прошедших занятий"
                  : "Нет актуальных занятий по выбранным условиям"}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {listSearchQuery
                  ? "Попробуйте изменить поисковый запрос или сбросить фильтры."
                  : listFilter === "ARCHIVE"
                  ? "Все прошедшие и завершённые занятия автоматически сохраняются здесь."
                  : listScope === "week"
                  ? "На выбранной неделе уроков нет. Переключитесь на «Все даты» или выберите другую неделю."
                  : "Запланируйте первое занятие, нажав кнопку «Создать урок»."}
              </p>
              {listSearchQuery ? (
                <button
                  type="button"
                  onClick={() => setListSearchQuery("")}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                >
                  Сбросить поиск
                </button>
              ) : role === "teacher" && onCreateLesson ? (
                <button
                  type="button"
                  onClick={() => onCreateLesson()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Создать новый урок</span>
                </button>
              ) : null}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {listLessons.map((lesson) => {
                const isLive = lesson.status === "LIVE";
                const isCompleted = lesson.status === "COMPLETED";

                return (
                  <div
                    key={lesson.id}
                    className={`bg-white rounded-3xl p-5 border shadow-xs transition flex flex-col justify-between space-y-4 ${
                      isLive
                        ? "border-blue-600 ring-2 ring-blue-500/20"
                        : "border-slate-200 hover:border-blue-300"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span
                          className="px-2.5 py-0.5 rounded-full text-[11px] font-bold text-white"
                          style={{ backgroundColor: lesson.subjectColor || "#2563eb" }}
                        >
                          {lesson.subjectName}
                        </span>

                        <span
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                            isLive
                              ? "bg-red-100 text-red-700 animate-pulse"
                              : isCompleted
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {isLive ? "Идёт сейчас" : isCompleted ? "Завершён" : "Запланирован"}
                        </span>
                      </div>

                      <h4 className="font-extrabold text-slate-900 text-sm sm:text-base leading-snug">
                        {lesson.title}
                      </h4>

                      {/* Дата и время */}
                      <div className="mt-2.5 flex items-center gap-2 text-xs text-slate-600">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          {formatTolyatti(lesson.startTime, "d MMMM (EE), HH:mm")} – {formatTolyatti(lesson.endTime, "HH:mm")}
                        </span>
                      </div>

                      {/* Карточка ученика / ребенка (понятно для кого) */}
                      <div className="mt-3 p-2.5 rounded-2xl bg-blue-50/70 border border-blue-200/80 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                            {(lesson.studentName || "У").charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="text-[10px] uppercase font-bold text-blue-700 tracking-wider leading-none">
                              {role === "teacher" ? "Ученик" : "Преподаватель"}
                            </div>
                            <div className="text-xs sm:text-sm font-extrabold text-slate-900 truncate mt-0.5">
                              {role === "teacher" ? (lesson.studentName || "Ученик") : (lesson.teacherName || "Репетитор")}
                            </div>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-white text-blue-800 text-[10px] font-bold border border-blue-200 shadow-2xs shrink-0">
                          Индивидуально
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {role === "teacher" && onUpdateStatus && (
                          <>
                            {lesson.status === "SCHEDULED" && (
                              <button
                                type="button"
                                onClick={() => onUpdateStatus(lesson.id, "LIVE")}
                                className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 font-bold hover:bg-blue-100 transition cursor-pointer"
                              >
                                Начать урок
                              </button>
                            )}
                            {lesson.status === "LIVE" && (
                              <button
                                type="button"
                                onClick={() => onUpdateStatus(lesson.id, "COMPLETED")}
                                className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 font-bold hover:bg-emerald-100 transition cursor-pointer"
                              >
                                Завершить
                              </button>
                            )}
                          </>
                        )}

                        {role === "teacher" && onOpenReportModal && (
                          <button
                            type="button"
                            onClick={() => onOpenReportModal(lesson)}
                            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
                              lesson.notes && lesson.notes.length > 0
                                ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            }`}
                            title={lesson.notes && lesson.notes.length > 0 ? "Отчёт сдан родителям. Нажмите для редактирования" : "Заполнить отчёт по уроку"}
                          >
                            {lesson.notes && lesson.notes.length > 0 ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Отчёт ✓</span>
                              </>
                            ) : (
                              <span>Отчёт</span>
                            )}
                          </button>
                        )}
                      </div>

                      {isLessonArchived(lesson) ? (
                        <div className="flex items-center gap-2">
                          {role === "teacher" && (
                            <button
                              type="button"
                              onClick={() => handleExtend(lesson.id, 30)}
                              disabled={extendingLessonId === lesson.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs shadow-xs cursor-pointer disabled:opacity-50"
                              title="Продлить урок на 30 минут"
                            >
                              {extendingLessonId === lesson.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Clock className="w-3.5 h-3.5" />
                              )}
                              <span>+30 мин</span>
                            </button>
                          )}
                          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed">
                            <Lock className="w-3.5 h-3.5" />
                            <span>Комната закрыта</span>
                          </div>
                        </div>
                      ) : (
                        <Link
                          href={`/room/${lesson.id || lesson.roomName}?role=${role}`}
                          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-2xs ${
                            isLive
                              ? "bg-red-600 hover:bg-red-700 text-white"
                              : "bg-blue-600 hover:bg-blue-700 text-white"
                          }`}
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>{role === "parent" ? "Присутствовать" : "Войти в класс"}</span>
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. МОДАЛЬНОЕ ОКНО НАСТРОЕК РАСПИСАНИЯ («НАСТРОИТЬ») */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Фильтры и настройки</h3>
                  <p className="text-[11px] text-slate-400">Отображение занятий в расписании</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5">
              {/* Фильтр по предметам */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Предмет обучения:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFilterSubject("all")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      filterSubject === "all"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    Все предметы
                  </button>
                  {availableSubjects.map((subj) => (
                    <button
                      key={subj}
                      type="button"
                      onClick={() => setFilterSubject(subj)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        filterSubject === subj
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {subj}
                    </button>
                  ))}
                </div>
              </div>

              {/* Отображение завершённых занятий (iOS-style switch) */}
              <div
                onClick={() => setShowPastLessons(!showPastLessons)}
                className="p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100/70 border border-slate-200/80 flex items-center justify-between cursor-pointer transition select-none"
              >
                <div>
                  <div className="text-xs font-bold text-slate-800">Показывать прошедшие уроки</div>
                  <div className="text-[11px] text-slate-400">Отображать завершённые уроки в календаре</div>
                </div>
                <div
                  className={`w-11 h-6 flex items-center rounded-full p-1 duration-300 cursor-pointer ${
                    showPastLessons ? "bg-blue-600" : "bg-slate-300"
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ${
                      showPastLessons ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </div>
              </div>

              {/* Часовой пояс платформы */}
              <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200/70 text-blue-900 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold flex items-center gap-1.5">
                    <span>Тольятти (UTC+4)</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[9px] font-extrabold uppercase">
                    Синхронизировано
                  </span>
                </div>
                <p className="text-[11px] text-blue-700/80 leading-snug">
                  Все занятия и уведомления автоматически настроены по самарскому времени школы
                </p>
              </div>
            </div>

            {/* Кнопки модалки */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Сбросить</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold transition shadow-md shadow-blue-500/20 cursor-pointer"
              >
                Готово
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
