'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import WeekCalendar from '@/components/WeekCalendar';
import { Video, UserCheck, Plus, BookOpen, Users, CheckCircle2, ShieldCheck, Clock, Sparkles, PhoneCall } from 'lucide-react';
import { INITIAL_PROFILES } from '@/lib/store';

export default function TeacherDashboard() {
  const router = useRouter();
  const teacher = INITIAL_PROFILES[1];
  const [selectedStudent, setSelectedStudent] = useState<string>('Тимофей Смирнов');
  const [lessonTopic, setLessonTopic] = useState<string>('Автоматизация шипящих звуков [Ш], [Ж]');
  const [isCreating, setIsCreating] = useState<boolean>(false);

  // Homework creation state
  const [hwTitle, setHwTitle] = useState('');
  const [hwDesc, setHwDesc] = useState('');
  const [hwSuccess, setHwSuccess] = useState(false);

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
          <div className="w-18 h-18 rounded-3xl bg-[#FFF7EE] border-2 border-[#F4DEC6] flex items-center justify-center text-coralAccent font-black text-2xl shrink-0 w-16 h-16">
            {teacher.fullName[0]}
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black text-ink-900">{teacher.fullName}</h1>
              <span className="text-[11px] bg-limeAccent text-ink-900 font-extrabold px-3 py-0.5 rounded-full">
                Логопед-дефектолог
              </span>
            </div>
            <p className="text-xs text-ink-500 mt-1">
              Детский развивающий центр «АйДаУмничка», г. Тольятти • Стаж: 12 лет
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-[#FFF7EE] border border-[#F4DEC6] px-4 py-2 rounded-2xl text-center">
            <span className="text-[10px] text-ink-400 font-bold uppercase tracking-wider">Учеников</span>
            <p className="text-lg font-black text-ink-900">8</p>
          </div>
          <div className="bg-[#FFF7EE] border border-[#F4DEC6] px-4 py-2 rounded-2xl text-center">
            <span className="text-[10px] text-ink-400 font-bold uppercase tracking-wider">Уроков за месяц</span>
            <p className="text-lg font-black text-coralAccent">46</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Launcher + Schedule + Students */}
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
              Создайте защищенную P2P комнату в 1 клик. Ученик мгновенно получит уведомление в чате и сможет войти. Занятие спишется с баланса только по завершении.
            </p>

            <form onSubmit={startOnDemandLesson} className="mt-6 space-y-4 max-w-xl">
              <div>
                <label className="block text-xs font-bold text-ink-700 mb-1.5">
                  Выберите закрепленного ученика
                </label>
                <select
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  className="w-full bg-white border border-[#EADBCC] rounded-2xl px-4 py-3 text-ink-900 text-sm focus:outline-none focus:ring-2 focus:ring-coralAccent shadow-xs"
                >
                  <option value="Тимофей Смирнов">
                    Тимофей Смирнов (Баланс: 6 занятий) — Готов к уроку 🟢
                  </option>
                  <option value="Алиса Васильева">
                    Алиса Васильева (Баланс: 4 занятия) — В сети
                  </option>
                  <option value="Максим Кузнецов">
                    Максим Кузнецов (Баланс: 1 занятие ⚠️) — Офлайн
                  </option>
                </select>
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
                  className="inline-flex items-center gap-2 bg-limeAccent hover:bg-limeAccent-hover text-ink-900 font-black px-8 py-4 rounded-full transition-all shadow-xs active:scale-95 text-xs"
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

      {/* Second Row: Students Roster & Today's Schedule (Inspired by Image 1) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Assigned Students List */}
        <div className="lg:col-span-6 bg-white rounded-[36px] p-6 sm:p-8 border border-[#F2E3D5] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-coralAccent" />
              <h3 className="font-black text-lg text-ink-900">Закрепленные ученики</h3>
            </div>
            <span className="text-xs bg-[#FFF7EE] text-ink-800 border border-[#F4DEC6] px-3 py-0.5 rounded-full font-bold">
              3 активных
            </span>
          </div>

          <div className="space-y-3">
            {/* Student 1 */}
            <div className="p-4 rounded-2xl border border-[#F4DEC6] bg-[#FFFAF5] flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-sm text-ink-900">Тимофей Смирнов</h4>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <p className="text-[11px] text-ink-500 mt-0.5">6 лет • Дошкольник • Тольятти</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] font-black text-coralAccent bg-white px-2.5 py-0.5 rounded-full border border-[#F5D8BE]">
                    Баланс: 6 зан.
                  </span>
                  <span className="text-[10px] font-bold text-ink-700 bg-[#EBF8CE] px-2 py-0.5 rounded-full">
                    🔥 6 уроков подряд
                  </span>
                </div>
              </div>

              <button
                onClick={() => router.push('/room/room-logoped-timofey')}
                className="px-5 py-2.5 bg-limeAccent text-ink-900 rounded-full text-xs font-black hover:bg-limeAccent-hover transition-colors shadow-xs flex items-center gap-1.5"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Вызов</span>
              </button>
            </div>

            {/* Student 2 */}
            <div className="p-4 rounded-2xl border border-[#F4DEC6] bg-[#FFFAF5] flex items-center justify-between">
              <div>
                <h4 className="font-black text-sm text-ink-900">Алиса Васильева</h4>
                <p className="text-[11px] text-ink-500 mt-0.5">7 лет • 1 класс • Тольятти</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] font-black text-ink-700 bg-white px-2.5 py-0.5 rounded-full border border-[#F5D8BE]">
                    Баланс: 4 зан.
                  </span>
                  <span className="text-[10px] text-ink-500">В сети</span>
                </div>
              </div>

              <button
                onClick={() => router.push('/room/room-alisa')}
                className="px-5 py-2.5 bg-white text-ink-800 border border-[#EADBCC] rounded-full text-xs font-bold hover:bg-[#FFF7EE] transition-colors"
              >
                Вызов
              </button>
            </div>

            {/* Student 3 */}
            <div className="p-4 rounded-2xl border border-[#F4DEC6] bg-[#FFFAF5] flex items-center justify-between">
              <div>
                <h4 className="font-black text-sm text-ink-900">Максим Кузнецов</h4>
                <p className="text-[11px] text-ink-500 mt-0.5">5 лет • Логоритмика</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] font-black text-[#B45309] bg-[#FEF3C7] px-2.5 py-0.5 rounded-full">
                    Баланс: 1 зан. ⚠️
                  </span>
                  <span className="text-[10px] text-ink-400">Офлайн</span>
                </div>
              </div>

              <button
                onClick={() => router.push('/room/room-maksim')}
                className="px-5 py-2.5 bg-white text-ink-800 border border-[#EADBCC] rounded-full text-xs font-bold hover:bg-[#FFF7EE] transition-colors"
              >
                Вызов
              </button>
            </div>
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
              <span>Домашнее задание успешно назначено и отправлено в чат ученика!</span>
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
                placeholder="Например: Чистоговорка на звук [Р] перед зеркалом"
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
                placeholder="Опишите упражнение. Ребенок запишет голосовой ответ прямо в платформе..."
                required
                className="w-full bg-[#FFFDFB] border border-[#EADBCC] rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-coralAccent"
              />
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-2 bg-coralAccent hover:bg-coralAccent-hover text-white font-black px-6 py-3 rounded-full text-xs shadow-xs transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Отправить задание ученику</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
