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
    { name: 'Вт', date: 8, hasLesson: true },
    { name: 'Ср', date: 9, hasLesson: true, isToday: true },
    { name: 'Чт', date: 10, hasLesson: false },
    { name: 'Пт', date: 11, hasLesson: true },
    { name: 'Сб', date: 12, hasLesson: false },
  ];

  const handleSelect = (d: number) => {
    setSelectedDate(d);
    if (onSelectDay) onSelectDay(d);
  };

  return (
    <div className="bg-white rounded-[28px] p-5 border border-[#F2E3D5] shadow-xs space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-extrabold text-coralAccent uppercase tracking-widest">
            Расписание занятий
          </span>
          <h4 className="font-black text-base text-ink-900 mt-0.5">Октябрь 2026</h4>
        </div>

        <div className="flex items-center gap-1.5">
          <button className="w-8 h-8 rounded-full bg-[#FFF7EE] hover:bg-[#FDEEDC] text-ink-700 flex items-center justify-center transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button className="w-8 h-8 rounded-full bg-[#FFF7EE] hover:bg-[#FDEEDC] text-ink-700 flex items-center justify-center transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Days Row */}
      <div className="grid grid-cols-6 gap-2">
        {days.map((d) => {
          const isSelected = selectedDate === d.date;
          return (
            <button
              key={d.date}
              onClick={() => handleSelect(d.date)}
              className={`py-3 px-2 rounded-2xl flex flex-col items-center justify-center transition-all relative ${
                isSelected
                  ? 'bg-ink-900 text-white shadow-sm'
                  : 'bg-[#FFF8F1] hover:bg-[#FDEEDC] text-ink-800'
              }`}
            >
              <span className={`text-[10px] font-bold ${isSelected ? 'text-white/70' : 'text-ink-400'}`}>
                {d.name}
              </span>
              <span className="text-sm font-black mt-0.5">{d.date}</span>

              {/* Lesson indicator dot */}
              {d.hasLesson && (
                <span
                  className={`w-1.5 h-1.5 rounded-full mt-1 ${
                    isSelected ? 'bg-limeAccent' : 'bg-coralAccent'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Day Status */}
      <div className="pt-2 border-t border-[#F7EBE0] flex items-center justify-between text-xs">
        <span className="text-ink-500 flex items-center gap-1.5 font-medium">
          <Sparkles className="w-3.5 h-3.5 text-coralAccent" />
          {selectedDate === 9 ? 'Сегодня: 1 урок в 14:00' : 'Уроков не запланировано'}
        </span>
        <span className="text-[11px] font-extrabold text-coralAccent bg-[#FFF7EE] px-3 py-1 rounded-full border border-[#F4DEC6]">
          {selectedDate === 9 ? 'Онлайн-урок [Р]' : 'Свободный день'}
        </span>
      </div>
    </div>
  );
}
