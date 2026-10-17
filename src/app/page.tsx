"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Users,
  User,
  Check,
  ArrowRight,
  ChevronDown,
  LogIn,
} from "lucide-react";

export default function HomePage() {
  // Страница входа предназначена только для Ученика и Родителя
  const [activeTab, setActiveTab] = useState<"student" | "parent">("student");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [selectedGrade, setSelectedGrade] = useState("3 класс");

  const subjects = [
    { name: "Математика и логика", grade: "1–8 классы", desc: "Устранение пробелов, опережение школьной программы, подготовка к олимпиадам", icon: "📐" },
    { name: "Русский язык и каллиграфия", grade: "1–6 классы", desc: "Грамотность, разбор правил, сочинения, красивый понятный почерк", icon: "✍️" },
    { name: "Английский язык", grade: "1–9 классы", desc: "Разговорная практика, преодоление языкового барьера, школьная программа", icon: "🇬🇧" },
    { name: "Подготовка к школе", grade: "5–7 лет", desc: "Чтение, основы счёта, развитие логического мышления и усидчивости", icon: "🎒" },
  ];

  const roleDetails = {
    student: {
      title: "Кабинет Ученика",
      subtitle: "Понятное и вдохновляющее пространство для ребёнка",
      features: [
        "Никаких ссылок в мессенджерах и паролей — вход на урок по одной кнопке",
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
    <div className="space-y-16 sm:space-y-20 pb-20">
      {/* 1. HERO СЕКЦИЯ */}
      <section className="pt-6 sm:pt-12 text-center max-w-4xl mx-auto space-y-6">
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.12]">
          Онлайн-уроки с репетитором, <br className="hidden sm:inline" />
          <span className="text-blue-600">где всё понятно и удобно</span>
        </h1>

        <p className="text-base sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Встроенная видеосвязь прямо в браузере. Личные кабинеты для ученика и родителя. Без установки сторонних программ.
        </p>

        <div className="flex items-center justify-center pt-2">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm sm:text-base shadow-lg shadow-blue-600/25 transition transform hover:-translate-y-0.5 active:scale-98"
            id="hero-btn-login"
          >
            <LogIn className="w-5 h-5" />
            <span>Войти в личный кабинет</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
      </section>

      {/* 2. ИНТЕРАКТИВНОЕ ОКНО ВИДЕОКЛАССА (Светлый дизайн в стиле видеоурока) */}
      <section className="max-w-5xl mx-auto">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          {/* Тело симулятора урока в светлых цветах видеокомнаты */}
          <div className="grid grid-cols-1 md:grid-cols-12 min-h-[360px]">
            {/* Левая часть: видео преподавателя и ученика (светлый фон bg-slate-50 как в VideoRoom) */}
            <div className="md:col-span-5 bg-slate-50 p-4 sm:p-5 flex flex-col justify-between gap-4 border-b md:border-b-0 md:border-r border-slate-200">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Видеосвязь урока
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Урок в эфире
                  </span>
                </div>

                {/* Карточка преподавателя */}
                <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-200 aspect-video shadow-xs flex items-center justify-center">
                  <img
                    src="https://images.unsplash.com/photo-1580894732444-8ecded7900cd?w=600&h=400&fit=crop&crop=faces"
                    alt="Преподаватель"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur px-2.5 py-1 rounded text-[11px] text-white font-medium">
                    Анна Сергеевна (Преподаватель)
                  </div>
                </div>

                {/* Карточка ученика */}
                <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-200 aspect-video shadow-xs flex items-center justify-center">
                  <img
                    src="https://images.unsplash.com/photo-1588072432836-e10032774350?w=600&h=400&fit=crop&crop=faces"
                    alt="Ученик"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur px-2.5 py-1 rounded text-[11px] text-white font-medium">
                    Миша Смирнов (3 класс)
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-slate-500 text-xs font-medium">
                <span>Камера HD</span>
                <span>•</span>
                <span>Чистый звук</span>
                <span>•</span>
                <span>Безопасное соединение</span>
              </div>
            </div>

            {/* Правая часть: интерактивная рабочая доска урока */}
            <div className="md:col-span-7 bg-white p-5 sm:p-6 flex flex-col justify-between space-y-4">
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
                  <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-mono font-bold">
                    35:12
                  </span>
                </div>

                {/* Иллюстрация решения задачи на виртуальной доске */}
                <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-300 font-mono text-xs text-slate-800 space-y-2">
                  <p className="text-slate-500 font-sans font-medium">
                    Задача 3: В корзине лежат красные и синие шары...
                  </p>
                  <p className="font-bold text-blue-700 text-sm">
                    2x + 4 = 18 &nbsp;➔&nbsp; 2x = 14 &nbsp;➔&nbsp; x = 7 шаров!
                  </p>
                  <div className="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-sans font-bold text-[11px]">
                    ✓ Решено верно учеником
                  </div>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed font-sans">
                  Преподаватель и ученик рисуют и пишут формулы на одном экране в реальном времени. Все материалы сохраняются в кабинете.
                </p>
              </div>

              {/* Блок регистрации / входа (Feedback 9) */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs text-slate-700 font-medium text-center sm:text-left">
                  Хотите начать онлайн-обучение в центре «АйДаУмничка»?
                </span>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition shrink-0"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Зарегистрироваться / Войти</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. ИНТЕРАКТИВНЫЕ ЛИЧНЫЕ КАБИНЕТЫ (ТОЛЬКО УЧЕНИК И РОДИТЕЛЬ) */}
      <section id="cabinets" className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
            Личные кабинеты
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Всё необходимое для учебы и контроля
          </h2>
          <p className="text-sm text-slate-500">
            Выберите роль, чтобы посмотреть возможности кабинета
          </p>
        </div>

        {/* Таб-переключатель (только Ученик и Родитель) */}
        <div className="flex p-1 bg-slate-100 rounded-xl max-w-xs mx-auto">
          {(["student", "parent"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition ${
                activeTab === tab
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab === "student" && "Ученик"}
              {tab === "parent" && "Родитель"}
            </button>
          ))}
        </div>

        {/* Контент активного таба */}
        <div className="clean-card p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
              {roleDetails[activeTab].badge}
            </span>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
              {roleDetails[activeTab].title}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {roleDetails[activeTab].subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {roleDetails[activeTab].features.map((feature, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <Check className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                <span className="text-xs text-slate-700 leading-relaxed font-medium">
                  {feature}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. НАПРАВЛЕНИЯ ЗАНЯТИЙ */}
      <section className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Предметы и программы занятий
          </h2>
          <p className="text-sm text-slate-500">
            Индивидуальные занятия с преподавателями нашего центра
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {subjects.map((sub, i) => (
            <div
              key={i}
              className="clean-card p-5 space-y-2 hover:border-slate-300 transition"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{sub.icon}</span>
                  <h3 className="font-bold text-sm text-slate-900">{sub.name}</h3>
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                  {sub.grade}
                </span>
              </div>
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
    </div>
  );
}
