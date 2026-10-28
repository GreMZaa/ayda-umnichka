'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Calendar as CalendarIcon, Clock, Check, ChevronDown } from 'lucide-react';

interface DateTimePickerProps {
  value: string; // ISO format or 'YYYY-MM-DDTHH:mm'
  onChange: (value: string) => void;
  label?: string;
  minDate?: string; // 'YYYY-MM-DD'
  className?: string;
}

const POPULAR_TIME_SLOTS = [
  '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00',
  '17:00', '18:00', '19:00', '20:00'
];

const MINUTE_OPTIONS = ['00', '15', '30', '45'];

function padZero(num: number): string {
  return num < 10 ? `0${num}` : `${num}`;
}

function formatDateToIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = padZero(d.getMonth() + 1);
  const day = padZero(d.getDate());
  return `${y}-${m}-${day}`;
}

function formatReadableDate(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  const dateObj = new Date(y, m - 1, d);
  const weekday = dateObj.toLocaleDateString('ru-RU', { weekday: 'short' });
  const month = dateObj.toLocaleDateString('ru-RU', { month: 'long', day: 'numeric' });
  const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return `${capitalizedWeekday}, ${month}`;
}

export default function DateTimePicker({
  value,
  onChange,
  label = 'Дата и время урока',
  minDate,
  className = '',
}: DateTimePickerProps) {
  // Parse current value
  const { initialDate, initialTime } = useMemo(() => {
    if (!value) {
      const now = new Date();
      // default to next round hour today
      now.setHours(now.getHours() + 1, 0, 0, 0);
      return {
        initialDate: formatDateToIsoDate(now),
        initialTime: `${padZero(now.getHours())}:00`,
      };
    }
    const parts = value.split('T');
    const datePart = parts[0] || formatDateToIsoDate(new Date());
    let timePart = parts[1] || '12:00';
    if (timePart.length > 5) timePart = timePart.slice(0, 5);
    return {
      initialDate: datePart,
      initialTime: timePart,
    };
  }, [value]);

  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const [selectedTime, setSelectedTime] = useState<string>(initialTime);
  const [showCustomDate, setShowCustomDate] = useState<boolean>(false);
  const [showCustomTime, setShowCustomTime] = useState<boolean>(false);

  // Sync internal state when external value changes
  useEffect(() => {
    if (value && value.includes('T')) {
      const [d, t] = value.split('T');
      if (d) setSelectedDate(d);
      if (t) setSelectedTime(t.slice(0, 5));
    } else if (!value) {
      onChange(`${initialDate}T${initialTime}`);
    }
  }, [value, initialDate, initialTime, onChange]);

  // Update parent when date or time changes
  const updateDateTime = (newDate: string, newTime: string) => {
    setSelectedDate(newDate);
    setSelectedTime(newTime);
    onChange(`${newDate}T${newTime}`);
  };

  // Quick dates (Today, Tomorrow, Day after, etc.)
  const quickDates = useMemo(() => {
    const today = new Date();
    const dates = [];

    for (let i = 0; i < 4; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const iso = formatDateToIsoDate(d);

      let labelText = '';
      if (i === 0) labelText = 'Сегодня';
      else if (i === 1) labelText = 'Завтра';
      else if (i === 2) labelText = 'Послезавтра';
      else {
        const weekday = d.toLocaleDateString('ru-RU', { weekday: 'short' });
        labelText = weekday.charAt(0).toUpperCase() + weekday.slice(1);
      }

      const dayMonth = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace('.', '');
      dates.push({ iso, label: labelText, sublabel: dayMonth });
    }
    return dates;
  }, []);

  const isQuickDate = quickDates.some((qd) => qd.iso === selectedDate);
  const isPresetTime = POPULAR_TIME_SLOTS.includes(selectedTime);

  // Parse hour and minute for custom time dropdowns
  const [curHour, curMinute] = useMemo(() => {
    const [h, m] = (selectedTime || '12:00').split(':');
    return [h || '12', m || '00'];
  }, [selectedTime]);

  return (
    <div className={`space-y-3 ${className}`}>
      {label && (
        <label className="block text-xs font-black text-[#161F38]">
          {label}
        </label>
      )}

      {/* Modern Card Container */}
      <div className="bg-[#FFFDFB] border border-[#EADBCC] rounded-2xl p-3 sm:p-3.5 space-y-3 shadow-2xs">
        
        {/* 1. DATE SECTION */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#8A95A8] flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-coralAccent" />
              Выберите день
            </span>
            <button
              type="button"
              onClick={() => setShowCustomDate((prev) => !prev)}
              className="text-[11px] font-bold text-coralAccent hover:text-coralAccent-hover transition-colors cursor-pointer flex items-center gap-0.5"
            >
              <span>{showCustomDate ? 'Быстрый выбор' : 'Календарь'}</span>
              <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showCustomDate ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {showCustomDate || (!isQuickDate && selectedDate) ? (
            <div className="space-y-1.5 animate-in fade-in duration-150">
              <input
                type="date"
                min={minDate || formatDateToIsoDate(new Date())}
                value={selectedDate}
                onChange={(e) => {
                  if (e.target.value) {
                    updateDateTime(e.target.value, selectedTime);
                  }
                }}
                className="w-full bg-white border border-[#EADBCC] rounded-xl px-3 py-2 text-xs font-bold text-[#161F38] focus:outline-none focus:border-coralAccent focus:ring-2 focus:ring-coralAccent/20 transition-all cursor-pointer"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {quickDates.map((qd) => {
                const active = selectedDate === qd.iso;
                return (
                  <button
                    key={qd.iso}
                    type="button"
                    onClick={() => updateDateTime(qd.iso, selectedTime)}
                    className={`py-2 px-2.5 rounded-xl border text-left transition-all duration-140 cursor-pointer flex flex-col justify-between ${
                      active
                        ? 'bg-gradient-to-tr from-[#FF6B4A] to-[#FFA259] text-white border-transparent shadow-xs shadow-orange-500/20 scale-[1.02]'
                        : 'bg-white hover:bg-[#FFF8F1] text-[#161F38] border-[#EADBCC] hover:border-[#DC8253]'
                    }`}
                  >
                    <span className={`text-xs font-black truncate ${active ? 'text-white' : 'text-[#161F38]'}`}>
                      {qd.label}
                    </span>
                    <span className={`text-[10px] font-bold mt-0.5 ${active ? 'text-white/90' : 'text-[#8A95A8]'}`}>
                      {qd.sublabel}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. TIME SECTION */}
        <div className="pt-2 border-t border-[#F8EDE1]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#8A95A8] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-coralAccent" />
              Время начала
            </span>
            <button
              type="button"
              onClick={() => setShowCustomTime((prev) => !prev)}
              className="text-[11px] font-bold text-coralAccent hover:text-coralAccent-hover transition-colors cursor-pointer flex items-center gap-0.5"
            >
              <span>{showCustomTime ? 'Быстрые слоты' : 'Своё время'}</span>
              <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showCustomTime ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {showCustomTime || !isPresetTime ? (
            <div className="flex items-center gap-2 p-2 bg-white rounded-xl border border-[#EADBCC] animate-in fade-in duration-150">
              <div className="flex-1">
                <label className="text-[10px] font-extrabold text-[#8A95A8] uppercase block mb-1">
                  Часы
                </label>
                <select
                  value={curHour}
                  onChange={(e) => updateDateTime(selectedDate, `${e.target.value}:${curMinute}`)}
                  className="w-full bg-[#FFFDFB] border border-[#EADBCC] rounded-lg px-2.5 py-1.5 text-xs font-black text-[#161F38] focus:outline-none focus:border-coralAccent cursor-pointer"
                >
                  {Array.from({ length: 15 }, (_, i) => padZero(i + 8)).map((hour) => (
                    <option key={hour} value={hour}>
                      {hour}:00
                    </option>
                  ))}
                </select>
              </div>

              <span className="text-base font-black text-[#8A95A8] pt-3">:</span>

              <div className="flex-1">
                <label className="text-[10px] font-extrabold text-[#8A95A8] uppercase block mb-1">
                  Минуты
                </label>
                <select
                  value={curMinute}
                  onChange={(e) => updateDateTime(selectedDate, `${curHour}:${e.target.value}`)}
                  className="w-full bg-[#FFFDFB] border border-[#EADBCC] rounded-lg px-2.5 py-1.5 text-xs font-black text-[#161F38] focus:outline-none focus:border-coralAccent cursor-pointer"
                >
                  {MINUTE_OPTIONS.map((min) => (
                    <option key={min} value={min}>
                      {min} мин
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
              {POPULAR_TIME_SLOTS.map((slot) => {
                const active = selectedTime === slot;
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => updateDateTime(selectedDate, slot)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-black transition-all duration-140 cursor-pointer text-center ${
                      active
                        ? 'bg-gradient-to-tr from-[#FF6B4A] to-[#FFA259] text-white shadow-xs shadow-orange-500/20 scale-[1.03]'
                        : 'bg-white hover:bg-[#FFF8F1] text-[#161F38] border border-[#EADBCC] hover:border-[#DC8253]'
                    }`}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. ELEGANT SUMMARY PILL */}
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-[#FFF8F1] border border-[#F2DECE] rounded-xl text-xs">
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-coralAccent font-black">📅</span>
            <span className="font-extrabold text-[#161F38] truncate">
              {formatReadableDate(selectedDate)}
            </span>
            <span className="text-[#8A95A8]">•</span>
            <span className="font-black text-coralAccent">
              {selectedTime}
            </span>
          </div>
          <span className="text-[10px] font-bold text-[#5C8519] bg-[#EEF8D5] px-2 py-0.5 rounded-full shrink-0 border border-[#DFEFC0] flex items-center gap-1">
            <Check className="w-3 h-3 text-[#5C8519]" />
            Готово
          </span>
        </div>

      </div>
    </div>
  );
}
