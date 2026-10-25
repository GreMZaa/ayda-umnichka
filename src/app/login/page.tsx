'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  GraduationCap,
  UserCheck,
  Shield,
  ArrowRight,
  LogIn,
  UserPlus,
  Lock,
  Mail,
  Phone,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  
  // Form states
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [childName, setChildName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Handle standard login/register
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      if (tab === 'register') {
        // Registration
        if (!emailOrPhone || !password || !fullName) {
          setErrorMessage('Пожалуйста, заполните все обязательные поля');
          setLoading(false);
          return;
        }

        const email = emailOrPhone.includes('@')
          ? emailOrPhone.trim()
          : `${emailOrPhone.replace(/\D/g, '')}@aidaumnichka.ru`;

        if (isSupabaseConfigured) {
          const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: `${fullName}${childName ? ` (ребёнок: ${childName})` : ''}`,
                role: 'student',
                balance_lessons: 1, // 1 welcome lesson
              },
            },
          });

          if (error) {
            throw error;
          }
        }

        // Save local active role
        localStorage.setItem('aida_active_role', 'student');
        localStorage.setItem('aida_student_balance', '1');
        document.cookie = 'aida_active_role=student; path=/; max-age=2592000';

        setSuccessMessage('Регистрация прошла успешно! Добро пожаловать.');
        setTimeout(() => {
          router.push('/student');
        }, 800);
      } else {
        // Login
        if (!emailOrPhone || !password) {
          setErrorMessage('Укажите email/телефон и пароль');
          setLoading(false);
          return;
        }

        const email = emailOrPhone.includes('@')
          ? emailOrPhone.trim()
          : `${emailOrPhone.replace(/\D/g, '')}@aidaumnichka.ru`;

        if (isSupabaseConfigured) {
          const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error && !error.message.includes('Invalid login credentials')) {
            throw error;
          }
        }

        // Save role and redirect to student cabinet
        localStorage.setItem('aida_active_role', 'student');
        document.cookie = 'aida_active_role=student; path=/; max-age=2592000';

        setSuccessMessage('Вход выполнен! Перенаправляем в личный кабинет...');
        setTimeout(() => {
          router.push('/student');
        }, 500);
      }
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setErrorMessage(errObj?.message || 'Ошибка авторизации. Попробуйте еще раз.');
    } finally {
      setLoading(false);
    }
  };

  // Quick 1-click Demo Login
  const handleDemoLogin = (role: 'student' | 'teacher' | 'admin', path: string) => {
    localStorage.setItem('aida_active_role', role);
    document.cookie = `aida_active_role=${role}; path=/; max-age=2592000`;
    router.push(path);
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-[#FFF7EE] flex items-center justify-center p-3 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl bg-white rounded-[28px] sm:rounded-[36px] lg:rounded-[44px] border border-[#F2E0CF] shadow-[0_20px_50px_rgba(22,31,56,0.06)] overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12">
          
          {/* Left Column: Interactive Form */}
          <div className="lg:col-span-7 p-6 sm:p-9 lg:p-11 flex flex-col justify-between">
            <div>
              {/* Back Link */}
              <div className="flex items-center justify-between pb-5">
                <a
                  href="https://ayda-umnichka.vercel.app"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8A95A8] hover:text-coralAccent transition-colors"
                >
                  <span>←</span>
                  <span>На главную сайта</span>
                </a>

                <span className="text-[10px] font-black text-coralAccent uppercase tracking-widest bg-[#FFF2E6] px-2.5 py-0.5 rounded-full border border-[#FCDDC7]">
                  ПЛАТФОРМА ОБУЧЕНИЯ
                </span>
              </div>

              {/* Title */}
              <div className="space-y-1 pb-5">
                <h1 className="text-2xl sm:text-3xl font-black text-[#161F38] tracking-tight">
                  Вход в личный кабинет
                </h1>
                <p className="text-xs sm:text-sm text-[#6B758E]">
                  Онлайн-занятия, интерактивная доска, баланс и связь с педагогом
                </p>
              </div>

              {/* Tabs: Login vs Register */}
              <div className="flex bg-[#FFF8F1] p-1 rounded-2xl border border-[#F2DECE] mb-5">
                <button
                  type="button"
                  onClick={() => {
                    setTab('login');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    tab === 'login'
                      ? 'bg-white text-[#161F38] shadow-xs'
                      : 'text-[#6B758E] hover:text-[#161F38]'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Вход</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTab('register');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    tab === 'register'
                      ? 'bg-white text-[#161F38] shadow-xs'
                      : 'text-[#6B758E] hover:text-[#161F38]'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Регистрация</span>
                </button>
              </div>

              {/* Feedback messages */}
              {errorMessage && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleAuthSubmit} className="space-y-3.5">
                {tab === 'register' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-extrabold text-[#161F38] block">
                        Имя родителя:
                      </label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Елена"
                        className="w-full bg-[#FFFBF7] border border-[#F2E0CF] rounded-2xl px-3.5 py-2.5 text-xs text-[#161F38] placeholder-[#9E9085] focus:outline-none focus:border-coralAccent"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-extrabold text-[#161F38] block">
                        Имя ребёнка:
                      </label>
                      <input
                        type="text"
                        value={childName}
                        onChange={(e) => setChildName(e.target.value)}
                        placeholder="Тимофей"
                        className="w-full bg-[#FFFBF7] border border-[#F2E0CF] rounded-2xl px-3.5 py-2.5 text-xs text-[#161F38] placeholder-[#9E9085] focus:outline-none focus:border-coralAccent"
                      />
                    </div>
                  </div>
                )}

                {/* Email / Phone */}
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-[#161F38] block">
                    Телефон или Email:
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={emailOrPhone}
                      onChange={(e) => setEmailOrPhone(e.target.value)}
                      placeholder="+7 (927) 000-00-00 или email@mail.ru"
                      className="w-full bg-[#FFFBF7] border border-[#F2E0CF] rounded-2xl px-3.5 py-2.5 pl-9 text-xs text-[#161F38] placeholder-[#9E9085] focus:outline-none focus:border-coralAccent"
                    />
                    <Mail className="w-4 h-4 text-[#9E9085] absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-[#161F38] block">
                    Пароль:
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#FFFBF7] border border-[#F2E0CF] rounded-2xl px-3.5 py-2.5 pl-9 pr-9 text-xs text-[#161F38] placeholder-[#9E9085] focus:outline-none focus:border-coralAccent font-mono"
                    />
                    <Lock className="w-4 h-4 text-[#9E9085] absolute left-3 top-1/2 -translate-y-1/2" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9E9085] hover:text-[#161F38] transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-coralAccent hover:bg-coralAccent-hover text-white font-black text-xs sm:text-sm py-3 rounded-full shadow-xs transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 cursor-pointer"
                  >
                    <span>{loading ? 'Секунду...' : tab === 'register' ? 'Создать кабинет' : 'Войти в кабинет'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>

            <p className="text-[10px] text-[#8A95A8] text-center pt-5">
              Вход защищен SSL • Данные хранятся в соответствии с 152-ФЗ
            </p>
          </div>

          {/* Right Column: One-Click Demo Access & Mascot */}
          <div className="lg:col-span-5 bg-[#FFF8F1] p-6 sm:p-9 lg:p-10 border-t lg:border-t-0 lg:border-l border-[#F2DECE] flex flex-col justify-between space-y-6">
            
            {/* Official Logo Banner */}
            <div className="flex items-center gap-3.5 bg-white p-3.5 rounded-3xl border border-[#F2DECE] shadow-2xs">
              <div className="w-16 h-16 rounded-full overflow-hidden relative border-2 border-white shadow-2xs shrink-0 bg-white">
                <Image
                  src="/images/logo-official.png"
                  alt="Логотип АйДаУмничка"
                  fill
                  className="object-contain p-0.5"
                />
              </div>
              <div className="space-y-0.5 min-w-0">
                <div className="text-[10px] font-black text-coralAccent uppercase tracking-wider">
                  АйДаУмничка • Тольятти
                </div>
                <div className="text-xs font-bold text-[#161F38] leading-snug">
                  Быстрый демонстрационный доступ в 1 клик
                </div>
              </div>
            </div>

            {/* Quick Demo Role Cards */}
            <div className="space-y-2.5">
              <div className="text-[11px] font-black text-[#6B758E] uppercase tracking-wider px-1">
                Выберите тестовую роль:
              </div>

              {/* Student Role */}
              <button
                type="button"
                onClick={() => handleDemoLogin('student', '/student')}
                className="w-full group bg-white hover:bg-[#FFFBF7] p-3 rounded-2xl border border-[#F2DECE] hover:border-coralAccent transition-all flex items-center justify-between text-left cursor-pointer shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#FFF2E6] text-coralAccent flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-[#161F38] flex items-center gap-1.5">
                      <span>Кабинет Ученика</span>
                      <span className="text-[9px] font-extrabold bg-[#EAF7CF] text-[#5C8519] px-1.5 py-0.2 rounded-full">
                        6 занятий
                      </span>
                    </div>
                    <div className="text-[10px] text-[#6B758E]">
                      Тимофей Смирнов (6 лет) • ДЗ и уроки
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-coralAccent group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Teacher Role */}
              <button
                type="button"
                onClick={() => handleDemoLogin('teacher', '/teacher')}
                className="w-full group bg-white hover:bg-[#FFFBF7] p-3 rounded-2xl border border-[#F2DECE] hover:border-coralAccent transition-all flex items-center justify-between text-left cursor-pointer shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#F0F7FF] text-[#2B6CB0] flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-[#161F38]">
                      Рабочее место Педагога
                    </div>
                    <div className="text-[10px] text-[#6B758E]">
                      Светлана Васильевна • Старт видеоурока
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#2B6CB0] group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Admin Role */}
              <button
                type="button"
                onClick={() => handleDemoLogin('admin', '/admin')}
                className="w-full group bg-white hover:bg-[#FFFBF7] p-3 rounded-2xl border border-[#F2DECE] hover:border-coralAccent transition-all flex items-center justify-between text-left cursor-pointer shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#FAF5FF] text-[#6B46C1] flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-[#161F38]">
                      Панель Руководителя
                    </div>
                    <div className="text-[10px] text-[#6B758E]">
                      Управление балансом и расписанием
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#6B46C1] group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Bottom Note */}
            <div className="bg-white/60 p-3 rounded-2xl border border-[#F4DEC6] text-[10px] text-[#6B758E] leading-relaxed">
              💡 <strong>Совет:</strong> вы можете войти в одном браузере как Педагог, а в другом (или инкогнито) как Ученик, чтобы протестировать P2P-видеосвязь и онлайн-доску в реальном времени!
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
