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
  Sparkles,
  CheckCircle2,
  Phone,
  Clock,
  ShieldCheck,
} from 'lucide-react';

export default function HomePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeSlide, setActiveSlide] = useState<number>(0);

  const slides = [
    { id: 'hero', label: 'Главная', number: '01' },
    { id: 'trial-form', label: 'Запись на урок', number: '02' },
  ];

  const scrollToSlide = (index: number) => {
    const targetId = index === 1 ? 'slide-onboarding' : 'slide-hero';
    const targetElem = document.getElementById(targetId);
    if (targetElem) {
      targetElem.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSlide(index);
      return;
    }

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
    <div className="relative w-full min-h-[calc(100dvh-5rem)] bg-[#FFF7EE] pb-12 sm:pb-16 lg:pb-24">
      {/* ─────────────────────────────────────────────────────────────
          MINIMALIST SLIDE NAVIGATOR (Ergonomic touch targets, clean desktop layout)
          ───────────────────────────────────────────────────────────── */}
      <nav
        aria-label="Навигация по экранам"
        className="hidden md:flex fixed right-3 sm:right-6 top-1/2 -translate-y-1/2 z-40 flex-col items-center gap-2.5 bg-white/80 backdrop-blur-md p-2 rounded-full border border-[#F4E3D2] shadow-sm"
      >
        <button
          onClick={() => activeSlide > 0 && scrollToSlide(activeSlide - 1)}
          disabled={activeSlide === 0}
          aria-label="Предыдущий экран"
          className="w-8 h-8 rounded-full flex items-center justify-center text-[#161F38]/60 hover:text-[#161F38] hover:bg-[#FFF7EE] disabled:opacity-20 disabled:pointer-events-none transition-colors duration-140 active:scale-95 cursor-pointer"
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
              className="group relative flex items-center justify-center w-8 h-8 cursor-pointer"
            >
              <div
                className={`transition-[height,width,background-color] duration-220 ease-out-emil rounded-full ${
                  isActive
                    ? 'w-2.5 h-7 bg-coralAccent shadow-xs'
                    : 'w-2 h-2 bg-[#DFCABB] hover:bg-coralAccent/60'
                }`}
              />
              <span className="pointer-events-none absolute right-10 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-xl bg-[#161F38] text-white text-[11px] font-bold whitespace-nowrap opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-[opacity,transform] duration-140 ease-out-emil shadow-sm">
                {s.number}. {s.label}
              </span>
            </button>
          );
        })}

        <button
          onClick={() => activeSlide < slides.length - 1 && scrollToSlide(activeSlide + 1)}
          disabled={activeSlide === slides.length - 1}
          aria-label="Следующий экран"
          className="w-8 h-8 rounded-full flex items-center justify-center text-[#161F38]/60 hover:text-[#161F38] hover:bg-[#FFF7EE] disabled:opacity-20 disabled:pointer-events-none transition-colors duration-140 active:scale-95 cursor-pointer"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </nav>

      {/* ─────────────────────────────────────────────────────────────
          CONTENT CONTAINER (Fluid responsive scrolling without fixed-height trapping)
          ───────────────────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="w-full h-auto overflow-y-visible md:overflow-y-auto scroll-smooth"
      >
        {/* ═════════════════════════════════════════════════════════════
            SLIDE 1: HERO SECTION
            ═════════════════════════════════════════════════════════════ */}
        <section
          id="slide-hero"
          className="w-full min-h-[calc(100dvh-5rem)] flex items-center justify-center p-3 sm:p-5 lg:p-6 py-6 sm:py-8"
        >
          <div className="max-w-7xl w-full min-h-auto bg-white rounded-[28px] sm:rounded-[36px] lg:rounded-[44px] p-5 sm:p-7 lg:p-9 border border-[#F2E0CF] shadow-[0_20px_50px_rgba(22,31,56,0.04)] flex flex-col justify-between overflow-visible relative">
            {/* Ambient Warm Gradient Glows */}
            <div className="absolute top-0 right-0 w-[55%] h-[70%] bg-[radial-gradient(circle_at_75%_25%,_rgba(255,225,205,0.55)_0%,_rgba(255,242,232,0.25)_45%,_transparent_75%)] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[45%] h-[55%] bg-[radial-gradient(circle_at_20%_80%,_rgba(255,232,215,0.4)_0%,_transparent_65%)] pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center flex-1 my-auto relative z-10">
              
              {/* Left Column: HD Mascot + Companion Feature Column + Informative Overview Card */}
              <div className="lg:col-span-6 space-y-4 sm:space-y-5">
                
                {/* Cat + Companion Feature Column (Completely fills the space beside the mascot) */}
                <div className="flex items-stretch gap-3.5 sm:gap-4">
                  {/* Arched Organic Cat Mascot Frame with HD Generated Mascot */}
                  <div className="w-32 h-44 sm:w-44 sm:h-52 lg:w-48 lg:h-56 rounded-[30px] sm:rounded-[40px] overflow-hidden relative shadow-sm border-2 border-white bg-transparent shrink-0">
                    <Image
                      src="/images/mascot-center-hd.jpg"
                      alt="Кот-наставник центра АйДаУмничка (Тольятти)"
                      fill
                      className="object-cover"
                      priority
                    />
                  </div>

                  {/* Right Companion Panel — Fills the space with value and interactive pills */}
                  <div className="flex-1 flex flex-col justify-between py-1 min-w-0">
                    {/* Header Tag */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-extrabold text-coralAccent">
                        <span className="w-1.5 h-1.5 rounded-full bg-coralAccent inline-block" />
                        <span>Онлайн-центр • Тольятти</span>
                      </div>
                    </div>

                    {/* 3 Interactive Highlight Bullets */}
                    <div className="space-y-2 my-1">
                      <div className="flex items-center gap-2 bg-[#FFF8F1] border border-[#F2DECE] px-3 py-2 rounded-xl shadow-2xs">
                        <span className="text-xs shrink-0">🎨</span>
                        <span className="text-xs font-bold text-[#161F38] truncate">
                          Интерактивная доска для рисования
                        </span>
                      </div>

                      <div className="flex items-center gap-2 bg-[#FFF8F1] border border-[#F2DECE] px-3 py-2 rounded-xl shadow-2xs">
                        <span className="text-xs shrink-0">⚡</span>
                        <span className="text-xs font-bold text-[#161F38] truncate">
                          Без Zoom и VPN • Запуск в 1 клик
                        </span>
                      </div>

                      <div className="flex items-center gap-2 bg-[#FFF8F1] border border-[#F2DECE] px-3 py-2 rounded-xl shadow-2xs">
                        <span className="text-xs shrink-0">🎯</span>
                        <span className="text-xs font-bold text-[#161F38] truncate">
                          Репетитор под характер ребёнка
                        </span>
                      </div>
                    </div>

                    {/* Social Proof & Rating Badge */}
                    <div className="flex items-center gap-2 text-xs font-extrabold text-[#161F38] bg-[#FFFBF7] border border-[#EADBCC] px-3 py-1.5 rounded-full shadow-2xs">
                      <span className="text-amber-500 tracking-tighter">★★★★★</span>
                      <span className="text-[#6B758E] font-medium">•</span>
                      <span className="truncate">200+ учеников в Тольятти</span>
                    </div>
                  </div>
                </div>

                {/* Introductory Information Overview Card */}
                <FeatureOverviewCard />
              </div>

              {/* Right Column: Requested Headline & Single CTA Button */}
              <div className="lg:col-span-6 space-y-4 sm:space-y-6 lg:pl-2">
                
                {/* Requested Headline: Онлайн-уроки с репетитором, где всё понятно и удобно. */}
                <div>
                  <div className="text-[#161F38] tracking-tight">
                    <div className="font-black text-3xl sm:text-5xl lg:text-[62px] leading-[1.02]">
                      Онлайн-уроки
                    </div>
                    <div className="font-normal text-2xl sm:text-4xl lg:text-[46px] leading-[1.06] mt-1 text-[#161F38]/90">
                      с репетитором,
                    </div>
                    <div className="font-black text-3xl sm:text-5xl lg:text-[60px] leading-[1.02] mt-1">
                      где всё понятно
                    </div>
                    <div className="font-normal text-2xl sm:text-4xl lg:text-[46px] leading-[1.06] mt-1 text-[#161F38]/90">
                      и удобно.
                    </div>
                  </div>
                </div>

                {/* Subtitle */}
                <p className="text-xs sm:text-sm text-[#6B758E] max-w-lg leading-relaxed">
                  Индивидуальные занятия с логопедом и репетиторами для дошкольников и школьников в г. Тольятти. Интерактивная доска, видео без задержек и комфорт для родителей.
                </p>

                {/* Exactly ONE CTA Button: Записаться на бесплатный пробный урок */}
                <div className="pt-1 sm:pt-2">
                  <button
                    onClick={() => scrollToSlide(1)}
                    className="w-full sm:w-auto bg-[#C5E87D] hover:bg-[#B6DC67] text-[#161F38] font-black text-xs sm:text-sm md:text-base px-6 sm:px-8 py-3.5 sm:py-4 rounded-full shadow-md hover:shadow-lg transition-[background-color,box-shadow,transform] duration-140 ease-out-emil flex items-center justify-center gap-3 active:scale-[0.97] group cursor-pointer"
                  >
                    <span>Записаться на бесплатный пробный урок</span>
                    <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white flex items-center justify-center text-xs group-hover:translate-x-1 transition-transform duration-140 ease-out-emil shadow-2xs">
                      ➔
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Slide Down Hint */}
            <div className="flex items-center justify-center pt-3 relative z-10">
              <button
                onClick={() => scrollToSlide(1)}
                className="flex items-center gap-2 text-xs font-bold text-[#6B758E] hover:text-coralAccent transition-colors duration-140 group cursor-pointer"
              >
                <span>Листать вниз: форма записи на вводный урок</span>
                <span className="inline-block text-coralAccent group-hover:translate-y-0.5 transition-transform duration-140 ease-out-emil">↓</span>
              </button>
            </div>
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════════════
            SLIDE 2: TRIAL LESSON FORM (Requested Form Layout + Integrated Footer)
            ═════════════════════════════════════════════════════════════ */}
        <section
          id="slide-onboarding"
          className="w-full min-h-[calc(100dvh-5rem)] flex items-center justify-center p-3 sm:p-5 lg:p-6 pt-6 sm:pt-10 pb-16 sm:pb-24 lg:pb-32 mt-6 sm:mt-10 md:mt-12"
        >
          <div className="max-w-7xl w-full min-h-auto bg-white rounded-[28px] sm:rounded-[36px] lg:rounded-[44px] p-5 sm:p-7 lg:p-9 pb-6 sm:pb-8 border border-[#F2E0CF] shadow-[0_20px_50px_rgba(22,31,56,0.04)] flex flex-col justify-between overflow-visible relative mb-6 sm:mb-10">
            <div className="absolute top-0 right-0 w-[55%] h-[60%] bg-[radial-gradient(circle_at_80%_20%,_rgba(255,225,205,0.45)_0%,_transparent_70%)] pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center flex-1 my-auto relative z-10">
              {/* Left Column: Form Section */}
              <div className="lg:col-span-7 space-y-3">
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-2 text-xs font-black text-[#5C8519] bg-[#EEF8D5] px-3 py-1 rounded-full border border-[#DFEFC0]">
                    <span>0 ₽ • Бесплатный вводный урок</span>
                  </div>
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
              <div className="lg:col-span-5 flex flex-col justify-between space-y-3 sm:space-y-4">
                <div className="bg-[#FFF8F1] p-3.5 sm:p-5 rounded-3xl border border-[#F2E2D0] flex items-center gap-3.5 sm:gap-4">
                  {/* HD Generated Tutor Image matching diagnostic/fun learning theme */}
                  <div className="w-16 h-16 sm:w-22 sm:h-22 rounded-2xl overflow-hidden relative border-2 border-white shadow-sm shrink-0 bg-white">
                    <Image
                      src="/images/tutor-intro-hd.jpg"
                      alt="Кот-педагог центра АйДаУмничка"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <p className="text-xs text-[#161F38]/90 leading-relaxed font-medium">
                    «На вводном занятии педагог легко найдет контакт с ребенком, определит текущий уровень и покажет, как интересно учиться онлайн!»
                  </p>
                </div>

                <div className="bg-[#FFFBF7] p-3.5 sm:p-4 rounded-3xl border border-[#F2E0CF] space-y-2">
                  <h4 className="text-xs font-black text-[#161F38] uppercase tracking-wider">
                    Что будет на вводном уроке:
                  </h4>
                  <div className="space-y-1.5 text-xs text-[#55607A]">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#5C8519] shrink-0" />
                      <span>20 минут в дружелюбной игровой форме</span>
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

                <div className="text-center sm:text-left pt-0.5">
                  <span className="text-[11px] font-bold text-[#8A95A8]">
                    📍 Центр «АйДаУмничка» • г. Тольятти
                  </span>
                </div>
              </div>
            </div>

            {/* Enhanced Beautiful Footer with Direct Phone 8 995 485 46 67 (Anchored nicely at the bottom) */}
            <div className="mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-[#F2E0CF] flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left relative z-10">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="w-8 h-8 rounded-full overflow-hidden relative border border-[#F2DECE] shadow-2xs shrink-0 bg-white hidden sm:block">
                  <Image
                    src="/images/logo-official.png"
                    alt="Логотип АйДаУмничка"
                    fill
                    className="object-contain"
                  />
                </div>
                {/* Clickable Phone Number */}
                <a
                  href="tel:89954854667"
                  className="inline-flex items-center gap-2 bg-[#FFF8F1] hover:bg-[#FFF2E6] border border-[#F2DECE] px-3.5 py-1.5 rounded-full text-xs font-black text-[#161F38] shadow-2xs hover:border-coralAccent transition-[border-color,background-color,transform] duration-140 ease-out-emil active:scale-[0.98] group"
                >
                  <div className="w-5 h-5 rounded-full bg-[#5C8519] text-white flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform duration-140">
                    <Phone className="w-3 h-3" />
                  </div>
                  <span className="tracking-wide">8 995 485 46 67</span>
                </a>

                <div>
                  <p className="text-xs font-bold text-[#161F38]">
                    © 2026 Центр подготовки к школе и развития детей «АйДаУмничка»
                  </p>
                  <p className="text-[10px] text-[#6B758E]">
                    г. Тольятти • Индивидуальные онлайн-уроки с логопедом и педагогами прямо на сайте
                  </p>
                </div>
              </div>

              <button
                onClick={() => scrollToSlide(0)}
                className="inline-flex items-center gap-1.5 text-xs font-extrabold text-coralAccent hover:text-coralAccent-hover bg-[#FFF8F1] hover:bg-[#FFF2E6] border border-[#F2DECE] px-3.5 py-1.5 rounded-full transition-[border-color,background-color,color,transform] duration-140 ease-out-emil active:scale-95 cursor-pointer shadow-2xs"
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
