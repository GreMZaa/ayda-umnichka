'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import BalanceWidget from '@/components/BalanceWidget';
import VoiceRecorder from '@/components/VoiceRecorder';
import { INITIAL_PROFILES, INITIAL_LESSONS, INITIAL_HOMEWORKS } from '@/lib/store';
import { LessonSession, HomeworkItem } from '@/types';
import { Video, Calendar, Clock, BookOpen, CheckCircle, UserCheck, MessageSquare, Sparkles } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function StudentDashboard() {
  const student = INITIAL_PROFILES[0];
  const [balance, setBalance] = useState<number>(student.balanceLessons);
  const [lessons, setLessons] = useState<LessonSession[]>(INITIAL_LESSONS);
  const [homeworks, setHomeworks] = useState<HomeworkItem[]>(INITIAL_HOMEWORKS);
  const [recordingHwId, setRecordingHwId] = useState<string | null>(null);

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
      {/* Student Profile Card (Warm cream, pill badges, child avatar) */}
      <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-[#F2E3D5] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-18 h-18 rounded-3xl overflow-hidden relative border-2 border-[#F4E3D2] shadow-sm shrink-0 w-16 h-16">
            <Image
              src="/images/child-avatar.png"
              alt="Ученик Тимофей"
              fill
              className="object-cover"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-ink-900">{student.fullName}</h1>
              <span className="text-[11px] bg-limeAccent text-ink-900 font-extrabold px-3 py-0.5 rounded-full">
                Онлайн
              </span>
            </div>
            <p className="text-xs text-ink-500 mt-1">
              {student.studentGrade} • Центр «АйДаУмничка», {student.city}
            </p>
            <p className="text-xs text-coralAccent font-bold mt-0.5">
              Преподаватель: {student.assignedTeacherName}
            </p>
          </div>
        </div>

        {/* Action Link */}
        <Link
          href="/messenger"
          className="inline-flex items-center gap-2 bg-[#FFF7EE] hover:bg-[#FDEEDC] text-ink-900 border border-[#F4DEC6] px-5 py-2.5 rounded-full text-xs font-bold transition-all shadow-sm"
        >
          <MessageSquare className="w-4 h-4 text-coralAccent" />
          <span>Написать педагогу</span>
        </Link>
      </div>

      {/* Grid: Balance & Active Call */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Balance Card from Reference */}
        <div className="lg:col-span-5">
          <BalanceWidget balance={balance} studentName={student.fullName} />
        </div>

        {/* Active Lesson Callout Card (Warm peach/coral with cat mascot) */}
        <div className="lg:col-span-7 bg-[#FFF8F1] border-2 border-coralAccent/40 rounded-[32px] p-6 sm:p-8 flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 bg-white px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest text-coralAccent border border-[#F2E2D0]">
                <span className="w-2 h-2 rounded-full bg-coralAccent animate-pulse" />
                <span>On-Demand звонок активен</span>
              </div>
              <h2 className="text-2xl font-black text-ink-900 tracking-tight leading-tight">
                Светлана Васильевна <br />
                <span className="text-coralAccent">приглашает на онлайн-урок!</span>
              </h2>
              <p className="text-xs sm:text-sm text-ink-500 max-w-md">
                Тема: «Автоматизация звука [Р] в словах и скороговорках». Подключение напрямую в браузере в 1 клик.
              </p>
            </div>

            <div className="w-24 h-24 rounded-2xl overflow-hidden relative border-2 border-white shadow-md shrink-0 hidden sm:block">
              <Image
                src="/images/mascot-happy.png"
                alt="Кот наставник"
                fill
                className="object-cover"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/room/room-logoped-timofey"
              className="bg-limeAccent hover:bg-limeAccent-hover text-ink-900 font-extrabold px-6 py-3 rounded-full text-xs shadow-sm transition-all active:scale-95 flex items-center gap-2"
            >
              <Video className="w-4 h-4 text-ink-900" />
              <span>Войти в активный урок (1 клик)</span>
            </Link>
            <span className="text-[11px] text-ink-400">
              * Занятие спишется с баланса только по окончании урока
            </span>
          </div>
        </div>
      </div>

      {/* Homework Section */}
      <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-[#F2E3D5] shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-coralAccent" />
            <h2 className="text-xl font-black text-ink-900">Домашние задания</h2>
          </div>
          <span className="text-xs font-bold bg-[#FFF7EE] text-ink-800 px-3.5 py-1 rounded-full border border-[#F4DEC6]">
            {homeworks.length} активное задание
          </span>
        </div>

        <div className="space-y-4">
          {homeworks.map((hw) => (
            <div
              key={hw.id}
              className="p-5 rounded-2xl border border-[#F4E3D2] bg-[#FFFAF5] hover:border-coralAccent transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <h3 className="font-extrabold text-base text-ink-900">{hw.title}</h3>
                <span
                  className={`text-xs px-3 py-1 rounded-full font-bold self-start sm:self-auto ${
                    hw.status === 'assigned'
                      ? 'bg-[#FEF3C7] text-[#92400E]'
                      : hw.status === 'submitted'
                      ? 'bg-limeAccent text-ink-900'
                      : 'bg-emerald-100 text-emerald-900'
                  }`}
                >
                  {hw.status === 'assigned' ? 'На выполнении' : hw.status === 'submitted' ? 'На проверке' : 'Проверено'}
                </span>
              </div>

              <p className="text-xs text-ink-500 leading-relaxed mb-4">{hw.taskDescription}</p>

              {hw.studentSolutionText && (
                <div className="mb-3 p-3 bg-white border border-[#F2E3D5] rounded-xl text-xs text-ink-800 flex items-center gap-2">
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
                      className="inline-flex items-center gap-2 bg-coralAccent hover:bg-coralAccent-hover text-white px-5 py-2.5 rounded-full text-xs font-bold shadow-sm transition-all"
                    >
                      <span>Записать голосовой ответ</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Past Lessons Archive */}
      <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-[#F2E3D5] shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-5 h-5 text-ink-700" />
            <h2 className="text-xl font-black text-ink-900">История пройденных уроков</h2>
          </div>
          <span className="text-xs font-semibold text-ink-400">Списано уроков: {lessons.length}</span>
        </div>

        <div className="space-y-3">
          {lessons.map((lesson) => (
            <div
              key={lesson.id}
              className="p-5 rounded-2xl border border-[#F4E3D2] bg-[#FFFDFB] flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <h4 className="font-extrabold text-sm text-ink-900">{lesson.topic}</h4>
                  <span className="text-[10px] bg-[#FDEEDC] text-coralAccent px-2 py-0.5 rounded-full font-mono font-bold">
                    {lesson.roomToken}
                  </span>
                </div>
                <p className="text-xs text-ink-500">
                  Педагог: {lesson.teacherName} • Дата: {formatDate(lesson.createdAt)}
                </p>
                {lesson.teacherSummary && (
                  <p className="text-xs text-ink-700 bg-[#FFF7EE] p-3 rounded-xl border border-[#F2E2D0] italic">
                    Заметка логопеда: «{lesson.teacherSummary}»
                  </p>
                )}
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <div className="flex items-center gap-1 text-xs font-bold text-ink-900">
                    <Clock className="w-3.5 h-3.5 text-coralAccent" />
                    <span>{lesson.durationMinutes || 45} мин.</span>
                  </div>
                  <span className="text-[10px] text-coralAccent font-extrabold block mt-0.5">
                    Урок списан (-1)
                  </span>
                </div>

                <Link
                  href={`/room/${lesson.roomToken}`}
                  className="px-4 py-2 text-xs text-ink-800 bg-[#FFF7EE] hover:bg-[#FDEEDC] border border-[#F4DEC6] rounded-full font-bold transition-colors"
                >
                  Архив доски
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
