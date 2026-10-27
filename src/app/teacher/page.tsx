'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import LessonsScheduleHistory from '@/components/LessonsScheduleHistory';
import {
  Video,
  UserCheck,
  Plus,
  BookOpen,
  Users,
  CheckCircle2,
  Sparkles,
  Shield,
  Trash2,
  GraduationCap,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Clock,
  RefreshCw,
  Mail,
  Paperclip,
  X,
  Search,
  Copy,
  Check,
  ExternalLink,
  Minus,
  Bell
} from 'lucide-react';
import { broadcastPlatformEvent } from '@/lib/platformNotifications';
import { showSystemNotification, playNotificationChime } from '@/components/NotificationManager';
import type { TeacherRecord } from '@/app/api/teachers/route';

interface SupabaseStudent {
  id: string;
  publicId: string;
  fullName: string;
  phone?: string;
  email?: string;
  balanceLessons?: number;
}

interface BoundStudentItem {
  id: string;
  publicId?: string;
  fullName: string;
  phone?: string;
  notes?: string;
  addedAt?: string;
  balanceLessons?: number;
}

interface TeacherHomeworkItem {
  id: string;
  title: string;
  task_description: string;
  student_public_id?: string;
  student_name?: string;
  teacher_name?: string;
  task_file_url?: string;
  file_name?: string;
  status: 'assigned' | 'submitted' | 'reviewed';
  student_solution_text?: string;
  student_solution_file_url?: string;
  created_at: string;
}

export default function TeacherDashboard() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [teacherName, setTeacherName] = useState<string>('Преподаватель');
  const [teacherPublicId, setTeacherPublicId] = useState<string>('id179017');
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
          body: 'Отлично! Теперь вы будете получать уведомления в шторку при сдаче ДЗ и новых сообщениях.',
          url: `/teacher?id=${teacherPublicId}`,
        });
      }
    } else {
      playNotificationChime();
      await showSystemNotification({
        title: '🔔 АйДаУмничка: Проверка шторки',
        body: 'Системные уведомления работают отлично! Уведомления от учеников придут сюда.',
        url: `/teacher?id=${teacherPublicId}`,
      });
    }
  };

  const copyCabinetLink = () => {
    if (typeof window !== 'undefined') {
      const fullUrl = `${window.location.origin}/teacher?id=${teacherPublicId}`;
      navigator.clipboard.writeText(fullUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // Supabase Students state
  const [supabaseStudents, setSupabaseStudents] = useState<SupabaseStudent[]>([]);
  const [loadingStudents, setLoadingStudents] = useState<boolean>(true);

  // Student balance map & loading state
  const [studentBalances, setStudentBalances] = useState<Record<string, number>>({});
  const [updatingBalanceStudentId, setUpdatingBalanceStudentId] = useState<string | null>(null);

  // Bound Students roster (saved in Supabase teacher_students)
  const [boundStudents, setBoundStudents] = useState<BoundStudentItem[]>([]);
  const [showAddStudentForm, setShowAddStudentForm] = useState(false);
  const [selectedStudentToAdd, setSelectedStudentToAdd] = useState('');
  const [customStudentName, setCustomStudentName] = useState('');
  const [customStudentNote, setCustomStudentNote] = useState('');
  const [isBindingStudent, setIsBindingStudent] = useState(false);
  const [studentsPage, setStudentsPage] = useState(1);
  const STUDENTS_PER_PAGE = 3;

  // Homework loaded for students and selected student accordion
  const [allHomework, setAllHomework] = useState<TeacherHomeworkItem[]>([]);
  const [loadingHomework, setLoadingHomework] = useState<boolean>(false);
  const [selectedStudentHwId, setSelectedStudentHwId] = useState<string | null>(null);
  const [activeHwStudentId, setActiveHwStudentId] = useState<string | null>(null);

  // Homework creation state
  const [hwStudentInput, setHwStudentInput] = useState('');
  const [hwStudentPublicId, setHwStudentPublicId] = useState('');
  const [hwTitle, setHwTitle] = useState('');
  const [hwDesc, setHwDesc] = useState('');
  const [hwDropdownOpen, setHwDropdownOpen] = useState(false);
  const [hwFile, setHwFile] = useState<{ name: string; url: string } | null>(null);
  const [isSubmittingHw, setIsSubmittingHw] = useState(false);
  const [hwSuccess, setHwSuccess] = useState(false);
  const hwPickerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Teachers directory
  const [supabaseTeachers, setSupabaseTeachers] = useState<TeacherRecord[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(true);

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

  // 1. Fetch available students from Supabase
  const fetchSupabaseStudents = async () => {
    try {
      setLoadingStudents(true);
      const res = await fetch('/api/students', { cache: 'no-store' });
      const data = await res.json();
      if (data?.students) {
        setSupabaseStudents(data.students);
        setStudentBalances((prev) => {
          const updated = { ...prev };
          data.students.forEach((s: any) => {
            if (s.publicId && typeof s.balanceLessons === 'number') {
              updated[s.publicId.toLowerCase()] = s.balanceLessons;
            }
          });
          return updated;
        });
      }
    } catch (err) {
      console.warn('Failed to load students:', err);
    } finally {
      setLoadingStudents(false);
    }
  };

  // 2. Fetch bound students from Supabase teacher_students
  const fetchBoundStudents = async (pubId: string) => {
    try {
      const res = await fetch(`/api/teacher/students?teacherPublicId=${encodeURIComponent(pubId)}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (data?.students && data.students.length > 0) {
        const mapped: BoundStudentItem[] = data.students.map((st: any) => ({
          id: st.id,
          publicId: st.student_public_id,
          fullName: st.student_name,
          notes: st.notes,
          balanceLessons: typeof st.balance_lessons === 'number' ? st.balance_lessons : 1,
          addedAt: st.created_at ? new Date(st.created_at).toLocaleDateString('ru-RU') : '',
        }));
        setBoundStudents(mapped);
        setStudentBalances((prev) => {
          const updated = { ...prev };
          data.students.forEach((st: any) => {
            if (st.student_public_id && typeof st.balance_lessons === 'number') {
              updated[st.student_public_id.toLowerCase()] = st.balance_lessons;
            }
          });
          return updated;
        });
      } else {
        // Fallback to local storage if DB is initially empty
        const saved = localStorage.getItem('aida_teacher_students_v1');
        if (saved) {
          setBoundStudents(JSON.parse(saved));
        }
      }
    } catch (err) {
      console.warn('Failed to load bound students:', err);
    }
  };

  // Helper to read current student balance
  const getStudentBalance = (st: BoundStudentItem): number => {
    const pubKey = (st.publicId || '').toLowerCase();
    if (pubKey && studentBalances[pubKey] !== undefined) {
      return studentBalances[pubKey];
    }
    const match = supabaseStudents.find(
      (s) => s.publicId && s.publicId.toLowerCase() === pubKey
    );
    if (match && typeof match.balanceLessons === 'number') {
      return match.balanceLessons;
    }
    return typeof st.balanceLessons === 'number' ? st.balanceLessons : 1;
  };

  // Adjust student lesson balance (+1 or -1)
  const handleAdjustBalance = async (st: BoundStudentItem, delta: number) => {
    const pubId = st.publicId || '';
    const studentIdentifier = pubId || st.id;
    if (!studentIdentifier) return;

    const currentBal = getStudentBalance(st);
    const nextBal = Math.max(0, currentBal + delta);
    if (nextBal === currentBal && delta < 0) return;

    const key = pubId.toLowerCase() || st.id;
    setUpdatingBalanceStudentId(key);

    // Optimistic UI update
    setStudentBalances((prev) => ({
      ...prev,
      [key]: nextBal,
      ...(pubId ? { [pubId.toLowerCase()]: nextBal } : {}),
    }));

    try {
      const res = await fetch('/api/students/balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentPublicId: pubId || st.id,
          newBalance: nextBal,
          isTeacherVerified: true,
          description: delta > 0 ? 'Преподаватель добавил урок' : 'Преподаватель списал урок',
        }),
      });
      const data = await res.json();
      if (data.success && typeof data.newBalance === 'number') {
        setStudentBalances((prev) => ({
          ...prev,
          [key]: data.newBalance,
          ...(pubId ? { [pubId.toLowerCase()]: data.newBalance } : {}),
        }));
      }
    } catch (err) {
      console.error('Failed to update student balance:', err);
      // Rollback on network failure
      setStudentBalances((prev) => ({
        ...prev,
        [key]: currentBal,
      }));
    } finally {
      setUpdatingBalanceStudentId(null);
    }
  };

  // 3. Fetch teachers
  const fetchTeachers = async () => {
    try {
      setLoadingTeachers(true);
      const res = await fetch('/api/teachers', { cache: 'no-store' });
      const data = await res.json();
      if (data?.teachers) {
        setSupabaseTeachers(data.teachers);
        const me = (data.teachers as TeacherRecord[]).find((t) => t.publicId === teacherPublicId);
        if (me?.cleanName) {
          setTeacherName(me.cleanName);
          try {
            localStorage.setItem('aida_full_name', me.cleanName);
            window.dispatchEvent(new Event('aida-user-updated'));
          } catch (_) {}
        }
      }
    } catch (err) {
      console.warn('Failed to load teachers:', err);
    } finally {
      setLoadingTeachers(false);
    }
  };

  // 4. Fetch all homework assignments
  const fetchAllHomework = async () => {
    try {
      setLoadingHomework(true);
      const res = await fetch('/api/homework', { cache: 'no-store' });
      const data = await res.json();
      if (data?.homework) {
        setAllHomework(data.homework);
      }
    } catch (err) {
      console.warn('Failed to load homework:', err);
    } finally {
      setLoadingHomework(false);
    }
  };

  // Helper to extract clean child name and public id
  const getCleanStudentInfo = (st: BoundStudentItem) => {
    const childMatch = (st.fullName || '').match(/ребёнок:\s*([^)]+)/i);
    const childName = childMatch
      ? childMatch[1].trim()
      : (st.fullName || '').replace(/\s*\(.*?\)$/, '').trim();
    return {
      displayName: childName || st.fullName,
      fullRaw: st.fullName,
      publicId: st.publicId || '',
    };
  };

  // Helper to match homework assigned to a specific student
  const getStudentHomeworkList = (st: BoundStudentItem) => {
    const info = getCleanStudentInfo(st);
    const stClean = info.displayName.toLowerCase();
    const stPubId = (st.publicId || '').toLowerCase();
    const stRaw = (st.fullName || '').toLowerCase();

    return allHomework.filter((hw) => {
      const hwPubId = (hw.student_public_id || '').toLowerCase();
      if (stPubId && hwPubId && hwPubId === stPubId) {
        return true;
      }
      const hwName = (hw.student_name || '').toLowerCase();
      if (
        hwName &&
        (hwName.includes(stClean) ||
          stClean.includes(hwName) ||
          hwName.includes(stRaw) ||
          stRaw.includes(hwName))
      ) {
        return true;
      }
      return false;
    });
  };

  useEffect(() => {
    const role =
      localStorage.getItem('aida_active_role') ||
      document.cookie.match(/(?:^|; )aida_active_role=([^;]*)/)?.[1];
    if (role !== 'teacher' && role !== 'admin') {
      setIsAuthorized(false);
      router.replace('/login?redirect=/teacher&error=forbidden');
      return;
    }
    setIsAuthorized(true);

    const savedName = localStorage.getItem('aida_full_name');
    if (savedName) setTeacherName(savedName);

    let urlId = '';
    if (typeof window !== 'undefined') {
      let raw = window.location.search || '';
      // Fix accidental double question mark like ?id=123?agentation=1
      if (raw.indexOf('?', 1) !== -1) {
        raw = '?' + raw.slice(1).replace(/\?/g, '&');
      }
      const sp = new URLSearchParams(raw);
      urlId = sp.get('id') || '';
    }

    const savedUserId =
      urlId ||
      localStorage.getItem('aida_auth_user_id') ||
      document.cookie.match(/(?:^|; )aida_auth_user_id=([^;]*)/)?.[1] ||
      'id179017';
    setTeacherPublicId(savedUserId);

    try {
      localStorage.setItem('aida_active_role', 'teacher');
      localStorage.setItem('aida_auth_user_id', savedUserId);
      localStorage.setItem('aida_user_id', savedUserId);
      document.cookie = `aida_active_role=teacher; path=/; max-age=2592000; SameSite=Lax`;
      document.cookie = `aida_auth_user_id=${savedUserId}; path=/; max-age=2592000; SameSite=Lax`;
      document.cookie = `aida_user_id=${savedUserId}; path=/; max-age=2592000; SameSite=Lax`;
      window.dispatchEvent(new Event('aida-user-updated'));
    } catch (_) {}

    // Keep personal ID in URL address bar while strictly preserving all other query parameters (e.g. agentation=1)
    if (typeof window !== 'undefined') {
      let raw = window.location.search || '';
      if (raw.indexOf('?', 1) !== -1) {
        raw = '?' + raw.slice(1).replace(/\?/g, '&');
      }
      const sp = new URLSearchParams(raw);
      if (!sp.get('id')) {
        sp.set('id', savedUserId);
      }
      const newQuery = sp.toString();
      const currentQuery = window.location.search.replace(/^\?/, '');
      if (newQuery && currentQuery !== newQuery) {
        window.history.replaceState(null, '', `/teacher?${newQuery}`);
      }
    }

    fetchSupabaseStudents();
    fetchBoundStudents(savedUserId);
    fetchTeachers();
    fetchAllHomework();
  }, [router]);

  // Dismiss dropdowns on outside tap/click (iOS style) and Escape key
  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (hwPickerRef.current && !hwPickerRef.current.contains(target)) {
        setHwDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setHwDropdownOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (isAuthorized === false) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 border border-red-200 text-center max-w-sm space-y-3">
          <Shield className="w-10 h-10 text-red-500 mx-auto" />
          <h2 className="text-lg font-black text-[#161F38]">Доступ ограничен</h2>
          <p className="text-xs text-[#6B758E]">
            Кабинет учителя доступен только зарегистрированным педагогам платформы. Перенаправляем на вход...
          </p>
        </div>
      </div>
    );
  }

  // Handle adding student to teacher's roster in Supabase
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBindingStudent(true);

    let nameToSave = customStudentName.trim();
    let publicIdToSave = '';

    if (selectedStudentToAdd) {
      const found = supabaseStudents.find((s) => s.publicId === selectedStudentToAdd);
      if (found) {
        nameToSave = found.fullName;
        publicIdToSave = found.publicId;
      }
    }

    if (!nameToSave) {
      setIsBindingStudent(false);
      return;
    }

    // Prevent adding the same child more than once
    const isAlreadyBound = boundStudents.some((b) => {
      if (publicIdToSave && b.publicId && b.publicId.toLowerCase() === publicIdToSave.toLowerCase()) return true;
      const bNorm = (b.fullName || '').replace(/\s*\(.*?\)$/, '').trim().toLowerCase();
      const nNorm = nameToSave.replace(/\s*\(.*?\)$/, '').trim().toLowerCase();
      return bNorm && bNorm === nNorm;
    });

    if (isAlreadyBound) {
      alert('Этот ребёнок уже добавлен в список закреплённых учеников!');
      setIsBindingStudent(false);
      return;
    }

    try {
      const res = await fetch('/api/teacher/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacher_public_id: teacherPublicId,
          student_public_id: publicIdToSave || null,
          student_name: nameToSave,
          notes: customStudentNote.trim() || 'Индивидуальное сопровождение',
        }),
      });

      const data = await res.json();
      if (data?.success && data?.student) {
        const newEntry: BoundStudentItem = {
          id: data.student.id,
          publicId: data.student.student_public_id,
          fullName: data.student.student_name,
          notes: data.student.notes,
          addedAt: new Date().toLocaleDateString('ru-RU'),
        };
        const updated = [newEntry, ...boundStudents];
        setBoundStudents(updated);
        try {
          localStorage.setItem('aida_teacher_students_v1', JSON.stringify(updated));
        } catch (_) {}
      }
    } catch (err) {
      console.warn('Error binding student:', err);
    } finally {
      setIsBindingStudent(false);
      setSelectedStudentToAdd('');
      setCustomStudentName('');
      setCustomStudentNote('');
      setShowAddStudentForm(false);
    }
  };

  // Remove student from roster
  const handleRemoveStudent = async (id: string, publicId?: string) => {
    try {
      await fetch(`/api/teacher/students?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.warn('Error unbinding student:', err);
    }

    const updated = boundStudents.filter((s) => s.id !== id);
    setBoundStudents(updated);
    try {
      localStorage.setItem('aida_teacher_students_v1', JSON.stringify(updated));
    } catch (_) {}
  };

  // Handle file attachment for homework
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Размер файла не должен превышать 5 МБ');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setHwFile({
        name: file.name,
        url: dataUrl,
      });
    };
    reader.readAsDataURL(file);
  };

  const removeFileAttachment = () => {
    setHwFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Submit homework to Supabase
  const assignHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hwTitle.trim() || !hwDesc.trim()) return;

    try {
      setIsSubmittingHw(true);

      const res = await fetch('/api/homework', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: hwTitle,
          task_description: hwDesc,
          student_public_id: hwStudentPublicId || null,
          student_name: hwStudentInput || 'Всем закрепленным ученикам',
          teacher_name: teacherName,
          task_file_url: hwFile?.url || null,
          file_name: hwFile?.name || null,
        }),
      });

      if (res.ok) {
        const resData = await res.json().catch(() => ({}));
        const createdHw = resData?.homework;

        broadcastPlatformEvent('homework-assigned', {
          id: createdHw?.id || `hw-${Date.now()}`,
          title: hwTitle.trim(),
          task_description: hwDesc.trim(),
          student_public_id: hwStudentPublicId || null,
          student_name: hwStudentInput || 'Всем закрепленным ученикам',
          teacher_name: teacherName,
          task_file_url: hwFile?.url || null,
          file_name: hwFile?.name || null,
          creator_id: teacherPublicId || '',
        });

        setHwSuccess(true);
        fetchAllHomework();
        setTimeout(() => {
          setHwTitle('');
          setHwDesc('');
          setHwFile(null);
          setHwStudentInput('');
          setHwStudentPublicId('');
          setHwSuccess(false);
          setActiveHwStudentId(null);
        }, 2000);
      } else {
        const data = await res.json();
        alert(data.error || 'Ошибка при сохранении задания');
      }
    } catch (err) {
      console.warn('Error assigning homework:', err);
    } finally {
      setIsSubmittingHw(false);
    }
  };

  // Filtered lists for comboboxes
  const filteredHwStudents = supabaseStudents.filter(
    (s) =>
      s.fullName.toLowerCase().includes(hwStudentInput.toLowerCase()) ||
      s.publicId.toLowerCase().includes(hwStudentInput.toLowerCase())
  );

  // Clean teacher display name (strips metadata suffixes like "(ребёнок: ...)")
  const cleanTeacherDisplayName = teacherName.replace(/\s*\(.*?\)$/, '').trim();

  // Filter colleagues and administration (excluding current logged-in teacher to avoid displaying self)
  const colleagueTeachers = supabaseTeachers.filter((t) => {
    if (teacherPublicId && (t.publicId === teacherPublicId || t.id === teacherPublicId)) {
      return false;
    }
    const currentNameNorm = cleanTeacherDisplayName.toLowerCase();
    const tCleanNorm = (t.cleanName || '').trim().toLowerCase();
    const tFullNorm = (t.fullName || '').replace(/\s*\(.*?\)$/, '').trim().toLowerCase();
    if (currentNameNorm && (tCleanNorm === currentNameNorm || tFullNorm === currentNameNorm)) {
      return false;
    }
    return true;
  });

  const totalStudentPages = Math.max(1, Math.ceil(boundStudents.length / STUDENTS_PER_PAGE));
  const currentStudentPage = Math.min(studentsPage, totalStudentPages);
  const paginatedStudents = boundStudents.slice(
    (currentStudentPage - 1) * STUDENTS_PER_PAGE,
    currentStudentPage * STUDENTS_PER_PAGE
  );

  // Bound students formatted for lesson scheduling dropdown (strictly only students assigned to this teacher)
  const boundStudentOptions = useMemo(() => {
    const seen = new Set<string>();
    return boundStudents
      .map((st) => {
        const info = getCleanStudentInfo(st);
        return {
          publicId: info.publicId || st.publicId || '',
          fullName: info.displayName || st.fullName,
          phone: st.phone,
        };
      })
      .filter((st) => {
        const key = st.publicId || st.fullName;
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [boundStudents]);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Teacher Profile Header — Distinct Warm Hero Card */}
      <div className="bg-gradient-to-r from-white via-[#FFFBF7] to-[#FFF4EA] rounded-3xl p-4 sm:p-5 border border-[#F0DCCD] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#FF6B4A] to-[#FFA259] text-white flex items-center justify-center font-black text-xl shrink-0 shadow-sm shadow-orange-500/20">
            {cleanTeacherDisplayName[0] || teacherName[0] || 'П'}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-black text-[#161F38] tracking-tight">{cleanTeacherDisplayName || teacherName}</h1>
              <span className="text-[10px] bg-[#EAF7CF] text-[#5C8519] border border-[#CCE8A2] font-black px-2.5 py-0.5 rounded-full shadow-2xs">
                Педагог центра
              </span>
              <span className="text-[10px] bg-[#FFF0E2] text-coralAccent border border-[#FCDDC7] font-extrabold px-2.5 py-0.5 rounded-full shadow-2xs">
                ★ ID: {teacherPublicId}
              </span>

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
                    : 'Нажмите, чтобы включить уведомления в шторку телефона'
                }
              >
                <Bell className="w-3 h-3" />
                <span>{notifState === 'granted' ? 'Шторка: Вкл' : 'Включить в шторку'}</span>
              </button>
            </div>
            <p className="text-[11px] text-[#6B758E] mt-0.5">
              Детский развивающий центр «АйДаУмничка», г. Тольятти • Онлайн-кабинет занятий
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5 w-full sm:w-auto sm:flex sm:items-center sm:justify-end">
          <div className="bg-white/90 backdrop-blur-xs border border-[#ECD9C8] px-3.5 py-2 rounded-2xl text-center flex flex-col items-center justify-center min-h-[56px] shadow-2xs">
            <span className="text-[9px] text-[#8A95A8] font-extrabold uppercase tracking-wider block">Учеников</span>
            <p className="text-sm font-black text-[#161F38] mt-0.5">{boundStudents.length}</p>
          </div>
          <div className="bg-white/90 backdrop-blur-xs border border-[#ECD9C8] px-3.5 py-2 rounded-2xl text-center flex flex-col items-center justify-center min-h-[56px] shadow-2xs">
            <span className="text-[9px] text-[#8A95A8] font-extrabold uppercase tracking-wider block">Коллег</span>
            <p className="text-sm font-black text-[#5C8519] mt-0.5">{colleagueTeachers.length}</p>
          </div>
          <div className="bg-white/90 backdrop-blur-xs border border-[#ECD9C8] px-3.5 py-2 rounded-2xl text-center flex flex-col items-center justify-center min-h-[56px] shadow-2xs">
            <span className="text-[9px] text-[#8A95A8] font-extrabold uppercase tracking-wider block">Статус</span>
            <span className="text-xs font-black text-[#5C8519] flex items-center justify-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-[#5C8519] animate-pulse" />
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
              <span className="font-extrabold">Урок сейчас идёт:</span>{' '}
              <span className="text-[#5C8519] font-bold">{activeLessonRoom.topic}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/room/${activeLessonRoom.roomId}?role=teacher&topic=${encodeURIComponent(activeLessonRoom.topic)}`}
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
              className="text-[#8A95A8] hover:text-[#161F38] text-xs px-1.5 cursor-pointer"
              title="Скрыть напоминание"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 2-Column Dashboard Grid: Left (Schedule & Lessons) | Right (Assigned Students & Homework) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-stretch">
        {/* Left Column: Schedule & Lesson History */}
        <div className="w-full h-full flex flex-col">
          <LessonsScheduleHistory
            role="teacher"
            teacherName={cleanTeacherDisplayName || teacherName || 'Преподаватель'}
            onStartLesson={(token, topic) => {
              router.push(`/room/${token}?role=teacher&topic=${encodeURIComponent(topic)}`);
            }}
            availableStudents={boundStudentOptions}
          />
        </div>

        {/* Right Column: Assigned Students with Homework */}
        <div className="w-full h-full flex flex-col">
          {/* Assigned Students List — Emerald Growth Accent */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border-t-4 border-t-[#5C8519] border-x border-b border-[#D8E6C3] shadow-xs space-y-3.5 hover:shadow-sm transition-shadow h-full flex flex-col justify-between">
            <div className="space-y-3 flex-1 flex flex-col">
              <div className="shrink-0 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#EAF7CF] text-[#5C8519] border border-[#CCE8A2] flex items-center justify-center shrink-0 shadow-2xs">
                    <Users className="w-4 h-4" />
                  </div>
                  <h3 className="font-black text-sm sm:text-base text-[#161F38]">Закрепленные ученики</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddStudentForm(!showAddStudentForm)}
                    className="inline-flex items-center gap-1 text-[11px] font-black bg-[#5C8519] hover:bg-[#4E7214] text-white px-3 py-1.5 rounded-full transition-colors duration-140 cursor-pointer active:scale-95 shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{showAddStudentForm ? 'Скрыть форму' : 'Добавить ученика'}</span>
                  </button>
                </div>
              </div>

              {/* Form to Add Student */}
              {showAddStudentForm && (
                <form onSubmit={handleAddStudent} className="shrink-0 p-3 bg-[#FFF8F1] border border-[#F2DECE] rounded-xl space-y-2 animate-in fade-in">
                <div className="text-[11px] font-black text-[#161F38]">Привязать ученика к кабинету:</div>

                {supabaseStudents.length > 0 && (
                  <div>
                    <label className="block text-[10px] font-bold text-[#6B758E] mb-1">
                      Выбрать из зарегистрированных учеников:
                    </label>
                    <select
                      value={selectedStudentToAdd}
                      onChange={(e) => {
                        setSelectedStudentToAdd(e.target.value);
                        if (e.target.value) {
                          setCustomStudentName('');
                        }
                      }}
                      className="w-full bg-white border border-[#EADBCC] rounded-lg px-2.5 py-1.5 text-xs text-[#161F38] focus:outline-none focus:border-coralAccent"
                    >
                      <option value="">-- Выберите ученика из базы --</option>
                      {supabaseStudents
                        .filter((st) => {
                          return !boundStudents.some(
                            (b) =>
                              (b.publicId && b.publicId.toLowerCase() === st.publicId.toLowerCase()) ||
                              (b.fullName && b.fullName.trim().toLowerCase() === st.fullName.trim().toLowerCase())
                          );
                        })
                        .map((st) => (
                          <option key={st.publicId} value={st.publicId}>
                            {st.fullName} ({st.publicId}) {st.phone ? `• ${st.phone}` : ''}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-[#6B758E] mb-0.5">
                      Или введите ФИО:
                    </label>
                    <input
                      type="text"
                      disabled={Boolean(selectedStudentToAdd)}
                      value={customStudentName}
                      onChange={(e) => setCustomStudentName(e.target.value)}
                      placeholder="ФИО ученика"
                      className="w-full bg-white border border-[#EADBCC] rounded-lg px-2.5 py-1.5 text-xs text-[#161F38] focus:outline-none focus:border-coralAccent disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#6B758E] mb-0.5">
                      Направление / примечание:
                    </label>
                    <input
                      type="text"
                      value={customStudentNote}
                      onChange={(e) => setCustomStudentNote(e.target.value)}
                      placeholder="Логопедия, запуск речи..."
                      className="w-full bg-white border border-[#EADBCC] rounded-lg px-2.5 py-1.5 text-xs text-[#161F38] focus:outline-none focus:border-coralAccent"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddStudentForm(false)}
                    className="text-xs font-bold text-[#8A95A8] hover:text-[#161F38] px-3 py-1 rounded-lg"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={isBindingStudent}
                    className="text-xs font-black bg-coralAccent hover:bg-coralAccent-hover text-white px-4 py-1.5 rounded-full shadow-2xs active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    {isBindingStudent ? 'Сохранение...' : 'Закрепить ученика'}
                  </button>
                </div>
              </form>
            )}

            {/* Students List Container with Interactive Homework Accordion & Pagination */}
            <div className="space-y-3">
              {boundStudents.length === 0 ? (
                <div className="p-5 rounded-xl border border-dashed border-[#F2DECE] bg-[#FFFAF5] text-center space-y-1.5">
                  <Users className="w-6 h-6 text-coralAccent mx-auto opacity-50" />
                  <h4 className="font-bold text-xs text-[#161F38]">Пока нет закрепленных учеников</h4>
                  <p className="text-[11px] text-[#6B758E] max-w-xs mx-auto">
                    Нажмите «Добавить ученика», чтобы привязать ученика к вашему кабинету.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="space-y-2 pr-1">
                    {paginatedStudents.map((st) => {
                      const info = getCleanStudentInfo(st);
                      const stHwList = getStudentHomeworkList(st);

                      return (
                        <div
                          key={st.id}
                          className="p-3 bg-[#FDFEFC] hover:bg-white rounded-2xl border border-[#E5EED8] hover:border-[#5C8519]/60 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all"
                        >
                          {/* Student Info (with mobile delete button) */}
                          <div className="flex items-center justify-between gap-2 min-w-0">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#5C8519] to-[#8BC34A] text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
                                {info.displayName[0] || 'У'}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs font-black text-[#161F38] truncate">
                                    {info.displayName}
                                  </span>
                                  {info.publicId && (
                                    <span className="text-[10px] text-[#6B758E] font-medium shrink-0">
                                      (ID: {info.publicId})
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-[#6B758E] truncate">
                                  {st.notes || 'Индивидуальное сопровождение'} {st.phone ? `• ${st.phone}` : ''}
                                </div>
                              </div>
                            </div>

                            {/* Delete button (Mobile only - top right) */}
                            <button
                              type="button"
                              onClick={() => handleRemoveStudent(st.id, st.publicId)}
                              title="Удалить ученика из списка"
                              className="sm:hidden text-[#8A95A8] hover:text-red-500 p-1.5 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Action Controls: Balance badge + "Перейти к ДЗ" + Desktop delete */}
                          <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t border-[#E5EED8]/60 sm:border-t-0 shrink-0">
                            {/* Student Lesson Balance & Quick Adjust (+/-) - Teacher Only */}
                            <div
                              className="inline-flex items-center gap-1 bg-[#F5F8F1] border border-[#D5E5B8] rounded-full px-2 py-1 text-xs shadow-2xs"
                              title="Баланс занятий ученика из Supabase (нажмите + или - для изменения)"
                            >
                              <span className="text-[10px] font-bold text-[#5C8519] uppercase tracking-wider">
                                Баланс:
                              </span>
                              <span className="font-black text-xs text-[#161F38] min-w-[14px] text-center">
                                {getStudentBalance(st)}
                              </span>
                              <span className="text-[10px] text-[#6B758E] font-medium mr-0.5">зан.</span>

                              {/* Minus 1 lesson */}
                              <button
                                type="button"
                                disabled={
                                  updatingBalanceStudentId === (st.publicId?.toLowerCase() || st.id) ||
                                  getStudentBalance(st) <= 0
                                }
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleAdjustBalance(st, -1);
                                }}
                                className="w-5 h-5 rounded-full bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center transition-all active:scale-90 cursor-pointer disabled:opacity-30 disabled:pointer-events-none hover:shadow-xs"
                                title="Списать 1 урок"
                              >
                                <Minus className="w-3 h-3 stroke-[3]" />
                              </button>

                              {/* Plus 1 lesson */}
                              <button
                                type="button"
                                disabled={updatingBalanceStudentId === (st.publicId?.toLowerCase() || st.id)}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleAdjustBalance(st, 1);
                                }}
                                className="w-5 h-5 rounded-full bg-[#5C8519] hover:bg-[#4d6f14] text-white flex items-center justify-center transition-all active:scale-90 cursor-pointer disabled:opacity-40 hover:shadow-xs"
                                title="Добавить 1 урок"
                              >
                                <Plus className="w-3 h-3 stroke-[3]" />
                              </button>
                            </div>

                            <div className="flex items-center gap-2">
                              {/* "Перейти к ДЗ" Button opening dedicated page in new tab */}
                              <Link
                                href={`/teacher/homework?studentId=${encodeURIComponent(info.publicId || '')}&studentName=${encodeURIComponent(info.displayName)}&teacherId=${encodeURIComponent(teacherPublicId || '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs font-black bg-[#EEF2FF] hover:bg-[#E0E7FF] text-[#4F46E5] border border-[#DCDAF7] px-3 py-1.5 rounded-full transition-all active:scale-95 shadow-2xs cursor-pointer"
                                title="Открыть домашние задания этого ученика в новой вкладке"
                              >
                                <BookOpen className="w-3.5 h-3.5" />
                                <span>Перейти к ДЗ</span>
                                {stHwList.length > 0 && (
                                  <span className="bg-[#4F46E5] text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-0.5">
                                    {stHwList.length}
                                  </span>
                                )}
                                <ExternalLink className="w-3 h-3 text-[#4F46E5]/70" />
                              </Link>

                              {/* Delete button (Desktop only) */}
                              <button
                                type="button"
                                onClick={() => handleRemoveStudent(st.id, st.publicId)}
                                title="Удалить ученика из списка"
                                className="hidden sm:inline-flex text-[#8A95A8] hover:text-red-500 p-1.5 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
              </div>

              {/* Students pagination controls */}
              {totalStudentPages > 1 && (
                <div className="pt-2 flex items-center justify-between text-xs shrink-0 select-none border-t border-[#E5EED8]">
                  <button
                    type="button"
                    disabled={currentStudentPage <= 1}
                    onClick={() => setStudentsPage((p) => Math.max(1, p - 1))}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#D8E6C3] bg-white text-[#161F38] hover:bg-[#F7FAEF] disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-bold text-[11px] cursor-pointer shadow-2xs"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Назад</span>
                  </button>
                  <div className="flex items-center gap-1 font-bold text-[11px] text-[#6B758E]">
                    <span>Стр. {currentStudentPage} из {totalStudentPages}</span>
                  </div>
                  <button
                    type="button"
                    disabled={currentStudentPage >= totalStudentPages}
                    onClick={() => setStudentsPage((p) => Math.min(totalStudentPages, p + 1))}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#D8E6C3] bg-white text-[#161F38] hover:bg-[#F7FAEF] disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-bold text-[11px] cursor-pointer shadow-2xs"
                  >
                    <span>Вперёд</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
          </div>
        </div>

        <div className="shrink-0 pt-2 border-t border-[#F8EDE1] flex items-center justify-between text-[11px] text-[#6B758E]">
          <span>Всего в списке: <strong className="text-[#161F38]">{boundStudents.length}</strong></span>
          <span className="text-[10px] text-[#8A95A8]">Данные сохраняются в кабинете</span>
        </div>
      </div>
    </div>
  </div>

    {/* Row 3: Real Teachers & Pedagogical Faculty — Golden Amber Accent (Full Width) */}
    <div className="w-full bg-white rounded-3xl p-4 sm:p-5 border-t-4 border-t-amber-500 border-x border-b border-[#FCDDC7] shadow-xs space-y-3.5 hover:shadow-sm transition-shadow">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0 shadow-2xs">
              <GraduationCap className="w-4 h-4" />
            </div>
            <h3 className="font-black text-sm sm:text-base text-[#161F38]">
              Коллеги и руководство центра
            </h3>
          </div>
          <p className="text-[11px] text-[#6B758E] mt-0.5">
            Педагогический состав и администрация детского центра «АйДаУмничка»
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={fetchTeachers}
            disabled={loadingTeachers}
            title="Обновить список коллег"
            className="p-1 text-[#8A95A8] hover:text-[#161F38] transition-colors rounded-lg active:scale-95 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingTeachers ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Teachers Grid: Aligned evenly with items-stretch and equal height cards */}
      {loadingTeachers && colleagueTeachers.length === 0 ? (
        <div className="p-6 text-center text-xs font-bold text-[#6B758E] flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-coralAccent" />
          <span>Загрузка преподавателей...</span>
        </div>
      ) : colleagueTeachers.length === 0 ? (
        <div className="p-6 rounded-xl border border-dashed border-[#F2DECE] bg-[#FFFAF5] text-center space-y-1">
          <Users className="w-6 h-6 text-coralAccent mx-auto opacity-50" />
          <h4 className="font-bold text-xs text-[#161F38]">Другие коллеги пока не подключены</h4>
          <p className="text-[11px] text-[#6B758E]">
            Вы вошли в кабинет преподавателя. Когда ваши коллеги или методисты зарегистрируются, они появятся в этом блоке.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-stretch">
            {colleagueTeachers.map((teacher) => (
              <div
                key={teacher.id}
                className="p-3.5 rounded-xl border border-[#F2DECE] bg-[#FFFDFB] hover:bg-white hover:border-coralAccent/50 transition-[border-color,background-color,box-shadow] duration-140 ease-out-emil flex flex-col justify-between space-y-2.5 shadow-2xs h-full"
              >
                <div>
                  <div className="flex items-start gap-2.5">
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-xl bg-[#FFF2E6] text-coralAccent border border-[#FCDDC7] flex items-center justify-center font-black text-sm shadow-2xs">
                        {teacher.avatarLetter}
                      </div>
                      <span
                        className={`w-2.5 h-2.5 rounded-full absolute -bottom-0.5 -right-0.5 border-2 border-white ${
                          teacher.status === 'online' ? 'bg-[#5C8519]' : 'bg-[#8A95A8]'
                        }`}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-1">
                        <h4 className="text-xs font-black text-[#161F38] truncate">{teacher.cleanName}</h4>
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-full shrink-0 bg-[#EAF7CF] text-[#5C8519]">
                          {teacher.role === 'admin' ? 'Админ' : 'Педагог'}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#6B758E] mt-0.5 leading-snug line-clamp-2">
                        {teacher.specialization}
                      </p>
                    </div>
                  </div>

                  {teacher.email && (
                    <div className="mt-2 text-[10px] text-[#8A95A8] flex items-center gap-1 truncate">
                      <Mail className="w-3 h-3 text-[#8A95A8] shrink-0" />
                      <span className="truncate">{teacher.email}</span>
                    </div>
                  )}
                </div>

                {/* Status footer */}
                <div className="pt-2 border-t border-[#F8EDE1] flex items-center justify-between text-[10px]">
                  <span className="text-[#6B758E] flex items-center gap-1 font-medium">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        teacher.status === 'online' ? 'bg-[#5C8519]' : 'bg-[#8A95A8]'
                      }`}
                    />
                    {teacher.statusText}
                  </span>

                  <a
                    href={`/messenger?id=${teacherPublicId}&chatWith=${teacher.publicId}`}
                    className="font-bold text-coralAccent hover:text-coralAccent-hover flex items-center gap-0.5 cursor-pointer active:scale-95"
                  >
                    <span>Чат</span>
                    <ChevronRight className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
