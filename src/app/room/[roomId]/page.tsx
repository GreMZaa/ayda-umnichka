'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, BookOpen, Send, Calendar, ArrowRight, X, Video, ShieldCheck, ArrowLeft, Maximize2, AlertCircle } from 'lucide-react';
import VideoCall from '@/components/VideoCall';
import Whiteboard from '@/components/Whiteboard';
import { broadcastPlatformEvent } from '@/lib/platformNotifications';

export default function LessonRoomPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const roomId = (params?.roomId as string) || 'live-room';
  const roleParam = searchParams.get('role');
  const topicParam = searchParams.get('topic');
  const studentParam = searchParams.get('studentId') || searchParams.get('student');

  const isTeacherInitial =
    roleParam === 'teacher' ||
    roleParam === 'admin' ||
    (typeof window !== 'undefined' &&
      (localStorage.getItem('aida_active_role') === 'teacher' ||
        localStorage.getItem('aida_active_role') === 'admin'));

  const [isWhiteboardActive, setIsWhiteboardActive] = useState(false);
  const [isTeacher, setIsTeacher] = useState<boolean>(isTeacherInitial);
  const [isZeroBalanceBlocked, setIsZeroBalanceBlocked] = useState<boolean>(false);
  const [topic, setTopic] = useState('Индивидуальное занятие: Логопедия');
  const [participantName, setParticipantName] = useState('');
  const [targetStudentId, setTargetStudentId] = useState(studentParam || '');
  const [targetStudentName, setTargetStudentName] = useState('Ученик');

  // Post-lesson Homework Modal for Teacher
  const [showHomeworkModal, setShowHomeworkModal] = useState(false);
  const [completedDurationMin, setCompletedDurationMin] = useState(1);
  const [hwTitle, setHwTitle] = useState('');
  const [hwDescription, setHwDescription] = useState('');
  const [hwDueDate, setHwDueDate] = useState('');
  const [isSubmittingHw, setIsSubmittingHw] = useState(false);

  useEffect(() => {
    if (studentParam) {
      setTargetStudentId(studentParam);
    }
  }, [studentParam]);

  useEffect(() => {
    // 1. Determine role with intelligent user identity resolution
    const storedPublicId =
      (typeof window !== 'undefined' &&
        (localStorage.getItem('aida_user_public_id') ||
          localStorage.getItem('aida_auth_user_id') ||
          localStorage.getItem('aida_user_id'))) ||
      '';
    const storedRole =
      (typeof window !== 'undefined' &&
        (localStorage.getItem('aida_active_role') ||
          document.cookie.match(/(?:^|; )aida_active_role=([^;]*)/)?.[1])) ||
      '';
    const storedName =
      (typeof window !== 'undefined' &&
        (localStorage.getItem('aida_full_name') ||
          localStorage.getItem('aida_user_name'))) ||
      '';

    // Julia (id180457) is unequivocally a teacher, regardless of accidental url param
    const isTeacherUser =
      storedPublicId.toLowerCase() === 'id180457' ||
      storedRole === 'teacher' ||
      storedRole === 'admin' ||
      storedName.toLowerCase().includes('юлия');

    // Sergey (id571210) is unequivocally a student
    const isStudentUser =
      storedPublicId.toLowerCase() === 'id571210' ||
      storedRole === 'student' ||
      storedName.toLowerCase().includes('сергей');

    let teacherFlag = false;
    if (isTeacherUser && !isStudentUser) {
      teacherFlag = true;
    } else if (isStudentUser && !isTeacherUser) {
      teacherFlag = false;
    } else if (roleParam) {
      teacherFlag = roleParam === 'teacher' || roleParam === 'admin';
    } else {
      teacherFlag = storedRole === 'teacher' || storedRole === 'admin';
    }

    setIsTeacher(teacherFlag);

    // 2. Determine topic (stripping any URL params like ?agentation=1)
    let rawTopic = topicParam ? decodeURIComponent(topicParam) : 'Индивидуальное занятие: Логопедия';
    const resolvedTopic = rawTopic.replace(/\?.*$/, '').replace(/&.*$/, '').trim() || 'Индивидуальное занятие: Логопедия';
    setTopic(resolvedTopic);
    setHwTitle(`Домашнее задание: ${resolvedTopic}`);

    // Default due date: 2 days ahead
    const d = new Date();
    d.setDate(d.getDate() + 2);
    setHwDueDate(d.toISOString().slice(0, 10));

    // 3. Resolve participant label from cache if available to prevent generic flickering
    let initialName = teacherFlag ? 'Ученик центра' : 'Василина Владимировна';
    try {
      const activeRoom = localStorage.getItem('aida_active_lesson_room');
      if (activeRoom) {
        const parsed = JSON.parse(activeRoom);
        if (parsed.roomId === roomId) {
          if (!teacherFlag && parsed.teacher_name && parsed.teacher_name !== 'Преподаватель') {
            initialName = parsed.teacher_name;
          } else if (teacherFlag && parsed.student_name && parsed.student_name !== 'Ученик') {
            initialName = parsed.student_name;
          }
        }
      }
    } catch (_) {}
    setParticipantName(initialName);

    // 4. Save active lesson room state so user can re-enter from personal cabinet if navigated away
    try {
      const existingStart = localStorage.getItem(`aida_lesson_started_${roomId}`);
      const startTimestamp = existingStart ? parseInt(existingStart, 10) : Date.now();

      localStorage.setItem(
        'aida_active_lesson_room',
        JSON.stringify({
          roomId,
          topic: resolvedTopic,
          role: teacherFlag ? 'teacher' : 'student',
          timestamp: startTimestamp,
        })
      );
    } catch (_) {}

    // 5. Balance verification for student: prevent joining with 0 lessons
    if (!teacherFlag) {
      const storedBal =
        typeof window !== 'undefined'
          ? localStorage.getItem('aida_student_balance')
          : null;
      if (storedBal !== null) {
        const balNum = parseInt(storedBal, 10);
        if (balNum <= 0) {
          setIsZeroBalanceBlocked(true);
        }
      }

      const activeUid = storedPublicId || studentParam;
      if (activeUid) {
        fetch(`/api/user/bind?publicId=${encodeURIComponent(activeUid)}`)
          .then((r) => r.json())
          .then((data) => {
            if (data?.binding?.balance_lessons !== undefined) {
              const liveBal = Number(data.binding.balance_lessons);
              try {
                localStorage.setItem('aida_student_balance', String(liveBal));
              } catch (_) {}
              if (liveBal <= 0) {
                setIsZeroBalanceBlocked(true);
              } else {
                setIsZeroBalanceBlocked(false);
              }
            }
          })
          .catch(() => {});
      }
    }
  }, [roomId, roleParam, topicParam, studentParam]);

  // Fetch lesson & participant info linked to this lesson room
  useEffect(() => {
    const fetchLessonDetails = async () => {
      try {
        const res = await fetch('/api/lessons');
        const data = await res.json();
        if (data?.lessons) {
          const currentLesson = data.lessons.find((l: any) => l.room_token === roomId);
          if (currentLesson) {
            const storedPublicId =
              (typeof window !== 'undefined' &&
                (localStorage.getItem('aida_user_public_id') ||
                  localStorage.getItem('aida_auth_user_id') ||
                  localStorage.getItem('aida_user_id'))) ||
              '';

            // Re-verify teacher / student status against current lesson record
            if (storedPublicId) {
              const spLower = storedPublicId.toLowerCase();
              if (
                spLower === (currentLesson.teacher_public_id || 'id180457').toLowerCase() ||
                spLower === (currentLesson.teacher_id || '').toLowerCase()
              ) {
                setIsTeacher(true);
              } else if (
                currentLesson.student_public_id &&
                spLower === currentLesson.student_public_id.toLowerCase()
              ) {
                setIsTeacher(false);
              }
            }

            if (currentLesson.student_public_id) {
              setTargetStudentId(currentLesson.student_public_id);
            }
            if (currentLesson.student_name) {
              const cleanName = currentLesson.student_name.replace(/\s*\(.*?\)$/, '').trim();
              setTargetStudentName(cleanName || currentLesson.student_name);
              if (isTeacher) {
                setParticipantName(cleanName || currentLesson.student_name);
              }
            }
            if (!isTeacher && currentLesson.teacher_name) {
              const cleanTeacher = currentLesson.teacher_name.replace(/\s*\(.*?\)$/, '').trim();
              if (cleanTeacher && cleanTeacher !== 'Преподаватель') {
                setParticipantName(cleanTeacher);
                try {
                  const ar = localStorage.getItem('aida_active_lesson_room');
                  if (ar) {
                    const parsed = JSON.parse(ar);
                    parsed.teacher_name = cleanTeacher;
                    localStorage.setItem('aida_active_lesson_room', JSON.stringify(parsed));
                  }
                } catch (_) {}
              }
            } else if (isTeacher && currentLesson.teacher_name) {
              const cleanTeacher = currentLesson.teacher_name.replace(/\s*\(.*?\)$/, '').trim();
              if (cleanTeacher && cleanTeacher !== 'Преподаватель') {
                try {
                  localStorage.setItem('aida_full_name', cleanTeacher);
                  localStorage.setItem('aida_user_name', cleanTeacher);
                } catch (_) {}
              }
            }
          }
        }
      } catch (_) {}
    };
    fetchLessonDetails();
  }, [roomId, isTeacher]);

  const handleEndLesson = async (durationSec: number, deductBalance: boolean = false) => {
    // Clear active room state upon completion
    try {
      localStorage.removeItem('aida_active_lesson_room');
      localStorage.removeItem(`aida_lesson_started_${roomId}`);

      // Mark lesson as completed in database with real duration
      fetch('/api/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_status',
          room_token: roomId,
          status: 'completed',
          duration_minutes: Math.max(1, Math.round(durationSec / 60)),
        }),
      }).catch(() => {});
    } catch (_) {}

    const durationMin = Math.max(1, Math.round(durationSec / 60));
    setCompletedDurationMin(durationMin);

    // If student: return to cabinet (only deduct local balance if deductBalance was true)
    if (!isTeacher) {
      if (deductBalance) {
        const currentBalance = parseInt(localStorage.getItem('aida_student_balance') || '0', 10);
        const updatedBalance = Math.max(0, currentBalance - 1);
        localStorage.setItem('aida_student_balance', updatedBalance.toString());
      }

      const savedUserId =
        localStorage.getItem('aida_auth_user_id') ||
        localStorage.getItem('aida_user_id') ||
        '';

      if (savedUserId) {
        router.push(`/${savedUserId}`);
      } else {
        router.push('/student');
      }
      return;
    }

    // If teacher: Deduct balance in Supabase if teacher confirmed deduction
    if (deductBalance) {
      try {
        await fetch('/api/students/balance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentPublicId: targetStudentId || null,
            studentName: targetStudentName || participantName || null,
            amount: -1,
            isTeacherVerified: true,
            description: `Списание за проведённый урок (${topic || 'Индивидуальное занятие'})`,
          }),
        });
      } catch (err) {
        console.warn('Failed to deduct student balance upon lesson completion:', err);
      }
    }

    // Show homework assignment modal window
    setShowHomeworkModal(true);
  };

  const handleSendHomeworkAndLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingHw(true);

    try {
      const activeTeacherName =
        localStorage.getItem('aida_full_name') ||
        localStorage.getItem('aida_user_name') ||
        'Преподаватель';
      const cleanTName = activeTeacherName.replace(/\s*\(.*?\)$/, '').trim() || 'Преподаватель';

      if (hwTitle.trim() && hwDescription.trim()) {
        const res = await fetch('/api/homework', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: hwTitle.trim(),
            task_description: hwDescription.trim(),
            student_public_id: targetStudentId || null,
            student_name: targetStudentName || 'Ученик',
            teacher_name: cleanTName,
            due_date: hwDueDate || null,
          }),
        });

        if (res.ok) {
          const resData = await res.json().catch(() => ({}));
          broadcastPlatformEvent('homework-assigned', {
            id: resData?.homework?.id || `hw-${Date.now()}`,
            title: hwTitle.trim(),
            task_description: hwDescription.trim(),
            student_public_id: targetStudentId || null,
            student_name: targetStudentName || 'Ученик',
            teacher_name: cleanTName,
            due_date: hwDueDate || null,
          });
        }
      }
    } catch (err) {
      console.warn('Error saving homework:', err);
    }

    const savedUserId =
      localStorage.getItem('aida_auth_user_id') ||
      localStorage.getItem('aida_user_id') ||
      '';

    try {
      sessionStorage.removeItem(`aida_joined_${roomId}`);
    } catch (_) {}

    router.push(savedUserId ? `/teacher?id=${savedUserId}` : '/teacher');
  };

  const handleSkipHomeworkAndLeave = () => {
    const savedUserId =
      localStorage.getItem('aida_auth_user_id') ||
      localStorage.getItem('aida_user_id') ||
      '';

    try {
      sessionStorage.removeItem(`aida_joined_${roomId}`);
    } catch (_) {}

    router.push(savedUserId ? `/teacher?id=${savedUserId}` : '/teacher');
  };

  const [isPlatformMinimized, setIsPlatformMinimized] = useState(false);
  const [savedUserId, setSavedUserId] = useState('');

  // Exit directly to personal cabinet WITHOUT closing/terminating the active lesson
  const handleExitToCabinet = () => {
    try {
      localStorage.setItem(
        'aida_active_lesson_room',
        JSON.stringify({
          roomId,
          topic,
          role: isTeacher ? 'teacher' : 'student',
          timestamp: Date.now(),
        })
      );
    } catch (_) {}

    if (isTeacher) {
      const teacherId =
        (typeof window !== 'undefined' &&
          (localStorage.getItem('aida_auth_user_id') ||
            localStorage.getItem('aida_user_id') ||
            localStorage.getItem('aida_user_public_id'))) ||
        'id179017';
      router.push(`/teacher?id=${encodeURIComponent(teacherId)}`);
    } else {
      const studentId =
        (typeof window !== 'undefined' &&
          (localStorage.getItem('aida_auth_user_id') ||
            localStorage.getItem('aida_user_id') ||
            localStorage.getItem('aida_user_public_id'))) ||
        studentParam ||
        '';
      router.push(studentId ? `/${encodeURIComponent(studentId)}` : '/student');
    }
  };

  useEffect(() => {
    const uid =
      localStorage.getItem('aida_user_public_id') ||
      localStorage.getItem('aida_auth_user_id') ||
      localStorage.getItem('aida_user_id') ||
      studentParam ||
      '';
    setSavedUserId(uid);

    if (uid) {
      fetch(`/api/user/bind?publicId=${uid}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.binding?.full_name) {
            const clean = d.binding.full_name.replace(/\s*\(.*?\)$/, '').trim();
            if (clean) {
              localStorage.setItem('aida_full_name', clean);
              localStorage.setItem('aida_user_name', clean);
            }
          }
        })
        .catch(() => {});
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'MAXIMIZE_LESSON_ROOM') {
        setIsPlatformMinimized(false);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Seamless status bar and background color in video call room matching website theme (#FFF7EE)
  useEffect(() => {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    const originalTheme = metaThemeColor?.getAttribute('content') || '#FFF7EE';
    const targetTheme = '#FFF7EE';
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', targetTheme);
    }
    const origBodyBg = document.body.style.backgroundColor;
    document.body.style.backgroundColor = targetTheme;

    return () => {
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', originalTheme);
      }
      document.body.style.backgroundColor = origBodyBg;
    };
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full z-40 overflow-hidden bg-[#FFF7EE] flex flex-col select-none">
      {/* Zero Balance Payment Reminder Screen for Student in Room */}
      {isZeroBalanceBlocked && !isTeacher && (
        <div className="fixed inset-0 z-50 bg-[#FFF7EE] flex items-center justify-center p-4 select-auto">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 border border-[#F2DECE] shadow-2xl text-center space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 rounded-3xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-md">
              <AlertCircle className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-black uppercase tracking-wider text-amber-800 bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
                Остаток: 0 уроков
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-[#161F38]">Сначала необходимо оплатить</h2>
              <p className="text-xs sm:text-sm text-[#6B758E] leading-relaxed">
                У вас закончились оплаченные уроки на балансе. Чтобы войти в урок, сначала нужно оплатить занятия. Пожалуйста, обратитесь к вашему преподавателю для пополнения абонемента.
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2.5">
              <a
                href="/messenger?role=student"
                className="w-full inline-flex items-center justify-center gap-2 bg-[#5C8519] hover:bg-[#4E7214] text-white text-xs sm:text-sm font-black py-3 px-5 rounded-2xl shadow-md transition-all active:scale-95"
              >
                <span>Написать преподавателю</span>
              </a>
              <button
                type="button"
                onClick={() => {
                  const studentId =
                    (typeof window !== 'undefined' &&
                      (localStorage.getItem('aida_auth_user_id') ||
                        localStorage.getItem('aida_user_id') ||
                        localStorage.getItem('aida_user_public_id'))) ||
                    '';
                  router.push(studentId ? `/${encodeURIComponent(studentId)}` : '/student');
                }}
                className="w-full inline-flex items-center justify-center bg-[#FFF8F1] hover:bg-[#FDEFE3] border border-[#F2DECE] text-[#161F38] text-xs sm:text-sm font-black py-3 px-5 rounded-2xl transition-all cursor-pointer"
              >
                Вернуться в личный кабинет
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 100% Immersive Full-Screen Workspace — WebRTC call stays continuously connected */}
      <div className="w-full h-full relative overflow-hidden flex flex-col bg-[#FFF7EE]">
        {/* Interactive Whiteboard Canvas */}
        <div className={`w-full h-full ${isWhiteboardActive && !isPlatformMinimized ? 'block' : 'hidden'}`}>
          <Whiteboard roomId={roomId} isActive={isWhiteboardActive && !isPlatformMinimized} onClose={() => setIsWhiteboardActive(false)} />
        </div>

        {/* Minimized Platform View (Teacher / Student Cabinet) while call is running */}
        {isPlatformMinimized && (
          <div className="w-full h-full bg-[#FFF7EE] relative z-20 flex flex-col">
            {/* Top Bar above cabinet: return to full lesson */}
            <div className="bg-[#161F38] text-white px-3 sm:px-4 py-2 pt-[max(0.6rem,calc(env(safe-area-inset-top,0px)+0.4rem))] flex items-center justify-between text-xs font-bold shadow-md z-30 shrink-0">
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="truncate text-xs">Урок продолжается: <strong className="text-white/90">{topic}</strong></span>
              </div>
              <button
                type="button"
                onClick={() => setIsPlatformMinimized(false)}
                className="bg-coralAccent hover:bg-coralAccent-hover text-white text-xs font-black px-3.5 py-1.5 rounded-full flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-xs shrink-0"
                title="Вернуться к уроку на весь экран"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Развернуть</span>
              </button>
            </div>
            <iframe
              src={
                isTeacher
                  ? (savedUserId ? `/teacher?id=${savedUserId}` : '/teacher')
                  : savedUserId
                  ? `/${savedUserId}`
                  : '/student'
              }
              className="w-full flex-1 border-0 select-auto"
              title="Личный кабинет платформы"
            />
          </div>
        )}

        {/* VideoCall remains persistently mounted so WebRTC connection never drops */}
        <div className={isWhiteboardActive || isPlatformMinimized ? 'contents' : 'w-full h-full'}>
          <VideoCall
            roomToken={roomId}
            isTeacher={isTeacher}
            participantName={participantName}
            topic={topic}
            isWhiteboardActive={isWhiteboardActive}
            onToggleWhiteboard={() => setIsWhiteboardActive(!isWhiteboardActive)}
            isPlatformMinimized={isPlatformMinimized}
            onTogglePlatformMinimize={setIsPlatformMinimized}
            onExitToCabinet={handleExitToCabinet}
            onEndLesson={handleEndLesson}
          />
        </div>
      </div>

      {/* Teacher Post-Lesson Homework Modal Window */}
      {showHomeworkModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-5 sm:p-7 max-w-lg w-full border border-[#F2DECE] shadow-2xl space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#EAF7CF] border border-[#D5ECA3] flex items-center justify-center text-[#5C8519] shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#161F38] tracking-tight">
                    Урок успешно завершен!
                  </h3>
                  <p className="text-xs text-[#6B758E]">
                    Длительность: <strong className="text-[#161F38]">{completedDurationMin} мин.</strong> • Ученик: <strong className="text-[#161F38]">{targetStudentName}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSkipHomeworkAndLeave}
                className="text-[#8A95A8] hover:text-[#161F38] p-1 rounded-lg"
                title="Закрыть"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Subtitle Card */}
            <div className="bg-[#FFF8F1] border border-[#F2DECE] rounded-2xl p-3 flex items-center gap-2.5">
              <BookOpen className="w-4 h-4 text-coralAccent shrink-0" />
              <p className="text-xs text-[#161F38] font-bold">
                Отправьте домашнее задание ученику для закрепления материала урока
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSendHomeworkAndLeave} className="space-y-3">
              <div>
                <label className="text-[11px] font-black text-[#161F38] uppercase tracking-wider block mb-1">
                  Тема / Название задания
                </label>
                <input
                  type="text"
                  required
                  value={hwTitle}
                  onChange={(e) => setHwTitle(e.target.value)}
                  placeholder="Например: Артикуляционная гимнастика"
                  className="w-full bg-[#FFF8F1] border border-[#EADBCC] focus:border-coralAccent rounded-xl px-3.5 py-2 text-base sm:text-xs font-bold text-[#161F38] outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-black text-[#161F38] uppercase tracking-wider block mb-1">
                  Описание задания и рекомендации ученику
                </label>
                <textarea
                  required
                  rows={3}
                  value={hwDescription}
                  onChange={(e) => setHwDescription(e.target.value)}
                  placeholder="Опишите, что нужно повторить, отработать перед зеркалом или записать в аудиоответе..."
                  className="w-full bg-[#FFF8F1] border border-[#EADBCC] focus:border-coralAccent rounded-xl p-3 text-base sm:text-xs text-[#161F38] outline-none resize-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-black text-[#161F38] uppercase tracking-wider block mb-1">
                  Срок выполнения (дедлайн)
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={hwDueDate}
                    onChange={(e) => setHwDueDate(e.target.value)}
                    className="w-full bg-[#FFF8F1] border border-[#EADBCC] focus:border-coralAccent rounded-xl px-3.5 py-2 text-base sm:text-xs font-bold text-[#161F38] outline-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                <button
                  type="submit"
                  disabled={isSubmittingHw}
                  className="w-full sm:flex-1 bg-coralAccent hover:bg-coralAccent-hover disabled:opacity-50 text-white font-black text-xs py-3 rounded-full flex items-center justify-center gap-2 shadow-xs transition-transform active:scale-97 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmittingHw ? 'Отправка...' : 'Отправить ДЗ и перейти в кабинет'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSkipHomeworkAndLeave}
                  className="w-full sm:w-auto text-xs font-bold text-[#8A95A8] hover:text-[#161F38] px-4 py-3 rounded-full hover:bg-[#FFF8F1] transition-colors"
                >
                  Пропустить (без ДЗ)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
