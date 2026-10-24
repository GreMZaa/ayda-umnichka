'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import BalanceWidget from '@/components/BalanceWidget';
import VoiceRecorder from '@/components/VoiceRecorder';
import { INITIAL_PROFILES, INITIAL_LESSONS, INITIAL_HOMEWORKS } from '@/lib/store';
import { LessonSession, HomeworkItem } from '@/types';
import { Video, Calendar, Clock, BookOpen, CheckCircle, ArrowRight, UserCheck, MessageSquare } from 'lucide-react';
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
      {/* Student Profile Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-100 border-2 border-brand-200 overflow-hidden flex items-center justify-center text-brand-700 font-bold text-xl">
            {student.fullName[0]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{student.fullName}</h1>
              <span className="text-[11px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                Онлайн
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {student.studentGrade} • Центр «АйДаУмничка», {student.city}
            </p>
            <p className="text-xs text-indigo-600 font-medium mt-0.5">
              Преподаватель: {student.assignedTeacherName}
            </p>
          </div>
        </div>

        {/* Quick Chat Link */}
        <Link
          href="/messenger"
          className="inline-flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-sm"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Написать преподавателю</span>
        </Link>
      </div>

      {/* Grid: Balance & Active Call */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Balance Card */}
        <div className="md:col-span-1">
          <BalanceWidget balance={balance} studentName={student.fullName} />
        </div>

        {/* Active Lesson Callout Card */}
        <div className="md:col-span-2 bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-6 text-white shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-3 h-3 rounded-full bg-solar-400 animate-ping" />
              <span className="text-xs font-bold uppercase tracking-wider text-solar-300">
                On-Demand Вызов на занятие
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              Светлана Васильевна приглашает на урок!
            </h2>
            <p className="text-emerald-100 text-xs sm:text-sm mt-2 max-w-xl">
              Тема: «Автоматизация звука [Р] в словах и скороговорках». Вход по прямой защищенной ссылке без установок ПО.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/room/room-logoped-timofey"
              className="inline-flex items-center gap-2 bg-white text-emerald-900 hover:bg-emerald-50 px-6 py-3 rounded-xl font-bold text-sm shadow-md transition-all active:scale-95"
            >
              <Video className="w-4 h-4 text-emerald-600 animate-pulse" />
              <span>Войти в активный урок (1 клик)</span>
            </Link>
            <span className="text-xs text-emerald-100">
              * Занятие спишется с баланса только по факту завершения урока
            </span>
          </div>
        </div>
      </div>

      {/* Homework Section */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-brand-600" />
            <h2 className="text-lg font-bold text-slate-900">Домашние задания</h2>
          </div>
          <span className="text-xs font-bold bg-brand-50 text-brand-700 px-3 py-1 rounded-full">
            {homeworks.length} активных заданий
          </span>
        </div>

        <div className="space-y-4">
          {homeworks.map((hw) => (
            <div
              key={hw.id}
              className="p-5 rounded-2xl border border-slate-200 hover:border-brand-300 transition-all bg-slate-50/50"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <h3 className="font-bold text-base text-slate-900">{hw.title}</h3>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-semibold self-start sm:self-auto ${
                    hw.status === 'assigned'
                      ? 'bg-amber-100 text-amber-800'
                      : hw.status === 'submitted'
                      ? 'bg-indigo-100 text-indigo-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {hw.status === 'assigned' ? 'На выполнении' : hw.status === 'submitted' ? 'На проверке' : 'Проверено'}
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed mb-4">{hw.taskDescription}</p>

              {hw.studentSolutionText && (
                <div className="mb-3 p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
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
                      className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all"
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
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900">История пройденных уроков</h2>
          </div>
          <span className="text-xs text-slate-500">Списано занятий: {lessons.length}</span>
        </div>

        <div className="space-y-4">
          {lessons.map((lesson) => (
            <div
              key={lesson.id}
              className="p-5 rounded-2xl border border-slate-200 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-slate-900">{lesson.topic}</h4>
                  <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono">
                    {lesson.roomToken}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Преподаватель: {lesson.teacherName} • Дата: {formatDate(lesson.createdAt)}
                </p>
                {lesson.teacherSummary && (
                  <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100 italic">
                    Заметка педагога: «{lesson.teacherSummary}»
                  </p>
                )}
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <div className="flex items-center gap-1 text-xs font-bold text-slate-800">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>{lesson.durationMinutes || 45} мин.</span>
                  </div>
                  <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
                    Урок списан (-1)
                  </span>
                </div>

                <Link
                  href={`/room/${lesson.roomToken}`}
                  className="px-3 py-1.5 text-xs text-brand-600 hover:bg-brand-50 border border-brand-200 rounded-lg font-medium transition-colors"
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
