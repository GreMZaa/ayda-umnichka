'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  BookOpen,
  Plus,
  Trash2,
  Paperclip,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  RefreshCw,
  User,
  Check,
  X
} from 'lucide-react';
import Navbar from '@/components/Navbar';

interface HomeworkItem {
  id: string;
  title: string;
  task_description: string;
  student_public_id?: string;
  student_name: string;
  teacher_name?: string;
  task_file_url?: string;
  file_name?: string;
  due_date?: string;
  status: 'assigned' | 'submitted' | 'completed' | 'in_progress';
  student_solution_text?: string;
  student_solution_file_url?: string;
  created_at: string;
  updated_at?: string;
}

function TeacherHomeworkContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const studentId = searchParams.get('studentId') || '';
  const studentNameParam = searchParams.get('studentName') || 'Ученик';
  const teacherIdParam = searchParams.get('teacherId') || '';

  const cleanStudentName = studentNameParam.replace(/\s*\(.*?\)$/, '').trim() || 'Ученик';

  const [homeworkList, setHomeworkList] = useState<HomeworkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'submitted'>('all');

  // New Homework Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [hwTitle, setHwTitle] = useState('');
  const [hwDesc, setHwDesc] = useState('');
  const [hwDueDate, setHwDueDate] = useState('');
  const [hwFile, setHwFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Set default due date 3 days ahead
  useEffect(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    setHwDueDate(d.toISOString().slice(0, 10));
    setHwTitle(`Артикуляционная гимнастика: ${cleanStudentName}`);
  }, [cleanStudentName]);

  const fetchHomework = async () => {
    try {
      setLoading(true);
      const url = studentId
        ? `/api/homework?studentPublicId=${encodeURIComponent(studentId)}`
        : '/api/homework';
      const res = await fetch(url);
      const data = await res.json();
      if (data?.homework) {
        // Filter strictly to this student if studentId is provided
        const filtered = studentId
          ? data.homework.filter((h: HomeworkItem) => {
              if (h.student_public_id && h.student_public_id.toLowerCase() === studentId.toLowerCase()) return true;
              if (h.student_name) {
                const hNorm = h.student_name.replace(/\s*\(.*?\)$/, '').trim().toLowerCase();
                const sNorm = cleanStudentName.toLowerCase();
                return hNorm.includes(sNorm) || sNorm.includes(hNorm);
              }
              return false;
            })
          : data.homework;
        setHomeworkList(filtered);
      }
    } catch (err) {
      console.warn('Error loading homework:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHomework();
  }, [studentId, cleanStudentName]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 25 * 1024 * 1024) {
        alert('Максимальный размер файла — 25 МБ');
        return;
      }
      setHwFile(file);
    }
  };

  const handleCreateHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hwTitle.trim() || !hwDesc.trim()) return;

    try {
      setIsSubmitting(true);
      let fileUrl = '';
      let fileName = '';

      if (hwFile) {
        fileName = hwFile.name;
        const formData = new FormData();
        formData.append('file', hwFile);
        formData.append('studentId', studentId || 'common');

        const uploadRes = await fetch('/api/room/upload', {
          method: 'POST',
          body: formData,
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          fileUrl = uploadData.fileUrl || '';
        }
      }

      const activeTeacherName =
        (typeof window !== 'undefined' &&
          (localStorage.getItem('aida_full_name') ||
            localStorage.getItem('aida_user_name'))) ||
        'Преподаватель';

      const res = await fetch('/api/homework', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: hwTitle.trim(),
          task_description: hwDesc.trim(),
          student_public_id: studentId || null,
          student_name: cleanStudentName,
          teacher_name: activeTeacherName,
          due_date: hwDueDate || null,
          task_file_url: fileUrl || null,
          file_name: fileName || null,
        }),
      });

      if (res.ok) {
        setHwTitle(`Упражнение: ${cleanStudentName}`);
        setHwDesc('');
        setHwFile(null);
        setShowAddForm(false);
        await fetchHomework();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Не удалось сохранить домашнее задание');
      }
    } catch (err) {
      console.error('Error creating homework:', err);
      alert('Ошибка при сохранении домашнего задания');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteHomework = async (id: string, title: string) => {
    const confirmed = window.confirm(`Вы уверены, что хотите удалить домашнее задание «${title}»?`);
    if (!confirmed) return;

    try {
      setIsDeletingId(id);
      // Optimistic update
      setHomeworkList((prev) => prev.filter((h) => h.id !== id));

      const res = await fetch(`/api/homework?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Не удалось удалить домашнее задание');
        await fetchHomework();
      }
    } catch (err) {
      console.error('Error deleting homework:', err);
      alert('Ошибка при удалении домашнего задания');
      await fetchHomework();
    } finally {
      setIsDeletingId(null);
    }
  };

  const filteredHomework = homeworkList.filter((hw) => {
    const isSubmitted = hw.status === 'submitted' || Boolean(hw.student_solution_text) || Boolean(hw.student_solution_file_url);
    if (filter === 'pending') return !isSubmitted;
    if (filter === 'submitted') return isSubmitted;
    return true;
  });

  const teacherReturnUrl = teacherIdParam
    ? `/teacher?id=${encodeURIComponent(teacherIdParam)}`
    : '/teacher';

  return (
    <div className="min-h-screen bg-[#FFF7EE] flex flex-col">
      <Navbar />

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-5">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-3xl p-4 sm:p-6 border border-[#F2DECE] shadow-xs">
          <div className="space-y-1.5">
            <Link
              href={teacherReturnUrl}
              className="inline-flex items-center gap-1.5 text-xs font-black text-[#5C8519] hover:text-[#456512] transition-colors mb-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Вернуться в кабинет преподавателя</span>
            </Link>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-[#161F38] tracking-tight">
                Домашние задания: {cleanStudentName}
              </h1>
              {studentId && (
                <span className="text-xs bg-[#EAF7CF] text-[#5C8519] border border-[#CCE8A2] font-mono font-bold px-2.5 py-0.5 rounded-full">
                  ID: {studentId}
                </span>
              )}
            </div>
            <p className="text-xs text-[#6B758E]">
              Управление, проверка решений и назначение заданий для закрепления материала
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={fetchHomework}
              disabled={loading}
              title="Обновить список"
              className="p-2 text-[#8A95A8] hover:text-[#161F38] bg-[#FFF8F1] border border-[#EADBCC] rounded-full active:scale-95 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-coralAccent' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="inline-flex items-center gap-1.5 bg-coralAccent hover:bg-coralAccent-hover text-white text-xs sm:text-sm font-black px-4 py-2.5 rounded-full shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{showAddForm ? 'Скрыть форму' : 'Назначить задание'}</span>
            </button>
          </div>
        </div>

        {/* Add Homework Assignment Form */}
        {showAddForm && (
          <form
            onSubmit={handleCreateHomework}
            className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-coralAccent shadow-md space-y-4 animate-in fade-in"
          >
            <div className="flex items-center justify-between border-b border-[#F2DECE] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#FFF2E6] text-coralAccent flex items-center justify-center font-bold">
                  <BookOpen className="w-4 h-4" />
                </div>
                <h3 className="font-black text-sm sm:text-base text-[#161F38]">
                  Новое домашнее задание для {cleanStudentName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-[#8A95A8] hover:text-[#161F38] p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-black text-[#161F38] mb-1">
                  Тема / название задания <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={hwTitle}
                  onChange={(e) => setHwTitle(e.target.value)}
                  placeholder="Например: Артикуляционная гимнастика «Лошадка» и «Грибок»"
                  className="w-full bg-[#FFF8F1] border border-[#EADBCC] focus:border-coralAccent rounded-xl px-3.5 py-2 text-xs font-bold text-[#161F38] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-[#161F38] mb-1">
                  Срок выполнения (дедлайн)
                </label>
                <input
                  type="date"
                  value={hwDueDate}
                  onChange={(e) => setHwDueDate(e.target.value)}
                  className="w-full bg-[#FFF8F1] border border-[#EADBCC] focus:border-coralAccent rounded-xl px-3.5 py-2 text-xs font-bold text-[#161F38] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-[#161F38] mb-1">
                Описание задания и инструкции для ребёнка и родителей <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={4}
                value={hwDesc}
                onChange={(e) => setHwDesc(e.target.value)}
                placeholder="Опишите упражнения, количество повторений, на что обратить внимание перед зеркалом или попросите записать аудиоответ..."
                className="w-full bg-[#FFF8F1] border border-[#EADBCC] focus:border-coralAccent rounded-xl p-3.5 text-xs text-[#161F38] outline-none resize-none leading-relaxed"
              />
            </div>

            {/* File Attachment & Submit Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.mp3,.wav,.m4a"
                />
                {hwFile ? (
                  <div className="inline-flex items-center gap-2 bg-[#FFF2E6] text-coralAccent border border-[#FCDDC7] px-3 py-1.5 rounded-xl text-xs font-bold">
                    <Paperclip className="w-3.5 h-3.5" />
                    <span className="truncate max-w-[200px]">{hwFile.name}</span>
                    <button
                      type="button"
                      onClick={() => setHwFile(null)}
                      className="text-red-500 hover:text-red-700 ml-1 font-bold cursor-pointer"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6B758E] hover:text-[#161F38] bg-[#FFF8F1] hover:bg-[#FDEEDC] border border-[#EADBCC] px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
                  >
                    <Paperclip className="w-3.5 h-3.5 text-coralAccent" />
                    <span>Прикрепить методичку, аудио или фото</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-xs font-bold text-[#8A95A8] hover:text-[#161F38] px-4 py-2 cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-coralAccent hover:bg-coralAccent-hover text-white text-xs sm:text-sm font-black px-5 py-2.5 rounded-full shadow-xs active:scale-95 cursor-pointer disabled:opacity-50 transition-all"
                >
                  {isSubmitting ? 'Сохранение задания...' : 'Отправить задание ученику'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Filter Tabs & Total Count */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center bg-white p-1 rounded-2xl border border-[#F2DECE] shadow-2xs">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                filter === 'all'
                  ? 'bg-coralAccent text-white shadow-2xs'
                  : 'text-[#6B758E] hover:text-[#161F38]'
              }`}
            >
              Все ({homeworkList.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('pending')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                filter === 'pending'
                  ? 'bg-coralAccent text-white shadow-2xs'
                  : 'text-[#6B758E] hover:text-[#161F38]'
              }`}
            >
              В процессе ({homeworkList.filter((h) => h.status !== 'submitted' && !h.student_solution_text).length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('submitted')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                filter === 'submitted'
                  ? 'bg-coralAccent text-white shadow-2xs'
                  : 'text-[#6B758E] hover:text-[#161F38]'
              }`}
            >
              Сданы ({homeworkList.filter((h) => h.status === 'submitted' || Boolean(h.student_solution_text)).length})
            </button>
          </div>

          <span className="text-xs font-bold text-[#6B758E]">
            Найдено заданий: <strong className="text-[#161F38]">{filteredHomework.length}</strong>
          </span>
        </div>

        {/* Homework Items List */}
        {loading ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-[#F2DECE] space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin text-coralAccent mx-auto" />
            <p className="text-xs font-bold text-[#6B758E]">Загрузка домашних заданий...</p>
          </div>
        ) : filteredHomework.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 sm:p-14 text-center border border-dashed border-[#F2DECE] space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FFF2E6] text-coralAccent flex items-center justify-center mx-auto">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="font-black text-base text-[#161F38]">Ученику пока не назначено домашних заданий</h3>
            <p className="text-xs text-[#6B758E] max-w-md mx-auto">
              Нажмите кнопку «Назначить задание», чтобы отправить первое упражнение в кабинет {cleanStudentName}.
            </p>
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-1.5 bg-coralAccent hover:bg-coralAccent-hover text-white text-xs font-black px-4 py-2 rounded-full shadow-2xs active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Создать первое ДЗ</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredHomework.map((hw) => {
              const isSubmitted = hw.status === 'submitted' || Boolean(hw.student_solution_text) || Boolean(hw.student_solution_file_url);

              return (
                <div
                  key={hw.id}
                  className="bg-white rounded-3xl p-4 sm:p-5 border border-[#F2DECE] shadow-xs hover:shadow-sm transition-all space-y-3"
                >
                  {/* Top Bar: Title, Status Badge, Due Date & Delete */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                            isSubmitted
                              ? 'bg-[#EAF7CF] text-[#5C8519] border border-[#CCE8A2]'
                              : 'bg-amber-50 text-amber-600 border border-amber-200'
                          }`}
                        >
                          {isSubmitted ? '✓ Сдано учеником' : '⏳ В процессе выполнения'}
                        </span>
                        {hw.due_date && (
                          <span className="text-[10px] text-[#6B758E] font-bold flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-coralAccent" />
                            Срок: {new Date(hw.due_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                        <span className="text-[10px] text-[#8A95A8]">
                          Создано: {new Date(hw.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                      <h4 className="font-black text-sm sm:text-base text-[#161F38] leading-tight">
                        {hw.title}
                      </h4>
                    </div>

                    <button
                      type="button"
                      disabled={isDeletingId === hw.id}
                      onClick={() => handleDeleteHomework(hw.id, hw.title)}
                      className="text-[#8A95A8] hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                      title="Удалить домашнее задание"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Task Instructions */}
                  <div className="bg-[#FFF8F1] rounded-2xl p-3 sm:p-4 border border-[#F2DECE] text-xs text-[#161F38] leading-relaxed whitespace-pre-wrap">
                    {hw.task_description}
                  </div>

                  {/* Teacher Attached Material */}
                  {hw.task_file_url && (
                    <div className="pt-0.5">
                      <a
                        href={hw.task_file_url}
                        target="_blank"
                        rel="noreferrer"
                        download={hw.file_name || 'homework_material'}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-coralAccent bg-[#FFF2E6] hover:bg-[#FFE5D0] px-3 py-1.5 rounded-xl border border-[#FCDDC7] transition-colors"
                      >
                        <Paperclip className="w-3.5 h-3.5 shrink-0" />
                        <span>Материал от педагога: {hw.file_name || 'Скачать файл'}</span>
                      </a>
                    </div>
                  )}

                  {/* Student Response Section */}
                  {isSubmitted ? (
                    <div className="bg-[#F7FAEF] rounded-2xl p-3.5 sm:p-4 border border-[#CCE8A2] space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-black text-[#5C8519]">
                        <CheckCircle2 className="w-4 h-4 text-[#5C8519]" />
                        <span>Ответ и решение ученика ({cleanStudentName}):</span>
                      </div>

                      {hw.student_solution_text && (
                        <p className="text-xs text-[#161F38] leading-relaxed whitespace-pre-wrap italic bg-white/70 p-3 rounded-xl border border-[#E5EED8]">
                          «{hw.student_solution_text}»
                        </p>
                      )}

                      {hw.student_solution_file_url && (
                        <div className="pt-1">
                          {/\.(mp3|wav|ogg|webm|m4a)($|\?)/i.test(hw.student_solution_file_url) ? (
                            <div className="bg-white p-2.5 rounded-xl border border-[#CCE8A2] space-y-1">
                              <span className="text-[10px] font-bold text-[#5C8519] flex items-center gap-1">
                                🎙️ Голосовой ответ ребёнка:
                              </span>
                              <audio
                                controls
                                src={hw.student_solution_file_url}
                                className="w-full h-8"
                              />
                            </div>
                          ) : /\.(png|jpe?g|webp|gif)($|\?)/i.test(hw.student_solution_file_url) ? (
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-[#5C8519]">
                                📸 Прикреплённое фото решения:
                              </span>
                              <a
                                href={hw.student_solution_file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block overflow-hidden rounded-xl border-2 border-[#CCE8A2] max-w-xs hover:opacity-95 transition-opacity"
                              >
                                <img
                                  src={hw.student_solution_file_url}
                                  alt="Решение ученика"
                                  className="w-full h-auto object-cover max-h-56"
                                />
                              </a>
                            </div>
                          ) : (
                            <a
                              href={hw.student_solution_file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-bold text-[#5C8519] bg-white px-3 py-1.5 rounded-xl border border-[#CCE8A2]"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Скачать прикреплённое решение</span>
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-[11px] text-[#8A95A8] flex items-center gap-1.5 pt-1">
                      <Clock className="w-3 h-3 text-amber-500" />
                      <span>Ученик ещё не отправил решение на проверку</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default function TeacherHomeworkPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FFF7EE] flex items-center justify-center p-6 text-center">
          <div className="space-y-2">
            <div className="w-8 h-8 border-4 border-coralAccent border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-[#6B758E]">Загрузка домашнего задания...</p>
          </div>
        </div>
      }
    >
      <TeacherHomeworkContent />
    </Suspense>
  );
}
