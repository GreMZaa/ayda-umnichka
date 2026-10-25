'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Video, Sparkles } from 'lucide-react';

interface DayItem {
  name: string;
  date: number;
  hasLesson?: boolean;
  isToday?: boolean;
}

export default function WeekCalendar({ onSelectDay }: { onSelectDay?: (date: number) => void }) {
  const [selectedDate, setSelectedDate] = useState<number>(9);

  const days: DayItem[] = [
    { name: 'Пн', date: 7, hasLesson: false },
    { name: 'Вт', date: 8, hasLesson: false },
    { name: 'Ср', date: 9, hasLesson: false, isToday: true },
    { name: 'Чт', date: 10, hasLesson: false },
    { name: 'Пт', date: 11, hasLesson: false },
    { name: 'Сб', date: 12, hasLesson: false },
  ];

  const handleSelect = (d: number) => {
    setSelectedDate(d);
    if (onSelectDay) onSelectDay(d);
  };

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#F2E0CF] shadow-xs flex flex-col justify-between h-full space-y-3">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-extrabold text-coralAccent uppercase tracking-widest">
            Расписание занятий
          </span>
          <h4 className="font-black text-sm sm:text-base text-[#161F38] mt-0.5">Октябрь 2026</h4>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            aria-label="Предыдущая неделя"
            className="w-7 h-7 rounded-full bg-[#FFF7EE] hover:bg-[#FDEEDC] text-[#161F38] flex items-center justify-center transition-colors duration-140 active:scale-90 cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            aria-label="Следующая неделя"
            className="w-7 h-7 rounded-full bg-[#FFF7EE] hover:bg-[#FDEEDC] text-[#161F38] flex items-center justify-center transition-colors duration-140 active:scale-90 cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Days Row */}
      <div className="grid grid-cols-6 gap-1.5">
        {days.map((d) => {
          const isSelected = selectedDate === d.date;
          return (
            <button
              key={d.date}
              onClick={() => handleSelect(d.date)}
              className={`py-2 px-1.5 rounded-xl flex flex-col items-center justify-center transition-[background-color,color,transform,box-shadow] duration-140 ease-out-emil active:scale-95 cursor-pointer relative ${
                isSelected
                  ? 'bg-[#161F38] text-white shadow-2xs'
                  : 'bg-[#FFF8F1] hover:bg-[#FDEEDC] text-[#161F38]'
              }`}
            >
              <span className={`text-[9px] font-bold ${isSelected ? 'text-white/70' : 'text-[#8A95A8]'}`}>
                {d.name}
              </span>
              <span className="text-xs font-black mt-0.5">{d.date}</span>

              {/* Lesson indicator dot */}
              {d.hasLesson && (
                <span
                  className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                    isSelected ? 'bg-[#5C8519]' : 'bg-coralAccent'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Day Status */}
      <div className="pt-2 border-t border-[#F8EDE1] flex items-center justify-between text-xs">
        <span className="text-[#6B758E] flex items-center gap-1.5 text-[11px] font-medium">
          <Sparkles className="w-3.5 h-3.5 text-coralAccent" />
          Уроков не запланировано
        </span>
        <span className="text-[10px] font-extrabold text-coralAccent bg-[#FFF7EE] px-2.5 py-0.5 rounded-full border border-[#FCDDC7]">
          Свободно
        </span>
      </div>
    </div>
  );
}
