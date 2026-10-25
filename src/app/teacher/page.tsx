'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import WeekCalendar from '@/components/WeekCalendar';
import { Video, UserCheck, Plus, BookOpen, Users, CheckCircle2, ShieldCheck, Clock, Sparkles, PhoneCall, Shield } from 'lucide-react';

export default function TeacherDashboard() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [teacherName, setTeacherName] = useState<string>('Преподаватель');
  const [studentInput, setStudentInput] = useState<string>('');
  const [lessonTopic, setLessonTopic] = useState<string>('Индивидуальное занятие');
  const [isCreating, setIsCreating] = useState<boolean>(false);

  useEffect(() => {
    const role = localStorage.getItem('aida_active_role') || document.cookie.match(/(?:^|; )aida_active_role=([^;]*)/)?.[1];
    if (role !== 'teacher' && role !== 'admin') {
      setIsAuthorized(false);
      router.replace('/login?redirect=/teacher&error=forbidden');
      return;
    }
    setIsAuthorized(true);

    const savedName = localStorage.getItem('aida_full_name');
    if (savedName) setTeacherName(savedName);
  }, [router]);

  // Homework creation state
  const [hwTitle, setHwTitle] = useState('');
  const [hwDesc, setHwDesc] = useState('');
  const [hwSuccess, setHwSuccess] = useState(false);

  if (isAuthorized === false) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-6 border border-red-200 text-center max-w-sm space-y-3">
          <Shield className="w-10 h-10 text-red-500 mx-auto" />
          <h2 className="text-lg font-black text-ink-900">Доступ ограничен</h2>
          <p className="text-xs text-ink-500">Кабинет учителя доступен только зарегистрированным педагогам платформы. Перенаправляем на вход...</p>
        </div>
      </div>
    );
  }

  const startOnDemandLesson = (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const roomToken = `room-${randomSuffix}`;

    setTimeout(() => {
      setIsCreating(false);
      router.push(`/room/${roomToken}?role=teacher&topic=${encodeURIComponent(lessonTopic)}`);
    }, 600);
  };

  const assignHomework = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hwTitle || !hwDesc) return;
    setHwSuccess(true);
    setTimeout(() => {
      setHwTitle('');
      setHwDesc('');
      setHwSuccess(false);
    }, 3000);
  };

  return (
    <div className="space-y-8">
      {/* Teacher Profile Header */}
      <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-[#F2E3D5] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-3xl bg-[#FFF7EE] border-2 border-[#F4DEC6] flex items-center justify-center text-coralAccent font-black text-2xl shrink-0">
            {teacherName[0] || 'П'}
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black text-ink-900">{teacherName}</h1>
              <span className="text-[11px] bg-limeAccent text-ink-900 font-extrabold px-3 py-0.5 rounded-full">
                Педагог центра
              </span>
            </div>
            <p className="text-xs text-ink-500 mt-1">
              Детский развивающий центр «АйДаУмничка», г. Тольятти • Индивидуальные онлайн-уроки
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-[#FFF7EE] border border-[#F4DEC6] px-4 py-2 rounded-2xl text-center">
            <span className="text-[10px] text-ink-400 font-bold uppercase tracking-wider">Учеников</span>
            <p className="text-lg font-black text-ink-900">0</p>
          </div>
          <div className="bg-[#FFF7EE] border border-[#F4DEC6] px-4 py-2 rounded-2xl text-center">
            <span className="text-[10px] text-ink-400 font-bold uppercase tracking-wider">Уроков за месяц</span>
            <p className="text-lg font-black text-coralAccent">0</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Launcher + Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* On-Demand Lesson Launcher (Left) */}
        <div className="lg:col-span-8 bg-[#FFF8F1] border-2 border-[#F4E3D2] rounded-[36px] p-6 sm:p-10 shadow-xs flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-2 bg-white px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest text-coralAccent border border-[#F2E2D0] mb-3">
              <span className="w-2 h-2 rounded-full bg-coralAccent animate-pulse" />
              <span>On-Demand Режим (Без привязки ко времени)</span>
            </div>
            <h2 className="text-3xl font-black text-ink-900 tracking-tight">Запустить онлайн-урок</h2>
            <p className="text-xs sm:text-sm text-ink-500 mt-1 max-w-xl">
              Создайте защищенную P2P комнату в 1 клик. Ученик получит ссылку и сможет мгновенно войти на урок прямо в браузере.
            </p>

            <form onSubmit={startOnDemandLesson} className="mt-6 space-y-4 max-w-xl">
              <div>
                <label className="block text-xs font-bold text-ink-700 mb-1.5">
                  Имя ученика / ID кабинета
                </label>
                <input
                  type="text"
                  value={studentInput}
                  onChange={(e) => setStudentInput(e.target.value)}
                  placeholder="Например: Иван Иванов или ID кабинета"
                  className="w-full bg-white border border-[#EADBCC] rounded-2xl px-4 py-3 text-ink-900 placeholder-ink-400 text-sm focus:outline-none focus:ring-2 focus:ring-coralAccent shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-700 mb-1.5">
                  Тема сегодняшнего занятия
                </label>
                <input
                  type="text"
                  value={lessonTopic}
                  onChange={(e) => setLessonTopic(e.target.value)}
                  placeholder="Например: Постановка шипящих звуков..."
                  required
                  className="w-full bg-white border border-[#EADBCC] rounded-2xl px-4 py-3 text-ink-900 placeholder-ink-400 text-sm focus:outline-none focus:ring-2 focus:ring-coralAccent shadow-xs"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isCreating}
                  className="inline-flex items-center gap-2 bg-limeAccent hover:bg-limeAccent-hover text-ink-900 font-black px-8 py-4 rounded-full transition-[background-color,transform,box-shadow] duration-140 ease-out-emil shadow-xs active:scale-[0.97] text-xs cursor-pointer"
                >
                  <Video className="w-4 h-4 text-ink-900" />
                  <span>{isCreating ? 'Генерация P2P комнаты...' : 'Начать урок прямо сейчас (1 клик)'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Schedule Calendar (Right) */}
        <div className="lg:col-span-4">
          <WeekCalendar />
        </div>
      </div>

      {/* Second Row: Students Roster & Homework */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Assigned Students List */}
        <div className="lg:col-span-6 bg-white rounded-[36px] p-6 sm:p-8 border border-[#F2E3D5] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-coralAccent" />
              <h3 className="font-black text-lg text-ink-900">Закрепленные ученики</h3>
            </div>
            <span className="text-xs bg-[#FFF7EE] text-ink-800 border border-[#F4DEC6] px-3 py-0.5 rounded-full font-bold">
              0 активных
            </span>
          </div>

          <div className="p-8 rounded-2xl border border-dashed border-[#F4DEC6] bg-[#FFFAF5] text-center space-y-2">
            <Users className="w-8 h-8 text-coralAccent mx-auto opacity-50" />
            <h4 className="font-bold text-sm text-ink-900">Пока нет закрепленных учеников</h4>
            <p className="text-xs text-ink-500 max-w-sm mx-auto">
              Ученики появятся здесь сразу после регистрации или назначения администратором центра.
            </p>
          </div>
        </div>

        {/* Quick Homework Assigner */}
        <div className="lg:col-span-6 bg-white rounded-[36px] p-6 sm:p-8 border border-[#F2E3D5] shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-coralAccent" />
            <h3 className="font-black text-lg text-ink-900">Назначить домашнее упражнение</h3>
          </div>

          {hwSuccess && (
            <div className="p-4 bg-[#F2FBE8] border border-[#C5E87D] rounded-2xl text-ink-900 text-xs font-black flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Домашнее задание успешно назначено!</span>
            </div>
          )}

          <form onSubmit={assignHomework} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-ink-700 mb-1">
                Название упражнения
              </label>
              <input
                type="text"
                value={hwTitle}
                onChange={(e) => setHwTitle(e.target.value)}
                placeholder="Например: Чистоговорка перед зеркалом"
                required
                className="w-full bg-[#FFFDFB] border border-[#EADBCC] rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-coralAccent"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-700 mb-1">
                Задание для ученика/родителя
              </label>
              <textarea
                rows={3}
                value={hwDesc}
                onChange={(e) => setHwDesc(e.target.value)}
                placeholder="Опишите упражнение. Ребенок сможет записать голосовой ответ прямо в платформе..."
                required
                className="w-full bg-[#FFFDFB] border border-[#EADBCC] rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-coralAccent"
              />
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-2 bg-coralAccent hover:bg-coralAccent-hover text-white font-black px-6 py-3 rounded-full text-xs shadow-xs transition-[background-color,transform,box-shadow] duration-140 ease-out-emil active:scale-[0.97] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Отправить задание</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
