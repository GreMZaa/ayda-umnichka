'use client';

import React, { useState } from 'react';
import { CheckCircle2, Send, ShieldCheck, Clock, AlertCircle, Loader2 } from 'lucide-react';

export default function TrialLessonForm() {
  const [parentName, setParentName] = useState('');
  const [phone, setPhone] = useState('');
  const [childName, setChildName] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('Логопедия и развитие речи');
  
  const [errors, setErrors] = useState<{ parentName?: string; phone?: string }>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const subjects = [
    'Логопедия и развитие речи',
    'Подготовка к школе',
    'Чтение и грамота',
    'Математика и логика',
    'Английский для малышей',
  ];

  const validate = () => {
    const newErrors: { parentName?: string; phone?: string } = {};
    if (!parentName.trim() || parentName.trim().length < 2) {
      newErrors.parentName = 'Пожалуйста, введите ваше имя (от 2 букв)';
    }

    const digits = phone.replace(/\D/g, '');
    if (!phone.trim() || digits.length < 10) {
      newErrors.phone = 'Укажите номер телефона (не менее 10 цифр)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) return;

    setLoading(true);

    try {
      const response = await fetch('/api/trial-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentName: parentName.trim(),
          phone: phone.trim(),
          childName: childName.trim(),
          selectedSubject,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || 'Не удалось отправить заявку. Попробуйте еще раз.');
      }

      // Offline / Local client backup
      try {
        const savedLeads = JSON.parse(localStorage.getItem('aida_trial_leads') || '[]');
        savedLeads.push({
          parentName: parentName.trim(),
          phone: phone.trim(),
          childName: childName.trim(),
          selectedSubject,
          createdAt: new Date().toISOString(),
          serverSynced: true,
        });
        localStorage.setItem('aida_trial_leads', JSON.stringify(savedLeads));
      } catch (storageErr) {
        console.warn('LocalStorage error:', storageErr);
      }

      setSubmitted(true);
    } catch (err: any) {
      console.error('Trial submission error:', err);
      // Graceful fallback: still save locally so client data is never lost
      try {
        const savedLeads = JSON.parse(localStorage.getItem('aida_trial_leads') || '[]');
        savedLeads.push({
          parentName: parentName.trim(),
          phone: phone.trim(),
          childName: childName.trim(),
          selectedSubject,
          createdAt: new Date().toISOString(),
          serverSynced: false,
        });
        localStorage.setItem('aida_trial_leads', JSON.stringify(savedLeads));
      } catch {}

      setServerError(
        err.message || 'Ошибка сети. Вы также можете позвонить нам напрямую: 8 995 485 46 67'
      );
    } finally {
      setLoading(false);
    }
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
            Заявка на бесплатный вводный урок успешно зарегистрирована
          </p>
          <p className="text-xs text-[#6B758E] leading-relaxed pt-2">
            Педагог центра «АйДаУмничка» свяжется с вами по номеру <strong>{phone}</strong> в течение 15 минут для согласования дня и времени.
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={() => {
              setSubmitted(false);
              setParentName('');
              setPhone('');
              setChildName('');
              setErrors({});
            }}
            className="text-xs font-bold text-[#161F38] hover:text-coralAccent underline transition-colors duration-140 cursor-pointer"
          >
            Отправить ещё одну заявку
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#FFFDFB] rounded-3xl p-4 sm:p-5 lg:p-6 border border-[#F2DECE] shadow-2xs w-full">
      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-3.5" noValidate>
        {serverError && (
          <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Parent Name */}
          <div className="space-y-1">
            <label className="text-xs font-extrabold text-[#161F38] block">
              Ваше имя <span className="text-red-500">*</span>:
            </label>
            <input
              type="text"
              required
              value={parentName}
              onChange={(e) => {
                setParentName(e.target.value);
                if (errors.parentName) setErrors((prev) => ({ ...prev, parentName: undefined }));
              }}
              placeholder="Например: Елена"
              className={`w-full bg-[#FFFBF7] rounded-2xl px-3.5 py-2.5 sm:py-2 text-base sm:text-xs text-[#161F38] placeholder-[#9E9085] focus:outline-none focus:ring-1 transition-colors duration-140 ${
                errors.parentName
                  ? 'border border-red-400 focus:border-red-500 focus:ring-red-400'
                  : 'border border-[#F2E0CF] focus:border-coralAccent focus:ring-coralAccent'
              }`}
            />
            {errors.parentName && (
              <p className="text-[11px] text-red-600 font-medium pl-1">{errors.parentName}</p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-1">
            <label className="text-xs font-extrabold text-[#161F38] block">
              Телефон для связи <span className="text-red-500">*</span>:
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
              }}
              placeholder="+7 (999) 000-00-00"
              className={`w-full bg-[#FFFBF7] rounded-2xl px-3.5 py-2.5 sm:py-2 text-base sm:text-xs text-[#161F38] placeholder-[#9E9085] focus:outline-none focus:ring-1 font-mono transition-colors duration-140 ${
                errors.phone
                  ? 'border border-red-400 focus:border-red-500 focus:ring-red-400'
                  : 'border border-[#F2E0CF] focus:border-coralAccent focus:ring-coralAccent'
              }`}
            />
            {errors.phone && (
              <p className="text-[11px] text-red-600 font-medium pl-1">{errors.phone}</p>
            )}
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
            disabled={loading}
            className="w-full bg-coralAccent hover:bg-coralAccent-hover disabled:opacity-60 text-white font-black text-xs sm:text-sm py-3.5 rounded-full shadow-sm transition-[background-color,transform,box-shadow] duration-140 ease-out-emil flex items-center justify-center gap-2 active:scale-[0.97] cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Отправляем заявку...</span>
              </>
            ) : (
              <>
                <span>Записаться на бесплатный урок</span>
                <Send className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* Trust Note */}
        <div className="flex items-center justify-center gap-4 text-[11px] text-[#6B758E] font-medium pt-0.5">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-[#5C8519]" />
            20 минут в игровой форме
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#5C8519]" />
            0 ₽ без скрытых условий
          </span>
        </div>
      </form>
    </div>
  );
}
