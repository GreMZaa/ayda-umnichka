'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Check
} from 'lucide-react';
import type { TeacherRecord } from '@/app/api/teachers/route';

interface SupabaseStudent {
  id: string;
  publicId: string;
  fullName: string;
  phone?: string;
  email?: string;
}

interface BoundStudentItem {
  id: string;
  publicId?: string;
  fullName: string;
  phone?: string;
  notes?: string;
  addedAt?: string;
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
          addedAt: st.created_at ? new Date(st.created_at).toLocaleDateString('ru-RU') : '',
        }));
        setBoundStudents(mapped);
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-start">
        {/* Left Column: Schedule & Lesson History */}
        <div className="w-full">
          <LessonsScheduleHistory
            role="teacher"
            teacherName={cleanTeacherDisplayName || teacherName || 'Преподаватель'}
            onStartLesson={(token, topic) => {
              router.push(`/room/${token}?role=teacher&topic=${encodeURIComponent(topic)}`);
            }}
            availableStudents={supabaseStudents}
          />
        </div>

        {/* Right Column: Assigned Students with Homework Accordion */}
        <div className="w-full">
          {/* Assigned Students List — Emerald Growth Accent */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border-t-4 border-t-[#5C8519] border-x border-b border-[#D8E6C3] shadow-xs space-y-3.5 hover:shadow-sm transition-shadow">
            <div className="space-y-3">
              <div className="shrink-0 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#EAF7CF] text-[#5C8519] border border-[#CCE8A2] flex items-center justify-center shrink-0 shadow-2xs">
                    <Users className="w-4 h-4" />
                  </div>
                  <h3 className="font-black text-sm sm:text-base text-[#161F38]">Закрепленные ученики</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-[#EAF7CF] text-[#5C8519] border border-[#CCE8A2] px-2.5 py-0.5 rounded-full font-bold">
                    {boundStudents.length} активных
                  </span>
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
                      {supabaseStudents.map((st) => (
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
                      const isExpanded = selectedStudentHwId === st.id;

                      return (
                        <div
                          key={st.id}
                          className={`rounded-2xl border transition-all duration-140 ${
                            isExpanded
                              ? 'border-[#5C8519] bg-[#F7FAEF] shadow-xs'
                              : 'border-[#E5EED8] bg-[#FDFEFC] hover:bg-white hover:border-[#5C8519]/60 shadow-2xs'
                          }`}
                        >
                      {/* Student Card Row (Click to toggle Homework list) */}
                      <div
                        onClick={() => setSelectedStudentHwId(isExpanded ? null : st.id)}
                        className="p-3 flex items-center justify-between gap-2 cursor-pointer select-none"
                        title="Нажмите, чтобы посмотреть список домашних заданий ученика"
                      >
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

                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Homework count indicator pill */}
                          <div
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border transition-colors ${
                              stHwList.length > 0
                                ? 'bg-[#EEF2FF] text-[#4F46E5] border-[#DCDAF7]'
                                : 'bg-gray-50 text-[#8A95A8] border-gray-200'
                            }`}
                          >
                            <BookOpen className="w-3 h-3" />
                            <span>{stHwList.length} ДЗ</span>
                          </div>

                          {/* Expand chevron */}
                          <div
                            className={`p-1 text-[#8A95A8] transition-transform duration-200 ${
                              isExpanded ? 'rotate-180 text-[#5C8519]' : ''
                            }`}
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </div>

                          {/* Delete button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveStudent(st.id, st.publicId);
                            }}
                            title="Удалить из списка"
                            className="text-[#8A95A8] hover:text-red-500 p-1 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Expandable Homework List Panel */}
                      {isExpanded && (
                        <div className="px-3 pb-3 pt-1 border-t border-[#E2ECCF] space-y-2 animate-in fade-in duration-140">
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[11px] font-black text-[#161F38]">
                              Домашние задания: {info.displayName}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setHwStudentInput(info.displayName);
                                setHwStudentPublicId(info.publicId);
                                setHwTitle(`Упражнение для ${info.displayName}`);
                                setActiveHwStudentId(activeHwStudentId === st.id ? null : st.id);
                              }}
                              className="inline-flex items-center gap-1 text-[10px] font-black bg-[#4F46E5] hover:bg-[#4338CA] text-white px-2.5 py-1 rounded-full shadow-2xs cursor-pointer active:scale-95 transition-transform"
                            >
                              <Plus className="w-3 h-3" />
                              <span>{activeHwStudentId === st.id ? 'Скрыть форму' : 'Назначить ДЗ'}</span>
                            </button>
                          </div>

                          {/* Inline Homework Assignment Form */}
                          {activeHwStudentId === st.id && (
                            <form
                              onSubmit={assignHomework}
                              onClick={(e) => e.stopPropagation()}
                              className="p-3 bg-[#FFFDFB] border border-[#CCE8A2] rounded-xl space-y-2.5 animate-in fade-in"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-[#161F38]">
                                  Новое задание: {info.displayName}
                                </span>
                                {hwSuccess && (
                                  <span className="text-[10px] font-bold text-[#5C8519] bg-[#EAF7CF] px-2 py-0.5 rounded-full">
                                    ✓ Назначено!
                                  </span>
                                )}
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-[#6B758E] mb-1">
                                  Тема / название задания:
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={hwTitle}
                                  onChange={(e) => setHwTitle(e.target.value)}
                                  placeholder="Например: Артикуляционная гимнастика «Лошадка»"
                                  className="w-full bg-white border border-[#EADBCC] rounded-lg px-2.5 py-1.5 text-xs text-[#161F38] focus:outline-none focus:border-[#4F46E5]"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-[#6B758E] mb-1">
                                  Описание упражнения и инструкции:
                                </label>
                                <textarea
                                  required
                                  rows={3}
                                  value={hwDesc}
                                  onChange={(e) => setHwDesc(e.target.value)}
                                  placeholder="Опишите, что нужно сделать ребенку (упражнения перед зеркалом, повторение звуков...)"
                                  className="w-full bg-white border border-[#EADBCC] rounded-lg px-2.5 py-1.5 text-xs text-[#161F38] focus:outline-none focus:border-[#4F46E5] resize-none"
                                />
                              </div>

                              {/* File attachment */}
                              <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                                <div>
                                  <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    className="hidden"
                                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.mp3,.wav,.m4a"
                                  />
                                  {hwFile ? (
                                    <div className="inline-flex items-center gap-1.5 bg-[#FFF2E6] text-coralAccent border border-[#FCDDC7] px-2.5 py-1 rounded-lg text-[10px] font-bold">
                                      <Paperclip className="w-3 h-3" />
                                      <span className="truncate max-w-[130px]">{hwFile.name}</span>
                                      <button
                                        type="button"
                                        onClick={removeFileAttachment}
                                        className="text-red-500 hover:text-red-700 ml-1 font-bold"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => fileInputRef.current?.click()}
                                      className="inline-flex items-center gap-1 text-[10px] font-bold text-[#6B758E] hover:text-[#161F38] bg-gray-100 hover:bg-gray-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                                    >
                                      <Paperclip className="w-3 h-3" />
                                      <span>Прикрепить файл</span>
                                    </button>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5 ml-auto">
                                  <button
                                    type="button"
                                    onClick={() => setActiveHwStudentId(null)}
                                    className="text-xs font-bold text-[#8A95A8] hover:text-[#161F38] px-2.5 py-1 cursor-pointer"
                                  >
                                    Отмена
                                  </button>
                                  <button
                                    type="submit"
                                    disabled={isSubmittingHw || hwSuccess}
                                    className="text-xs font-black bg-[#4F46E5] hover:bg-[#4338CA] text-white px-3.5 py-1 rounded-full shadow-2xs active:scale-95 cursor-pointer disabled:opacity-50 transition-all"
                                  >
                                    {isSubmittingHw ? 'Отправка...' : hwSuccess ? 'Отправлено!' : 'Назначить'}
                                  </button>
                                </div>
                              </div>
                            </form>
                          )}

                          {stHwList.length === 0 ? (
                            <div className="py-2.5 px-3 bg-white/80 rounded-xl border border-dashed border-[#CCE8A2] text-center text-xs text-[#6B758E]">
                              <p className="font-bold text-[#161F38]">Заданий пока нет</p>
                              <p className="text-[10px] text-[#8A95A8] mt-0.5">
                                Нажмите «Назначить ДЗ», чтобы отправить задание в кабинет ученика.
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                              {stHwList.map((hw) => {
                                const isSubmitted = hw.status === 'submitted' || Boolean(hw.student_solution_text);

                                return (
                                  <div
                                    key={hw.id}
                                    className="p-2.5 bg-white rounded-xl border border-[#D5ECA3] space-y-1 shadow-2xs text-xs"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <h5 className="font-black text-[#161F38] text-xs leading-snug">
                                        {hw.title}
                                      </h5>
                                      <span
                                        className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${
                                          isSubmitted
                                            ? 'bg-[#EAF7CF] text-[#5C8519] border border-[#CCE8A2]'
                                            : 'bg-amber-50 text-amber-600 border border-amber-200'
                                        }`}
                                      >
                                        {isSubmitted ? '✓ Сдано' : '⏳ В процессе'}
                                      </span>
                                    </div>

                                    <p className="text-[11px] text-[#6B758E] leading-relaxed">
                                      {hw.task_description}
                                    </p>

                                    {/* Teacher attached file if any */}
                                    {hw.task_file_url && (
                                      <div className="pt-0.5">
                                        <a
                                          href={hw.task_file_url}
                                          target="_blank"
                                          rel="noreferrer"
                                          download={hw.file_name || 'homework_file'}
                                          className="inline-flex items-center gap-1 text-[10px] font-bold text-coralAccent bg-[#FFF2E6] hover:bg-[#FFE5D0] px-2 py-0.5 rounded-lg transition-colors"
                                        >
                                          <Paperclip className="w-3 h-3 shrink-0" />
                                          <span className="truncate max-w-[150px]">
                                            {hw.file_name || 'Материал к заданию'}
                                          </span>
                                        </a>
                                      </div>
                                    )}

                                    {/* Student solution if submitted */}
                                    {isSubmitted && (
                                      <div className="p-2 bg-[#F7FAEF] border border-[#CCE8A2] rounded-lg mt-1 space-y-0.5">
                                        <div className="text-[10px] font-black text-[#5C8519] flex items-center gap-1">
                                          <CheckCircle2 className="w-3 h-3 text-[#5C8519]" />
                                          <span>Ответ ученика:</span>
                                        </div>
                                        {hw.student_solution_text && (
                                          <p className="text-[11px] text-[#161F38] italic">
                                            {hw.student_solution_text}
                                          </p>
                                        )}
                                        {hw.student_solution_file_url && (
                                          <div className="mt-1.5">
                                            {/\.(mp3|wav|ogg|webm|m4a)($|\?)/i.test(hw.student_solution_file_url) ? (
                                              <audio
                                                controls
                                                src={hw.student_solution_file_url}
                                                className="w-full h-8"
                                              />
                                            ) : /\.(png|jpe?g|webp|gif)($|\?)/i.test(hw.student_solution_file_url) ? (
                                              <a
                                                href={hw.student_solution_file_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block overflow-hidden rounded-lg border border-[#D5ECA3] max-w-[200px] hover:opacity-90 transition-opacity"
                                              >
                                                <img
                                                  src={hw.student_solution_file_url}
                                                  alt="Решение ученика"
                                                  className="w-full max-h-36 object-contain bg-white"
                                                />
                                              </a>
                                            ) : (
                                              <a
                                                href={hw.student_solution_file_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                download
                                                className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#5C8519] bg-white border border-[#D5ECA3] px-2 py-1 rounded-lg hover:bg-[#F2F7E5] transition-colors"
                                              >
                                                <Paperclip className="w-3 h-3" />
                                                <span>Прикрепленный файл с решением</span>
                                              </a>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    <div className="text-[9px] text-[#8A95A8] pt-0.5 flex items-center justify-between">
                                      <span>Выдано: {new Date(hw.created_at).toLocaleDateString('ru-RU')}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
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
