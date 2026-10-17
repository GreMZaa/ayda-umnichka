"use client";

import { useState } from "react";
import Link from "next/link";
import {
  GraduationCap,
  Users,
  User,
  ShieldCheck,
  Video,
  Check,
  Clock,
  ArrowRight,
  Calendar,
  Sparkles,
  Star,
  Play,
  Monitor,
  CheckCircle2,
  BookOpen,
  HelpCircle,
  ChevronDown,
  Layers,
  MessageSquare,
  Award,
  LogIn,
} from "lucide-react";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"teacher" | "student" | "parent">("teacher");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [selectedGrade, setSelectedGrade] = useState("3 класс");

  const subjects = [
    { name: "Математика и логика", grade: "1–8 классы", desc: "Устранение пробелов, опережение школьной программы, подготовка к олимпиадам", icon: "📐" },
    { name: "Русский язык и каллиграфия", grade: "1–6 классы", desc: "Грамотность, разбор правил, сочинения, красивый понятный почерк", icon: "✍️" },
    { name: "Английский язык", grade: "1–9 классы", desc: "Разговорная практика, преодоление языкового барьера, школьная программа", icon: "🇬🇧" },
    { name: "Подготовка к школе", grade: "5–7 лет", desc: "Чтение, основы счёта, развитие логического мышления и усидчивости", icon: "🎒" },
  ];

  const roleDetails = {
    teacher: {
      title: "Кабинет Преподавателя",
      subtitle: "Всё для эффективного ведения онлайн-уроков без рутины",
      features: [
        "Запуск защищенной видеокомнаты прямо из расписания в 1 клик",
        "Интерактивная доска для совместного решения примеров и задач",
        "Быстрый конструктор отчётов родителям: темы, оценки и рекомендации",
        "Полная история и динамика успеваемости каждого ученика",
      ],
      link: "/teacher",
      btnText: "Открыть кабинет преподавателя",
      badge: "Для репетиторов",
    },
    student: {
      title: "Кабинет Ученика",
      subtitle: "Понятное и вдохновляющее пространство для ребёнка",
      features: [
        "Никаких ссылок в мессенджерах и паролей — вход по одной большой кнопке",
        "Интерактивная виртуальная доска с маркерами разных цветов",
        "Мотивирующая система звёзд и наград за успехи на уроках",
        "Всегда видно, когда учитель зашёл в класс и готов к уроку",
      ],
      link: "/student",
      btnText: "Открыть кабинет ученика",
      badge: "Для детей",
    },
    parent: {
      title: "Кабинет Родителя",
      subtitle: "100% прозрачность обучения и уверенность в результате",
      features: [
        "Удобный профиль с переключением между всеми вашими детьми",
        "Подробный отчет репетитора после каждого занятия: что прошли и что закрепить",
        "Уведомления о статусе урока с возможностью мягко присутствовать в эфире",
        "Прозрачный учет баланса оплаченных уроков",
      ],
      link: "/parent",
      btnText: "Открыть кабинет родителя",
      badge: "Для родителей",
    },
  };

  const faqs = [
    {
      q: "Нужно ли скачивать Zoom, Skype или другие программы?",
      a: "Нет, совершенно ничего устанавливать не нужно. Все видеоуроки, звук, демонстрация экрана и интерактивная доска работают прямо в браузере (Google Chrome, Яндекс, Safari) на компьютере, планшете или телефоне.",
    },
    {
      q: "Как родитель узнает, как прошёл урок?",
      a: "После каждого занятия репетитор заполняет краткий структурированный отчёт: пройденная тема, оценка и персональный совет родителям. Этот отчёт мгновенно отображается в кабинете родителя.",
    },
    {
      q: "Можно ли подключить двоих или троих детей?",
      a: "Да, в личном кабинете родителя можно в один клик переключаться между детьми, видеть расписание, отчёты и баланс каждого ребёнка отдельно.",
    },
    {
      q: "Что если ребёнок случайно пропустит урок?",
      a: "В кабинете ученика и родителя видно точное время начала. Если планы изменились, занятие можно перенести заранее через администратора центра.",
    },
  ];

  return (
    <div className="space-y-20 pb-24">
      {/* 1. HERO СЕКЦИЯ (Современный минималистичный EdTech) */}
      <section className="pt-6 sm:pt-10 text-center max-w-4xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Платформа онлайн-обучения «АйДаУмничка»</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.12]">
          Онлайн-уроки с репетитором, <br className="hidden sm:inline" />
          <span className="text-blue-600">где всё понятно и удобно</span>
        </h1>

        <p className="text-base sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Встроенная видеосвязь прямо в браузере. Единая система доверия для преподавателя, ученика и родителя. Без установки Zoom и лишних регистраций.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-600/20 transition transform hover:-translate-y-0.5"
            id="hero-btn-login"
          >
            <LogIn className="w-4 h-4" />
            <span>Войти в личный кабинет</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/room/umnichka-live-room-demo"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-semibold text-sm shadow-xs transition"
          >
            <Video className="w-4 h-4 text-blue-600" />
            <span>Тест видеоурока</span>
          </Link>
        </div>

        {/* Панель быстрого входа в кабинеты прямо из первого экрана */}
        <div className="pt-2 flex flex-col items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Быстрый переход в нужный кабинет:</span>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Link
              href="/teacher"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200/80 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition shadow-2xs"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Преподаватель</span>
            </Link>
            <Link
              href="/student"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200/80 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition shadow-2xs"
            >
              <User className="w-3.5 h-3.5" />
              <span>Ученик</span>
            </Link>
            <Link
              href="/parent"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200/80 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition shadow-2xs"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Родитель</span>
            </Link>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 border border-purple-200/80 text-xs font-semibold text-purple-700 hover:bg-purple-100 transition shadow-2xs"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Управление (CRM)</span>
            </Link>
          </div>
        </div>

        {/* Доказательства и факты */}
        <div className="pt-8 flex flex-wrap items-center justify-center gap-6 sm:gap-12 text-xs font-medium text-slate-500 border-t border-slate-200/80 max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>0 программ для установки</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Отчет после каждого занятия</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Работает на ПК и планшетах</span>
          </div>
        </div>
      </section>

      {/* 2. ИНТЕРАКТИВНОЕ ОКНО ВИДЕОКЛАССА (Mac-style Mockup) */}
      <section className="max-w-5xl mx-auto">
        <div className="rounded-2xl border border-slate-300/80 bg-slate-900 shadow-2xl overflow-hidden">
          {/* Верхняя строка окна */}
          <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
              <span className="text-xs text-slate-400 font-mono ml-2 hidden sm:inline">
                meet.ayda-umnichka.ru/live-classroom
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                Урок идёт прямо сейчас
              </span>
            </div>
          </div>

          {/* Тело симулятора урока */}
          <div className="grid grid-cols-1 md:grid-cols-12 min-h-[380px] bg-slate-950">
            {/* Левая часть: видео преподавателя и ученика */}
            <div className="md:col-span-5 p-4 flex flex-col justify-between gap-4 border-b md:border-b-0 md:border-r border-slate-800">
              <div className="space-y-3">
                {/* Карточка преподавателя */}
                <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-800 aspect-video flex items-center justify-center">
                  <img
                    src="https://images.unsplash.com/photo-1544717305-2782549b5136?w=400&h=250&fit=crop&crop=faces"
                    alt="Учитель"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 bg-slate-950/80 backdrop-blur px-2.5 py-1 rounded text-[11px] text-white font-medium">
                    Анна Сергеевна (Преподаватель)
                  </div>
                </div>

                {/* Карточка ученика */}
                <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-800 aspect-video flex items-center justify-center">
                  <img
                    src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=250&fit=crop&crop=faces"
                    alt="Ученик"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 bg-slate-950/80 backdrop-blur px-2.5 py-1 rounded text-[11px] text-white font-medium">
                    Миша Смирнов (3 класс)
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-slate-400 text-xs">
                <span>Камера HD</span>
                <span>•</span>
                <span>Чистый звук</span>
                <span>•</span>
                <span>Защищенный WebRTC</span>
              </div>
            </div>

            {/* Правая часть: интерактивная рабочая доска урока */}
            <div className="md:col-span-7 bg-white p-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                      Интерактивная доска урока
                    </span>
                    <h3 className="font-bold text-slate-900 text-base">
                      Тема: Решение олимпиадных логических задач
                    </h3>
                  </div>
                  <span className="px-2 py-1 rounded bg-slate-100 text-slate-600 text-xs font-mono font-bold">
                    35:12
                  </span>
                </div>

                {/* Иллюстрация решения задачи на виртуальной доске */}
                <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-300 font-mono text-xs text-slate-800 space-y-2">
                  <p className="text-slate-500 font-sans font-medium">
                    Задача 3: В корзине лежат красные и синие шары...
                  </p>
                  <p className="font-bold text-blue-700">
                    2x + 4 = 18 &nbsp;➔&nbsp; 2x = 14 &nbsp;➔&nbsp; x = 7 шаров!
                  </p>
                  <div className="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-sans font-bold text-[11px]">
                    ✓ Решено верно учеником
                  </div>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed font-sans">
                  Преподаватель и ученик рисуют и пишут на одном экране в реальном времени. Никаких неудобных пересылок фото в мессенджеры.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-600 font-medium">
                  Хотите проверить качество связи прямо сейчас?
                </span>
                <Link
                  href="/room/umnichka-live-room-demo"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Войти в демо-класс</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. ИНТЕРАКТИВНЫЕ ЛИЧНЫЕ КАБИНЕТЫ ПО РОЛЯМ */}
      <section id="cabinets" className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
            Треугольник взаимодействия
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Кабинеты, созданные под конкретные задачи
          </h2>
          <p className="text-sm text-slate-500">
            Выберите роль, чтобы увидеть возможности рабочего места
          </p>
        </div>

        {/* Таб-переключатель */}
        <div className="flex p-1 bg-slate-100 rounded-xl max-w-md mx-auto">
          {(["teacher", "student", "parent"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition ${
                activeTab === tab
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab === "teacher" && "Преподаватель"}
              {tab === "student" && "Ученик"}
              {tab === "parent" && "Родитель"}
            </button>
          ))}
        </div>

        {/* Контент активного таба */}
        <div className="clean-card p-8 sm:p-10 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                {roleDetails[activeTab].badge}
              </span>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                {roleDetails[activeTab].title}
              </h3>
              <p className="text-sm text-slate-500 mt-0.5">
                {roleDetails[activeTab].subtitle}
              </p>
            </div>

            <Link
              href={roleDetails[activeTab].link}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition self-start sm:self-auto"
            >
              <span>{roleDetails[activeTab].btnText}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {roleDetails[activeTab].features.map((feature, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3.5 rounded-lg bg-slate-50 border border-slate-100">
                <Check className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                <span className="text-xs text-slate-700 leading-relaxed font-medium">
                  {feature}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. ПРЕДМЕТНЫЕ НАПРАВЛЕНИЯ */}
      <section className="max-w-5xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
            Обучение
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Направления занятий центра
          </h2>
          <p className="text-sm text-slate-500">
            Индивидуальные программы с учетом уровня и целей каждого ребёнка
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {subjects.map((sub) => (
            <div key={sub.name} className="clean-card p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl">{sub.icon}</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {sub.grade}
                </span>
              </div>
              <h3 className="font-bold text-slate-900 text-base">{sub.name}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {sub.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. ОТВЕТЫ НА ЧАСТЫЕ ВОПРОСЫ (FAQ) */}
      <section className="max-w-3xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Часто задаваемые вопросы
          </h2>
          <p className="text-sm text-slate-500">
            Все детали об уроках, подключении и форматах работы
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="clean-card overflow-hidden transition"
            >
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-sm text-slate-900"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-500 transition-transform ${
                    openFaq === i ? "rotate-180" : ""
                  }`}
                />
              </button>
              {openFaq === i && (
                <div className="px-5 pb-5 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 6. ФИНАЛЬНЫЙ CTA БЛОК */}
      <section className="clean-card p-8 sm:p-12 text-center bg-slate-900 text-white space-y-6 max-w-4xl mx-auto">
        <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
          Готовы протестировать онлайн-урок?
        </h2>
        <p className="text-slate-300 text-sm sm:text-base max-w-xl mx-auto">
          Откройте видеокомнату прямо сейчас — проверьте микрофон, камеру и интерактивную доску без регистрации.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition shadow-lg"
          >
            <LogIn className="w-4 h-4" />
            <span>Войти в личный кабинет</span>
          </Link>
          <Link
            href="/room/umnichka-live-room-demo"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition border border-slate-700"
          >
            <Video className="w-4 h-4 text-blue-400" />
            <span>Запустить тестовый урок</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
