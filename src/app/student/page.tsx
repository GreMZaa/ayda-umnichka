"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Video,
  Clock,
  Calendar,
  BookOpen,
  ArrowRight,
  GraduationCap,
} from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

export default function StudentCabinet() {
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/lessons?studentId=u-student-1")
      .then((res) => res.json())
      .then((data) => {
        setLessons(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const liveLesson = lessons.find((l) => l.status === "LIVE");
  const upcomingLessons = lessons.filter((l) => l.status === "SCHEDULED");
  const completedLessons = lessons.filter((l) => l.status === "COMPLETED");

  return (
    <div className="space-y-8 pb-12">
      {/* Шапка ученика */}
      <div className="clean-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
            src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop&crop=faces"
            alt="Миша"
            className="w-14 h-14 rounded-xl object-cover border border-slate-200"
          />
          <div>
            <span className="text-xs text-slate-500 font-semibold">Ученик 3 класса</span>
            <h1 className="text-xl font-bold text-slate-900">Миша Смирнов</h1>
            <p className="text-xs text-slate-600 mt-0.5">Центр развития «АйДаУмничка»</p>
          </div>
        </div>

        <div className="px-3.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 font-semibold text-xs border border-blue-100">
          Успехи: 25 звёзд
        </div>
      </div>

      {/* Активный урок (если идет) */}
      {liveLesson && (
        <div className="clean-card p-6 border-l-4 border-l-emerald-600 bg-white space-y-4">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Учитель в классе
            </span>
            <span className="text-xs text-slate-500 font-medium">
              До {format(new Date(liveLesson.endTime), "HH:mm")}
            </span>
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900">{liveLesson.title}</h2>
            <p className="text-xs text-slate-600 flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-slate-400" />
              <span>Преподаватель: <strong>{liveLesson.teacherName}</strong></span>
            </p>
          </div>

          <div>
            <Link
              href={`/room/${liveLesson.roomName}`}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition"
            >
              <Video className="w-4 h-4" />
              <span>Войти на урок</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Расписание предстоящих уроков */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-500" />
          <span>Ближайшие уроки</span>
        </h2>

        {upcomingLessons.length === 0 && !liveLesson ? (
          <div className="clean-card p-6 text-center text-slate-500 text-xs">
            На ближайшие дни уроков не запланировано
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingLessons.map((lesson) => (
              <div key={lesson.id} className="clean-card p-5 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold text-slate-800">{lesson.subjectName}</span>
                  <span>{format(new Date(lesson.startTime), "d MMMM, HH:mm", { locale: ru })}</span>
                </div>
                <h3 className="font-bold text-slate-900 text-sm">{lesson.title}</h3>
                <p className="text-xs text-slate-600">
                  Преподаватель: {lesson.teacherName}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Пройденные уроки */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-slate-500" />
          <span>Пройденные уроки</span>
        </h2>

        <div className="clean-card divide-y divide-slate-100 overflow-hidden">
          {completedLessons.map((lesson) => (
            <div key={lesson.id} className="p-5 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{format(new Date(lesson.startTime), "d MMMM yyyy", { locale: ru })}</span>
                <span className="text-emerald-700 font-semibold">Урок пройден</span>
              </div>
              <h3 className="font-bold text-slate-900 text-sm">{lesson.title}</h3>

              {lesson.notes && lesson.notes.length > 0 && (
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 text-xs text-slate-600 space-y-1">
                  {lesson.notes.map((note: any) => (
                    <div key={note.id}>
                      <span className="font-semibold text-slate-800">{note.authorName}: </span>
                      <span>{note.content}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
