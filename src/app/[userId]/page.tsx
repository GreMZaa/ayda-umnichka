'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import LessonsScheduleHistory from '@/components/LessonsScheduleHistory';
import BalanceWidget from '@/components/BalanceWidget';
import { LessonSession, HomeworkItem } from '@/types';
import {
  Video,
  Clock,
  BookOpen,
  CheckCircle2,
  Copy,
  Check,
  Edit2,
  ArrowRight,
  UserCheck,
  AlertCircle,
  Paperclip,
  GraduationCap,
  RefreshCw,
  ChevronRight,
  Shield,
  Coins,
  Send,
  MessageCircle,
  ExternalLink,
  Bell
} from 'lucide-react';
import { showSystemNotification, playNotificationChime } from '@/components/NotificationManager';
import {
  setCustomSlug,
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
  const [copiedLink, setCopiedLink] = useState(false);
  const [notifState, setNotifState] = useState<'granted' | 'default' | 'denied'>('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifState(Notification.permission);
    }
  }, []);

  const handleToggleOrTestNotif = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('Ваш браузер не поддерживает системные уведомления в шторку.');
      return;
    }
    if (Notification.permission !== 'granted') {
      const res = await Notification.requestPermission();
      setNotifState(res);
      if (res === 'granted') {
        playNotificationChime();
        await showSystemNotification({
          title: '🎉 Уведомления в шторку включены!',
          body: 'Отлично! Теперь все напоминания об уроках и сообщениях будут приходить прямо в шторку.',
          url: `/${currentId}`,
        });
      }
    } else {
      playNotificationChime();
      await showSystemNotification({
        title: '🔔 АйДаУмничка: Проверка шторки',
        body: 'Системные уведомления работают отлично! Напоминания об уроках придут сюда.',
        url: `/${currentId}`,
      });
    }
  };

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

  // Active lesson room state (to re-enter after exit)
  const [activeLessonRoom, setActiveLessonRoom] = useState<{ roomId: string; topic: string } | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('aida_active_lesson_room');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.roomId && Date.now() - (parsed.timestamp || 0) < 3 * 3600 * 1000) {
          setActiveLessonRoom(parsed);
        }
      }
    } catch (_) {}
  }, []);

  const fetchStudentData = async (uid: string) => {
    try {
      setIsChecking(true);

      // 1. Verify existence of cabinet in Supabase database (no-store to avoid stale balance)
      const res = await fetch(`/api/user/bind?publicId=${encodeURIComponent(uid)}`, {
        cache: 'no-store',
      });
      const data = await res.json();

      if (!data?.exists) {
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
      const isOwner =
        Boolean(activeRole) &&
        (decodedAuth === uid.toLowerCase() || activeRole === 'admin' || activeRole === 'teacher');

      if (!isOwner) {
        setIsAccessBlocked(true);
        setIsChecking(false);
        return;
      }

      // If this cabinet ID belongs to a teacher, route to teacher cabinet
      if (data.binding?.role === 'teacher') {
        router.replace(`/teacher?id=${encodeURIComponent(uid)}`);
        return;
      }

      setIsSupabaseSynced(true);
      if (data.binding?.full_name) {
        setStudentName(data.binding.full_name);
        const cleanName = data.binding.full_name.replace(/\s*\(.*?\)$/, '').trim() || data.binding.full_name;
        try {
          localStorage.setItem('aida_full_name', cleanName);
          if (activeRole !== 'admin' && activeRole !== 'teacher') {
            localStorage.setItem('aida_active_role', 'student');
            localStorage.setItem('aida_auth_user_id', uid);
            localStorage.setItem('aida_user_id', uid);
            document.cookie = `aida_active_role=student; path=/; max-age=2592000; SameSite=Lax`;
            document.cookie = `aida_auth_user_id=${encodeURIComponent(uid)}; path=/; max-age=2592000; SameSite=Lax`;
            document.cookie = `aida_user_id=${encodeURIComponent(uid)}; path=/; max-age=2592000; SameSite=Lax`;
          }
          window.dispatchEvent(new Event('aida-user-updated'));
        } catch (_) {}
      }
      if (data.binding?.balance_lessons !== undefined) {
        setBalance(data.binding.balance_lessons);
        try {
          localStorage.setItem('aida_student_balance', String(data.binding.balance_lessons));
          window.dispatchEvent(new Event('aida-user-updated'));
        } catch (_) {}
      }

      // 3. Fetch homework assigned to this student from Supabase
      try {
        const hwRes = await fetch(`/api/homework?studentPublicId=${encodeURIComponent(uid)}`);
        const hwData = await hwRes.json();
        if (hwData?.homework) {
          const mappedHw: HomeworkItem[] = hwData.homework.map((h: any) => ({
            id: h.id,
            title: h.title,
            taskDescription: h.task_description,
            taskFileUrl: h.task_file_url,
            fileName: h.file_name,
            teacherName: h.teacher_name || 'Преподаватель',
            studentId: h.student_public_id || uid,
            status: h.status || 'assigned',
            studentSolutionText: h.student_solution_text,
            studentSolutionFileUrl: h.student_solution_file_url,
            teacherFeedback: h.teacher_feedback,
            createdAt: h.created_at,
          }));
          setHomeworks(mappedHw);
        }
      } catch (err) {
        console.warn('Failed to load homework:', err);
      }

      // 4. Fetch scheduled lessons for this student from Supabase
      try {
        const lessRes = await fetch(`/api/lessons?studentPublicId=${encodeURIComponent(uid)}`);
        const lessData = await lessRes.json();
        if (lessData?.lessons) {
          const activeLessons = lessData.lessons.filter(
            (l: any) => l.status === 'pending' || l.status === 'active'
          );
          const mappedLessons: LessonSession[] = activeLessons.map((l: any) => ({
            id: l.id,
            roomToken: l.room_token,
            teacherId: l.teacher_id || '',
            teacherName: l.teacher_name || 'Преподаватель',
            studentId: l.student_public_id || uid,
            studentName: l.student_name || 'Ученик',
            topic: l.topic,
            status: l.status,
            durationMinutes: l.duration_minutes || 45,
            createdAt: l.created_at,
          }));
          setLessons(mappedLessons);
        }
      } catch (err) {
        console.warn('Failed to load lessons:', err);
      }
    } catch (err) {
      console.warn('Cabinet verification check error:', err);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    if (!routeUserId) return;
    setCurrentId(routeUserId);
    setNewSlugInput(routeUserId);
    fetchStudentData(routeUserId);
  }, [routeUserId]);

  const copyCabinetLink = () => {
    if (typeof window !== 'undefined') {
      const fullUrl = `${window.location.origin}/${currentId}`;
      navigator.clipboard.writeText(fullUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
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

  // Clean student display name
  const cleanStudentDisplayName = studentName.replace(/\s*\(.*?\)$/, '').trim() || 'Ученик';

  // Loading state
  if (isChecking) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-coralAccent animate-spin" />
          <p className="text-xs font-bold text-[#6B758E]">Загрузка личного кабинета...</p>
        </div>
      </div>
    );
  }

  // 404: Cabinet Does Not Exist
  if (isNotFound) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-[#F2DECE] shadow-lg text-center space-y-4 animate-in fade-in duration-300">
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
              Такой личный кабинет не зарегистрирован на платформе центра «АйДаУмничка». Персональный адрес присваивается автоматически после входа или регистрации.
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
        <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-[#F2DECE] shadow-lg text-center space-y-4 animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-3xl bg-[#FFF2E6] text-coralAccent flex items-center justify-center mx-auto border border-[#FCDDC7]">
            <Shield className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <span className="text-[10px] font-black text-coralAccent uppercase tracking-widest bg-[#FFF2E6] px-2.5 py-0.5 rounded-full border border-[#FCDDC7]">
              Защищенный кабинет
            </span>
            <h2 className="text-xl font-black text-[#161F38]">
              Кабинет /{routeUserId} защищен
            </h2>
            <p className="text-xs text-[#6B758E] leading-relaxed">
              Этот личный кабинет привязан к зарегистрированному ученику в центре «АйДаУмничка». Для входа введите данные вашей учетной записи.
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
    <div className="space-y-4 sm:space-y-5">
      {/* 1. Student Profile Compact Header (Unified Teacher Style) */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#F2E0CF] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#FFF2E6] border border-[#FCDDC7] flex items-center justify-center text-coralAccent font-black text-xl shrink-0 shadow-2xs">
            {cleanStudentDisplayName[0] || 'У'}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-black text-[#161F38] tracking-tight">
                {cleanStudentDisplayName}
              </h1>
              <span className="text-[10px] bg-[#EAF7CF] text-[#5C8519] border border-[#D5ECA3] font-black px-2 py-0.5 rounded-full">
                Ученик центра
              </span>
              <span className="text-[10px] bg-[#FFF2E6] text-coralAccent border border-[#FCDDC7] font-extrabold px-2 py-0.5 rounded-full">
                ★ ID: {currentId}
              </span>

              {/* Copy Cabinet Link */}
              <button
                type="button"
                onClick={copyCabinetLink}
                className="inline-flex items-center gap-1 text-[10px] text-[#8A95A8] hover:text-[#161F38] bg-[#FFF8F1] hover:bg-[#FFF2E6] border border-[#F2DECE] px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                title="Скопировать ссылку на личный кабинет"
              >
                {copiedLink ? <Check className="w-3 h-3 text-[#5C8519]" /> : <Copy className="w-3 h-3 text-[#8A95A8]" />}
                <span>{copiedLink ? 'Скопировано!' : 'Ссылка'}</span>
              </button>

              {/* Notification Shade Toggle / Test Button */}
              <button
                type="button"
                onClick={handleToggleOrTestNotif}
                className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                  notifState === 'granted'
                    ? 'bg-[#EAF7CF] text-[#5C8519] border-[#CCE8A2] hover:bg-[#DDF3B8]'
                    : 'bg-[#FFF2E6] text-coralAccent border-[#FCDDC7] hover:bg-[#FFE6D2] animate-pulse'
                }`}
                title={
                  notifState === 'granted'
                    ? 'Уведомления в шторку активны. Нажмите для теста.'
                    : 'Нажмите, чтобы включить уведомления об уроках в шторку телефона'
                }
              >
                <Bell className="w-3 h-3" />
                <span>{notifState === 'granted' ? 'Шторка: Вкл' : 'Включить в шторку'}</span>
              </button>

              {/* Edit Vanity Handle */}
              {!isEditingSlug ? (
                <button
                  type="button"
                  onClick={() => setIsEditingSlug(true)}
                  className="text-[10px] text-[#8A95A8] hover:text-[#161F38] p-1 rounded transition-colors"
                  title="Изменить адрес кабинета (например: ivan.ivanov)"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              ) : null}
            </div>

            {isEditingSlug ? (
              <form onSubmit={handleSaveCustomSlug} className="flex items-center gap-1.5 pt-1">
                <span className="text-xs font-mono text-[#8A95A8]">/</span>
                <input
                  type="text"
                  autoFocus
                  value={newSlugInput}
                  onChange={(e) => setNewSlugInput(e.target.value)}
                  placeholder="ivan.ivanov"
                  className="bg-[#FFF8F1] border border-coralAccent rounded-lg px-2 py-0.5 text-xs font-mono font-bold text-[#161F38] outline-none w-36"
                />
                <button
                  type="submit"
                  className="bg-coralAccent hover:bg-coralAccent-hover text-white text-[10px] font-bold px-2.5 py-0.5 rounded-lg shadow-2xs"
                >
                  OK
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingSlug(false)}
                  className="text-[10px] text-[#8A95A8] hover:text-[#161F38] px-1"
                >
                  ✕
                </button>
              </form>
            ) : (
              <p className="text-[11px] text-[#6B758E] mt-0.5">
                Детский развивающий центр «АйДаУмничка», г. Тольятти • Личный кабинет занятий
              </p>
            )}
          </div>
        </div>

        {/* Header Right Stat Cards */}
        <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
          <div className="bg-[#FFF8F1] border border-[#F2DECE] px-3 py-1.5 rounded-xl text-center min-w-[70px]">
            <span className="text-[9px] text-[#6B758E] font-extrabold uppercase tracking-wider block">Домашек</span>
            <p className="text-sm font-black text-[#161F38]">{homeworks.length}</p>
          </div>
          <div className="bg-[#FFF8F1] border border-[#F2DECE] px-3 py-1.5 rounded-xl text-center min-w-[70px]">
            <span className="text-[9px] text-[#6B758E] font-extrabold uppercase tracking-wider block">Статус</span>
            <span className="text-xs font-black text-[#5C8519] flex items-center justify-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5C8519] animate-pulse" />
              В сети
            </span>
          </div>
        </div>
      </div>

      {/* Quick Re-Entry to Active Lesson if room is open */}
      {activeLessonRoom && (
        <div className="p-3.5 bg-[#EAF7CF] border border-[#CCE8A2] rounded-2xl flex items-center justify-between gap-3 animate-in fade-in shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-[#5C8519] animate-pulse shrink-0" />
            <div className="text-xs text-[#161F38] truncate">
              <span className="font-extrabold">Урок сейчас активен:</span>{' '}
              <span className="text-[#5C8519] font-bold">{activeLessonRoom.topic}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/room/${activeLessonRoom.roomId}?role=student&topic=${encodeURIComponent(activeLessonRoom.topic)}`}
              onClick={(e) => {
                if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
                  e.preventDefault();
                  window.parent.postMessage({ type: 'MAXIMIZE_LESSON_ROOM' }, '*');
                }
              }}
              className="inline-flex items-center gap-1.5 bg-[#5C8519] hover:bg-[#4E7214] text-white font-black text-xs px-4 py-2 rounded-full shadow-2xs active:scale-95 cursor-pointer"
            >
              <Video className="w-3.5 h-3.5" />
              <span>Вернуться в урок</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem('aida_active_lesson_room');
                setActiveLessonRoom(null);
              }}
              className="text-[#8A95A8] hover:text-[#161F38] text-xs px-1.5"
              title="Скрыть напоминание"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 2. Main Student Dashboard: Left (Balance & Card Widget) | Right (Schedule & Lessons) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-stretch">
        {/* Left Column: Balance & Subscription Card */}
        <div className="lg:col-span-5 xl:col-span-5 h-full flex flex-col">
          <BalanceWidget
            balance={balance}
            studentName={cleanStudentDisplayName}
            studentPublicId={currentId}
          />
        </div>

        {/* Right Column: Lessons Schedule & History */}
        <div className="lg:col-span-7 xl:col-span-7 h-full flex flex-col">
          <LessonsScheduleHistory
            role="student"
            studentPublicId={currentId}
            studentName={cleanStudentDisplayName}
            onStartLesson={(token, topic) => {
              router.push(`/room/${token}?role=student&topic=${encodeURIComponent(topic)}`);
            }}
          />
        </div>
      </div>

      {/* 3. Homeworks Block — Compact teacher & homework card with "Перейти к ДЗ" button */}
      {(() => {
        // Extract teachers who created lessons or assigned homework
        // "только вместо ученика преподаватель кто сделал урок ему"
        const teachersMap = new Map<string, { name: string; totalCount: number; pendingCount: number }>();

        homeworks.forEach((h) => {
          const tName = h.teacherName?.trim() || 'Преподаватель центра';
          const entry = teachersMap.get(tName) || { name: tName, totalCount: 0, pendingCount: 0 };
          entry.totalCount += 1;
          if (h.status === 'assigned') {
            entry.pendingCount += 1;
          }
          teachersMap.set(tName, entry);
        });

        lessons.forEach((l) => {
          const tName = l.teacherName?.trim();
          if (tName && !teachersMap.has(tName)) {
            teachersMap.set(tName, { name: tName, totalCount: 0, pendingCount: 0 });
          }
        });

        if (teachersMap.size === 0) {
          teachersMap.set('Преподаватель центра', {
            name: 'Преподаватель центра',
            totalCount: homeworks.length,
            pendingCount: homeworks.filter((h) => h.status === 'assigned').length,
          });
        }

        const teacherEntries = Array.from(teachersMap.values());
        const pendingHomeworkCount = homeworks.filter((h) => h.status === 'assigned').length;

        return (
          <div className="w-full">
            <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#F2DECE] shadow-xs space-y-3.5 hover:shadow-sm transition-shadow">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-[#F8EDE1]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#FFF2E6] border border-[#FCDDC7] flex items-center justify-center text-coralAccent shrink-0 shadow-2xs">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm sm:text-base text-[#161F38] leading-tight">
                      Домашние задания
                    </h3>
                    <p className="text-[11px] text-[#6B758E]">
                      Упражнения и материалы от педагога
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  {pendingHomeworkCount > 0 ? (
                    <span className="text-[10px] font-black bg-[#FFF2E6] text-coralAccent px-2.5 py-1 rounded-full border border-[#FCDDC7] animate-pulse">
                      {pendingHomeworkCount} к сдаче
                    </span>
                  ) : (
                    <span className="text-[10px] font-extrabold bg-[#EAF7CF] text-[#5C8519] px-2.5 py-1 rounded-full border border-[#D5ECA3]">
                      Все выполнено ✓
                    </span>
                  )}
                </div>
              </div>

              {/* List of Teachers who gave lessons/homework */}
              <div className="space-y-2.5">
                {teacherEntries.map((teacher) => (
                  <div
                    key={teacher.name}
                    className="p-3 sm:p-3.5 bg-[#FDFEFC] hover:bg-white rounded-2xl border border-[#E5EED8] hover:border-[#5C8519]/60 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                  >
                    {/* Teacher info */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#5C8519] to-[#8BC34A] text-white font-black text-sm flex items-center justify-center shrink-0 shadow-2xs">
                        {teacher.name[0] || 'П'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs sm:text-sm font-black text-[#161F38] truncate">
                            {teacher.name}
                          </span>
                          <span className="text-[10px] text-[#5C8519] font-bold bg-[#EAF7CF] px-2 py-0.2 rounded-full border border-[#D5ECA3] shrink-0">
                            Преподаватель
                          </span>
                        </div>
                        <div className="text-[11px] text-[#6B758E] truncate">
                          {teacher.pendingCount > 0
                            ? `${teacher.pendingCount} заданий ожидает вашего решения`
                            : teacher.totalCount > 0
                            ? `Все ${teacher.totalCount} заданий сданы на проверку`
                            : 'Новые упражнения появятся сразу после занятия'}
                        </div>
                      </div>
                    </div>

                    {/* "Перейти к ДЗ" Button opening dedicated page in new tab */}
                    <div className="flex items-center justify-end shrink-0">
                      <Link
                        href={`/student/homework?studentId=${encodeURIComponent(currentId)}&teacherName=${encodeURIComponent(teacher.name)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 text-xs font-black bg-[#EEF2FF] hover:bg-[#E0E7FF] text-[#4F46E5] border border-[#DCDAF7] px-3.5 py-2 rounded-full transition-all active:scale-95 shadow-2xs cursor-pointer w-full sm:w-auto"
                        title="Открыть домашние задания в новой вкладке"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Перейти к ДЗ</span>
                        {teacher.totalCount > 0 && (
                          <span className="bg-[#4F46E5] text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-0.5">
                            {teacher.totalCount}
                          </span>
                        )}
                        <ExternalLink className="w-3 h-3 text-[#4F46E5]/70" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
