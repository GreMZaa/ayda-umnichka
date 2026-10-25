'use client';

import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import FeatureOverviewCard from '@/components/FeatureOverviewCard';
import TrialLessonForm from '@/components/TrialLessonForm';
import {
  Video,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Shield,
  GraduationCap,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  PhoneCall,
} from 'lucide-react';

export default function HomePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeSlide, setActiveSlide] = useState<number>(0);

  const slides = [
    { id: 'hero', label: 'Главная', number: '01' },
    { id: 'trial-form', label: 'Запись на урок', number: '02' },
    { id: 'progress', label: 'Прогресс', number: '03' },
    { id: 'portals', label: 'Кабинеты', number: '04' },
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

  // Listen to navigation events from Navbar
  useEffect(() => {
    const handleNavEvent = (e: CustomEvent) => {
      const targetIndex = e.detail;
      if (typeof targetIndex === 'number' && targetIndex >= 0 && targetIndex < slides.length) {
        scrollToSlide(targetIndex);
      }
    };

    window.addEventListener('aida-navigate-slide', handleNavEvent as EventListener);
    return () => window.removeEventListener('aida-navigate-slide', handleNavEvent as EventListener);
  }, [slides.length]);

  // Keyboard navigation for page-by-page листание
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
          MINIMALIST SLIDE NAVIGATOR (Right Edge)
          ───────────────────────────────────────────────────────────── */}
      <nav
        aria-label="Навигация по экранам"
        className="fixed right-3 sm:right-6 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-2 bg-white/70 backdrop-blur-md p-2 rounded-full border border-[#F4E3D2] shadow-sm"
      >
        <button
          onClick={() => activeSlide > 0 && scrollToSlide(activeSlide - 1)}
          disabled={activeSlide === 0}
          aria-label="Предыдущий экран"
          className="w-6 h-6 rounded-full flex items-center justify-center text-[#161F38]/50 hover:text-[#161F38] hover:bg-[#FFF7EE] disabled:opacity-20 disabled:pointer-events-none transition-all"
        >
          <ChevronUp className="w-3.5 h-3.5" />
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
                    ? 'w-2.5 h-7 bg-coralAccent shadow-xs'
                    : 'w-2 h-2 bg-[#DFCABB] hover:bg-coralAccent/60'
                }`}
              />
              <span className="pointer-events-none absolute right-9 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-xl bg-[#161F38] text-white text-[10px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                {s.number}. {s.label}
              </span>
            </button>
          );
        })}

        <button
          onClick={() => activeSlide < slides.length - 1 && scrollToSlide(activeSlide + 1)}
          disabled={activeSlide === slides.length - 1}
          aria-label="Следующий экран"
          className="w-6 h-6 rounded-full flex items-center justify-center text-[#161F38]/50 hover:text-[#161F38] hover:bg-[#FFF7EE] disabled:opacity-20 disabled:pointer-events-none transition-all"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </nav>

      {/* ─────────────────────────────────────────────────────────────
          SNAP-SCROLL CONTAINER
          ───────────────────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="w-full h-full overflow-y-auto snap-y snap-mandatory scroll-smooth"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {/* ═════════════════════════════════════════════════════════════
            SLIDE 1: HERO SECTION — Exact Match to Requested Copy & Single Button
            ═════════════════════════════════════════════════════════════ */}
        <section
          id="slide-hero"
          className="snap-start snap-always w-full h-[calc(100vh-5rem)] min-h-[calc(100vh-5rem)] max-h-[calc(100vh-5rem)] flex items-center justify-center p-3 sm:p-5 lg:p-6"
        >
          <div className="max-w-7xl w-full h-full max-h-[640px] bg-white rounded-[36px] sm:rounded-[44px] p-5 sm:p-8 lg:p-10 border border-[#F2E0CF] shadow-[0_20px_50px_rgba(22,31,56,0.04)] flex flex-col justify-between overflow-hidden relative">
            {/* Ambient Warm Gradient Glows */}
            <div className="absolute top-0 right-0 w-[55%] h-[70%] bg-[radial-gradient(circle_at_75%_25%,_rgba(255,225,205,0.55)_0%,_rgba(255,242,232,0.25)_45%,_transparent_75%)] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[45%] h-[55%] bg-[radial-gradient(circle_at_20%_80%,_rgba(255,232,215,0.4)_0%,_transparent_65%)] pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center flex-1 my-auto relative z-10">
              
              {/* Left Column: HD Mascot + Pill + Informative Overview Card */}
              <div className="lg:col-span-6 space-y-4 sm:space-y-5">
                
                {/* Cat + Pill Row */}
                <div className="flex items-end gap-3 sm:gap-4">
                  {/* Arched Organic Cat Mascot Frame with HD Generated Mascot */}
                  <div className="w-36 h-44 sm:w-44 sm:h-52 lg:w-48 lg:h-56 rounded-[36px] sm:rounded-[40px] overflow-hidden relative shadow-sm border-2 border-white bg-[#FFF6EE] shrink-0">
                    <Image
                      src="/images/mascot-center-hd.jpg"
                      alt="Кот-наставник центра АйДаУмничка (Тольятти)"
                      fill
                      className="object-cover"
                      priority
                    />
                  </div>

                  {/* "КАК ПРОХОДИТ УРОК?" Pill Button */}
                  <div className="pb-2 space-y-2">
                    <button
                      onClick={() => scrollToSlide(1)}
                      className="inline-flex items-center gap-3 bg-[#FFFDFB] border border-[#161F38] rounded-full pl-5 pr-2 py-2 shadow-xs hover:bg-[#FFF5EC] transition-all group cursor-pointer"
                    >
                      <span className="text-[11px] font-black text-[#161F38] uppercase tracking-wider whitespace-nowrap">
                        КАК ПРОХОДИТ УРОК?
                      </span>
                      <div className="w-8 h-8 rounded-full bg-[#EBF7D0] flex items-center justify-center p-1 relative shrink-0 group-hover:scale-105 transition-transform">
                        <Image
                          src="/images/puzzle-icon.png"
                          alt="Пазл"
                          fill
                          className="object-contain p-1"
                        />
                      </div>
                    </button>

                    <div className="text-[11px] text-[#6B758E] pl-2 font-medium hidden sm:block">
                      Прямая P2P видеосвязь • Без сторонних серверов
                    </div>
                  </div>
                </div>

                {/* Introductory Information Overview Card */}
                <FeatureOverviewCard />
              </div>

              {/* Right Column: Requested Headline & Single CTA Button */}
              <div className="lg:col-span-6 space-y-6 lg:pl-2">
                
                {/* Requested Headline: Онлайн-уроки с репетитором, где всё понятно и удобно. */}
                <div className="relative">
                  {/* Hand-drawn Loop Arrow */}
                  <div className="absolute -top-6 right-2 sm:right-6 text-[#161F38] pointer-events-none select-none">
                    <svg width="90" height="85" viewBox="0 0 110 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M20 80 C 25 35, 60 18, 92 14 M92 14 L 74 13 M92 14 L 88 32"
                        stroke="#161F38"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M25 75 C 10 62, 14 46, 32 49 C 50 52, 47 72, 30 75 C 20 76, 16 64, 28 50"
                        stroke="#161F38"
                        strokeWidth="3.2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>

                  <div className="text-[#161F38] tracking-tight">
                    <div className="font-black text-4xl sm:text-5xl lg:text-[62px] leading-[1.02]">
                      Онлайн-уроки
                    </div>
                    <div className="font-normal text-3xl sm:text-4xl lg:text-[46px] leading-[1.06] mt-1 text-[#161F38]/90">
                      с репетитором,
                    </div>
                    <div className="font-black text-4xl sm:text-5xl lg:text-[60px] leading-[1.02] mt-1">
                      где всё понятно
                    </div>
                    <div className="font-normal text-3xl sm:text-4xl lg:text-[46px] leading-[1.06] mt-1 text-[#161F38]/90">
                      и удобно.
                    </div>
                  </div>
                </div>

                {/* Subtitle */}
                <p className="text-xs sm:text-sm text-[#6B758E] max-w-lg leading-relaxed">
                  Индивидуальные занятия с логопедом и репетиторами для дошкольников и школьников в г. Тольятти. Интерактивная доска, видео без задержек и комфорт для родителей.
                </p>

                {/* Exactly ONE CTA Button: Записаться на бесплатный пробный урок */}
                <div className="pt-2">
                  <button
                    onClick={() => scrollToSlide(1)}
                    className="w-full sm:w-auto bg-[#C5E87D] hover:bg-[#B6DC67] text-[#161F38] font-black text-sm sm:text-base px-8 py-4 rounded-full shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-3 active:scale-95 group cursor-pointer"
                  >
                    <span>Записаться на бесплатный пробный урок</span>
                    <span className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-xs group-hover:translate-x-1 transition-transform shadow-2xs">
                      ➔
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Slide Down Hint */}
            <div className="flex items-center justify-center pt-2 relative z-10">
              <button
                onClick={() => scrollToSlide(1)}
                className="flex items-center gap-2 text-[11px] font-bold text-[#6B758E] hover:text-coralAccent transition-colors group cursor-pointer"
              >
                <span>Листать вниз: форма записи на вводный урок</span>
                <span className="inline-block animate-bounce text-coralAccent">↓</span>
              </button>
            </div>
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════════════
            SLIDE 2: TRIAL LESSON FORM (Requested Form Layout)
            ═════════════════════════════════════════════════════════════ */}
        <section
          id="slide-onboarding"
          className="snap-start snap-always w-full h-[calc(100vh-5rem)] min-h-[calc(100vh-5rem)] max-h-[calc(100vh-5rem)] flex items-center justify-center p-3 sm:p-5 lg:p-6"
        >
          <div className="max-w-7xl w-full h-full max-h-[640px] bg-white rounded-[36px] sm:rounded-[44px] p-5 sm:p-8 lg:p-10 border border-[#F2E0CF] shadow-[0_20px_50px_rgba(22,31,56,0.04)] flex flex-col justify-between overflow-hidden relative">
            <div className="absolute top-0 right-0 w-[55%] h-[60%] bg-[radial-gradient(circle_at_80%_20%,_rgba(255,225,205,0.45)_0%,_transparent_70%)] pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center flex-1 my-auto relative z-10">
              {/* Left Column: Form Section */}
              <div className="lg:col-span-7 space-y-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-coralAccent uppercase tracking-widest bg-[#FFF2E6] px-2.5 py-0.5 rounded-full border border-[#FCDDC7] inline-block">
                    БЕСПЛАТНЫЙ ПРОБНЫЙ УРОК • 0 ₽
                  </span>
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#161F38] tracking-tight leading-snug">
                    Запишитесь на вводный онлайн-урок
                  </h2>
                  <p className="text-xs sm:text-sm text-[#6B758E] leading-relaxed">
                    Познакомим ребенка с репетитором, определим уровень знаний и составим персональный трек обучения.
                  </p>
                </div>

                {/* The Requested Form */}
                <TrialLessonForm />
              </div>

              {/* Right Column: Tutor Guidance & Trust Badges */}
              <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
                <div className="bg-[#FFF8F1] p-4 sm:p-5 rounded-3xl border border-[#F2E2D0] flex items-center gap-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden relative border border-white shadow-xs shrink-0 bg-white">
                    <Image
                      src="/images/mascot-study.png"
                      alt="Кот-педагог"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <p className="text-xs text-[#161F38]/90 leading-relaxed">
                    «На вводном занятии педагог легко найдет контакт с ребенком, определит текущий уровень и покажет, как интересно учиться онлайн!»
                  </p>
                </div>

                <div className="bg-[#FFFBF7] p-4 rounded-3xl border border-[#F2E0CF] space-y-2.5">
                  <h4 className="text-xs font-black text-[#161F38] uppercase tracking-wider">
                    Что будет на вводном уроке:
                  </h4>
                  <div className="space-y-1.5 text-xs text-[#55607A]">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#5C8519] shrink-0" />
                      <span>25 минут в дружелюбной игровой форме</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#5C8519] shrink-0" />
                      <span>Индивидуальная диагностика речи и навыков</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#5C8519] shrink-0" />
                      <span>Рекомендации логопеда-дефектолога родителям</span>
                    </div>
                  </div>
                </div>

                <div className="text-center sm:text-left pt-1">
                  <span className="text-[11px] font-bold text-[#8A95A8]">
                    📍 Центр «АйДаУмничка» • г. Тольятти
                  </span>
                </div>
              </div>
            </div>

            {/* Slide Down Hint Button */}
            <div className="flex items-center justify-center pt-2 relative z-10">
              <button
                onClick={() => scrollToSlide(2)}
                className="flex items-center gap-2 text-[11px] font-bold text-[#6B758E] hover:text-coralAccent transition-colors group cursor-pointer"
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
          <div className="max-w-7xl w-full h-full max-h-[640px] bg-white rounded-[36px] sm:rounded-[44px] p-5 sm:p-8 lg:p-10 border border-[#F2E0CF] shadow-[0_20px_50px_rgba(22,31,56,0.04)] flex flex-col justify-between overflow-hidden relative">
            <div className="absolute top-0 right-0 w-[55%] h-[60%] bg-[radial-gradient(circle_at_80%_20%,_rgba(255,225,205,0.45)_0%,_transparent_70%)] pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center flex-1 my-auto relative z-10">
              {/* Left Column: Progress Headline */}
              <div className="lg:col-span-5 space-y-3">
                <span className="text-[10px] font-black text-coralAccent uppercase tracking-widest">
                  Шаг 02 • Результаты
                </span>
                <h2 className="text-3xl sm:text-5xl font-black text-[#161F38] tracking-tight leading-tight">
                  6 занятий <br />
                  <span className="text-coralAccent font-extrabold text-2xl sm:text-4xl">
                    успешно освоено
                  </span>
                </h2>

                <p className="text-xs sm:text-sm text-[#6B758E] max-w-sm leading-relaxed">
                  Тимофей освоил артикуляционную гимнастику и изолированный звук [Р]. Пора закрепить навык в интерактивной игре!
                </p>

                <div className="pt-2">
                  <Link
                    href="/student"
                    className="inline-flex items-center gap-3 bg-[#FFF8F1] border border-[#EADBCC] rounded-full p-1.5 pr-4 shadow-2xs hover:border-coralAccent transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full overflow-hidden relative border border-white shrink-0 bg-white">
                      <Image
                        src="/images/child-avatar.png"
                        alt="Тимофей"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <span className="text-xs font-bold text-[#161F38]">
                      Тимофей, давай начнем игру-урок! ➔
                    </span>
                  </Link>
                </div>
              </div>

              {/* Right Column: Course cards & Happy Mascot */}
              <div className="lg:col-span-7 bg-[#FFF8F1] p-5 sm:p-6 rounded-[28px] border border-[#F2E3D5] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-5">
                <div className="space-y-3 flex-1 w-full">
                  <div>
                    <span className="text-[10px] font-extrabold text-coralAccent uppercase tracking-widest">
                      Успехи ученика
                    </span>
                    <h3 className="text-lg sm:text-xl font-black text-[#161F38] mt-0.5">
                      Молодец, Тимофей!
                    </h3>
                    <p className="text-xs text-[#6B758E]">
                      Курс артикуляции и звуков пройден на 75%
                    </p>
                  </div>

                  {/* Course Card 1 */}
                  <div className="p-3 bg-white rounded-2xl border border-[#F2E2D0] flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-[#161F38]">Постановка звука [Р]</h4>
                      <p className="text-[11px] text-[#6B758E]">12 занятий • 5–7 лет</p>
                    </div>
                    <span className="text-xs font-extrabold text-coralAccent bg-[#FFF8F1] px-2.5 py-1 rounded-xl shadow-2xs">
                      Активен
                    </span>
                  </div>

                  {/* Course Card 2 */}
                  <div className="p-3 bg-white rounded-2xl border border-[#F2E2D0] flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-[#161F38]">Подготовка к чтению</h4>
                      <p className="text-[11px] text-[#6B758E]">24 занятия • 6–8 лет</p>
                    </div>
                    <span className="text-xs font-extrabold text-[#6B758E] bg-[#FFF8F1] px-2.5 py-1 rounded-xl">
                      Следующий
                    </span>
                  </div>
                </div>

                {/* Mascot circle */}
                <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full overflow-hidden relative border-4 border-white shadow-sm shrink-0 bg-white">
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
            <div className="flex items-center justify-center pt-2 relative z-10">
              <button
                onClick={() => scrollToSlide(3)}
                className="flex items-center gap-2 text-[11px] font-bold text-[#6B758E] hover:text-coralAccent transition-colors group cursor-pointer"
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
          <div className="max-w-7xl w-full h-full max-h-[640px] bg-white rounded-[36px] sm:rounded-[44px] p-5 sm:p-8 border border-[#F2E0CF] shadow-[0_20px_50px_rgba(22,31,56,0.04)] flex flex-col justify-between overflow-hidden relative">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-[10px] font-black text-coralAccent uppercase tracking-widest">
                    Шаг 03 • Доступ
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-[#161F38] tracking-tight">
                    Разделы платформы «АйДаУмничка»
                  </h2>
                </div>
                <span className="text-xs text-[#6B758E] hidden sm:block">
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
                    <h3 className="font-extrabold text-sm sm:text-base text-[#161F38] group-hover:text-coralAccent transition-colors">
                      Личный кабинет Ученика
                    </h3>
                    <p className="text-[11px] text-[#6B758E] mt-1.5 leading-relaxed">
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
                    <div className="w-10 h-10 rounded-xl bg-white text-[#161F38] flex items-center justify-center font-bold text-base mb-3 group-hover:scale-105 transition-transform shadow-2xs">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <h3 className="font-extrabold text-sm sm:text-base text-[#161F38] group-hover:text-coralAccent transition-colors">
                      Рабочее место Педагога
                    </h3>
                    <p className="text-[11px] text-[#6B758E] mt-1.5 leading-relaxed">
                      Быстрый запуск On-Demand сессий без расписания, список учеников, заметки логопеда и интерактивная доска.
                    </p>
                  </div>
                  <div className="mt-4 flex items-center justify-between pt-3 border-t border-[#F2DEC9]">
                    <span className="text-[11px] font-extrabold text-[#161F38]">Кабинет педагога</span>
                    <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[10px] text-[#161F38] group-hover:translate-x-1 transition-transform">
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
                    <div className="w-10 h-10 rounded-xl bg-white text-[#161F38] flex items-center justify-center font-bold text-base mb-3 group-hover:scale-105 transition-transform shadow-2xs">
                      <Shield className="w-5 h-5 text-[#161F38]" />
                    </div>
                    <h3 className="font-extrabold text-sm sm:text-base text-[#161F38] group-hover:text-coralAccent transition-colors">
                      Панель Администратора
                    </h3>
                    <p className="text-[11px] text-[#6B758E] mt-1.5 leading-relaxed">
                      Пополнение абонементов (+4, +8, +16 уроков), история списаний и статистика центра «АйДаУмничка» в Тольятти.
                    </p>
                  </div>
                  <div className="mt-4 flex items-center justify-between pt-3 border-t border-[#F2DEC9]">
                    <span className="text-[11px] font-extrabold text-[#161F38]">Управление</span>
                    <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[10px] text-[#161F38] group-hover:translate-x-1 transition-transform">
                      ➔
                    </div>
                  </div>
                </Link>
              </div>
            </div>

            {/* Integrated Slide 4 Footer */}
            <div className="pt-4 border-t border-[#F2E0CF] flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
              <div>
                <p className="text-xs font-bold text-[#161F38]">
                  © 2026 Детский центр развития речи и интеллекта «АйДаУмничка» (г. Тольятти)
                </p>
                <p className="text-[10px] text-[#6B758E] mt-0.5">
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
