'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Shield,
  Coins,
  Users,
  CheckCircle,
  Calendar,
  AlertTriangle,
  UserCheck,
  RefreshCw,
  Plus,
  Trash2,
  ExternalLink,
  Video,
  Clock,
  Search,
  BookOpen,
  UserPlus,
  Link2,
  X,
  Check,
  ArrowRight,
  UserMinus,
  Filter,
  GraduationCap,
  Sparkles,
  Phone,
  Mail,
  MoreVertical,
  Activity,
  FileText,
  Download,
  Paperclip,
  Volume2
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { broadcastPlatformEvent } from '@/lib/platformNotifications';
import DateTimePicker from '@/components/DateTimePicker';

interface UserBindingRecord {
  id: string;
  public_id: string;
  auth_user_id?: string;
  role: 'student' | 'teacher' | 'admin';
  full_name: string;
  phone?: string | null;
  email?: string | null;
  is_registered?: boolean;
  balance_lessons: number;
  metadata?: any;
  created_at: string;
  updated_at?: string;
}

interface LessonRecord {
  id: string;
  room_token: string;
  topic: string;
  student_name: string;
  student_public_id?: string | null;
  teacher_name: string;
  teacher_id?: string | null;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  scheduled_for: string;
  duration_minutes: number;
  created_at: string;
  started_at?: string | null;
  ended_at?: string | null;
}

interface TeacherStudentBinding {
  id: string;
  teacher_public_id: string;
  student_public_id: string;
  student_name?: string | null;
  notes?: string | null;
  created_at: string;
}

interface HomeworkRecord {
  id: string;
  lesson_id?: string | null;
  teacher_id?: string | null;
  student_id?: string | null;
  title: string;
  task_description: string;
  task_file_url?: string | null;
  file_name?: string | null;
  student_solution_text?: string | null;
  student_solution_file_url?: string | null;
  status: 'assigned' | 'submitted' | 'completed' | 'in_progress';
  teacher_feedback?: string | null;
  created_at: string;
  updated_at?: string;
  student_public_id?: string | null;
  student_name?: string | null;
  teacher_name?: string | null;
}

// Clean topic title from any technical URL query artifacts
function cleanTopicTitle(str?: string | null): string {
  if (!str) return 'Индивидуальное занятие';
  let cleaned = str;
  try {
    cleaned = decodeURIComponent(cleaned);
  } catch (_) {}
  return cleaned
    .replace(/\?.*$/, '')
    .replace(/&.*$/, '')
    .trim() || 'Индивидуальное занятие';
}

function cleanPersonName(name?: string | null): string {
  if (!name) return 'Пользователь';
  return name.replace(/\s*\(ребёнок:.*?\)$/i, '').replace(/\s*\(id\d+\)$/i, '').trim();
}

export default function AdminDashboard() {
  const router = useRouter();

  // Auth state
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  // Core Supabase entities
  const [users, setUsers] = useState<UserBindingRecord[]>([]);
  const [lessons, setLessons] = useState<LessonRecord[]>([]);
  const [bindings, setBindings] = useState<TeacherStudentBinding[]>([]);
  const [homeworkList, setHomeworkList] = useState<HomeworkRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Active view tab
  const [activeTab, setActiveTab] = useState<'lessons' | 'teachers' | 'students' | 'homework' | 'bindings'>('lessons');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [lessonStatusFilter, setLessonStatusFilter] = useState<'all' | 'active' | 'pending' | 'completed' | 'cancelled'>('all');
  const [homeworkStatusFilter, setHomeworkStatusFilter] = useState<'all' | 'assigned' | 'submitted' | 'completed'>('all');

  // Notifications / feedback toast
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals state
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [isBindModalOpen, setIsBindModalOpen] = useState(false);
  const [isHomeworkModalOpen, setIsHomeworkModalOpen] = useState(false);

  // Modal form states: Schedule lesson
  const [scheduleTeacherId, setScheduleTeacherId] = useState('');
  const [scheduleStudentId, setScheduleStudentId] = useState('');
  const [scheduleTopic, setScheduleTopic] = useState('Индивидуальное занятие: Логопедия');
  const [scheduleDateTime, setScheduleDateTime] = useState(() => {
    const now = new Date();
    now.setHours(now.getHours() + 1, 0, 0, 0);
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const h = String(now.getHours()).padStart(2, '0');
    return `${y}-${m}-${d}T${h}:00`;
  });
  const [isScheduling, setIsScheduling] = useState(false);

  // Modal form states: Balance adjust
  const [selectedStudentForBalance, setSelectedStudentForBalance] = useState<UserBindingRecord | null>(null);
  const [customBalanceAmount, setCustomBalanceAmount] = useState<string>('');
  const [isAdjustingBalance, setIsAdjustingBalance] = useState(false);

  // Modal form states: Bind student to teacher
  const [bindTeacherId, setBindTeacherId] = useState('');
  const [bindStudentId, setBindStudentId] = useState('');
  const [isBindingSubmitting, setIsBindingSubmitting] = useState(false);

  // Modal form states: Homework
  const [hwStudentId, setHwStudentId] = useState('');
  const [hwTeacherName, setHwTeacherName] = useState('Василина Владимировна');
  const [hwTitle, setHwTitle] = useState('Артикуляционная гимнастика');
  const [hwDescription, setHwDescription] = useState('');
  const [hwFile, setHwFile] = useState<File | null>(null);
  const [isCreatingHw, setIsCreatingHw] = useState(false);
  const [isDeletingHwId, setIsDeletingHwId] = useState<string | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  // 1. Fetch live data from Supabase
  const fetchAllData = async () => {
    setIsRefreshing(true);
    try {
      if (!isSupabaseConfigured) {
        setLoading(false);
        setIsRefreshing(false);
        return;
      }

      // Parallel fetch from Supabase tables
      const [usersRes, lessonsRes, bindingsRes, homeworkRes] = await Promise.all([
        supabase.from('user_bindings').select('*').order('created_at', { ascending: false }),
        supabase.from('lessons').select('*').order('scheduled_for', { ascending: false }),
        supabase.from('teacher_students').select('*').order('created_at', { ascending: false }),
        supabase.from('homework').select('*').order('created_at', { ascending: false }),
      ]);

      if (usersRes.data) {
        setUsers(usersRes.data as UserBindingRecord[]);
      }
      if (lessonsRes.data) {
        setLessons(lessonsRes.data as LessonRecord[]);
      }
      if (bindingsRes.data) {
        setBindings(bindingsRes.data as TeacherStudentBinding[]);
      }
      if (homeworkRes.data) {
        setHomeworkList(homeworkRes.data as HomeworkRecord[]);
      }
    } catch (err) {
      console.error('Error fetching Supabase admin data:', err);
      showToast('Ошибка загрузки данных из Supabase', 'error');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Auth verify
  useEffect(() => {
    const role =
      localStorage.getItem('aida_active_role') ||
      document.cookie.match(/(?:^|; )aida_active_role=([^;]*)/)?.[1];
    const uid =
      localStorage.getItem('aida_user_public_id') ||
      localStorage.getItem('aida_auth_user_id') ||
      localStorage.getItem('aida_user_id');

    // Allow admin role or head account
    if (role === 'admin' || uid === 'admin_head' || uid === 'admin') {
      try {
        localStorage.setItem('aida_active_role', 'admin');
        localStorage.setItem('aida_user_public_id', 'admin_head');
        localStorage.setItem('aida_auth_user_id', 'admin_head');
        localStorage.setItem('aida_user_id', 'admin_head');
        localStorage.setItem('aida_full_name', 'Руководитель центра');
        document.cookie = 'aida_active_role=admin; path=/; max-age=2592000; SameSite=Lax';
        document.cookie = 'aida_auth_user_id=admin_head; path=/; max-age=2592000; SameSite=Lax';
        document.cookie = 'aida_user_id=admin_head; path=/; max-age=2592000; SameSite=Lax';
        window.dispatchEvent(new Event('aida-user-updated'));
      } catch (_) {}
      setIsAuthorized(true);
      fetchAllData();
    } else {
      setIsAuthorized(false);
    }
  }, []);

  // Separate teachers and students
  const teachers = useMemo(() => {
    return users.filter((u) => u.role === 'teacher' || u.public_id === 'id180457' || u.public_id === 'id179017');
  }, [users]);

  const students = useMemo(() => {
    return users.filter((u) => u.role === 'student' || u.public_id.startsWith('id5') || (u.role !== 'teacher' && u.role !== 'admin'));
  }, [users]);

  // Active lessons right now
  const activeLessonsNow = useMemo(() => {
    return lessons.filter((l) => l.status === 'active');
  }, [lessons]);

  // Filtered lessons
  const filteredLessons = useMemo(() => {
    return lessons.filter((l) => {
      if (lessonStatusFilter !== 'all' && l.status !== lessonStatusFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        l.topic.toLowerCase().includes(q) ||
        l.student_name.toLowerCase().includes(q) ||
        l.teacher_name.toLowerCase().includes(q) ||
        (l.student_public_id && l.student_public_id.toLowerCase().includes(q)) ||
        l.room_token.toLowerCase().includes(q)
      );
    });
  }, [lessons, lessonStatusFilter, searchQuery]);

  // Filtered teachers
  const filteredTeachers = useMemo(() => {
    if (!searchQuery.trim()) return teachers;
    const q = searchQuery.toLowerCase();
    return teachers.filter(
      (t) =>
        t.full_name.toLowerCase().includes(q) ||
        t.public_id.toLowerCase().includes(q) ||
        (t.phone && t.phone.toLowerCase().includes(q)) ||
        (t.email && t.email.toLowerCase().includes(q))
    );
  }, [teachers, searchQuery]);

  // Filtered students
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(
      (s) =>
        s.full_name.toLowerCase().includes(q) ||
        s.public_id.toLowerCase().includes(q) ||
        (s.phone && s.phone.toLowerCase().includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q))
    );
  }, [students, searchQuery]);

  // Filtered homework
  const filteredHomework = useMemo(() => {
    return homeworkList.filter((h) => {
      if (homeworkStatusFilter !== 'all') {
        if (homeworkStatusFilter === 'assigned' && h.status !== 'assigned' && h.status !== 'in_progress') return false;
        if (homeworkStatusFilter === 'submitted' && h.status !== 'submitted') return false;
        if (homeworkStatusFilter === 'completed' && h.status !== 'completed') return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        h.title.toLowerCase().includes(q) ||
        (h.task_description && h.task_description.toLowerCase().includes(q)) ||
        (h.student_name && h.student_name.toLowerCase().includes(q)) ||
        (h.student_public_id && h.student_public_id.toLowerCase().includes(q)) ||
        (h.teacher_name && h.teacher_name.toLowerCase().includes(q))
      );
    });
  }, [homeworkList, homeworkStatusFilter, searchQuery]);

  // Action: Adjust Student Balance
  const handleAdjustBalance = async (publicId: string, amount: number, description?: string) => {
    const student = users.find((u) => u.public_id === publicId);
    if (!student) return;

    const newBalance = Math.max(0, (student.balance_lessons || 0) + amount);

    try {
      setIsAdjustingBalance(true);
      const { error } = await supabase
        .from('user_bindings')
        .update({ balance_lessons: newBalance, updated_at: new Date().toISOString() })
        .eq('public_id', publicId);

      if (error) throw error;

      // Update local state immediately
      setUsers((prev) =>
        prev.map((u) => (u.public_id === publicId ? { ...u, balance_lessons: newBalance } : u))
      );
      if (selectedStudentForBalance?.public_id === publicId) {
        setSelectedStudentForBalance((prev) => (prev ? { ...prev, balance_lessons: newBalance } : null));
      }

      showToast(
        `Баланс ${cleanPersonName(student.full_name)}: ${newBalance} зан. (${amount > 0 ? `+${amount}` : amount})`
      );
    } catch (err: any) {
      console.error('Failed to update balance in Supabase:', err);
      showToast(err?.message || 'Ошибка обновления баланса в Supabase', 'error');
    } finally {
      setIsAdjustingBalance(false);
    }
  };

  // Action: Create scheduled lesson from Admin
  const handleAdminScheduleLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleDateTime || !scheduleTeacherId || !scheduleStudentId) {
      showToast('Заполните все обязательные поля урока', 'error');
      return;
    }

    const teacher = teachers.find((t) => t.public_id === scheduleTeacherId);
    const student = students.find((s) => s.public_id === scheduleStudentId);

    const cleanTName = cleanPersonName(teacher?.full_name || 'Преподаватель центра');
    const cleanSName = cleanPersonName(student?.full_name || 'Ученик центра');
    const roomToken = `room-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      setIsScheduling(true);
      const newLesson = {
        room_token: roomToken,
        topic: cleanTopicTitle(scheduleTopic),
        teacher_name: cleanTName,
        teacher_id: scheduleTeacherId,
        student_name: cleanSName,
        student_public_id: scheduleStudentId,
        scheduled_for: new Date(scheduleDateTime).toISOString(),
        status: 'pending' as const,
        duration_minutes: 45,
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase.from('lessons').insert([newLesson]).select();
      if (error) throw error;

      // Broadcast event so participants immediately get informed
      broadcastPlatformEvent('lesson-scheduled', {
        id: data?.[0]?.id || `lesson-${Date.now()}`,
        room_token: roomToken,
        topic: cleanTopicTitle(scheduleTopic),
        teacher_name: cleanTName,
        student_public_id: scheduleStudentId,
        student_name: cleanSName,
        scheduled_for: scheduleDateTime,
        duration_minutes: 45,
        creator_id: 'admin',
      });

      showToast(`Урок «${scheduleTopic}» успешно назначен! (${cleanTName} → ${cleanSName})`);
      setIsScheduleModalOpen(false);
      setScheduleTopic('Индивидуальное занятие: Логопедия');
      setScheduleDateTime('');
      fetchAllData();
    } catch (err: any) {
      console.error('Error scheduling lesson:', err);
      showToast(err?.message || 'Не удалось сохранить урок в Supabase', 'error');
    } finally {
      setIsScheduling(false);
    }
  };

  // Action: Update Lesson Status
  const handleUpdateLessonStatus = async (lessonId: string, nextStatus: 'active' | 'pending' | 'completed' | 'cancelled') => {
    try {
      const updateData: any = { status: nextStatus };
      if (nextStatus === 'active') updateData.started_at = new Date().toISOString();
      if (nextStatus === 'completed' || nextStatus === 'cancelled') updateData.ended_at = new Date().toISOString();

      const { error } = await supabase.from('lessons').update(updateData).eq('id', lessonId);
      if (error) throw error;

      setLessons((prev) =>
        prev.map((l) => (l.id === lessonId ? { ...l, ...updateData } : l))
      );
      showToast(`Статус урока обновлен: ${nextStatus}`);
    } catch (err: any) {
      console.error('Failed to update status:', err);
      showToast('Ошибка при изменении статуса урока', 'error');
    }
  };

  // Action: Delete Lesson
  const handleDeleteLesson = async (lessonId: string, topic: string) => {
    if (!window.confirm(`Вы уверены, что хотите удалить урок «${cleanTopicTitle(topic)}»?`)) return;

    try {
      const res = await fetch(`/api/lessons?id=${encodeURIComponent(lessonId)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Не удалось удалить урок');
      }

      setLessons((prev) => prev.filter((l) => l.id !== lessonId));
      showToast(`Урок «${cleanTopicTitle(topic)}» удалён`);
    } catch (err: any) {
      console.error('Failed to delete lesson:', err);
      showToast(err?.message || 'Ошибка при удалении урока', 'error');
    }
  };

  // Action: Delete All Lessons in current filter
  const handleDeleteAllLessons = async () => {
    const filterName =
      lessonStatusFilter === 'all'
        ? 'все уроки'
        : lessonStatusFilter === 'completed'
        ? 'все завершённые уроки'
        : lessonStatusFilter === 'pending'
        ? 'все запланированные уроки'
        : 'все выбранные уроки';

    const count = filteredLessons.length;
    if (count === 0) return;

    if (!window.confirm(`Вы уверены, что хотите безвозвратно удалить ${filterName} (${count} шт.) из базы данных Supabase?`)) {
      return;
    }

    try {
      setIsRefreshing(true);
      const url =
        lessonStatusFilter === 'all'
          ? '/api/lessons?all=true'
          : `/api/lessons?all=true&status=${encodeURIComponent(lessonStatusFilter)}`;

      const res = await fetch(url, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Не удалось очистить уроки');
      }

      if (lessonStatusFilter === 'all') {
        setLessons([]);
      } else {
        setLessons((prev) => prev.filter((l) => l.status !== lessonStatusFilter));
      }
      showToast(`Успешно удалено: ${filterName} (${count} шт.)`);
    } catch (err: any) {
      console.error('Failed to delete all lessons:', err);
      showToast(err?.message || 'Ошибка при удалении уроков', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Action: Bind student to teacher
  const handleCreateBinding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bindTeacherId || !bindStudentId) {
      showToast('Выберите и преподавателя, и ученика', 'error');
      return;
    }

    const student = students.find((s) => s.public_id === bindStudentId);

    try {
      setIsBindingSubmitting(true);
      const newBind = {
        teacher_public_id: bindTeacherId,
        student_public_id: bindStudentId,
        student_name: cleanPersonName(student?.full_name || 'Ученик'),
        notes: 'Закреплен администратором платформы',
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase.from('teacher_students').insert([newBind]).select();
      if (error) throw error;

      showToast(`Ученик ${cleanPersonName(student?.full_name)} прикреплен к педагогу!`);
      setIsBindModalOpen(false);
      setBindTeacherId('');
      setBindStudentId('');
      fetchAllData();
    } catch (err: any) {
      console.error('Error creating binding:', err);
      showToast(err?.message || 'Не удалось прикрепить ученика', 'error');
    } finally {
      setIsBindingSubmitting(false);
    }
  };

  // Action: Remove binding
  const handleRemoveBinding = async (bindingId: string, sName?: string | null) => {
    if (!window.confirm(`Открепить ученика ${cleanPersonName(sName)} от преподавателя?`)) return;

    try {
      const { error } = await supabase.from('teacher_students').delete().eq('id', bindingId);
      if (error) throw error;

      setBindings((prev) => prev.filter((b) => b.id !== bindingId));
      showToast('Связка успешно удалена');
    } catch (err: any) {
      console.error('Error deleting binding:', err);
      showToast('Ошибка при откреплении ученика', 'error');
    }
  };

  // Action: Create Homework
  const handleCreateHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hwTitle.trim() || !hwDescription.trim()) {
      showToast('Укажите название и описание домашнего задания', 'error');
      return;
    }

    try {
      setIsCreatingHw(true);
      let fileUrl: string | null = null;
      let fileName: string | null = null;

      if (hwFile) {
        fileName = hwFile.name;
        const formData = new FormData();
        formData.append('file', hwFile);
        formData.append('studentId', hwStudentId || 'common');

        const uploadRes = await fetch('/api/room/upload', {
          method: 'POST',
          body: formData,
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          fileUrl = uploadData.fileUrl || null;
        }
      }

      const selectedStudent = students.find((s) => s.public_id === hwStudentId);
      const studentName = selectedStudent
        ? cleanPersonName(selectedStudent.full_name)
        : hwStudentId
        ? hwStudentId
        : 'Всем ученикам';

      const newRecord = {
        title: hwTitle.trim(),
        task_description: hwDescription.trim(),
        student_public_id: hwStudentId || null,
        student_name: studentName,
        teacher_name: hwTeacherName || 'Василина Владимировна',
        task_file_url: fileUrl,
        file_name: fileName,
        status: 'assigned' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase.from('homework').insert([newRecord]).select();
      if (error) throw error;

      const createdItem = data?.[0] as HomeworkRecord;
      if (createdItem) {
        setHomeworkList((prev) => [createdItem, ...prev]);
      }

      // Broadcast event so student receives homework immediately in their cabinet
      broadcastPlatformEvent('homework-assigned', {
        id: createdItem?.id || `hw-${Date.now()}`,
        title: hwTitle.trim(),
        task_description: hwDescription.trim(),
        student_public_id: hwStudentId || null,
        student_name: studentName,
        teacher_name: hwTeacherName || 'Василина Владимировна',
        task_file_url: fileUrl,
        file_name: fileName,
        created_at: new Date().toISOString(),
        creator_id: 'admin',
      });

      showToast(`Домашнее задание «${hwTitle}» успешно добавлено! (${studentName})`);
      setIsHomeworkModalOpen(false);
      setHwTitle('Артикуляционная гимнастика');
      setHwDescription('');
      setHwFile(null);
      setHwStudentId('');
    } catch (err: any) {
      console.error('Error creating homework:', err);
      showToast(err?.message || 'Ошибка добавления домашнего задания', 'error');
    } finally {
      setIsCreatingHw(false);
    }
  };

  // Action: Delete Homework
  const handleDeleteHomework = async (id: string, title: string) => {
    if (!window.confirm(`Вы уверены, что хотите удалить домашнее задание «${title}»?`)) return;

    try {
      setIsDeletingHwId(id);
      const { error } = await supabase.from('homework').delete().eq('id', id);
      if (error) throw error;

      setHomeworkList((prev) => prev.filter((h) => h.id !== id));
      showToast(`Домашнее задание «${title}» удалено`);
    } catch (err: any) {
      console.error('Error deleting homework:', err);
      showToast('Ошибка при удалении домашнего задания', 'error');
    } finally {
      setIsDeletingHwId(null);
    }
  };

  // Action: Update Homework Status (Check / Complete)
  const handleUpdateHomeworkStatus = async (id: string, nextStatus: 'assigned' | 'completed') => {
    try {
      const updateData = { status: nextStatus, updated_at: new Date().toISOString() };
      const { error } = await supabase.from('homework').update(updateData).eq('id', id);
      if (error) throw error;

      setHomeworkList((prev) =>
        prev.map((h) => (h.id === id ? { ...h, ...updateData } : h))
      );
      showToast(nextStatus === 'completed' ? 'ДЗ отмечено как проверенное ✓' : 'ДЗ возвращено в статус назначенного');
    } catch (err: any) {
      console.error('Error updating homework status:', err);
      showToast('Ошибка при обновлении статуса задания', 'error');
    }
  };

  // Access denied screen with quick admin bypass for center manager
  if (isAuthorized === false) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#F2DECE] text-center max-w-md space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-[#FFF2E6] text-coralAccent border border-[#FCDDC7] flex items-center justify-center mx-auto shadow-2xs">
            <Shield className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-[#161F38]">Панель администратора</h2>
          <p className="text-xs text-[#6B758E] leading-relaxed">
            Для доступа к базе данных учеников, преподавателей и уроков требуются права администратора центра «АйДаУмничка».
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.setItem('aida_active_role', 'admin');
                  localStorage.setItem('aida_user_public_id', 'admin_head');
                  localStorage.setItem('aida_auth_user_id', 'admin_head');
                  localStorage.setItem('aida_user_id', 'admin_head');
                  localStorage.setItem('aida_full_name', 'Руководитель центра');
                  document.cookie = 'aida_active_role=admin; path=/; max-age=2592000; SameSite=Lax';
                  document.cookie = 'aida_auth_user_id=admin_head; path=/; max-age=2592000; SameSite=Lax';
                  document.cookie = 'aida_user_id=admin_head; path=/; max-age=2592000; SameSite=Lax';
                  window.dispatchEvent(new Event('aida-user-updated'));
                } catch (_) {}
                setIsAuthorized(true);
                fetchAllData();
              }}
              className="w-full bg-coralAccent hover:bg-coralAccent-hover text-white py-2.5 rounded-full text-xs font-black shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              Войти как Руководитель центра (admin_head)
            </button>
            <Link
              href="/login?redirect=/admin"
              className="text-xs font-bold text-[#8A95A8] hover:text-[#161F38] py-1 transition-colors"
            >
              Войти через стандартную форму входа →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Aggregate stats
  const totalBalanceLessons = students.reduce((acc, s) => acc + (s.balance_lessons || 0), 0);

  return (
    <div className="space-y-6 sm:space-y-8 select-none">
      {/* 1. Admin Header & Realtime Supabase Status */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-[#F2DECE] shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
        <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-[#FF6B4A] to-[#FFA259] text-white flex items-center justify-center shrink-0 shadow-md shadow-orange-500/20">
            <Shield className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-2xl font-black text-[#161F38] tracking-tight">
                Управление центром «АйДаУмничка»
              </h1>
              <span className="text-[10px] bg-[#EAF7CF] text-[#5C8519] border border-[#CCE8A2] font-black px-2.5 py-0.5 rounded-full">
                Supabase Live ✓
              </span>
            </div>
            <p className="text-xs text-[#6B758E] mt-0.5 truncate">
              г. Тольятти • База данных преподавателей, учеников, связок и онлайн-занятий
            </p>
          </div>
        </div>

        {/* Global Action & Live Refresh */}
        <div className="flex items-center gap-2 self-stretch lg:self-auto justify-end flex-wrap">
          <button
            type="button"
            onClick={() => setIsHomeworkModalOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs font-black bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-full shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <BookOpen className="w-4 h-4" />
            <span>+ Добавить ДЗ</span>
          </button>
          <button
            type="button"
            onClick={() => setIsScheduleModalOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs font-black bg-coralAccent hover:bg-coralAccent-hover text-white px-4 py-2.5 rounded-full shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Назначить урок</span>
          </button>
          <button
            type="button"
            onClick={fetchAllData}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#FFF8F1] hover:bg-[#FFF2E6] text-[#161F38] border border-[#F2DECE] px-3.5 py-2.5 rounded-full transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
            title="Обновить данные из базы Supabase"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-coralAccent' : 'text-[#8A95A8]'}`} />
            <span className="hidden sm:inline">Обновить</span>
          </button>
        </div>
      </div>

      {/* Toast feedback notification */}
      {toastMsg && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-black flex items-center justify-between gap-3 shadow-md animate-in fade-in duration-200 border ${
            toastMsg.type === 'success'
              ? 'bg-[#EAF7CF] text-[#5C8519] border-[#CCE8A2]'
              : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {toastMsg.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            <span className="truncate">{toastMsg.text}</span>
          </div>
          <button type="button" onClick={() => setToastMsg(null)} className="text-xs opacity-60 hover:opacity-100 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* 2. Top Metric KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* KPI: Lessons */}
        <div
          onClick={() => setActiveTab('lessons')}
          className={`p-4 sm:p-5 rounded-3xl border transition-all cursor-pointer ${
            activeTab === 'lessons'
              ? 'bg-white border-coralAccent shadow-md shadow-orange-500/10 ring-2 ring-coralAccent/20'
              : 'bg-white border-[#F2DECE] hover:border-[#E2CBB7] shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-[#8A95A8] mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider">Уроки в центре</span>
            <Calendar className="w-4 h-4 text-coralAccent" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-[#161F38]">{lessons.length}</span>
            {activeLessonsNow.length > 0 && (
              <span className="text-[10px] font-black text-[#5C8519] bg-[#EAF7CF] px-2 py-0.5 rounded-full flex items-center gap-1 border border-[#CCE8A2] animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-[#5C8519]" />
                {activeLessonsNow.length} сейчас
              </span>
            )}
          </div>
          <span className="text-[11px] text-[#8A95A8] mt-1 block">
            {lessons.filter((l) => l.status === 'pending').length} запланировано
          </span>
        </div>

        {/* KPI: Teachers */}
        <div
          onClick={() => setActiveTab('teachers')}
          className={`p-4 sm:p-5 rounded-3xl border transition-all cursor-pointer ${
            activeTab === 'teachers'
              ? 'bg-white border-coralAccent shadow-md shadow-orange-500/10 ring-2 ring-coralAccent/20'
              : 'bg-white border-[#F2DECE] hover:border-[#E2CBB7] shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-[#8A95A8] mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider">Преподаватели</span>
            <GraduationCap className="w-4 h-4 text-coralAccent" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-[#161F38]">{teachers.length}</p>
          <span className="text-[11px] text-[#8A95A8] mt-1 block">
            {teachers.map((t) => cleanPersonName(t.full_name).split(' ')[0]).join(', ') || 'Юлия, Василина'}
          </span>
        </div>

        {/* KPI: Students */}
        <div
          onClick={() => setActiveTab('students')}
          className={`p-4 sm:p-5 rounded-3xl border transition-all cursor-pointer ${
            activeTab === 'students'
              ? 'bg-white border-coralAccent shadow-md shadow-orange-500/10 ring-2 ring-coralAccent/20'
              : 'bg-white border-[#F2DECE] hover:border-[#E2CBB7] shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-[#8A95A8] mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider">Ученики</span>
            <Users className="w-4 h-4 text-[#5C8519]" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-[#161F38]">{students.length}</p>
          <span className="text-[11px] text-[#8A95A8] mt-1 block">
            {students.filter((s) => (s.balance_lessons || 0) > 0).length} с активным абонементом
          </span>
        </div>

        {/* KPI: Total Balance Pool */}
        <div
          onClick={() => setActiveTab('students')}
          className={`p-4 sm:p-5 rounded-3xl border transition-all cursor-pointer ${
            activeTab === 'students'
              ? 'bg-white border-coralAccent shadow-md shadow-orange-500/10 ring-2 ring-coralAccent/20'
              : 'bg-white border-[#F2DECE] hover:border-[#E2CBB7] shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-[#8A95A8] mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider">Оплачено уроков</span>
            <Coins className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-coralAccent">{totalBalanceLessons}</span>
            <span className="text-xs font-bold text-[#6B758E]">занятий</span>
          </div>
          <span className="text-[11px] text-[#8A95A8] mt-1 block">
            Суммарно на балансах учеников
          </span>
        </div>

        {/* KPI: Homework */}
        <div
          onClick={() => setActiveTab('homework')}
          className={`p-4 sm:p-5 rounded-3xl border transition-all cursor-pointer ${
            activeTab === 'homework'
              ? 'bg-white border-coralAccent shadow-md shadow-orange-500/10 ring-2 ring-coralAccent/20'
              : 'bg-white border-[#F2DECE] hover:border-[#E2CBB7] shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-[#8A95A8] mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider">Домашка</span>
            <BookOpen className="w-4 h-4 text-purple-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-[#161F38]">{homeworkList.length}</span>
            {homeworkList.filter((h) => h.status === 'submitted').length > 0 && (
              <span className="text-[10px] font-black text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full flex items-center gap-1 border border-blue-200 animate-pulse">
                {homeworkList.filter((h) => h.status === 'submitted').length} на проверке
              </span>
            )}
          </div>
          <span className="text-[11px] text-[#8A95A8] mt-1 block">
            {homeworkList.filter((h) => h.status === 'assigned' || h.status === 'in_progress').length} в процессе решения
          </span>
        </div>
      </div>

      {/* 3. Navigation Tabs Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3 border-b border-[#F2DECE] pb-3">
        <div className="flex items-center gap-1.5 bg-[#FFF2E6] p-1 rounded-2xl border border-[#FCDDC7] overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setActiveTab('lessons')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'lessons'
                ? 'bg-white text-[#161F38] shadow-xs'
                : 'text-[#6B758E] hover:text-[#161F38]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-coralAccent" />
            <span>Уроки и Занятия</span>
            <span className="bg-[#FFF2E6] text-coralAccent text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-0.5">
              {lessons.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('teachers')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'teachers'
                ? 'bg-white text-[#161F38] shadow-xs'
                : 'text-[#6B758E] hover:text-[#161F38]'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5 text-coralAccent" />
            <span>Преподаватели</span>
            <span className="bg-[#FFF2E6] text-coralAccent text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-0.5">
              {teachers.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('students')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'students'
                ? 'bg-white text-[#161F38] shadow-xs'
                : 'text-[#6B758E] hover:text-[#161F38]'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-[#5C8519]" />
            <span>Ученики и Балансы</span>
            <span className="bg-[#EAF7CF] text-[#5C8519] text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-0.5">
              {students.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('homework')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'homework'
                ? 'bg-white text-[#161F38] shadow-xs'
                : 'text-[#6B758E] hover:text-[#161F38]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-purple-600" />
            <span>Домашка</span>
            <span className="bg-purple-100 text-purple-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-0.5">
              {homeworkList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bindings')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'bindings'
                ? 'bg-white text-[#161F38] shadow-xs'
                : 'text-[#6B758E] hover:text-[#161F38]'
            }`}
          >
            <Link2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Связки (Педагог ↔ Ученик)</span>
            <span className="bg-blue-50 text-blue-700 text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-0.5">
              {bindings.length}
            </span>
          </button>
        </div>

        {/* Global Search Bar */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-[#8A95A8] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по имени, ID, теме..."
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#F2DECE] rounded-xl text-xs font-bold text-[#161F38] outline-none focus:border-coralAccent transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#8A95A8] hover:text-[#161F38]"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 4. Tab 1: LESSONS (Кто, кому и когда была информация) */}
      {activeTab === 'lessons' && (
        <div className="space-y-4">
          {/* Status Subfilters */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1 overflow-x-auto max-w-full">
              {[
                { id: 'all', label: `Все (${lessons.length})` },
                { id: 'active', label: `Идут сейчас (${lessons.filter((l) => l.status === 'active').length})` },
                { id: 'pending', label: `Запланированы (${lessons.filter((l) => l.status === 'pending').length})` },
                { id: 'completed', label: `Завершены (${lessons.filter((l) => l.status === 'completed').length})` },
                { id: 'cancelled', label: `Отменены (${lessons.filter((l) => l.status === 'cancelled').length})` },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setLessonStatusFilter(f.id as any)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    lessonStatusFilter === f.id
                      ? 'bg-[#161F38] text-white shadow-2xs'
                      : 'bg-white hover:bg-[#FFF8F1] text-[#6B758E] border border-[#F2DECE]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-[#8A95A8] font-bold">
                Показано: {filteredLessons.length} уроков
              </span>
              {filteredLessons.length > 0 && (
                <button
                  type="button"
                  onClick={handleDeleteAllLessons}
                  disabled={isRefreshing}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1 rounded-full transition-colors cursor-pointer border border-rose-200"
                  title="Удалить все отфильтрованные уроки из базы данных"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Очистить ({filteredLessons.length})</span>
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-[#F2DECE] space-y-3">
              <RefreshCw className="w-6 h-6 text-coralAccent animate-spin mx-auto" />
              <p className="text-xs font-bold text-[#6B758E]">Загрузка уроков из Supabase...</p>
            </div>
          ) : filteredLessons.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-[#F2DECE] space-y-3">
              <Calendar className="w-8 h-8 text-coralAccent opacity-40 mx-auto" />
              <h3 className="font-black text-sm text-[#161F38]">Уроков не найдено</h3>
              <p className="text-xs text-[#6B758E] max-w-sm mx-auto">
                {searchQuery
                  ? 'По вашему запросу ничего не найдено. Попробуйте изменить параметры поиска.'
                  : 'В центре пока нет онлайн-занятий в этой категории. Нажмите кнопку «Назначить урок» выше, чтобы создать урок.'}
              </p>
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs font-black bg-coralAccent hover:bg-coralAccent-hover text-white px-4 py-2 rounded-full shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Назначить первый онлайн-урок</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLessons.map((lesson) => {
                const isLive = lesson.status === 'active';
                const isPending = lesson.status === 'pending';
                const isCompleted = lesson.status === 'completed';
                const isCancelled = lesson.status === 'cancelled';

                return (
                  <div
                    key={lesson.id}
                    className={`bg-white rounded-3xl p-4 sm:p-5 border transition-all shadow-xs hover:shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                      isLive ? 'border-emerald-400 ring-2 ring-emerald-400/20 bg-emerald-50/20' : 'border-[#F2DECE]'
                    }`}
                  >
                    {/* Lesson Core: Topic, Teacher, Student, Schedule */}
                    <div className="space-y-2.5 min-w-0 flex-1">
                      {/* Topic & Status Badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-black text-sm sm:text-base text-[#161F38] tracking-tight">
                          {cleanTopicTitle(lesson.topic)}
                        </h4>
                        <span className="text-[10px] font-mono font-bold bg-[#FFF7EE] border border-[#F2DECE] text-[#8A95A8] px-2 py-0.5 rounded-full">
                          {lesson.room_token}
                        </span>
                        {isLive && (
                          <span className="text-[10px] font-black bg-[#EAF7CF] text-[#5C8519] border border-[#CCE8A2] px-2.5 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#5C8519]" />
                            Идёт сейчас
                          </span>
                        )}
                        {isPending && (
                          <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full">
                            Запланирован
                          </span>
                        )}
                        {isCompleted && (
                          <span className="text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-200 px-2.5 py-0.5 rounded-full">
                            Завершён ✓
                          </span>
                        )}
                        {isCancelled && (
                          <span className="text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-0.5 rounded-full">
                            Отменён
                          </span>
                        )}
                      </div>

                      {/* Participant flow: FROM WHOM → TO WHOM */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {/* Teacher (ОТ КОГО) */}
                        <div className="p-2.5 bg-[#FFFDFB] rounded-2xl border border-[#F4E3D2] flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-[#FFF2E6] text-coralAccent border border-[#FCDDC7] flex items-center justify-center font-black text-xs shrink-0">
                            {cleanPersonName(lesson.teacher_name)[0] || 'П'}
                          </div>
                          <div className="min-w-0">
                            <span className="text-[10px] font-bold text-[#8A95A8] block uppercase tracking-wider">
                              Преподаватель (От кого)
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-[#161F38] truncate">
                                {cleanPersonName(lesson.teacher_name)}
                              </span>
                              {lesson.teacher_id && (
                                <Link
                                  href={`/teacher?id=${encodeURIComponent(lesson.teacher_id)}`}
                                  target="_blank"
                                  className="text-[10px] text-coralAccent hover:underline font-mono"
                                  title="Открыть кабинет преподавателя"
                                >
                                  {lesson.teacher_id} ↗
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Student (КОМУ) */}
                        <div className="p-2.5 bg-[#FDFEFC] rounded-2xl border border-[#E5EED8] flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-[#EAF7CF] text-[#5C8519] border border-[#CCE8A2] flex items-center justify-center font-black text-xs shrink-0">
                            {cleanPersonName(lesson.student_name)[0] || 'У'}
                          </div>
                          <div className="min-w-0">
                            <span className="text-[10px] font-bold text-[#8A95A8] block uppercase tracking-wider">
                              Ученик (Кому)
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-[#161F38] truncate">
                                {cleanPersonName(lesson.student_name)}
                              </span>
                              {lesson.student_public_id && (
                                <Link
                                  href={`/${encodeURIComponent(lesson.student_public_id)}`}
                                  target="_blank"
                                  className="text-[10px] text-[#5C8519] hover:underline font-mono"
                                  title="Открыть кабинет ученика"
                                >
                                  {lesson.student_public_id} ↗
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Schedule info & Duration */}
                      <div className="flex items-center gap-3 text-[11px] text-[#6B758E] flex-wrap">
                        <span className="flex items-center gap-1 font-bold text-[#161F38]">
                          <Clock className="w-3.5 h-3.5 text-coralAccent" />
                          {formatDate(lesson.scheduled_for)}
                        </span>
                        {lesson.duration_minutes > 0 && (
                          <span>• {lesson.duration_minutes} мин.</span>
                        )}
                        {lesson.created_at && (
                          <span className="text-[#8A95A8]">
                            • Создан: {new Date(lesson.created_at).toLocaleDateString('ru-RU')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div className="flex items-center gap-2 self-start lg:self-center shrink-0 flex-wrap">
                      {/* Enter Room as Admin */}
                      <Link
                        href={`/room/${lesson.room_token}?role=admin&topic=${encodeURIComponent(cleanTopicTitle(lesson.topic))}`}
                        target="_blank"
                        className="inline-flex items-center gap-1.5 text-xs font-black bg-coralAccent hover:bg-coralAccent-hover text-white px-3.5 py-2 rounded-xl transition-all active:scale-95 shadow-2xs cursor-pointer"
                        title="Войти в онлайн-комнату урока как администратор"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>Войти в урок</span>
                      </Link>

                      {/* Quick Status Modifiers */}
                      {isLive ? (
                        <button
                          type="button"
                          onClick={() => handleUpdateLessonStatus(lesson.id, 'completed')}
                          className="text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-2 rounded-xl transition-colors cursor-pointer"
                          title="Завершить занятие"
                        >
                          Завершить
                        </button>
                      ) : isPending ? (
                        <button
                          type="button"
                          onClick={() => handleUpdateLessonStatus(lesson.id, 'cancelled')}
                          className="text-xs font-bold text-rose-600 hover:bg-rose-50 px-2.5 py-2 rounded-xl transition-colors cursor-pointer"
                          title="Отменить запланированный урок"
                        >
                          Отменить
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleUpdateLessonStatus(lesson.id, 'pending')}
                          className="text-xs font-bold text-[#8A95A8] hover:text-[#161F38] px-2.5 py-2 rounded-xl transition-colors cursor-pointer"
                          title="Вернуть в запланированные"
                        >
                          В план
                        </button>
                      )}

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleDeleteLesson(lesson.id, lesson.topic)}
                        className="text-[#8A95A8] hover:text-rose-600 hover:bg-rose-50 p-2 rounded-xl transition-colors cursor-pointer"
                        title="Удалить запись об уроке"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. Tab 2: TEACHERS */}
      {activeTab === 'teachers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-black text-[#161F38]">
              Преподаватели центра ({filteredTeachers.length})
            </h3>
            <span className="text-xs text-[#8A95A8]">
              Кабинеты с префиксом /teacher
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTeachers.map((teacher) => {
              // Count lessons given by this teacher
              const tLessons = lessons.filter(
                (l) =>
                  cleanPersonName(l.teacher_name).toLowerCase().includes(cleanPersonName(teacher.full_name).toLowerCase()) ||
                  l.teacher_id === teacher.public_id
              );
              // Bound students
              const tBindings = bindings.filter((b) => b.teacher_public_id === teacher.public_id);

              return (
                <div
                  key={teacher.public_id}
                  className="bg-white rounded-3xl p-5 border border-[#F2DECE] shadow-xs space-y-4 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-[#FFF2E6] text-coralAccent border border-[#FCDDC7] flex items-center justify-center font-black text-lg shrink-0 shadow-2xs">
                        {cleanPersonName(teacher.full_name)[0] || 'П'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-black text-base text-[#161F38] truncate">
                            {cleanPersonName(teacher.full_name)}
                          </h4>
                          <span className="text-[10px] font-mono bg-[#FFF2E6] text-coralAccent border border-[#FCDDC7] px-2 py-0.2 rounded-full font-bold">
                            {teacher.public_id}
                          </span>
                        </div>
                        <p className="text-xs text-[#6B758E] truncate">
                          {teacher.email || 'email@aidaumnichka.ru'}
                        </p>
                      </div>
                    </div>

                    <Link
                      href={`/teacher?id=${encodeURIComponent(teacher.public_id)}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 text-xs font-black bg-[#FFF8F1] hover:bg-[#FFF2E6] text-[#161F38] border border-[#F2DECE] px-3 py-1.5 rounded-xl transition-all active:scale-95 cursor-pointer shadow-2xs shrink-0"
                      title="Перейти в личный кабинет педагога"
                    >
                      <span>Кабинет</span>
                      <ExternalLink className="w-3 h-3 text-[#8A95A8]" />
                    </Link>
                  </div>

                  {/* Teacher Stats */}
                  <div className="grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="p-2.5 bg-[#FFFDFB] rounded-2xl border border-[#F4E3D2]">
                      <span className="text-[10px] text-[#8A95A8] font-bold block uppercase tracking-wider">
                        Уроков в системе
                      </span>
                      <span className="text-base font-black text-[#161F38] mt-0.5 block">
                        {tLessons.length}
                      </span>
                    </div>
                    <div className="p-2.5 bg-[#FDFEFC] rounded-2xl border border-[#E5EED8]">
                      <span className="text-[10px] text-[#8A95A8] font-bold block uppercase tracking-wider">
                        Закреплено учеников
                      </span>
                      <span className="text-base font-black text-[#5C8519] mt-0.5 block">
                        {tBindings.length}
                      </span>
                    </div>
                  </div>

                  {/* Bound students list */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-black text-[#161F38] block">
                      Прикреплённые ученики:
                    </span>
                    {tBindings.length === 0 ? (
                      <p className="text-xs text-[#8A95A8] italic">
                        Пока нет прикреплённых учеников.
                      </p>
                    ) : (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {tBindings.map((b) => (
                          <span
                            key={b.id}
                            className="inline-flex items-center gap-1 text-xs bg-[#EAF7CF] text-[#5C8519] border border-[#CCE8A2] px-2.5 py-0.5 rounded-full font-bold"
                          >
                            <span>{cleanPersonName(b.student_name || b.student_public_id)}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveBinding(b.id, b.student_name)}
                              className="text-xs hover:text-rose-600 ml-0.5 cursor-pointer"
                              title="Открепить"
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Quick Action: Assign lesson for this teacher */}
                  <div className="pt-2 border-t border-[#F8EDE1] flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setScheduleTeacherId(teacher.public_id);
                        setIsScheduleModalOpen(true);
                      }}
                      className="text-xs font-black text-coralAccent hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Назначить урок от этого педагога</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBindTeacherId(teacher.public_id);
                        setIsBindModalOpen(true);
                      }}
                      className="text-xs font-bold text-[#8A95A8] hover:text-[#161F38] flex items-center gap-1 cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Прикрепить ученика</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. Tab 3: STUDENTS & BALANCES */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-black text-[#161F38]">
              Зарегистрированные ученики ({filteredStudents.length})
            </h3>
            <span className="text-xs text-[#8A95A8]">
              Управление абонементами и балансом занятий
            </span>
          </div>

          <div className="space-y-3">
            {filteredStudents.map((student) => {
              // Lessons for this student
              const sLessons = lessons.filter(
                (l) =>
                  l.student_public_id === student.public_id ||
                  cleanPersonName(l.student_name).toLowerCase() === cleanPersonName(student.full_name).toLowerCase()
              );
              // Bound teachers
              const sTeachers = bindings.filter((b) => b.student_public_id === student.public_id);

              return (
                <div
                  key={student.public_id}
                  className="bg-white rounded-3xl p-4 sm:p-5 border border-[#F2DECE] shadow-xs space-y-3 hover:shadow-sm transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Student Info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-2xl bg-[#EAF7CF] text-[#5C8519] border border-[#CCE8A2] flex items-center justify-center font-black text-base shrink-0 shadow-2xs">
                        {cleanPersonName(student.full_name)[0] || 'У'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-black text-sm sm:text-base text-[#161F38] truncate">
                            {cleanPersonName(student.full_name)}
                          </h4>
                          <span className="text-[10px] font-mono bg-[#FFF2E6] text-coralAccent border border-[#FCDDC7] px-2 py-0.2 rounded-full font-bold">
                            /{student.public_id}
                          </span>
                          <span className="text-[10px] bg-[#EAF7CF] text-[#5C8519] border border-[#CCE8A2] px-2 py-0.2 rounded-full font-bold">
                            Ученик
                          </span>
                        </div>
                        <p className="text-xs text-[#6B758E] truncate">
                          {student.email || student.phone || 'Личный кабинет центра'} • Занятий пройдено: {sLessons.length}
                        </p>
                      </div>
                    </div>

                    {/* Balance pill & Cabinet link */}
                    <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] text-[#8A95A8] font-bold block uppercase tracking-wider">
                          Баланс занятий
                        </span>
                        <span className="text-lg font-black text-coralAccent">
                          {student.balance_lessons || 0} зан.
                        </span>
                      </div>
                      <Link
                        href={`/${encodeURIComponent(student.public_id)}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-xs font-black bg-[#FFF8F1] hover:bg-[#FFF2E6] text-[#161F38] border border-[#F2DECE] px-3.5 py-2 rounded-xl transition-all active:scale-95 cursor-pointer shadow-2xs"
                        title="Открыть кабинет этого ученика"
                      >
                        <span>Кабинет</span>
                        <ExternalLink className="w-3 h-3 text-[#8A95A8]" />
                      </Link>
                    </div>
                  </div>

                  {/* Bound Teachers & Quick Balance Adjust Buttons */}
                  <div className="pt-2 border-t border-[#F8EDE1] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-bold text-[#8A95A8]">Закреплён за:</span>
                      {sTeachers.length === 0 ? (
                        <span className="text-[11px] text-[#8A95A8] italic">Ни за кем не закреплён</span>
                      ) : (
                        sTeachers.map((st) => (
                          <span
                            key={st.id}
                            className="bg-[#FFF8F1] border border-[#F2DECE] text-[#161F38] text-[11px] px-2 py-0.5 rounded-full font-bold"
                          >
                            {st.teacher_public_id}
                          </span>
                        ))
                      )}
                    </div>

                    {/* Quick Adjust Buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] text-[#8A95A8] font-bold mr-1">Пополнить:</span>
                      <button
                        type="button"
                        onClick={() => handleAdjustBalance(student.public_id, 1)}
                        className="text-xs font-black bg-[#FFF8F1] hover:bg-[#FFF2E6] text-coralAccent border border-[#F2DECE] px-2.5 py-1 rounded-lg transition-all active:scale-95 cursor-pointer"
                        title="Добавить +1 урок"
                      >
                        +1
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAdjustBalance(student.public_id, 4)}
                        className="text-xs font-black bg-[#FFF8F1] hover:bg-[#FFF2E6] text-coralAccent border border-[#F2DECE] px-2.5 py-1 rounded-lg transition-all active:scale-95 cursor-pointer"
                        title="Добавить +4 урока"
                      >
                        +4
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAdjustBalance(student.public_id, 8)}
                        className="text-xs font-black bg-[#FFF2E6] hover:bg-[#FFE3CC] text-coralAccent border border-[#FCDDC7] px-2.5 py-1 rounded-lg transition-all active:scale-95 cursor-pointer shadow-2xs"
                        title="Добавить +8 уроков (стандартный абонемент)"
                      >
                        +8 зан.
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAdjustBalance(student.public_id, 16)}
                        className="text-xs font-black bg-[#EAF7CF] hover:bg-[#DDF3B8] text-[#5C8519] border border-[#CCE8A2] px-2.5 py-1 rounded-lg transition-all active:scale-95 cursor-pointer shadow-2xs"
                        title="Добавить +16 уроков"
                      >
                        +16
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAdjustBalance(student.public_id, -1)}
                        disabled={(student.balance_lessons || 0) <= 0}
                        className="text-xs font-bold text-rose-600 hover:bg-rose-50 px-2 py-1 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                        title="Списать 1 урок"
                      >
                        -1
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStudentForBalance(student);
                          setIsBalanceModalOpen(true);
                        }}
                        className="text-xs font-bold text-[#8A95A8] hover:text-[#161F38] ml-1 underline cursor-pointer"
                      >
                        Своё число
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 7. Tab: HOMEWORK (Домашка: добавление, просмотр решений, отметка проверено, удаление) */}
      {activeTab === 'homework' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1 overflow-x-auto max-w-full">
              {[
                { id: 'all', label: `Все (${homeworkList.length})` },
                {
                  id: 'assigned',
                  label: `Ожидают решения (${
                    homeworkList.filter((h) => h.status === 'assigned' || h.status === 'in_progress').length
                  })`,
                },
                {
                  id: 'submitted',
                  label: `Сдано учениками (${homeworkList.filter((h) => h.status === 'submitted').length})`,
                },
                {
                  id: 'completed',
                  label: `Проверено (${homeworkList.filter((h) => h.status === 'completed').length})`,
                },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setHomeworkStatusFilter(f.id as any)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    homeworkStatusFilter === f.id
                      ? 'bg-[#161F38] text-white shadow-2xs'
                      : 'bg-white hover:bg-[#FFF8F1] text-[#6B758E] border border-[#F2DECE]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setIsHomeworkModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-black bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-full shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Добавить ДЗ</span>
            </button>
          </div>

          {filteredHomework.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-[#F2DECE] space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center mx-auto shadow-2xs">
                <BookOpen className="w-7 h-7" />
              </div>
              <h3 className="text-base font-black text-[#161F38]">Домашние задания не найдены</h3>
              <p className="text-xs text-[#6B758E] max-w-sm mx-auto">
                {searchQuery
                  ? 'По вашему поисковому запросу ничего не найдено.'
                  : 'В системе пока нет домашних заданий в выбранном статусе.'}
              </p>
              <button
                type="button"
                onClick={() => setIsHomeworkModalOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs font-black bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-full shadow-xs active:scale-95 cursor-pointer mt-2"
              >
                <Plus className="w-4 h-4" />
                <span>Выдать первое задание</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredHomework.map((hw) => {
                const isSubmitted = hw.status === 'submitted';
                const isCompleted = hw.status === 'completed';

                return (
                  <div
                    key={hw.id}
                    className="bg-white rounded-3xl p-5 border border-[#F2DECE] shadow-xs space-y-3.5 flex flex-col justify-between hover:border-[#E2CBB7] transition-all"
                  >
                    <div className="space-y-3">
                      {/* Top Header of Card */}
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span
                              className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                                isCompleted
                                  ? 'bg-[#EAF7CF] text-[#5C8519] border-[#CCE8A2]'
                                  : isSubmitted
                                  ? 'bg-blue-100 text-blue-700 border-blue-200 animate-pulse'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              {isCompleted
                                ? '✓ Проверено'
                                : isSubmitted
                                ? '★ Сдано учеником'
                                : '⏳ Ожидает решения'}
                            </span>
                            <span className="text-[11px] text-[#8A95A8] font-bold">
                              {formatDate(hw.created_at)}
                            </span>
                          </div>
                          <h4 className="text-sm font-black text-[#161F38] tracking-tight leading-snug">
                            {hw.title}
                          </h4>
                        </div>

                        {/* Action: Delete */}
                        <button
                          type="button"
                          disabled={isDeletingHwId === hw.id}
                          onClick={() => handleDeleteHomework(hw.id, hw.title)}
                          className="p-1.5 text-[#8A95A8] hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer shrink-0 disabled:opacity-40"
                          title="Удалить это домашнее задание"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Participant Meta (Кому -> От кого) */}
                      <div className="bg-[#FFFDFB] p-2.5 rounded-2xl border border-[#F8EDE1] flex items-center justify-between flex-wrap gap-2 text-xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[11px] font-bold text-[#8A95A8]">Кому:</span>
                          <span className="font-black text-[#161F38] truncate">
                            {cleanPersonName(hw.student_name || 'Всем ученикам')}
                          </span>
                          {hw.student_public_id && (
                            <Link
                              href={`/${encodeURIComponent(hw.student_public_id)}`}
                              target="_blank"
                              className="text-[10px] bg-[#EAF7CF] text-[#5C8519] font-black px-1.5 py-0.2 rounded hover:underline inline-flex items-center gap-0.5"
                              title="Кабинет ученика"
                            >
                              <span>{hw.student_public_id}</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </Link>
                          )}
                        </div>

                        <div className="flex items-center gap-1 text-[11px] text-[#6B758E]">
                          <span className="text-[#8A95A8]">Педагог:</span>
                          <span className="font-bold text-[#161F38]">
                            {cleanPersonName(hw.teacher_name || 'Преподаватель')}
                          </span>
                        </div>
                      </div>

                      {/* Description */}
                      <div className="text-xs text-[#161F38] font-bold bg-[#FFF8F1] p-3 rounded-2xl border border-[#FCDDC7]/50 whitespace-pre-wrap leading-relaxed">
                        {hw.task_description}
                      </div>

                      {/* Attached Task File */}
                      {hw.task_file_url && (
                        <div className="pt-0.5">
                          <a
                            href={hw.task_file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-coralAccent hover:text-coralAccent-hover bg-[#FFF2E6] hover:bg-[#FFE5D1] border border-[#FCDDC7] px-3 py-1.5 rounded-xl transition-colors"
                          >
                            <Paperclip className="w-3.5 h-3.5" />
                            <span className="truncate max-w-[220px]">
                              {hw.file_name || 'Материалы задания (файл)'}
                            </span>
                            <ExternalLink className="w-3 h-3 ml-0.5 opacity-60" />
                          </a>
                        </div>
                      )}

                      {/* Student Solution Box */}
                      {(isSubmitted || hw.student_solution_text || hw.student_solution_file_url) && (
                        <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-3.5 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-black uppercase tracking-wider text-blue-900 flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
                              Ответ ученика:
                            </span>
                            {hw.updated_at && (
                              <span className="text-[10px] text-blue-700 font-bold">
                                {formatDate(hw.updated_at)}
                              </span>
                            )}
                          </div>

                          {hw.student_solution_text && (
                            <p className="text-xs font-bold text-[#161F38] whitespace-pre-wrap bg-white/80 p-2.5 rounded-xl border border-blue-100">
                              {hw.student_solution_text}
                            </p>
                          )}

                          {hw.student_solution_file_url && (
                            <div className="space-y-1.5 pt-1">
                              {hw.student_solution_file_url.match(/\.(webm|ogg|wav|mp3|m4a)($|\?)/i) ? (
                                <div className="space-y-1">
                                  <span className="text-[10px] font-bold text-blue-800 flex items-center gap-1">
                                    <Volume2 className="w-3 h-3" />
                                    Аудиозапись ответа:
                                  </span>
                                  <audio
                                    controls
                                    src={hw.student_solution_file_url}
                                    className="w-full h-8 rounded-lg"
                                  />
                                </div>
                              ) : (
                                <a
                                  href={hw.student_solution_file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-800 hover:text-blue-950 bg-blue-100 hover:bg-blue-200 px-3 py-1.5 rounded-xl transition-colors"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>Файл решения ученика</span>
                                  <ExternalLink className="w-3 h-3 ml-0.5 opacity-60" />
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Footer Actions: Check status toggle & Delete */}
                    <div className="pt-3 border-t border-[#F8EDE1] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {isCompleted ? (
                          <button
                            type="button"
                            onClick={() => handleUpdateHomeworkStatus(hw.id, 'assigned')}
                            className="inline-flex items-center gap-1 text-xs font-bold text-[#6B758E] hover:text-[#161F38] bg-[#FFF8F1] hover:bg-[#FFF2E6] border border-[#F2DECE] px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                          >
                            <span>Вернуть в невыполненные</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleUpdateHomeworkStatus(hw.id, 'completed')}
                            className="inline-flex items-center gap-1.5 text-xs font-black text-white bg-[#5C8519] hover:bg-[#4d6f14] px-3.5 py-1.5 rounded-xl shadow-2xs active:scale-95 transition-all cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Отметить проверенным</span>
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteHomework(hw.id, hw.title)}
                        className="text-xs font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Удалить</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 8. Tab 5: BINDINGS MATRIX (Педагог ↔ Ученик) */}
      {activeTab === 'bindings' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-black text-[#161F38]">
                Связки учеников с преподавателями ({bindings.length})
              </h3>
              <p className="text-xs text-[#6B758E]">
                Определяет, какие ученики отображаются в кабинете конкретного педагога
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsBindModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-black bg-coralAccent hover:bg-coralAccent-hover text-white px-3.5 py-2 rounded-full shadow-xs active:scale-95 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Создать связку</span>
            </button>
          </div>

          {bindings.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-dashed border-[#F2DECE] space-y-2">
              <Link2 className="w-8 h-8 text-[#8A95A8] opacity-50 mx-auto" />
              <h4 className="font-bold text-sm text-[#161F38]">Нет созданных связок</h4>
              <p className="text-xs text-[#6B758E] max-w-sm mx-auto">
                Нажмите «Создать связку», чтобы закрепить ученика за выбранным педагогом.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-[#F2DECE] overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FFF8F1] text-[#8A95A8] font-bold border-b border-[#F2DECE]">
                    <tr>
                      <th className="py-3 px-4">Преподаватель</th>
                      <th className="py-3 px-4">Закреплённый ученик</th>
                      <th className="py-3 px-4">Примечание</th>
                      <th className="py-3 px-4">Дата создания</th>
                      <th className="py-3 px-4 text-right">Действие</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F8EDE1] text-[#161F38]">
                    {bindings.map((b) => {
                      const teacherObj = teachers.find((t) => t.public_id === b.teacher_public_id);
                      const studentObj = students.find((s) => s.public_id === b.student_public_id);

                      return (
                        <tr key={b.id} className="hover:bg-[#FFFAF5] transition-colors">
                          <td className="py-3 px-4 font-black">
                            <div className="flex items-center gap-2">
                              <span className="w-7 h-7 rounded-lg bg-[#FFF2E6] text-coralAccent border border-[#FCDDC7] flex items-center justify-center font-bold text-xs shrink-0">
                                {cleanPersonName(teacherObj?.full_name)[0] || 'П'}
                              </span>
                              <div>
                                <span className="block">{cleanPersonName(teacherObj?.full_name || b.teacher_public_id)}</span>
                                <span className="text-[10px] text-[#8A95A8] font-mono">{b.teacher_public_id}</span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4 font-black">
                            <div className="flex items-center gap-2">
                              <span className="w-7 h-7 rounded-lg bg-[#EAF7CF] text-[#5C8519] border border-[#CCE8A2] flex items-center justify-center font-bold text-xs shrink-0">
                                {cleanPersonName(studentObj?.full_name || b.student_name)[0] || 'У'}
                              </span>
                              <div>
                                <span className="block">{cleanPersonName(studentObj?.full_name || b.student_name)}</span>
                                <span className="text-[10px] text-[#5C8519] font-mono">{b.student_public_id}</span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4 text-[#6B758E]">
                            {b.notes || '—'}
                          </td>

                          <td className="py-3 px-4 text-[#8A95A8]">
                            {formatDate(b.created_at)}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveBinding(b.id, b.student_name)}
                              className="text-xs font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                              title="Открепить ученика"
                            >
                              Открепить ✕
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: SCHEDULE LESSON */}
      {isScheduleModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsScheduleModalOpen(false);
          }}
        >
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-[#F2DECE] shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#FFF2E6] text-coralAccent border border-[#FCDDC7] flex items-center justify-center shrink-0 shadow-2xs">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#161F38] tracking-tight">
                    Назначить онлайн-урок
                  </h3>
                  <p className="text-xs text-[#6B758E] mt-0.5">
                    Урок отобразится в кабинетах преподавателя и ученика
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#FFF8F1] hover:bg-[#FFF2E6] text-[#8A95A8] hover:text-[#161F38] border border-[#F2DECE] flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdminScheduleLesson} className="space-y-4">
              {/* Teacher selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-[#161F38]">
                  Преподаватель (От кого):
                </label>
                <select
                  value={scheduleTeacherId}
                  onChange={(e) => setScheduleTeacherId(e.target.value)}
                  required
                  className="w-full bg-[#FFFDFB] border border-[#EADBCC] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#161F38] focus:outline-none focus:border-coralAccent cursor-pointer"
                >
                  <option value="">Выберите преподавателя</option>
                  {teachers.map((t) => (
                    <option key={t.public_id} value={t.public_id}>
                      {cleanPersonName(t.full_name)} ({t.public_id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Student selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-[#161F38]">
                  Ученик (Кому):
                </label>
                <select
                  value={scheduleStudentId}
                  onChange={(e) => setScheduleStudentId(e.target.value)}
                  required
                  className="w-full bg-[#FFFDFB] border border-[#EADBCC] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#161F38] focus:outline-none focus:border-coralAccent cursor-pointer"
                >
                  <option value="">Выберите ученика</option>
                  {students.map((s) => (
                    <option key={s.public_id} value={s.public_id}>
                      {cleanPersonName(s.full_name)} ({s.public_id}) • баланс: {s.balance_lessons || 0} зан.
                    </option>
                  ))}
                </select>
              </div>

              {/* Topic */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-[#161F38]">
                  Тема занятия:
                </label>
                <input
                  type="text"
                  value={scheduleTopic}
                  onChange={(e) => setScheduleTopic(e.target.value)}
                  required
                  className="w-full bg-[#FFFDFB] border border-[#EADBCC] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#161F38] focus:outline-none focus:border-coralAccent"
                />
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {['Логопедия', 'Развитие речи', 'Подготовка к школе', 'Диагностика'].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setScheduleTopic(`Индивидуальное занятие: ${chip}`)}
                      className="text-[10px] font-bold bg-[#FFF8F1] hover:bg-[#FFEEDE] text-[#6B758E] hover:text-[#161F38] border border-[#F2DECE] px-2.5 py-0.5 rounded-full transition-colors cursor-pointer"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modern Date & Time Picker */}
              <DateTimePicker
                value={scheduleDateTime}
                onChange={setScheduleDateTime}
                label="Дата и время проведения:"
              />

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#F8EDE1]">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="text-xs font-bold text-[#8A95A8] hover:text-[#161F38] px-4 py-2 rounded-xl transition-colors cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isScheduling || !scheduleTeacherId || !scheduleStudentId || !scheduleDateTime}
                  className="text-xs font-black bg-coralAccent hover:bg-coralAccent-hover text-white px-5 py-2.5 rounded-full shadow-md active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
                >
                  {isScheduling ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Сохранение в Supabase...</span>
                    </>
                  ) : (
                    <>
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Запланировать урок</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CUSTOM BALANCE ADJUST */}
      {isBalanceModalOpen && selectedStudentForBalance && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsBalanceModalOpen(false);
          }}
        >
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full border border-[#F2DECE] shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0 shadow-2xs">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#161F38]">Баланс ученика</h3>
                  <p className="text-xs text-[#6B758E]">{cleanPersonName(selectedStudentForBalance.full_name)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBalanceModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#FFF8F1] hover:bg-[#FFF2E6] text-[#8A95A8] hover:text-[#161F38] border border-[#F2DECE] flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-[#FFF7EE] rounded-2xl border border-[#F2DECE] text-center">
              <span className="text-[11px] text-[#8A95A8] font-bold block">Текущий баланс</span>
              <span className="text-2xl font-black text-coralAccent">
                {selectedStudentForBalance.balance_lessons || 0} занятий
              </span>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-black text-[#161F38]">
                Количество занятий для изменения (+ или -):
              </label>
              <input
                type="number"
                value={customBalanceAmount}
                onChange={(e) => setCustomBalanceAmount(e.target.value)}
                placeholder="Например: 8 или -2"
                className="w-full bg-[#FFFDFB] border border-[#EADBCC] rounded-xl px-3.5 py-2.5 text-sm font-black text-[#161F38] focus:outline-none focus:border-coralAccent text-center"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F8EDE1]">
              <button
                type="button"
                onClick={() => setIsBalanceModalOpen(false)}
                className="text-xs font-bold text-[#8A95A8] hover:text-[#161F38] px-3 py-2 cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={isAdjustingBalance || !customBalanceAmount || isNaN(parseInt(customBalanceAmount, 10))}
                onClick={async () => {
                  const val = parseInt(customBalanceAmount, 10);
                  if (!isNaN(val)) {
                    await handleAdjustBalance(selectedStudentForBalance.public_id, val);
                    setIsBalanceModalOpen(false);
                    setCustomBalanceAmount('');
                  }
                }}
                className="text-xs font-black bg-coralAccent hover:bg-coralAccent-hover text-white px-4 py-2 rounded-full shadow-xs active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isAdjustingBalance ? 'Сохранение...' : 'Применить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: BIND STUDENT TO TEACHER */}
      {isBindModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsBindModalOpen(false);
          }}
        >
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border border-[#F2DECE] shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#EAF7CF] text-[#5C8519] border border-[#CCE8A2] flex items-center justify-center shrink-0 shadow-2xs">
                  <Link2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#161F38]">Прикрепить ученика</h3>
                  <p className="text-xs text-[#6B758E]">Закрепить ученика за педагогом в Supabase</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBindModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#FFF8F1] hover:bg-[#FFF2E6] text-[#8A95A8] hover:text-[#161F38] border border-[#F2DECE] flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBinding} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-[#161F38]">Преподаватель:</label>
                <select
                  value={bindTeacherId}
                  onChange={(e) => setBindTeacherId(e.target.value)}
                  required
                  className="w-full bg-[#FFFDFB] border border-[#EADBCC] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#161F38] focus:outline-none focus:border-coralAccent cursor-pointer"
                >
                  <option value="">Выберите преподавателя</option>
                  {teachers.map((t) => (
                    <option key={t.public_id} value={t.public_id}>
                      {cleanPersonName(t.full_name)} ({t.public_id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-black text-[#161F38]">Ученик:</label>
                <select
                  value={bindStudentId}
                  onChange={(e) => setBindStudentId(e.target.value)}
                  required
                  className="w-full bg-[#FFFDFB] border border-[#EADBCC] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#161F38] focus:outline-none focus:border-coralAccent cursor-pointer"
                >
                  <option value="">Выберите ученика</option>
                  {students.map((s) => (
                    <option key={s.public_id} value={s.public_id}>
                      {cleanPersonName(s.full_name)} ({s.public_id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#F8EDE1]">
                <button
                  type="button"
                  onClick={() => setIsBindModalOpen(false)}
                  className="text-xs font-bold text-[#8A95A8] hover:text-[#161F38] px-4 py-2 cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isBindingSubmitting || !bindTeacherId || !bindStudentId}
                  className="text-xs font-black bg-coralAccent hover:bg-coralAccent-hover text-white px-5 py-2.5 rounded-full shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isBindingSubmitting ? 'Сохранение...' : 'Закрепить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: ADD HOMEWORK */}
      {isHomeworkModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsHomeworkModalOpen(false);
          }}
        >
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-[#F2DECE] shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center shrink-0 shadow-2xs">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#161F38] tracking-tight">
                    Добавить домашнее задание
                  </h3>
                  <p className="text-xs text-[#6B758E] mt-0.5">
                    Задание отобразится в личном кабинете ученика
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsHomeworkModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#FFF8F1] hover:bg-[#FFF2E6] text-[#8A95A8] hover:text-[#161F38] border border-[#F2DECE] flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateHomework} className="space-y-4">
              {/* Student selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-[#161F38]">
                  Кому (Ученик):
                </label>
                <select
                  value={hwStudentId}
                  onChange={(e) => setHwStudentId(e.target.value)}
                  className="w-full bg-[#FFFDFB] border border-[#EADBCC] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#161F38] focus:outline-none focus:border-purple-600 cursor-pointer"
                >
                  <option value="">Всем ученикам (общее задание)</option>
                  {students.map((s) => (
                    <option key={s.public_id} value={s.public_id}>
                      {cleanPersonName(s.full_name)} ({s.public_id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Teacher selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-[#161F38]">
                  От кого (Преподаватель):
                </label>
                <select
                  value={hwTeacherName}
                  onChange={(e) => setHwTeacherName(e.target.value)}
                  className="w-full bg-[#FFFDFB] border border-[#EADBCC] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#161F38] focus:outline-none focus:border-purple-600 cursor-pointer"
                >
                  {teachers.map((t) => (
                    <option key={t.public_id} value={cleanPersonName(t.full_name)}>
                      {cleanPersonName(t.full_name)} ({t.public_id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Title & Quick Presets */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-[#161F38]">
                  Название задания (Тема):
                </label>
                <input
                  type="text"
                  value={hwTitle}
                  onChange={(e) => setHwTitle(e.target.value)}
                  required
                  placeholder="Например: Артикуляционная гимнастика"
                  className="w-full bg-[#FFFDFB] border border-[#EADBCC] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#161F38] focus:outline-none focus:border-purple-600"
                />
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {[
                    'Артикуляционная гимнастика',
                    'Звук [Р] в слогах и словах',
                    'Автоматизация звука [Л]',
                    'Дифференциация [С] - [Ш]',
                    'Развитие связной речи',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setHwTitle(preset)}
                      className="text-[10px] bg-[#FFF8F1] hover:bg-[#FFF2E6] text-[#6B758E] hover:text-[#161F38] border border-[#F2DECE] px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-[#161F38]">
                  Описание задания и упражнений:
                </label>
                <textarea
                  value={hwDescription}
                  onChange={(e) => setHwDescription(e.target.value)}
                  required
                  rows={4}
                  placeholder="Опишите, какие упражнения нужно сделать, сколько повторений, на что обратить внимание..."
                  className="w-full bg-[#FFFDFB] border border-[#EADBCC] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#161F38] focus:outline-none focus:border-purple-600 resize-none"
                />
              </div>

              {/* File attachment */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-[#161F38]">
                  Прикрепить файл / материалы (до 25 МБ, необязательно):
                </label>
                <input
                  type="file"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setHwFile(f);
                  }}
                  className="w-full text-xs text-[#6B758E] file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 cursor-pointer"
                />
                {hwFile && (
                  <p className="text-[11px] text-[#5C8519] font-bold flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Выбран файл: {hwFile.name} ({(hwFile.size / 1024 / 1024).toFixed(2)} МБ)
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#F8EDE1]">
                <button
                  type="button"
                  onClick={() => setIsHomeworkModalOpen(false)}
                  className="text-xs font-bold text-[#8A95A8] hover:text-[#161F38] px-4 py-2 cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isCreatingHw || !hwTitle.trim() || !hwDescription.trim()}
                  className="text-xs font-black bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-full shadow-md active:scale-95 cursor-pointer disabled:opacity-50 transition-all"
                >
                  {isCreatingHw ? 'Сохранение...' : 'Добавить задание'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
