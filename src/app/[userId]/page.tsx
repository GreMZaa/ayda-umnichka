'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BalanceWidget from '@/components/BalanceWidget';
import VoiceRecorder from '@/components/VoiceRecorder';
import WeekCalendar from '@/components/WeekCalendar';
import BadgesGrid from '@/components/BadgesGrid';
import SpeechTrainer from '@/components/SpeechTrainer';
import PhoneMockup from '@/components/PhoneMockup';
import { LessonSession, HomeworkItem } from '@/types';
import {
  Video,
  Clock,
  BookOpen,
  CheckCircle,
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
  Database,
  AlertCircle
} from 'lucide-react';
import {
  setCustomSlug,
  setClientUserId,
  updateSlugInSupabase,
} from '@/lib/userSession';

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

  // Verification & Status states
  const [isChecking, setIsChecking] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [isAccessBlocked, setIsAccessBlocked] = useState(false);
  const [isSupabaseSynced, setIsSupabaseSynced] = useState(false);

  // Dashboard states
  const [studentName, setStudentName] = useState<string>('Ученик');
  const [balance, setBalance] = useState<number>(0);
  const [lessons, setLessons] = useState<LessonSession[]>([]);
  const [homeworks, setHomeworks] = useState<HomeworkItem[]>([]);
  const [recordingHwId, setRecordingHwId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'desktop' | 'phone'>('desktop');

  useEffect(() => {
    if (!routeUserId) return;

    setCurrentId(routeUserId);
    setNewSlugInput(routeUserId);

    (async () => {
      try {
        setIsChecking(true);

        // 1. Verify existence of cabinet in Supabase database
        const res = await fetch(`/api/user/bind?publicId=${encodeURIComponent(routeUserId)}`);
        const data = await res.json();

        if (!data?.exists) {
          // The requested cabinet DOES NOT EXIST in the system
          setIsNotFound(true);
          setIsChecking(false);
          return;
        }

        // 2. The cabinet exists: check session credentials & ownership
        const activeAuthUser =
          localStorage.getItem('aida_auth_user_id') ||
          document.cookie.match(/(?:^|; )aida_auth_user_id=([^;]*)/)?.[1] ||
          localStorage.getItem('aida_user_id') ||
          document.cookie.match(/(?:^|; )aida_user_id=([^;]*)/)?.[1];
        const activeRole =
          localStorage.getItem('aida_active_role') ||
          document.cookie.match(/(?:^|; )aida_active_role=([^;]*)/)?.[1];

        const decodedAuth = activeAuthUser ? decodeURIComponent(activeAuthUser).toLowerCase() : '';
        const isOwner = Boolean(activeRole) && (decodedAuth === routeUserId.toLowerCase() || activeRole === 'admin');

        if (!isOwner) {
          setIsAccessBlocked(true);
          setIsChecking(false);
          return;
        }

        setIsSupabaseSynced(true);
        if (data.binding?.full_name) {
          setStudentName(data.binding.full_name);
        }
        if (data.binding?.balance_lessons !== undefined) {
          setBalance(data.binding.balance_lessons);
        }
      } catch (err) {
        console.warn('Cabinet verification check error:', err);
      } finally {
        setIsChecking(false);
      }
    })();
  }, [routeUserId]);

  const fullPersonalUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/${currentId}`
    : `https://ayda-umnichka.vercel.app/${currentId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(fullPersonalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveCustomSlug = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSlugInput.trim()) return;

    const saved = setCustomSlug(newSlugInput.trim());
    if (saved) {
      await updateSlugInSupabase(currentId, saved);
      setCurrentId(saved);
      setIsEditingSlug(false);
      router.push(`/${saved}`);
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

  // Loading state
  if (isChecking) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-coralAccent border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-ink-500">Проверка кабинета...</p>
        </div>
      </div>
    );
  }

  // 404: Cabinet Does Not Exist
  if (isNotFound) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-[32px] p-6 sm:p-8 border border-[#F2DECE] shadow-lg text-center space-y-4 animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-3xl bg-[#FFF2E6] text-coralAccent flex items-center justify-center mx-auto border border-[#FCDDC7]">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <span className="text-[10px] font-black text-coralAccent uppercase tracking-widest bg-[#FFF2E6] px-2.5 py-0.5 rounded-full border border-[#FCDDC7]">
              Кабинет не найден
            </span>
            <h2 className="text-xl font-black text-[#161F38]">
              Кабинет /{routeUserId} не существует
            </h2>
            <p className="text-xs text-[#6B758E] leading-relaxed">
              Такой личный кабинет не зарегистрирован на платформе центра «АйДаУмничка». Личный адрес присваивается автоматически только после регистрации.
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-2">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 w-full bg-coralAccent hover:bg-coralAccent-hover text-white py-3 rounded-full text-xs font-black transition-[background-color,transform,box-shadow] duration-140 ease-out-emil active:scale-[0.97] shadow-xs cursor-pointer"
            >
              <span>Зарегистрироваться или войти</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/"
              className="text-xs font-bold text-[#8A95A8] hover:text-[#161F38] py-2 transition-colors"
            >
              Вернуться на главную страницу
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Protected / Unauthorized Access
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
              href={`/login?redirect=/${encodeURIComponent(routeUserId)}`}
              className="inline-flex items-center justify-center gap-2 w-full bg-coralAccent hover:bg-coralAccent-hover text-white py-3 rounded-full text-xs font-black transition-[background-color,transform,box-shadow] duration-140 ease-out-emil active:scale-[0.97] shadow-xs cursor-pointer"
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
      {/* 1. Address Bar & Status */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#F2DECE] shadow-xs space-y-3.5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-8 h-8 rounded-xl bg-[#FFF2E6] text-coralAccent flex items-center justify-center shrink-0">
              <LinkIcon className="w-4 h-4" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase text-[#8A95A8] tracking-wider">
                  Ваш постоянный личный адрес:
                </span>
                {isSupabaseSynced && (
                  <span className="text-[9px] font-bold bg-[#EAF7CF] text-[#5C8519] px-2 py-0.5 rounded-full inline-flex items-center gap-1 border border-[#CCE8A2]">
                    <Database className="w-2.5 h-2.5" />
                    Привязан к Supabase
                  </span>
                )}
                <span className="text-[9px] font-bold bg-[#EAF7CF] text-[#5C8519] px-2 py-0.5 rounded-full inline-flex items-center gap-1 border border-[#CCE8A2]">
                  <UserCheck className="w-2.5 h-2.5" />
                  Выдан после регистрации
                </span>
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
                      placeholder="ivan.ivanov"
                      className="bg-transparent outline-none px-1 text-xs font-mono font-bold text-coralAccent w-32 sm:w-44"
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-coralAccent hover:bg-coralAccent-hover text-white text-xs font-bold px-3 py-1 rounded-xl shadow-2xs transition-[background-color,transform] duration-140 ease-out-emil active:scale-95 cursor-pointer"
                  >
                    Сохранить
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingSlug(false)}
                    className="text-xs text-[#8A95A8] hover:text-[#161F38] px-2 py-1 transition-colors duration-140 cursor-pointer"
                  >
                    Отмена
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-2 pt-0.5">
                  <span className="font-mono text-xs sm:text-sm font-black text-[#161F38] bg-[#FFF8F1] px-2.5 py-1 rounded-xl border border-[#F2DECE]">
                    {fullPersonalUrl}
                  </span>

                  <button
                    onClick={() => setIsEditingSlug(true)}
                    title="Задать красивый адрес (например: ivan.ivanov)"
                    className="p-1.5 rounded-lg text-[#8A95A8] hover:text-[#161F38] hover:bg-[#FFF7EE] transition-colors duration-140 active:scale-90 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 bg-[#FFF8F1] hover:bg-[#FFF2E6] border border-[#F2DECE] text-[#161F38] px-3.5 py-2 rounded-2xl text-xs font-bold transition-[background-color,border-color,transform] duration-140 ease-out-emil active:scale-[0.97] shadow-2xs cursor-pointer"
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

            <div className="inline-flex items-center gap-1.5 bg-[#EAF7CF] text-[#5C8519] border border-[#D5ECA6] px-3.5 py-2 rounded-2xl text-xs font-extrabold shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Кабинет защищен</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. View Switcher */}
      <div className="flex items-center justify-between bg-white rounded-2xl px-5 py-3 border border-[#F2E3D5] shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-ink-900 uppercase tracking-wider">
            Кабинет Ученика
          </span>
          <span className="text-[10px] bg-limeAccent text-ink-900 font-extrabold px-2.5 py-0.5 rounded-full">
            {studentName}
          </span>
        </div>

        <div className="flex items-center gap-1.5 bg-[#FFF7EE] p-1 rounded-full border border-[#F4DEC6]">
          <button
            onClick={() => setViewMode('desktop')}
            className={`px-3.5 py-1 rounded-full text-xs font-bold transition-[background-color,color,box-shadow] duration-140 ease-out-emil active:scale-95 cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'desktop' ? 'bg-white text-ink-900 shadow-xs' : 'text-ink-500 hover:text-ink-900'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Десктоп вид</span>
          </button>
          <button
            onClick={() => setViewMode('phone')}
            className={`px-3.5 py-1 rounded-full text-xs font-bold transition-[background-color,color,box-shadow] duration-140 ease-out-emil active:scale-95 cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'phone' ? 'bg-white text-ink-900 shadow-xs' : 'text-ink-500 hover:text-ink-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-coralAccent" />
            <span>📱 Мобильный вид</span>
          </button>
        </div>
      </div>

      {viewMode === 'phone' ? (
        /* Phone Mockup Mode */
        <div className="py-6 flex justify-center">
          <PhoneMockup title="Личный кабинет">
            <div className="flex items-center justify-between pb-2 border-b border-[#F4DEC6]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-[#FFF2E6] border border-[#FCDDC7] flex items-center justify-center font-black text-sm text-coralAccent">
                  {studentName[0] || 'У'}
                </div>
                <div>
                  <h4 className="font-black text-xs text-ink-900">{studentName}</h4>
                  <span className="text-[10px] text-coralAccent font-bold">★ ID: {currentId}</span>
                </div>
              </div>
            </div>

            <WeekCalendar />
            <BalanceWidget balance={balance} studentName={studentName} />
          </PhoneMockup>
        </div>
      ) : (
        /* Desktop Mode */
        <div className="space-y-8">
          <BalanceWidget balance={balance} studentName={studentName} />

          {/* Lessons Box */}
          {lessons.length === 0 ? (
            <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-[#F2E3D5] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-1.5">
                <span className="text-xs font-extrabold text-[#8A95A8] uppercase tracking-wider">
                  Онлайн-уроки
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-ink-900 tracking-tight">
                  У вас пока нет запланированных уроков
                </h3>
                <p className="text-xs text-ink-500">
                  Запишитесь на вводный онлайн-урок или свяжитесь с центром для выбора времени.
                </p>
              </div>

              <Link
                href="/#slide-onboarding"
                className="bg-[#C5E87D] hover:bg-[#B6DC67] text-[#161F38] font-black text-xs sm:text-sm px-6 py-3.5 rounded-full shadow-xs transition-[background-color,transform,box-shadow] duration-140 ease-out-emil flex items-center gap-2 active:scale-[0.97] cursor-pointer whitespace-nowrap"
              >
                <span>Записаться на урок</span>
                <span>➔</span>
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-[#F2E3D5] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#5C8519] animate-pulse" />
                  <span className="text-xs font-extrabold text-[#5C8519] uppercase tracking-wider">
                    Ближайший онлайн-урок
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-ink-900 tracking-tight">
                  {lessons[0].topic}
                </h3>
                <p className="text-xs text-ink-500 flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-coralAccent" />
                    45 минут
                  </span>
                  <span>•</span>
                  <span>Педагог: <strong>{lessons[0].teacherName}</strong></span>
                </p>
              </div>

              <Link
                href={`/room/${lessons[0].roomToken}?role=student&topic=${encodeURIComponent(lessons[0].topic)}`}
                className="bg-coralAccent hover:bg-coralAccent-hover text-white font-black text-xs sm:text-sm px-6 py-4 rounded-full shadow-xs transition-[background-color,transform,box-shadow] duration-140 ease-out-emil flex items-center gap-2.5 active:scale-[0.97] cursor-pointer whitespace-nowrap"
              >
                <Video className="w-4 h-4" />
                <span>Войти в урок (P2P видео)</span>
              </Link>
            </div>
          )}

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

              {homeworks.length === 0 ? (
                <div className="p-8 text-center rounded-3xl border border-dashed border-[#F4DEC6] bg-white text-xs text-ink-500 space-y-2">
                  <CheckCircle className="w-8 h-8 text-[#5C8519] mx-auto opacity-70" />
                  <h4 className="font-bold text-sm text-ink-900">Все задания выполнены</h4>
                  <p className="text-xs text-ink-500">
                    Новые упражнения от преподавателя появятся здесь после проведения урока.
                  </p>
                </div>
              ) : (
                homeworks.map((hw) => (
                  <div key={hw.id} className="bg-white p-5 rounded-3xl border border-[#F2E0CF] shadow-xs space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="font-extrabold text-sm text-ink-900">{hw.title}</h4>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#FFF2E6] text-coralAccent shrink-0">
                        Активно
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
                          className="w-full bg-[#FFF7EE] hover:bg-[#FDEEDC] text-coralAccent border border-[#F4DEC6] font-bold text-xs py-2.5 rounded-2xl transition-[background-color,border-color,transform] duration-140 ease-out-emil active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <span>Записать голосовой ответ педагогу</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
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
