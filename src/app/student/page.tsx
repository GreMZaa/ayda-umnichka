'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BalanceWidget from '@/components/BalanceWidget';
import VoiceRecorder from '@/components/VoiceRecorder';
import WeekCalendar from '@/components/WeekCalendar';
import BadgesGrid from '@/components/BadgesGrid';
import SpeechTrainer from '@/components/SpeechTrainer';
import PhoneMockup from '@/components/PhoneMockup';
import { LessonSession, HomeworkItem } from '@/types';
import { Video, Clock, BookOpen, CheckCircle, Smartphone, Monitor, Sparkles } from 'lucide-react';

export default function StudentDashboard() {
  const router = useRouter();
  const [studentName, setStudentName] = useState<string>('Ученик');
  const [balance, setBalance] = useState<number>(0);
  const [lessons, setLessons] = useState<LessonSession[]>([]);
  const [homeworks, setHomeworks] = useState<HomeworkItem[]>([]);
  const [recordingHwId, setRecordingHwId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'desktop' | 'phone'>('desktop');

  useEffect(() => {
    const activeAuthUser =
      localStorage.getItem('aida_auth_user_id') ||
      document.cookie.match(/(?:^|; )aida_auth_user_id=([^;]*)/)?.[1] ||
      localStorage.getItem('aida_user_id') ||
      document.cookie.match(/(?:^|; )aida_user_id=([^;]*)/)?.[1];

    if (activeAuthUser) {
      router.replace(`/${decodeURIComponent(activeAuthUser)}`);
      return;
    }

    const savedName = localStorage.getItem('aida_full_name');
    if (savedName) setStudentName(savedName);

    const savedBalance = localStorage.getItem('aida_student_balance');
    if (savedBalance) setBalance(parseInt(savedBalance, 10));
  }, [router]);

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
      {/* View Switcher */}
      <div className="flex items-center justify-between bg-white rounded-2xl px-5 py-3 border border-[#F2E3D5] shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-ink-900 uppercase tracking-wider">
            Личный кабинет ученика
          </span>
          <span className="text-[10px] bg-limeAccent text-ink-900 font-extrabold px-2.5 py-0.5 rounded-full">
            {studentName}
          </span>
        </div>

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
            <span>📱 Мобильный вид</span>
          </button>
        </div>
      </div>

      {viewMode === 'phone' ? (
        <div className="py-6 flex justify-center">
          <PhoneMockup title="Личный кабинет">
            <div className="flex items-center justify-between pb-2 border-b border-[#F4DEC6]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-[#FFF2E6] border border-[#FCDDC7] flex items-center justify-center font-black text-sm text-coralAccent">
                  {studentName[0] || 'У'}
                </div>
                <div>
                  <h4 className="font-black text-xs text-ink-900">{studentName}</h4>
                  <span className="text-[10px] text-coralAccent font-bold">★ Ученик центра</span>
                </div>
              </div>
            </div>

            <WeekCalendar />
            <BalanceWidget balance={balance} studentName={studentName} />
          </PhoneMockup>
        </div>
      ) : (
        <div className="space-y-8">
          <BalanceWidget balance={balance} studentName={studentName} />

          {/* Lessons */}
          {lessons.length === 0 ? (
            <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-[#F2E3D5] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-1.5">
                <span className="text-xs font-extrabold text-[#8A95A8] uppercase tracking-wider">
                  Онлайн-уроки
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-ink-900 tracking-tight">
                  У вас пока нет запланированных уроков
                </h3>
                <p className="text-xs text-ink-500">
                  Запишитесь на вводный онлайн-урок или свяжитесь с преподавателем.
                </p>
              </div>

              <Link
                href="/#slide-onboarding"
                className="bg-[#C5E87D] hover:bg-[#B6DC67] text-[#161F38] font-black text-xs sm:text-sm px-6 py-3.5 rounded-full shadow-xs transition-[background-color,transform,box-shadow] duration-140 ease-out-emil flex items-center gap-2 active:scale-[0.97] cursor-pointer whitespace-nowrap"
              >
                <span>Записаться на урок</span>
                <span>➔</span>
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-[#F2E3D5] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#5C8519] animate-pulse" />
                  <span className="text-xs font-extrabold text-[#5C8519] uppercase tracking-wider">
                    Ближайший онлайн-урок
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-ink-900 tracking-tight">
                  {lessons[0].topic}
                </h3>
                <p className="text-xs text-ink-500 flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-coralAccent" />
                    45 минут
                  </span>
                  <span>•</span>
                  <span>Педагог: <strong>{lessons[0].teacherName}</strong></span>
                </p>
              </div>

              <Link
                href={`/room/${lessons[0].roomToken}?role=student&topic=${encodeURIComponent(lessons[0].topic)}`}
                className="bg-coralAccent hover:bg-coralAccent-hover text-white font-black text-xs sm:text-sm px-6 py-4 rounded-full shadow-xs transition-[background-color,transform,box-shadow] duration-140 ease-out-emil flex items-center gap-2.5 active:scale-[0.97] cursor-pointer whitespace-nowrap"
              >
                <Video className="w-4 h-4" />
                <span>Войти в урок</span>
              </Link>
            </div>
          )}

          {/* Homework and Speech Trainer Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-ink-900 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-coralAccent" />
                  Домашние задания
                </h3>
                <span className="text-xs font-bold text-coralAccent bg-[#FFF2E6] px-2.5 py-0.5 rounded-full">
                  {homeworks.filter((h) => h.status === 'assigned').length} активных
                </span>
              </div>

              {homeworks.length === 0 ? (
                <div className="p-8 text-center rounded-3xl border border-dashed border-[#F4DEC6] bg-white text-xs text-ink-500 space-y-2">
                  <CheckCircle className="w-8 h-8 text-[#5C8519] mx-auto opacity-70" />
                  <h4 className="font-bold text-sm text-ink-900">Все задания выполнены</h4>
                  <p className="text-xs text-ink-500">
                    Новые упражнения от преподавателя появятся здесь после проведения урока.
                  </p>
                </div>
              ) : (
                homeworks.map((hw) => (
                  <div key={hw.id} className="bg-white p-5 rounded-3xl border border-[#F2E0CF] shadow-xs space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="font-extrabold text-sm text-ink-900">{hw.title}</h4>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#FFF2E6] text-coralAccent shrink-0">
                        Активно
                      </span>
                    </div>
                    <p className="text-xs text-ink-600 leading-relaxed">{hw.taskDescription}</p>

                    <div className="pt-2 border-t border-[#F8EFE7]">
                      {recordingHwId === hw.id ? (
                        <VoiceRecorder
                          onSendVoice={(duration) => handleVoiceSubmission(hw.id, duration)}
                          onCancel={() => setRecordingHwId(null)}
                        />
                      ) : (
                        <button
                          onClick={() => setRecordingHwId(hw.id)}
                          className="w-full bg-[#FFF7EE] hover:bg-[#FDEEDC] text-coralAccent border border-[#F4DEC6] font-bold text-xs py-2.5 rounded-2xl transition-[background-color,border-color,transform] duration-140 ease-out-emil active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <span>Записать голосовой ответ педагогу</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="lg:col-span-6 space-y-4">
              <h3 className="text-base font-black text-ink-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-limeAccent-hover" />
                Интерактивный тренажер речи
              </h3>
              <SpeechTrainer />
            </div>
          </div>

          <WeekCalendar />
          <BadgesGrid />
        </div>
      )}
    </div>
  );
}
