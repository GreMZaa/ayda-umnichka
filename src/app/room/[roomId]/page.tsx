'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
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

    // 3. Resolve participant label
    const savedName = localStorage.getItem('aida_full_name') || '';
    if (teacherFlag) {
      setParticipantName('Ученик центра');
    } else {
      setParticipantName('Василина Владимировна (Педагог)');
    }

    // 4. Save active lesson room state so user can re-enter from personal cabinet if navigated away
    try {
      const existingStart = localStorage.getItem(`aida_lesson_started_${roomId}`);
      const startTimestamp = existingStart ? parseInt(existingStart, 10) : Date.now();
      if (!existingStart) {
        localStorage.setItem(`aida_lesson_started_${roomId}`, String(startTimestamp));
      }

      localStorage.setItem(
        'aida_active_lesson_room',
        JSON.stringify({
          roomId,
          topic: resolvedTopic,
          role: activeRole,
          timestamp: startTimestamp,
        })
      );

      // Notify database that room has started
      fetch('/api/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start_room', room_token: roomId }),
      }).catch(() => {});
    } catch (_) {}
  }, [roomId, roleParam, topicParam]);

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

    // Deduct 1 lesson from student balance if student
    if (!isTeacher) {
      const currentBalance = parseInt(localStorage.getItem('aida_student_balance') || '0', 10);
      const updatedBalance = Math.max(0, currentBalance - 1);
      localStorage.setItem('aida_student_balance', updatedBalance.toString());
    }

    const durationMin = Math.round(durationSec / 60) || 1;
    alert(`Урок завершен! Длительность: ${durationMin} мин.`);

    const savedUserId =
      localStorage.getItem('aida_auth_user_id') ||
      localStorage.getItem('aida_user_id') ||
      '';

    if (isTeacher) {
      router.push(`/teacher?id=${savedUserId || 'id179017'}`);
    } else if (savedUserId) {
      router.push(`/${savedUserId}`);
    } else {
      router.push('/student');
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] min-h-[580px] w-full">
      {/* 100% Spacious Main Workspace — No squeezed sidebars */}
      <div className="flex-1 w-full h-full relative overflow-hidden">
        {isWhiteboardActive ? (
          <>
            <Whiteboard />
            {/* Picture in Picture Video Preview with Live Camera while Whiteboard is active */}
            <VideoCall
              roomToken={roomId}
              isTeacher={isTeacher}
              participantName={participantName}
              topic={topic}
              isWhiteboardActive={true}
              onToggleWhiteboard={() => setIsWhiteboardActive(false)}
              onEndLesson={handleEndLesson}
            />
          </>
        ) : (
          <VideoCall
            roomToken={roomId}
            isTeacher={isTeacher}
            participantName={participantName}
            topic={topic}
            isWhiteboardActive={false}
            onToggleWhiteboard={() => setIsWhiteboardActive(true)}
            onEndLesson={handleEndLesson}
          />
        )}
      </div>
    </div>
  );
}
