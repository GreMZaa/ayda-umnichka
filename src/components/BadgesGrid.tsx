'use client';

import React from 'react';
import { Award, Flame, Star, Lock, Sparkles } from 'lucide-react';

export default function BadgesGrid() {
  const badges = [
    {
      id: 'b1',
      title: 'Чистый [Р]',
      desc: 'Поставил изолированный звук [Р]',
      color: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]',
      icon: '🦁',
      unlocked: false,
    },
    {
      id: 'b2',
      title: 'Супер Звезда',
      desc: 'Выполнил 5 ДЗ подряд без пропусков',
      color: 'bg-[#EBF8CE] text-ink-900 border-[#C5E87D]',
      icon: '⭐',
      unlocked: false,
    },
    {
      id: 'b3',
      title: 'Мастер речи',
      desc: 'Проговорил 10 чистоговорок',
      color: 'bg-[#FDEEE9] text-coralAccent border-[#F5A57A]',
      icon: '🎤',
      unlocked: false,
    },
    {
      id: 'b4',
      title: 'Шипящие звуки',
      desc: 'Автоматизация звуков [Ш] и [Ж]',
      color: 'bg-[#F1F5FD] text-ink-800 border-[#D3D9E6]',
      icon: '🐍',
      unlocked: false,
    },
  ];

  return (
    <div className="bg-white rounded-[32px] p-6 sm:p-7 border border-[#F2E3D5] shadow-xs space-y-6">
      {/* Streak Banner */}
      <div className="bg-[#FFF8F1] border border-[#F4E3D2] p-4 sm:p-5 rounded-2xl flex items-center justify-between text-ink-900 shadow-xs relative overflow-hidden">
        <div className="flex items-center gap-3.5 z-10">
          <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-2xl shadow-xs shrink-0 border border-[#F2DECE]">
            🔥
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-coralAccent">
              Ударный режим
            </span>
            <h4 className="text-lg sm:text-xl font-black text-ink-900 leading-tight">
              0 уроков • Начните обучение
            </h4>
          </div>
        </div>

        <div className="text-right z-10 hidden sm:block">
          <span className="text-xs font-bold text-ink-500 block">Пройдите первый урок</span>
          <span className="text-xs font-black bg-limeAccent text-ink-900 px-3 py-1 rounded-full shadow-2xs">
            +50 XP за старт
          </span>
        </div>
      </div>

      {/* Progress & Stats Row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#FFF7EE] p-4 rounded-2xl border border-[#F2E2D0] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-amber-500 shadow-2xs font-bold text-lg">
            🥇
          </div>
          <div>
            <span className="text-[10px] text-ink-400 font-bold uppercase tracking-wider">Уровень</span>
            <p className="font-black text-sm text-ink-900">Золотой ученик</p>
          </div>
        </div>

        <div className="bg-[#FFF7EE] p-4 rounded-2xl border border-[#F2E2D0] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-coralAccent shadow-2xs font-bold text-lg">
            ⭐
          </div>
          <div>
            <span className="text-[10px] text-ink-400 font-bold uppercase tracking-wider">Опыт</span>
            <p className="font-black text-sm text-ink-900">320 XP</p>
          </div>
        </div>
      </div>

      {/* Level Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-ink-700">Прогресс постановки звуков</span>
          <span className="font-black text-coralAccent">75%</span>
        </div>
        <div className="w-full bg-[#FFF7EE] h-3 rounded-full overflow-hidden p-0.5 border border-[#F2E2D0]">
          <div
            className="bg-coralAccent h-full rounded-full transition-[width] duration-250 ease-out-emil"
            style={{ width: '75%' }}
          />
        </div>
      </div>

      {/* Badges Grid (Hexagonal & Capsule icons from Image 2) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-black text-sm text-ink-900 flex items-center gap-2">
            <Award className="w-4 h-4 text-coralAccent" />
            <span>Награды и достижения</span>
          </h4>
          <span className="text-xs text-ink-400 font-semibold">3 из 4 получено</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {badges.map((b) => (
            <div
              key={b.id}
              className={`p-3.5 rounded-2xl border text-center transition-[transform,box-shadow] duration-140 ease-out-emil flex flex-col items-center justify-between select-none ${
                b.unlocked
                  ? `${b.color} shadow-xs hover:scale-[1.02] active:scale-[0.97] cursor-pointer`
                  : 'bg-slate-50 text-slate-400 border-slate-200 opacity-60'
              }`}
            >
              <div className="text-2xl mb-1.5 relative">
                {b.icon}
                {!b.unlocked && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-full">
                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                )}
              </div>
              <h5 className="font-black text-xs leading-tight">{b.title}</h5>
              <p className="text-[10px] opacity-80 mt-1 leading-snug line-clamp-2">{b.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
