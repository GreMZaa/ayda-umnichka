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
} from "lucide-react";
import {
  format,
  startOfWeek,
  addDays,
  isSameDay,
  addWeeks,
  subWeeks,
  isWithinInterval,
  isBefore,
} from "date-fns";
import { ru } from "date-fns/locale";

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
}

const TIME_SLOTS = [
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
];

const SLOT_HEIGHT = 72; // Высота каждого часового слота в пикселях

export default function ScheduleCalendar({
  role,
  lessons,
  title = "Расписание занятий",
  onUpdateStatus,
  onOpenReportModal,
}: ScheduleCalendarProps) {
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [selectedMobileDay, setSelectedMobileDay] = useState<Date>(new Date());
  const [calendarViewMode, setCalendarViewMode] = useState<"calendar" | "list">("calendar");

  // Состояния фильтра («Настройки»)
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [filterSubject, setFilterSubject] = useState<string>("all");
  const [showPastLessons, setShowPastLessons] = useState<boolean>(true);
  const [timezone, setTimezone] = useState<"MSK" | "LOCAL">("MSK");

  // Текущее время для красной линии
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

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

  // Проверка активности фильтров
  const hasActiveFilters = filterSubject !== "all" || !showPastLessons || timezone !== "MSK";

  // Сброс фильтров
  const handleResetFilters = () => {
    setFilterSubject("all");
    setShowPastLessons(true);
    setTimezone("MSK");
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

  // Уроки на выбранную неделю
  const weekLessons = useMemo(() => {
    return filteredLessons.filter((l) => {
      const lDate = new Date(l.startTime);
      return isWithinInterval(lDate, {
        start: new Date(weekStart.setHours(0, 0, 0, 0)),
        end: new Date(weekEnd.setHours(23, 59, 59, 999)),
      });
    });
  }, [filteredLessons, weekStart, weekEnd]);

  // Расчёт позиции красной полосы текущего времени
  const isCurrentWeek = isWithinInterval(new Date(), {
    start: new Date(new Date(weekStart).setHours(0, 0, 0, 0)),
    end: new Date(new Date(weekEnd).setHours(23, 59, 59, 999)),
  });

  const redLineOffset = useMemo(() => {
    if (!isCurrentWeek) return null;
    const now = currentTime;
    const hour = now.getHours();
    const min = now.getMinutes();
    const startHour = 9; // 09:00
    if (hour < startHour || hour > 20) return null;
    const totalMinutesFromStart = (hour - startHour) * 60 + min;
    return (totalMinutesFromStart / 60) * SLOT_HEIGHT;
  }, [currentTime, isCurrentWeek]);

  return (
    <div className="space-y-4">
      {/* 1. ПАНЕЛЬ УПРАВЛЕНИЯ КАЛЕНДАРЁМ (КАК В ФОКСФОРДЕ) */}
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

        {/* Навигатор по неделям */}
        <div className="flex items-center gap-1.5 sm:gap-2 w-full md:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              type="button"
              onClick={() => setCalendarDate(subWeeks(calendarDate, 1))}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition cursor-pointer active:scale-95"
              title="Предыдущая неделя"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800">
              <CalendarIcon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>
                {format(weekStart, "d")} – {format(weekEnd, "d MMM", { locale: ru })}
                <span className="hidden sm:inline"> {format(weekEnd, "yyyy")}</span>
              </span>
            </div>

            <button
              type="button"
              onClick={() => setCalendarDate(addWeeks(calendarDate, 1))}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition cursor-pointer active:scale-95"
              title="Следующая неделя"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setCalendarDate(new Date())}
            className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-blue-600 hover:bg-blue-50 transition cursor-pointer"
          >
            Сегодня
          </button>
        </div>
      </div>

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
                  const isToday = isSameDay(day, new Date());
                  const dayLessons = filteredLessons.filter((l) => isSameDay(new Date(l.startTime), day));

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedMobileDay(day)}
                      className={`py-2 px-1 rounded-xl flex flex-col items-center gap-1 transition cursor-pointer ${
                        isSelected
                          ? "bg-blue-600 text-white shadow-sm shadow-blue-500/25 font-black"
                          : isToday
                          ? "bg-blue-50 text-blue-700 font-bold"
                          : "hover:bg-slate-50 text-slate-700 font-medium"
                      }`}
                    >
                      <span className="text-[10px] uppercase font-bold tracking-tight">
                        {format(day, "EE", { locale: ru })}
                      </span>
                      <span className="text-sm font-extrabold leading-none">
                        {format(day, "d")}
                      </span>
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
                  {format(selectedMobileDay, "EEEE, d MMMM", { locale: ru })}
                </span>
                {isSameDay(selectedMobileDay, new Date()) && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                    Сегодня
                  </span>
                )}
              </div>
              <span className="text-xs font-bold text-slate-500">
                {filteredLessons.filter((l) => isSameDay(new Date(l.startTime), selectedMobileDay)).length} занятий
              </span>
            </div>

            {/* Список уроков на выбранный день */}
            {(() => {
              const dayLessons = filteredLessons
                .filter((l) => isSameDay(new Date(l.startTime), selectedMobileDay))
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
                              {format(new Date(l.startTime), "HH:mm")} – {format(new Date(l.endTime), "HH:mm")}
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
                          <Link
                            href={`/room/${l.id || l.roomName}`}
                            className="flex-1 min-w-[120px] py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-blue-500/20 active:scale-95"
                          >
                            <Video className="w-3.5 h-3.5" />
                            <span>Войти в видеокласс</span>
                          </Link>

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
                                  className="px-3 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200"
                                >
                                  Отчёт
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
                  {timezone === "MSK" ? "МСК" : "ВРЕМЯ"}
                </div>
                {weekDays.map((day, idx) => {
                  const isToday = isSameDay(day, new Date());
                  return (
                    <div
                      key={idx}
                      className={`p-2.5 border-r border-slate-200 last:border-r-0 text-xs font-bold transition ${
                        isToday ? "bg-blue-50/70" : ""
                      }`}
                    >
                      <div
                        className={`inline-block px-2.5 py-1 rounded-xl transition ${
                          isToday
                            ? "bg-blue-600 text-white shadow-xs font-black"
                            : "text-slate-700"
                        }`}
                      >
                        <span>{format(day, "EE", { locale: ru })} · {format(day, "d MMM", { locale: ru })}</span>
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
                        {format(currentTime, "HH:mm")}
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
                          const lDate = new Date(l.startTime);
                          return isSameDay(lDate, day) && lDate.getHours() === slotHour;
                        });

                        const isToday = isSameDay(day, new Date());

                        return (
                          <div
                            key={dayIdx}
                            className={`p-1.5 border-r border-slate-100 last:border-r-0 relative transition hover:bg-slate-50/50 flex flex-col gap-1.5 ${
                              isToday ? "bg-blue-50/20" : ""
                            }`}
                          >
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
                                      {format(new Date(l.startTime), "HH:mm")}
                                    </span>

                                    {/* Кнопки действий по роли */}
                                    {isLive ? (
                                      <Link
                                        href={`/room/${l.id || l.roomName}`}
                                        className="px-2 py-0.5 rounded-lg bg-white text-emerald-800 font-extrabold hover:bg-emerald-50 shadow-xs"
                                      >
                                        Войти
                                      </Link>
                                    ) : isCompleted ? (
                                      role === "teacher" && onOpenReportModal ? (
                                        <button
                                          type="button"
                                          onClick={() => onOpenReportModal(l)}
                                          className="text-blue-600 hover:text-blue-800 font-bold"
                                        >
                                          Отчёт
                                        </button>
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
                                          href={`/room/${l.id || l.roomName}`}
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

      {/* 3. РЕЖИМ 2: СПИСКОМ (ФОКСФОРД-СТИЛЬ) */}
      {calendarViewMode === "list" && (
        <div className="space-y-3">
          {weekLessons.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center space-y-3">
              <div className="text-3xl">📋</div>
              <h3 className="text-base font-bold text-slate-800">Нет занятий на выбранную неделю</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Переключитесь на другую неделю или измените настройки фильтрации.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {weekLessons.map((lesson) => {
                const isLive = lesson.status === "LIVE";
                const isCompleted = lesson.status === "COMPLETED";

                return (
                  <div
                    key={lesson.id}
                    className={`bg-white rounded-3xl p-5 sm:p-6 border shadow-xs space-y-4 transition ${
                      isLive
                        ? "border-emerald-400 bg-emerald-50/20"
                        : "border-slate-200 hover:border-blue-300"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-extrabold text-blue-700 bg-blue-50 px-3 py-1 rounded-xl">
                        {lesson.subjectName}
                      </span>
                      <span className="font-semibold text-slate-700 flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-xl">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {format(new Date(lesson.startTime), "d MMMM (EE), HH:mm", { locale: ru })}
                        </span>
                      </span>
                    </div>

                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base">{lesson.title}</h3>
                      <p className="text-xs text-slate-500 mt-1">
                        {role === "teacher"
                          ? `Ученик: ${lesson.studentName || "Ученик"}`
                          : `Преподаватель: ${lesson.teacherName || "Репетитор"}`}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
                      <div>
                        {isLive ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                            Урок в эфире
                          </span>
                        ) : isCompleted ? (
                          <span className="text-xs font-bold text-slate-500">
                            ✓ Завершён
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-slate-500">
                            Запланирован
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {role === "teacher" && !isCompleted && !isLive && onUpdateStatus && (
                          <button
                            type="button"
                            onClick={() => onUpdateStatus(lesson.id, "LIVE")}
                            className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                          >
                            Открыть класс
                          </button>
                        )}
                        {role === "teacher" && isCompleted && onOpenReportModal && (
                          <button
                            type="button"
                            onClick={() => onOpenReportModal(lesson)}
                            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition"
                          >
                            Отчёт
                          </button>
                        )}
                        <Link
                          href={`/room/${lesson.id || lesson.roomName}`}
                          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs ${
                            isLive
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                              : "bg-blue-600 hover:bg-blue-700 text-white"
                          }`}
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>{role === "parent" ? "Присутствовать" : "Войти в класс"}</span>
                        </Link>
                      </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-7 shadow-2xl border border-slate-200 space-y-5 sm:space-y-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Настройки расписания</h3>
                  <p className="text-[11px] text-slate-500">Фильтрация и отображение уроков</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Фильтр по предметам */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-2">
                  Фильтр по предмету:
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

              {/* Отображение завершённых занятий */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-800">Показывать прошедшие уроки</div>
                  <div className="text-[11px] text-slate-500">Отображать завершённые занятия в календаре</div>
                </div>
                <input
                  type="checkbox"
                  checked={showPastLessons}
                  onChange={(e) => setShowPastLessons(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
              </div>

              {/* Часовой пояс */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-2">
                  Часовой пояс:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTimezone("MSK")}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                      timezone === "MSK"
                        ? "border-blue-600 bg-blue-50/50 text-blue-900 font-bold shadow-2xs"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="text-xs font-bold">МСК (UTC+3)</div>
                    <div className="text-[10px] text-slate-500">Московское время</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTimezone("LOCAL")}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                      timezone === "LOCAL"
                        ? "border-blue-600 bg-blue-50/50 text-blue-900 font-bold shadow-2xs"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="text-xs font-bold">Местное время</div>
                    <div className="text-[10px] text-slate-500">Время вашего устройства</div>
                  </button>
                </div>
              </div>
            </div>

            {/* Кнопки модалки */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Сбросить</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
              >
                Применить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
