'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Lightbulb, CheckCircle2, ChevronRight, ChevronLeft, Volume2 } from 'lucide-react';

export default function SpeechTrainer() {
  const [selectedOption, setSelectedOption] = useState<string | null>('A');
  const [answered, setAnswered] = useState<boolean>(true);

  const options = [
    { key: 'A', text: 'Рыба', correct: true },
    { key: 'B', text: 'Шар', correct: false },
    { key: 'C', text: 'Корова', correct: false },
    { key: 'D', text: 'Барабан', correct: false },
  ];

  const handleSelect = (key: string) => {
    setSelectedOption(key);
    setAnswered(true);
  };

  return (
    <div className="bg-[#5B63D3] text-white rounded-[36px] p-6 sm:p-8 shadow-md border-2 border-[#4A51BF] flex flex-col justify-between space-y-6">
      {/* Top Bar: Progress & Timer like Reference Image 2 */}
      <div>
        <div className="flex items-center justify-between mb-3 text-xs">
          <span className="font-extrabold uppercase tracking-wider text-white/80">
            Вопрос 03 из 05
          </span>
          <span className="bg-[#FBBF24] text-ink-900 font-black px-3 py-1 rounded-full text-xs shadow-xs">
            ⏱️ 03:31
          </span>
        </div>

        {/* Question Progress Bars */}
        <div className="grid grid-cols-5 gap-1.5">
          <div className="h-1.5 rounded-full bg-white" />
          <div className="h-1.5 rounded-full bg-white" />
          <div className="h-1.5 rounded-full bg-white" />
          <div className="h-1.5 rounded-full bg-white/30" />
          <div className="h-1.5 rounded-full bg-white/30" />
        </div>
      </div>

      {/* Mascot & Audio Prompt */}
      <div className="flex items-center justify-between gap-4 py-2">
        <div className="w-20 h-20 rounded-2xl overflow-hidden relative border-2 border-white/40 shadow-sm shrink-0 bg-white">
          <Image
            src="/images/mascot-study.png"
            alt="Кот наставник"
            fill
            className="object-cover"
          />
        </div>

        <button
          onClick={() => alert('Произношение чистоговорки: «Р-р-рыба плавает в воде»')}
          className="flex-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl p-3 flex items-center justify-between text-xs transition-colors"
        >
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-[#FBBF24]" />
            <span className="font-bold text-left">Послушать задание голосом</span>
          </div>
          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">0:08</span>
        </button>
      </div>

      {/* Question Text */}
      <div className="space-y-1">
        <span className="text-xs text-[#FBBF24] font-bold uppercase tracking-wider">
          Тема: Звук [Р] в начале слова
        </span>
        <h3 className="text-lg sm:text-xl font-black leading-snug">
          В каком слове звук [Р] стоит на самом первом месте?
        </h3>
      </div>

      {/* Multiple Choice Options (Capsule pills from Reference Image 2) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((opt) => {
          const isSelected = selectedOption === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => handleSelect(opt.key)}
              className={`p-3.5 rounded-2xl text-sm font-extrabold transition-[background-color,border-color,transform,box-shadow] duration-140 ease-out-emil active:scale-[0.98] cursor-pointer flex items-center justify-between border-2 ${
                isSelected
                  ? 'bg-[#FBBF24] text-ink-900 border-white shadow-sm scale-[1.01]'
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                  isSelected ? 'bg-ink-900 text-white' : 'bg-white/20 text-white'
                }`}>
                  {opt.key}
                </span>
                <span>{opt.text}</span>
              </div>

              {isSelected && opt.correct && (
                <CheckCircle2 className="w-5 h-5 text-ink-900" />
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Actions Bar */}
      <div className="pt-2 flex items-center justify-between border-t border-white/20">
        <button className="flex items-center gap-1.5 text-xs text-white/80 hover:text-white font-bold transition-colors duration-140 cursor-pointer active:scale-95">
          <ChevronLeft className="w-4 h-4" />
          <span>Назад</span>
        </button>

        <button className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-[#FBBF24] shadow-xs transition-[background-color,transform] duration-140 ease-out-emil active:scale-90 cursor-pointer">
          <Lightbulb className="w-5 h-5" />
        </button>

        <button
          onClick={() => alert('Отлично! +15 XP начислено за правильный ответ!')}
          className="bg-white hover:bg-white/90 text-ink-900 px-6 py-2.5 rounded-full text-xs font-black flex items-center gap-1 shadow-sm transition-[background-color,transform] duration-140 ease-out-emil active:scale-[0.97] cursor-pointer"
        >
          <span>Далее</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
