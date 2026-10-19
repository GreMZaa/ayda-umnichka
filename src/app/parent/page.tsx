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
} from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { getSupabase } from "@/lib/supabase";
import { fetchWithAuth } from "@/lib/api-client";

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

  const defaultChildren = [
    {
      id: "00000000-0000-0000-0000-000000000003",
      name: "Артём Смирнов",
      grade: "3 класс",
      avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop&crop=faces",
      balance: 8,
      stars: 28,
      nextLesson: "Сегодня, 15:00",
      teacher: "Анна Сергеевна Иванова",
      subject: "Математика и логика",
    },
  ];

  const [children, setChildren] = useState<any[]>(defaultChildren);
  const [selectedChildId, setSelectedChildId] = useState(defaultChildren[0].id);
  const [activeTab, setActiveTab] = useState<"reports" | "schedule" | "billing">("reports");
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Загрузка реальных учеников из базы данных Supabase
  useEffect(() => {
    const client = getSupabase();
    if (client) {
      client
        .from("profiles")
        .select("*")
        .eq("role", "STUDENT")
        .then(({ data }) => {
          if (data && data.length > 0) {
            const mapped = data.map((d: any, index: number) => ({
              id: d.id,
              name: d.name,
              grade: d.bio || "3 класс",
              avatar: d.avatar_url || "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop&crop=faces",
              balance: 6 + index * 2,
              stars: 25 + index * 4,
              nextLesson: "Сегодня, 15:00",
              teacher: "Анна Сергеевна Иванова",
              subject: "Математика и логика",
            }));
            setChildren(mapped);
            setSelectedChildId(mapped[0].id);
          }
        });
    }
  }, []);

  const selectedChild = children.find((c) => c.id === selectedChildId) || children[0];

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

  return (
    <div className="space-y-6 pb-20">
      {/* 1. ШАПКА РОДИТЕЛЯ В СТИЛЕ FOXFORD */}
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
                <span className="font-bold text-slate-700">Баланс уроков: {selectedChild.balance}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full lg:w-auto">
            <button
              onClick={() => setShowTopupModal(true)}
              className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/25 transition cursor-pointer active:scale-98"
            >
              <CreditCard className="w-4 h-4" />
              <span>Пополнить баланс</span>
            </button>

            <a
              href="tel:88003020412"
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-bold text-xs sm:text-sm transition border border-slate-200/80"
              title="Связаться с куратором центра"
            >
              <PhoneCall className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">Куратор центра</span>
            </a>
          </div>
        </div>
      </div>

      {/* 2. СЕЛЕКТОР ДЕТЕЙ (FAMILY HUB В СТИЛЕ ФОКСФОРДА) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
            Обучающиеся дети:
          </span>
          <span className="text-xs text-slate-500 font-medium">
            Выберите ребёнка для отчетов и расписания
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {children.map((child) => {
            const isSelected = child.id === selectedChildId;
            return (
              <button
                key={child.id}
                onClick={() => setSelectedChildId(child.id)}
                className={`p-4 sm:p-5 rounded-3xl border text-left transition flex items-center justify-between gap-4 relative cursor-pointer ${
                  isSelected
                    ? "bg-white border-blue-600 shadow-md ring-2 ring-blue-500/10"
                    : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <img
                    src={child.avatar}
                    alt={child.name}
                    className="w-13 h-13 rounded-2xl object-cover border border-slate-200 shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">{child.name}</h3>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700">
                        {child.grade}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Ближайший урок: <strong className="text-slate-800">{child.nextLesson}</strong>
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs font-black text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                    Остаток: {child.balance} уроков
                  </div>
                  <div className="text-[11px] text-amber-600 font-bold mt-1.5 flex items-center justify-end gap-1">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                    <span>{child.stars} звёзд</span>
                  </div>
                </div>
              </button>
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

      {/* 4. СЕКЦИИ И ТАБЫ РОДИТЕЛЯ В СТИЛЕ ФОКСФОРДА */}
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

        {/* ВКЛАДКА 2: РАСПИСАНИЕ УРОКОВ */}
        {activeTab === "schedule" && (
          <div className="space-y-4">
            {upcomingLessons.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center text-slate-500 text-xs">
                Все запланированные уроки завершены. Обратитесь к куратору для составления нового расписания.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingLessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-3 hover:border-blue-300 transition"
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
                      <h4 className="font-extrabold text-slate-900 text-base">{lesson.title}</h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Преподаватель: <strong className="text-slate-800">{lesson.teacherName}</strong>
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-400">
                        Ссылка активируется за 5 мин до урока
                      </span>
                      <button
                        onClick={() => alert("Запрос на перенос урока отправлен куратору центра")}
                        className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                      >
                        Перенести урок
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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

      {/* МОДАЛЬНОЕ ОКНО ПОПОЛНЕНИЯ БАЛАНСА */}
      {showTopupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-4 shadow-2xl border border-slate-200">
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
