'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { CheckCircle2, Sparkles, Send, PhoneCall, ShieldCheck, Clock } from 'lucide-react';

export default function TrialLessonForm() {
  const [parentName, setParentName] = useState('');
  const [phone, setPhone] = useState('');
  const [childName, setChildName] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('Логопедия и развитие речи');
  const [submitted, setSubmitted] = useState(false);

  const subjects = [
    'Логопедия и развитие речи',
    'Подготовка к школе',
    'Чтение и грамота',
    'Математика и логика',
    'Английский для малышей',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentName.trim() || !phone.trim()) {
      alert('Пожалуйста, укажите ваше имя и номер телефона');
      return;
    }

    // Save lead to localStorage
    const newLead = {
      parentName,
      phone,
      childName,
      selectedSubject,
      createdAt: new Date().toISOString(),
    };
    const savedLeads = JSON.parse(localStorage.getItem('aida_trial_leads') || '[]');
    savedLeads.push(newLead);
    localStorage.setItem('aida_trial_leads', JSON.stringify(savedLeads));

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="bg-[#FFF8F1] rounded-3xl p-6 sm:p-8 border border-[#F2E2D0] text-center space-y-4 max-w-lg mx-auto animate-in fade-in zoom-in-95 duration-200 ease-out-emil">
        <div className="w-16 h-16 rounded-full bg-[#EAF7CF] text-[#5C8519] flex items-center justify-center mx-auto shadow-xs">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h3 className="text-xl sm:text-2xl font-black text-[#161F38]">
            Спасибо, {parentName}!
          </h3>
          <p className="text-sm font-bold text-coralAccent">
            Заявка на бесплатный вводный урок успешно принята
          </p>
          <p className="text-xs text-[#6B758E] leading-relaxed pt-2">
            Педагог центра «АйДаУмничка» перезвонит вам по номеру <strong>{phone}</strong> в течение 15 минут для выбора удобного дня и времени.
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={() => setSubmitted(false)}
            className="text-xs font-bold text-[#161F38] hover:text-coralAccent underline transition-colors duration-140"
          >
            Отправить ещё одну заявку
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-5 lg:p-6 border border-[#F2E0CF] shadow-xs max-w-xl mx-auto w-full">
      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Parent Name */}
          <div className="space-y-1">
            <label className="text-xs font-extrabold text-[#161F38] block">
              Ваше имя:
            </label>
            <input
              type="text"
              required
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
              placeholder="Например: Елена"
              className="w-full bg-[#FFFBF7] border border-[#F2E0CF] rounded-2xl px-3.5 py-2.5 sm:py-2 text-base sm:text-xs text-[#161F38] placeholder-[#9E9085] focus:outline-none focus:border-coralAccent focus:ring-1 focus:ring-coralAccent"
            />
          </div>

          {/* Phone */}
          <div className="space-y-1">
            <label className="text-xs font-extrabold text-[#161F38] block">
              Телефон для связи:
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+7 (999) 000-00-00"
              className="w-full bg-[#FFFBF7] border border-[#F2E0CF] rounded-2xl px-3.5 py-2.5 sm:py-2 text-base sm:text-xs text-[#161F38] placeholder-[#9E9085] focus:outline-none focus:border-coralAccent focus:ring-1 focus:ring-coralAccent font-mono"
            />
          </div>
        </div>

        {/* Child Name (Optional) */}
        <div className="space-y-1">
          <label className="text-xs font-extrabold text-[#161F38] flex items-center justify-between">
            <span>Имя ребёнка (необязательно):</span>
            <span className="text-[10px] font-normal text-[#8A95A8]">для обращения на уроке</span>
          </label>
          <input
            type="text"
            value={childName}
            onChange={(e) => setChildName(e.target.value)}
            placeholder="Например: Артём"
            className="w-full bg-[#FFFBF7] border border-[#F2E0CF] rounded-2xl px-3.5 py-2.5 sm:py-2 text-base sm:text-xs text-[#161F38] placeholder-[#9E9085] focus:outline-none focus:border-coralAccent focus:ring-1 focus:ring-coralAccent"
          />
        </div>

        {/* Subject Pills */}
        <div className="space-y-1.5">
          <label className="text-xs font-extrabold text-[#161F38] block">
            Интересующий предмет:
          </label>
          <div className="flex flex-wrap gap-1.5">
            {subjects.map((subj) => (
              <button
                key={subj}
                type="button"
                onClick={() => setSelectedSubject(subj)}
                className={`text-[11px] font-bold px-3 py-1.5 rounded-full border transition-[background-color,border-color,color,transform] duration-140 ease-out-emil active:scale-95 cursor-pointer ${
                  selectedSubject === subj
                    ? 'bg-[#161F38] text-white border-[#161F38] shadow-2xs'
                    : 'bg-[#FFF8F1] text-[#161F38]/80 border-[#F2E0CF] hover:border-coralAccent'
                }`}
              >
                {subj}
              </button>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-1.5">
          <button
            type="submit"
            className="w-full bg-coralAccent hover:bg-coralAccent-hover text-white font-black text-xs sm:text-sm py-3 rounded-full shadow-sm transition-[background-color,transform,box-shadow] duration-140 ease-out-emil flex items-center justify-center gap-2 active:scale-[0.97] cursor-pointer"
          >
            <span>Записаться на бесплатный урок</span>
            <Send className="w-4 h-4" />
          </button>
        </div>

        {/* Trust Note */}
        <div className="flex items-center justify-center gap-4 text-[10px] text-[#7C889E] font-medium pt-0.5">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-[#5C8519]" />
            Длительность 25 минут
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-[#5C8519]" />
            0 ₽ без скрытых условий
          </span>
        </div>
      </form>
    </div>
  );
}
