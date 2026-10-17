"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Calendar,
  Clock,
  Video,
  CreditCard,
  GraduationCap,
  PhoneCall,
  CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

export default function ParentCabinet() {
  const children = [
    {
      id: "u-student-1",
      name: "Миша Смирнов",
      grade: "3 класс",
      avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop&crop=faces",
      balance: 6,
    },
    {
      id: "u-student-2",
      name: "Алиса Смирнова",
      grade: "5 класс",
      avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop&crop=faces",
      balance: 4,
    },
  ];

  const [selectedChildId, setSelectedChildId] = useState(children[0].id);
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const selectedChild = children.find((c) => c.id === selectedChildId) || children[0];

  useEffect(() => {
    setLoading(true);
    fetch(`/api/lessons?studentId=${selectedChildId}`)
      .then((res) => res.json())
      .then((data) => {
        setLessons(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [selectedChildId]);

  const liveLesson = lessons.find((l) => l.status === "LIVE");
  const upcomingLessons = lessons.filter((l) => l.status === "SCHEDULED");
  const completedLessons = lessons.filter((l) => l.status === "COMPLETED");

  return (
    <div className="space-y-8 pb-12">
      {/* Шапка родителя */}
      <div className="clean-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
            src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&crop=faces"
            alt="Елена Смирнова"
            className="w-16 h-16 rounded-xl object-cover border border-slate-200"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">
                Елена Смирнова
              </h1>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                Родитель
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Центр развития «АйДаУмничка» • Детей в обучении: {children.length}
            </p>
          </div>
        </div>

        <a
          href="tel:+79997778899"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
        >
          <PhoneCall className="w-3.5 h-3.5" />
          <span>Связь с центром</span>
        </a>
      </div>

      {/* Селектор детей */}
      <div className="space-y-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Профиль ребенка:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {children.map((child) => {
            const isSelected = child.id === selectedChildId;
            return (
              <button
                key={child.id}
                onClick={() => setSelectedChildId(child.id)}
                className={`clean-card p-4 text-left transition flex items-center justify-between gap-4 ${
                  isSelected ? "border-blue-600 bg-blue-50/30" : "hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <img
                    src={child.avatar}
                    alt={child.name}
                    className="w-12 h-12 rounded-lg object-cover border border-slate-200"
                  />
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{child.name}</h3>
                    <p className="text-xs text-slate-500">{child.grade}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-semibold text-slate-700">
                    Остаток: <strong>{child.balance} зан.</strong>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Индикатор текущего урока ребенка */}
      {liveLesson && (
        <div className="clean-card p-5 border-l-4 border-l-emerald-600 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-emerald-700">
              {selectedChild.name} сейчас на уроке
            </span>
            <h3 className="text-base font-bold text-slate-900">{liveLesson.title}</h3>
            <p className="text-xs text-slate-500">
              Преподаватель: {liveLesson.teacherName} • До {format(new Date(liveLesson.endTime), "HH:mm")}
            </p>
          </div>

          <Link
            href={`/room/${liveLesson.roomName}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition"
          >
            <Video className="w-3.5 h-3.5" />
            <span>Присутствовать</span>
          </Link>
        </div>
      )}

      {/* Предстоящие занятия */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-500" />
          <span>Расписание: {selectedChild.name}</span>
        </h3>

        {upcomingLessons.length === 0 ? (
          <div className="clean-card p-6 text-center text-slate-500 text-xs">
            На ближайшие дни уроков не запланировано
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingLessons.map((lesson) => (
              <div key={lesson.id} className="clean-card p-5 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold text-slate-800">{lesson.subjectName}</span>
                  <span>{format(new Date(lesson.startTime), "d MMMM, HH:mm", { locale: ru })}</span>
                </div>
                <h4 className="font-bold text-slate-900 text-sm">{lesson.title}</h4>
                <p className="text-xs text-slate-600">
                  Преподаватель: {lesson.teacherName}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Отчеты педагогов по прошедшим урокам */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-slate-500" />
          <span>Отчеты преподавателей</span>
        </h3>

        {completedLessons.length === 0 ? (
          <div className="clean-card p-6 text-center text-slate-500 text-xs">
            История уроков пуста
          </div>
        ) : (
          <div className="clean-card divide-y divide-slate-100 overflow-hidden">
            {completedLessons.map((lesson) => (
              <div key={lesson.id} className="p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <span className="text-xs text-slate-400">
                      {format(new Date(lesson.startTime), "d MMMM yyyy, HH:mm", { locale: ru })}
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm">{lesson.title}</h4>
                    <p className="text-xs text-slate-600">
                      Преподаватель: {lesson.teacherName} ({lesson.subjectName})
                    </p>
                  </div>
                  <span className="text-xs text-emerald-700 font-semibold self-start sm:self-auto">
                    Занятие проведено
                  </span>
                </div>

                {lesson.notes && lesson.notes.length > 0 && (
                  <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-100 text-xs text-slate-700 space-y-2">
                    {lesson.notes.map((note: any) => (
                      <div key={note.id} className="space-y-1">
                        {note.grade && (
                          <span className="font-bold text-slate-900 block">
                            Оценка за урок: {note.grade} из 5
                          </span>
                        )}
                        <p>{note.content}</p>
                        {note.feedback && (
                          <div className="p-2 bg-white rounded border border-slate-200 mt-1">
                            <strong>Рекомендация родителям:</strong> {note.feedback}
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

      {/* Баланс уроков */}
      <div className="clean-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50">
        <div>
          <h3 className="font-bold text-slate-900 text-base">
            Остаток занятий: {selectedChild.balance} уроков
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Пакет занятий для ученика {selectedChild.name}
          </p>
        </div>

        <button
          onClick={() => alert("Онлайн-оплата (ЮKassa/СБП) будет активирована при подключении эквайринга.")}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition"
        >
          Пополнить баланс
        </button>
      </div>
    </div>
  );
}
