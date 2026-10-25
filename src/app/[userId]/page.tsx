'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import BalanceWidget from '@/components/BalanceWidget';
import VoiceRecorder from '@/components/VoiceRecorder';
import WeekCalendar from '@/components/WeekCalendar';
import BadgesGrid from '@/components/BadgesGrid';
import SpeechTrainer from '@/components/SpeechTrainer';
import PhoneMockup from '@/components/PhoneMockup';
import { INITIAL_PROFILES, INITIAL_LESSONS, INITIAL_HOMEWORKS } from '@/lib/store';
import { LessonSession, HomeworkItem } from '@/types';
import {
  Video,
  Calendar,
  Clock,
  BookOpen,
  CheckCircle,
  MessageSquare,
  Bell,
  Smartphone,
  Monitor,
  Link as LinkIcon,
  Copy,
  Check,
  Edit2,
  ShieldCheck,
  Lock,
  Sparkles,
  ArrowRight,
  UserCheck,
  Database
} from 'lucide-react';
import {
  setCustomSlug,
  setClientUserId,
  syncUserWithSupabase,
  updateSlugInSupabase,
  bindAuthUserWithSupabase
} from '@/lib/userSession';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

interface PageProps {
  params: Promise<{ userId: string }>;
}

export default function UserPersonalCabinetPage({ params }: PageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const routeUserId = resolvedParams.userId;

  const [currentId, setCurrentId] = useState<string>(routeUserId);
  const [isEditingSlug, setIsEditingSlug] = useState(false);
  const [newSlugInput, setNewSlugInput] = useState(routeUserId);
  const [copied, setCopied] = useState(false);

  // Pre-registration binding states
  const [isRegistered, setIsRegistered] = useState(false);
  const [isSupabaseSynced, setIsSupabaseSynced] = useState(false);
  const [isAccessBlocked, setIsAccessBlocked] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [bindEmail, setBindEmail] = useState('');
  const [bindPassword, setBindPassword] = useState('');
  const [bindSuccess, setBindSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Dashboard states
  const student = INITIAL_PROFILES[0];
  const [balance, setBalance] = useState<number>(student.balanceLessons);
  const [lessons, setLessons] = useState<LessonSession[]>(INITIAL_LESSONS);
  const [homeworks, setHomeworks] = useState<HomeworkItem[]>(INITIAL_HOMEWORKS);
  const [recordingHwId, setRecordingHwId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'desktop' | 'phone'>('desktop');

  useEffect(() => {
    // Sync current ID into cookies and localStorage
    if (routeUserId) {
      setCurrentId(routeUserId);
      setNewSlugInput(routeUserId);
      setClientUserId(routeUserId);

      // Verify or initialize binding in Supabase
      (async () => {
        try {
          const res = await fetch(`/api/user/bind?publicId=${encodeURIComponent(routeUserId)}`);
          const data = await res.json();
          if (data?.exists && data.binding) {
            setIsSupabaseSynced(true);
            if (data.binding.is_registered) {
              // Verify ownership: must match authenticated user or admin
              const activeAuthUser =
                localStorage.getItem('aida_auth_user_id') ||
                document.cookie.match(/(?:^|; )aida_auth_user_id=([^;]*)/)?.[1];
              const activeRole =
                localStorage.getItem('aida_active_role') ||
                document.cookie.match(/(?:^|; )aida_active_role=([^;]*)/)?.[1];

              const decodedAuth = activeAuthUser ? decodeURIComponent(activeAuthUser).toLowerCase() : '';
              const isOwner = decodedAuth === routeUserId.toLowerCase() || activeRole === 'admin';

              if (!isOwner) {
                // If not authenticated as this user, block access and require login
                setIsAccessBlocked(true);
                return;
              }
              setIsRegistered(true);
            }
            if (data.binding.balance_lessons !== undefined) {
              setBalance(data.binding.balance_lessons);
            }
          } else {
            // First time visitor: automatically register pre-registration ID in Supabase
            const syncRes = await syncUserWithSupabase(routeUserId, student.fullName);
            if (syncRes?.success) {
              setIsSupabaseSynced(true);
            }
          }
        } catch (err) {
          console.warn('Supabase sync check failed:', err);
        }
      })();
    }

    const savedBalance = localStorage.getItem('aida_student_balance');
    if (savedBalance) {
      setBalance(parseInt(savedBalance, 10));
    }

    const savedRole = localStorage.getItem('aida_active_role');
    if (savedRole) {
      setIsRegistered(true);
    }
  }, [routeUserId, student.fullName]);

  const fullPersonalUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/${currentId}`
    : `https://lk-ayda-umnichka.vercel.app/${currentId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(fullPersonalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveCustomSlug = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSlugInput.trim()) return;
    setIsSaving(true);

    const saved = setCustomSlug(newSlugInput.trim());
    if (saved) {
      // Update slug in Supabase
      await updateSlugInSupabase(currentId, saved);
      setCurrentId(saved);
      setIsEditingSlug(false);
      setIsSaving(false);
      router.push(`/${saved}`);
    } else {
      setIsSaving(false);
    }
  };

  const handleBindAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bindEmail || !bindPassword) return;
    setIsSaving(true);

    try {
      if (isSupabaseConfigured) {
        const { data: signUpData, error } = await supabase.auth.signUp({
          email: bindEmail,
          password: bindPassword,
          options: {
            data: {
              public_id: currentId,
              full_name: student.fullName,
              role: 'student',
              balance_lessons: balance,
            },
          },
        });

        if (error) {
          throw error;
        }

        // Bind in Supabase user_bindings & profiles
        await bindAuthUserWithSupabase({
          publicId: currentId,
          authUserId: signUpData.user?.id || '',
          fullName: student.fullName,
          email: bindEmail,
          role: 'student',
        });
      }

      localStorage.setItem('aida_active_role', 'student');
      localStorage.setItem('aida_registered_email', bindEmail);
      document.cookie = 'aida_active_role=student; path=/; max-age=2592000';

      setIsRegistered(true);
      setIsSupabaseSynced(true);
      setBindSuccess(true);
      setTimeout(() => {
        setShowRegisterModal(false);
        setBindSuccess(false);
      }, 1500);
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      alert(errObj?.message || 'Ошибка привязки аккаунта в Supabase');
    } finally {
      setIsSaving(false);
    }
  };

  const handleVoiceSubmission = (hwId: string, durationSec: number) => {
    setHomeworks((prev) =>
      prev.map((hw) =>
        hw.id === hwId
          ? {
              ...hw,
              status: 'submitted',
              studentSolutionText: `Аудиоответ отправлен педагогу (${durationSec} сек.)`,
            }
          : hw
      )
    );
    setRecordingHwId(null);
    alert('Домашнее задание успешно отправлено на проверку преподавателю!');
  };

  if (isAccessBlocked) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-[32px] p-6 sm:p-8 border border-[#F2DECE] shadow-lg text-center space-y-4 animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-3xl bg-[#FFF2E6] text-coralAccent flex items-center justify-center mx-auto border border-[#FCDDC7]">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <span className="text-[10px] font-black text-coralAccent uppercase tracking-widest bg-[#FFF2E6] px-2.5 py-0.5 rounded-full border border-[#FCDDC7]">
              Защищенный кабинет
            </span>
            <h2 className="text-xl font-black text-[#161F38]">
              Кабинет /{routeUserId} защищен
            </h2>
            <p className="text-xs text-[#6B758E] leading-relaxed">
              Этот личный кабинет привязан к зарегистрированному аккаунту в центре «АйДаУмничка». Для доступа необходимо войти через официальную форму входа.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href={`/login?redirect=/${encodeURIComponent(routeUserId)}&cabinetId=${encodeURIComponent(routeUserId)}`}
              className="inline-flex items-center justify-center gap-2 w-full bg-coralAccent hover:bg-coralAccent-hover text-white py-3 rounded-full text-xs font-black transition-all shadow-xs cursor-pointer"
            >
              <span>Войти через форму входа</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─────────────────────────────────────────────────────────────
          1. PERSONAL ADDRESS BAR & PRE-REGISTRATION STATUS BANNER
          (Exact match with user requirement: ID in the URL bar like vk.ru/s.sharonovv)
          ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#F2DECE] shadow-xs space-y-3.5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          
          {/* Personal URL Badge */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-8 h-8 rounded-xl bg-[#FFF2E6] text-coralAccent flex items-center justify-center shrink-0">
              <LinkIcon className="w-4 h-4" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase text-[#8A95A8] tracking-wider">
                  Ваш постоянный личный адрес:
                </span>
                {isSupabaseSynced ? (
                  <span className="text-[9px] font-bold bg-[#EAF7CF] text-[#5C8519] px-2 py-0.5 rounded-full inline-flex items-center gap-1 border border-[#CCE8A2]">
                    <Database className="w-2.5 h-2.5" />
                    Привязан к Supabase
                  </span>
                ) : (
                  <span className="text-[9px] font-bold bg-[#FFF2E6] text-coralAccent px-2 py-0.5 rounded-full border border-[#FCDDC7]">
                    Выдан до регистрации
                  </span>
                )}
                {isRegistered ? (
                  <span className="text-[9px] font-bold bg-[#EAF7CF] text-[#5C8519] px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                    <UserCheck className="w-2.5 h-2.5" />
                    Аккаунт подтвержден
                  </span>
                ) : (
                  <span className="text-[9px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                    Предварительный ID
                  </span>
                )}
              </div>

              {isEditingSlug ? (
                <form onSubmit={handleSaveCustomSlug} className="flex items-center gap-2 pt-1">
                  <div className="flex items-center bg-[#FFF8F1] border border-coralAccent rounded-xl px-2.5 py-1 text-xs font-mono font-bold text-[#161F38]">
                    <span className="text-[#8A95A8]">/</span>
                    <input
                      type="text"
                      autoFocus
                      value={newSlugInput}
                      onChange={(e) => setNewSlugInput(e.target.value)}
                      placeholder="s.sharonovv"
                      className="bg-transparent outline-none px-1 text-xs font-mono font-bold text-coralAccent w-32 sm:w-44"
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-coralAccent hover:bg-coralAccent-hover text-white text-xs font-bold px-3 py-1 rounded-xl shadow-2xs transition-all cursor-pointer"
                  >
                    Сохранить
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingSlug(false)}
                    className="text-xs text-[#8A95A8] hover:text-[#161F38] px-2 py-1"
                  >
                    Отмена
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-2 pt-0.5">
                  <span className="font-mono text-xs sm:text-sm font-black text-[#161F38] bg-[#FFF8F1] px-2.5 py-1 rounded-xl border border-[#F2DECE]">
                    {fullPersonalUrl}
                  </span>

                  {/* Edit custom alias button */}
                  <button
                    onClick={() => setIsEditingSlug(true)}
                    title="Задать красивый адрес (например: s.sharonovv)"
                    className="p-1.5 rounded-lg text-[#8A95A8] hover:text-[#161F38] hover:bg-[#FFF7EE] transition-all cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons: Copy link & Protect Account */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 bg-[#FFF8F1] hover:bg-[#FFF2E6] border border-[#F2DECE] text-[#161F38] px-3.5 py-2 rounded-2xl text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#5C8519]" />
                  <span className="text-[#5C8519]">Скопировано!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#8A95A8]" />
                  <span>Скопировать ссылку</span>
                </>
              )}
            </button>

            {!isRegistered ? (
              <button
                onClick={() => setShowRegisterModal(true)}
                className="inline-flex items-center gap-1.5 bg-coralAccent hover:bg-coralAccent-hover text-white px-3.5 py-2 rounded-2xl text-xs font-black transition-all shadow-2xs cursor-pointer active:scale-95"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Защитить паролем</span>
              </button>
            ) : (
              <div className="inline-flex items-center gap-1.5 bg-[#EAF7CF] text-[#5C8519] border border-[#D5ECA6] px-3 py-1.5 rounded-2xl text-xs font-extrabold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Защищен</span>
              </div>
            )}
          </div>

        </div>

        {/* Pre-registration Explanation Notice */}
        {!isRegistered && (
          <div className="bg-[#FFFBF7] p-3 rounded-2xl border border-[#F4E3D2] flex items-center justify-between gap-3 text-xs text-[#6B758E]">
            <p className="leading-relaxed">
              💡 <strong>Ваш кабинет уже работает:</strong> этот адрес <span className="font-mono font-bold text-[#161F38]">/{currentId}</span> уникален и закреплен за вами. Сохраните ссылку в закладки или задайте пароль, чтобы входить с телефона и любого устройства.
            </p>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. PASSWORD BINDING MODAL
          ───────────────────────────────────────────────────────────── */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-[32px] p-6 sm:p-7 shadow-2xl border border-[#F2E0CF] space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-coralAccent uppercase tracking-widest bg-[#FFF2E6] px-2.5 py-0.5 rounded-full border border-[#FCDDC7]">
                ЗАКРЕПЛЕНИЕ ID: {currentId}
              </span>
              <h3 className="text-xl font-black text-[#161F38]">
                Задайте пароль для кабинета
              </h3>
              <p className="text-xs text-[#6B758E] leading-relaxed">
                Ваш текущий ID <span className="font-mono font-bold text-[#161F38]">/{currentId}</span> и 6 уроков на балансе будут навсегда привязаны к вашему аккаунту.
              </p>
            </div>

            {bindSuccess ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
                <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto" />
                <div className="text-sm font-black text-emerald-800">
                  Аккаунт успешно закреплен!
                </div>
                <div className="text-xs text-emerald-700">
                  Теперь вы можете входить по email и паролю с любого устройства.
                </div>
              </div>
            ) : (
              <form onSubmit={handleBindAccount} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-[#161F38] block">
                    Ваш Email или телефон:
                  </label>
                  <input
                    type="text"
                    required
                    value={bindEmail}
                    onChange={(e) => setBindEmail(e.target.value)}
                    placeholder="elena.smirnova@mail.ru"
                    className="w-full bg-[#FFFBF7] border border-[#F2E0CF] rounded-2xl px-3.5 py-2.5 text-xs text-[#161F38] placeholder-[#9E9085] focus:outline-none focus:border-coralAccent"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-[#161F38] block">
                    Придумайте пароль:
                  </label>
                  <input
                    type="password"
                    required
                    value={bindPassword}
                    onChange={(e) => setBindPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#FFFBF7] border border-[#F2E0CF] rounded-2xl px-3.5 py-2.5 text-xs text-[#161F38] placeholder-[#9E9085] focus:outline-none focus:border-coralAccent font-mono"
                  />
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 bg-coralAccent hover:bg-coralAccent-hover disabled:opacity-60 text-white text-xs font-black py-3 rounded-full shadow-xs transition-all cursor-pointer"
                  >
                    {isSaving ? 'Привязка в Supabase...' : 'Привязать к аккаунту в Supabase'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRegisterModal(false)}
                    className="text-xs font-bold text-[#8A95A8] hover:text-[#161F38] px-4 py-3"
                  >
                    Позже
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. VIEW SWITCHER (Desktop vs Mobile Reference)
          ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between bg-white rounded-2xl px-5 py-3 border border-[#F2E3D5] shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-ink-900 uppercase tracking-wider">
            Кабинет Ученика
          </span>
          <span className="text-[10px] bg-limeAccent text-ink-900 font-extrabold px-2.5 py-0.5 rounded-full">
            АйДаУмничка
          </span>
        </div>

        {/* Toggle between standard desktop view and mobile phone inspiration mockup */}
        <div className="flex items-center gap-1.5 bg-[#FFF7EE] p-1 rounded-full border border-[#F4DEC6]">
          <button
            onClick={() => setViewMode('desktop')}
            className={`px-3.5 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'desktop' ? 'bg-white text-ink-900 shadow-xs' : 'text-ink-500 hover:text-ink-900'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Десктоп вид</span>
          </button>
          <button
            onClick={() => setViewMode('phone')}
            className={`px-3.5 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'phone' ? 'bg-white text-ink-900 shadow-xs' : 'text-ink-500 hover:text-ink-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-coralAccent" />
            <span>📱 Мобильный референс</span>
          </button>
        </div>
      </div>

      {viewMode === 'phone' ? (
        /* Phone Mockup Mode */
        <div className="py-6 flex justify-center">
          <PhoneMockup title="Личный кабинет">
            <div className="flex items-center justify-between pb-2 border-b border-[#F4DEC6]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full overflow-hidden relative border border-[#EADBCC]">
                  <Image src="/images/child-avatar.png" alt="Тимофей" fill className="object-cover" />
                </div>
                <div>
                  <h4 className="font-black text-xs text-ink-900">Тимофей Смирнов</h4>
                  <span className="text-[10px] text-coralAccent font-bold">★ 320 XP • ID: {currentId}</span>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#FFF7EE] border border-[#F4DEC6] flex items-center justify-center text-ink-800">
                <Bell className="w-4 h-4" />
              </div>
            </div>

            <WeekCalendar />
            <BalanceWidget balance={balance} studentName={student.fullName} />
          </PhoneMockup>
        </div>
      ) : (
        /* Desktop Mode */
        <div className="space-y-8">
          <BalanceWidget balance={balance} studentName={student.fullName} />

          {/* Next Lesson Box */}
          <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-[#F2E3D5] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#5C8519] animate-pulse" />
                <span className="text-xs font-extrabold text-[#5C8519] uppercase tracking-wider">
                  Ближайший онлайн-урок
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-ink-900 tracking-tight">
                {lessons[0]?.topic || 'Индивидуальное занятие с логопедом'}
              </h3>
              <p className="text-xs text-ink-500 flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-coralAccent" />
                  45 минут • Старт по готовности
                </span>
                <span>•</span>
                <span>Педагог: <strong>{student.assignedTeacherName}</strong></span>
              </p>
            </div>

            <Link
              href={`/room/${lessons[0]?.roomToken || 'room-demo'}?role=student&topic=${encodeURIComponent(lessons[0]?.topic || 'Урок')}`}
              className="bg-coralAccent hover:bg-coralAccent-hover text-white font-black text-xs sm:text-sm px-6 py-4 rounded-full shadow-xs transition-all flex items-center gap-2.5 active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <Video className="w-4 h-4" />
              <span>Войти в урок (P2P видео)</span>
            </Link>
          </div>

          {/* Homework and Speech Trainer Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-ink-900 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-coralAccent" />
                  Домашние задания
                </h3>
                <span className="text-xs font-bold text-coralAccent bg-[#FFF2E6] px-2.5 py-0.5 rounded-full">
                  {homeworks.filter((h) => h.status === 'assigned').length} активных
                </span>
              </div>

              {homeworks.map((hw) => (
                <div key={hw.id} className="bg-white p-5 rounded-3xl border border-[#F2E0CF] shadow-xs space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="font-extrabold text-sm text-ink-900">{hw.title}</h4>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#FFF2E6] text-coralAccent shrink-0">
                      Срок: 26 октября
                    </span>
                  </div>
                  <p className="text-xs text-ink-600 leading-relaxed">{hw.taskDescription}</p>

                  <div className="pt-2 border-t border-[#F8EFE7]">
                    {recordingHwId === hw.id ? (
                      <VoiceRecorder
                        onSendVoice={(duration) => handleVoiceSubmission(hw.id, duration)}
                        onCancel={() => setRecordingHwId(null)}
                      />
                    ) : (
                      <button
                        onClick={() => setRecordingHwId(hw.id)}
                        className="w-full bg-[#FFF7EE] hover:bg-[#FDEEDC] text-coralAccent border border-[#F4DEC6] font-bold text-xs py-2.5 rounded-2xl transition-all flex items-center justify-center gap-2"
                      >
                        <span>Записать голосовой ответ педагогу</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="lg:col-span-6 space-y-4">
              <h3 className="text-base font-black text-ink-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-limeAccent-hover" />
                Интерактивный тренажер речи
              </h3>
              <SpeechTrainer />
            </div>
          </div>

          <WeekCalendar />
          <BadgesGrid />
        </div>
      )}
    </div>
  );
}
