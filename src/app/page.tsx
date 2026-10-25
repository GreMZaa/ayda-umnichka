'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import BalanceWidget from '@/components/BalanceWidget';
import { Video, ArrowRight, Sparkles, MessageCircle, UserCheck, Shield, GraduationCap, CheckCircle2, BookOpen } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="space-y-16 py-4">
      {/* ─────────────────────────────────────────────────────────────
          HERO SECTION — Replicating Reference Image 1
          ───────────────────────────────────────────────────────────── */}
      <section className="relative bg-[#FFF8F1] rounded-[36px] p-6 sm:p-10 lg:p-12 border border-[#F4E3D2] shadow-sm overflow-hidden">
        {/* Main Grid: Left Mascot & Cards + Right Huge Typography */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: Mascot cutout + Pill + Card */}
          <div className="lg:col-span-5 space-y-6">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Mascot Photo with organic rounded frame matching image 1 */}
              <div className="relative w-48 sm:w-56 aspect-square rounded-[36px] overflow-hidden border-2 border-white shadow-md bg-white shrink-0">
                <Image
                  src="/images/mascot-main.png"
                  alt="Кот-наставник центра АйДаУмничка"
                  fill
                  className="object-cover"
                  priority
                />
              </div>

              {/* Pill Button: "HOW IT ACTUALLY WORKS?" */}
              <div className="space-y-3">
                <Link
                  href="/room/demo-live-room"
                  className="inline-flex items-center gap-3 bg-white border border-ink-900/80 rounded-full px-5 py-2.5 shadow-sm hover:bg-[#FFF3E8] transition-all group"
                >
                  <span className="text-[11px] font-black text-ink-900 uppercase tracking-wider">
                    КАК ПРОХОДИТ УРОК?
                  </span>
                  <div className="w-7 h-7 rounded-full bg-[#EBF8CE] flex items-center justify-center text-xs text-ink-900 group-hover:translate-x-1 transition-transform">
                    ➔
                  </div>
                </Link>

                <div className="p-3 bg-white/80 border border-[#F2E3D5] rounded-2xl text-[11px] text-ink-500">
                  <span className="font-bold text-ink-800 block">Прямая P2P видеосвязь:</span>
                  Без Zoom и зарубежных серверов, защищено внутри Рунета.
                </div>
              </div>
            </div>

            {/* Embedded Learning / Balance Card component from Image 1 */}
            <BalanceWidget balance={6} studentName="Тимофей Смирнов" />
          </div>

          {/* Right Column: Giant Headline & Hand-drawn Doodle Arrow */}
          <div className="lg:col-span-7 space-y-8 pl-0 lg:pl-6">
            <div className="relative">
              {/* Hand-drawn curved doodle arrow in SVG matching reference! */}
              <div className="hidden sm:block absolute -top-10 right-8 text-ink-900">
                <svg width="70" height="70" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M20 75C25 40 55 25 80 20M80 20L65 18M80 20L78 35"
                    stroke="#161F38"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M25 70C15 60 18 45 35 48C52 50 48 70 30 72C20 73 15 62 25 50"
                    stroke="#161F38"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              {/* Huge Playful Headline like Image 1 */}
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-ink-900 tracking-tight leading-[1.05]">
                Учите <br />
                <span className="font-serif italic font-normal text-3xl sm:text-5xl lg:text-6xl text-ink-700">
                  своих дошкольников
                </span> <br />
                <span className="text-coralAccent">чистой речи</span> <br />
                <span className="text-3xl sm:text-5xl font-extrabold text-ink-800">
                  и мышлению
                </span>
              </h1>
            </div>

            <p className="text-sm sm:text-base text-ink-500 max-w-xl leading-relaxed">
              Индивидуальные онлайн-уроки с логопедом-дефектологом в Тольятти. Совместное рисование на интерактивной доске, удобный чат с голосовыми сообщениями и прозрачный абонемент.
            </p>

            {/* Bottom Row of Hero: Mascot Question Pill & CTA */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-2">
              <Link
                href="/room/demo-live-room"
                className="bg-limeAccent hover:bg-limeAccent-hover text-ink-900 font-extrabold px-8 py-4 rounded-full text-sm transition-all shadow-sm active:scale-95 flex items-center gap-2"
              >
                <Video className="w-4 h-4 text-ink-900" />
                <span>Начать On-Demand урок</span>
              </Link>

              {/* Capsule pill: "DON'T HESITATE TO ASK..." with cute cat mascot! */}
              <Link
                href="/messenger"
                className="flex items-center gap-3 bg-white border border-ink-900/80 rounded-full pl-5 pr-2 py-2 shadow-sm hover:bg-[#FFF3E8] transition-all"
              >
                <span className="text-[11px] font-black text-ink-900 uppercase tracking-wider">
                  ЗАДАЙТЕ ВОПРОС ПЕДАГОГУ
                </span>
                <div className="w-10 h-10 rounded-full overflow-hidden border border-[#F4E3D2] relative shrink-0">
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
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 2: Onboarding & Profile — Replicating Reference Image 2
          ───────────────────────────────────────────────────────────── */}
      <section className="bg-white rounded-[36px] p-6 sm:p-10 lg:p-12 border border-[#F4E3D2] shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left: Introduction Title & Student Cards */}
          <div className="lg:col-span-7 space-y-6">
            <h2 className="text-3xl sm:text-4xl font-black text-ink-900 tracking-tight leading-snug">
              Для начала давайте <br />
              <span className="font-serif italic font-normal text-ink-700">познакомимся с учеником</span>
            </h2>

            {/* Profile Card matching Image 2 */}
            <div className="bg-[#FFF7EE] p-5 sm:p-6 rounded-3xl border border-[#F2E2D0] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl overflow-hidden relative border-2 border-white shadow-sm shrink-0">
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
                  <span className="inline-block mt-1 text-[10px] font-bold bg-limeAccent text-ink-900 px-2 py-0.5 rounded-full">
                    Готов к уроку
                  </span>
                </div>
              </div>

              {/* 3D Puzzle icon from image 2 */}
              <div className="w-14 h-14 relative shrink-0 hidden sm:block">
                <Image
                  src="/images/puzzle-icon.png"
                  alt="Обучающий пазл"
                  fill
                  className="object-contain"
                />
              </div>
            </div>

            {/* Pill Field Rows from Image 2 */}
            <div className="space-y-3">
              <div className="bg-[#FFFDFB] border border-[#F4E5D5] rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <span className="text-xs font-bold text-ink-700">Сколько ребенку лет?</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-ink-900">6 лет (дошкольник)</span>
                  <span className="text-base">😃</span>
                </div>
              </div>

              <div className="bg-[#FFFDFB] border border-[#F4E5D5] rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <span className="text-xs font-bold text-ink-700">Откуда вы?</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-ink-900">Тольятти, Автозаводский р-н</span>
                  <span className="text-base">📍</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Tutor Speech Bubble + Big Next Step Circle */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
            {/* Tutor speech card from Image 2 */}
            <div className="bg-[#FFF7EE] p-5 rounded-3xl border border-[#F2E2D0] flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl overflow-hidden relative border border-white shadow-sm shrink-0">
                <Image
                  src="/images/mascot-study.png"
                  alt="Кот-педагог Тейлор"
                  fill
                  className="object-cover"
                />
              </div>
              <p className="text-xs text-ink-700 leading-relaxed">
                «Я пушистый куратор центра <strong>«АйДаУмничка»</strong>. Наша цель — развить у ребенка чистую речь и уверенность в себе. Учитесь в радость!»
              </p>
            </div>

            {/* Curved arrow and Next Step section */}
            <div className="text-center sm:text-left space-y-4 pt-2">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <svg width="40" height="30" viewBox="0 0 50 40" fill="none">
                  <path d="M10 5C25 10 35 25 35 35M35 35L25 32M35 35L38 22" stroke="#161F38" strokeWidth="3" strokeLinecap="round" />
                </svg>
                <h4 className="font-extrabold text-sm text-ink-900">
                  Все готово, переходите к уроку!
                </h4>
              </div>

              {/* Big circular button matching reference Image 2 */}
              <div className="flex items-center justify-center sm:justify-start">
                <Link
                  href="/room/demo-live-room"
                  className="w-28 h-28 rounded-full bg-coralAccent hover:bg-coralAccent-hover text-white font-extrabold text-xs flex flex-col items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 text-center p-3"
                >
                  <Video className="w-5 h-5 mb-1" />
                  <span>Начать урок</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 3: Lessons Progress — Replicating Reference Image 3
          ───────────────────────────────────────────────────────────── */}
      <section className="bg-[#FFF8F1] rounded-[36px] p-6 sm:p-10 lg:p-12 border border-[#F4E3D2] shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left: Giant "6 lessons well learned" text */}
          <div className="lg:col-span-5 space-y-4">
            <h2 className="text-4xl sm:text-6xl font-black text-ink-900 tracking-tight leading-none">
              6 занятий <br />
              <span className="text-coralAccent font-extrabold text-3xl sm:text-5xl">
                успешно освоено
              </span>
            </h2>

            {/* Doodle arrow pointing to next step */}
            <div className="pt-2">
              <svg width="60" height="40" viewBox="0 0 80 50" fill="none">
                <path d="M10 20C30 15 50 20 70 35M70 35L55 35M70 35L65 20" stroke="#161F38" strokeWidth="4" strokeLinecap="round" />
              </svg>
            </div>

            <p className="text-xs sm:text-sm text-ink-500 max-w-sm leading-relaxed">
              Тимофей освоил артикуляционную гимнастику и изолированный звук [Р]. Пора закрепить навык в игровой форме!
            </p>

            {/* Pill capsule with avatar */}
            <Link
              href="/student"
              className="inline-flex items-center gap-3 bg-white border border-[#EADBCC] rounded-full p-2 pr-5 shadow-sm hover:border-coralAccent transition-colors"
            >
              <div className="w-10 h-10 rounded-full overflow-hidden relative border border-white shrink-0">
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

          {/* Right: Course modules & Happy Mascot Circle */}
          <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-[32px] border border-[#F2E3D5] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-4 flex-1">
              <div>
                <span className="text-[10px] font-extrabold text-coralAccent uppercase tracking-widest">
                  Успехи ученика
                </span>
                <h3 className="text-xl font-black text-ink-900 mt-0.5">
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
                <span className="text-xs font-extrabold text-coralAccent bg-white px-2.5 py-1 rounded-xl shadow-xs">
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

            {/* Mascot in circle like reference Image 3 */}
            <div className="w-44 h-44 rounded-full overflow-hidden relative border-4 border-[#FFF8F1] shadow-md shrink-0">
              <Image
                src="/images/mascot-happy.png"
                alt="Счастливый кот"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 4: Quick Portals — Replicating Reference Image 4
          ───────────────────────────────────────────────────────────── */}
      <section className="space-y-6">
        <h2 className="text-2xl font-black text-ink-900 tracking-tight">
          Разделы платформы «АйДаУмничка»
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Student Portal Card */}
          <Link
            href="/student"
            className="group bg-white rounded-[32px] p-6 border border-[#F2E3D5] hover:border-coralAccent hover:shadow-lg transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#FFF7EE] text-coralAccent flex items-center justify-center font-bold text-lg mb-4 group-hover:scale-105 transition-transform">
                <GraduationCap className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-lg text-ink-900 group-hover:text-coralAccent transition-colors">
                Личный кабинет Ученика
              </h3>
              <p className="text-xs text-ink-500 mt-2 leading-relaxed">
                Баланс занятий, вход в активный урок в 1 клик, домашние задания и отправка голосовых записей педагогу.
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between pt-4 border-t border-[#F7EBE0]">
              <span className="text-xs font-extrabold text-coralAccent">Перейти в кабинет</span>
              <div className="w-7 h-7 rounded-full bg-[#FFF7EE] flex items-center justify-center text-xs text-coralAccent group-hover:translate-x-1 transition-transform">
                ➔
              </div>
            </div>
          </Link>

          {/* Teacher Portal Card */}
          <Link
            href="/teacher"
            className="group bg-white rounded-[32px] p-6 border border-[#F2E3D5] hover:border-coralAccent hover:shadow-lg transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#FFF7EE] text-ink-900 flex items-center justify-center font-bold text-lg mb-4 group-hover:scale-105 transition-transform">
                <UserCheck className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-lg text-ink-900 group-hover:text-coralAccent transition-colors">
                Рабочее место Педагога
              </h3>
              <p className="text-xs text-ink-500 mt-2 leading-relaxed">
                Быстрый запуск On-Demand сессий без расписания, список учеников, заметки логопеда и выдача упражнений.
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between pt-4 border-t border-[#F7EBE0]">
              <span className="text-xs font-extrabold text-ink-900">Открыть кабинет</span>
              <div className="w-7 h-7 rounded-full bg-[#FFF7EE] flex items-center justify-center text-xs text-ink-900 group-hover:translate-x-1 transition-transform">
                ➔
              </div>
            </div>
          </Link>

          {/* Admin Portal Card */}
          <Link
            href="/admin"
            className="group bg-white rounded-[32px] p-6 border border-[#F2E3D5] hover:border-coralAccent hover:shadow-lg transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#FFF7EE] text-limeAccent-hover flex items-center justify-center font-bold text-lg mb-4 group-hover:scale-105 transition-transform">
                <Shield className="w-6 h-6 text-ink-900" />
              </div>
              <h3 className="font-extrabold text-lg text-ink-900 group-hover:text-coralAccent transition-colors">
                Панель Администратора
              </h3>
              <p className="text-xs text-ink-500 mt-2 leading-relaxed">
                Пополнение абонементов (+4, +8, +16 уроков), история транзакций и статистика детского центра в Тольятти.
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between pt-4 border-t border-[#F7EBE0]">
              <span className="text-xs font-extrabold text-ink-900">Управление центром</span>
              <div className="w-7 h-7 rounded-full bg-[#FFF7EE] flex items-center justify-center text-xs text-ink-900 group-hover:translate-x-1 transition-transform">
                ➔
              </div>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
