'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Video, UserCheck, Plus, BookOpen, Clock, Users, ArrowUpRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { INITIAL_PROFILES, INITIAL_LESSONS } from '@/lib/store';
import { LessonSession } from '@/types';

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
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-100 border-2 border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-xl">
            {teacher.fullName[0]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800">{teacher.fullName}</h1>
              <span className="text-[11px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full">
                Логопед-дефектолог
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Детский центр «АйДаУмничка», г. Тольятти • Стаж: 12 лет
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-3.5 py-2 rounded-xl">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Готова к проведению P2P уроков</span>
        </div>
      </div>

      {/* Main Grid: Launcher + Students */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* On-Demand Lesson Launcher (Solid Indigo, No gradient) */}
        <div className="lg:col-span-2 bg-indigo-700 border border-indigo-800 rounded-3xl p-6 sm:p-8 text-white shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-solar-400 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-solar-300">
                On-Demand Режим (Без расписания)
              </span>
            </div>
            <h2 className="text-2xl font-black tracking-tight">Запустить онлайн-урок</h2>
            <p className="text-indigo-100 text-xs sm:text-sm mt-1 max-w-xl">
              Создайте защищенную P2P комнату в 1 клик. Ученик мгновенно получит уведомление в чате и сможет войти без логина и пароля. Занятие спишется с баланса только по завершении.
            </p>

            <form onSubmit={startOnDemandLesson} className="mt-6 space-y-4 max-w-xl">
              <div>
                <label className="block text-xs font-semibold text-indigo-100 mb-1.5">
                  Выберите ученика
                </label>
                <select
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  className="w-full bg-indigo-800 border border-indigo-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-solar-400"
                >
                  <option value="Тимофей Смирнов" className="text-slate-800">
                    Тимофей Смирнов (Баланс: 6 занятий) — Готов к уроку
                  </option>
                  <option value="Алиса Васильева" className="text-slate-800">
                    Алиса Васильева (Баланс: 4 занятия) — В сети
                  </option>
                  <option value="Максим Кузнецов" className="text-slate-800">
                    Максим Кузнецов (Баланс: 1 занятие ⚠️) — Офлайн
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-indigo-100 mb-1.5">
                  Тема сегодняшнего урока
                </label>
                <input
                  type="text"
                  value={lessonTopic}
                  onChange={(e) => setLessonTopic(e.target.value)}
                  placeholder="Например: Постановка шипящих звуков..."
                  required
                  className="w-full bg-indigo-800 border border-indigo-600 rounded-xl px-4 py-2.5 text-white placeholder-indigo-300 text-sm focus:outline-none focus:ring-2 focus:ring-solar-400"
                />
              </div>

              <button
                type="submit"
                disabled={isCreating}
                className="inline-flex items-center gap-2 bg-solar-500 hover:bg-solar-400 text-slate-800 font-black px-6 py-3 rounded-xl transition-all shadow-md active:scale-95 text-sm"
              >
                <Video className="w-4 h-4 text-slate-800" />
                <span>{isCreating ? 'Генерация P2P комнаты...' : 'Начать урок сейчас'}</span>
              </button>
            </form>
          </div>
        </div>

        {/* Assigned Students Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-brand-600" />
                <h3 className="font-bold text-base text-slate-800">Закрепленные ученики</h3>
              </div>
              <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                3 ученика
              </span>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-slate-800">Тимофей Смирнов</h4>
                  <p className="text-[11px] text-slate-500">6 лет • Дошкольник</p>
                  <span className="inline-block mt-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                    Баланс: 6 зан.
                  </span>
                </div>
                <button
                  onClick={() => router.push('/room/room-logoped-timofey')}
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  Вызов
                </button>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-slate-800">Алиса Васильева</h4>
                  <p className="text-[11px] text-slate-500">7 лет • 1 класс</p>
                  <span className="inline-block mt-1 text-[10px] font-bold text-brand-800 bg-brand-50 px-2 py-0.5 rounded">
                    Баланс: 4 зан.
                  </span>
                </div>
                <button
                  onClick={() => router.push('/room/room-alisa')}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 transition-colors"
                >
                  Вызов
                </button>
              </div>

              <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/30 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-slate-800">Максим Кузнецов</h4>
                  <p className="text-[11px] text-slate-500">5 лет • Логоритмика</p>
                  <span className="inline-block mt-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                    Баланс: 1 зан. ⚠️
                  </span>
                </div>
                <button
                  onClick={() => router.push('/room/room-maksim')}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 transition-colors"
                >
                  Вызов
                </button>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 mt-4 text-center">
            Ученики добавляются администратором центра «АйДаУмничка»
          </p>
        </div>
      </div>

      {/* Quick Homework Assigner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2.5 mb-6">
          <BookOpen className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-slate-800">Выдать домашнее задание</h2>
        </div>

        {hwSuccess && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Домашнее задание успешно назначено и отправлено в чат ученика!</span>
          </div>
        )}

        <form onSubmit={assignHomework} className="space-y-4 max-w-2xl">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Название задания
            </label>
            <input
              type="text"
              value={hwTitle}
              onChange={(e) => setHwTitle(e.target.value)}
              placeholder="Например: Чистоговорка на звук [Р] перед зеркалом"
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Инструкция и задание для ученика/родителя
            </label>
            <textarea
              rows={3}
              value={hwDesc}
              onChange={(e) => setHwDesc(e.target.value)}
              placeholder="Опишите, что нужно сделать. Ребенок сможет прикрепить фото или наговорить голосовое сообщение..."
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Назначить задание</span>
          </button>
        </form>
      </div>
    </div>
  );
}

