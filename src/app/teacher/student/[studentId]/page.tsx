'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  GraduationCap,
  Minus,
  PenLine,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Shield,
  Trash2,
  User,
  Video,
  AlertCircle,
  FileText
} from 'lucide-react';
import { showSystemNotification } from '@/components/NotificationManager';

interface StudentBinding {
  id: string;
  public_id: string;
  full_name: string;
  phone?: string | null;
  email?: string | null;
  balance_lessons: number;
  metadata?: {
    is_online?: boolean;
    last_seen_at?: string | null;
  };
  created_at?: string;
}

interface HomeworkItem {
  id: string;
  title: string;
  task_description: string;
  teacher_name?: string;
  status: 'assigned' | 'submitted' | 'reviewed';
  created_at: string;
}

interface LessonItem {
  id: string;
  room_token: string;
  topic: string;
  scheduled_for?: string;
  started_at?: string;
  ended_at?: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
}

export default function TeacherStudentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const studentId = (params?.studentId as string) || '';
  const teacherIdParam = searchParams.get('teacherId');

  // Teacher identification
  const [teacherPublicId, setTeacherPublicId] = useState<string>(teacherIdParam || '');
  const [teacherName, setTeacherName] = useState<string>('Преподаватель');

  // Student state
  const [student, setStudent] = useState<StudentBinding | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Editable fields
  const [notes, setNotes] = useState<string>('');
  const [savingNotes, setSavingNotes] = useState<boolean>(false);
  const [notesSavedSuccess, setNotesSavedSuccess] = useState<boolean>(false);

  // Balance adjust
  const [balanceInput, setBalanceInput] = useState<string>('');
  const [updatingBalance, setUpdatingBalance] = useState<boolean>(false);
  const [balanceSavedToast, setBalanceSavedToast] = useState<boolean>(false);

  // Related data
  const [homeworks, setHomeworks] = useState<HomeworkItem[]>([]);
  const [lessons, setLessons] = useState<LessonItem[]>([]);

  // UI state
  const [copiedLink, setCopiedLink] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Initial teacher resolution from localStorage if param missing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedTeacherId =
        teacherIdParam ||
        localStorage.getItem('aida_auth_user_id') ||
        localStorage.getItem('aida_user_id') ||
        'id179017';
      setTeacherPublicId(storedTeacherId);

      const storedTeacherName =
        localStorage.getItem('aida_full_name') ||
        localStorage.getItem('aida_user_name') ||
        'Преподаватель';
      setTeacherName(storedTeacherName.replace(/\s*\(.*?\)$/, '').trim() || 'Преподаватель');
    }
  }, [teacherIdParam]);

  // Load student profile, notes, homeworks, and lessons
  const fetchStudentDetails = async () => {
    if (!studentId) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      // 1. Fetch user binding
      const res = await fetch(`/api/user/bind?publicId=${encodeURIComponent(studentId)}`, {
        cache: 'no-store',
      });
      const data = await res.json();

      if (!data?.exists || !data?.binding) {
        setErrorMsg('Ученик с таким ID не найден в системе');
        setLoading(false);
        return;
      }

      setStudent(data.binding);
      setBalanceInput(String(data.binding.balance_lessons ?? 0));

      // 2. Fetch teacher-student notes if exists
      if (teacherPublicId) {
        try {
          const tsRes = await fetch(
            `/api/teacher/students?teacherPublicId=${encodeURIComponent(teacherPublicId)}`,
            { cache: 'no-store' }
          );
          const tsData = await tsRes.json();
          if (tsData?.students) {
            const match = tsData.students.find(
              (s: any) =>
                (s.student_public_id && s.student_public_id.toLowerCase() === studentId.toLowerCase()) ||
                s.id === studentId
            );
            if (match?.notes) {
              setNotes(match.notes);
            }
          }
        } catch (_) {}
      }

      // 3. Fetch homework for this student
      try {
        const hwRes = await fetch(`/api/homework?studentPublicId=${encodeURIComponent(studentId)}`, {
          cache: 'no-store',
        });
        const hwData = await hwRes.json();
        if (hwData?.homework) {
          setHomeworks(hwData.homework);
        }
      } catch (_) {}

      // 4. Fetch lessons for this student
      try {
        const lessRes = await fetch(`/api/lessons?studentPublicId=${encodeURIComponent(studentId)}`, {
          cache: 'no-store',
        });
        const lessData = await lessRes.json();
        if (lessData?.lessons) {
          setLessons(lessData.lessons);
        }
      } catch (_) {}
    } catch (err: any) {
      console.error('Failed to load student details:', err);
      setErrorMsg('Не удалось загрузить данные ученика');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentDetails();
  }, [studentId, teacherPublicId]);

  // Clean child display name
  const studentDisplayName = useMemo(() => {
    if (!student?.full_name) return studentId;
    const childMatch = student.full_name.match(/ребёнок:\s*([^)]+)/i);
    if (childMatch) return childMatch[1].trim();
    return student.full_name.replace(/\s*\(.*?\)$/, '').trim() || student.full_name;
  }, [student, studentId]);

  // Adjust balance by delta (+1, -1, +5, etc.)
  const handleAdjustBalance = async (delta: number) => {
    if (!student) return;
    const current = student.balance_lessons ?? 0;
    const nextVal = Math.max(0, current + delta);
    await updateBalanceTo(nextVal, delta > 0 ? `+${delta} зан.` : `${delta} зан.`);
  };

  // Set explicit balance
  const handleSetCustomBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(balanceInput, 10);
    if (isNaN(val) || val < 0) return;
    await updateBalanceTo(val, `Установлен баланс: ${val}`);
  };

  const updateBalanceTo = async (newBalance: number, note?: string) => {
    if (!student) return;
    setUpdatingBalance(true);

    // Optimistic UI update
    setStudent((prev) => (prev ? { ...prev, balance_lessons: newBalance } : prev));
    setBalanceInput(String(newBalance));

    try {
      const res = await fetch('/api/students/balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentPublicId: student.public_id || studentId,
          newBalance,
          isTeacherVerified: true,
          description: `Преподаватель ${teacherName} обновил баланс (${note || newBalance})`,
        }),
      });
      const data = await res.json();
      if (data.success && typeof data.newBalance === 'number') {
        setStudent((prev) => (prev ? { ...prev, balance_lessons: data.newBalance } : prev));
        setBalanceInput(String(data.newBalance));
        setBalanceSavedToast(true);
        setTimeout(() => setBalanceSavedToast(false), 2500);
      }
    } catch (err) {
      console.error('Error updating student balance:', err);
      // Revert from server on failure
      fetchStudentDetails();
    } finally {
      setUpdatingBalance(false);
    }
  };

  // Save notes to Supabase
  const handleSaveNotes = async () => {
    if (!student) return;
    setSavingNotes(true);
    setNotesSavedSuccess(false);

    try {
      const res = await fetch('/api/teacher/students', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacher_public_id: teacherPublicId,
          student_public_id: student.public_id || studentId,
          notes: notes.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNotesSavedSuccess(true);
        setTimeout(() => setNotesSavedSuccess(false), 2500);
      }
    } catch (err) {
      console.error('Error saving notes:', err);
    } finally {
      setSavingNotes(false);
    }
  };

  // Remove student binding
  const handleRemoveStudent = async () => {
    setIsDeleting(true);
    try {
      await fetch(
        `/api/teacher/students?teacherPublicId=${encodeURIComponent(teacherPublicId)}&studentPublicId=${encodeURIComponent(studentId)}`,
        { method: 'DELETE' }
      );
      router.push(`/teacher?id=${encodeURIComponent(teacherPublicId)}`);
    } catch (err) {
      console.error('Error removing student:', err);
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const copyCabinetLink = () => {
    if (typeof window !== 'undefined' && student) {
      const fullUrl = `${window.location.origin}/${student.public_id || studentId}`;
      navigator.clipboard.writeText(fullUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const backUrl = `/teacher?id=${encodeURIComponent(teacherPublicId || 'id179017')}`;

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-[#5C8519] animate-spin" />
          <p className="text-xs font-bold text-[#6B758E]">Загрузка данных ученика...</p>
        </div>
      </div>
    );
  }

  if (errorMsg || !student) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-500 border border-rose-200 flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-[#161F38]">Ученик не найден</h2>
        <p className="text-xs text-[#6B758E]">{errorMsg || 'Данные этого ученика отсутствуют в базе.'}</p>
        <Link
          href={backUrl}
          className="inline-flex items-center gap-2 bg-[#5C8519] hover:bg-[#4E7214] text-white px-5 py-2.5 rounded-full text-xs font-black shadow-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Вернуться в кабинет преподавателя</span>
        </Link>
      </div>
    );
  }

  const isOnline = student.metadata?.is_online;

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-12">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href={backUrl}
          className="inline-flex items-center gap-2 text-xs font-black text-[#5C8519] hover:text-[#4E7214] bg-white hover:bg-[#F5F8F1] border border-[#D5E5B8] px-3.5 py-2 rounded-xl transition-all shadow-2xs hover:shadow-xs active:scale-[0.98] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>К списку учеников</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={copyCabinetLink}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#161F38] bg-white hover:bg-slate-50 border border-[#E2E8F0] px-3 py-2 rounded-xl transition-colors shadow-2xs cursor-pointer"
            title="Скопировать ссылку на личный кабинет ученика"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-[#5C8519]" /> : <Copy className="w-3.5 h-3.5 text-[#64748B]" />}
            <span className="hidden sm:inline">{copiedLink ? 'Ссылка скопирована' : 'Ссылка на ЛК'}</span>
          </button>

          <Link
            href={`/${student.public_id || studentId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#161F38] bg-white hover:bg-slate-50 border border-[#E2E8F0] px-3 py-2 rounded-xl transition-colors shadow-2xs cursor-pointer"
            title="Открыть личный кабинет ученика в новой вкладке"
          >
            <span className="hidden sm:inline">Открыть ЛК</span>
            <ExternalLink className="w-3.5 h-3.5 text-[#64748B]" />
          </Link>
        </div>
      </div>

      {/* 1. Header Card: Child Profile Banner */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#E5EED8] shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            {/* Child Big Avatar */}
            <div className="relative shrink-0">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#5C8519] to-[#8BC34A] text-white font-black text-xl flex items-center justify-center shadow-xs">
                {studentDisplayName[0] || 'У'}
              </div>
              <span
                className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                  isOnline ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
                title={isOnline ? 'В сети' : 'Не в сети'}
              />
            </div>

            {/* Info */}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-black text-[#161F38] truncate">
                  {studentDisplayName}
                </h1>
                <span className="text-[11px] font-bold bg-[#F5F8F1] text-[#5C8519] border border-[#D5E5B8] px-2 py-0.5 rounded-full shrink-0">
                  ID: {student.public_id || studentId}
                </span>
                {isOnline ? (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                    В сети
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full shrink-0">
                    Не в сети
                  </span>
                )}
              </div>

              <div className="text-xs text-[#6B758E] flex items-center gap-3 flex-wrap mt-1">
                {student.phone && (
                  <span className="inline-flex items-center gap-1 text-[#161F38] font-bold">
                    <Phone className="w-3 h-3 text-[#5C8519]" />
                    {student.phone}
                  </span>
                )}
                {student.email && (
                  <span className="truncate">
                    {student.email}
                  </span>
                )}
                {student.created_at && (
                  <span className="text-[11px] text-[#8A95A8]">
                    В центре с {new Date(student.created_at).toLocaleDateString('ru-RU')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Start Lesson Button */}
          <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t border-[#E5EED8]/60 sm:border-t-0">
            <Link
              href={`/room/room-${Math.floor(1000 + Math.random() * 9000)}?role=teacher&studentId=${encodeURIComponent(
                student.public_id || studentId
              )}&topic=${encodeURIComponent('Индивидуальное занятие: Логопедия')}`}
              className="inline-flex items-center gap-2 bg-[#5C8519] hover:bg-[#4E7214] text-white px-4 py-2.5 rounded-xl text-xs font-black shadow-xs hover:shadow-sm transition-all active:scale-[0.98] cursor-pointer"
            >
              <Video className="w-4 h-4" />
              <span>Начать урок</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (7 cols): Balance Controls & Pedagogical Notes */}
        <div className="lg:col-span-7 space-y-5">
          {/* Card: Balance Management */}
          <div className="bg-white rounded-3xl p-5 border border-[#E5EED8] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F2F7EB]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#F5F8F1] border border-[#D5E5B8] flex items-center justify-center text-[#5C8519]">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-[#161F38]">Баланс занятий ученика</h2>
                  <p className="text-[11px] text-[#6B758E]">Управление остатком оплаченных уроков в Supabase</p>
                </div>
              </div>

              {balanceSavedToast && (
                <span className="text-[11px] font-bold text-[#5C8519] bg-[#EAF7CF] px-2.5 py-1 rounded-full animate-in fade-in">
                  Баланс сохранён!
                </span>
              )}
            </div>

            {/* Current Balance Counter */}
            <div className="bg-[#FDFEFC] border border-[#E5EED8] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold text-[#5C8519] uppercase tracking-wider block">
                  Текущий доступный остаток
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-3xl font-black text-[#161F38]">
                    {student.balance_lessons ?? 0}
                  </span>
                  <span className="text-sm font-bold text-[#6B758E]">занятий</span>
                </div>
              </div>

              {/* Quick +/- Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={updatingBalance || (student.balance_lessons ?? 0) <= 0}
                  onClick={() => handleAdjustBalance(-1)}
                  className="inline-flex items-center gap-1 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-40 cursor-pointer shadow-2xs"
                  title="Списать 1 занятие"
                >
                  <Minus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>1 урок</span>
                </button>

                <button
                  type="button"
                  disabled={updatingBalance}
                  onClick={() => handleAdjustBalance(1)}
                  className="inline-flex items-center gap-1 bg-[#5C8519] hover:bg-[#4E7214] text-white px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-40 cursor-pointer shadow-2xs"
                  title="Добавить 1 занятие"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>1 урок</span>
                </button>

                <button
                  type="button"
                  disabled={updatingBalance}
                  onClick={() => handleAdjustBalance(5)}
                  className="inline-flex items-center gap-1 bg-[#F5F8F1] hover:bg-[#EAF7CF] text-[#5C8519] border border-[#D5E5B8] px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-40 cursor-pointer shadow-2xs"
                  title="Добавить 5 занятий"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>5 уроков</span>
                </button>
              </div>
            </div>

            {/* Direct manual input */}
            <form onSubmit={handleSetCustomBalance} className="flex items-center gap-2 pt-1">
              <div className="relative flex-1">
                <input
                  type="number"
                  min="0"
                  max="999"
                  value={balanceInput}
                  onChange={(e) => setBalanceInput(e.target.value)}
                  placeholder="Точное число занятий..."
                  className="w-full bg-[#FFFDFB] border border-[#E5EED8] focus:border-[#5C8519] rounded-xl px-3.5 py-2 text-xs font-bold text-[#161F38] outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={updatingBalance}
                className="bg-[#161F38] hover:bg-black text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer shrink-0 disabled:opacity-40"
              >
                {updatingBalance ? 'Сохранение...' : 'Задать вручную'}
              </button>
            </form>
          </div>

          {/* Card: Pedagogical Notes & Student Info */}
          <div className="bg-white rounded-3xl p-5 border border-[#E5EED8] shadow-xs space-y-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-[#F2F7EB]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#F5F8F1] border border-[#D5E5B8] flex items-center justify-center text-[#5C8519]">
                  <PenLine className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-[#161F38]">Педагогические заметки и план</h2>
                  <p className="text-[11px] text-[#6B758E]">Видны только вам для индивидуального сопровождения</p>
                </div>
              </div>

              {notesSavedSuccess && (
                <span className="text-[11px] font-bold text-[#5C8519] bg-[#EAF7CF] px-2.5 py-1 rounded-full animate-in fade-in">
                  Заметки сохранены!
                </span>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-[#6B758E] block">
                Заметки о ребёнке (диагноз, звукопроизношение, цели и динамика):
              </label>
              <textarea
                rows={5}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Например: Постановка звука [Р], артикуляционная гимнастика, развивать усидчивость..."
                className="w-full bg-[#FDFEFC] border border-[#E5EED8] focus:border-[#5C8519] rounded-2xl p-3.5 text-xs text-[#161F38] outline-none resize-none leading-relaxed"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="inline-flex items-center gap-2 bg-[#5C8519] hover:bg-[#4E7214] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-[0.98] shadow-2xs cursor-pointer disabled:opacity-40"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingNotes ? 'Сохранение...' : 'Сохранить заметки'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Homeworks, Lessons & Danger Zone */}
        <div className="lg:col-span-5 space-y-5">
          {/* Card: Homeworks Overview */}
          <div className="bg-white rounded-3xl p-5 border border-[#E5EED8] shadow-xs space-y-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-[#F2F7EB]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#161F38]">Домашние задания</h3>
                  <p className="text-[11px] text-[#6B758E]">{homeworks.length} заданий в архиве</p>
                </div>
              </div>

              <Link
                href={`/teacher/homework?studentId=${encodeURIComponent(student.public_id || studentId)}&studentName=${encodeURIComponent(studentDisplayName)}&teacherId=${encodeURIComponent(teacherPublicId || '')}`}
                className="text-xs font-bold text-[#5C8519] hover:underline inline-flex items-center gap-1"
              >
                <span>Все ДЗ</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            {homeworks.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#8A95A8] bg-[#FDFEFC] rounded-2xl border border-dashed border-[#E5EED8]">
                Нет назначенных домашних заданий
              </div>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {homeworks.slice(0, 4).map((hw) => (
                  <div
                    key={hw.id}
                    className="p-2.5 rounded-xl border border-[#F0F5E9] bg-[#FDFEFC] flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#161F38] truncate">{hw.title}</p>
                      <span className="text-[10px] text-[#8A95A8]">
                        {new Date(hw.created_at).toLocaleDateString('ru-RU')}
                      </span>
                    </div>

                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        hw.status === 'reviewed'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : hw.status === 'submitted'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {hw.status === 'reviewed'
                        ? 'Проверено'
                        : hw.status === 'submitted'
                        ? 'Сдано'
                        : 'Назначено'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-1">
              <Link
                href={`/teacher/homework?studentId=${encodeURIComponent(student.public_id || studentId)}&studentName=${encodeURIComponent(studentDisplayName)}&teacherId=${encodeURIComponent(teacherPublicId || '')}`}
                className="w-full inline-flex items-center justify-center gap-2 bg-[#F5F8F1] hover:bg-[#EAF7CF] text-[#5C8519] border border-[#D5E5B8] py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Назначить новое ДЗ</span>
              </Link>
            </div>
          </div>

          {/* Card: Lessons Summary */}
          <div className="bg-white rounded-3xl p-5 border border-[#E5EED8] shadow-xs space-y-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-[#F2F7EB]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#161F38]">Уроки ученика</h3>
                  <p className="text-[11px] text-[#6B758E]">{lessons.length} занятий всего</p>
                </div>
              </div>
            </div>

            {lessons.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#8A95A8] bg-[#FDFEFC] rounded-2xl border border-dashed border-[#E5EED8]">
                История уроков пока пуста
              </div>
            ) : (
              <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                {lessons.slice(0, 3).map((l) => (
                  <div
                    key={l.id}
                    className="p-2.5 rounded-xl border border-[#F0F5E9] bg-[#FDFEFC] flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#161F38] truncate">{l.topic}</p>
                      <span className="text-[10px] text-[#8A95A8]">
                        {l.scheduled_for
                          ? new Date(l.scheduled_for).toLocaleDateString('ru-RU')
                          : l.started_at
                          ? new Date(l.started_at).toLocaleDateString('ru-RU')
                          : 'Онлайн-урок'}
                      </span>
                    </div>

                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        l.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700'
                          : l.status === 'active'
                          ? 'bg-rose-50 text-rose-700 animate-pulse'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {l.status === 'completed' ? 'Завершен' : l.status === 'active' ? 'Идет сейчас' : 'Запланирован'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card: Danger Zone (Unbind student) */}
          <div className="bg-white rounded-3xl p-5 border border-rose-100 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-rose-950">Открепить ученика</h3>
                <p className="text-[11px] text-rose-700/80">Ученик перестанет отображаться в вашем списке</p>
              </div>
            </div>

            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Открепить от моего кабинета
              </button>
            ) : (
              <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200 space-y-2">
                <p className="text-xs text-rose-800 font-bold">Вы уверены? Это уберёт ученика из вашего списка.</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={handleRemoveStudent}
                    className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-1.5 rounded-xl text-xs font-black transition-colors cursor-pointer disabled:opacity-40"
                  >
                    {isDeleting ? 'Удаление...' : 'Да, открепить'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 bg-white hover:bg-slate-100 text-[#161F38] border border-slate-200 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
