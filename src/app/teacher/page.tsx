"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  GraduationCap,
  Video,
  Calendar,
  Clock,
  User,
  CheckCircle2,
  BookOpen,
  Star,
  MessageSquare,
  FileText,
  Sparkles,
  ArrowRight,
  SlidersHorizontal,
} from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { fetchWithAuth } from "@/lib/api-client";
import ScheduleCalendar from "@/components/ScheduleCalendar";

export default function TeacherCabinet() {
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"schedule" | "journal">("schedule");
  const [selectedLessonForNote, setSelectedLessonForNote] = useState<any | null>(null);
  const [noteContent, setNoteContent] = useState("");
  const [grade, setGrade] = useState<number>(5);
  const [feedback, setFeedback] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const fetchLessons = async () => {
    try {
      const res = await fetchWithAuth("/api/lessons");
      const data = await res.json();
      setLessons(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLessons();
  }, []);

  const handleUpdateStatus = async (lessonId: string, status: string) => {
    try {
      await fetchWithAuth(`/api/lessons/${lessonId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      fetchLessons();
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenReportModal = (lesson: any) => {
    setSelectedLessonForNote(lesson);
    if (lesson.notes && lesson.notes.length > 0) {
      const lastNote = lesson.notes[lesson.notes.length - 1];
      setNoteContent(lastNote.content || "");
      setGrade(lastNote.grade || 5);
      setFeedback(lastNote.feedback || "");
    } else {
      setNoteContent("");
      setGrade(5);
      setFeedback("");
    }
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLessonForNote || !noteContent) return;
    setSavingNote(true);
    try {
      await fetchWithAuth(`/api/lessons/${selectedLessonForNote.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: noteContent,
          grade,
          feedback,
        }),
      });
      setSelectedLessonForNote(null);
      setNoteContent("");
      setFeedback("");
      fetchLessons();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingNote(false);
    }
  };

  const liveLessons = lessons.filter((l) => l.status === "LIVE");
  const upcomingLessons = lessons.filter((l) => l.status === "SCHEDULED");
  const completedLessons = lessons.filter((l) => l.status === "COMPLETED");

  return (
    <div className="space-y-6 pb-20">
      {/* 1. ШАПКА ПРЕПОДАВАТЕЛЯ В СТИЛЕ FOXFORD */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1544717305-2782549b5136?w=200&h=200&fit=crop&crop=faces"
                alt="Анна Сергеевна"
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-white shadow-lg ring-4 ring-blue-50"
              />
              <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-xs text-white shadow-xs">
                ✓
              </span>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  Анна Сергеевна Иванова
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                  Преподаватель
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>Предмет: <strong>Математика и логика</strong></span>
                <span>•</span>
                <span>Стаж: 12 лет</span>
                <span>•</span>
                <span className="inline-flex items-center gap-1 font-bold text-amber-600">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                  Рейтинг 5.0
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto">
            <Link
              href="/room/umnichka-live-room-demo"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs sm:text-sm border border-blue-200 transition active:scale-95 cursor-pointer w-full sm:w-auto"
            >
              <Video className="w-4 h-4 text-blue-600" />
              <span>Тестовый видеокласс</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. АКТИВНЫЙ УРОК ПРЯМО СЕЙЧАС */}
      {liveLessons.length > 0 && (
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white rounded-3xl p-6 sm:p-7 shadow-xl shadow-emerald-700/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 animate-in fade-in duration-300">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-black backdrop-blur-xs">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              <span>Урок идёт прямо сейчас!</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              {liveLessons[0].title}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-emerald-100">
              <span>Ученик: <strong>{liveLessons[0].studentName}</strong></span>
              <span>•</span>
              <span>До {format(new Date(liveLessons[0].endTime), "HH:mm")}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <Link
              href={`/room/${liveLessons[0].roomName}`}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white text-emerald-900 font-extrabold text-xs sm:text-sm shadow-xl hover:bg-emerald-50 transition transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Video className="w-4 h-4 text-emerald-600" />
              <span>Войти в класс</span>
            </Link>
            <button
              onClick={() => handleUpdateStatus(liveLessons[0].id, "COMPLETED")}
              className="px-4 py-3.5 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs transition cursor-pointer backdrop-blur-xs"
            >
              Завершить
            </button>
          </div>
        </div>
      )}

      {/* 3. НАВИГАЦИОННЫЕ ТАБЫ В СТИЛЕ FOXFORD */}
      <div className="flex p-1.5 bg-slate-100 rounded-2xl max-w-md gap-1">
        <button
          type="button"
          onClick={() => setActiveTab("schedule")}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === "schedule"
              ? "bg-white text-slate-900 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Calendar className={`w-3.5 h-3.5 ${activeTab === "schedule" ? "text-blue-600" : "text-slate-400"}`} />
          <span>Расписание ({upcomingLessons.length + liveLessons.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("journal")}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === "journal"
              ? "bg-white text-slate-900 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <FileText className={`w-3.5 h-3.5 ${activeTab === "journal" ? "text-blue-600" : "text-slate-400"}`} />
          <span>Журнал и отчёты ({completedLessons.length})</span>
        </button>
      </div>

      {/* 4. ВКЛАДКА 1: ФОКСФОРД-КАЛЕНДАРЬ РАСПИСАНИЯ */}
      {activeTab === "schedule" && (
        <ScheduleCalendar
          role="teacher"
          lessons={lessons}
          onUpdateStatus={handleUpdateStatus}
          onOpenReportModal={handleOpenReportModal}
        />
      )}

      {/* 5. ВКЛАДКА 2: ЖУРНАЛ ПРОВЕДЁННЫХ УРОКОВ И ОТЧЁТЫ */}
      {activeTab === "journal" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span>Проведённые уроки и отчеты родителям</span>
            </h2>
          </div>

          {completedLessons.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center text-slate-500 text-xs">
              Пока нет проведённых уроков
            </div>
          ) : (
            <div className="bg-white rounded-3xl divide-y divide-slate-100 border border-slate-200 shadow-xs overflow-hidden">
              {completedLessons.map((lesson) => (
                <div key={lesson.id} className="p-6 space-y-3 hover:bg-slate-50/50 transition">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg">
                          {lesson.subjectName}
                        </span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-500">
                          {format(new Date(lesson.startTime), "d MMMM yyyy, HH:mm", { locale: ru })}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-slate-900 text-base mt-1">{lesson.title}</h4>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Ученик: <strong>{lesson.studentName}</strong>
                      </p>
                    </div>

                    <button
                      onClick={() => handleOpenReportModal(lesson)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition border border-blue-200/80 cursor-pointer self-start sm:self-auto"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                      <span>{lesson.notes && lesson.notes.length > 0 ? "Изменить отчёт" : "Написать отчёт"}</span>
                    </button>
                  </div>

                  {lesson.notes && lesson.notes.length > 0 && (
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 text-xs">
                      {lesson.notes.map((note: any, nIdx: number) => (
                        <div key={note.id || nIdx} className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800">{note.authorName || "Преподаватель"}</span>
                            {note.grade && (
                              <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                                Оценка: {note.grade} / 5
                              </span>
                            )}
                          </div>
                          <p className="text-slate-700 leading-relaxed">{note.content}</p>
                          {note.feedback && (
                            <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 text-blue-900 mt-1">
                              <strong>Совет родителю на дом:</strong> {note.feedback}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 6. МОДАЛЬНОЕ ОКНО ОТЧЁТА ПРЕПОДАВАТЕЛЯ */}
      {selectedLessonForNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-7 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Отчёт по проведённому уроку</h3>
                <p className="text-xs text-slate-500">
                  Ученик: <strong>{selectedLessonForNote.studentName}</strong> • {selectedLessonForNote.title}
                </p>
              </div>
              <button
                onClick={() => setSelectedLessonForNote(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNote} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Что прошли на уроке:
                </label>
                <textarea
                  required
                  rows={3}
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Разобрали тему «Дроби и логические задачи», решили 5 примеров на доске..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Оценка за занятие (1 - 5):
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((g) => (
                    <button
                      type="button"
                      key={g}
                      onClick={() => setGrade(g)}
                      className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                        grade === g
                          ? "bg-amber-500 text-white shadow-xs"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {g} ★
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Совет родителям на дом:
                </label>
                <textarea
                  rows={2}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Обязательно похвалите за самостоятельное решение! Дома повторить таблицу умножения..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedLessonForNote(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={savingNote}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {savingNote ? "Сохранение..." : "Сохранить отчёт"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
