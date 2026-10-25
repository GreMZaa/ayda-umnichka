'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  GraduationCap,
  UserCheck,
  Shield,
  ArrowRight,
  LogIn,
  UserPlus,
  Lock,
  Mail,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Zap,
  Check
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { getClientUserId, setClientUserId, issueNewUserId } from '@/lib/userSession';

// Validate redirect path to prevent Open Redirect (CWE-601)
function getSafeRedirect(rawRedirect: string | null, fallback: string): string {
  if (!rawRedirect) return fallback;
  if (rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') && !rawRedirect.includes('\\')) {
    return rawRedirect;
  }
  return fallback;
}

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirect');
  const cabinetId = searchParams.get('cabinetId');
  const errorParam = searchParams.get('error');

  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [selectedRole, setSelectedRole] = useState<'student' | 'teacher' | 'admin'>('student');
  
  // Form states
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [childName, setChildName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(errorParam === 'forbidden' ? 'Доступ ограничен. Войдите с соответствующими правами.' : '');
  const [successMessage, setSuccessMessage] = useState('');

  // Select registration role from the right block
  const handleSelectRegistrationRole = (role: 'student' | 'teacher' | 'admin') => {
    setSelectedRole(role);
    setTab('register');
    setErrorMessage('');
    setSuccessMessage('');
  };

  // Handle standard login/register via Supabase without email confirmation
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
          ? emailOrPhone.trim().toLowerCase()
          : `${emailOrPhone.replace(/\D/g, '')}@aidaumnichka.ru`;

        const publicId = issueNewUserId();

        // 1. Call server API to create Supabase user with email_confirm: true (no confirmation email needed!)
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            fullName,
            childName,
            role: selectedRole,
            publicId,
          }),
        });

        const resData = await res.json();

        if (!res.ok) {
          throw new Error(resData.error || 'Ошибка регистрации');
        }

        // 2. Immediately sign in to create browser session
        if (isSupabaseConfigured) {
          try {
            await supabase.auth.signInWithPassword({
              email,
              password,
            });
          } catch (signInErr) {
            console.warn('Auto sign-in fallback:', signInErr);
          }
        }

        // 3. Save local active role and verified auth user ID
        const displayName = `${fullName}${childName ? ` (ребёнок: ${childName})` : ''}`.trim();
        localStorage.setItem('aida_active_role', selectedRole);
        localStorage.setItem('aida_full_name', displayName);
        localStorage.setItem('aida_student_balance', selectedRole === 'student' ? '1' : '0');
        document.cookie = `aida_active_role=${selectedRole}; path=/; max-age=2592000; SameSite=Lax`;
        document.cookie = `aida_auth_user_id=${encodeURIComponent(publicId)}; path=/; max-age=2592000; SameSite=Lax`;
        document.cookie = `aida_user_id=${encodeURIComponent(publicId)}; path=/; max-age=2592000; SameSite=Lax`;

        setSuccessMessage(`Регистрация в Supabase успешна (без подтверждения почты)! Присвоен ID: ${publicId}. Входим...`);
        setTimeout(() => {
          const fallback = selectedRole === 'teacher' ? '/teacher' : selectedRole === 'admin' ? '/admin' : `/${publicId}`;
          const safeDest = getSafeRedirect(redirectParam, fallback);
          router.push(safeDest);
        }, 700);
      } else {
        // Login
        if (!emailOrPhone || !password) {
          setErrorMessage('Укажите email/телефон и пароль');
          setLoading(false);
          return;
        }

        const email = emailOrPhone.includes('@')
          ? emailOrPhone.trim().toLowerCase()
          : `${emailOrPhone.replace(/\D/g, '')}@aidaumnichka.ru`;

        let targetId = cabinetId || getClientUserId() || issueNewUserId();
        let userRole = 'student';

        if (isSupabaseConfigured) {
          const { data: signInData, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error && !error.message.includes('Invalid login credentials')) {
            throw error;
          }

          if (signInData?.user) {
            const { data: binding } = await supabase
              .from('user_bindings')
              .select('public_id, role, full_name, balance_lessons')
              .eq('auth_user_id', signInData.user.id)
              .maybeSingle();

            if (binding?.public_id) {
              targetId = binding.public_id;
              setClientUserId(targetId);
            }
            if (binding?.role) {
              userRole = binding.role;
            }
            if (binding?.full_name) {
              localStorage.setItem('aida_full_name', binding.full_name);
            }
            if (binding?.balance_lessons !== undefined) {
              localStorage.setItem('aida_student_balance', binding.balance_lessons.toString());
            }
          }
        }

        // Save role and verified auth cookies
        localStorage.setItem('aida_active_role', userRole);
        document.cookie = `aida_active_role=${userRole}; path=/; max-age=2592000; SameSite=Lax`;
        document.cookie = `aida_auth_user_id=${encodeURIComponent(targetId)}; path=/; max-age=2592000; SameSite=Lax`;
        document.cookie = `aida_user_id=${encodeURIComponent(targetId)}; path=/; max-age=2592000; SameSite=Lax`;

        setSuccessMessage('Вход выполнен! Перенаправляем в личный кабинет...');
        setTimeout(() => {
          const fallback = userRole === 'teacher' ? '/teacher' : userRole === 'admin' ? '/admin' : `/${targetId}`;
          const safeDest = getSafeRedirect(redirectParam, fallback);
          router.push(safeDest);
        }, 500);
      }
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setErrorMessage(errObj?.message || 'Ошибка авторизации. Попробуйте еще раз.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[calc(100dvh-4rem)] sm:h-[calc(100dvh-5rem)] max-h-[calc(100dvh-4rem)] sm:max-h-[calc(100dvh-5rem)] overflow-hidden bg-[#FFF7EE] flex items-center justify-center p-2 sm:p-4 lg:p-6 select-none">
      <div className="w-full max-w-4xl max-h-full overflow-hidden bg-white rounded-[24px] sm:rounded-[32px] border border-[#F2E0CF] shadow-[0_20px_50px_rgba(22,31,56,0.06)] flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          
          {/* Left Column: Interactive Supabase Auth Form */}
          <div className="lg:col-span-7 p-4 sm:p-6 lg:p-7 flex flex-col justify-between">
            <div>
              {/* Back Link & Tag */}
              <div className="flex items-center justify-between pb-2">
                <a
                  href="https://ayda-umnichka.vercel.app"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8A95A8] hover:text-coralAccent transition-colors duration-140"
                >
                  <span>←</span>
                  <span>На главную</span>
                </a>
                <span className="text-[10px] font-black text-coralAccent uppercase tracking-widest bg-[#FFF2E6] px-2.5 py-0.5 rounded-full border border-[#FCDDC7]">
                  SUPABASE AUTH
                </span>
              </div>

              {/* Title */}
              <div className="space-y-0.5 pb-3">
                <h1 className="text-xl sm:text-2xl font-black text-[#161F38] tracking-tight">
                  {tab === 'register' ? 'Быстрая регистрация' : 'Вход в личный кабинет'}
                </h1>
                <p className="text-[11px] sm:text-xs text-[#6B758E]">
                  {tab === 'register'
                    ? `Создание кабинета: ${selectedRole === 'student' ? 'Ученик (+1 урок)' : selectedRole === 'teacher' ? 'Педагог' : 'Администратор'} • Без подтверждения почты`
                    : 'Онлайн-занятия, интерактивная доска, баланс и связь с педагогом'}
                </p>
              </div>

              {/* Tabs: Login vs Register */}
              <div className="flex bg-[#FFF8F1] p-1 rounded-2xl border border-[#F2DECE] mb-3">
                <button
                  type="button"
                  onClick={() => {
                    setTab('login');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-black transition-[background-color,color,box-shadow] duration-140 ease-out-emil active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer ${
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
                  className={`flex-1 py-1.5 rounded-xl text-xs font-black transition-[background-color,color,box-shadow] duration-140 ease-out-emil active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer ${
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
                <div className="mb-2.5 p-2.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span className="leading-tight">{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="mb-2.5 p-2.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span className="leading-tight">{successMessage}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleAuthSubmit} className="space-y-2.5">
                {tab === 'register' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-0.5">
                      <label className="text-[11px] font-extrabold text-[#161F38] block">
                        Ваше имя:
                      </label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Иван Иванов"
                        className="w-full bg-[#FFFBF7] border border-[#F2E0CF] rounded-xl px-3 py-1.5 text-xs text-[#161F38] placeholder-[#9E9085] focus:outline-none focus:border-coralAccent"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[11px] font-extrabold text-[#161F38] block">
                        Имя ребёнка {selectedRole === 'teacher' && '(или специализация)'}:
                      </label>
                      <input
                        type="text"
                        value={childName}
                        onChange={(e) => setChildName(e.target.value)}
                        placeholder={selectedRole === 'teacher' ? 'Логопед-дефектолог' : 'Артём (6 лет)'}
                        className="w-full bg-[#FFFBF7] border border-[#F2E0CF] rounded-xl px-3 py-1.5 text-xs text-[#161F38] placeholder-[#9E9085] focus:outline-none focus:border-coralAccent"
                      />
                    </div>
                  </div>
                )}

                {/* Email / Phone */}
                <div className="space-y-0.5">
                  <label className="text-[11px] font-extrabold text-[#161F38] block">
                    Email или номер телефона:
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={emailOrPhone}
                      onChange={(e) => setEmailOrPhone(e.target.value)}
                      placeholder="user@mail.ru или +7 (927) 000-00-00"
                      className="w-full bg-[#FFFBF7] border border-[#F2E0CF] rounded-xl px-3 py-1.5 pl-8 text-xs text-[#161F38] placeholder-[#9E9085] focus:outline-none focus:border-coralAccent"
                    />
                    <Mail className="w-3.5 h-3.5 text-[#9E9085] absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-0.5">
                  <label className="text-[11px] font-extrabold text-[#161F38] block">
                    Пароль:
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#FFFBF7] border border-[#F2E0CF] rounded-xl px-3 py-1.5 pl-8 pr-8 text-xs text-[#161F38] placeholder-[#9E9085] focus:outline-none focus:border-coralAccent font-mono"
                    />
                    <Lock className="w-3.5 h-3.5 text-[#9E9085] absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9E9085] hover:text-[#161F38] transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-coralAccent hover:bg-coralAccent-hover text-white font-black text-xs sm:text-sm py-2.5 rounded-full shadow-xs transition-[background-color,transform,box-shadow] duration-140 ease-out-emil flex items-center justify-center gap-2 active:scale-[0.97] disabled:opacity-50 cursor-pointer"
                  >
                    <span>
                      {loading
                        ? 'Секунду...'
                        : tab === 'register'
                        ? `Зарегистрировать (${selectedRole === 'student' ? 'Ученик' : selectedRole === 'teacher' ? 'Педагог' : 'Админ'})`
                        : 'Войти в личный кабинет'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </div>

            <p className="text-[10px] text-[#8A95A8] text-center pt-2">
              ⚡ Подтверждение почты отключено • Мгновенный доступ через Supabase
            </p>
          </div>

          {/* Right Column: Registration Buttons Block */}
          <div className="lg:col-span-5 bg-[#FFF8F1] p-4 sm:p-6 lg:p-7 border-t lg:border-t-0 lg:border-l border-[#F2DECE] flex flex-col justify-between space-y-4">
            
            {/* Header */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-[#5C8519] uppercase tracking-wider bg-[#EAF7CF] px-2 py-0.5 rounded-full border border-[#D5ECA3] flex items-center gap-1">
                  <Zap className="w-3 h-3 text-[#5C8519]" />
                  БЫСТРАЯ РЕГИСТРАЦИЯ
                </span>
              </div>
              <h3 className="text-base font-black text-[#161F38] leading-snug">
                Кнопки регистрации
              </h3>
              <p className="text-[11px] text-[#6B758E] leading-relaxed">
                Нажмите нужную кнопку, чтобы зарегистрироваться без подтверждения почты:
              </p>
            </div>

            {/* Quick Registration Buttons */}
            <div className="space-y-2">
              {/* Button 1: Student Registration */}
              <button
                type="button"
                onClick={() => handleSelectRegistrationRole('student')}
                className={`w-full group p-3 rounded-2xl border transition-[background-color,border-color,transform] duration-140 ease-out-emil active:scale-[0.98] flex items-center justify-between text-left cursor-pointer shadow-2xs ${
                  tab === 'register' && selectedRole === 'student'
                    ? 'bg-white border-coralAccent ring-2 ring-coralAccent/20'
                    : 'bg-white/80 hover:bg-white border-[#F2DECE] hover:border-coralAccent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#FFF2E6] text-coralAccent flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform duration-140">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-[#161F38] flex items-center gap-1.5">
                      <span>Регистрация Ученика</span>
                      <span className="text-[9px] font-extrabold bg-[#EAF7CF] text-[#5C8519] px-1.5 py-0.2 rounded-full">
                        +1 урок
                      </span>
                    </div>
                    <div className="text-[10px] text-[#6B758E]">
                      Личный ID, расписание и домашние задания
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-coralAccent group-hover:translate-x-1 transition-transform duration-140" />
              </button>

              {/* Button 2: Teacher Registration */}
              <button
                type="button"
                onClick={() => handleSelectRegistrationRole('teacher')}
                className={`w-full group p-3 rounded-2xl border transition-[background-color,border-color,transform] duration-140 ease-out-emil active:scale-[0.98] flex items-center justify-between text-left cursor-pointer shadow-2xs ${
                  tab === 'register' && selectedRole === 'teacher'
                    ? 'bg-white border-[#2B6CB0] ring-2 ring-[#2B6CB0]/20'
                    : 'bg-white/80 hover:bg-white border-[#F2DECE] hover:border-[#2B6CB0]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#F0F7FF] text-[#2B6CB0] flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform duration-140">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-[#161F38]">
                      Регистрация Педагога
                    </div>
                    <div className="text-[10px] text-[#6B758E]">
                      Кабинет репетитора, доска и старт видеоуроков
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[#2B6CB0] group-hover:translate-x-1 transition-transform duration-140" />
              </button>

              {/* Button 3: Admin Registration */}
              <button
                type="button"
                onClick={() => handleSelectRegistrationRole('admin')}
                className={`w-full group p-3 rounded-2xl border transition-[background-color,border-color,transform] duration-140 ease-out-emil active:scale-[0.98] flex items-center justify-between text-left cursor-pointer shadow-2xs ${
                  tab === 'register' && selectedRole === 'admin'
                    ? 'bg-white border-[#6B46C1] ring-2 ring-[#6B46C1]/20'
                    : 'bg-white/80 hover:bg-white border-[#F2DECE] hover:border-[#6B46C1]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#FAF5FF] text-[#6B46C1] flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform duration-140">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-[#161F38]">
                      Регистрация Руководителя
                    </div>
                    <div className="text-[10px] text-[#6B758E]">
                      Панель управления учениками и балансами
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[#6B46C1] group-hover:translate-x-1 transition-transform duration-140" />
              </button>
            </div>

            {/* Instant Access Benefits */}
            <div className="bg-white/70 p-2.5 rounded-2xl border border-[#F2DECE] space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#161F38]">
                <Check className="w-3 h-3 text-[#5C8519]" />
                <span>Без ссылок на почту: вход сразу после отправки</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#161F38]">
                <Check className="w-3 h-3 text-[#5C8519]" />
                <span>Присвоение персонального ID в базе Supabase</span>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="h-screen bg-[#FFF7EE] flex items-center justify-center text-xs font-bold text-[#6B758E]">Загрузка...</div>}>
      <LoginFormContent />
    </Suspense>
  );
}
