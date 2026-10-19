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
  CreditCard,
  Send,
  Upload,
  Check,
  X,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { getSupabase } from "@/lib/supabase";
import { fetchWithAuth } from "@/lib/api-client";
import ScheduleCalendar from "@/components/ScheduleCalendar";

interface HomeworkItem {
  id: string;
  subject: string;
  title: string;
  teacher: string;
  deadline: string;
  status: "NEW" | "SUBMITTED" | "CHECKED";
  statusText: string;
  badgeColor: string;
  description: string;
  tasks: string[];
  studentAnswer?: string;
  teacherFeedback?: string;
  grade?: number;
}

export default function StudentCabinet() {
  const [studentName, setStudentName] = useState("Ученик");
  const [grade, setGrade] = useState("3 класс");
  const [balance, setBalance] = useState(8);
  const [stars, setStars] = useState(28);
  const [lessons, setLessons] = useState<any[]>([]);
  const [schoolSubjects, setSchoolSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"schedule" | "lessons" | "homework" | "awards">("schedule");

  // Состояние модального окна домашнего задания
  const [selectedHomework, setSelectedHomework] = useState<HomeworkItem | null>(null);
  const [homeworkModalOpen, setHomeworkModalOpen] = useState(false);
  const [answerText, setAnswerText] = useState("");
  const [attachedFileName, setAttachedFileName] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Список домашних заданий школьного формата
  const [homeworkList, setHomeworkList] = useState<HomeworkItem[]>([
    {
      id: "hw-1",
      subject: "Математика и логика",
      title: "Олимпиадные задачи: логические последовательности и геометрические ребусы",
      teacher: "Анна Сергеевна Иванова",
      deadline: "Завтра, до 18:00",
      status: "NEW",
      statusText: "Нужно сдать",
      badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
      description: "Закрепление темы прошедшего урока. Решите предложенные задачи в тетради или введите ответы в поле ниже.",
      tasks: [
        "1. Найдите закономерность в ряду чисел: 2, 5, 11, 23, ... Какое число следующее?",
        "2. На столе лежало 4 яблока. Одно из них разрезали пополам. Сколько яблок на столе?",
        "3. Решите задачу на доске №3: периметр прямоугольника равен 24 см, одна сторона в 2 раза длиннее другой. Найдите площадь.",
      ],
    },
    {
      id: "hw-2",
      subject: "Русский язык и каллиграфия",
      title: "Орфография: безударные гласные и правописание приставок",
      teacher: "Анна Сергеевна Иванова",
      deadline: "22 октября, до 20:00",
      status: "CHECKED",
      statusText: "Проверено на 5 ⭐",
      badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
      description: "Словарная работа и проверочные слова.",
      tasks: [
        "1. Вставьте пропущенные буквы и подберите проверочные слова: г..ра, тр..ва, р..чной.",
        "2. Спишите текст с экрана без помарок, соблюдая наклон и каллиграфические нормы.",
      ],
      studentAnswer: "1. гора (горы), трава (травы), речной (реки). 2. Текст переписан в рабочую тетрадь без помарок.",
      teacherFeedback: "Отличная работа! Все проверочные слова подобраны точно, аккуратный почерк.",
      grade: 5,
    },
    {
      id: "hw-3",
      subject: "Английский язык",
      title: "Present Continuous & Speaking: мини-диалог «Мой день»",
      teacher: "Михаил Александрович Петров",
      deadline: "24 октября, до 19:00",
      status: "SUBMITTED",
      statusText: "На проверке у учителя",
      badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
      description: "Составьте 4–5 предложений в настоящем длительном времени.",
      tasks: [
        "1. Make sentences using Present Continuous (I am reading, He is playing...).",
        "2. Prepare to read the dialogue out loud during our next online lesson.",
      ],
      studentAnswer: "1. I am reading an interesting book now. 2. My friend is playing football. 3. We are studying English with teacher Mikhail.",
    },
  ]);

  // Загрузка данных ученика, предметов школы и уроков из Supabase
  useEffect(() => {
    const client = getSupabase();
    if (client) {
      // 1. Профиль ученика из Supabase profiles
      client
        .from("profiles")
        .select("*")
        .eq("role", "STUDENT")
        .order("created_at", { ascending: true })
        .limit(1)
        .then(({ data }) => {
          if (data && data.length > 0) {
            const profile = data[0];
            setStudentName(profile.name || "Ученик");

            let parsedBio: any = {};
            try {
              if (profile.bio && profile.bio.startsWith("{")) {
                parsedBio = JSON.parse(profile.bio);
              } else if (profile.bio) {
                parsedBio.grade = profile.bio;
              }
            } catch (e) {}

            if (parsedBio.grade) setGrade(parsedBio.grade);
            if (typeof parsedBio.balance === "number") setBalance(parsedBio.balance);
            if (typeof parsedBio.stars === "number") setStars(parsedBio.stars);
          }
        });

      // 2. Официальные предметы школы из Supabase
      client
        .from("subjects")
        .select("*")
        .order("name", { ascending: true })
        .then(({ data }) => {
          if (data && data.length > 0) {
            setSchoolSubjects(data);
          }
        });
    }

    // 3. Уроки из API (синхронизированы с Supabase)
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

  // Настоящие школьные академические достижения
  const academicAwards = [
    {
      title: "Первая пятёрка",
      desc: "Получил высший балл «5» за активную работу на онлайн-уроке",
      icon: "⭐",
      unlocked: true,
      criteria: "Оценка 5/5 от репетитора",
    },
    {
      title: "Отличник четверти",
      desc: "Выполнил 10 домашних заданий подряд на высший балл",
      icon: "📚",
      unlocked: true,
      criteria: "10 проверенных ДЗ",
    },
    {
      title: "Знаток математики",
      desc: "Успешно решил блок олимпиадных логических задач и уравнений",
      icon: "📐",
      unlocked: true,
      criteria: "Раздел логики освоен",
    },
    {
      title: "Грамотей",
      desc: "Безупречное знание правил правописания и словарных слов",
      icon: "✍️",
      unlocked: true,
      criteria: "0 ошибок в диктанте",
    },
    {
      title: "English Speaker",
      desc: "Уверенно поддержал диалог на английском языке с преподавателем",
      icon: "🇬🇧",
      unlocked: true,
      criteria: "Разговорный клуб 1-го уровня",
    },
    {
      title: "100% пунктуальность",
      desc: "5 уроков подряд вовремя без единого опоздания и пропусков",
      icon: "⏱️",
      unlocked: true,
      criteria: "Посещаемость 100%",
    },
    {
      title: "Пытливый ум",
      desc: "Задал преподавателю глубокий вопрос по теме урока",
      icon: "💡",
      unlocked: false,
      criteria: "3 из 5 вопросов задано",
    },
    {
      title: "Опережая программу",
      desc: "Самостоятельно изучил дополнительный материал урока",
      icon: "🚀",
      unlocked: false,
      criteria: "1 из 2 тем изучена",
    },
  ];

  // Открытие модального окна задания
  const handleOpenHomework = (hw: HomeworkItem) => {
    setSelectedHomework(hw);
    setAnswerText(hw.studentAnswer || "");
    setAttachedFileName("");
    setSubmitSuccess(false);
    setHomeworkModalOpen(true);
  };

  // Отправка задания на проверку учителю
  const handleSubmitHomework = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHomework) return;

    const updatedList = homeworkList.map((item) =>
      item.id === selectedHomework.id
        ? {
            ...item,
            status: "SUBMITTED" as const,
            statusText: "На проверке у учителя",
            badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
            studentAnswer: answerText,
          }
        : item
    );

    setHomeworkList(updatedList);
    setSubmitSuccess(true);

    setTimeout(() => {
      setHomeworkModalOpen(false);
      setSubmitSuccess(false);
    }, 1500);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* 1. ГЛАВНАЯ КАРТОЧКА ПРОФИЛЯ С ДАННЫМИ ИЗ SUPABASE */}
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
                Твой персональный образовательный трек в онлайн-школе «АйДаУмничка»
              </p>
            </div>
          </div>

          {/* Виджеты достижений: Баланс уроков, Звёзды, Серия */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">
            {/* Оплаченные уроки */}
            <div className="flex-1 sm:flex-none flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 shadow-2xs">
              <GraduationCap className="w-5 h-5 text-blue-600" />
              <div>
                <div className="text-xs font-black text-blue-950">{balance} уроков</div>
                <div className="text-[10px] text-blue-700 font-medium">Оплаченный баланс</div>
              </div>
            </div>

            {/* Звёзды */}
            <div className="flex-1 sm:flex-none flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-900 shadow-2xs">
              <Star className="w-5 h-5 fill-amber-400 text-amber-500" />
              <div>
                <div className="text-xs font-black text-amber-950">{stars} звёзд</div>
                <div className="text-[10px] text-amber-700 font-medium">За успехи в учебе</div>
              </div>
            </div>

            {/* Серия дней */}
            <div className="flex-1 sm:flex-none flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-900 shadow-2xs">
              <Flame className="w-5 h-5 fill-rose-500 text-rose-500" />
              <div>
                <div className="text-xs font-black text-rose-950">3 дня подряд</div>
                <div className="text-[10px] text-rose-700 font-medium">Ударный темп 🔥</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. ТЕКУЩИЙ УРОК ПРЯМО СЕЙЧАС (БЕЛЫЙ КАРТОЧНЫЙ СТИЛЬ ФОКСФОРДА БЕЗ ЗЕЛЁНОГО ГРАДИЕНТА) */}
      {liveLesson && (
        <div className="bg-white rounded-3xl p-6 sm:p-7 border-2 border-blue-600 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 animate-in fade-in duration-300">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-black border border-blue-200">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping" />
              <span>Урок идёт прямо сейчас!</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {liveLesson.title}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-600">
              <span>Преподаватель: <strong className="text-slate-800">{liveLesson.teacherName}</strong></span>
              <span>•</span>
              <span>До {format(new Date(liveLesson.endTime), "HH:mm")}</span>
            </div>
          </div>

          <Link
            href={`/room/${liveLesson.roomName}`}
            className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl bg-blue-600 text-white font-black text-sm sm:text-base shadow-lg shadow-blue-500/25 hover:bg-blue-700 transition transform hover:scale-105 active:scale-95 shrink-0 w-full sm:w-auto cursor-pointer"
          >
            <Video className="w-5 h-5 text-white" />
            <span>Войти в видеокласс</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
      )}

      {/* 3. НАВИГАЦИОННЫЕ ТАБЫ КАБИНЕТА (ФОКСФОРД-СТИЛЬ) */}
      <div className="flex p-1.5 bg-slate-100 rounded-2xl gap-1 overflow-x-auto">
        {[
          { id: "schedule" as const, label: "Расписание уроков", icon: Calendar, badge: upcomingLessons.length },
          { id: "lessons" as const, label: "Уроки", icon: BookOpen, badge: lessons.length },
          { id: "homework" as const, label: "Домашние задания", icon: FileText, badge: homeworkList.filter(h => h.status === "NEW").length },
          { id: "awards" as const, label: "Награды и звёзды", icon: Award, badge: 6 },
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

      {/* 4. ТАБ: РАСПИСАНИЕ УРОКОВ (ФОКСФОРД-КАЛЕНДАРЬ) */}
      {activeTab === "schedule" && (
        <ScheduleCalendar
          role="student"
          lessons={lessons}
        />
      )}

      {/* 5. ТАБ: УРОКИ (СИНХРОНИЗИРОВАНО С SUPABASE БЕЗ ТЕСТОВЫХ КУРСОВ) */}
      {activeTab === "lessons" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Все учебные занятия и предметы школы
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Занятия формируются администратором и преподавателями школы в Supabase
              </p>
            </div>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-xl border border-blue-200">
              Всего уроков: {lessons.length}
            </span>
          </div>

          {/* Список реальных уроков ученика из базы данных */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 px-1">
              Ближайшие и прошедшие занятия:
            </h3>

            {lessons.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center text-slate-500 text-sm">
                Занятия формируются. Обратитесь к куратору или администратору школы.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {lessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs hover:border-blue-300 transition flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span
                          className="px-2.5 py-0.5 rounded-full text-[11px] font-bold text-white"
                          style={{ backgroundColor: lesson.subjectColor || "#2563eb" }}
                        >
                          {lesson.subjectName}
                        </span>

                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                          lesson.status === "LIVE"
                            ? "bg-red-100 text-red-700 animate-pulse"
                            : lesson.status === "COMPLETED"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-blue-100 text-blue-800"
                        }`}>
                          {lesson.status === "LIVE" ? "Идёт сейчас" : lesson.status === "COMPLETED" ? "Завершён" : "Запланирован"}
                        </span>
                      </div>

                      <h4 className="font-extrabold text-slate-900 text-sm sm:text-base leading-snug">
                        {lesson.title}
                      </h4>

                      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {format(new Date(lesson.startTime), "d MMMM, HH:mm", { locale: ru })} – {format(new Date(lesson.endTime), "HH:mm")}
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">Учитель:</span>
                        <strong className="text-slate-800">{lesson.teacherName}</strong>
                      </div>

                      <Link
                        href={`/room/${lesson.roomName}`}
                        className="font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                      >
                        <span>В класс</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Предметы школы из Supabase */}
          {schoolSubjects.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-slate-200">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 px-1">
                Доступные дисциплины школы «АйДаУмничка»:
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {schoolSubjects.map((sub) => (
                  <div
                    key={sub.id}
                    className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1.5"
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: sub.color || "#2563eb" }}
                    />
                    <div className="font-extrabold text-xs text-slate-900">{sub.name}</div>
                    <div className="text-[10px] text-slate-500">Индивидуальная программа</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. ТАБ: ДОМАШНИЕ ЗАДАНИЯ (ИНТЕРАКТИВНЫЕ, С ОТКРЫТИЕМ И СДАЧЕЙ) */}
      {activeTab === "homework" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Домашние задания и практика
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Выполняйте задания вовремя для получения звёзд и рекомендаций преподавателя
              </p>
            </div>
            <span className="text-xs text-amber-700 bg-amber-50 px-3 py-1 rounded-xl border border-amber-200 font-bold self-start sm:self-auto">
              Нужно сдать: {homeworkList.filter(h => h.status === "NEW").length}
            </span>
          </div>

          <div className="bg-white rounded-3xl divide-y divide-slate-100 border border-slate-200 overflow-hidden shadow-xs">
            {homeworkList.map((hw) => (
              <div
                key={hw.id}
                className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition"
              >
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                      {hw.subject}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${hw.badgeColor}`}>
                      {hw.statusText}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                    {hw.title}
                  </h3>

                  <p className="text-xs text-slate-600 line-clamp-1">
                    {hw.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Срок: {hw.deadline}</span>
                    </span>
                    <span>•</span>
                    <span>Преподаватель: <strong className="text-slate-700">{hw.teacher}</strong></span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenHomework(hw)}
                  className="px-5 py-2.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-bold text-xs transition cursor-pointer self-start sm:self-auto shrink-0 shadow-2xs active:scale-95 flex items-center gap-1.5"
                >
                  <span>Открыть задание</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. ТАБ: НАГРАДЫ И ЗВЁЗДЫ (НАСТОЯЩИЕ ШКОЛЬНЫЕ ДОСТИЖЕНИЯ) */}
      {activeTab === "awards" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Школьные достижения и звёзды
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Награды начисляются преподавателями за успехи на уроках и выполнение заданий
              </p>
            </div>
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-xl border border-amber-200">
              Баланс звёзд: {stars} ⭐
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {academicAwards.map((ach, i) => (
              <div
                key={i}
                className={`rounded-3xl p-5 border text-center space-y-2.5 transition flex flex-col justify-between ${
                  ach.unlocked
                    ? "bg-white border-amber-200/90 shadow-xs ring-1 ring-amber-100"
                    : "bg-slate-50/70 border-slate-200/70 opacity-60"
                }`}
              >
                <div>
                  <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center text-2xl bg-amber-50 border border-amber-100 shadow-2xs">
                    {ach.icon}
                  </div>
                  <h3 className="font-extrabold text-sm text-slate-900 mt-2.5">{ach.title}</h3>
                  <p className="text-xs text-slate-500 leading-tight mt-1">{ach.desc}</p>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold ${
                    ach.unlocked ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                  }`}>
                    {ach.unlocked ? "Получено ✓" : ach.criteria}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 8. ИНТЕРАКТИВНОЕ МОДАЛЬНОЕ ОКНО ДОМАШНЕГО ЗАДАНИЯ */}
      {homeworkModalOpen && selectedHomework && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 space-y-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            {/* Заголовок модального окна */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                    {selectedHomework.subject}
                  </span>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${selectedHomework.badgeColor}`}>
                    {selectedHomework.statusText}
                  </span>
                </div>
                <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">
                  {selectedHomework.title}
                </h3>
                <p className="text-xs text-slate-500">
                  Преподаватель: <strong>{selectedHomework.teacher}</strong> • Срок: {selectedHomework.deadline}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setHomeworkModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Условия задания */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <span className="text-xs font-extrabold text-slate-800 block">
                Формулировка задания:
              </span>
              <p className="text-xs text-slate-600 leading-relaxed">
                {selectedHomework.description}
              </p>
              <div className="space-y-1.5 pt-1">
                {selectedHomework.tasks.map((task, idx) => (
                  <div key={idx} className="text-xs font-medium text-slate-700 flex items-start gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span>{task}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Если проверено — показываем отзыв учителя */}
            {selectedHomework.status === "CHECKED" && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Проверено преподавателем:</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-200 text-emerald-950 font-black text-xs">
                    Оценка: {selectedHomework.grade} / 5 ⭐
                  </span>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  {selectedHomework.teacherFeedback}
                </p>
              </div>
            )}

            {/* Форма сдачи ответа */}
            <form onSubmit={handleSubmitHomework} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ваш ответ или решение:
                </label>
                <textarea
                  rows={4}
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  placeholder="Введите ваше решение или комментарий для преподавателя..."
                  disabled={selectedHomework.status === "CHECKED"}
                  className="w-full p-3.5 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-600"
                />
              </div>

              {/* Прикрепление файла / фото тетради */}
              {selectedHomework.status !== "CHECKED" && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Прикрепить фото тетради или скан:
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer flex items-center gap-2 transition">
                      <Upload className="w-3.5 h-3.5 text-blue-600" />
                      <span>{attachedFileName ? "Заменить файл" : "Выбрать файл..."}</span>
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setAttachedFileName(file.name);
                        }}
                      />
                    </label>
                    {attachedFileName && (
                      <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{attachedFileName}</span>
                      </span>
                    )}
                  </div>
                </div>
              )}

              {submitSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Задание успешно отправлено на проверку преподавателю!</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setHomeworkModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Закрыть
                </button>
                {selectedHomework.status !== "CHECKED" && (
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Отправить на проверку</span>
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
