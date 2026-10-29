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
  Bell,
  UserPlus,
  Inbox,
  Phone
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
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

interface TrialLeadRecord {
  id: string;
  publicId: string;
  fullName: string;
  parentName: string;
  childName: string;
  phone: string;
  email?: string | null;
  selectedSubject: string;
  status: 'new' | 'contacted' | 'registered' | 'cancelled';
  notes: string;
  assignedTeacherId?: string | null;
  source: string;
  createdAt: string;
  updatedAt?: string;
}

export default function TeacherDashboard() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [teacherName, setTeacherName] = useState<string>('Преподаватель');
  const [teacherPublicId, setTeacherPublicId] = useState<string>('');
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
  const [addStudentTab, setAddStudentTab] = useState<'registered' | 'manual'>('registered');
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

  // Trial Leads state (заявки с сайта на пробные занятия)
  const [leads, setLeads] = useState<TrialLeadRecord[]>([]);
  const [loadingLeads, setLoadingLeads] = useState<boolean>(false);
  const [leadStatusFilter, setLeadStatusFilter] = useState<'all' | 'new' | 'contacted' | 'registered'>('all');
  const [leadSearchQuery, setLeadSearchQuery] = useState('');
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [selectedLeadForConvert, setSelectedLeadForConvert] = useState<TrialLeadRecord | null>(null);
  const [convertLogin, setConvertLogin] = useState('');
  const [convertPassword, setConvertPassword] = useState('');
  const [convertInitialBalance, setConvertInitialBalance] = useState<number>(1);
  const [copiedCreds, setCopiedCreds] = useState(false);
  const [isConvertingLead, setIsConvertingLead] = useState(false);
  const [convertSuccessData, setConvertSuccessData] = useState<{
    studentPublicId: string;
    studentName: string;
    login?: string;
    password?: string;
  } | null>(null);
  const [editingLeadNoteId, setEditingLeadNoteId] = useState<string | null>(null);
  const [leadNoteInput, setLeadNoteInput] = useState('');
  const [copiedPhoneLeadId, setCopiedPhoneLeadId] = useState<string | null>(null);

  // Teachers directory
  const [supabaseTeachers, setSupabaseTeachers] = useState<TeacherRecord[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(true);





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
          addedAt: st.created_at ? new Date(st.created_at).toLocaleDateString('ru-RU', { timeZone: 'Europe/Samara' }) : '',
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

  // Fetch teacher's personal binding directly from Supabase
  const fetchTeacherIdentity = async (targetId: string) => {
    if (!targetId) return;
    try {
      const res = await fetch(`/api/user/bind?publicId=${encodeURIComponent(targetId)}`, { cache: 'no-store' });
      const data = await res.json();
      if (data?.binding?.full_name) {
        const raw = data.binding.full_name;
        const clean = raw.replace(/\s*\(.*?\)$/, '').trim() || raw;
        setTeacherName(clean);
        try {
          localStorage.setItem('aida_full_name', clean);
          window.dispatchEvent(new Event('aida-user-updated'));
        } catch (_) {}
      }
    } catch (err) {
      console.warn('Failed to load teacher identity:', err);
    }
  };

  // 3. Fetch teachers
  const fetchTeachers = async (targetId?: string) => {
    try {
      setLoadingTeachers(true);
      const res = await fetch('/api/teachers', { cache: 'no-store' });
      const data = await res.json();
      if (data?.teachers) {
        setSupabaseTeachers(data.teachers);
        const checkId = (targetId || teacherPublicId || '').toLowerCase();
        if (checkId) {
          const me = (data.teachers as TeacherRecord[]).find(
            (t) => (t.publicId || '').toLowerCase() === checkId
          );
          if (me?.cleanName) {
            setTeacherName(me.cleanName);
            try {
              localStorage.setItem('aida_full_name', me.cleanName);
              window.dispatchEvent(new Event('aida-user-updated'));
            } catch (_) {}
          }
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

  // Fetch trial leads from website
  const fetchLeadsData = async () => {
    try {
      setLoadingLeads(true);
      const res = await fetch('/api/trial-request');
      if (!res.ok) throw new Error('Ошибка загрузки заявок');
      const data = await res.json();
      if (data.leads) {
        setLeads(data.leads);
      }
    } catch (err) {
      console.warn('Failed to load trial leads:', err);
    } finally {
      setLoadingLeads(false);
    }
  };

  // Filtered trial leads for teacher
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      if (leadStatusFilter !== 'all' && l.status !== leadStatusFilter) return false;
      if (!leadSearchQuery.trim()) return true;
      const q = leadSearchQuery.toLowerCase();
      return (
        (l.parentName && l.parentName.toLowerCase().includes(q)) ||
        (l.childName && l.childName.toLowerCase().includes(q)) ||
        (l.phone && l.phone.toLowerCase().includes(q)) ||
        (l.selectedSubject && l.selectedSubject.toLowerCase().includes(q)) ||
        (l.notes && l.notes.toLowerCase().includes(q))
      );
    });
  }, [leads, leadStatusFilter, leadSearchQuery]);

  const handleUpdateLeadStatus = async (leadId: string, nextStatus: 'new' | 'contacted' | 'registered' | 'cancelled') => {
    // If teacher selected 'registered', open the registration modal so login & password can be created (with a skip button)
    if (nextStatus === 'registered') {
      const targetLead = leads.find((l) => l.id === leadId);
      if (targetLead) {
        handleOpenConvertModal(targetLead);
        return;
      }
    }

    try {
      const res = await fetch('/api/trial-request', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: leadId, status: nextStatus }),
      });
      if (!res.ok) throw new Error('Не удалось обновить статус заявки');

      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, status: nextStatus } : l))
      );
    } catch (err) {
      console.warn('Failed to update lead status:', err);
    }
  };

  const handleSaveLeadNote = async (leadId: string) => {
    try {
      const res = await fetch('/api/trial-request', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: leadId, notes: leadNoteInput }),
      });
      if (!res.ok) throw new Error('Не удалось сохранить комментарий');

      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, notes: leadNoteInput } : l))
      );
      setEditingLeadNoteId(null);
      setLeadNoteInput('');
    } catch (err) {
      console.warn('Failed to save lead note:', err);
    }
  };

  const handleDeleteLead = async (leadId: string, parentName: string) => {
    if (!window.confirm(`Вы уверены, что хотите удалить заявку от ${parentName}?`)) return;
    try {
      const res = await fetch(`/api/trial-request?id=${leadId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Не удалось удалить заявку');

      setLeads((prev) => prev.filter((l) => l.id !== leadId));
    } catch (err) {
      console.warn('Failed to delete lead:', err);
    }
  };

  const handleCopyPhone = (leadId: string, phone: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(phone);
      setCopiedPhoneLeadId(leadId);
      setTimeout(() => setCopiedPhoneLeadId(null), 2500);
    }
  };

  const handleOpenConvertModal = (lead: TrialLeadRecord) => {
    setSelectedLeadForConvert(lead);
    setConvertInitialBalance(1);
    setConvertLogin(lead.phone || '');
    setConvertPassword(Math.floor(100000 + Math.random() * 900000).toString());
    setConvertSuccessData(null);
    setCopiedCreds(false);
    setIsConvertModalOpen(true);
  };

  const handleConfirmConvertToStudent = async (skipCredentials = false) => {
    if (!selectedLeadForConvert) return;
    try {
      setIsConvertingLead(true);
      const res = await fetch('/api/trial-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'convert_to_student',
          leadId: selectedLeadForConvert.id,
          assignedTeacherId: teacherPublicId, // Bind directly to this teacher!
          initialBalance: Number(convertInitialBalance) || 1,
          login: skipCredentials ? undefined : (convertLogin.trim() || undefined),
          password: skipCredentials ? undefined : (convertPassword.trim() || undefined),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка при регистрации ученика');

      setConvertSuccessData({
        studentPublicId: data.studentPublicId,
        studentName: selectedLeadForConvert.fullName,
        login: !skipCredentials && data.login ? data.login : undefined,
        password: !skipCredentials && data.password ? data.password : undefined,
      });

      // Update lead in local state
      setLeads((prev) =>
        prev.map((l) =>
          l.id === selectedLeadForConvert.id ? { ...l, status: 'registered' } : l
        )
      );

      // Refresh bound students so teacher immediately sees the student in their list!
      if (teacherPublicId) {
        fetchBoundStudents(teacherPublicId);
        fetchSupabaseStudents();
      }
    } catch (err: any) {
      console.error('Error converting lead to student:', err);
      alert(err.message || 'Ошибка зачисления ученика');
    } finally {
      setIsConvertingLead(false);
    }
  };

  // Realtime subscription for incoming trial leads from website
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const channel = supabase
      .channel('platform_messenger_global')
      .on('broadcast', { event: 'new-trial-lead' }, (payload: any) => {
        fetchLeadsData();
        playNotificationChime();
        const parent = payload?.payload?.parentName || 'родителя';
        showSystemNotification({
          title: '🔔 Новая заявка с сайта!',
          body: `Поступила заявка от ${parent} на пробное занятие`,
          url: `/teacher?id=${teacherPublicId}`,
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teacherPublicId]);

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
      localStorage.getItem('aida_user_id') ||
      '';

    if (!savedUserId) {
      router.replace('/login?redirect=/teacher');
      return;
    }

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

    // Load actual teacher identity for this specific ID from database
    fetchTeacherIdentity(savedUserId);

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
    fetchTeachers(savedUserId);
    fetchAllHomework();
    fetchLeadsData();
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

    if (addStudentTab === 'registered' && selectedStudentToAdd) {
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
          addedAt: new Date().toLocaleDateString('ru-RU', { timeZone: 'Europe/Samara' }),
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

  // Students available in database to be bound to this teacher
  const availableStudentsToAdd = useMemo(() => {
    return supabaseStudents.filter((st) => {
      return !boundStudents.some(
        (b) =>
          (b.publicId && b.publicId.toLowerCase() === st.publicId.toLowerCase()) ||
          (b.fullName && b.fullName.trim().toLowerCase() === st.fullName.trim().toLowerCase())
      );
    });
  }, [supabaseStudents, boundStudents]);

  // Selected student object from available students
  const selectedStudentObj = useMemo(() => {
    if (!selectedStudentToAdd) return null;
    return availableStudentsToAdd.find((s) => s.publicId === selectedStudentToAdd) || null;
  }, [selectedStudentToAdd, availableStudentsToAdd]);

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



      {/* 2-Column Dashboard Grid: Left (Schedule & Lessons) | Right (Assigned Students & Homework) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-stretch">
        {/* Left Column: Schedule & Lesson History */}
        <div className="w-full h-full flex flex-col">
          <LessonsScheduleHistory
            role="teacher"
            teacherPublicId={teacherPublicId}
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
                    onClick={() => {
                      if (availableStudentsToAdd.length > 0) {
                        setAddStudentTab('registered');
                      } else {
                        setAddStudentTab('manual');
                      }
                      setShowAddStudentForm(true);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-black bg-[#5C8519] hover:bg-[#4E7214] text-white px-3.5 py-1.5 rounded-full transition-all duration-140 cursor-pointer active:scale-95 shadow-2xs hover:shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Добавить ученика</span>
                  </button>
                </div>
              </div>

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
                        <Link
                          key={st.id}
                          href={`/teacher/student/${encodeURIComponent(info.publicId || st.id)}?teacherId=${encodeURIComponent(teacherPublicId || '')}`}
                          className="group p-3 sm:p-3.5 bg-[#FDFEFC] hover:bg-white rounded-2xl border border-[#E5EED8] hover:border-[#5C8519] shadow-2xs hover:shadow-xs flex items-center justify-between gap-3 transition-all cursor-pointer active:scale-[0.99]"
                          title="Нажмите, чтобы открыть информацию и настройки ребёнка"
                        >
                          {/* Student Info */}
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-[#5C8519] to-[#8BC34A] text-white font-black text-xs sm:text-sm flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                              {info.displayName[0] || 'У'}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                <span className="text-xs sm:text-sm font-black text-[#161F38] group-hover:text-[#5C8519] transition-colors truncate">
                                  {info.displayName}
                                </span>
                                {info.publicId && (
                                  <span className="text-[10px] text-[#6B758E] font-medium bg-[#F5F8F1] px-1.5 py-0.5 rounded-md shrink-0">
                                    ID: {info.publicId}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] sm:text-xs text-[#6B758E] truncate mt-0.5">
                                {st.notes || 'Индивидуальное сопровождение'} {st.phone ? `• ${st.phone}` : ''}
                              </div>
                            </div>
                          </div>

                          {/* Quick metrics & Chevron indicator */}
                          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-bold text-[#5C8519] bg-[#F5F8F1] border border-[#D5E5B8] px-2 sm:px-2.5 py-1 rounded-full">
                                {getStudentBalance(st)} зан.
                              </span>
                              {stHwList.length > 0 && (
                                <span className="hidden sm:inline-block text-[11px] font-bold text-[#64748B] bg-slate-100 border border-slate-200 px-2 py-1 rounded-full">
                                  {stHwList.length} ДЗ
                                </span>
                              )}
                            </div>

                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#F5F8F1] group-hover:bg-[#5C8519] text-[#5C8519] group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                            </div>
                          </div>
                        </Link>
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

    {/* Row 2.5: Trial Leads from Website (Заявки с главной страницы на пробные занятия) */}
    <div className="w-full bg-white rounded-3xl p-4 sm:p-5 border-t-4 border-t-coralAccent border-x border-b border-[#F0DCCD] shadow-xs space-y-4 hover:shadow-sm transition-shadow">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#FFF2E6] text-coralAccent border border-[#FCDDC7] flex items-center justify-center shrink-0 shadow-2xs">
            <Inbox className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-black text-sm sm:text-base text-[#161F38]">
                Заявки с сайта на пробные занятия
              </h3>
              {leads.filter((l) => l.status === 'new').length > 0 && (
                <span className="text-[10px] font-black text-white bg-coralAccent px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  {leads.filter((l) => l.status === 'new').length} новых
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#6B758E] mt-0.5">
              Контакты родителей с посадочной страницы. Вы можете связаться и зачислить ребёнка к себе в ученики.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          <button
            type="button"
            onClick={fetchLeadsData}
            disabled={loadingLeads}
            className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#FFFDFB] hover:bg-[#FFF2E6] text-[#161F38] border border-[#F2DECE] px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
            title="Обновить заявки"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingLeads ? 'animate-spin text-coralAccent' : 'text-[#8A95A8]'}`} />
            <span>Обновить</span>
          </button>
        </div>
      </div>

      {/* Subfilters & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-0.5">
          {[
            { id: 'all', label: `Все (${leads.length})` },
            { id: 'new', label: `Новые (${leads.filter((l) => l.status === 'new').length})` },
            { id: 'contacted', label: `В работе (${leads.filter((l) => l.status === 'contacted').length})` },
            { id: 'registered', label: `Зачислены (${leads.filter((l) => l.status === 'registered').length})` },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setLeadStatusFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                leadStatusFilter === f.id
                  ? 'bg-coralAccent text-white shadow-xs'
                  : 'bg-[#FFFDFB] text-[#6B758E] hover:text-[#161F38] border border-[#F2DECE]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-[#8A95A8] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={leadSearchQuery}
            onChange={(e) => setLeadSearchQuery(e.target.value)}
            placeholder="Поиск по родителю, ребенку..."
            className="w-full pl-8 pr-3 py-1.5 bg-[#FFFDFB] border border-[#F2DECE] rounded-xl text-xs font-bold text-[#161F38] outline-none focus:border-coralAccent transition-colors"
          />
        </div>
      </div>

      {/* Cards List */}
      {filteredLeads.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed border-[#F2DECE] bg-[#FFFAF5] text-center space-y-2">
          <Inbox className="w-8 h-8 text-coralAccent mx-auto opacity-40" />
          <h4 className="font-bold text-xs text-[#161F38]">Заявок не найдено</h4>
          <p className="text-[11px] text-[#8A95A8]">
            {leadSearchQuery
              ? `По запросу «${leadSearchQuery}» ничего не найдено`
              : 'В этой категории пока нет заявок. Новые заявки с формы на сайте появятся здесь.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 items-stretch">
          {filteredLeads.map((lead) => {
            const isNew = lead.status === 'new';
            const isContacted = lead.status === 'contacted';
            const isRegistered = lead.status === 'registered';
            const isCancelled = lead.status === 'cancelled';
            const cleanDigits = (lead.phone || '').replace(/\D/g, '');

            return (
              <div
                key={lead.id}
                className={`p-4 rounded-2xl border bg-[#FFFDFB] hover:bg-white transition-all shadow-2xs flex flex-col justify-between space-y-3.5 ${
                  isNew
                    ? 'border-orange-300 ring-2 ring-orange-400/20'
                    : isRegistered
                    ? 'border-[#CCE8A2] bg-[#FAFDF6]'
                    : 'border-[#F2DECE]'
                }`}
              >
                {/* Top: Status & Date */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {isNew && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-100 text-[#FF6B4A] border border-orange-200 flex items-center gap-1 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B4A]" />
                        Новая заявка
                      </span>
                    )}
                    {isContacted && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                        В работе
                      </span>
                    )}
                    {isRegistered && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#EAF7CF] text-[#5C8519] border border-[#CCE8A2]">
                        Зачислен ✓
                      </span>
                    )}
                    {isCancelled && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gray-100 text-gray-600 border border-gray-200">
                        Отклонена
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-[#8A95A8] flex items-center gap-1 shrink-0">
                    <Clock className="w-3 h-3" />
                    {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('ru-RU', { timeZone: 'Europe/Samara' }) : ''}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-[#8A95A8] uppercase tracking-wider block">
                    Родитель:
                  </span>
                  <h4 className="text-sm font-black text-[#161F38] leading-tight">
                    {lead.parentName || 'Имя не указано'}
                  </h4>

                  {lead.childName && (
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <span className="text-[11px] text-[#6B758E] font-bold">Ребёнок:</span>
                      <span className="text-[11px] font-black text-[#161F38] bg-[#FFF2E6] px-2 py-0.2 rounded-md border border-[#FCDDC7]">
                        👶 {lead.childName}
                      </span>
                    </div>
                  )}

                  <div className="pt-1">
                    <span className="inline-block text-[10px] font-bold bg-[#E8F1FC] text-[#2B6CB0] px-2 py-0.5 rounded-lg border border-[#C5DCFA]">
                      🎯 {lead.selectedSubject}
                    </span>
                  </div>
                </div>

                {/* Phone & Call */}
                <div className="bg-[#FFF8F1] p-2.5 rounded-xl border border-[#F8EDE1] flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[9px] font-bold text-[#8A95A8] block">Телефон:</span>
                    <a
                      href={`tel:${cleanDigits}`}
                      className="text-xs font-black text-[#161F38] hover:text-coralAccent transition-colors truncate block"
                      title="Позвонить"
                    >
                      {lead.phone || 'Не указан'}
                    </a>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <a
                      href={`tel:${cleanDigits}`}
                      className="inline-flex items-center gap-1 bg-[#5C8519] hover:bg-[#4d6f14] text-white text-[11px] font-black px-2.5 py-1.5 rounded-lg transition-all shadow-2xs active:scale-95"
                    >
                      <Phone className="w-3 h-3" />
                      <span>Звонок</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => handleCopyPhone(lead.id, lead.phone)}
                      className="p-1.5 bg-white border border-[#F2DECE] text-[#6B758E] hover:text-[#161F38] rounded-lg cursor-pointer"
                      title="Скопировать телефон"
                    >
                      {copiedPhoneLeadId === lead.id ? (
                        <Check className="w-3 h-3 text-[#5C8519]" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1">
                  {editingLeadNoteId === lead.id ? (
                    <div className="space-y-1.5">
                      <textarea
                        value={leadNoteInput}
                        onChange={(e) => setLeadNoteInput(e.target.value)}
                        placeholder="Заметка к заявке..."
                        rows={2}
                        autoFocus
                        className="w-full text-xs p-2 bg-white border border-coralAccent rounded-xl focus:outline-none resize-none"
                      />
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingLeadNoteId(null)}
                          className="text-[10px] font-bold text-[#8A95A8] px-2 py-0.5"
                        >
                          Отмена
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveLeadNote(lead.id)}
                          className="text-[10px] font-black bg-coralAccent text-white px-2.5 py-0.5 rounded-md"
                        >
                          Сохранить
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => {
                        setEditingLeadNoteId(lead.id);
                        setLeadNoteInput(lead.notes || '');
                      }}
                      className="p-2 rounded-xl bg-[#FAF9F7] hover:bg-[#FFF8F1] border border-[#F0EBE5] transition-colors cursor-pointer text-xs"
                    >
                      {lead.notes ? (
                        <p className="text-[#161F38] font-medium leading-tight flex items-start justify-between gap-1 text-[11px]">
                          <span>💬 {lead.notes}</span>
                          <span className="text-[9px] text-[#8A95A8] font-bold shrink-0">✎</span>
                        </p>
                      ) : (
                        <span className="text-[10px] text-[#8A95A8] font-bold">
                          + Добавить заметку
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom Actions: Status & Convert */}
                <div className="pt-2.5 border-t border-[#F8EDE1] flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1">
                    <select
                      value={lead.status}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        if (val === 'registered') {
                          handleOpenConvertModal(lead);
                        } else {
                          handleUpdateLeadStatus(lead.id, val);
                        }
                      }}
                      className="text-xs font-bold bg-[#FFFDFB] border border-[#F2DECE] text-[#161F38] rounded-xl px-2 py-1 focus:outline-none focus:border-coralAccent cursor-pointer"
                    >
                      <option value="new">Новая</option>
                      <option value="contacted">В работе</option>
                      <option value="registered">Зачислен</option>
                      <option value="cancelled">Отклонить</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => handleDeleteLead(lead.id, lead.parentName)}
                      className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer"
                      title="Удалить заявку"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {isRegistered ? (
                    <span className="inline-flex items-center gap-1 text-xs font-black text-[#5C8519] bg-[#EAF7CF] px-2.5 py-1 rounded-xl border border-[#CCE8A2]">
                      <Check className="w-3 h-3" />
                      Зачислен
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenConvertModal(lead)}
                      className="inline-flex items-center gap-1 text-xs font-black bg-[#5C8519] hover:bg-[#4E7214] text-white px-3 py-1.5 rounded-xl shadow-2xs active:scale-95 transition-all cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Взять к себе →</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
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
            onClick={() => fetchTeachers()}
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

      {/* Modern Modal Overlay: Add Student into Cabinet */}
      {showAddStudentForm && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setShowAddStudentForm(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#161F38]/50 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-[#F2DECE] space-y-4 animate-in zoom-in-95 duration-150"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#F5E8DC]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#EAF7CF] text-[#5C8519] border border-[#CCE8A2] flex items-center justify-center shrink-0 shadow-2xs">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-[#161F38] tracking-tight">
                    Добавить ученика
                  </h3>
                  <p className="text-[11px] text-[#6B758E] mt-0.5">
                    Закрепите ученика за своим кабинетом
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddStudentForm(false)}
                className="w-8 h-8 rounded-full bg-[#F5F7FB] hover:bg-[#E5E9F2] text-[#8A95A8] hover:text-[#161F38] flex items-center justify-center transition-colors cursor-pointer"
                title="Закрыть окно"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Segmented Switcher */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#F5F7FB] rounded-2xl border border-[#EBEFF5]">
              <button
                type="button"
                onClick={() => {
                  setAddStudentTab('registered');
                  setCustomStudentName('');
                }}
                className={`py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  addStudentTab === 'registered'
                    ? 'bg-white text-[#161F38] shadow-xs border border-[#E2E8F0]'
                    : 'text-[#6B758E] hover:text-[#161F38]'
                }`}
              >
                <span>Из базы сайта</span>
                {availableStudentsToAdd.length > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                      addStudentTab === 'registered'
                        ? 'bg-[#EAF7CF] text-[#5C8519]'
                        : 'bg-black/5 text-[#8A95A8]'
                    }`}
                  >
                    {availableStudentsToAdd.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setAddStudentTab('manual');
                  setSelectedStudentToAdd('');
                }}
                className={`py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  addStudentTab === 'manual'
                    ? 'bg-white text-[#161F38] shadow-xs border border-[#E2E8F0]'
                    : 'text-[#6B758E] hover:text-[#161F38]'
                }`}
              >
                <span>Ввести вручную</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddStudent} className="space-y-3.5">
              {addStudentTab === 'registered' ? (
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-[#6B758E] mb-1.5">
                      Выберите ученика из списка:
                    </label>

                    {availableStudentsToAdd.length === 0 ? (
                      <div className="p-3.5 rounded-2xl border border-dashed border-[#F0DCCD] bg-[#FFF8F1] text-center space-y-1">
                        <p className="text-xs font-bold text-[#161F38]">Все зарегистрированные ученики уже закреплены</p>
                        <p className="text-[11px] text-[#6B758E]">
                          Используйте вкладку «Ввести вручную» для нового ученика.
                        </p>
                      </div>
                    ) : (
                      <select
                        value={selectedStudentToAdd}
                        onChange={(e) => setSelectedStudentToAdd(e.target.value)}
                        className="w-full bg-[#FAFBFD] hover:bg-white border border-[#E3E8EE] focus:border-[#5C8519] rounded-xl px-3 py-2 text-xs text-[#161F38] font-bold focus:outline-none transition-colors cursor-pointer"
                      >
                        <option value="">-- Выберите ученика из базы --</option>
                        {availableStudentsToAdd.map((st) => (
                          <option key={st.publicId} value={st.publicId}>
                            {st.fullName} ({st.publicId}){st.phone ? ` • ${st.phone}` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Selected Preview Card */}
                  {selectedStudentObj && (
                    <div className="p-3 bg-[#F9FCF2] border border-[#CCE8A2] rounded-2xl flex items-center justify-between gap-3 animate-in fade-in">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#5C8519] to-[#88B834] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
                          {selectedStudentObj.fullName[0] || 'У'}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-black text-[#161F38] truncate">
                            {selectedStudentObj.fullName}
                          </div>
                          <div className="text-[10px] text-[#5C8519] font-bold flex items-center gap-1.5">
                            <span>ID: {selectedStudentObj.publicId}</span>
                            {selectedStudentObj.phone && (
                              <>
                                <span className="text-[#8A95A8]">•</span>
                                <span className="text-[#6B758E]">{selectedStudentObj.phone}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedStudentToAdd('')}
                        className="text-[#8A95A8] hover:text-[#161F38] text-xs p-1 rounded-lg hover:bg-black/5 cursor-pointer"
                        title="Очистить"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-[#6B758E]">
                    ФИО ученика:
                  </label>
                  <input
                    type="text"
                    value={customStudentName}
                    onChange={(e) => setCustomStudentName(e.target.value)}
                    placeholder="Например: Смирнов Артём"
                    autoFocus
                    className="w-full bg-[#FAFBFD] hover:bg-white border border-[#E3E8EE] focus:border-[#5C8519] rounded-xl px-3 py-2 text-xs text-[#161F38] font-bold focus:outline-none transition-colors"
                  />
                </div>
              )}

              {/* Direction & Notes Field with Quick Chips */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-[#6B758E]">
                  Направление занятий / примечание:
                </label>
                <input
                  type="text"
                  value={customStudentNote}
                  onChange={(e) => setCustomStudentNote(e.target.value)}
                  placeholder="Например: Английский язык, Математика, Логопедия..."
                  className="w-full bg-[#FAFBFD] hover:bg-white border border-[#E3E8EE] focus:border-[#5C8519] rounded-xl px-3 py-2 text-xs text-[#161F38] font-medium focus:outline-none transition-colors"
                />

                {/* Quick chip suggestions */}
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  {[
                    'Английский язык',
                    'Математика',
                    'Русский язык',
                    'Биология',
                    'Логопедия',
                    'Подготовка к школе',
                    'Диагностика',
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setCustomStudentNote(chip)}
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border transition-all cursor-pointer ${
                        customStudentNote === chip
                          ? 'bg-[#EAF7CF] text-[#5C8519] border-[#CCE8A2]'
                          : 'bg-[#F5F7FB] text-[#6B758E] border-[#E8ECF2] hover:bg-white hover:text-[#161F38]'
                      }`}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#F5E8DC]">
                <button
                  type="button"
                  onClick={() => setShowAddStudentForm(false)}
                  className="text-xs font-bold text-[#6B758E] hover:text-[#161F38] px-3.5 py-2 rounded-xl transition-colors cursor-pointer hover:bg-black/5"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={
                    isBindingStudent ||
                    (addStudentTab === 'registered' && !selectedStudentToAdd) ||
                    (addStudentTab === 'manual' && !customStudentName.trim())
                  }
                  className="inline-flex items-center gap-1.5 text-xs font-black bg-[#5C8519] hover:bg-[#4E7214] text-white px-5 py-2 rounded-full shadow-2xs active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isBindingStudent ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Сохранение...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Закрепить ученика</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONVERT TRIAL LEAD TO ACTIVE STUDENT FOR TEACHER */}
      {isConvertModalOpen && selectedLeadForConvert && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => {
            if (!isConvertingLead) setIsConvertModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#161F38]/50 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-[#F2DECE] space-y-4 animate-in zoom-in-95 duration-150"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#F5E8DC]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#EAF7CF] text-[#5C8519] border border-[#CCE8A2] flex items-center justify-center shrink-0 shadow-2xs">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-[#161F38] tracking-tight">
                    Зачислить ученика к себе
                  </h3>
                  <p className="text-[11px] text-[#6B758E] mt-0.5">
                    Регистрация и закрепление за вашим кабинетом
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsConvertModalOpen(false)}
                disabled={isConvertingLead}
                className="w-8 h-8 rounded-full bg-[#F5F7FB] hover:bg-[#E5E9F2] text-[#8A95A8] hover:text-[#161F38] flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {convertSuccessData ? (
              <div className="space-y-3.5 py-1">
                <div className="p-3.5 rounded-2xl bg-[#EAF7CF] border border-[#CCE8A2] text-center space-y-1.5">
                  <div className="w-8 h-8 mx-auto rounded-full bg-[#5C8519] text-white flex items-center justify-center shadow-xs">
                    <Check className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-black text-[#161F38]">Ученик успешно зачислен!</h4>
                  <p className="text-[11px] text-[#5C8519] font-bold">
                    {convertSuccessData.studentName} добавлен(а) в ваш список учеников
                  </p>
                </div>

                {convertSuccessData.password && (
                  <div className="p-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#166534]">Данные для входа в кабинет:</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (navigator?.clipboard) {
                            navigator.clipboard.writeText(`Логин: ${convertSuccessData.login}\nПароль: ${convertSuccessData.password}\nСайт: https://айдаумничка.рф/login`);
                            setCopiedCreds(true);
                            setTimeout(() => setCopiedCreds(false), 2000);
                          }
                        }}
                        className="text-[10px] font-extrabold text-[#166534] bg-white px-2 py-0.5 rounded-md border border-[#BBF7D0] hover:bg-[#DCFCE7] cursor-pointer flex items-center gap-1"
                      >
                        {copiedCreds ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedCreds ? 'Скопировано!' : 'Копировать'}</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs bg-white/80 p-2 rounded-xl border border-[#BBF7D0]/60">
                      <div>
                        <span className="text-[#6B758E] text-[10px] block">Логин:</span>
                        <span className="font-black text-[#161F38] break-all">{convertSuccessData.login}</span>
                      </div>
                      <div>
                        <span className="text-[#6B758E] text-[10px] block">Пароль:</span>
                        <span className="font-black text-[#161F38]">{convertSuccessData.password}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-[#FFF8F1] p-3 rounded-2xl border border-[#F8EDE1] space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#8A95A8] font-bold">ID ученика:</span>
                    <span className="font-black text-[#161F38] bg-white px-2 py-0.5 rounded-lg border border-[#F2DECE]">
                      {convertSuccessData.studentPublicId}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#8A95A8] font-bold">Кабинет ученика:</span>
                    <Link
                      href={`/student?id=${convertSuccessData.studentPublicId}`}
                      target="_blank"
                      className="font-black text-coralAccent hover:underline flex items-center gap-1"
                    >
                      <span>Открыть кабинет</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>

                <div className="flex items-center justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setIsConvertModalOpen(false)}
                    className="text-xs font-black bg-[#5C8519] hover:bg-[#4E7214] text-white px-5 py-2 rounded-full shadow-2xs active:scale-95 transition-all cursor-pointer"
                  >
                    Готово
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                {/* Summary */}
                <div className="bg-[#FFF8F1] p-3 rounded-2xl border border-[#F8EDE1] space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#8A95A8] font-bold">Родитель:</span>
                    <span className="font-black text-[#161F38]">{selectedLeadForConvert.parentName}</span>
                  </div>
                  {selectedLeadForConvert.childName && (
                    <div className="flex items-center justify-between">
                      <span className="text-[#8A95A8] font-bold">Ребёнок:</span>
                      <span className="font-black text-[#161F38]">👶 {selectedLeadForConvert.childName}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-[#8A95A8] font-bold">Телефон:</span>
                    <span className="font-bold text-[#161F38]">{selectedLeadForConvert.phone}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#8A95A8] font-bold">Направление:</span>
                    <span className="font-black text-[#2B6CB0]">{selectedLeadForConvert.selectedSubject}</span>
                  </div>
                </div>

                {/* Registration fields */}
                <div className="p-3 bg-[#FAFBFD] rounded-2xl border border-[#E2E8F0] space-y-2">
                  <span className="text-xs font-black text-[#161F38] block">Регистрация логина и пароля</span>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-[#6B758E]">
                      Логин (Телефон или Email):
                    </label>
                    <input
                      type="text"
                      value={convertLogin}
                      onChange={(e) => setConvertLogin(e.target.value)}
                      placeholder="+7 (999) 000-00-00 или email"
                      className="w-full bg-white border border-[#CBD5E1] rounded-xl px-2.5 py-1.5 text-xs font-bold text-[#161F38] focus:outline-none focus:border-coralAccent"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] font-bold text-[#6B758E]">
                        Пароль:
                      </label>
                      <button
                        type="button"
                        onClick={() => setConvertPassword(Math.floor(100000 + Math.random() * 900000).toString())}
                        className="text-[10px] font-extrabold text-coralAccent hover:underline cursor-pointer"
                      >
                        Сгенерировать PIN
                      </button>
                    </div>
                    <input
                      type="text"
                      value={convertPassword}
                      onChange={(e) => setConvertPassword(e.target.value)}
                      placeholder="Пароль (от 4 символов)"
                      className="w-full bg-white border border-[#CBD5E1] rounded-xl px-2.5 py-1.5 text-xs font-bold text-[#161F38] focus:outline-none focus:border-coralAccent"
                    />
                    <p className="text-[10px] text-[#8A95A8] pt-0.5">
                      По этим данным ученик сможет входить на сайт. Или нажмите «Пропустить» ниже.
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-black text-[#161F38]">
                    Стартовый баланс занятий:
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={convertInitialBalance}
                    onChange={(e) => setConvertInitialBalance(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-[#FFFDFB] border border-[#EADBCC] rounded-xl px-3 py-1.5 text-xs font-bold text-[#161F38] focus:outline-none focus:border-coralAccent"
                  />
                </div>

                {/* Actions: Skip vs Register */}
                <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-[#F5E8DC]">
                  <button
                    type="button"
                    onClick={() => handleConfirmConvertToStudent(true)}
                    disabled={isConvertingLead}
                    className="text-xs font-black text-[#6B758E] hover:text-[#161F38] bg-[#F5F7FB] hover:bg-[#EBEFF5] px-3.5 py-2 rounded-full transition-all cursor-pointer disabled:opacity-50"
                    title="Зачислить без пароля"
                  >
                    Пропустить →
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsConvertModalOpen(false)}
                      disabled={isConvertingLead}
                      className="text-xs font-bold text-[#8A95A8] hover:text-[#161F38] px-3 py-1.5 cursor-pointer disabled:opacity-50"
                    >
                      Отмена
                    </button>
                    <button
                      type="button"
                      onClick={() => handleConfirmConvertToStudent(false)}
                      disabled={isConvertingLead}
                      className="inline-flex items-center gap-1 text-xs font-black bg-[#5C8519] hover:bg-[#4E7214] text-white px-4 py-2 rounded-full shadow-2xs active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isConvertingLead ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Зачисление...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Зарегистрировать</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
