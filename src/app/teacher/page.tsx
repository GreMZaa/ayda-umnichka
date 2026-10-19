"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  GraduationCap,
  Video,
  Calendar,
  Clock,
  User,
  CheckCircle2,
  BookOpen,
  Star,
  MessageSquare,
  FileText,
  Sparkles,
  ArrowRight,
  Plus,
  Users,
  Search,
  Check,
  X,
  ChevronRight,
  Copy,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { getSupabase } from "@/lib/supabase";
import { fetchWithAuth } from "@/lib/api-client";
import ScheduleCalendar from "@/components/ScheduleCalendar";

interface StudentProfile {
  id: string;
  name: string;
  grade: string;
  school: string;
  avatarUrl?: string;
}

interface SubjectItem {
  id: string;
  name: string;
  color: string;
}

export default function TeacherCabinet() {
  const [teacherName, setTeacherName] = useState("Анна Сергеевна Иванова");
  const [lessons, setLessons] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"schedule" | "lessons" | "students" | "journal">("schedule");
  const [mounted, setMounted] = useState(false);

  // Состояние создания нового урока
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creatingLesson, setCreatingLesson] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Поля формы создания урока
  const [newTitle, setNewTitle] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [lessonDate, setLessonDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  });
  const [lessonTime, setLessonTime] = useState("16:00");
  const [lessonDurationMinutes, setLessonDurationMinutes] = useState(45);
  const [lessonRoomName, setLessonRoomName] = useState(() => `room-${Math.random().toString(36).substring(2, 8)}`);

  // Состояние отчёта по уроку
  const [selectedLessonForNote, setSelectedLessonForNote] = useState<any | null>(null);
  const [noteContent, setNoteContent] = useState("");
  const [grade, setGrade] = useState<number>(5);
  const [feedback, setFeedback] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // Фильтр в списке уроков
  const [lessonFilter, setLessonFilter] = useState<"ALL" | "SCHEDULED" | "COMPLETED">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Блокировка скролла страницы при открытых модалках
  useEffect(() => {
    if (createModalOpen || !!selectedLessonForNote) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [createModalOpen, selectedLessonForNote]);

  // Загрузка уроков
  const fetchLessons = async () => {
    try {
      const res = await fetchWithAuth("/api/lessons");
      const data = await res.json();
      setLessons(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Ошибка загрузки уроков:", err);
    } finally {
      setLoading(false);
    }
  };

  // Первичная загрузка данных из Supabase: профиль, предметы, ученики
  useEffect(() => {
    const client = getSupabase();
    if (client) {
      // 1. Профиль учителя
      client.auth.getUser().then(({ data }) => {
        if (data?.user?.user_metadata?.full_name) {
          setTeacherName(data.user.user_metadata.full_name);
        }
      });

      // 2. Предметы школы
      client
        .from("subjects")
        .select("id, name, color")
        .order("name", { ascending: true })
        .then(({ data }) => {
          if (data && data.length > 0) {
            setSubjects(data);
            if (!selectedSubjectId) setSelectedSubjectId(data[0].id);
          }
        });

      // 3. Список учеников
      client
        .from("profiles")
        .select("id, name, bio, avatar_url")
        .eq("role", "STUDENT")
        .order("name", { ascending: true })
        .then(({ data }) => {
          if (data && data.length > 0) {
            const mappedStudents = data.map((s: any) => {
              let parsedBio: any = {};
              try {
                if (s.bio && s.bio.startsWith("{")) parsedBio = JSON.parse(s.bio);
                else if (s.bio) parsedBio.grade = s.bio;
              } catch (e) {}

              return {
                id: s.id,
                name: s.name || "Ученик",
                grade: parsedBio.grade || "Начальная школа",
                school: parsedBio.school || "АйДаУмничка",
                avatarUrl: s.avatar_url,
              };
            });
            setStudents(mappedStudents);
            if (!selectedStudentId) setSelectedStudentId(mappedStudents[0].id);
          }
        });
    }

    fetchLessons();
  }, []);

  // Открытие модалки создания урока (с возможностью предвыбора ученика)
  const handleOpenCreateModal = (studentId?: string) => {
    if (studentId) setSelectedStudentId(studentId);
    setNewTitle("");
    setLessonRoomName(`room-${Math.random().toString(36).substring(2, 8)}`);
    setCreateError(null);
    setCreateSuccess(false);
    setCreateModalOpen(true);
  };

  // Отправка формы создания урока
  const handleCreateLessonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setCreateError("Пожалуйста, введите название урока.");
      return;
    }
    if (!selectedSubjectId) {
      setCreateError("Пожалуйста, выберите предмет.");
      return;
    }
    if (!selectedStudentId) {
      setCreateError("Пожалуйста, выберите ученика.");
      return;
    }

    setCreatingLesson(true);
    setCreateError(null);

    const subject = subjects.find((s) => s.id === selectedSubjectId);
    const student = students.find((s) => s.id === selectedStudentId);

    // Рассчитываем время начала и окончания в ISO
    const startIso = new Date(`${lessonDate}T${lessonTime}:00`).toISOString();
    const endDate = new Date(new Date(startIso).getTime() + lessonDurationMinutes * 60 * 1000);
    const endIso = endDate.toISOString();

    const lessonPayload = {
      title: newTitle.trim(),
      subjectId: selectedSubjectId,
      subjectName: subject?.name || "Математика и логика",
      subjectColor: subject?.color || "#2563eb",
      teacherId: "00000000-0000-0000-0000-000000000001",
      teacherName,
      studentId: selectedStudentId,
      studentName: student?.name || "Ученик",
      startTime: startIso,
      endTime: endIso,
      status: "SCHEDULED",
      roomName: lessonRoomName.trim() || `room-${Date.now()}`,
    };

    try {
      const res = await fetchWithAuth("/api/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lessonPayload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Не удалось создать урок.");
      }

      setCreateSuccess(true);
      await fetchLessons();

      setTimeout(() => {
        setCreateModalOpen(false);
        setCreateSuccess(false);
      }, 1200);
    } catch (err: any) {
      setCreateError(err.message || "Ошибка соединения при создании урока.");
    } finally {
      setCreatingLesson(false);
    }
  };

  // Обновление статуса урока (SCHEDULED -> LIVE -> COMPLETED)
  const handleUpdateStatus = async (lessonId: string, status: string) => {
    try {
      await fetchWithAuth(`/api/lessons/${lessonId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      fetchLessons();
    } catch (err) {
      console.error(err);
    }
  };

  // Модалка отчёта
  const handleOpenReportModal = (lesson: any) => {
    setSelectedLessonForNote(lesson);
    if (lesson.notes && lesson.notes.length > 0) {
      const lastNote = lesson.notes[lesson.notes.length - 1];
      setNoteContent(lastNote.content || "");
      setGrade(lastNote.grade || 5);
      setFeedback(lastNote.feedback || "");
    } else {
      setNoteContent("");
      setGrade(5);
      setFeedback("");
    }
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLessonForNote || !noteContent) return;
    setSavingNote(true);
    try {
      await fetchWithAuth(`/api/lessons/${selectedLessonForNote.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: noteContent,
          grade,
          feedback,
        }),
      });
      setSelectedLessonForNote(null);
      setNoteContent("");
      setFeedback("");
      fetchLessons();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingNote(false);
    }
  };

  const liveLessons = lessons.filter((l) => l.status === "LIVE");
  const upcomingLessons = lessons.filter((l) => l.status === "SCHEDULED");
  const completedLessons = lessons.filter((l) => l.status === "COMPLETED");

  const filteredLessons = lessons.filter((lesson) => {
    if (lessonFilter === "SCHEDULED" && lesson.status !== "SCHEDULED") return false;
    if (lessonFilter === "COMPLETED" && lesson.status !== "COMPLETED") return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = lesson.title?.toLowerCase().includes(q);
      const matchStudent = lesson.studentName?.toLowerCase().includes(q);
      const matchSubject = lesson.subjectName?.toLowerCase().includes(q);
      return matchTitle || matchStudent || matchSubject;
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-20">
      {/* 1. ГЛАВНАЯ КАРТОЧКА ПРЕПОДАВАТЕЛЯ В СТИЛЕ FOXFORD */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm relative overflow-hidden">
        {/* Декоративное свечение */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full blur-2xl opacity-60 pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1544717305-2782549b5136?w=200&h=200&fit=crop&crop=faces"
                alt={teacherName}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-white shadow-lg ring-4 ring-blue-50"
              />
              <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-xs text-white shadow-xs" title="В сети">
                ✓
              </span>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  {teacherName}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                  Преподаватель
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>Математика и логика</span>
                <span>•</span>
                <span>Стаж 12 лет</span>
                <span>•</span>
                <span>Онлайн-школа «АйДаУмничка»</span>
              </p>
            </div>
          </div>

          {/* Информационные виджеты + Кнопка создания урока */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">
            {/* Проведено уроков */}
            <div className="flex-1 sm:flex-none flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 shadow-2xs">
              <GraduationCap className="w-5 h-5 text-blue-600" />
              <div>
                <div className="text-xs font-black text-blue-950">{completedLessons.length} уроков</div>
                <div className="text-[10px] text-blue-700 font-medium">Проведено занятий</div>
              </div>
            </div>

            {/* Активных учеников */}
            <div className="flex-1 sm:flex-none flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-900 shadow-2xs">
              <Users className="w-5 h-5 text-amber-600" />
              <div>
                <div className="text-xs font-black text-amber-950">{students.length} учеников</div>
                <div className="text-[10px] text-amber-700 font-medium">В группе обучения</div>
              </div>
            </div>

            {/* Рейтинг */}
            <div className="flex-1 sm:flex-none flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-900 shadow-2xs">
              <Star className="w-5 h-5 fill-emerald-500 text-emerald-500" />
              <div>
                <div className="text-xs font-black text-emerald-950">5.0 ⭐</div>
                <div className="text-[10px] text-emerald-700 font-medium">Высшая категория</div>
              </div>
            </div>

            {/* Главная кнопка: Создать урок */}
            <button
              type="button"
              onClick={() => handleOpenCreateModal()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-blue-500/25 transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Создать урок</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. АКТИВНЫЙ УРОК ПРЯМО СЕЙЧАС (СТИЛЬ FOXFORD) */}
      {liveLessons.length > 0 && (
        <div className="bg-white rounded-3xl p-6 sm:p-7 border-2 border-blue-600 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 animate-in fade-in duration-300">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-black border border-blue-200">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping" />
              <span>Урок идёт прямо сейчас!</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {liveLessons[0].title}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-600">
              <span>Ученик: <strong className="text-slate-800">{liveLessons[0].studentName}</strong></span>
              <span>•</span>
              <span>Предмет: <strong>{liveLessons[0].subjectName}</strong></span>
              <span>•</span>
              <span>До {format(new Date(liveLessons[0].endTime), "HH:mm")}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <Link
              href={`/room/${liveLessons[0].roomName}`}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-blue-600 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-blue-500/25 hover:bg-blue-700 transition transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Video className="w-4 h-4 text-white" />
              <span>Войти в видеокласс</span>
            </Link>
            <button
              onClick={() => handleUpdateStatus(liveLessons[0].id, "COMPLETED")}
              className="px-4 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
            >
              Завершить
            </button>
          </div>
        </div>
      )}

      {/* 3. НАВИГАЦИОННЫЕ ТАБЫ КАБИНЕТА В СТИЛЕ FOXFORD */}
      <div className="flex p-1.5 bg-slate-100 rounded-2xl gap-1 overflow-x-auto">
        {[
          { id: "schedule" as const, label: "Расписание уроков", icon: Calendar, badge: upcomingLessons.length + liveLessons.length },
          { id: "lessons" as const, label: "Все уроки", icon: BookOpen, badge: lessons.length },
          { id: "students" as const, label: "Мои ученики", icon: Users, badge: students.length },
          { id: "journal" as const, label: "Журнал и отчёты", icon: FileText, badge: completedLessons.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                isSelected
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Icon className={`w-4 h-4 ${isSelected ? "text-blue-600" : "text-slate-400"}`} />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isSelected ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-600"
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 4. ВКЛАДКА 1: ФОКСФОРД-КАЛЕНДАРЬ РАСПИСАНИЯ */}
      {activeTab === "schedule" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Интерактивный календарь занятий
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Просматривайте занятия по дням недели, запускайте видеоуроки и ставьте оценки
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenCreateModal()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Создать урок</span>
            </button>
          </div>

          <ScheduleCalendar
            role="teacher"
            lessons={lessons}
            onUpdateStatus={handleUpdateStatus}
            onOpenReportModal={handleOpenReportModal}
          />
        </div>
      )}

      {/* 5. ВКЛАДКА 2: ВСЕ УРОКИ (СПИСОК С ФИЛЬТРАМИ И УПРАВЛЕНИЕМ) */}
      {activeTab === "lessons" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Список учебных занятий
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Управление статусами, ссылка на видеокласс и проведение уроков
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenCreateModal()}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Создать урок</span>
              </button>
            </div>
          </div>

          {/* Панель поиска и фильтрации */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2">
              {[
                { id: "ALL", label: "Все уроки" },
                { id: "SCHEDULED", label: "Запланированные" },
                { id: "COMPLETED", label: "Завершённые" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setLessonFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    lessonFilter === f.id
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по уроку, ученику..."
                className="w-full sm:w-64 pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          {filteredLessons.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-sm text-slate-800">Уроки не найдены</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Создайте первый урок для ученика, нажав кнопку «Создать урок»
              </p>
              <button
                onClick={() => handleOpenCreateModal()}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs"
              >
                + Создать новый урок
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredLessons.map((lesson) => (
                <div
                  key={lesson.id}
                  className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs hover:border-blue-300 transition flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[11px] font-bold text-white"
                        style={{ backgroundColor: lesson.subjectColor || "#2563eb" }}
                      >
                        {lesson.subjectName}
                      </span>

                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                        lesson.status === "LIVE"
                          ? "bg-red-100 text-red-700 animate-pulse"
                          : lesson.status === "COMPLETED"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-blue-100 text-blue-800"
                      }`}>
                        {lesson.status === "LIVE" ? "Идёт сейчас" : lesson.status === "COMPLETED" ? "Завершён" : "Запланирован"}
                      </span>
                    </div>

                    <h4 className="font-extrabold text-slate-900 text-sm sm:text-base leading-snug">
                      {lesson.title}
                    </h4>

                    <div className="mt-2.5 space-y-1 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {format(new Date(lesson.startTime), "d MMMM, HH:mm", { locale: ru })} – {format(new Date(lesson.endTime), "HH:mm")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>Ученик: <strong className="text-slate-800">{lesson.studentName}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      {lesson.status === "SCHEDULED" && (
                        <button
                          onClick={() => handleUpdateStatus(lesson.id, "LIVE")}
                          className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 font-bold hover:bg-blue-100 transition cursor-pointer"
                        >
                          Начать урок
                        </button>
                      )}
                      {lesson.status === "LIVE" && (
                        <button
                          onClick={() => handleUpdateStatus(lesson.id, "COMPLETED")}
                          className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 font-bold hover:bg-emerald-100 transition cursor-pointer"
                        >
                          Завершить
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenReportModal(lesson)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition cursor-pointer"
                      >
                        {lesson.notes && lesson.notes.length > 0 ? "Отчёт ✓" : "Написать отчёт"}
                      </button>
                    </div>

                    <Link
                      href={`/room/${lesson.roomName}`}
                      className="font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                    >
                      <span>В класс</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 6. ВКЛАДКА 3: МОИ УЧЕНИКИ */}
      {activeTab === "students" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Ученики преподавателя
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Список прикреплённых учеников из базы Supabase и назначение персональных занятий
              </p>
            </div>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-xl border border-blue-200 self-start sm:self-auto">
              Всего учеников: {students.length}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {students.map((st) => {
              const studentLessons = lessons.filter((l) => l.studentId === st.id);
              const completedCount = studentLessons.filter((l) => l.status === "COMPLETED").length;
              const nextLesson = studentLessons.find((l) => l.status === "SCHEDULED");

              return (
                <div
                  key={st.id}
                  className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs hover:border-blue-300 transition space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold text-lg flex items-center justify-center shadow-md shadow-blue-500/20">
                        {st.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-sm sm:text-base leading-tight">
                          {st.name}
                        </h3>
                        <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800">
                          {st.grade}
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-3 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Пройдено уроков:</span>
                        <strong className="text-slate-800">{completedCount}</strong>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Ближайший урок:</span>
                        <strong className="text-blue-700">
                          {nextLesson ? format(new Date(nextLesson.startTime), "d MMM, HH:mm", { locale: ru }) : "Не назначен"}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenCreateModal(st.id)}
                    className="w-full py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition border border-blue-200/80 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Назначить урок</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 7. ВКЛАДКА 4: ЖУРНАЛ И ОТЧЁТЫ */}
      {activeTab === "journal" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Журнал проведённых уроков и отчёты
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Отчёты для родителей, рекомендации на дом и оценки за занятия
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
              Завершено: {completedLessons.length}
            </span>
          </div>

          {completedLessons.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center text-slate-500 text-xs">
              Пока нет проведённых уроков
            </div>
          ) : (
            <div className="bg-white rounded-3xl divide-y divide-slate-100 border border-slate-200 shadow-xs overflow-hidden">
              {completedLessons.map((lesson) => (
                <div key={lesson.id} className="p-6 space-y-3 hover:bg-slate-50/50 transition">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg">
                          {lesson.subjectName}
                        </span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-500">
                          {format(new Date(lesson.startTime), "d MMMM yyyy, HH:mm", { locale: ru })}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-slate-900 text-base mt-1">{lesson.title}</h4>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Ученик: <strong>{lesson.studentName}</strong>
                      </p>
                    </div>

                    <button
                      onClick={() => handleOpenReportModal(lesson)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition border border-blue-200/80 cursor-pointer self-start sm:self-auto"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                      <span>{lesson.notes && lesson.notes.length > 0 ? "Изменить отчёт" : "Написать отчёт"}</span>
                    </button>
                  </div>

                  {lesson.notes && lesson.notes.length > 0 && (
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 text-xs">
                      {lesson.notes.map((note: any, nIdx: number) => (
                        <div key={note.id || nIdx} className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800">{note.authorName || "Преподаватель"}</span>
                            {note.grade && (
                              <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                                Оценка: {note.grade} / 5
                              </span>
                            )}
                          </div>
                          <p className="text-slate-700 leading-relaxed">{note.content}</p>
                          {note.feedback && (
                            <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 text-blue-900 mt-1">
                              <strong>Совет родителю на дом:</strong> {note.feedback}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 8. МОДАЛЬНОЕ ОКНО «СОЗДАТЬ УРОК» (Портал в body с 100% перекрытием) */}
      {createModalOpen && mounted && createPortal(
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setCreateModalOpen(false);
          }}
          className="fixed inset-0 z-[100] w-screen h-screen min-h-screen bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto relative animate-in fade-in zoom-in-95 duration-150">
            {/* Заголовок модального окна */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Plus className="w-5 h-5 stroke-[3]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">
                    Создать новый урок
                  </h3>
                  <p className="text-xs text-slate-500">
                    Урок сразу появится в расписании ученика и родителя
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            {createSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Урок успешно создан и записан в Supabase!</span>
              </div>
            )}

            <form onSubmit={handleCreateLessonSubmit} className="space-y-4">
              {/* Название урока */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Название урока / тема занятия:
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Например: Разбор олимпиадных задач и дробей"
                  className="w-full p-3 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
                />
              </div>

              {/* Выбор предмета */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Учебный предмет:
                </label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full p-3 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-600 bg-white"
                >
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Выбор ученика */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ученик:
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full p-3 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-600 bg-white"
                >
                  {students.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.grade})
                    </option>
                  ))}
                </select>
              </div>

              {/* Дата и время */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Дата урока:
                  </label>
                  <input
                    type="date"
                    required
                    value={lessonDate}
                    onChange={(e) => setLessonDate(e.target.value)}
                    className="w-full p-3 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-600 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Время начала:
                  </label>
                  <input
                    type="time"
                    required
                    value={lessonTime}
                    onChange={(e) => setLessonTime(e.target.value)}
                    className="w-full p-3 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-600 bg-white"
                  />
                </div>
              </div>

              {/* Длительность */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Длительность занятия:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "45 минут (стандарт)", val: 45 },
                    { label: "60 минут (углублённый)", val: 60 },
                  ].map((dur) => (
                    <button
                      type="button"
                      key={dur.val}
                      onClick={() => setLessonDurationMinutes(dur.val)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold transition border cursor-pointer ${
                        lessonDurationMinutes === dur.val
                          ? "bg-blue-50 border-blue-600 text-blue-700 shadow-2xs"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {dur.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Комната видеокласса */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Комната видеокласса:
                  </label>
                  <button
                    type="button"
                    onClick={() => setLessonRoomName(`room-${Math.random().toString(36).substring(2, 8)}`)}
                    className="text-[11px] text-blue-600 font-bold hover:underline"
                  >
                    Сгенерировать случайную
                  </button>
                </div>
                <div className="relative">
                  <Video className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={lessonRoomName}
                    onChange={(e) => setLessonRoomName(e.target.value)}
                    className="w-full pl-9 pr-3 py-3 rounded-2xl border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              {/* Кнопки действий */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={creatingLesson}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {creatingLesson ? "Создание..." : "Создать и назначить урок"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* 9. МОДАЛЬНОЕ ОКНО ОТЧЁТА ПРЕПОДАВАТЕЛЯ (Портал в body с 100% перекрытием) */}
      {selectedLessonForNote && mounted && createPortal(
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedLessonForNote(null);
          }}
          className="fixed inset-0 z-[100] w-screen h-screen min-h-screen bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Отчёт по проведённому уроку</h3>
                <p className="text-xs text-slate-500">
                  Ученик: <strong>{selectedLessonForNote.studentName}</strong> • {selectedLessonForNote.title}
                </p>
              </div>
              <button
                onClick={() => setSelectedLessonForNote(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNote} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Что прошли на уроке:
                </label>
                <textarea
                  required
                  rows={3}
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Разобрали тему «Дроби и логические задачи», решили 5 примеров на доске..."
                  className="w-full text-xs p-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Оценка за занятие (1 - 5):
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((g) => (
                    <button
                      type="button"
                      key={g}
                      onClick={() => setGrade(g)}
                      className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                        grade === g
                          ? "bg-amber-500 text-white shadow-xs"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {g} ★
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Совет родителям на дом:
                </label>
                <textarea
                  rows={2}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Обязательно похвалите за самостоятельное решение! Дома повторить таблицу умножения..."
                  className="w-full text-xs p-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedLessonForNote(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={savingNote}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {savingNote ? "Сохранение..." : "Сохранить отчёт"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
