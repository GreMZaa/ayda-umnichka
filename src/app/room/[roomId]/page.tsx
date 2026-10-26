'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, BookOpen, Send, Calendar, ArrowRight, X } from 'lucide-react';
import VideoCall from '@/components/VideoCall';
import Whiteboard from '@/components/Whiteboard';

export default function LessonRoomPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const roomId = (params?.roomId as string) || 'live-room';
  const roleParam = searchParams.get('role');
  const topicParam = searchParams.get('topic');

  const [isWhiteboardActive, setIsWhiteboardActive] = useState(false);
  const [isTeacher, setIsTeacher] = useState(false);
  const [topic, setTopic] = useState('Индивидуальное занятие: Логопедия');
  const [participantName, setParticipantName] = useState('');
  const [targetStudentId, setTargetStudentId] = useState('');
  const [targetStudentName, setTargetStudentName] = useState('Ученик');

  // Post-lesson Homework Modal for Teacher
  const [showHomeworkModal, setShowHomeworkModal] = useState(false);
  const [completedDurationMin, setCompletedDurationMin] = useState(1);
  const [hwTitle, setHwTitle] = useState('');
  const [hwDescription, setHwDescription] = useState('');
  const [hwDueDate, setHwDueDate] = useState('');
  const [isSubmittingHw, setIsSubmittingHw] = useState(false);

  useEffect(() => {
    // 1. Determine role
    const activeRole =
      roleParam ||
      localStorage.getItem('aida_active_role') ||
      document.cookie.match(/(?:^|; )aida_active_role=([^;]*)/)?.[1] ||
      'student';

    const teacherFlag = activeRole === 'teacher' || activeRole === 'admin';
    setIsTeacher(teacherFlag);

    // 2. Determine topic
    const resolvedTopic = topicParam
      ? decodeURIComponent(topicParam)
      : 'Индивидуальное занятие: Логопедия';
    setTopic(resolvedTopic);
    setHwTitle(`Домашнее задание: ${resolvedTopic}`);

    // Default due date: 2 days ahead
    const d = new Date();
    d.setDate(d.getDate() + 2);
    setHwDueDate(d.toISOString().slice(0, 10));

    // 3. Resolve participant label
    if (teacherFlag) {
      setParticipantName('Ученик центра');
    } else {
      setParticipantName('Василина Владимировна');
    }

    // 4. Save active lesson room state so user can re-enter from personal cabinet if navigated away
    try {
      const existingStart = localStorage.getItem(`aida_lesson_started_${roomId}`);
      const startTimestamp = existingStart ? parseInt(existingStart, 10) : Date.now();

      localStorage.setItem(
        'aida_active_lesson_room',
        JSON.stringify({
          roomId,
          topic: resolvedTopic,
          role: activeRole,
          timestamp: startTimestamp,
        })
      );
    } catch (_) {}
  }, [roomId, roleParam, topicParam]);

  // Fetch student info linked to this lesson room
  useEffect(() => {
    const fetchLessonDetails = async () => {
      try {
        const res = await fetch('/api/lessons');
        const data = await res.json();
        if (data?.lessons) {
          const currentLesson = data.lessons.find((l: any) => l.room_token === roomId);
          if (currentLesson) {
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
          }
        }
      } catch (_) {}
    };
    fetchLessonDetails();
  }, [roomId, isTeacher]);

  const handleEndLesson = (durationSec: number) => {
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

    // If student: deduct lesson from balance and return to cabinet
    if (!isTeacher) {
      const currentBalance = parseInt(localStorage.getItem('aida_student_balance') || '0', 10);
      const updatedBalance = Math.max(0, currentBalance - 1);
      localStorage.setItem('aida_student_balance', updatedBalance.toString());

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

    // If teacher: Show homework assignment modal window
    setShowHomeworkModal(true);
  };

  const handleSendHomeworkAndLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingHw(true);

    try {
      if (hwTitle.trim() && hwDescription.trim()) {
        await fetch('/api/homework', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: hwTitle.trim(),
            task_description: hwDescription.trim(),
            student_public_id: targetStudentId || null,
            student_name: targetStudentName || 'Ученик',
            teacher_name: 'Василина Владимировна',
            due_date: hwDueDate || null,
          }),
        });
      }
    } catch (err) {
      console.warn('Error saving homework:', err);
    }

    const savedUserId =
      localStorage.getItem('aida_auth_user_id') ||
      localStorage.getItem('aida_user_id') ||
      '';

    router.push(`/teacher?id=${savedUserId || 'id179017'}`);
  };

  const handleSkipHomeworkAndLeave = () => {
    const savedUserId =
      localStorage.getItem('aida_auth_user_id') ||
      localStorage.getItem('aida_user_id') ||
      '';

    router.push(`/teacher?id=${savedUserId || 'id179017'}`);
  };

  return (
    <div className="flex flex-col w-full h-[100dvh] relative overflow-hidden bg-[#FFF7EE]">
      {/* 100% Immersive Full-Screen Workspace — WebRTC call stays continuously connected */}
      <div className="w-full h-full relative overflow-hidden flex flex-col">
        {/* Interactive Whiteboard Canvas */}
        <div className={`w-full h-full ${isWhiteboardActive ? 'block' : 'hidden'}`}>
          <Whiteboard roomId={roomId} onClose={() => setIsWhiteboardActive(false)} />
        </div>

        {/* VideoCall remains persistently mounted so WebRTC connection never drops */}
        <div className={isWhiteboardActive ? 'contents' : 'w-full h-full'}>
          <VideoCall
            roomToken={roomId}
            isTeacher={isTeacher}
            participantName={participantName}
            topic={topic}
            isWhiteboardActive={isWhiteboardActive}
            onToggleWhiteboard={() => setIsWhiteboardActive(!isWhiteboardActive)}
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
