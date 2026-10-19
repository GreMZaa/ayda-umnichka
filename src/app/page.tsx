"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  User,
  Check,
  ArrowRight,
  ChevronDown,
  LogIn,
  Sparkles,
  Phone,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { getSupabase } from "@/lib/supabase";

export default function HomePage() {
  // Страница входа предназначена только для Ученика и Родителя
  const [activeTab, setActiveTab] = useState<"student" | "parent">("student");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [selectedGrade, setSelectedGrade] = useState("3 класс");
  const [currentUserRole, setCurrentUserRole] = useState<{ roleKey: string; roleTitle: string } | null>(null);

  useEffect(() => {
    const client = getSupabase();
    if (client) {
      const updateRole = (user: any) => {
        if (user) {
          const rKey = (user.user_metadata?.role || "student").toLowerCase();
          setCurrentUserRole({
            roleKey: rKey,
            roleTitle:
              rKey === "parent"
                ? "кабинет Родителя"
                : rKey === "teacher"
                ? "кабинет Преподавателя"
                : rKey === "admin"
                ? "Панель управления"
                : "кабинет Ученика",
          });
        } else {
          setCurrentUserRole(null);
        }
      };

      client.auth.getSession().then(({ data }) => {
        updateRole(data?.session?.user);
      });

      const { data: authListener } = client.auth.onAuthStateChange((_event, session) => {
        updateRole(session?.user);
      });

      return () => {
        authListener?.subscription?.unsubscribe();
      };
    }
  }, []);

  // Состояние формы записи на пробный урок
  const [leadParentName, setLeadParentName] = useState("");
  const [leadChildName, setLeadChildName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [leadSubject, setLeadSubject] = useState("");
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadSuccess, setLeadSuccess] = useState(false);

  // Форматирование и маска российского номера телефона (+7 (XXX) XXX-XX-XX)
  const formatRussianPhone = (value: string): string => {
    const rawDigits = value.replace(/\D/g, "");
    if (!rawDigits) return "";

    let digits = rawDigits;
    // Если начинается с 8 или 7, отсекаем первую цифру для добавления +7
    if (digits.startsWith("8") || digits.startsWith("7")) {
      digits = digits.substring(1);
    }
    // Максимум 10 цифр после кода страны (+7)
    digits = digits.substring(0, 10);

    let formatted = "+7";
    if (digits.length > 0) {
      formatted += ` (${digits.substring(0, 3)}`;
    }
    if (digits.length >= 3) {
      formatted += `) ${digits.substring(3, 6)}`;
    }
    if (digits.length >= 6) {
      formatted += `-${digits.substring(6, 8)}`;
    }
    if (digits.length >= 8) {
      formatted += `-${digits.substring(8, 10)}`;
    }
    return formatted;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const digitsOnly = val.replace(/\D/g, "");
    if (!digitsOnly || (digitsOnly === "7" && val.length <= 2)) {
      setLeadPhone("");
      setPhoneError(null);
      return;
    }

    const formatted = formatRussianPhone(val);
    setLeadPhone(formatted);

    // Если уже введено полных 11 цифр, снимаем ошибку
    const totalDigits = formatted.replace(/\D/g, "");
    if (totalDigits.length === 11) {
      setPhoneError(null);
    }
  };

  const handlePhoneBlur = () => {
    if (!leadPhone.trim()) return;
    const totalDigits = leadPhone.replace(/\D/g, "");
    if (totalDigits.length !== 11) {
      setPhoneError("Номер введён не полностью. Требуется 11 цифр: +7 (XXX) XXX-XX-XX");
    } else {
      setPhoneError(null);
    }
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadParentName.trim()) return;

    const totalDigits = leadPhone.replace(/\D/g, "");
    if (totalDigits.length !== 11) {
      setPhoneError("Пожалуйста, укажите полный номер телефона: +7 (XXX) XXX-XX-XX");
      return;
    }

    setPhoneError(null);
    setLeadSubmitting(true);
    const client = getSupabase();
    if (client) {
      try {
        await client.from("leads").insert([
          {
            parent_name: leadParentName.trim(),
            child_name: leadChildName.trim() || null,
            phone: leadPhone.trim(),
            grade: selectedGrade,
            subject: leadSubject.trim() || "Математика и логика",
            status: "NEW",
          },
        ]);
        setLeadSuccess(true);
        setLeadParentName("");
        setLeadChildName("");
        setLeadPhone("");
        setLeadSubject("");
        setPhoneError(null);
      } catch (err) {
        console.error(err);
      } finally {
        setLeadSubmitting(false);
      }
    } else {
      setLeadSuccess(true);
      setLeadSubmitting(false);
    }
  };

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

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <a
            href="#trial"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm sm:text-base shadow-lg shadow-blue-600/25 transition transform hover:-translate-y-0.5 active:scale-98"
          >
            <Sparkles className="w-5 h-5" />
            <span>Записаться на пробный урок</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </a>

          {currentUserRole ? (
            <Link
              href={`/${currentUserRole.roleKey}`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-sm sm:text-base border border-blue-200 shadow-xs transition active:scale-98"
              id="hero-btn-login"
            >
              <User className="w-5 h-5 text-blue-600" />
              <span>Перейти в {currentUserRole.roleTitle}</span>
              <ArrowRight className="w-4 h-4 ml-0.5" />
            </Link>
          ) : (
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm sm:text-base border border-slate-200 shadow-xs transition active:scale-98"
              id="hero-btn-login"
            >
              <LogIn className="w-5 h-5" />
              <span>Войти в личный кабинет</span>
            </Link>
          )}
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
                    Преподаватель центра
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
                    Ученик на занятии
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
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Интерактивная доска урока
                    </span>
                    <h3 className="font-bold text-slate-900 text-base leading-snug">
                      Тема: Решение олимпиадных логических задач
                    </h3>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-mono font-bold">
                    35:12
                  </span>
                </div>

                {/* Иллюстрация решения задачи на виртуальной доске */}
                <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-300 font-mono text-xs text-slate-800 space-y-2">
                  <p className="text-slate-600 font-sans font-medium">
                    Задача 3: В корзине лежат красные и синие шары...
                  </p>
                  <p className="font-bold text-slate-900 text-sm">
                    2x + 4 = 18 &nbsp;➔&nbsp; 2x = 14 &nbsp;➔&nbsp; x = 7 шаров!
                  </p>
                  <div className="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-sans font-bold text-[11px]">
                    ✓ Решено верно учеником
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed font-sans">
                  Преподаватель и ученик рисуют и пишут формулы на одном экране в реальном времени. Все материалы сохраняются в кабинете.
                </p>
              </div>

              {/* Блок регистрации / входа (Вторичное действие согласно Правилу 11) */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs text-slate-700 font-medium text-center sm:text-left">
                  {currentUserRole
                    ? `Вы вошли в систему: доступен ваш ${currentUserRole.roleTitle}`
                    : "Хотите начать онлайн-обучение в центре «АйДаУмничка»?"}
                </span>
                {currentUserRole ? (
                  <Link
                    href={`/${currentUserRole.roleKey}`}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs transition shrink-0 active:scale-98"
                  >
                    <User className="w-3.5 h-3.5 text-blue-600" />
                    <span>В {currentUserRole.roleTitle}</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                  </Link>
                ) : (
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/90 text-slate-800 border border-slate-200/80 font-bold text-xs transition shrink-0 active:scale-98"
                  >
                    <LogIn className="w-3.5 h-3.5 text-slate-500" />
                    <span>Зарегистрироваться / Войти</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. ИНТЕРАКТИВНЫЕ ЛИЧНЫЕ КАБИНЕТЫ (ТОЛЬКО УЧЕНИК И РОДИТЕЛЬ) */}
      <section id="cabinets" className="max-w-5xl mx-auto space-y-6 scroll-mt-28 sm:scroll-mt-32">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Личные кабинеты
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-[1.2]">
            Всё необходимое для учебы и контроля
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Выберите роль, чтобы посмотреть возможности кабинета
          </p>
        </div>

        {/* Таб-переключатель (только Ученик и Родитель) */}
        <div className="flex p-1 bg-slate-100 rounded-xl max-w-xs mx-auto">
          {(["student", "parent"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition cursor-pointer ${
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
            <span className="inline-flex px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200/80 uppercase tracking-wider">
              {roleDetails[activeTab].badge}
            </span>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mt-2 leading-tight">
              {roleDetails[activeTab].title}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
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
      <section id="subjects" className="max-w-5xl mx-auto space-y-6 scroll-mt-28 sm:scroll-mt-32">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-[1.2]">
            Предметы и программы занятий
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Индивидуальные занятия с преподавателями нашего центра
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {subjects.map((sub, i) => (
            <div
              key={i}
              className="clean-card p-5 space-y-2 hover:border-slate-300 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{sub.icon}</span>
                    <h3 className="font-bold text-sm sm:text-base text-slate-900">{sub.name}</h3>
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/80">
                    {sub.grade}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {sub.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. ФОРМА ЗАПИСИ НА БЕСПЛАТНЫЙ ПРОБНЫЙ УРОК */}
      <section id="trial" className="max-w-5xl mx-auto scroll-mt-28 sm:scroll-mt-32">
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden relative p-6 sm:p-10">
          {/* Декоративная подсветка сверху */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600" />

          {/* Заголовок по центру */}
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-8">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/60 text-blue-700 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Бесплатное первое занятие</span>
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Запишитесь на вводный онлайн-урок
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Познакомим ребенка с репетитором, определим уровень знаний и составим персональный трек обучения.
            </p>
          </div>

          {/* 3 преимущества в ряд */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl mx-auto mb-8">
            {[
              { icon: "⏱️", title: "45 минут", desc: "Полноценный индивидуальный урок" },
              { icon: "🎯", title: "Диагностика знаний", desc: "Выявим пробелы и составим трек" },
              { icon: "💻", title: "Прямо в браузере", desc: "Без Zoom и установки программ" },
            ].map((item, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-center gap-3 text-left transition hover:bg-slate-100/70"
              >
                <span className="text-2xl shrink-0">{item.icon}</span>
                <div>
                  <div className="font-bold text-xs text-slate-900">{item.title}</div>
                  <div className="text-[11px] text-slate-500 leading-snug">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Форма записи */}
          <div className="max-w-2xl mx-auto">
            {leadSuccess ? (
              <div className="text-center py-10 space-y-3 bg-emerald-50/70 rounded-2xl border border-emerald-200 p-8 shadow-xs">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-xl text-emerald-950">Заявка успешно отправлена!</h3>
                <p className="text-xs sm:text-sm text-emerald-800 max-w-md mx-auto leading-relaxed">
                  Наш методист свяжется с вами в течение 15 минут, чтобы согласовать удобный день и время для бесплатного занятия.
                </p>
                <button
                  onClick={() => setLeadSuccess(false)}
                  className="mt-3 inline-block text-xs font-bold text-emerald-700 hover:text-emerald-900 underline underline-offset-4 cursor-pointer"
                >
                  Отправить ещё одну заявку
                </button>
              </div>
            ) : (
              <form onSubmit={handleLeadSubmit} className="bg-slate-50/60 p-6 sm:p-7 rounded-2xl border border-slate-200/80 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Ваше имя (родитель):
                    </label>
                    <input
                      type="text"
                      required
                      value={leadParentName}
                      onChange={(e) => setLeadParentName(e.target.value)}
                      placeholder="Например: Елена"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus:bg-white text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition placeholder:text-slate-400 shadow-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Имя ребёнка (необязательно):
                    </label>
                    <input
                      type="text"
                      value={leadChildName}
                      onChange={(e) => setLeadChildName(e.target.value)}
                      placeholder="Например: Артём"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus:bg-white text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition placeholder:text-slate-400 shadow-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Телефон для связи:
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="tel"
                        required
                        value={leadPhone}
                        onChange={handlePhoneChange}
                        onBlur={handlePhoneBlur}
                        placeholder="+7 (999) 000-00-00"
                        className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-medium focus:outline-none transition placeholder:text-slate-400 shadow-xs ${
                          phoneError
                            ? "border-rose-400 bg-rose-50/30 text-rose-900 focus:border-rose-600 focus:ring-1 focus:ring-rose-600"
                            : "border-slate-200 bg-white hover:border-slate-300 focus:bg-white text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        }`}
                      />
                    </div>
                    {phoneError && (
                      <p className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{phoneError}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Интересующий предмет:
                    </label>
                    <input
                      type="text"
                      required
                      value={leadSubject}
                      onChange={(e) => setLeadSubject(e.target.value)}
                      placeholder="Например: Математика, 3 класс"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus:bg-white text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition placeholder:text-slate-400 shadow-xs"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={leadSubmitting}
                  className="w-full mt-2 py-3.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm transition shadow-md shadow-blue-600/25 flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{leadSubmitting ? "Отправляем заявку..." : "Записаться на бесплатный пробный урок"}</span>
                  <ArrowRight className="w-4 h-4 ml-0.5" />
                </button>

                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-slate-400 text-center pt-1 font-medium">
                  <span>🔒 152-ФЗ РФ</span>
                  <span>•</span>
                  <span>Без спама</span>
                  <span>•</span>
                  <span>Свяжемся в течение 15 минут</span>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* 6. ОТВЕТЫ НА ЧАСТЫЕ ВОПРОСЫ (FAQ) */}
      <section id="faq" className="max-w-5xl mx-auto space-y-6 scroll-mt-28 sm:scroll-mt-32">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Часто задаваемые вопросы
          </h2>
          <p className="text-sm text-slate-600">
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
                className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-sm text-slate-900 cursor-pointer"
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
