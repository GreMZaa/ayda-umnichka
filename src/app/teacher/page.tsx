"use client";

import { useState, useEffect, useRef } from "react";
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
  Edit3,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { getSupabase } from "@/lib/supabase";
import { fetchWithAuth } from "@/lib/api-client";
import ScheduleCalendar from "@/components/ScheduleCalendar";
import EditProfileModal from "@/components/EditProfileModal";

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

const DEFAULT_SUBJECTS: SubjectItem[] = [
  { id: "fd8c024a-ff45-40e1-99ea-9afa55e1bf3d", name: "Математика и логика", color: "#2563eb" },
  { id: "6cd8b625-b9ee-4f5c-866b-4c94f504afa5", name: "Русский язык и каллиграфия", color: "#d946ef" },
  { id: "dc85f0c2-0b64-41aa-80c1-436af66ddaab", name: "Английский язык", color: "#059669" },
  { id: "b86f3458-9418-4a57-8106-cf4c3db47f97", name: "Подготовка к школе", color: "#d97706" },
  { id: "e1234567-89ab-cdef-0123-456789abcdef", name: "Окружающий мир", color: "#0284c7" },
  { id: "e2234567-89ab-cdef-0123-456789abcdef", name: "Физика и естествознание", color: "#7c3aed" },
  { id: "e3234567-89ab-cdef-0123-456789abcdef", name: "Программирование и IT", color: "#0d9488" },
];

const DEFAULT_STUDENTS: StudentProfile[] = [
  { id: "a1000000-0000-0000-0000-000000000001", name: "Артём Смирнов", grade: "1 класс", school: "АйДаУмничка" },
  { id: "a1000000-0000-0000-0000-000000000002", name: "София Васильева", grade: "5 класс", school: "АйДаУмничка" },
  { id: "2a62e436-f539-4ec5-b3af-a1afabfa0eec", name: "Ученик", grade: "3 класс", school: "АйДаУмничка" },
  { id: "a1000000-0000-0000-0000-000000000003", name: "Иван Морозов", grade: "4 класс", school: "АйДаУмничка" },
  { id: "a1000000-0000-0000-0000-000000000004", name: "Алиса Романова", grade: "2 класс", school: "АйДаУмничка" },
];

export default function TeacherCabinet() {
  const [teacherId, setTeacherId] = useState("");
  const [teacherName, setTeacherName] = useState("Анна Сергеевна Иванова");
  const [teacherAvatar, setTeacherAvatar] = useState(
    "https://images.unsplash.com/photo-1544717305-2782549b5136?w=200&h=200&fit=crop&crop=faces"
  );
  const [teacherSubjects, setTeacherSubjects] = useState("Математика и логика");
  const [teacherExperience, setTeacherExperience] = useState("Стаж 12 лет");
  const [teacherEducation, setTeacherEducation] = useState("МГПУ, физ-мат факультет");
  const [teacherBio, setTeacherBio] = useState("");
  const [teacherPhone, setTeacherPhone] = useState("");
  const [teacherEmail, setTeacherEmail] = useState("");
  const [editProfileModalOpen, setEditProfileModalOpen] = useState(false);

  const [lessons, setLessons] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>(DEFAULT_SUBJECTS);
  const [students, setStudents] = useState<StudentProfile[]>(DEFAULT_STUDENTS);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"schedule" | "students" | "journal">("schedule");
  const [mounted, setMounted] = useState(false);
  const modalMouseDownRef = useRef<EventTarget | null>(null);

  // Состояние создания нового урока
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creatingLesson, setCreatingLesson] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Поля формы создания урока (выбор или ручной ввод)
  const [newTitle, setNewTitle] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState(DEFAULT_SUBJECTS[0].id);
  const [isCustomSubject, setIsCustomSubject] = useState(false);
  const [customSubjectName, setCustomSubjectName] = useState("");

  const [selectedStudentId, setSelectedStudentId] = useState(DEFAULT_STUDENTS[0].id);
  const [isCustomStudent, setIsCustomStudent] = useState(false);
  const [customStudentName, setCustomStudentName] = useState("");

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
  const [reportSuccessToast, setReportSuccessToast] = useState(false);

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

  // Загрузка уроков (через API с объединением Supabase и заметок, с фоллбеком)
  const fetchLessons = async () => {
    try {
      // 1. Запрашиваем через серверный API, который объединяет базу Supabase и заметки уроков
      const res = await fetchWithAuth("/api/lessons");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const enriched = data.map((l: any) => {
            let notes = l.notes || [];
            if (!notes || notes.length === 0) {
              try {
                const raw = localStorage.getItem(`ayda_lesson_notes_${l.id}`);
                if (raw) notes = JSON.parse(raw);
              } catch (e) {}
            }
            return {
              ...l,
              status: notes && notes.length > 0 ? "COMPLETED" : l.status,
              notes,
            };
          });
          setLessons(enriched);
          setLoading(false);
          return;
        }
      }

      // 2. Прямой запрос к Supabase, если API вернул пустоту
      const client = getSupabase();
      if (client) {
        const { data: sbLessons, error: sbError } = await client
          .from("lessons")
          .select(`
            id,
            title,
            start_time,
            end_time,
            status,
            room_name,
            subject_id,
            teacher_id,
            student_id,
            subjects:subject_id (name, color),
            teacher:teacher_id (name, avatar_url),
            student:student_id (name, avatar_url)
          `)
          .order("start_time", { ascending: false });

        if (!sbError && sbLessons && sbLessons.length > 0) {
          const mapped = sbLessons.map((l: any) => {
            let notes: any[] = [];
            try {
              const raw = localStorage.getItem(`ayda_lesson_notes_${l.id}`);
              if (raw) notes = JSON.parse(raw);
            } catch (e) {}
            return {
              id: l.id,
              title: l.title,
              subjectId: l.subject_id,
              subjectName: l.subjects?.name || "Предмет",
              subjectColor: l.subjects?.color || "#2563eb",
              teacherId: l.teacher_id,
              teacherName: l.teacher?.name || "Преподаватель",
              teacherAvatar: l.teacher?.avatar_url,
              studentId: l.student_id,
              studentName: l.student?.name || "Ученик",
              studentAvatar: l.student?.avatar_url,
              startTime: l.start_time,
              endTime: l.end_time,
              status: notes && notes.length > 0 ? "COMPLETED" : l.status,
              roomName: l.room_name,
              notes,
            };
          });
          setLessons(mapped);
          setLoading(false);
          return;
        }
      }

      setLessons([]);
    } catch (err) {
      console.error("Ошибка загрузки уроков:", err);
    } finally {
      setLoading(false);
    }
  };

  // Первичная загрузка данных из Supabase: профиль, предметы, ученики
  useEffect(() => {
    // Подтягиваем из локального хранилища в первую очередь
    const applyLocalProfile = () => {
      try {
        const saved =
          localStorage.getItem("ayda_profile_teacher") ||
          localStorage.getItem("ayda_current_user_profile");
        if (saved) {
          const p = JSON.parse(saved);
          if (p.name) setTeacherName(p.name);
          if (p.avatarUrl) setTeacherAvatar(p.avatarUrl);
          if (p.subjects) setTeacherSubjects(p.subjects);
          if (p.experience) setTeacherExperience(p.experience);
          if (p.education) setTeacherEducation(p.education);
          if (p.bio) setTeacherBio(p.bio);
          if (p.phone) setTeacherPhone(p.phone);
          if (p.email) setTeacherEmail(p.email);
          return true;
        }
      } catch (e) {}
      return false;
    };

    const hasLocal = applyLocalProfile();

    const client = getSupabase();
    if (client) {
      // 1. Профиль учителя из Supabase
      client
        .from("profiles")
        .select("*")
        .eq("role", "TEACHER")
        .order("created_at", { ascending: true })
        .limit(1)
        .then(({ data }) => {
          if (data && data.length > 0) {
            const p = data[0];
            setTeacherId(p.id);

            // Если пользователь уже редактировал профиль локально, не затираем его имя и аватар
            if (!hasLocal) {
              if (p.name) setTeacherName(p.name);
              if (p.avatar_url) setTeacherAvatar(p.avatar_url);
              if (p.email) setTeacherEmail(p.email);
              if (p.phone) setTeacherPhone(p.phone);

              let parsed: any = {};
              try {
                if (p.bio && p.bio.startsWith("{")) parsed = JSON.parse(p.bio);
                else if (p.bio) parsed.bio = p.bio;
              } catch (e) {}

              if (parsed.subjects) setTeacherSubjects(parsed.subjects);
              if (parsed.experience) setTeacherExperience(parsed.experience);
              if (parsed.education) setTeacherEducation(parsed.education);
              if (parsed.bio) setTeacherBio(parsed.bio);
            }
          }
        });

      client.auth.getUser().then(({ data }) => {
        if (data?.user?.user_metadata?.full_name) {
          setTeacherName(data.user.user_metadata.full_name);
        }
        if (data?.user?.user_metadata?.avatar_url) {
          setTeacherAvatar(data.user.user_metadata.avatar_url);
        }
      });

      // 2. Предметы школы из Supabase
      client
        .from("subjects")
        .select("id, name, color")
        .order("name", { ascending: true })
        .then(({ data }) => {
          if (data && data.length > 0) {
            setSubjects(data);
            setSelectedSubjectId(data[0].id);
          }
        });

      // 3. Список учеников напрямую из Supabase
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
            if (mappedStudents.length > 0) {
              setSelectedStudentId(mappedStudents[0].id);
            }
          }
        });
    }

    // Слушатель событий обновления профиля
    const handleProfileUpdate = (e: any) => {
      const p = e.detail;
      if (p) {
        const r = (p.role || "").toUpperCase();
        if (!r || r === "TEACHER") {
          if (p.name) setTeacherName(p.name);
          if (p.avatarUrl !== undefined) setTeacherAvatar(p.avatarUrl);
          if (p.subjects) setTeacherSubjects(p.subjects);
          if (p.experience) setTeacherExperience(p.experience);
          if (p.education) setTeacherEducation(p.education);
          if (p.bio) setTeacherBio(p.bio);
          if (p.phone) setTeacherPhone(p.phone);
          if (p.email) setTeacherEmail(p.email);
        }
      }
    };
    window.addEventListener("ayda:profile-updated", handleProfileUpdate);

    // Слушатель событий обновления уроков
    const handleLessonsUpdate = () => {
      fetchLessons();
    };
    window.addEventListener("ayda:lessons-updated", handleLessonsUpdate);

    fetchLessons();

    return () => {
      window.removeEventListener("ayda:profile-updated", handleProfileUpdate);
      window.removeEventListener("ayda:lessons-updated", handleLessonsUpdate);
    };
  }, []);

  // Открытие модалки создания урока (с возможностью предвыбора ученика)
  const handleOpenCreateModal = (studentId?: string) => {
    if (studentId) {
      setSelectedStudentId(studentId);
      setIsCustomStudent(false);
    } else {
      setIsCustomStudent(false);
      setCustomStudentName("");
    }
    setNewTitle("");
    setIsCustomSubject(false);
    setCustomSubjectName("");
    setLessonRoomName(`room-${Math.random().toString(36).substring(2, 8)}`);
    setCreateError(null);
    setCreateSuccess(false);
    setCreateModalOpen(true);
  };

  // Отправка формы создания урока с гарантированным сохранением в Supabase
  const handleCreateLessonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setCreateError("Пожалуйста, введите название урока.");
      return;
    }

    setCreatingLesson(true);
    setCreateError(null);

    const client = getSupabase();

    // 1. Определение учебного предмета
    let finalSubjectName = "";
    let finalSubjectId = "";
    let finalSubjectColor = "#2563eb";

    if (isCustomSubject) {
      if (!customSubjectName.trim()) {
        setCreateError("Пожалуйста, введите или выберите учебный предмет.");
        setCreatingLesson(false);
        return;
      }
      finalSubjectName = customSubjectName.trim();
      const match = subjects.find(
        (s) => s.name.toLowerCase() === finalSubjectName.toLowerCase()
      );
      if (match) {
        finalSubjectId = match.id;
        finalSubjectColor = match.color;
      } else {
        // Создаем предмет в Supabase
        const newSubId = crypto.randomUUID();
        finalSubjectId = newSubId;
        finalSubjectColor = "#2563eb";
        if (client) {
          try {
            await client.from("subjects").insert({
              id: newSubId,
              name: finalSubjectName,
              color: finalSubjectColor,
            });
          } catch (e) {
            console.error("Supabase insert subject error:", e);
          }
        }
        setSubjects((prev) => [
          ...prev,
          { id: finalSubjectId, name: finalSubjectName, color: finalSubjectColor },
        ]);
      }
    } else {
      const subject = subjects.find((s) => s.id === selectedSubjectId);
      finalSubjectId = selectedSubjectId || subjects[0]?.id || "fd8c024a-ff45-40e1-99ea-9afa55e1bf3d";
      finalSubjectName = subject?.name || "Математика и логика";
      finalSubjectColor = subject?.color || "#2563eb";
    }

    // 2. Определение ученика (из Supabase или создание нового профиля в Supabase)
    let finalStudentName = "";
    let finalStudentId = "";

    if (isCustomStudent) {
      if (!customStudentName.trim()) {
        setCreateError("Пожалуйста, введите имя ученика.");
        setCreatingLesson(false);
        return;
      }
      finalStudentName = customStudentName.trim();

      if (client) {
        try {
          const { data: existStudent } = await client
            .from("profiles")
            .select("id, name")
            .eq("role", "STUDENT")
            .ilike("name", finalStudentName)
            .maybeSingle();

          if (existStudent) {
            finalStudentId = existStudent.id;
            finalStudentName = existStudent.name;
          } else {
            // СОЗДАЕМ ПРОФИЛЬ УЧЕНИКА В SUPABASE
            const newStudentId = crypto.randomUUID();
            finalStudentId = newStudentId;

            const newStudentPayload = {
              id: newStudentId,
              name: finalStudentName,
              role: "STUDENT",
              email: `student.${Date.now()}@umnichka.ru`,
              avatar_url: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop&crop=faces",
              bio: JSON.stringify({
                grade: "3 класс",
                school: "АйДаУмничка",
                balance: 8,
                stars: 10,
              }),
            };

            const { error: insStudentErr } = await client
              .from("profiles")
              .insert(newStudentPayload);

            if (insStudentErr) {
              console.error("Supabase insert student profile error:", insStudentErr);
            }

            setStudents((prev) => [
              {
                id: newStudentId,
                name: finalStudentName,
                grade: "3 класс",
                school: "АйДаУмничка",
                avatarUrl: newStudentPayload.avatar_url,
              },
              ...prev,
            ]);
            setSelectedStudentId(newStudentId);
          }
        } catch (e) {
          console.error("Error creating student in Supabase:", e);
        }
      }
    } else {
      const student = students.find((s) => s.id === selectedStudentId);
      finalStudentId = selectedStudentId || students[0]?.id || "2a62e436-f539-4ec5-b3af-a1afabfa0eec";
      finalStudentName = student?.name || "Ученик";
    }

    // 3. Определение реального ID преподавателя
    let currentTeacherId = teacherId;
    const isUuid = (str: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

    if (!currentTeacherId || !isUuid(currentTeacherId)) {
      if (client) {
        try {
          const { data: tProf } = await client
            .from("profiles")
            .select("id")
            .eq("role", "TEACHER")
            .limit(1)
            .maybeSingle();
          currentTeacherId = tProf?.id || "d22f670c-3a38-41cd-95aa-80afdb94eab5";
        } catch {
          currentTeacherId = "d22f670c-3a38-41cd-95aa-80afdb94eab5";
        }
      } else {
        currentTeacherId = "d22f670c-3a38-41cd-95aa-80afdb94eab5";
      }
    }

    // Рассчитываем время начала и окончания в ISO
    const startIso = new Date(`${lessonDate}T${lessonTime}:00`).toISOString();
    const endDate = new Date(new Date(startIso).getTime() + lessonDurationMinutes * 60 * 1000);
    const endIso = endDate.toISOString();
    const roomName = lessonRoomName.trim() || `room-${Date.now()}`;

    // 4. ПРЯМАЯ ЗАПИСЬ УРОКА В SUPABASE
    let savedInSupabase = false;
    if (client) {
      try {
        const { data: insertedLesson, error: insErr } = await client
          .from("lessons")
          .insert({
            title: newTitle.trim(),
            subject_id: finalSubjectId,
            teacher_id: currentTeacherId,
            student_id: finalStudentId,
            start_time: startIso,
            end_time: endIso,
            status: "SCHEDULED",
            room_name: roomName,
          })
          .select();

        if (insErr) {
          console.error("Supabase direct insert lesson error:", insErr);
        } else if (insertedLesson) {
          savedInSupabase = true;
        }
      } catch (err) {
        console.error("Supabase insert lesson exception:", err);
      }
    }

    // Дублируем в API для синхронизации
    try {
      await fetchWithAuth("/api/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          subjectId: finalSubjectId,
          subjectName: finalSubjectName,
          subjectColor: finalSubjectColor,
          teacherId: currentTeacherId,
          teacherName,
          studentId: finalStudentId,
          studentName: finalStudentName,
          startTime: startIso,
          endTime: endIso,
          status: "SCHEDULED",
          roomName: roomName,
        }),
      });
    } catch (e) {
      console.warn("API fallback error:", e);
    }

    // Оповещаем все кабинеты (ученик, родитель) о появлении нового урока
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("ayda:lessons-updated"));
    }

    setCreateSuccess(true);
    await fetchLessons();

    setTimeout(() => {
      setCreateModalOpen(false);
      setCreateSuccess(false);
    }, 1200);

    setCreatingLesson(false);
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

  // Удаление ученика из базы данных Supabase
  const handleDeleteStudent = async (e: React.MouseEvent, studentId: string, studentName: string) => {
    e.stopPropagation();
    if (!confirm(`Вы действительно хотите удалить ученика «${studentName}» из школы?`)) {
      return;
    }

    const client = getSupabase();
    if (client) {
      try {
        // 1. Удаляем привязанные уроки этого ученика из Supabase
        await client.from("lessons").delete().eq("student_id", studentId);

        // 2. Удаляем профиль ученика из profiles
        const { error } = await client.from("profiles").delete().eq("id", studentId);
        if (error) {
          console.error("Supabase delete student error:", error);
          alert("Не удалось удалить ученика из Supabase: " + error.message);
          return;
        }
      } catch (err: any) {
        console.error("Delete student exception:", err);
        alert("Ошибка удаления: " + (err.message || "Не удалось связаться с базой данных"));
        return;
      }
    }

    // 3. Обновляем локальные списки в кабинете
    setStudents((prev) => prev.filter((s) => s.id !== studentId));
    setLessons((prev) => prev.filter((l) => l.studentId !== studentId));

    if (selectedStudentId === studentId) {
      const remaining = students.filter((s) => s.id !== studentId);
      if (remaining.length > 0) {
        setSelectedStudentId(remaining[0].id);
      }
    }

    // 4. Оповещаем другие вкладки и кабинеты
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("ayda:students-updated"));
      window.dispatchEvent(new CustomEvent("ayda:lessons-updated"));
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
      let savedLocal: any = null;
      try {
        const raw = localStorage.getItem(`ayda_lesson_notes_${lesson.id}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            savedLocal = parsed[parsed.length - 1];
          }
        }
      } catch (e) {}

      if (savedLocal) {
        setNoteContent(savedLocal.content || "");
        setGrade(savedLocal.grade || 5);
        setFeedback(savedLocal.feedback || "");
      } else {
        setNoteContent("");
        setGrade(5);
        setFeedback("");
      }
    }
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLessonForNote || !noteContent.trim()) return;
    setSavingNote(true);

    const targetLessonId = selectedLessonForNote.id;
    const newNote = {
      id: "note-" + Date.now(),
      lessonId: targetLessonId,
      authorId: teacherId || "d22f670c-3a38-41cd-95aa-80afdb94eab5",
      authorName: teacherName,
      content: noteContent.trim(),
      grade,
      feedback: feedback.trim(),
      createdAt: new Date().toISOString(),
    };

    // 1. Мгновенное оптимистичное обновление состояния карточки/кнопки
    setLessons((prev) =>
      prev.map((l) =>
        l.id === targetLessonId
          ? {
              ...l,
              status: "COMPLETED",
              notes: [newNote],
            }
          : l
      )
    );

    // 2. Сохраняем в localStorage для мгновенного доступа в браузере и синхронизации
    try {
      localStorage.setItem(`ayda_lesson_notes_${targetLessonId}`, JSON.stringify([newNote]));
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("ayda:report-saved", {
            detail: { lessonId: targetLessonId, note: newNote },
          })
        );
      }
    } catch (e) {}

    try {
      // 3. Отправляем на бэкенд
      await fetchWithAuth(`/api/lessons/${targetLessonId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: noteContent.trim(),
          grade,
          feedback: feedback.trim(),
        }),
      });

      setSelectedLessonForNote(null);
      setNoteContent("");
      setFeedback("");
      setReportSuccessToast(true);
      setTimeout(() => setReportSuccessToast(false), 3500);
      fetchLessons();
    } catch (err) {
      console.error("Ошибка сохранения отчёта:", err);
      setSelectedLessonForNote(null);
    } finally {
      setSavingNote(false);
    }
  };

  const liveLessons = lessons.filter((l) => l.status === "LIVE");
  const upcomingLessons = lessons.filter((l) => l.status === "SCHEDULED");
  const completedLessons = lessons.filter((l) => l.status === "COMPLETED");

  return (
    <div className="space-y-6 pb-20">
      {/* 1. ГЛАВНАЯ КАРТОЧКА ПРЕПОДАВАТЕЛЯ В СТИЛЕ FOXFORD */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm relative overflow-hidden">
        {/* Декоративное свечение */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full blur-2xl opacity-60 pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="relative group">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-white shadow-lg ring-4 ring-blue-50 bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-2xl">
                {teacherAvatar ? (
                  <img
                    src={teacherAvatar}
                    alt={teacherName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  teacherName.charAt(0).toUpperCase()
                )}
              </div>
              <button
                type="button"
                onClick={() => setEditProfileModalOpen(true)}
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-blue-600 hover:bg-blue-700 text-white border-2 border-white flex items-center justify-center text-xs shadow-xs cursor-pointer transition active:scale-95"
                title="Сменить фото / редактировать профиль"
              >
                <Edit3 className="w-3 h-3" />
              </button>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  {teacherName}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                  Преподаватель
                </span>
                <button
                  type="button"
                  onClick={() => setEditProfileModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-bold transition border border-slate-200 hover:border-blue-200 cursor-pointer shadow-2xs active:scale-95"
                  title="Редактировать профиль и сменить фото"
                >
                  <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Редактировать</span>
                </button>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>{teacherSubjects || "Математика и логика"}</span>
                <span>•</span>
                <span>{teacherExperience || "Стаж 12 лет"}</span>
                <span>•</span>
                <span>Онлайн-школа «АйДаУмничка»</span>
              </p>
            </div>
          </div>

          {/* Информационные виджеты */}
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
              href={`/room/${liveLessons[0].id || liveLessons[0].roomName}?role=teacher`}
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
          { id: "schedule" as const, label: "Расписание и уроки", icon: Calendar, badge: lessons.length },
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

      {/* 4. ВКЛАДКА 1: РАСПИСАНИЕ И УРОКИ (СЕТКА + СПИСОК) */}
      {activeTab === "schedule" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Расписание и учебные занятия
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Просматривайте занятия по дням недели в сетке или переключайтесь на общий список уроков
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
            onCreateLesson={() => handleOpenCreateModal()}
          />
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
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold text-lg flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                          {st.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-extrabold text-slate-900 text-sm sm:text-base leading-tight truncate">
                            {st.name}
                          </h3>
                          <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800">
                            {st.grade}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleDeleteStudent(e, st.id, st.name)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer shrink-0"
                        title={`Удалить ученика «${st.name}»`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenCreateModal(st.id)}
                      className="flex-1 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition border border-blue-200/80 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Назначить урок</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteStudent(e, st.id, st.name)}
                      className="p-2.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition cursor-pointer active:scale-95"
                      title={`Удалить ученика «${st.name}»`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
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
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer self-start sm:self-auto ${
                        lesson.notes && lesson.notes.length > 0
                          ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : "bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80"
                      }`}
                    >
                      {lesson.notes && lesson.notes.length > 0 ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Изменить отчёт</span>
                        </>
                      ) : (
                        <>
                          <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                          <span>Написать отчёт</span>
                        </>
                      )}
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
          onMouseDown={(e) => {
            modalMouseDownRef.current = e.target;
          }}
          onMouseUp={(e) => {
            if (modalMouseDownRef.current === e.currentTarget && e.target === e.currentTarget) {
              setCreateModalOpen(false);
            }
            modalMouseDownRef.current = null;
          }}
          className="fixed inset-0 z-[100] w-screen h-screen min-h-screen bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto relative animate-in fade-in zoom-in-95 duration-150"
          >
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

              {/* Выбор или ввод предмета */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Учебный предмет:
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomSubject(!isCustomSubject);
                      if (!isCustomSubject && !customSubjectName) {
                        const cur = subjects.find((s) => s.id === selectedSubjectId);
                        if (cur) setCustomSubjectName(cur.name);
                      }
                    }}
                    className="text-[11px] text-blue-600 font-bold hover:text-blue-800 transition inline-flex items-center gap-1 cursor-pointer"
                  >
                    {isCustomSubject ? "📋 Выбрать из списка" : "✏️ Вписать свой предмет"}
                  </button>
                </div>

                {isCustomSubject ? (
                  <div className="space-y-1">
                    <input
                      type="text"
                      required
                      value={customSubjectName}
                      onChange={(e) => setCustomSubjectName(e.target.value)}
                      placeholder="Например: Ментальная арифметика, Шахматы, Немецкий"
                      list="subjects-datalist"
                      className="w-full p-3 rounded-2xl border-2 border-blue-500 text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-600 bg-blue-50/20 shadow-2xs"
                      autoFocus
                    />
                    <datalist id="subjects-datalist">
                      {subjects.map((sub) => (
                        <option key={sub.id} value={sub.name} />
                      ))}
                    </datalist>
                    <p className="text-[10px] text-slate-400">
                      Введите название предмета или выберите подсказку
                    </p>
                  </div>
                ) : (
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => {
                      if (e.target.value === "__custom__") {
                        setIsCustomSubject(true);
                      } else {
                        setSelectedSubjectId(e.target.value);
                      }
                    }}
                    className="w-full p-3 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-600 bg-white"
                  >
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                    <option value="__custom__">✏️ Вписать свой предмет вручную...</option>
                  </select>
                )}
              </div>

              {/* Выбор или ввод ученика */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Ученик:
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomStudent(!isCustomStudent);
                      if (!isCustomStudent && !customStudentName) {
                        const cur = students.find((s) => s.id === selectedStudentId);
                        if (cur) setCustomStudentName(cur.name);
                      }
                    }}
                    className="text-[11px] text-blue-600 font-bold hover:text-blue-800 transition inline-flex items-center gap-1 cursor-pointer"
                  >
                    {isCustomStudent ? "📋 Выбрать из списка" : "✏️ Вписать имя ученика"}
                  </button>
                </div>

                {isCustomStudent ? (
                  <div className="space-y-1">
                    <input
                      type="text"
                      required
                      value={customStudentName}
                      onChange={(e) => setCustomStudentName(e.target.value)}
                      placeholder="Например: Иван Смирнов (3 класс) или Михаил"
                      list="students-datalist"
                      className="w-full p-3 rounded-2xl border-2 border-blue-500 text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-600 bg-blue-50/20 shadow-2xs"
                      autoFocus
                    />
                    <datalist id="students-datalist">
                      {students.map((st) => (
                        <option key={st.id} value={st.name} />
                      ))}
                    </datalist>
                    <p className="text-[10px] text-slate-400">
                      Введите имя ученика или выберите из подсказок
                    </p>
                  </div>
                ) : (
                  <select
                    value={selectedStudentId}
                    onChange={(e) => {
                      if (e.target.value === "__custom__") {
                        setIsCustomStudent(true);
                      } else {
                        setSelectedStudentId(e.target.value);
                      }
                    }}
                    className="w-full p-3 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-600 bg-white"
                  >
                    {students.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} {st.grade ? `(${st.grade})` : ""}
                      </option>
                    ))}
                    <option value="__custom__">✏️ Вписать имя нового ученика вручную...</option>
                  </select>
                )}
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
          onMouseDown={(e) => {
            modalMouseDownRef.current = e.target;
          }}
          onMouseUp={(e) => {
            if (modalMouseDownRef.current === e.currentTarget && e.target === e.currentTarget) {
              setSelectedLessonForNote(null);
            }
            modalMouseDownRef.current = null;
          }}
          className="fixed inset-0 z-[100] w-screen h-screen min-h-screen bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto relative animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {selectedLessonForNote.notes && selectedLessonForNote.notes.length > 0
                    ? "Редактирование отчёта по уроку"
                    : "Отчёт по проведённому уроку"}
                </h3>
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
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition disabled:opacity-50 cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  {savingNote ? (
                    "Отправка..."
                  ) : selectedLessonForNote.notes && selectedLessonForNote.notes.length > 0 ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Сохранить изменения</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Отправить отчёт родителям</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Тост подтверждения отправки отчёта */}
      {reportSuccessToast && mounted && createPortal(
        <div className="fixed bottom-6 right-6 z-[120] bg-emerald-600 text-white px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
          <div className="text-xs">
            <p className="font-bold text-sm">Отчёт успешно отправлен!</p>
            <p className="text-emerald-100 mt-0.5">Информация мгновенно отображается в кабинете родителя</p>
          </div>
        </div>,
        document.body
      )}

      {/* Модальное окно редактирования профиля преподавателя */}
      <EditProfileModal
        isOpen={editProfileModalOpen}
        onClose={() => setEditProfileModalOpen(false)}
        defaultRole="TEACHER"
        initialProfile={{
          id: teacherId,
          name: teacherName,
          avatarUrl: teacherAvatar,
          subjects: teacherSubjects,
          experience: teacherExperience,
          education: teacherEducation,
          bio: teacherBio,
          phone: teacherPhone,
          email: teacherEmail,
          role: "TEACHER",
        }}
        onProfileUpdated={(upd) => {
          if (upd.name) setTeacherName(upd.name);
          if (upd.avatarUrl !== undefined) setTeacherAvatar(upd.avatarUrl);
          if (upd.subjects) setTeacherSubjects(upd.subjects);
          if (upd.experience) setTeacherExperience(upd.experience);
          if (upd.education) setTeacherEducation(upd.education);
          if (upd.bio) setTeacherBio(upd.bio);
          if (upd.phone) setTeacherPhone(upd.phone);
          if (upd.email) setTeacherEmail(upd.email);
        }}
      />
    </div>
  );
}
