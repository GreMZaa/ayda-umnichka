'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  RefreshCw,
  Mail,
  Paperclip,
  X,
  Search
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

export default function TeacherDashboard() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [teacherName, setTeacherName] = useState<string>('Преподаватель');
  const [teacherPublicId, setTeacherPublicId] = useState<string>('id179017');

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

  // Lesson Launcher state
  const [launcherStudentInput, setLauncherStudentInput] = useState<string>('');
  const [launcherStudentPublicId, setLauncherStudentPublicId] = useState<string>('');
  const [lessonTopic, setLessonTopic] = useState<string>('Индивидуальное занятие: Логопедия');
  const [isCreatingLesson, setIsCreatingLesson] = useState<boolean>(false);
  const [launcherDropdownOpen, setLauncherDropdownOpen] = useState(false);

  // Homework creation state
  const [hwStudentInput, setHwStudentInput] = useState('');
  const [hwStudentPublicId, setHwStudentPublicId] = useState('');
  const [hwTitle, setHwTitle] = useState('');
  const [hwDesc, setHwDesc] = useState('');
  const [hwDropdownOpen, setHwDropdownOpen] = useState(false);
  const [hwFile, setHwFile] = useState<{ name: string; url: string } | null>(null);
  const [isSubmittingHw, setIsSubmittingHw] = useState(false);
  const [hwSuccess, setHwSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      }
    } catch (err) {
      console.warn('Failed to load teachers:', err);
    } finally {
      setLoadingTeachers(false);
    }
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

    const savedUserId =
      localStorage.getItem('aida_auth_user_id') ||
      document.cookie.match(/(?:^|; )aida_auth_user_id=([^;]*)/)?.[1] ||
      'id179017';
    setTeacherPublicId(savedUserId);

    fetchSupabaseStudents();
    fetchBoundStudents(savedUserId);
    fetchTeachers();
  }, [router]);

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

  // Select student for launcher
  const selectStudentForLesson = (name: string, publicId?: string) => {
    setLauncherStudentInput(name);
    setLauncherStudentPublicId(publicId || '');
    setLauncherDropdownOpen(false);
  };

  // Launch on-demand lesson
  const startOnDemandLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingLesson(true);

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const roomToken = `room-${randomSuffix}`;

    try {
      // Create active lesson in Supabase
      await fetch('/api/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_token: roomToken,
          topic: lessonTopic,
          student_name: launcherStudentInput || 'Ученик центра',
          student_public_id: launcherStudentPublicId || null,
          teacher_name: teacherName,
          status: 'active',
          duration_minutes: 45,
        }),
      });
    } catch (err) {
      console.warn('Failed to record lesson:', err);
    }

    setTimeout(() => {
      setIsCreatingLesson(false);
      router.push(`/room/${roomToken}?role=teacher&topic=${encodeURIComponent(lessonTopic)}`);
    }, 400);
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
        setTimeout(() => {
          setHwTitle('');
          setHwDesc('');
          setHwFile(null);
          setHwStudentInput('');
          setHwStudentPublicId('');
          setHwSuccess(false);
        }, 3000);
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
  const filteredLauncherStudents = supabaseStudents.filter(
    (s) =>
      s.fullName.toLowerCase().includes(launcherStudentInput.toLowerCase()) ||
      s.publicId.toLowerCase().includes(launcherStudentInput.toLowerCase())
  );

  const filteredHwStudents = supabaseStudents.filter(
    (s) =>
      s.fullName.toLowerCase().includes(hwStudentInput.toLowerCase()) ||
      s.publicId.toLowerCase().includes(hwStudentInput.toLowerCase())
  );

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Teacher Profile Compact Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#F2E0CF] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#FFF2E6] border border-[#FCDDC7] flex items-center justify-center text-coralAccent font-black text-xl shrink-0 shadow-2xs">
            {teacherName[0] || 'П'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-[#161F38] tracking-tight">{teacherName}</h1>
              <span className="text-[10px] bg-[#EAF7CF] text-[#5C8519] border border-[#D5ECA3] font-black px-2 py-0.5 rounded-full">
                Педагог центра
              </span>
            </div>
            <p className="text-[11px] text-[#6B758E] mt-0.5">
              Детский развивающий центр «АйДаУмничка», г. Тольятти • Онлайн-кабинет занятий
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
          <div className="bg-[#FFF8F1] border border-[#F2DECE] px-3 py-1.5 rounded-xl text-center min-w-[70px]">
            <span className="text-[9px] text-[#6B758E] font-extrabold uppercase tracking-wider block">Учеников</span>
            <p className="text-sm font-black text-[#161F38]">{boundStudents.length}</p>
          </div>
          <div className="bg-[#FFF8F1] border border-[#F2DECE] px-3 py-1.5 rounded-xl text-center min-w-[70px]">
            <span className="text-[9px] text-[#6B758E] font-extrabold uppercase tracking-wider block">Преподавателей</span>
            <p className="text-sm font-black text-[#5C8519]">{supabaseTeachers.length}</p>
          </div>
          <div className="bg-[#FFF8F1] border border-[#F2DECE] px-3 py-1.5 rounded-xl text-center min-w-[70px]">
            <span className="text-[9px] text-[#6B758E] font-extrabold uppercase tracking-wider block">Статус</span>
            <span className="text-xs font-black text-[#5C8519] flex items-center justify-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5C8519]" />
              В сети
            </span>
          </div>
        </div>
      </div>

      {/* Row 1: Aligned Launcher + Schedule/History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-stretch">
        {/* On-Demand Lesson Launcher (Left) */}
        <div className="lg:col-span-8 bg-[#FFF8F1] border border-[#F2DECE] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between h-full">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-[#161F38] tracking-tight">Запустить онлайн-урок</h2>

            <form onSubmit={startOnDemandLesson} className="mt-3.5 space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Searchable Student Picker */}
                <div className="relative">
                  <label className="block text-[11px] font-extrabold text-[#161F38] mb-1">
                    Ученик:
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={launcherStudentInput}
                      onChange={(e) => {
                        setLauncherStudentInput(e.target.value);
                        setLauncherStudentPublicId('');
                        setLauncherDropdownOpen(true);
                      }}
                      onFocus={() => setLauncherDropdownOpen(true)}
                      placeholder="Поиск или ввод имени ученика..."
                      className="w-full bg-white border border-[#EADBCC] rounded-xl px-3 py-1.5 text-xs text-[#161F38] placeholder-[#9E9085] focus:outline-none focus:border-coralAccent pr-8"
                    />
                    <Search className="w-3.5 h-3.5 text-[#8A95A8] absolute right-2.5 top-2.5 pointer-events-none" />
                  </div>

                  {/* Dropdown list of students */}
                  {launcherDropdownOpen && (
                    <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-[#F2DECE] rounded-xl shadow-lg max-h-48 overflow-y-auto p-1 animate-in fade-in">
                      {filteredLauncherStudents.length === 0 ? (
                        <div className="p-2 text-center text-[11px] text-[#8A95A8]">
                          {launcherStudentInput ? 'Ученик не найден в базе, будет записан как введено' : 'Нет доступных учеников'}
                        </div>
                      ) : (
                        filteredLauncherStudents.map((st) => (
                          <button
                            key={st.publicId}
                            type="button"
                            onClick={() => selectStudentForLesson(st.fullName, st.publicId)}
                            className="w-full text-left p-2 rounded-lg hover:bg-[#FFF8F1] transition-colors flex items-center justify-between text-xs cursor-pointer"
                          >
                            <div>
                              <div className="font-bold text-[#161F38]">{st.fullName}</div>
                              <div className="text-[10px] text-[#8A95A8]">ID: {st.publicId} {st.phone ? `• ${st.phone}` : ''}</div>
                            </div>
                            <span className="text-[10px] font-extrabold text-coralAccent bg-[#FFF2E6] px-1.5 py-0.5 rounded-full">
                              Выбрать
                            </span>
                          </button>
                        ))
                      )}
                      <div className="p-1 border-t border-[#F8EDE1] text-right">
                        <button
                          type="button"
                          onClick={() => setLauncherDropdownOpen(false)}
                          className="text-[10px] font-bold text-[#8A95A8] hover:text-[#161F38] px-2 py-0.5"
                        >
                          Закрыть список
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-[#161F38] mb-1">
                    Тема занятия:
                  </label>
                  <input
                    type="text"
                    value={lessonTopic}
                    onChange={(e) => setLessonTopic(e.target.value)}
                    placeholder="Например: Постановка шипящих звуков..."
                    required
                    className="w-full bg-white border border-[#EADBCC] rounded-xl px-3 py-1.5 text-xs text-[#161F38] placeholder-[#9E9085] focus:outline-none focus:border-coralAccent"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="submit"
                  disabled={isCreatingLesson}
                  className="inline-flex items-center gap-2 bg-coralAccent hover:bg-coralAccent-hover text-white font-black text-xs py-2.5 px-6 rounded-full shadow-xs transition-[background-color,transform,box-shadow] duration-140 ease-out-emil active:scale-[0.97] cursor-pointer"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>{isCreatingLesson ? 'Генерация комнаты...' : 'Начать урок сейчас (1 клик)'}</span>
                </button>

                {boundStudents.length > 0 && !launcherStudentInput && (
                  <span className="text-[10px] text-[#6B758E] hidden sm:inline">
                    💡 Выберите ученика из списка ниже для быстрого заполнения
                  </span>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Schedule & Lesson History (Right) */}
        <div className="lg:col-span-4 h-full flex flex-col justify-between">
          <LessonsScheduleHistory
            onStartLesson={(token, topic) => {
              router.push(`/room/${token}?role=teacher&topic=${encodeURIComponent(topic)}`);
            }}
            availableStudents={supabaseStudents}
          />
        </div>
      </div>

      {/* Row 2: Aligned Students Roster & Homework */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-stretch">
        {/* Assigned Students List */}
        <div className="lg:col-span-6 bg-white rounded-2xl p-4 sm:p-5 border border-[#F2E0CF] shadow-xs flex flex-col justify-between h-full space-y-3">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-coralAccent" />
                <h3 className="font-black text-sm sm:text-base text-[#161F38]">Закрепленные ученики</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-[#FFF8F1] text-[#161F38] border border-[#F2DECE] px-2 py-0.5 rounded-full font-bold">
                  {boundStudents.length} активных
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddStudentForm(!showAddStudentForm)}
                  className="inline-flex items-center gap-1 text-[11px] font-black bg-[#EAF7CF] hover:bg-[#DCF2B7] text-[#5C8519] border border-[#D5ECA3] px-2.5 py-1 rounded-full transition-colors duration-140 cursor-pointer active:scale-95"
                >
                  <Plus className="w-3 h-3" />
                  <span>{showAddStudentForm ? 'Скрыть форму' : 'Добавить ученика'}</span>
                </button>
              </div>
            </div>

            {/* Form to Add Student */}
            {showAddStudentForm && (
              <form onSubmit={handleAddStudent} className="p-3 bg-[#FFF8F1] border border-[#F2DECE] rounded-xl space-y-2 animate-in fade-in">
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

            {/* Students List */}
            {boundStudents.length === 0 ? (
              <div className="p-5 rounded-xl border border-dashed border-[#F2DECE] bg-[#FFFAF5] text-center space-y-1.5">
                <Users className="w-6 h-6 text-coralAccent mx-auto opacity-50" />
                <h4 className="font-bold text-xs text-[#161F38]">Пока нет закрепленных учеников</h4>
                <p className="text-[11px] text-[#6B758E] max-w-xs mx-auto">
                  Нажмите «Добавить ученика», чтобы привязать ученика к вашему кабинету.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                {boundStudents.map((st) => (
                  <div
                    key={st.id}
                    className="p-2.5 rounded-xl border border-[#F2DECE] bg-[#FFFDFB] hover:bg-white transition-colors flex items-center justify-between gap-2 shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[#FFF2E6] text-coralAccent font-black text-xs flex items-center justify-center shrink-0">
                        {st.fullName[0] || 'У'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-[#161F38] truncate">{st.fullName}</span>
                          {st.publicId && (
                            <span className="text-[10px] text-[#6B758E] font-medium shrink-0">
                              (ID: {st.publicId})
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-[#6B758E] truncate">
                          {st.notes || 'Индивидуальное сопровождение'} {st.phone ? `• ${st.phone}` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => selectStudentForLesson(st.fullName, st.publicId)}
                        title="Выбрать для старта онлайн-урока"
                        className="text-[10px] font-black bg-[#EAF7CF] hover:bg-[#DCF2B7] text-[#5C8519] px-2.5 py-1 rounded-full transition-colors cursor-pointer active:scale-95 flex items-center gap-1"
                      >
                        <Video className="w-3 h-3" />
                        <span>Урок</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveStudent(st.id, st.publicId)}
                        title="Удалить из списка"
                        className="text-[#8A95A8] hover:text-red-500 p-1 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-[#F8EDE1] flex items-center justify-between text-[11px] text-[#6B758E]">
            <span>Всего в списке: <strong className="text-[#161F38]">{boundStudents.length}</strong></span>
            <span className="text-[10px] text-[#8A95A8]">Данные сохраняются в кабинете</span>
          </div>
        </div>

        {/* Quick Homework Assigner */}
        <div className="lg:col-span-6 bg-white rounded-2xl p-4 sm:p-5 border border-[#F2E0CF] shadow-xs flex flex-col justify-between h-full space-y-3">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-coralAccent" />
              <h3 className="font-black text-sm sm:text-base text-[#161F38]">Назначить домашнее упражнение</h3>
            </div>

            {hwSuccess && (
              <div className="p-2.5 bg-[#F2FBE8] border border-[#C5E87D] rounded-xl text-[#161F38] text-xs font-black flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Домашнее задание успешно отправлено в личный кабинет ученика!</span>
              </div>
            )}

            <form onSubmit={assignHomework} className="space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Searchable Student Picker for Homework */}
                <div className="relative">
                  <label className="block text-[11px] font-extrabold text-[#161F38] mb-1">
                    Ученик:
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={hwStudentInput}
                      onChange={(e) => {
                        setHwStudentInput(e.target.value);
                        setHwStudentPublicId('');
                        setHwDropdownOpen(true);
                      }}
                      onFocus={() => setHwDropdownOpen(true)}
                      placeholder="Всем или поиск ученика..."
                      className="w-full bg-[#FFFDFB] border border-[#EADBCC] rounded-xl px-2.5 py-1.5 text-xs text-[#161F38] placeholder-[#9E9085] focus:outline-none focus:border-coralAccent pr-8"
                    />
                    <Search className="w-3.5 h-3.5 text-[#8A95A8] absolute right-2.5 top-2.5 pointer-events-none" />
                  </div>

                  {/* Dropdown list of students for homework */}
                  {hwDropdownOpen && (
                    <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-[#F2DECE] rounded-xl shadow-lg max-h-48 overflow-y-auto p-1 animate-in fade-in">
                      <button
                        type="button"
                        onClick={() => {
                          setHwStudentInput('');
                          setHwStudentPublicId('');
                          setHwDropdownOpen(false);
                        }}
                        className="w-full text-left p-2 rounded-lg hover:bg-[#FFF8F1] transition-colors text-xs font-bold text-coralAccent cursor-pointer"
                      >
                        📢 Всем закрепленным ученикам
                      </button>

                      {filteredHwStudents.map((st) => (
                        <button
                          key={st.publicId}
                          type="button"
                          onClick={() => {
                            setHwStudentInput(st.fullName);
                            setHwStudentPublicId(st.publicId);
                            setHwDropdownOpen(false);
                          }}
                          className="w-full text-left p-2 rounded-lg hover:bg-[#FFF8F1] transition-colors flex items-center justify-between text-xs cursor-pointer"
                        >
                          <div>
                            <div className="font-bold text-[#161F38]">{st.fullName}</div>
                            <div className="text-[10px] text-[#8A95A8]">ID: {st.publicId}</div>
                          </div>
                          <span className="text-[10px] font-extrabold text-coralAccent bg-[#FFF2E6] px-1.5 py-0.5 rounded-full">
                            Выбрать
                          </span>
                        </button>
                      ))}

                      <div className="p-1 border-t border-[#F8EDE1] text-right">
                        <button
                          type="button"
                          onClick={() => setHwDropdownOpen(false)}
                          className="text-[10px] font-bold text-[#8A95A8] hover:text-[#161F38] px-2 py-0.5"
                        >
                          Закрыть список
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-[#161F38] mb-1">
                    Название упражнения:
                  </label>
                  <input
                    type="text"
                    value={hwTitle}
                    onChange={(e) => setHwTitle(e.target.value)}
                    placeholder="Чистоговорка перед зеркалом"
                    required
                    className="w-full bg-[#FFFDFB] border border-[#EADBCC] rounded-xl px-2.5 py-1.5 text-xs text-[#161F38] focus:outline-none focus:border-coralAccent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-[#161F38] mb-1">
                  Задание для ученика / родителя:
                </label>
                <textarea
                  rows={2}
                  value={hwDesc}
                  onChange={(e) => setHwDesc(e.target.value)}
                  placeholder="Опишите упражнение. Ребёнок сможет записать голосовой ответ в чате..."
                  required
                  className="w-full bg-[#FFFDFB] border border-[#EADBCC] rounded-xl px-2.5 py-1.5 text-xs text-[#161F38] focus:outline-none focus:border-coralAccent resize-none"
                />
              </div>

              {/* File Attachment Support */}
              <div className="pt-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  accept="image/*,.pdf,.doc,.docx,.txt,audio/*"
                  className="hidden"
                />

                {hwFile ? (
                  <div className="inline-flex items-center gap-2 bg-[#FFF8F1] border border-[#F2DECE] px-3 py-1.5 rounded-xl text-xs">
                    <Paperclip className="w-3.5 h-3.5 text-coralAccent" />
                    <span className="font-bold text-[#161F38] max-w-[200px] truncate">{hwFile.name}</span>
                    <button
                      type="button"
                      onClick={removeFileAttachment}
                      className="text-[#8A95A8] hover:text-red-500 p-0.5 rounded cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6B758E] hover:text-[#161F38] bg-[#FFF8F1] hover:bg-[#FFF2E6] border border-[#F2DECE] px-3 py-1.5 rounded-xl transition-colors cursor-pointer active:scale-95"
                  >
                    <Paperclip className="w-3.5 h-3.5 text-coralAccent" />
                    <span>Прикрепить файл к заданию (до 5 МБ)</span>
                  </button>
                )}
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isSubmittingHw}
                  className="inline-flex items-center gap-1.5 bg-coralAccent hover:bg-coralAccent-hover text-white font-black px-5 py-2 rounded-full text-xs shadow-xs transition-[background-color,transform,box-shadow] duration-140 ease-out-emil active:scale-[0.97] cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isSubmittingHw ? 'Отправка...' : 'Отправить задание'}</span>
                </button>
              </div>
            </form>
          </div>

          <div className="pt-2 border-t border-[#F8EDE1] flex items-center justify-between text-[11px] text-[#6B758E]">
            <span>Статус отправки: <strong className="text-[#5C8519]">Готов</strong></span>
            <span className="text-[10px] text-[#8A95A8]">Мгновенно поступает в кабинет ученика</span>
          </div>
        </div>
      </div>

      {/* Row 3: Real Teachers & Pedagogical Faculty */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#F2E0CF] shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-coralAccent" />
              <h3 className="font-black text-sm sm:text-base text-[#161F38]">
                Преподаватели детского центра «АйДаУмничка»
              </h3>
            </div>
            <p className="text-[11px] text-[#6B758E] mt-0.5">
              Педагогический состав и руководство центра
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={fetchTeachers}
              disabled={loadingTeachers}
              title="Обновить список преподавателей"
              className="p-1 text-[#8A95A8] hover:text-[#161F38] transition-colors rounded-lg active:scale-95 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingTeachers ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Teachers Grid: Aligned evenly with items-stretch and equal height cards */}
        {loadingTeachers && supabaseTeachers.length === 0 ? (
          <div className="p-6 text-center text-xs font-bold text-[#6B758E] flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-coralAccent" />
            <span>Загрузка преподавателей...</span>
          </div>
        ) : supabaseTeachers.length === 0 ? (
          <div className="p-6 rounded-xl border border-dashed border-[#F2DECE] bg-[#FFFAF5] text-center space-y-1">
            <Users className="w-6 h-6 text-coralAccent mx-auto opacity-50" />
            <h4 className="font-bold text-xs text-[#161F38]">Преподаватели пока не зарегистрированы</h4>
            <p className="text-[11px] text-[#6B758E]">
              Новые преподаватели отобразятся здесь сразу после регистрации.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-stretch">
            {supabaseTeachers.map((teacher) => (
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
                      <span className="w-2.5 h-2.5 rounded-full absolute -bottom-0.5 -right-0.5 border-2 border-white bg-[#5C8519]" />
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
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5C8519]" />
                    {teacher.statusText}
                  </span>

                  <a
                    href="/messenger"
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
