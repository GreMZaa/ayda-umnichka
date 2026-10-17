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
  Star,
  Award,
  User,
} from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { getSupabase } from "@/lib/supabase";
import { fetchWithAuth } from "@/lib/api-client";

export default function StudentCabinet() {
  const [studentName, setStudentName] = useState("Ученик");
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const client = getSupabase();
    if (client) {
      client.auth.getSession().then(({ data }) => {
        if (data?.session?.user) {
          const meta = data.session.user.user_metadata || {};
          if (meta.full_name) {
            setStudentName(meta.full_name);
          } else if (data.session.user.email) {
            setStudentName(data.session.user.email.split("@")[0]);
          }
        }
      });
    }

    fetchWithAuth("/api/lessons")
      .then((res) => res.json())
      .then((data) => {
        setLessons(Array.isArray(data) ? data : []);
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

  const initial = studentName.charAt(0).toUpperCase();

  return (
    <div className="space-y-6 pb-16">
      {/* 1. ШАПКА УЧЕНИКА */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-600 text-white font-extrabold text-xl flex items-center justify-center border-2 border-white shadow-sm ring-2 ring-emerald-100">
              {initial || <User className="w-7 h-7" />}
            </div>
            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-[10px] text-white">
              ⭐
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900">
                {studentName}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                Ученик центра
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Центр развития «АйДаУмничка» • Личный кабинет ученика
            </p>
          </div>
        </div>

        {/* Награды и звёзды */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold shadow-2xs">
            <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
            <span>28 звёзд</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold">
            <Award className="w-4 h-4 text-blue-600" />
            <span>Уровень: Знаток</span>
          </div>
        </div>
      </div>

      {/* 2. БОЛЬШАЯ КНОПКА: УРОК ИДЕТ ПРЯМО СЕЙЧАС */}
      {liveLesson && (
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl p-6 sm:p-7 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 animate-in fade-in duration-300">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold backdrop-blur-xs">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              <span>Учитель уже в классе и ждёт тебя!</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              {liveLesson.title}
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100 flex items-center gap-2">
              <span>Преподаватель: <strong>{liveLesson.teacherName}</strong></span>
              <span>•</span>
              <span>До {format(new Date(liveLesson.endTime), "HH:mm")}</span>
            </p>
          </div>

          <Link
            href={`/room/${liveLesson.roomName}`}
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-emerald-900 font-extrabold text-sm sm:text-base shadow-xl hover:bg-emerald-50 transition transform hover:scale-105 active:scale-95 shrink-0 w-full sm:w-auto"
          >
            <Video className="w-5 h-5 text-emerald-700" />
            <span>Войти на урок в 1 клик</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* 3. БЛИЖАЙШИЕ УРОКИ */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>Расписание ближайших уроков</span>
          </h2>
          <span className="text-xs text-slate-400">Всё готово к урокам</span>
        </div>

        {upcomingLessons.length === 0 && !liveLesson ? (
          <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-slate-500 text-xs">
            На ближайшие дни уроков не запланировано. Преподаватель добавит следующий урок в расписание.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {upcomingLessons.map((lesson) => (
              <div
                key={lesson.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3 hover:border-slate-300 transition"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md">
                    {lesson.subjectName}
                  </span>
                  <span className="font-semibold text-slate-700 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {format(new Date(lesson.startTime), "d MMMM, HH:mm", { locale: ru })}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 text-base">{lesson.title}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Преподаватель: <strong className="text-slate-800">{lesson.teacherName}</strong>
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400">
                    Интерактивная доска готова
                  </span>
                  <Link
                    href={`/room/${lesson.roomName}`}
                    className="font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
                  >
                    <span>Войти в комнату</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. ДОСТИЖЕНИЯ И ПРОЙДЕННЫЕ УРОКИ */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2 px-1">
          <BookOpen className="w-4 h-4 text-emerald-600" />
          <span>Мои пройденные занятия и оценки</span>
        </h2>

        {completedLessons.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-slate-500 text-xs">
            Пройденные уроки будут отображаться здесь вместе с рекомендациями и оценками преподавателей.
          </div>
        ) : (
          <div className="bg-white rounded-2xl divide-y divide-slate-100 border border-slate-200 shadow-xs overflow-hidden">
            {completedLessons.map((lesson) => (
              <div key={lesson.id} className="p-5 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{lesson.title}</span>
                    <span className="text-[11px] text-slate-400">
                      ({format(new Date(lesson.startTime), "d MMMM yyyy", { locale: ru })})
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-amber-600 font-bold text-xs bg-amber-50 px-2.5 py-0.5 rounded-md self-start sm:self-auto">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                    <span>5 звёзд за урок!</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 space-y-1">
                  <span className="font-bold text-slate-900 block">
                    Комментарий преподавателя ({lesson.teacherName}):
                  </span>
                  <p className="text-slate-600">
                    Отличная работа с материалом урока и решение задач на виртуальной доске. Так держать!
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
