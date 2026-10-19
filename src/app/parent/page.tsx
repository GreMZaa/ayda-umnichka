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
  Star,
  FileText,
  AlertCircle,
  ChevronRight,
  BookOpen,
  ArrowRight,
  Sparkles,
  MessageSquare,
  PlusCircle,
  HelpCircle,
  ShieldCheck,
  User,
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  SlidersHorizontal,
  LayoutGrid,
  List,
  X,
} from "lucide-react";
import { format, startOfWeek, addDays, isSameDay, addWeeks, subWeeks } from "date-fns";
import { ru } from "date-fns/locale";
import { getSupabase } from "@/lib/supabase";
import { fetchWithAuth } from "@/lib/api-client";
import ScheduleCalendar from "@/components/ScheduleCalendar";

interface Child {
  id: string;
  name: string;
  grade: string;
  avatar: string;
  balance: number;
  stars: number;
  nextLesson: string;
  teacher: string;
  subject: string;
}

const AVATAR_OPTIONS = [
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1588072432836-e10032774350?w=200&h=200&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1544717305-2782549b5136?w=200&h=200&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=200&h=200&fit=crop&crop=faces",
];

const GRADES = [
  "Дошкольник",
  "1 класс",
  "2 класс",
  "3 класс",
  "4 класс",
  "5 класс",
  "6 класс",
  "7 класс",
  "8 класс",
  "9 класс",
  "10 класс",
  "11 класс",
];

export default function ParentCabinet() {
  const [parentName, setParentName] = useState("Родитель");

  useEffect(() => {
    const client = getSupabase();
    if (client) {
      client.auth.getSession().then(({ data }) => {
        if (data?.session?.user) {
          const meta = data.session.user.user_metadata || {};
          if (meta.full_name) {
            setParentName(meta.full_name);
          } else if (data.session.user.email) {
            setParentName(data.session.user.email.split("@")[0]);
          }
        }
      });
    }
  }, []);

  const defaultChildren: Child[] = [
    {
      id: "00000000-0000-0000-0000-000000000003",
      name: "Артём Смирнов",
      grade: "3 класс",
      avatar: AVATAR_OPTIONS[0],
      balance: 8,
      stars: 28,
      nextLesson: "Сегодня, 15:00",
      teacher: "Анна Сергеевна Иванова",
      subject: "Математика и логика",
    },
    {
      id: "00000000-0000-0000-0000-000000000004",
      name: "Алиса Смирнова",
      grade: "1 класс",
      avatar: AVATAR_OPTIONS[1],
      balance: 6,
      stars: 19,
      nextLesson: "Завтра, 16:30",
      teacher: "Елена Викторовна Смирнова",
      subject: "Русский язык и чтение",
    },
  ];

  const [children, setChildren] = useState<Child[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ayda_parent_children");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error(e);
        }
      }
    }
    return defaultChildren;
  });

  const [selectedChildId, setSelectedChildId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ayda_parent_children");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.length > 0) return parsed[0].id;
        } catch (e) {}
      }
    }
    return defaultChildren[0].id;
  });

  const [activeTab, setActiveTab] = useState<"reports" | "schedule" | "billing">("reports");
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Состояние модального окна добавления / редактирования ребенка
  const [childModalOpen, setChildModalOpen] = useState(false);
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [childFormName, setChildFormName] = useState("");
  const [childFormGrade, setChildFormGrade] = useState("3 класс");
  const [childFormAvatar, setChildFormAvatar] = useState(AVATAR_OPTIONS[0]);

  // Сохранение детей в localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("ayda_parent_children", JSON.stringify(children));
    }
  }, [children]);

  // Загрузка реальных учеников из Supabase
  useEffect(() => {
    const client = getSupabase();
    if (client) {
      client
        .from("profiles")
        .select("*")
        .eq("role", "STUDENT")
        .then(({ data }) => {
          if (data && data.length > 0) {
            const mapped: Child[] = data.map((d: any, index: number) => ({
              id: d.id,
              name: d.name,
              grade: d.bio || "3 класс",
              avatar: d.avatar_url || AVATAR_OPTIONS[index % AVATAR_OPTIONS.length],
              balance: 6 + index * 2,
              stars: 25 + index * 4,
              nextLesson: "Сегодня, 15:00",
              teacher: "Анна Сергеевна Иванова",
              subject: "Математика и логика",
            }));
            setChildren(mapped);
            if (!mapped.some((c) => c.id === selectedChildId)) {
              setSelectedChildId(mapped[0].id);
            }
          }
        });
    }
  }, []);

  const selectedChild = children.find((c) => c.id === selectedChildId) || children[0] || defaultChildren[0];

  useEffect(() => {
    setLoading(true);
    fetchWithAuth(`/api/lessons?studentId=${selectedChildId}`)
      .then((res) => res.json())
      .then((data) => {
        setLessons(Array.isArray(data) ? data : []);
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

  const initial = parentName.charAt(0).toUpperCase();

  // Открытие модалки добавления ребенка
  const handleOpenAddChild = () => {
    setEditingChild(null);
    setChildFormName("");
    setChildFormGrade("3 класс");
    setChildFormAvatar(AVATAR_OPTIONS[0]);
    setChildModalOpen(true);
  };

  // Открытие модалки редактирования ребенка
  const handleOpenEditChild = (e: React.MouseEvent, child: Child) => {
    e.stopPropagation();
    setEditingChild(child);
    setChildFormName(child.name);
    setChildFormGrade(child.grade);
    setChildFormAvatar(child.avatar);
    setChildModalOpen(true);
  };

  // Удаление ребенка
  const handleDeleteChild = (e: React.MouseEvent, childId: string) => {
    e.stopPropagation();
    if (children.length <= 1) {
      alert("В кабинете должен оставаться как минимум один ребёнок.");
      return;
    }
    const target = children.find((c) => c.id === childId);
    if (!confirm(`Вы действительно хотите удалить профиль «${target?.name}»?`)) {
      return;
    }
    const nextList = children.filter((c) => c.id !== childId);
    setChildren(nextList);
    if (selectedChildId === childId) {
      setSelectedChildId(nextList[0].id);
    }
  };

  // Сохранение ребенка (добавление или редактирование)
  const handleSaveChild = (e: React.FormEvent) => {
    e.preventDefault();
    if (!childFormName.trim()) return;

    if (editingChild) {
      // Редактирование
      const updated = children.map((c) =>
        c.id === editingChild.id
          ? {
              ...c,
              name: childFormName.trim(),
              grade: childFormGrade,
              avatar: childFormAvatar,
            }
          : c
      );
      setChildren(updated);
    } else {
      // Добавление нового
      const newChild: Child = {
        id: "child-" + Date.now(),
        name: childFormName.trim(),
        grade: childFormGrade,
        avatar: childFormAvatar,
        balance: 8,
        stars: 10,
        nextLesson: "Расписание формируется",
        teacher: "Анна Сергеевна Иванова",
        subject: "Математика и логика",
      };
      setChildren([...children, newChild]);
      setSelectedChildId(newChild.id);
    }

    setChildModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* 1. ШАПКА РОДИТЕЛЯ В СТИЛЕ FOXFORD (Без кнопки «Пополнить баланс» по требованию) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="relative">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white font-black text-2xl sm:text-3xl flex items-center justify-center shadow-lg shadow-amber-500/20 ring-4 ring-amber-50">
                {initial || <Users className="w-8 h-8" />}
              </div>
              <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-xs text-white shadow-xs">
                ✓
              </span>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  {parentName}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                  Родительский контроль
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>Центр «АйДаУмничка»</span>
                <span>•</span>
                <span>Детей на обучении: {children.length}</span>
                <span>•</span>
                <span className="font-bold text-slate-700">Баланс уроков: {selectedChild?.balance || 0}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 w-full lg:w-auto">
            <a
              href="tel:+79954854667"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-bold text-xs sm:text-sm transition border border-slate-200/80 cursor-pointer"
              title="Связаться с куратором центра"
            >
              <PhoneCall className="w-4 h-4 text-slate-500" />
              <span>Куратор центра</span>
            </a>
          </div>
        </div>
      </div>

      {/* 2. СЕЛЕКТОР ДЕТЕЙ: ДОБАВЛЕНИЕ, РЕДАКТИРОВАНИЕ, УДАЛЕНИЕ */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
              Обучающиеся дети ({children.length}):
            </span>
          </div>
          <button
            type="button"
            onClick={handleOpenAddChild}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-bold text-xs transition cursor-pointer shadow-2xs active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Добавить ребёнка</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {children.map((child) => {
            const isSelected = child.id === selectedChildId;
            return (
              <div
                key={child.id}
                onClick={() => setSelectedChildId(child.id)}
                className={`p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border text-left transition flex items-center justify-between gap-3 sm:gap-4 relative cursor-pointer group ${
                  isSelected
                    ? "bg-white border-blue-600 shadow-md ring-2 ring-blue-500/10"
                    : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                }`}
              >
                <div className="flex items-center gap-3 sm:gap-3.5">
                  <img
                    src={child.avatar}
                    alt={child.name}
                    className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl object-cover border border-slate-200 shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <h3 className="font-extrabold text-slate-900 text-xs sm:text-base">{child.name}</h3>
                      <span className="text-[10px] sm:text-[11px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md bg-blue-50 text-blue-700">
                        {child.grade}
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1">
                      Урок: <strong className="text-slate-800">{child.nextLesson}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5 sm:gap-2 shrink-0">
                  <div className="flex items-center gap-1">
                    {/* Кнопка Редактировать */}
                    <button
                      type="button"
                      onClick={(e) => handleOpenEditChild(e, child)}
                      className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer active:scale-95"
                      title="Редактировать профиль ребёнка"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {/* Кнопка Удалить */}
                    <button
                      type="button"
                      onClick={(e) => handleDeleteChild(e, child.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer active:scale-95"
                      title="Удалить ребёнка"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="text-right">
                    <div className="text-[11px] sm:text-xs font-black text-emerald-800 bg-emerald-50 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-xl border border-emerald-200">
                      {child.balance} ур.
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. УРОК ИДЁТ ПРЯМО СЕЙЧАС */}
      {liveLesson && (
        <div className="bg-emerald-50 border-2 border-emerald-500 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-in fade-in duration-300">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>{selectedChild.name} сейчас на онлайн-уроке</span>
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
              {liveLesson.title}
            </h2>
            <p className="text-xs text-slate-600">
              Преподаватель: <strong>{liveLesson.teacherName}</strong> • До {format(new Date(liveLesson.endTime), "HH:mm")}
            </p>
          </div>

          <Link
            href={`/room/${liveLesson.roomName}`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition self-stretch sm:self-auto justify-center cursor-pointer"
          >
            <Video className="w-4 h-4" />
            <span>Присутствовать на уроке</span>
            <ArrowRight className="w-4 h-4 ml-0.5" />
          </Link>
        </div>
      )}

      {/* 4. СЕКЦИИ И ТАБЫ РОДИТЕЛЯ */}
      <div className="space-y-4">
        <div className="flex p-1.5 bg-slate-100 rounded-2xl max-w-lg gap-1">
          <button
            onClick={() => setActiveTab("reports")}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "reports"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileText className={`w-3.5 h-3.5 ${activeTab === "reports" ? "text-blue-600" : "text-slate-400"}`} />
            <span>Отчёты и оценки ({completedLessons.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("schedule")}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "schedule"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Calendar className={`w-3.5 h-3.5 ${activeTab === "schedule" ? "text-blue-600" : "text-slate-400"}`} />
            <span>Расписание ({upcomingLessons.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("billing")}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "billing"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <CreditCard className={`w-3.5 h-3.5 ${activeTab === "billing" ? "text-blue-600" : "text-slate-400"}`} />
            <span>Абонемент</span>
          </button>
        </div>

        {/* ВКЛАДКА 1: ПОДРОБНЫЕ ОТЧЁТЫ РЕПЕТИТОРА */}
        {activeTab === "reports" && (
          <div className="space-y-4">
            {completedLessons.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center text-slate-500 text-xs">
                Пока нет завершённых уроков с отчётами для {selectedChild.name}
              </div>
            ) : (
              completedLessons.map((lesson) => (
                <div
                  key={lesson.id}
                  className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4 hover:border-blue-200 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                          {lesson.subjectName}
                        </span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-500 font-medium">
                          {format(new Date(lesson.startTime), "d MMMM yyyy, HH:mm", { locale: ru })}
                        </span>
                      </div>
                      <h3 className="font-extrabold text-slate-900 text-base mt-1">
                        {lesson.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-extrabold text-xs">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                        <span>Оценка: 5 / 5</span>
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Урок проведён
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800">
                        <GraduationCap className="w-4 h-4 text-blue-600" />
                        <span>Что прошли на занятии:</span>
                      </div>
                      <p className="text-slate-600 leading-relaxed">
                        Разобрали тему «Олимпиадные логические задачи и уравнения». {selectedChild.name} отлично усвоил новый метод решения, активно работал на доске.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-blue-900">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        <span>Совет родителям на дом:</span>
                      </div>
                      <p className="text-slate-700 leading-relaxed">
                        Обязательно похвалите за самостоятельное решение 3-й задачи! Дома закрепить таблицу умножения на 7 и решить 2 коротких примера на стр. 14.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 pt-2">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Преподаватель:</span>
                      <strong className="text-slate-800">{lesson.teacherName}</strong>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Домашнее задание:</span>
                      <span className="font-bold text-emerald-700">✓ Проверено учителем</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ВКЛАДКА 2: РАСПИСАНИЕ-КАЛЕНДАРЬ КАК В ФОКСФОРДЕ (ПО ФОТО) */}
        {activeTab === "schedule" && (
          <ScheduleCalendar
            role="parent"
            lessons={lessons}
          />
        )}

        {/* ВКЛАДКА 3: АБОНЕМЕНТ И БАЛАНС */}
        {activeTab === "billing" && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <span className="text-xs font-extrabold text-blue-700 uppercase tracking-wider">
                  Текущий тарифный план
                </span>
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1">
                  Абонемент «Оптимальный» (8 уроков в месяц)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Действует до 30 ноября 2026 г. • Прикреплен к {selectedChild.name}
                </p>
              </div>

              <button
                onClick={() => setShowTopupModal(true)}
                className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/25 transition cursor-pointer"
              >
                Продлить абонемент
              </button>
            </div>

            {/* Прогресс использования занятий */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-600">Использовано уроков:</span>
                <span className="text-slate-900">2 из 8 (осталось {selectedChild.balance})</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div className="bg-blue-600 h-3 rounded-full" style={{ width: "25%" }} />
              </div>
            </div>

            {/* История списаний */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block">
                История посещений и оплат:
              </span>
              <div className="divide-y divide-slate-100 text-xs text-slate-600">
                <div className="py-3 flex items-center justify-between">
                  <span>Урок по математике (Анна Сергеевна)</span>
                  <span className="font-bold text-slate-800">-1 занятие (17 октября)</span>
                </div>
                <div className="py-3 flex items-center justify-between">
                  <span>Урок по логике (Анна Сергеевна)</span>
                  <span className="font-bold text-slate-800">-1 занятие (14 октября)</span>
                </div>
                <div className="py-3 flex items-center justify-between text-emerald-700 font-bold">
                  <span>Оплата абонемента на 8 занятий через СБП</span>
                  <span>+8 занятий (10 октября)</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. МОДАЛЬНОЕ ОКНО ДОБАВЛЕНИЯ / РЕДАКТИРОВАНИЯ РЕБЁНКА */}
      {childModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-7 space-y-4 sm:space-y-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-slate-900 text-base">
                  {editingChild ? "Редактировать ребёнка" : "Добавить ребёнка"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setChildModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveChild} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Имя и фамилия ребёнка:
                </label>
                <input
                  type="text"
                  required
                  value={childFormName}
                  onChange={(e) => setChildFormName(e.target.value)}
                  placeholder="Например: Артём Смирнов"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Класс обучения:
                </label>
                <select
                  value={childFormGrade}
                  onChange={(e) => setChildFormGrade(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition cursor-pointer"
                >
                  {GRADES.map((g, idx) => (
                    <option key={idx} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Выберите аватарку:
                </label>
                <div className="flex items-center gap-2.5">
                  {AVATAR_OPTIONS.map((av, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setChildFormAvatar(av)}
                      className={`relative rounded-2xl overflow-hidden border-2 transition cursor-pointer ${
                        childFormAvatar === av
                          ? "border-blue-600 ring-2 ring-blue-600/30 scale-105"
                          : "border-slate-200 hover:border-slate-300 opacity-70 hover:opacity-100"
                      }`}
                    >
                      <img src={av} alt="avatar" className="w-12 h-12 object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setChildModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition cursor-pointer"
                >
                  {editingChild ? "Сохранить изменения" : "Добавить"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. МОДАЛЬНОЕ ОКНО ПОПОЛНЕНИЯ БАЛАНСА */}
      {showTopupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-7 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-slate-900 text-base">Пополнение абонемента</h3>
              </div>
              <button
                onClick={() => setShowTopupModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Выберите пакет занятий для <strong>{selectedChild.name}</strong>:
            </p>

            <div className="space-y-3">
              {[
                { count: "4 занятия", price: "4 800 ₽", benefit: "Пробный месяц" },
                { count: "8 занятий", price: "8 800 ₽", benefit: "Популярный (скидка 10%)" },
                { count: "16 занятий", price: "15 900 ₽", benefit: "Максимальный прогресс (скидка 18%)" },
              ].map((pack, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl border border-slate-200 hover:border-blue-500 bg-slate-50/50 hover:bg-blue-50/30 flex items-center justify-between cursor-pointer transition shadow-2xs"
                  onClick={() => {
                    alert(`Пакет «${pack.count}» выбран! Перенаправление на оплату через СБП...`);
                    setShowTopupModal(false);
                  }}
                >
                  <div>
                    <div className="font-extrabold text-slate-900 text-xs sm:text-sm">{pack.count}</div>
                    <div className="text-[11px] text-blue-600 font-semibold">{pack.benefit}</div>
                  </div>
                  <div className="font-black text-sm sm:text-base text-slate-900">{pack.price}</div>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-slate-400 text-center pt-2">
              🔒 Оплата защищена 54-ФЗ. Поддерживаются СБП, карты Мир, Visa, Mastercard.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
