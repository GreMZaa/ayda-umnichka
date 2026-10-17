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
} from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

export default function TeacherCabinet() {
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLessonForNote, setSelectedLessonForNote] = useState<any | null>(null);
  const [noteContent, setNoteContent] = useState("");
  const [grade, setGrade] = useState<number>(5);
  const [feedback, setFeedback] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const fetchLessons = async () => {
    try {
      const res = await fetch("/api/lessons?teacherId=u-teacher-1");
      const data = await res.json();
      setLessons(data);
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
      await fetch(`/api/lessons/${lessonId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      fetchLessons();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLessonForNote || !noteContent) return;
    setSavingNote(true);
    try {
      await fetch(`/api/lessons/${selectedLessonForNote.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorId: "u-teacher-1",
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
    <div className="space-y-8 pb-12">
      {/* Профиль преподавателя */}
      <div className="clean-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <img
            src="https://images.unsplash.com/photo-1544717305-2782549b5136?w=200&h=200&fit=crop&crop=faces"
            alt="Анна Сергеевна"
            className="w-16 h-16 rounded-xl object-cover border border-slate-200"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">
                Анна Сергеевна Иванова
              </h1>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                Преподаватель
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Предмет: <strong>Математика и логика</strong> • Стаж 12 лет
            </p>
          </div>
        </div>

        <Link
          href="/room/umnichka-live-room-demo"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition"
        >
          <Video className="w-3.5 h-3.5" />
          <span>Тест видеокласса</span>
        </Link>
      </div>

      {/* Активные уроки */}
      {liveLessons.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Урок сейчас в эфире</span>
          </h2>

          <div className="space-y-3">
            {liveLessons.map((lesson) => (
              <div
                key={lesson.id}
                className="clean-card p-5 border-l-4 border-l-emerald-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-semibold text-slate-800">{lesson.subjectName}</span>
                    <span>•</span>
                    <span>{format(new Date(lesson.startTime), "HH:mm")} - {format(new Date(lesson.endTime), "HH:mm")}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{lesson.title}</h3>
                  <p className="text-xs text-slate-600">
                    Ученик: <strong>{lesson.studentName}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Link
                    href={`/room/${lesson.roomName}`}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition"
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Войти в класс</span>
                  </Link>

                  <button
                    onClick={() => handleUpdateStatus(lesson.id, "COMPLETED")}
                    className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                  >
                    Завершить
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Предстоящие занятия */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-500" />
          <span>Предстоящие уроки</span>
        </h2>

        {upcomingLessons.length === 0 ? (
          <div className="clean-card p-6 text-center text-slate-500 text-xs">
            Нет запланированных уроков на ближайшее время
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingLessons.map((lesson) => (
              <div key={lesson.id} className="clean-card p-5 space-y-3 flex flex-col justify-between">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-semibold text-slate-800">{lesson.subjectName}</span>
                    <span>{format(new Date(lesson.startTime), "d MMMM, HH:mm", { locale: ru })}</span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">{lesson.title}</h3>
                  <p className="text-xs text-slate-600">
                    Ученик: <strong>{lesson.studentName}</strong>
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleUpdateStatus(lesson.id, "LIVE")}
                    className="px-3 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
                  >
                    Открыть класс
                  </button>
                  <Link
                    href={`/room/${lesson.roomName}`}
                    className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition"
                  >
                    Войти
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Журнал проведенных уроков */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-slate-500" />
          <span>Проведенные уроки и отчеты родителям</span>
        </h2>

        <div className="clean-card divide-y divide-slate-100 overflow-hidden">
          {completedLessons.map((lesson) => (
            <div key={lesson.id} className="p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs text-slate-400">
                    {format(new Date(lesson.startTime), "d MMMM yyyy, HH:mm", { locale: ru })}
                  </span>
                  <h4 className="font-bold text-slate-900 text-sm mt-0.5">{lesson.title}</h4>
                  <p className="text-xs text-slate-600">
                    Ученик: <strong>{lesson.studentName}</strong> • {lesson.subjectName}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedLessonForNote(lesson)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition self-start sm:self-auto"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                  <span>{lesson.notes && lesson.notes.length > 0 ? "Дополнить отчет" : "Написать отчет"}</span>
                </button>
              </div>

              {lesson.notes && lesson.notes.length > 0 && (
                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100 space-y-2 text-xs">
                  {lesson.notes.map((note: any) => (
                    <div key={note.id} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800">{note.authorName}</span>
                        {note.grade && (
                          <span className="font-bold text-slate-700">Оценка: {note.grade}/5</span>
                        )}
                      </div>
                      <p className="text-slate-600">{note.content}</p>
                      {note.feedback && (
                        <div className="p-2 bg-white rounded border border-slate-200 text-slate-700 mt-1">
                          <strong>Рекомендация родителю:</strong> {note.feedback}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Модальное окно отчета */}
      {selectedLessonForNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Отчет по уроку</h3>
              <button
                onClick={() => setSelectedLessonForNote(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Ученик: <strong>{selectedLessonForNote.studentName}</strong> • {selectedLessonForNote.title}
            </p>

            <form onSubmit={handleSaveNote} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Что прошли на уроке
                </label>
                <textarea
                  required
                  rows={3}
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Разобрали тему, решили 5 задач..."
                  className="w-full text-xs p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Оценка за занятие (1 - 5)
                </label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((g) => (
                    <button
                      type="button"
                      key={g}
                      onClick={() => setGrade(g)}
                      className={`flex-1 py-1.5 rounded-md text-xs font-bold transition ${
                        grade === g
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {g} ★
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Совет родителям на дом
                </label>
                <textarea
                  rows={2}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Повторить таблицу умножения..."
                  className="w-full text-xs p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedLessonForNote(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={savingNote}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition disabled:opacity-50"
                >
                  {savingNote ? "Сохранение..." : "Сохранить отчет"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
