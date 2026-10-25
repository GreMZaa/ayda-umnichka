'use client';

import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import BalanceWidget from '@/components/BalanceWidget';
import {
  Video,
  ArrowRight,
  Sparkles,
  UserCheck,
  Shield,
  GraduationCap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export default function HomePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeSlide, setActiveSlide] = useState<number>(0);

  const slides = [
    { id: 'hero', label: 'Главная', number: '01' },
    { id: 'onboarding', label: 'Знакомство', number: '02' },
    { id: 'progress', label: 'Прогресс', number: '03' },
    { id: 'portals', label: 'Разделы', number: '04' },
  ];

  const scrollToSlide = (index: number) => {
    if (!containerRef.current) return;
    const slideHeight = containerRef.current.clientHeight;
    containerRef.current.scrollTo({
      top: index * slideHeight,
      behavior: 'smooth',
    });
    setActiveSlide(index);
  };

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, clientHeight } = containerRef.current;
    const newIndex = Math.round(scrollTop / clientHeight);
    if (newIndex !== activeSlide && newIndex >= 0 && newIndex < slides.length) {
      setActiveSlide(newIndex);
    }
  };

  // Keyboard navigation for page-by-page листание
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        if (activeSlide < slides.length - 1) scrollToSlide(activeSlide + 1);
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        if (activeSlide > 0) scrollToSlide(activeSlide - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSlide, slides.length]);

  return (
    <div className="relative w-full h-[calc(100vh-5rem)] overflow-hidden bg-[#FFF7EE]">
      {/* ─────────────────────────────────────────────────────────────
          FLOATING SLIDE NAVIGATOR (Right Edge)
          ───────────────────────────────────────────────────────────── */}
      <nav
        aria-label="Навигация по экранам"
        className="fixed right-3 sm:right-6 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-2.5 bg-white/80 backdrop-blur-md p-2 rounded-full border border-[#F4E3D2] shadow-md"
      >
        <button
          onClick={() => activeSlide > 0 && scrollToSlide(activeSlide - 1)}
          disabled={activeSlide === 0}
          aria-label="Предыдущий экран"
          className="w-7 h-7 rounded-full flex items-center justify-center text-ink-500 hover:text-ink-900 hover:bg-[#FFF7EE] disabled:opacity-30 disabled:pointer-events-none transition-all"
        >
          <ChevronUp className="w-4 h-4" />
        </button>

        {slides.map((s, idx) => {
          const isActive = activeSlide === idx;
          return (
            <button
              key={s.id}
              onClick={() => scrollToSlide(idx)}
              aria-label={`Перейти к экрану ${s.label}`}
              className="group relative flex items-center justify-center p-1"
            >
              <div
                className={`transition-all duration-300 rounded-full ${
                  isActive
                    ? 'w-3 h-8 bg-coralAccent shadow-xs'
                    : 'w-2.5 h-2.5 bg-[#E4D1BF] hover:bg-coralAccent/60'
                }`}
              />

              {/* Tooltip on Hover */}
              <span className="pointer-events-none absolute right-10 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-xl bg-ink-900 text-white text-[11px] font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                {s.number}. {s.label}
              </span>
            </button>
          );
        })}

        <button
          onClick={() => activeSlide < slides.length - 1 && scrollToSlide(activeSlide + 1)}
          disabled={activeSlide === slides.length - 1}
          aria-label="Следующий экран"
          className="w-7 h-7 rounded-full flex items-center justify-center text-ink-500 hover:text-ink-900 hover:bg-[#FFF7EE] disabled:opacity-30 disabled:pointer-events-none transition-all"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </nav>

      {/* ─────────────────────────────────────────────────────────────
          SNAP-SCROLL CONTAINER (Each slide = exactly 1 viewport screen)
          ───────────────────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="w-full h-full overflow-y-auto snap-y snap-mandatory scroll-smooth"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {/* ═════════════════════════════════════════════════════════════
            SLIDE 1: HERO SECTION
            ═════════════════════════════════════════════════════════════ */}
        <section
          id="slide-hero"
          className="snap-start snap-always w-full h-[calc(100vh-5rem)] min-h-[calc(100vh-5rem)] max-h-[calc(100vh-5rem)] flex items-center justify-center p-3 sm:p-5 lg:p-6"
        >
          <div className="max-w-7xl w-full h-full max-h-[640px] bg-[#FFF8F1] rounded-[32px] p-4 sm:p-6 lg:p-8 border border-[#F4E3D2] shadow-xs flex flex-col justify-between overflow-hidden relative">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center flex-1 my-auto">
              {/* Left Column: Mascot + Pill + Balance Card */}
              <div className="lg:col-span-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-[28px] overflow-hidden border-2 border-white shadow-sm bg-white shrink-0">
                    <Image
                      src="/images/mascot-main.png"
                      alt="Кот-наставник центра АйДаУмничка"
                      fill
                      className="object-cover"
                      priority
                    />
                  </div>

                  <div className="space-y-2 flex-1">
                    <Link
                      href="/room/demo-live-room"
                      className="inline-flex items-center gap-2 bg-white border border-ink-900/80 rounded-full px-4 py-2 shadow-xs hover:bg-[#FFF3E8] transition-all group"
                    >
                      <span className="text-[10px] font-black text-ink-900 uppercase tracking-wider">
                        КАК ПРОХОДИТ УРОК?
                      </span>
                      <div className="w-5 h-5 rounded-full bg-limeAccent flex items-center justify-center text-[10px] text-ink-900 group-hover:translate-x-1 transition-transform">
                        ➔
                      </div>
                    </Link>

                    <div className="p-2.5 bg-white/90 border border-[#F2E3D5] rounded-2xl text-[11px] text-ink-600 leading-snug">
                      <span className="font-bold text-ink-900 block">Прямая P2P видеосвязь:</span>
                      Без сторонних серверов, чисто и без задержек.
                    </div>
                  </div>
                </div>

                {/* Compact Balance Widget */}
                <BalanceWidget balance={6} studentName="Тимофей Смирнов" compact={true} />
              </div>

              {/* Right Column: Playful Headline & CTAs */}
              <div className="lg:col-span-7 space-y-4 lg:pl-6">
                <div className="relative">
                  <div className="hidden sm:block absolute -top-8 right-6 text-ink-900">
                    <svg width="60" height="50" viewBox="0 0 100 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M20 60C25 30 55 18 80 15M80 15L65 14M80 15L78 28"
                        stroke="#161F38"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>

                  <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-ink-900 tracking-tight leading-[1.08]">
                    Учите <br />
                    <span className="font-serif italic font-normal text-2xl sm:text-4xl lg:text-5xl text-ink-700">
                      своих дошкольников
                    </span>{' '}
                    <br />
                    <span className="text-coralAccent">чистой речи</span>{' '}
                    <span className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-ink-900">
                      и мышлению
                    </span>
                  </h1>
                </div>

                <p className="text-xs sm:text-sm text-ink-500 max-w-xl leading-relaxed">
                  Индивидуальные онлайн-уроки с логопедом-дефектологом в г. Тольятти. Совместное рисование на интерактивной доске, чат с голосовыми заданиями и прозрачный учет баланса занятий.
                </p>

                {/* CTA Row */}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <Link
                    href="/room/demo-live-room"
                    className="bg-limeAccent hover:bg-limeAccent-hover text-ink-900 font-extrabold px-6 py-3 rounded-full text-xs sm:text-sm transition-all shadow-xs active:scale-95 flex items-center gap-2"
                  >
                    <Video className="w-4 h-4 text-ink-900" />
                    <span>Начать On-Demand урок</span>
                  </Link>

                  <Link
                    href="/messenger"
                    className="flex items-center gap-2.5 bg-white border border-ink-900/80 rounded-full pl-4 pr-1.5 py-1.5 shadow-xs hover:bg-[#FFF3E8] transition-all"
                  >
                    <span className="text-[10px] sm:text-[11px] font-black text-ink-900 uppercase tracking-wider">
                      ЗАДАЙТЕ ВОПРОС ПЕДАГОГУ
                    </span>
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-[#F4E3D2] relative shrink-0">
                      <Image
                        src="/images/mascot-happy.png"
                        alt="Кот наставник"
                        fill
                        className="object-cover"
                      />
                    </div>
                  </Link>
                </div>
              </div>
            </div>

            {/* Slide Down Hint Button */}
            <div className="flex items-center justify-center pt-2">
              <button
                onClick={() => scrollToSlide(1)}
                className="flex items-center gap-2 text-[11px] font-bold text-ink-500 hover:text-coralAccent transition-colors group cursor-pointer"
              >
                <span>Листать вниз: знакомство с учеником</span>
                <span className="inline-block animate-bounce text-coralAccent">↓</span>
              </button>
            </div>
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════════════
            SLIDE 2: ONBOARDING & PROFILE (Знакомство)
            ═════════════════════════════════════════════════════════════ */}
        <section
          id="slide-onboarding"
          className="snap-start snap-always w-full h-[calc(100vh-5rem)] min-h-[calc(100vh-5rem)] max-h-[calc(100vh-5rem)] flex items-center justify-center p-3 sm:p-5 lg:p-6"
        >
          <div className="max-w-7xl w-full h-full max-h-[640px] bg-white rounded-[32px] p-5 sm:p-7 lg:p-9 border border-[#F4E3D2] shadow-xs flex flex-col justify-between overflow-hidden relative">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center flex-1 my-auto">
              {/* Left Column: Title & Student Profile Card */}
              <div className="lg:col-span-7 space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-coralAccent uppercase tracking-widest">
                    Шаг 01 • Персонализация
                  </span>
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-ink-900 tracking-tight leading-snug">
                    Для начала давайте <br />
                    <span className="font-serif italic font-normal text-ink-700">познакомимся с учеником</span>
                  </h2>
                </div>

                {/* Profile Card */}
                <div className="bg-[#FFF7EE] p-4 sm:p-5 rounded-3xl border border-[#F2E2D0] flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden relative border-2 border-white shadow-xs shrink-0">
                      <Image
                        src="/images/child-avatar.png"
                        alt="Ученик Тимофей"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base text-ink-900">Тимофей Смирнов</h3>
                      <p className="text-xs text-ink-500">Уровень 1 (Дошкольник) • Мама: Елена</p>
                      <span className="inline-block mt-1 text-[10px] font-bold bg-limeAccent text-ink-900 px-2.5 py-0.5 rounded-full">
                        Готов к уроку
                      </span>
                    </div>
                  </div>

                  {/* 3D Puzzle icon */}
                  <div className="w-12 h-12 relative shrink-0 hidden sm:block">
                    <Image
                      src="/images/puzzle-icon.png"
                      alt="Обучающий пазл"
                      fill
                      className="object-contain"
                    />
                  </div>
                </div>

                {/* Pill Field Rows */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-[#FFFDFB] border border-[#F4E5D5] rounded-2xl p-3.5 flex items-center justify-between shadow-2xs">
                    <span className="text-xs font-bold text-ink-700">Возраст ребенка:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-ink-900">6 лет</span>
                      <span className="text-sm">😃</span>
                    </div>
                  </div>

                  <div className="bg-[#FFFDFB] border border-[#F4E5D5] rounded-2xl p-3.5 flex items-center justify-between shadow-2xs">
                    <span className="text-xs font-bold text-ink-700">Город:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-ink-900">Тольятти</span>
                      <span className="text-sm">📍</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Tutor Speech Card & Next Step */}
              <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
                <div className="bg-[#FFF7EE] p-4 sm:p-5 rounded-3xl border border-[#F2E2D0] flex items-center gap-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden relative border border-white shadow-xs shrink-0">
                    <Image
                      src="/images/mascot-study.png"
                      alt="Кот-педагог"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <p className="text-xs text-ink-700 leading-relaxed">
                    «Я пушистый куратор центра <strong>«АйДаУмничка»</strong>. Наша цель — поставить звуки и привить любовь к знаниям. Учитесь в радость!»
                  </p>
                </div>

                <div className="space-y-3 pt-2 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <svg width="35" height="25" viewBox="0 0 50 40" fill="none">
                      <path d="M10 5C25 10 35 25 35 35M35 35L25 32M35 35L38 22" stroke="#161F38" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    <h4 className="font-extrabold text-xs sm:text-sm text-ink-900">
                      Все настроено, запускайте сессию!
                    </h4>
                  </div>

                  <div className="flex items-center justify-center sm:justify-start">
                    <Link
                      href="/room/demo-live-room"
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-coralAccent hover:bg-coralAccent-hover text-white font-extrabold text-xs flex flex-col items-center justify-center shadow-md transition-transform hover:scale-105 active:scale-95 text-center p-2"
                    >
                      <Video className="w-5 h-5 mb-1" />
                      <span>Начать урок</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Slide Down Hint Button */}
            <div className="flex items-center justify-center pt-2">
              <button
                onClick={() => scrollToSlide(2)}
                className="flex items-center gap-2 text-[11px] font-bold text-ink-500 hover:text-coralAccent transition-colors group cursor-pointer"
              >
                <span>Листать дальше: успехи и пройденные темы</span>
                <span className="inline-block animate-bounce text-coralAccent">↓</span>
              </button>
            </div>
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════════════
            SLIDE 3: LESSONS PROGRESS (Успехи и прогресс)
            ═════════════════════════════════════════════════════════════ */}
        <section
          id="slide-progress"
          className="snap-start snap-always w-full h-[calc(100vh-5rem)] min-h-[calc(100vh-5rem)] max-h-[calc(100vh-5rem)] flex items-center justify-center p-3 sm:p-5 lg:p-6"
        >
          <div className="max-w-7xl w-full h-full max-h-[640px] bg-[#FFF8F1] rounded-[32px] p-5 sm:p-7 lg:p-9 border border-[#F4E3D2] shadow-xs flex flex-col justify-between overflow-hidden relative">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center flex-1 my-auto">
              {/* Left Column: Huge Progress Title */}
              <div className="lg:col-span-5 space-y-3">
                <span className="text-[10px] font-black text-coralAccent uppercase tracking-widest">
                  Шаг 02 • Результаты
                </span>
                <h2 className="text-3xl sm:text-5xl font-black text-ink-900 tracking-tight leading-tight">
                  6 занятий <br />
                  <span className="text-coralAccent font-extrabold text-2xl sm:text-4xl">
                    успешно освоено
                  </span>
                </h2>

                <p className="text-xs sm:text-sm text-ink-500 max-w-sm leading-relaxed">
                  Тимофей освоил артикуляционную гимнастику и изолированный звук [Р]. Пора закрепить навык в интерактивной игре!
                </p>

                <div className="pt-2">
                  <Link
                    href="/student"
                    className="inline-flex items-center gap-3 bg-white border border-[#EADBCC] rounded-full p-1.5 pr-4 shadow-2xs hover:border-coralAccent transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full overflow-hidden relative border border-white shrink-0">
                      <Image
                        src="/images/child-avatar.png"
                        alt="Тимофей"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <span className="text-xs font-bold text-ink-900">
                      Тимофей, давай начнем игру-урок! ➔
                    </span>
                  </Link>
                </div>
              </div>

              {/* Right Column: Course cards & Happy Mascot */}
              <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-[28px] border border-[#F2E3D5] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-5">
                <div className="space-y-3 flex-1 w-full">
                  <div>
                    <span className="text-[10px] font-extrabold text-coralAccent uppercase tracking-widest">
                      Успехи ученика
                    </span>
                    <h3 className="text-lg sm:text-xl font-black text-ink-900 mt-0.5">
                      Молодец, Тимофей!
                    </h3>
                    <p className="text-xs text-ink-500">
                      Курс артикуляции и звуков пройден на 75%
                    </p>
                  </div>

                  {/* Course Card 1 */}
                  <div className="p-3 bg-[#FFF7EE] rounded-2xl border border-[#F2E2D0] flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-ink-900">Постановка звука [Р]</h4>
                      <p className="text-[11px] text-ink-500">12 занятий • 5–7 лет</p>
                    </div>
                    <span className="text-xs font-extrabold text-coralAccent bg-white px-2.5 py-1 rounded-xl shadow-2xs">
                      Активен
                    </span>
                  </div>

                  {/* Course Card 2 */}
                  <div className="p-3 bg-[#FFF7EE] rounded-2xl border border-[#F2E2D0] flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-ink-900">Подготовка к чтению</h4>
                      <p className="text-[11px] text-ink-500">24 занятия • 6–8 лет</p>
                    </div>
                    <span className="text-xs font-extrabold text-ink-400 bg-white px-2.5 py-1 rounded-xl">
                      Следующий
                    </span>
                  </div>
                </div>

                {/* Mascot circle */}
                <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full overflow-hidden relative border-4 border-[#FFF8F1] shadow-sm shrink-0">
                  <Image
                    src="/images/mascot-happy.png"
                    alt="Счастливый кот"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            </div>

            {/* Slide Down Hint Button */}
            <div className="flex items-center justify-center pt-2">
              <button
                onClick={() => scrollToSlide(3)}
                className="flex items-center gap-2 text-[11px] font-bold text-ink-500 hover:text-coralAccent transition-colors group cursor-pointer"
              >
                <span>Листать дальше: разделы платформы и личные кабинеты</span>
                <span className="inline-block animate-bounce text-coralAccent">↓</span>
              </button>
            </div>
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════════════
            SLIDE 4: PORTALS & FOOTER (Личные кабинеты + Подвал)
            ═════════════════════════════════════════════════════════════ */}
        <section
          id="slide-portals"
          className="snap-start snap-always w-full h-[calc(100vh-5rem)] min-h-[calc(100vh-5rem)] max-h-[calc(100vh-5rem)] flex items-center justify-center p-3 sm:p-5 lg:p-6"
        >
          <div className="max-w-7xl w-full h-full max-h-[640px] bg-white rounded-[32px] p-5 sm:p-7 border border-[#F4E3D2] shadow-xs flex flex-col justify-between overflow-hidden relative">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-[10px] font-black text-coralAccent uppercase tracking-widest">
                    Шаг 03 • Доступ
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-ink-900 tracking-tight">
                    Разделы платформы «АйДаУмничка»
                  </h2>
                </div>
                <span className="text-xs text-ink-400 hidden sm:block">
                  г. Тольятти • Детский центр
                </span>
              </div>

              {/* 3 Portal Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Student Portal Card */}
                <Link
                  href="/student"
                  className="group bg-[#FFF8F1] rounded-2xl p-4 sm:p-5 border border-[#F2E3D5] hover:border-coralAccent hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-white text-coralAccent flex items-center justify-center font-bold text-base mb-3 group-hover:scale-105 transition-transform shadow-2xs">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <h3 className="font-extrabold text-sm sm:text-base text-ink-900 group-hover:text-coralAccent transition-colors">
                      Личный кабинет Ученика
                    </h3>
                    <p className="text-[11px] text-ink-500 mt-1.5 leading-relaxed">
                      Баланс занятий, вход в активный урок в 1 клик, домашние задания и отправка голосовых записей педагогу.
                    </p>
                  </div>
                  <div className="mt-4 flex items-center justify-between pt-3 border-t border-[#F2DEC9]">
                    <span className="text-[11px] font-extrabold text-coralAccent">Войти учеником</span>
                    <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[10px] text-coralAccent group-hover:translate-x-1 transition-transform">
                      ➔
                    </div>
                  </div>
                </Link>

                {/* Teacher Portal Card */}
                <Link
                  href="/teacher"
                  className="group bg-[#FFF8F1] rounded-2xl p-4 sm:p-5 border border-[#F2E3D5] hover:border-coralAccent hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-white text-ink-900 flex items-center justify-center font-bold text-base mb-3 group-hover:scale-105 transition-transform shadow-2xs">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <h3 className="font-extrabold text-sm sm:text-base text-ink-900 group-hover:text-coralAccent transition-colors">
                      Рабочее место Педагога
                    </h3>
                    <p className="text-[11px] text-ink-500 mt-1.5 leading-relaxed">
                      Быстрый запуск On-Demand сессий без расписания, список учеников, заметки логопеда и интерактивная доска.
                    </p>
                  </div>
                  <div className="mt-4 flex items-center justify-between pt-3 border-t border-[#F2DEC9]">
                    <span className="text-[11px] font-extrabold text-ink-900">Кабинет педагога</span>
                    <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[10px] text-ink-900 group-hover:translate-x-1 transition-transform">
                      ➔
                    </div>
                  </div>
                </Link>

                {/* Admin Portal Card */}
                <Link
                  href="/admin"
                  className="group bg-[#FFF8F1] rounded-2xl p-4 sm:p-5 border border-[#F2E3D5] hover:border-coralAccent hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-white text-ink-900 flex items-center justify-center font-bold text-base mb-3 group-hover:scale-105 transition-transform shadow-2xs">
                      <Shield className="w-5 h-5 text-ink-900" />
                    </div>
                    <h3 className="font-extrabold text-sm sm:text-base text-ink-900 group-hover:text-coralAccent transition-colors">
                      Панель Администратора
                    </h3>
                    <p className="text-[11px] text-ink-500 mt-1.5 leading-relaxed">
                      Пополнение абонементов (+4, +8, +16 уроков), история списаний и статистика центра «АйДаУмничка» в Тольятти.
                    </p>
                  </div>
                  <div className="mt-4 flex items-center justify-between pt-3 border-t border-[#F2DEC9]">
                    <span className="text-[11px] font-extrabold text-ink-900">Управление</span>
                    <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[10px] text-ink-900 group-hover:translate-x-1 transition-transform">
                      ➔
                    </div>
                  </div>
                </Link>
              </div>
            </div>

            {/* Integrated Slide 4 Footer */}
            <div className="pt-4 border-t border-[#F4E3D2] flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
              <div>
                <p className="text-xs font-bold text-ink-800">
                  © 2026 Детский центр развития речи и интеллекта «АйДаУмничка» (г. Тольятти)
                </p>
                <p className="text-[10px] text-ink-500 mt-0.5">
                  Прямая P2P WebRTC видеосвязь без иностранных шлюзов • Устойчивость к белым спискам РФ • Уроки On-Demand
                </p>
              </div>

              <button
                onClick={() => scrollToSlide(0)}
                className="text-[11px] font-bold text-coralAccent hover:underline flex items-center gap-1 cursor-pointer shrink-0"
              >
                <span>Наверх к началу</span>
                <span>↑</span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
