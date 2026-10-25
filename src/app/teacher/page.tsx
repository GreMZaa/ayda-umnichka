'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import WeekCalendar from '@/components/WeekCalendar';
import {
  Video,
  UserCheck,
  Plus,
  BookOpen,
  Users,
  CheckCircle2,
  Sparkles,
  PhoneCall,
  Shield,
  Trash2,
  GraduationCap,
  ChevronRight,
  RefreshCw,
  Mail
} from 'lucide-react';
import type { TeacherRecord } from '@/app/api/teachers/route';

interface StudentItem {
  id: string;
  fullName: string;
  age: string;
  phone: string;
  note: string;
  addedAt: string;
}

export default function TeacherDashboard() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [teacherName, setTeacherName] = useState<string>('Преподаватель');
  const [studentInput, setStudentInput] = useState<string>('');
  const [lessonTopic, setLessonTopic] = useState<string>('Индивидуальное занятие');
  const [isCreating, setIsCreating] = useState<boolean>(false);

  // Students roster state
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [showAddStudentForm, setShowAddStudentForm] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentAge, setNewStudentAge] = useState('');
  const [newStudentPhone, setNewStudentPhone] = useState('');
  const [newStudentNote, setNewStudentNote] = useState('');

  // Homework creation state
  const [hwStudent, setHwStudent] = useState('');
  const [hwTitle, setHwTitle] = useState('');
  const [hwDesc, setHwDesc] = useState('');
  const [hwSuccess, setHwSuccess] = useState(false);

  // Dynamic teachers loaded strictly from Supabase
  const [supabaseTeachers, setSupabaseTeachers] = useState<TeacherRecord[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(true);

  const fetchSupabaseTeachers = async () => {
    try {
      setLoadingTeachers(true);
      const res = await fetch('/api/teachers', { cache: 'no-store' });
      const data = await res.json();
      if (data?.teachers) {
        setSupabaseTeachers(data.teachers);
      }
    } catch (err) {
      console.warn('Failed to load teachers from Supabase:', err);
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

    // Load saved teacher students list from localStorage
    try {
      const savedStudents = localStorage.getItem('aida_teacher_students_v1');
      if (savedStudents) {
        setStudents(JSON.parse(savedStudents));
      }
    } catch (e) {
      console.warn('Error reading students roster:', e);
    }

    // Load dynamic faculty directly from Supabase
    fetchSupabaseTeachers();
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

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;

    const newStudent: StudentItem = {
      id: `st_${Date.now()}`,
      fullName: newStudentName.trim(),
      age: newStudentAge.trim() || '6 лет',
      phone: newStudentPhone.trim(),
      note: newStudentNote.trim() || 'Индивидуальное сопровождение',
      addedAt: new Date().toLocaleDateString('ru-RU'),
    };

    const updated = [newStudent, ...students];
    setStudents(updated);
    try {
      localStorage.setItem('aida_teacher_students_v1', JSON.stringify(updated));
    } catch (err) {
      console.warn('Failed to save student:', err);
    }

    setNewStudentName('');
    setNewStudentAge('');
    setNewStudentPhone('');
    setNewStudentNote('');
    setShowAddStudentForm(false);
  };

  const handleRemoveStudent = (id: string) => {
    const updated = students.filter((s) => s.id !== id);
    setStudents(updated);
    try {
      localStorage.setItem('aida_teacher_students_v1', JSON.stringify(updated));
    } catch (err) {
      console.warn('Failed to save student:', err);
    }
  };

  const selectStudentForLesson = (student: StudentItem) => {
    setStudentInput(`${student.fullName} (${student.age})`);
    setLessonTopic(`Урок: ${student.note}`);
  };

  const startOnDemandLesson = (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const roomToken = `room-${randomSuffix}`;

    setTimeout(() => {
      setIsCreating(false);
      router.push(`/room/${roomToken}?role=teacher&topic=${encodeURIComponent(lessonTopic)}`);
    }, 500);
  };

  const assignHomework = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hwTitle || !hwDesc) return;
    setHwSuccess(true);
    setTimeout(() => {
      setHwTitle('');
      setHwDesc('');
      setHwSuccess(false);
    }, 3000);
  };

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
            <p className="text-sm font-black text-[#161F38]">{students.length}</p>
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

      {/* Row 1: Aligned Launcher + Schedule (items-stretch ensures equal height) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-stretch">
        {/* On-Demand Lesson Launcher (Left) */}
        <div className="lg:col-span-8 bg-[#FFF8F1] border border-[#F2DECE] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="inline-flex items-center gap-1.5 bg-white px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider text-coralAccent border border-[#FCDDC7]">
                <span className="w-1.5 h-1.5 rounded-full bg-coralAccent animate-pulse" />
                <span>P2P Видеоурок</span>
              </div>
              <span className="text-[10px] text-[#6B758E] font-semibold">
                Без сторонних программ
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-black text-[#161F38] tracking-tight">Запустить онлайн-урок</h2>
            <p className="text-[11px] text-[#6B758E] mt-0.5">
              Создайте защищенную P2P комнату с видеосвязью и интерактивной доской в 1 клик.
            </p>

            <form onSubmit={startOnDemandLesson} className="mt-3.5 space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-extrabold text-[#161F38] mb-1">
                    Ученик:
                  </label>
                  <input
                    type="text"
                    value={studentInput}
                    onChange={(e) => setStudentInput(e.target.value)}
                    placeholder="Имя ученика или ID"
                    className="w-full bg-white border border-[#EADBCC] rounded-xl px-3 py-1.5 text-xs text-[#161F38] placeholder-[#9E9085] focus:outline-none focus:border-coralAccent"
                  />
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
                  disabled={isCreating}
                  className="inline-flex items-center gap-2 bg-coralAccent hover:bg-coralAccent-hover text-white font-black text-xs py-2.5 px-6 rounded-full shadow-xs transition-[background-color,transform,box-shadow] duration-140 ease-out-emil active:scale-[0.97] cursor-pointer"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>{isCreating ? 'Генерация комнаты...' : 'Начать урок сейчас (1 клик)'}</span>
                </button>

                {students.length > 0 && !studentInput && (
                  <span className="text-[10px] text-[#6B758E] hidden sm:inline">
                    💡 Выберите ученика из списка ниже для быстрого заполнения
                  </span>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Schedule Calendar (Right) */}
        <div className="lg:col-span-4 h-full flex flex-col justify-between">
          <WeekCalendar />
        </div>
      </div>

      {/* Row 2: Aligned Students Roster & Homework (items-stretch ensures equal height) */}
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
                  {students.length} активных
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
                <div className="text-[11px] font-black text-[#161F38]">Карточка нового ученика:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                    placeholder="ФИО ученика (напр. Артём Смирнов)"
                    className="bg-white border border-[#EADBCC] rounded-lg px-2.5 py-1.5 text-xs text-[#161F38] focus:outline-none focus:border-coralAccent"
                  />
                  <input
                    type="text"
                    value={newStudentAge}
                    onChange={(e) => setNewStudentAge(e.target.value)}
                    placeholder="Возраст/класс (напр. 6 лет)"
                    className="bg-white border border-[#EADBCC] rounded-lg px-2.5 py-1.5 text-xs text-[#161F38] focus:outline-none focus:border-coralAccent"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newStudentPhone}
                    onChange={(e) => setNewStudentPhone(e.target.value)}
                    placeholder="Телефон родителя (+7...)"
                    className="bg-white border border-[#EADBCC] rounded-lg px-2.5 py-1.5 text-xs text-[#161F38] focus:outline-none focus:border-coralAccent"
                  />
                  <input
                    type="text"
                    value={newStudentNote}
                    onChange={(e) => setNewStudentNote(e.target.value)}
                    placeholder="Направление (напр. Логопедия)"
                    className="bg-white border border-[#EADBCC] rounded-lg px-2.5 py-1.5 text-xs text-[#161F38] focus:outline-none focus:border-coralAccent"
                  />
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
                    className="text-xs font-black bg-coralAccent hover:bg-coralAccent-hover text-white px-4 py-1.5 rounded-full shadow-2xs active:scale-95 cursor-pointer"
                  >
                    Сохранить ученика
                  </button>
                </div>
              </form>
            )}

            {/* Students List */}
            {students.length === 0 ? (
              <div className="p-5 rounded-xl border border-dashed border-[#F2DECE] bg-[#FFFAF5] text-center space-y-1.5">
                <Users className="w-6 h-6 text-coralAccent mx-auto opacity-50" />
                <h4 className="font-bold text-xs text-[#161F38]">Пока нет закрепленных учеников</h4>
                <p className="text-[11px] text-[#6B758E] max-w-xs mx-auto">
                  Нажмите кнопку «Добавить ученика», чтобы привязать ученика к вашему кабинету.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                {students.map((st) => (
                  <div
                    key={st.id}
                    className="p-2.5 rounded-xl border border-[#F2DECE] bg-[#FFFDFB] hover:bg-white transition-colors flex items-center justify-between gap-2 shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[#FFF2E6] text-coralAccent font-black text-xs flex items-center justify-center shrink-0">
                        {st.fullName[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-[#161F38] truncate">{st.fullName}</span>
                          <span className="text-[10px] text-[#6B758E] font-medium shrink-0">({st.age})</span>
                        </div>
                        <div className="text-[10px] text-[#6B758E] truncate">
                          {st.note} {st.phone ? `• ${st.phone}` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => selectStudentForLesson(st)}
                        title="Выбрать для старта онлайн-урока"
                        className="text-[10px] font-black bg-[#EAF7CF] hover:bg-[#DCF2B7] text-[#5C8519] px-2.5 py-1 rounded-full transition-colors cursor-pointer active:scale-95 flex items-center gap-1"
                      >
                        <Video className="w-3 h-3" />
                        <span>Урок</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveStudent(st.id)}
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
            <span>Всего в списке: <strong className="text-[#161F38]">{students.length}</strong></span>
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
                <span>Домашнее задание успешно назначено!</span>
              </div>
            )}

            <form onSubmit={assignHomework} className="space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-extrabold text-[#161F38] mb-1">
                    Ученик:
                  </label>
                  {students.length > 0 ? (
                    <select
                      value={hwStudent}
                      onChange={(e) => setHwStudent(e.target.value)}
                      className="w-full bg-[#FFFDFB] border border-[#EADBCC] rounded-xl px-2.5 py-1.5 text-xs text-[#161F38] focus:outline-none focus:border-coralAccent"
                    >
                      <option value="">Всем закрепленным ученикам</option>
                      {students.map((st) => (
                        <option key={st.id} value={st.fullName}>
                          {st.fullName} ({st.age})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={hwStudent}
                      onChange={(e) => setHwStudent(e.target.value)}
                      placeholder="Имя ученика"
                      className="w-full bg-[#FFFDFB] border border-[#EADBCC] rounded-xl px-2.5 py-1.5 text-xs text-[#161F38] focus:outline-none focus:border-coralAccent"
                    />
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

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 bg-coralAccent hover:bg-coralAccent-hover text-white font-black px-5 py-2 rounded-full text-xs shadow-xs transition-[background-color,transform,box-shadow] duration-140 ease-out-emil active:scale-[0.97] cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Отправить задание</span>
                </button>
              </div>
            </form>
          </div>

          <div className="pt-2 border-t border-[#F8EDE1] flex items-center justify-between text-[11px] text-[#6B758E]">
            <span>Статус отправки: <strong className="text-[#5C8519]">Готов</strong></span>
            <span className="text-[10px] text-[#8A95A8]">Мгновенно поступает в чат</span>
          </div>
        </div>
      </div>

      {/* Row 3: Real Teachers & Pedagogical Faculty from Supabase */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#F2E0CF] shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-coralAccent" />
              <h3 className="font-black text-sm sm:text-base text-[#161F38]">
                Преподаватели детского центра «АйДаУмничка» (Supabase)
              </h3>
            </div>
            <p className="text-[11px] text-[#6B758E] mt-0.5">
              Реальные педагоги и руководство центра из базы данных Supabase
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={fetchSupabaseTeachers}
              disabled={loadingTeachers}
              title="Обновить список из базы Supabase"
              className="p-1 text-[#8A95A8] hover:text-[#161F38] transition-colors rounded-lg active:scale-95 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingTeachers ? 'animate-spin' : ''}`} />
            </button>
            <span className="text-[10px] font-extrabold bg-[#EAF7CF] text-[#5C8519] border border-[#D5ECA3] px-2.5 py-0.5 rounded-full">
              {supabaseTeachers.length} в базе Supabase
            </span>
          </div>
        </div>

        {/* Teachers Grid: Aligned evenly with items-stretch and equal height cards */}
        {loadingTeachers && supabaseTeachers.length === 0 ? (
          <div className="p-6 text-center text-xs font-bold text-[#6B758E] flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-coralAccent" />
            <span>Загрузка преподавателей из Supabase...</span>
          </div>
        ) : supabaseTeachers.length === 0 ? (
          <div className="p-6 rounded-xl border border-dashed border-[#F2DECE] bg-[#FFFAF5] text-center space-y-1">
            <Users className="w-6 h-6 text-coralAccent mx-auto opacity-50" />
            <h4 className="font-bold text-xs text-[#161F38]">Преподаватели пока не зарегистрированы</h4>
            <p className="text-[11px] text-[#6B758E]">
              Новые преподаватели отобразятся здесь сразу после регистрации через Supabase Auth.
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
