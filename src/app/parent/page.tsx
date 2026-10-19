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
    <div className="space-y-6 pb-16">
      {/* 1. ШАПКА РОДИТЕЛЯ */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-amber-600 text-white font-extrabold text-xl flex items-center justify-center border-2 border-white shadow-sm ring-2 ring-amber-100">
              {initial || <Users className="w-7 h-7" />}
            </div>
            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-[10px] text-white">
              ✓
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900">
                {parentName}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                Родитель
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>Личный кабинет родителя</span>
              <span>•</span>
              <span>Детей в центре: {children.length}</span>
              <span>•</span>
              <span className="font-semibold text-slate-700">Общий баланс: 10 уроков</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => setShowTopupModal(true)}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Пополнить баланс</span>
          </button>

          <a
            href="tel:+79990001122"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition border border-slate-200/80"
            title="Связаться с куратором центра"
          >
            <PhoneCall className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden md:inline">Куратор центра</span>
          </a>
        </div>
      </div>

      {/* 2. ПЕРЕКЛЮЧАТЕЛЬ ДЕТЕЙ */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Выберите ребёнка:
          </span>
          <span className="text-xs text-slate-500">
            Нажмите на карточку для просмотра отчетов и расписания
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {children.map((child) => {
            const isSelected = child.id === selectedChildId;
            return (
              <button
                key={child.id}
                onClick={() => setSelectedChildId(child.id)}
                className={`p-4 rounded-2xl border text-left transition flex items-center justify-between gap-3 relative cursor-pointer ${
                  isSelected
                    ? "bg-white border-blue-600 shadow-sm ring-2 ring-blue-500/10"
                    : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <img
                    src={child.avatar}
                    alt={child.name}
                    className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-sm">{child.name}</h3>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                        {child.grade}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Ближайший урок: <strong className="text-slate-800">{child.nextLesson}</strong>
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                    Остаток: {child.balance} уроков
                  </div>
                  <div className="text-[11px] text-amber-600 font-semibold mt-1 flex items-center justify-end gap-1">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                    <span>{child.stars} звёзд</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. ОПОВЕЩЕНИЕ: УРОК ИДЕТ ПРЯМО СЕЙЧАС */}
      {liveLesson && (
        <div className="bg-emerald-50 border-2 border-emerald-500/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-in fade-in duration-300">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>{selectedChild.name} сейчас на уроке онлайн</span>
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
              {liveLesson.title}
            </h2>
            <p className="text-xs text-slate-600">
              Преподаватель: <strong>{liveLesson.teacherName}</strong> • Окончание в {format(new Date(liveLesson.endTime), "HH:mm")}
            </p>
          </div>

          <Link
            href={`/room/${liveLesson.roomName}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition self-stretch sm:self-auto justify-center"
          >
            <Video className="w-4 h-4" />
            <span>Присутствовать на уроке</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* 4. ОСНОВНЫЕ ВКЛАДКИ КАБИНЕТА РОДИТЕЛЯ (Спокойный стиль табов по Правилу 6) */}
      <div className="space-y-4">
        {/* Переключатель вкладок */}
        <div className="flex p-1 bg-slate-100 rounded-xl max-w-md">
          <button
            onClick={() => setActiveTab("reports")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === "reports"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileText className={`w-3.5 h-3.5 ${activeTab === "reports" ? "text-slate-700" : "text-slate-400"}`} />
            <span>Отчёты и оценки ({completedLessons.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("schedule")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === "schedule"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Calendar className={`w-3.5 h-3.5 ${activeTab === "schedule" ? "text-slate-700" : "text-slate-400"}`} />
            <span>Расписание ({upcomingLessons.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("billing")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === "billing"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <CreditCard className={`w-3.5 h-3.5 ${activeTab === "billing" ? "text-slate-700" : "text-slate-400"}`} />
            <span>Абонемент</span>
          </button>
        </div>

        {/* ВКЛАДКА 1: ОТЧЁТЫ РЕПЕТИТОРА (САМОЕ ВАЖНОЕ ДЛЯ РОДИТЕЛЯ) */}
        {activeTab === "reports" && (
          <div className="space-y-3">
            {completedLessons.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-slate-600 text-xs">
                Пока нет завершённых уроков с отчётами для {selectedChild.name}
              </div>
            ) : (
              completedLessons.map((lesson) => (
                <div
                  key={lesson.id}
                  className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4 hover:border-slate-300 transition"
                >
                  {/* Верхняя строка отчета (Правило 5: некликабельный бейдж серым, а не синим) */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          {lesson.subjectName}
                        </span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-500 font-medium">
                          {format(new Date(lesson.startTime), "d MMMM yyyy, HH:mm", { locale: ru })}
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-base mt-0.5">
                        {lesson.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 px-3 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-bold text-xs">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                        <span>Оценка: 5 / 5</span>
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-100">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Урок проведён
                      </span>
                    </div>
                  </div>

                  {/* Тело отчета репетитора */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800">
                        <GraduationCap className="w-4 h-4 text-blue-600" />
                        <span>Что прошли на занятии:</span>
                      </div>
                      <p className="text-slate-600 leading-relaxed">
                        Разобрали тему «Олимпиадные логические задачи и уравнения». {selectedChild.name} отлично усвоил новый метод решения, активно работал на доске.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-blue-900">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        <span>Совет родителям на дом:</span>
                      </div>
                      <p className="text-slate-700 leading-relaxed">
                        Обязательно похвалите за самостоятельное решение 3-й задачи! Дома закрепить таблицу умножения на 7 и решить 2 коротких примера на стр. 14.
                      </p>
                    </div>
                  </div>

                  {/* Преподаватель и статус домашки */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Преподаватель:</span>
                      <strong className="text-slate-800">{lesson.teacherName}</strong>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Домашнее задание:</span>
                      <span className="font-semibold text-emerald-700">✓ Проверено учителем</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ВКЛАДКА 2: РАСПИСАНИЕ УРОКОВ */}
        {activeTab === "schedule" && (
          <div className="space-y-3">
            {upcomingLessons.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-slate-500 text-xs">
                Все запланированные уроки завершены. Обратитесь к куратору для составления нового расписания.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {upcomingLessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-md">
                        {lesson.subjectName}
                      </span>
                      <span className="font-semibold text-slate-700 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {format(new Date(lesson.startTime), "d MMMM, HH:mm", { locale: ru })}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{lesson.title}</h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Преподаватель: <strong className="text-slate-700">{lesson.teacherName}</strong>
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-400">
                        Ссылка активируется за 5 мин до урока
                      </span>
                      <button
                        onClick={() => alert("Запрос на перенос урока отправлен куратору центра")}
                        className="text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer"
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
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                  Текущий тарифный план
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                  Абонемент «Оптимальный» (8 уроков в месяц)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Действует до 30 ноября 2026 г. • Прикреплен к {selectedChild.name}
                </p>
              </div>

              <button
                onClick={() => setShowTopupModal(true)}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition"
              >
                Продлить абонемент
              </button>
            </div>

            {/* Прогресс использования занятий */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-600">Использовано уроков:</span>
                <span className="text-slate-900">2 из 8 (осталось {selectedChild.balance})</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div className="bg-blue-600 h-3 rounded-full" style={{ width: "25%" }} />
              </div>
            </div>

            {/* История списаний */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold text-slate-700 block">
                История посещений и списаний:
              </span>
              <div className="divide-y divide-slate-100 text-xs text-slate-600">
                <div className="py-2.5 flex items-center justify-between">
                  <span>Урок по математике (Анна Сергеевна)</span>
                  <span className="font-semibold text-slate-800">-1 занятие (17 октября)</span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span>Урок по логике (Анна Сергеевна)</span>
                  <span className="font-semibold text-slate-800">-1 занятие (14 октября)</span>
                </div>
                <div className="py-2.5 flex items-center justify-between text-emerald-700 font-semibold">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">Пополнение абонемента</h3>
              </div>
              <button
                onClick={() => setShowTopupModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Выберите пакет занятий для <strong>{selectedChild.name}</strong>:
            </p>

            <div className="space-y-2.5">
              {[
                { count: "4 занятия", price: "4 800 ₽", benefit: "Пробный месяц" },
                { count: "8 занятий", price: "8 800 ₽", benefit: "Популярный (скидка 10%)" },
                { count: "16 занятий", price: "15 900 ₽", benefit: "Максимальный прогресс (скидка 18%)" },
              ].map((pack, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-500 bg-slate-50/50 flex items-center justify-between cursor-pointer transition"
                  onClick={() => {
                    alert(`Пакет «${pack.count}» выбран! Перенаправление на оплату через СБП...`);
                    setShowTopupModal(false);
                  }}
                >
                  <div>
                    <div className="font-bold text-slate-900 text-xs sm:text-sm">{pack.count}</div>
                    <div className="text-[11px] text-blue-600 font-medium">{pack.benefit}</div>
                  </div>
                  <div className="font-extrabold text-sm text-slate-900">{pack.price}</div>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-slate-400 text-center">
              Оплата защищена. Поддерживаются СБП, карты Мир, Visa, Mastercard.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
