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
  Sparkles,
  Flame,
  CheckCircle2,
  FileText,
  TrendingUp,
  MessageSquare,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { getSupabase } from "@/lib/supabase";
import { fetchWithAuth } from "@/lib/api-client";

export default function StudentCabinet() {
  const [studentName, setStudentName] = useState("Ученик");
  const [grade, setGrade] = useState("3 класс");
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"schedule" | "subjects" | "homework" | "awards">("schedule");

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
          if (meta.grade) {
            setGrade(meta.grade);
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

  // Демо-предметы в стиле Фоксфорда
  const subjectsList = [
    {
      name: "Математика и логика",
      icon: "📐",
      teacher: "Анна Сергеевна Иванова",
      progress: 68,
      topicsCompleted: 14,
      totalTopics: 20,
      color: "blue",
    },
    {
      name: "Русский язык и каллиграфия",
      icon: "✍️",
      teacher: "Елена Викторовна Смирнова",
      progress: 82,
      topicsCompleted: 18,
      totalTopics: 22,
      color: "emerald",
    },
    {
      name: "Английский язык",
      icon: "🇬🇧",
      teacher: "Мария Андреевна Попова",
      progress: 45,
      topicsCompleted: 9,
      totalTopics: 20,
      color: "amber",
    },
  ];

  // Демо-домашние задания в стиле Фоксфорда
  const homeworkList = [
    {
      id: 1,
      subject: "Математика и логика",
      title: "Дроби и логические цепочки. Задачи 4–8",
      deadline: "Завтра, до 18:00",
      status: "NEW",
      statusText: "Нужно сделать",
      badgeColor: "bg-amber-100 text-amber-800",
    },
    {
      id: 2,
      subject: "Русский язык",
      title: "Безударные гласные в корне слова. Упражнение 112",
      deadline: "22 октября",
      status: "CHECKED",
      statusText: "Проверено на 5 ⭐",
      badgeColor: "bg-emerald-100 text-emerald-800",
    },
    {
      id: 3,
      subject: "Английский язык",
      title: "Present Continuous: правила и диалог",
      deadline: "24 октября",
      status: "SUBMITTED",
      statusText: "На проверке",
      badgeColor: "bg-blue-100 text-blue-800",
    },
  ];

  // Достижения в стиле Фоксфорда
  const achievements = [
    {
      title: "Первый шаг",
      desc: "Успешное подключение к первому онлайн-уроку",
      icon: "🚀",
      unlocked: true,
    },
    {
      title: "Знаток математики",
      desc: "Решил 10 интерактивных задач на доске",
      icon: "📐",
      unlocked: true,
    },
    {
      title: "Супер-серия 🔥",
      desc: "3 урока подряд без опозданий и пропусков",
      icon: "⚡",
      unlocked: true,
    },
    {
      title: "Магистр логики",
      desc: "Выполнил 5 домашних заданий подряд на отлично",
      icon: "👑",
      unlocked: false,
    },
  ];

  return (
    <div className="space-y-6 pb-20">
      {/* 1. ГЛАВНАЯ КАРТОЧКА ПРОФИЛЯ С ГЕЙМИФИКАЦИЕЙ В СТИЛЕ ФОКСФОРДА */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm relative overflow-hidden">
        {/* Фоновый декоративный круг */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full blur-2xl opacity-60 pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="relative">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-2xl sm:text-3xl flex items-center justify-center shadow-lg shadow-blue-500/25 ring-4 ring-blue-50">
                {initial || <User className="w-8 h-8" />}
              </div>
              <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center text-xs shadow-xs" title="Звёздный ученик">
                ⭐
              </span>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  Привет, {studentName}! 👋
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                  {grade}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Твой персональный образовательный трек в «АйДаУмничка»
              </p>
            </div>
          </div>

          {/* Игровые виджеты Фоксфорда: Звёзды, Серия, Уровень */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">
            {/* Звёзды */}
            <div className="flex-1 sm:flex-none flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-900 shadow-2xs">
              <Star className="w-5 h-5 fill-amber-400 text-amber-500" />
              <div>
                <div className="text-xs font-black text-amber-950">28 звёзд</div>
                <div className="text-[10px] text-amber-700 font-medium">За успехи в уроках</div>
              </div>
            </div>

            {/* Серия дней без пропусков */}
            <div className="flex-1 sm:flex-none flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-900 shadow-2xs">
              <Flame className="w-5 h-5 fill-rose-500 text-rose-500 animate-bounce" />
              <div>
                <div className="text-xs font-black text-rose-950">3 дня подряд</div>
                <div className="text-[10px] text-rose-700 font-medium">Ударный темп 🔥</div>
              </div>
            </div>

            {/* Звание */}
            <div className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-50 border border-blue-200/80 text-blue-900 shadow-2xs">
              <Award className="w-5 h-5 text-blue-600" />
              <div>
                <div className="text-xs font-black text-blue-950">Знаток III</div>
                <div className="text-[10px] text-blue-700 font-medium">75% до «Магистра»</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. ГОРЯЩИЙ УРОК ПРЯМО СЕЙЧАС (ФОКСФОРД ВИДЖЕТ) */}
      {liveLesson && (
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white rounded-3xl p-6 sm:p-7 shadow-xl shadow-emerald-700/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 animate-in fade-in duration-300">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-black backdrop-blur-xs">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              <span>Урок идёт прямо сейчас!</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              {liveLesson.title}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-emerald-100">
              <span>Преподаватель: <strong>{liveLesson.teacherName}</strong></span>
              <span>•</span>
              <span>До {format(new Date(liveLesson.endTime), "HH:mm")}</span>
            </div>
          </div>

          <Link
            href={`/room/${liveLesson.roomName}`}
            className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl bg-white text-emerald-900 font-black text-sm sm:text-base shadow-xl hover:bg-emerald-50 transition transform hover:scale-105 active:scale-95 shrink-0 w-full sm:w-auto cursor-pointer"
          >
            <Video className="w-5 h-5 text-emerald-600" />
            <span>Войти в видеокласс</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
      )}

      {/* 3. НАВИГАЦИОННЫЕ ТАБЫ КАБИНЕТА (ФОКСФОРД-СТИЛЬ) */}
      <div className="flex p-1.5 bg-slate-100 rounded-2xl gap-1 overflow-x-auto">
        {[
          { id: "schedule" as const, label: "Расписание уроков", icon: Calendar, badge: upcomingLessons.length },
          { id: "subjects" as const, label: "Мои предметы", icon: BookOpen },
          { id: "homework" as const, label: "Домашние задания", icon: FileText, badge: 1 },
          { id: "awards" as const, label: "Награды и звёзды", icon: Award },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                isSelected
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Icon className={`w-4 h-4 ${isSelected ? "text-blue-600" : "text-slate-400"}`} />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isSelected ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-600"
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 4. ТАБ: РАСПИСАНИЕ УРОКОВ */}
      {activeTab === "schedule" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>Предстоящие и прошедшие уроки</span>
            </h2>
            <span className="text-xs text-slate-500 font-medium">Время московское (МСК)</span>
          </div>

          {upcomingLessons.length === 0 && !liveLesson ? (
            <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center space-y-2">
              <div className="text-3xl">🗓️</div>
              <h3 className="font-bold text-slate-800 text-sm">На ближайшие дни уроков не запланировано</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Преподаватель добавит новый урок в ваше расписание.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingLessons.map((lesson) => (
                <div
                  key={lesson.id}
                  className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4 hover:border-blue-300 transition group"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-xl">
                      {lesson.subjectName}
                    </span>
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-xl">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      {format(new Date(lesson.startTime), "d MMMM, HH:mm", { locale: ru })}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base group-hover:text-blue-600 transition">
                      {lesson.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Преподаватель: <strong className="text-slate-800">{lesson.teacherName}</strong>
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Комната и доска готовы
                    </span>
                    <Link
                      href={`/room/${lesson.roomName}`}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-blue-500/20 transition active:scale-95"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Войти</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Завершённые уроки */}
          {completedLessons.length > 0 && (
            <div className="space-y-3 pt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
                Пройденные уроки
              </h3>
              <div className="bg-white rounded-3xl divide-y divide-slate-100 border border-slate-200 overflow-hidden shadow-xs">
                {completedLessons.map((lesson) => (
                  <div key={lesson.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{lesson.title}</span>
                        <span className="text-[11px] text-slate-400">
                          ({format(new Date(lesson.startTime), "d MMMM yyyy", { locale: ru })})
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Преподаватель: {lesson.teacherName}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span className="px-3 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                        5 звёзд
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. ТАБ: МОИ ПРЕДМЕТЫ (ФОКСФОРД СТИЛЬ) */}
      {activeTab === "subjects" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-700">
              Ваши учебные курсы и прогресс
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {subjectsList.map((sub, i) => (
              <div
                key={i}
                className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl">{sub.icon}</span>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-sm sm:text-base leading-snug">
                        {sub.name}
                      </h3>
                      <p className="text-[11px] text-slate-500">{sub.teacher}</p>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-3">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-600">Освоено тем:</span>
                      <span className="text-blue-600">{sub.topicsCompleted} из {sub.totalTopics} ({sub.progress}%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-500"
                        style={{ width: `${sub.progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 text-[11px]">Индивидуальный план</span>
                  <span className="font-bold text-blue-600 flex items-center gap-1 hover:underline cursor-pointer">
                    <span>Темы курса</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. ТАБ: ДОМАШНИЕ ЗАДАНИЯ (ФОКСФОРД СТИЛЬ) */}
      {activeTab === "homework" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-700">
              Домашние задания и практика
            </h2>
            <span className="text-xs text-slate-500 font-medium">Проверяются репетитором</span>
          </div>

          <div className="bg-white rounded-3xl divide-y divide-slate-100 border border-slate-200 overflow-hidden shadow-xs">
            {homeworkList.map((hw) => (
              <div key={hw.id} className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {hw.subject}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${hw.badgeColor}`}>
                      {hw.statusText}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                    {hw.title}
                  </h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Срок сдачи: {hw.deadline}</span>
                  </p>
                </div>

                <button
                  type="button"
                  className="px-4 py-2.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs transition cursor-pointer self-start sm:self-auto shrink-0"
                >
                  Открыть задание →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. ТАБ: НАГРАДЫ И ЗВЁЗДЫ */}
      {activeTab === "awards" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-700">
              Коллекция наград и бейджей
            </h2>
            <span className="text-xs font-bold text-amber-600">Всего звёзд: 28 ⭐</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {achievements.map((ach, i) => (
              <div
                key={i}
                className={`rounded-3xl p-5 border text-center space-y-2 transition ${
                  ach.unlocked
                    ? "bg-white border-amber-200/80 shadow-xs"
                    : "bg-slate-50 border-slate-200/70 opacity-60"
                }`}
              >
                <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center text-2xl bg-amber-50 border border-amber-100 shadow-2xs">
                  {ach.icon}
                </div>
                <h3 className="font-extrabold text-sm text-slate-900">{ach.title}</h3>
                <p className="text-xs text-slate-500 leading-tight">{ach.desc}</p>
                <div className="pt-2">
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    ach.unlocked ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                  }`}>
                    {ach.unlocked ? "Получено ✓" : "В процессе..."}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
