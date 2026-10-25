'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import BalanceWidget from '@/components/BalanceWidget';
import VoiceRecorder from '@/components/VoiceRecorder';
import WeekCalendar from '@/components/WeekCalendar';
import BadgesGrid from '@/components/BadgesGrid';
import SpeechTrainer from '@/components/SpeechTrainer';
import PhoneMockup from '@/components/PhoneMockup';
import { INITIAL_PROFILES, INITIAL_LESSONS, INITIAL_HOMEWORKS } from '@/lib/store';
import { LessonSession, HomeworkItem } from '@/types';
import { Video, Calendar, Clock, BookOpen, CheckCircle, MessageSquare, Bell, Smartphone, Monitor } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function StudentDashboard() {
  const student = INITIAL_PROFILES[0];
  const [balance, setBalance] = useState<number>(student.balanceLessons);
  const [lessons, setLessons] = useState<LessonSession[]>(INITIAL_LESSONS);
  const [homeworks, setHomeworks] = useState<HomeworkItem[]>(INITIAL_HOMEWORKS);
  const [recordingHwId, setRecordingHwId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'desktop' | 'phone'>('desktop');

  useEffect(() => {
    const saved = localStorage.getItem('aida_student_balance');
    if (saved) {
      setBalance(parseInt(saved, 10));
    }
  }, []);

  const handleVoiceSubmission = (hwId: string, durationSec: number) => {
    setHomeworks((prev) =>
      prev.map((hw) =>
        hw.id === hwId
          ? {
              ...hw,
              status: 'submitted',
              studentSolutionText: `Аудиоответ отправлен педагогу (${durationSec} сек.)`,
            }
          : hw
      )
    );
    setRecordingHwId(null);
    alert('Домашнее задание успешно отправлено на проверку преподавателю!');
  };

  return (
    <div className="space-y-8">
      {/* View Switcher: Desktop vs Mobile App Mockup (Inspiration Mode!) */}
      <div className="flex items-center justify-between bg-white rounded-2xl px-5 py-3 border border-[#F2E3D5] shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-ink-900 uppercase tracking-wider">
            Личный кабинет ученика
          </span>
          <span className="text-[10px] bg-limeAccent text-ink-900 font-extrabold px-2.5 py-0.5 rounded-full">
            АйДаУмничка
          </span>
        </div>

        {/* Toggle between standard desktop view and mobile phone inspiration mockup */}
        <div className="flex items-center gap-1.5 bg-[#FFF7EE] p-1 rounded-full border border-[#F4DEC6]">
          <button
            onClick={() => setViewMode('desktop')}
            className={`px-3.5 py-1 rounded-full text-xs font-bold transition-[background-color,color,box-shadow] duration-140 ease-out-emil active:scale-95 flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'desktop' ? 'bg-white text-ink-900 shadow-xs' : 'text-ink-500 hover:text-ink-900'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Десктоп вид</span>
          </button>
          <button
            onClick={() => setViewMode('phone')}
            className={`px-3.5 py-1 rounded-full text-xs font-bold transition-[background-color,color,box-shadow] duration-140 ease-out-emil active:scale-95 flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'phone' ? 'bg-white text-ink-900 shadow-xs' : 'text-ink-500 hover:text-ink-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-coralAccent" />
            <span>📱 Мобильный референс</span>
          </button>
        </div>
      </div>

      {viewMode === 'phone' ? (
        /* ─────────────────────────────────────────────────────────────
           PHONE MOCKUP MODE — Direct 1-to-1 match with Reference Images
           ───────────────────────────────────────────────────────────── */
        <div className="py-6 flex justify-center">
          <PhoneMockup title="Личный кабинет">
            {/* Top Bar inside Phone */}
            <div className="flex items-center justify-between pb-2 border-b border-[#F4DEC6]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full overflow-hidden relative border border-[#EADBCC]">
                  <Image src="/images/child-avatar.png" alt="Тимофей" fill className="object-cover" />
                </div>
                <div>
                  <h4 className="font-black text-xs text-ink-900">Тимофей Смирнов</h4>
                  <span className="text-[10px] text-coralAccent font-bold">★ 320 XP • Дошкольник</span>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#FFF7EE] border border-[#F4DEC6] flex items-center justify-center text-ink-800">
                <Bell className="w-4 h-4" />
              </div>
            </div>

            {/* Calendar Strip */}
            <WeekCalendar />

            {/* Smart Learning Card */}
            <BalanceWidget balance={balance} studentName={student.fullName} />

            {/* Active On-Demand Lesson Card */}
            <div className="bg-[#FFF8F1] border-2 border-coralAccent/50 rounded-3xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-coralAccent bg-white px-2 py-0.5 rounded-full border border-[#F4DEC6]">
                  Онлайн-вызов
                </span>
                <span className="text-xs font-bold text-ink-900">14:00</span>
              </div>
              <h4 className="font-black text-sm text-ink-900">
                Светлана Васильевна ждет на урок!
              </h4>
              <p className="text-[11px] text-ink-500">
                Автоматизация звука [Р] в словах. Подключение в 1 клик.
              </p>
              <Link
                href="/room/room-logoped-timofey"
                className="w-full bg-limeAccent hover:bg-limeAccent-hover text-ink-900 font-black py-2.5 rounded-full text-xs flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Video className="w-3.5 h-3.5" />
                <span>Войти в урок (P2P)</span>
              </Link>
            </div>

            {/* Badges and Streaks */}
            <BadgesGrid />

            {/* Speech Trainer Quiz */}
            <SpeechTrainer />
          </PhoneMockup>
        </div>
      ) : (
        /* ─────────────────────────────────────────────────────────────
           DESKTOP VIEW — Spacious, rich, inspiration layout
           ───────────────────────────────────────────────────────────── */
        <div className="space-y-8">
          {/* Student Profile Header Banner */}
          <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-[#F2E3D5] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-3xl overflow-hidden relative border-2 border-[#F4DEC6] shadow-xs shrink-0">
                <Image
                  src="/images/child-avatar.png"
                  alt="Ученик Тимофей"
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-black text-ink-900">{student.fullName}</h1>
                  <span className="text-[11px] bg-limeAccent text-ink-900 font-extrabold px-3 py-0.5 rounded-full">
                    Онлайн
                  </span>
                </div>
                <p className="text-xs text-ink-500 mt-1">
                  {student.studentGrade} • Центр «АйДаУмничка», {student.city}
                </p>
                <div className="flex items-center gap-3 mt-2 text-xs">
                  <span className="font-extrabold text-coralAccent bg-[#FFF7EE] px-3 py-1 rounded-full border border-[#F4DEC6]">
                    Педагог: {student.assignedTeacherName}
                  </span>
                  <span className="font-black text-ink-800 bg-[#EBF8CE] px-3 py-1 rounded-full">
                    ⭐ 320 XP • Уровень 1
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/messenger"
                className="inline-flex items-center gap-2 bg-[#FFF7EE] hover:bg-[#FDEEDC] text-ink-900 border border-[#F4DEC6] px-5 py-2.5 rounded-full text-xs font-extrabold transition-[background-color,border-color,transform] duration-140 ease-out-emil active:scale-[0.98] shadow-xs cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 text-coralAccent" />
                <span>Чат с логопедом</span>
              </Link>
            </div>
          </div>

          {/* Top Row: Calendar & Balance & Active Call */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Week Calendar Strip (Inspired by Image 1) */}
            <div className="lg:col-span-4">
              <WeekCalendar />
            </div>

            {/* Smart Learning Card Balance Widget (Inspired by Image 1) */}
            <div className="lg:col-span-4">
              <BalanceWidget balance={balance} studentName={student.fullName} />
            </div>

            {/* Active On-Demand Callout Card */}
            <div className="lg:col-span-4 bg-[#FFF8F1] border-2 border-coralAccent/40 rounded-[32px] p-6 shadow-xs flex flex-col justify-between h-full min-h-[220px]">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-coralAccent bg-white px-3 py-0.5 rounded-full border border-[#F4DEC6]">
                    ● On-Demand вызов
                  </span>
                  <span className="text-xs font-bold text-ink-500">Сегодня, 14:00</span>
                </div>
                <h3 className="text-lg font-black text-ink-900 leading-snug">
                  Светлана Васильевна ждет на онлайн-урок!
                </h3>
                <p className="text-xs text-ink-500 mt-1">
                  Тема: «Автоматизация звука [Р] в словах». 1 клик для входа.
                </p>
              </div>

              <div className="pt-4 flex items-center gap-3">
                <Link
                  href="/room/room-logoped-timofey"
                  className="bg-limeAccent hover:bg-limeAccent-hover text-ink-900 font-extrabold px-6 py-2.5 rounded-full text-xs shadow-xs transition-[background-color,transform,box-shadow] duration-140 ease-out-emil active:scale-[0.97] flex items-center gap-2 cursor-pointer"
                >
                  <Video className="w-3.5 h-3.5 text-ink-900" />
                  <span>Войти в урок</span>
                </Link>
                <span className="text-[10px] text-ink-400 font-medium">
                  Списание только по факту
                </span>
              </div>
            </div>
          </div>

          {/* Middle Row: Achievements & Gamified Speech Trainer (Inspired by Image 2) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Badges & Streaks */}
            <div className="lg:col-span-6">
              <BadgesGrid />
            </div>

            {/* Interactive Speech Trainer Quiz */}
            <div className="lg:col-span-6">
              <SpeechTrainer />
            </div>
          </div>

          {/* Bottom Row: Homeworks & Past Lessons Archive */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Homework List */}
            <div className="lg:col-span-6 bg-white rounded-[32px] p-6 sm:p-8 border border-[#F2E3D5] shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-coralAccent" />
                  <h3 className="text-lg font-black text-ink-900">Домашние задания</h3>
                </div>
                <span className="text-xs font-bold bg-[#FFF7EE] text-ink-800 px-3 py-1 rounded-full border border-[#F4DEC6]">
                  {homeworks.length} активное
                </span>
              </div>

              <div className="space-y-4">
                {homeworks.map((hw) => (
                  <div
                    key={hw.id}
                    className="p-5 rounded-2xl border border-[#F4E3D2] bg-[#FFFAF5] space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-extrabold text-sm text-ink-900">{hw.title}</h4>
                      <span className="text-[11px] font-black bg-limeAccent text-ink-900 px-3 py-0.5 rounded-full">
                        {hw.status === 'assigned' ? 'На выполнении' : 'На проверке'}
                      </span>
                    </div>

                    <p className="text-xs text-ink-500 leading-relaxed">{hw.taskDescription}</p>

                    {hw.studentSolutionText && (
                      <div className="p-3 bg-white border border-[#F2E3D5] rounded-xl text-xs text-ink-800 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{hw.studentSolutionText}</span>
                      </div>
                    )}

                    {hw.status === 'assigned' && (
                      <div>
                        {recordingHwId === hw.id ? (
                          <VoiceRecorder
                            onSendVoice={(duration) => handleVoiceSubmission(hw.id, duration)}
                            onCancel={() => setRecordingHwId(null)}
                          />
                        ) : (
                          <button
                            onClick={() => setRecordingHwId(hw.id)}
                            className="bg-coralAccent hover:bg-coralAccent-hover text-white px-5 py-2 rounded-full text-xs font-bold shadow-xs transition-[background-color,transform,box-shadow] duration-140 ease-out-emil active:scale-[0.97] cursor-pointer"
                          >
                            Записать голосовой ответ
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Past Lessons Recap (Like AI Summary in Image 1) */}
            <div className="lg:col-span-6 bg-white rounded-[32px] p-6 sm:p-8 border border-[#F2E3D5] shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-ink-700" />
                  <h3 className="text-lg font-black text-ink-900">Итоги проведенных уроков</h3>
                </div>
                <span className="text-xs font-bold text-ink-400">Списано: {lessons.length} зан.</span>
              </div>

              <div className="space-y-3">
                {lessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    className="p-5 rounded-2xl border border-[#F4E3D2] bg-[#FFFDFB] space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-sm text-ink-900">{lesson.topic}</h4>
                      <div className="flex items-center gap-1 text-xs font-extrabold text-coralAccent">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{lesson.durationMinutes || 45} мин</span>
                      </div>
                    </div>

                    <p className="text-xs text-ink-500">
                      Педагог: {lesson.teacherName} • {formatDate(lesson.createdAt)}
                    </p>

                    {lesson.teacherSummary && (
                      <div className="p-3 bg-[#FFF7EE] rounded-xl border border-[#F2E2D0] text-xs text-ink-700 italic">
                        «{lesson.teacherSummary}»
                      </div>
                    )}

                    <div className="pt-2 flex items-center justify-between">
                      <span className="text-[10px] text-emerald-700 font-extrabold bg-[#EBF8CE] px-2.5 py-0.5 rounded-full">
                        ✓ Занятие зачтено
                      </span>
                      <Link
                        href={`/room/${lesson.roomToken}`}
                        className="text-xs font-bold text-ink-800 hover:text-coralAccent underline underline-offset-4"
                      >
                        Смотреть доску урока →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
