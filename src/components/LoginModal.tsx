'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { X, GraduationCap, UserCheck, Shield, ExternalLink, ArrowRight, Sparkles, Check, Copy } from 'lucide-react';
import { getLkUrl } from '@/lib/lkUrl';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const lkUrl = typeof window !== 'undefined' ? getLkUrl('/student') : '/student';

  if (!isOpen) return null;

  const handleRoleSelect = (role: 'student' | 'teacher' | 'admin', path: string) => {
    localStorage.setItem('aida_active_role', role);
    onClose();
    router.push(path);
  };

  const copyLkUrl = () => {
    if (typeof window !== 'undefined') {
      const fullUrl = lkUrl.startsWith('http') ? lkUrl : `${window.location.origin}${lkUrl}`;
      navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-[32px] p-6 sm:p-7 shadow-2xl border border-[#F2E0CF] space-y-5">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Закрыть"
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#FFF7EE] flex items-center justify-center text-[#161F38]/60 hover:text-[#161F38] hover:bg-[#FCECDD] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-coralAccent uppercase tracking-widest bg-[#FFF2E6] px-2.5 py-0.5 rounded-full border border-[#FCDDC7]">
              Личный кабинет
            </span>
            <span className="text-[11px] text-[#8A95A8]">«АйДаУмничка»</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-[#161F38] tracking-tight">
            Вход и авторизация
          </h3>
          <p className="text-xs text-[#6B758E] leading-relaxed">
            Выберите роль для быстрого входа или перейдите в личный кабинет на поддомене.
          </p>
        </div>

        {/* Roles Quick Login */}
        <div className="space-y-2.5 pt-1">
          {/* Student */}
          <button
            onClick={() => handleRoleSelect('student', '/student')}
            className="w-full group bg-[#FFF8F1] hover:bg-[#FFF2E6] p-3.5 rounded-2xl border border-[#F2DECE] hover:border-coralAccent transition-all flex items-center justify-between text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white text-coralAccent flex items-center justify-center font-bold shadow-2xs group-hover:scale-105 transition-transform">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-black text-[#161F38]">
                  Кабинет Ученика / Родителя
                </div>
                <div className="text-[11px] text-[#6B758E]">
                  Баланс занятий, уроки, ДЗ и связь с репетитором
                </div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-coralAccent group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Teacher */}
          <button
            onClick={() => handleRoleSelect('teacher', '/teacher')}
            className="w-full group bg-[#FFF8F1] hover:bg-[#FFF2E6] p-3.5 rounded-2xl border border-[#F2DECE] hover:border-coralAccent transition-all flex items-center justify-between text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white text-[#161F38] flex items-center justify-center font-bold shadow-2xs group-hover:scale-105 transition-transform">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-black text-[#161F38]">
                  Рабочее место Педагога
                </div>
                <div className="text-[11px] text-[#6B758E]">
                  Запуск On-Demand уроков, доска, список учеников
                </div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[#161F38] group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Admin */}
          <button
            onClick={() => handleRoleSelect('admin', '/admin')}
            className="w-full group bg-[#FFF8F1] hover:bg-[#FFF2E6] p-3.5 rounded-2xl border border-[#F2DECE] hover:border-coralAccent transition-all flex items-center justify-between text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white text-[#161F38] flex items-center justify-center font-bold shadow-2xs group-hover:scale-105 transition-transform">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-black text-[#161F38]">
                  Панель Администратора
                </div>
                <div className="text-[11px] text-[#6B758E]">
                  Пополнение абонементов и статистика центра в Тольятти
                </div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[#161F38] group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Subdomain Notice for Vercel Free Setup */}
        <div className="p-3 bg-[#FFFDFB] rounded-2xl border border-[#F2E0CF] space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-[#161F38]">
            <span className="flex items-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5 text-coralAccent" />
              Поддомен личного кабинета:
            </span>
            <button
              onClick={copyLkUrl}
              className="text-[10px] font-black text-coralAccent hover:underline flex items-center gap-1 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-[#5C8519]" />
                  <span>Скопировано!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Копировать URL</span>
                </>
              )}
            </button>
          </div>
          <div className="font-mono text-[10px] text-[#6B758E] bg-[#FFF8F1] p-2 rounded-xl truncate">
            {lkUrl.startsWith('http') ? lkUrl : `https://lk-[ваш-проект].vercel.app/student`}
          </div>
        </div>
      </div>
    </div>
  );
}
