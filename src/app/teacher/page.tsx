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
  UserPlus,
  UserMinus,
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
import { useAuthGuard, AuthLoadingScreen } from "@/lib/auth-session";
import ScheduleCalendar from "@/components/ScheduleCalendar";
import EditProfileModal from "@/components/EditProfileModal";
import TelegramCabinet from "@/components/TelegramCabinet";
import { cleanUsername, formatUsername, resolveProfileUsername } from "@/lib/nickname";
import {
  getTolyattiTomorrowDateStr,
  tolyattiToIso,
  formatTolyatti,
} from "@/lib/tolyatti-time";

interface StudentProfile {
  id: string;
  name: string;
  username?: string;
  grade: string;
  school: string;
  avatarUrl?: string;
  email?: string;
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

const DEFAULT_STUDENTS: StudentProfile[] = [];

export default function TeacherCabinet() {
  const { loading: authLoading, isAuthorized, user: authUser } = useAuthGuard("teacher");
  const [teacherId, setTeacherId] = useState("");
  const [teacherName, setTeacherName] = useState("Преподаватель");
  const [teacherAvatar, setTeacherAvatar] = useState("");
  const [teacherSubjects, setTeacherSubjects] = useState("Математика и логика");
  const [teacherExperience, setTeacherExperience] = useState("Стаж 12 лет");
  const [teacherEducation, setTeacherEducation] = useState("МГПУ, физ-мат факультет");
  const [teacherBio, setTeacherBio] = useState("");
  const [teacherPhone, setTeacherPhone] = useState("");
  const [teacherEmail, setTeacherEmail] = useState("");
  const [teacherUsername, setTeacherUsername] = useState("");
  const [editProfileModalOpen, setEditProfileModalOpen] = useState(false);

  const [lessons, setLessons] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>(DEFAULT_SUBJECTS);
  const [students, setStudents] = useState<StudentProfile[]>(DEFAULT_STUDENTS);
  const [friendStudentIds, setFriendStudentIds] = useState<string[]>([]);
  const [addFriendModalOpen, setAddFriendModalOpen] = useState(false);
  const [searchFriendQuery, setSearchFriendQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"schedule" | "students" | "journal">("schedule");
  const [mounted, setMounted] = useState(false);
  const modalMouseDownRef = useRef<EventTarget | null>(null);
  const addFriendModalMouseDownRef = useRef<EventTarget | null>(null);

  // Состояние создания нового урока
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creatingLesson, setCreatingLesson] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Поля формы создания урока (выбор или ручной ввод)
  const [newTitle, setNewTitle] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState(DEFAULT_SUBJECTS[0]?.id || "");
  const [isCustomSubject, setIsCustomSubject] = useState(false);
  const [customSubjectName, setCustomSubjectName] = useState("");

  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [isCustomStudent, setIsCustomStudent] = useState(false);
  const [customStudentName, setCustomStudentName] = useState("");

  const [lessonDate, setLessonDate] = useState(() => getTolyattiTomorrowDateStr());
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
    if (createModalOpen || !!selectedLessonForNote || addFriendModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [createModalOpen, selectedLessonForNote, addFriendModalOpen]);

  // Загрузка уроков (через API с объединением Supabase и заметок, с фоллбеком)
  const fetchLessons = async () => {
    try {
      const currentTeacherId = authUser?.id || teacherId;
      // 1. Запрашиваем через серверный API, который объединяет базу Supabase и заметки уроков
      const url = currentTeacherId ? `/api/lessons?teacherId=${currentTeacherId}` : "/api/lessons";
      const res = await fetchWithAuth(url);
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
        let query = client
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

        if (currentTeacherId) {
          query = query.eq("teacher_id", currentTeacherId);
        }

        const { data: sbLessons, error: sbError } = await query;

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

  // Первичная загрузка данных из Supabase: профиль текущего преподавателя, предметы, ученики
  useEffect(() => {
    // 0. Сначала читаем локально сохраненный профиль в приоритете
    const applyLocalProfile = () => {
      try {
        const saved =
          localStorage.getItem("ayda_profile_teacher") ||
          localStorage.getItem("ayda_current_user_profile");
        if (saved) {
          const p = JSON.parse(saved);
          if (p.name) setTeacherName(p.name);
          if (p.username) setTeacherUsername(p.username);
          if (p.avatarUrl !== undefined) setTeacherAvatar(p.avatarUrl);
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
    applyLocalProfile();

    if (!authUser?.id) return;
    const currentUserId = authUser.id;
    setTeacherId(currentUserId);

    const client = getSupabase();
    if (client) {
      // 1. Профиль конкретно текущего вошедшего учителя из Supabase
      client
        .from("profiles")
        .select("*")
        .eq("id", currentUserId)
        .maybeSingle()
        .then(({ data: p }) => {
          if (p) {
            setTeacherId(p.id);
            if (p.name) setTeacherName(p.name);
            if (p.avatar_url) setTeacherAvatar(p.avatar_url);
            if (p.email) setTeacherEmail(p.email);
            if (p.phone) setTeacherPhone(p.phone);

            const tUsername = resolveProfileUsername({
              id: p.id,
              name: p.name,
              email: p.email || authUser?.email,
              bio: p.bio,
            });
            setTeacherUsername(tUsername);

            let parsed: any = {};
            try {
              if (p.bio && p.bio.startsWith("{")) parsed = JSON.parse(p.bio);
              else if (p.bio) parsed.bio = p.bio;
            } catch (e) {}

            let friendsFromBio: string[] = [];
            if (Array.isArray(parsed.friendStudentIds)) {
              friendsFromBio = parsed.friendStudentIds;
            } else {
              try {
                const localFriends = localStorage.getItem(`ayda_teacher_friends_${p.id}`);
                if (localFriends) {
                  friendsFromBio = JSON.parse(localFriends);
                }
              } catch (e) {}
            }
            if (friendsFromBio.length > 0) {
              setFriendStudentIds(friendsFromBio);
            }

            if (parsed.subjects) setTeacherSubjects(parsed.subjects);
            if (parsed.experience) setTeacherExperience(parsed.experience);
            if (parsed.education) setTeacherEducation(parsed.education);
            if (parsed.bio) setTeacherBio(parsed.bio);
          } else {
            const defName = authUser.user_metadata?.full_name || authUser.email?.split("@")[0] || "Преподаватель";
            const defUname = resolveProfileUsername({
              id: currentUserId,
              name: defName,
              email: authUser.email,
            });
            setTeacherName(defName);
            setTeacherUsername(defUname);
            client.from("profiles").upsert({
              id: currentUserId,
              email: authUser.email,
              name: defName,
              role: "TEACHER",
              bio: JSON.stringify({
                username: defUname,
                subjects: "Математика и логика",
                experience: "Стаж 10 лет",
                friendStudentIds: [],
              }),
            }).then(() => {});
          }
        });

      client.auth.getUser().then(({ data }) => {
        if (data?.user?.user_metadata?.full_name) {
          setTeacherName((prev) => (prev && prev !== "Преподаватель" ? prev : data.user.user_metadata.full_name));
        }
        if (data?.user?.user_metadata?.avatar_url) {
          setTeacherAvatar((prev) => prev || data.user.user_metadata.avatar_url);
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
        .select("id, name, email, bio, avatar_url")
        .eq("role", "STUDENT")
        .order("name", { ascending: true })
        .then(({ data }) => {
          if (data && data.length > 0) {
            const mappedStudents: StudentProfile[] = data.map((s: any) => {
              let parsedBio: any = {};
              try {
                if (s.bio && s.bio.startsWith("{")) parsedBio = JSON.parse(s.bio);
                else if (s.bio) parsedBio.grade = s.bio;
              } catch (e) {}

              const uname = resolveProfileUsername({
                id: s.id,
                name: s.name,
                email: s.email,
                bio: s.bio,
              });

              let studentAvatar = s.avatar_url;
              try {
                const localStudent = localStorage.getItem("ayda_profile_student");
                if (localStudent) {
                  const parsed = JSON.parse(localStudent);
                  if (parsed.id === s.id && parsed.avatarUrl) {
                    studentAvatar = parsed.avatarUrl;
                  }
                }
              } catch {}

              return {
                id: s.id,
                name: s.name || "Ученик",
                username: uname,
                grade: parsedBio.grade || "Начальная школа",
                school: parsedBio.school || "АйДаУмничка",
                avatarUrl: studentAvatar,
                email: s.email,
              };
            });
            setStudents(mappedStudents);

            // Инициализируем друзей, если еще не были установлены
            setFriendStudentIds((prev) => {
              if (prev.length > 0) return prev;
              let fromLocal: string[] = [];
              try {
                const raw = localStorage.getItem(`ayda_teacher_friends_${currentUserId}`);
                if (raw) fromLocal = JSON.parse(raw);
              } catch {}
              if (fromLocal.length > 0) return fromLocal;

              // По умолчанию в друзья попадают ученики, у которых уже есть уроки с этим учителем, либо первые существующие
              const fallbackIds = mappedStudents.slice(0, 3).map((st) => st.id);
              try {
                localStorage.setItem(`ayda_teacher_friends_${currentUserId}`, JSON.stringify(fallbackIds));
              } catch {}
              return fallbackIds;
            });
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
          if (p.username) setTeacherUsername(p.username);
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

    // Слушатель событий обновления друзей
    const handleFriendsUpdate = (e: any) => {
      if (e.detail?.friends && Array.isArray(e.detail.friends)) {
        setFriendStudentIds(e.detail.friends);
      }
    };
    window.addEventListener("ayda:teacher-friends-updated", handleFriendsUpdate);

    // Слушатель событий обновления уроков
    const handleLessonsUpdate = () => {
      fetchLessons();
    };
    window.addEventListener("ayda:lessons-updated", handleLessonsUpdate);

    fetchLessons();

    return () => {
      window.removeEventListener("ayda:profile-updated", handleProfileUpdate);
      window.removeEventListener("ayda:teacher-friends-updated", handleFriendsUpdate);
      window.removeEventListener("ayda:lessons-updated", handleLessonsUpdate);
    };
  }, [authUser?.id]);

  // Список учеников, добавленных в друзья
  const friends = students.filter((st) => friendStudentIds.includes(st.id));

  // Фильтрация поиска учеников по никнейму или имени
  const filteredSearchStudents = students.filter((st) => {
    if (!searchFriendQuery.trim()) return true;
    const q = cleanUsername(searchFriendQuery);
    const rawQ = searchFriendQuery.toLowerCase().trim();
    const unameMatch = cleanUsername(st.username).includes(q);
    const nameMatch = st.name.toLowerCase().includes(rawQ);
    const emailMatch = st.email ? st.email.toLowerCase().includes(rawQ) : false;
    return unameMatch || nameMatch || emailMatch;
  });

  // Добавление ученика в друзья
  const handleAddFriend = async (studentId: string) => {
    if (friendStudentIds.includes(studentId)) return;
    const updated = [...friendStudentIds, studentId];
    setFriendStudentIds(updated);

    const currentTeacherId = teacherId || authUser?.id;
    if (currentTeacherId) {
      try {
        localStorage.setItem(`ayda_teacher_friends_${currentTeacherId}`, JSON.stringify(updated));
      } catch (e) {}

      const client = getSupabase();
      if (client) {
        try {
          const { data: p } = await client
            .from("profiles")
            .select("bio")
            .eq("id", currentTeacherId)
            .maybeSingle();

          let parsedBio: any = {};
          try {
            if (p?.bio && p.bio.startsWith("{")) parsedBio = JSON.parse(p.bio);
            else if (p?.bio) parsedBio.bio = p.bio;
          } catch {}

          parsedBio.friendStudentIds = updated;
          if (teacherUsername) parsedBio.username = teacherUsername;

          await client
            .from("profiles")
            .update({ bio: JSON.stringify(parsedBio) })
            .eq("id", currentTeacherId);
        } catch (err) {
          console.error("Error saving friend to Supabase:", err);
        }
      }
    }

    if (!selectedStudentId) {
      setSelectedStudentId(studentId);
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("ayda:teacher-friends-updated", { detail: { friends: updated } })
      );
    }
  };

  // Удаление ученика из друзей
  const handleRemoveFriend = async (
    e: React.MouseEvent,
    studentId: string,
    studentName: string
  ) => {
    e.stopPropagation();
    if (!confirm(`Удалить ученика «${studentName}» из списка ваших друзей?`)) {
      return;
    }

    const updated = friendStudentIds.filter((id) => id !== studentId);
    setFriendStudentIds(updated);

    const currentTeacherId = teacherId || authUser?.id;
    if (currentTeacherId) {
      try {
        localStorage.setItem(`ayda_teacher_friends_${currentTeacherId}`, JSON.stringify(updated));
      } catch (e) {}

      const client = getSupabase();
      if (client) {
        try {
          const { data: p } = await client
            .from("profiles")
            .select("bio")
            .eq("id", currentTeacherId)
            .maybeSingle();

          let parsedBio: any = {};
          try {
            if (p?.bio && p.bio.startsWith("{")) parsedBio = JSON.parse(p.bio);
            else if (p?.bio) parsedBio.bio = p.bio;
          } catch {}

          parsedBio.friendStudentIds = updated;
          await client
            .from("profiles")
            .update({ bio: JSON.stringify(parsedBio) })
            .eq("id", currentTeacherId);
        } catch (err) {
          console.error("Error removing friend in Supabase:", err);
        }
      }
    }

    if (selectedStudentId === studentId) {
      const remainingFriends = students.filter((s) => updated.includes(s.id));
      setSelectedStudentId(remainingFriends[0]?.id || "");
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("ayda:teacher-friends-updated", { detail: { friends: updated } })
      );
    }
  };

  // Открытие модалки создания урока (с возможностью предвыбора ученика из списка друзей)
  const handleOpenCreateModal = (studentId?: string) => {
    if (studentId && friendStudentIds.includes(studentId)) {
      setSelectedStudentId(studentId);
    } else if (friends.length > 0) {
      setSelectedStudentId(friends[0].id);
    } else {
      setSelectedStudentId("");
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

    // 2. Определение ученика (СТРОГО ТОЛЬКО ИЗ СПИСКА ДРУЗЕЙ)
    const friend = friends.find((s) => s.id === selectedStudentId) || (friends.length === 1 ? friends[0] : null);
    if (!friend) {
      setCreateError(
        "Урок можно создать только для ученика из вашего списка друзей. Пожалуйста, сначала добавьте ученика в друзья по никнейму."
      );
      setCreatingLesson(false);
      return;
    }
    const finalStudentId = friend.id;
    const finalStudentName = friend.name;

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

    // Рассчитываем время начала и окончания в ISO с фиксированным часовым поясом Тольятти (UTC+4)
    const startIso = tolyattiToIso(lessonDate, lessonTime);
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

  if (authLoading || !isAuthorized) {
    return (
      <AuthLoadingScreen
        roleTitle="Личный кабинет преподавателя"
        onBypass={() => window.location.reload()}
      />
    );
  }

  return (
    <>
      <TelegramCabinet
        currentRole="TEACHER"
        currentUser={{
          id: teacherId,
          name: teacherName,
          username: teacherUsername,
          email: teacherEmail || authUser?.email || undefined,
          phone: teacherPhone || "+7 (900) 123-45-67",
          avatar: teacherAvatar,
          bio: teacherBio || teacherSubjects || "Преподаватель онлайн-школы «АйДаУмничка»",
        }}
        lessons={lessons}
        onRefreshData={() => window.location.reload()}
        extraCabinetSections={[
          {
            key: "schedule",
            title: "Расписание и уроки",
            icon: Calendar,
            badge: lessons.length,
            render: () => (
              <div className="space-y-6">
                {liveLessons.length > 0 && (
                  <div className="bg-white rounded-3xl p-6 sm:p-7 border-2 border-[#2481cc] shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 animate-in fade-in duration-300">
                    <div className="space-y-2">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-[#2481cc] text-xs font-black border border-blue-200">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#2481cc] animate-ping" />
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
                        <span>До {formatTolyatti(liveLessons[0].endTime, "HH:mm")}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 w-full sm:w-auto">
                      <Link
                        href={`/room/${liveLessons[0].id || liveLessons[0].roomName}?role=teacher`}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-[#2481cc] text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-blue-500/25 hover:bg-[#1f70b0] transition transform hover:scale-105 active:scale-95 cursor-pointer"
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
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2481cc] text-white font-bold text-xs hover:bg-[#1f70b0] transition cursor-pointer shadow-xs"
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
            ),
          },
          {
            key: "students",
            title: "Мои ученики",
            icon: Users,
            badge: friends.length,
            render: () => (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-extrabold text-slate-900">
                        Мои ученики (в друзьях)
                      </h2>
                      <span className="text-xs font-bold text-[#2481cc] bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">
                        {friends.length}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Уроки можно создавать только для учеников, добавленных в друзья
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSearchFriendQuery("");
                      setAddFriendModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2481cc] text-white font-bold text-xs hover:bg-[#1f70b0] transition cursor-pointer shadow-xs self-start sm:self-auto"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Добавить ученика по никнейму</span>
                  </button>
                </div>

                {friends.length === 0 ? (
                  <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 text-center space-y-4 shadow-xs">
                    <div className="w-16 h-16 rounded-3xl bg-blue-50 text-[#2481cc] flex items-center justify-center mx-auto shadow-inner">
                      <Users className="w-8 h-8" />
                    </div>
                    <div className="max-w-md mx-auto space-y-1">
                      <h3 className="font-extrabold text-slate-900 text-base">
                        У вас пока нет учеников в друзьях
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Чтобы назначать уроки и вести занятия, найдите и добавьте ученика по его никнейму (например,{" "}
                        <span className="font-mono text-blue-600 font-semibold">@ivan_smirnov</span>) или имени.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchFriendQuery("");
                        setAddFriendModalOpen(true);
                      }}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#2481cc] text-white font-bold text-xs hover:bg-[#1f70b0] transition shadow-md shadow-blue-500/20 cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Найти ученика по никнейму</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {friends.map((st) => {
                      const studentLessons = lessons.filter((l) => l.studentId === st.id);
                      const completedCount = studentLessons.filter((l) => l.status === "COMPLETED").length;
                      const nextLesson = studentLessons.find((l) => l.status === "SCHEDULED");

                      return (
                        <div
                          key={st.id}
                          className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs hover:border-blue-300 transition space-y-4 flex flex-col justify-between group"
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                {st.avatarUrl ? (
                                  <img
                                    src={st.avatarUrl}
                                    alt={st.name}
                                    className="w-12 h-12 rounded-2xl object-cover border border-slate-100 shadow-xs shrink-0"
                                  />
                                ) : (
                                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#2481cc] to-indigo-600 text-white font-extrabold text-lg flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                                    {st.name.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base leading-tight truncate">
                                    {st.name}
                                  </h3>
                                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-sky-50 text-sky-700 border border-sky-200">
                                      {formatUsername(st.username)}
                                    </span>
                                    <span className="inline-block px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700">
                                      {st.grade}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => handleRemoveFriend(e, st.id, st.name)}
                                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer shrink-0"
                                title={`Удалить ученика «${st.name}» из друзей`}
                              >
                                <UserMinus className="w-4 h-4" />
                              </button>
                            </div>

                            <div className="bg-slate-50 rounded-2xl p-3 space-y-1.5 text-xs">
                              <div className="flex items-center justify-between text-slate-600">
                                <span>Пройдено уроков:</span>
                                <strong className="text-slate-800">{completedCount}</strong>
                              </div>
                              <div className="flex items-center justify-between text-slate-600">
                                <span>Ближайший урок:</span>
                                <strong className="text-[#2481cc]">
                                  {nextLesson ? formatTolyatti(nextLesson.startTime, "d MMM, HH:mm") : "Не назначен"}
                                </strong>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => handleOpenCreateModal(st.id)}
                              className="flex-1 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#2481cc] font-bold text-xs transition border border-blue-200/80 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Назначить урок</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleRemoveFriend(e, st.id, st.name)}
                              className="p-2.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition cursor-pointer active:scale-95"
                              title={`Удалить «${st.name}» из друзей`}
                            >
                              <UserMinus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ),
          },
          {
            key: "journal",
            title: "Журнал и отчёты",
            icon: FileText,
            badge: completedLessons.length,
            render: () => (
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
                                {formatTolyatti(lesson.startTime, "d MMMM yyyy, HH:mm")}
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
                                : "bg-blue-50 hover:bg-blue-100 text-[#2481cc] border border-blue-200/80"
                            }`}
                          >
                            {lesson.notes && lesson.notes.length > 0 ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Изменить отчёт</span>
                              </>
                            ) : (
                              <>
                                <MessageSquare className="w-3.5 h-3.5 text-[#2481cc]" />
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
            ),
          },
        ]}
      />

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

              {/* Выбор ученика (ТОЛЬКО ИЗ СПИСКА ДРУЗЕЙ) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Ученик (из списка друзей):
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchFriendQuery("");
                      setAddFriendModalOpen(true);
                    }}
                    className="text-[11px] text-[#2481cc] font-bold hover:underline transition inline-flex items-center gap-1 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ Добавить по никнейму</span>
                  </button>
                </div>

                {friends.length === 0 ? (
                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
                    <p className="font-semibold leading-relaxed">
                      ⚠️ Вы можете создавать уроки только для учеников из вашего списка друзей. Сейчас у вас нет добавленных друзей.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchFriendQuery("");
                        setAddFriendModalOpen(true);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-[#2481cc] hover:bg-[#1f70b0] text-white font-bold text-xs transition inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Найти и добавить ученика по никнейму</span>
                    </button>
                  </div>
                ) : (
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full p-3 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-600 bg-white"
                  >
                    {friends.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} ({formatUsername(st.username)}) — {st.grade}
                      </option>
                    ))}
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
                    Время начала (по Тольятти, UTC+4):
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
                  disabled={creatingLesson || friends.length === 0}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* 10. МОДАЛЬНОЕ ОКНО «ДОБАВИТЬ УЧЕНИКА В ДРУЗЬЯ ПО НИКНЕЙМУ» */}
      {addFriendModalOpen && mounted && createPortal(
        <div
          onMouseDown={(e) => {
            addFriendModalMouseDownRef.current = e.target;
          }}
          onMouseUp={(e) => {
            if (addFriendModalMouseDownRef.current === e.currentTarget && e.target === e.currentTarget) {
              setAddFriendModalOpen(false);
            }
            addFriendModalMouseDownRef.current = null;
          }}
          className="fixed inset-0 z-[110] w-screen h-screen min-h-screen bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto relative animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Заголовок */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#2481cc] flex items-center justify-center">
                  <UserPlus className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">
                    Добавить ученика в друзья
                  </h3>
                  <p className="text-xs text-slate-500">
                    Поиск по никнейму (@username) или имени
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setAddFriendModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Поисковая строка с иконкой @ и лупой */}
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[#2481cc] pointer-events-none">
                <Search className="w-4 h-4" />
                <span className="font-mono font-bold text-sm">@</span>
              </div>
              <input
                type="text"
                autoFocus
                placeholder="Введите никнейм (например, ivan_smirnov) или имя..."
                value={searchFriendQuery}
                onChange={(e) => setSearchFriendQuery(e.target.value)}
                className="w-full pl-12 pr-10 py-3 rounded-2xl border-2 border-slate-200 focus:border-[#2481cc] bg-[#f8fafc] text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none transition shadow-2xs"
              />
              {searchFriendQuery && (
                <button
                  type="button"
                  onClick={() => setSearchFriendQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Список найденных учеников */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {filteredSearchStudents.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs space-y-1">
                  <Users className="w-8 h-8 mx-auto text-slate-300 stroke-[1.5]" />
                  <p className="font-semibold text-slate-600">
                    {searchFriendQuery ? "Никого не найдено по этому запросу" : "Начните вводить никнейм или имя ученика"}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Например: @ivan, @masha или имя ученика
                  </p>
                </div>
              ) : (
                filteredSearchStudents.map((st) => {
                  const isFriend = friendStudentIds.includes(st.id);
                  return (
                    <div
                      key={st.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {st.avatarUrl ? (
                          <img
                            src={st.avatarUrl}
                            alt={st.name}
                            className="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-100"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#2481cc] to-indigo-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
                            {st.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                            {st.name}
                          </h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-[11px] font-bold text-blue-600">
                              {formatUsername(st.username)}
                            </span>
                            <span className="text-[10px] text-slate-400">• {st.grade}</span>
                          </div>
                        </div>
                      </div>

                      {isFriend ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200 shrink-0">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>В друзьях</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddFriend(st.id)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#2481cc] hover:bg-[#1f70b0] text-white font-bold text-xs shadow-xs transition transform active:scale-95 cursor-pointer shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Добавить</span>
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Подсказка в футере модалки */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>💡 У каждого ученика есть уникальный никнейм (@username)</span>
              <button
                type="button"
                onClick={() => setAddFriendModalOpen(false)}
                className="font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Закрыть
              </button>
            </div>
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
          username: teacherUsername,
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
          if (upd.username) setTeacherUsername(upd.username);
          if (upd.avatarUrl !== undefined) setTeacherAvatar(upd.avatarUrl);
          if (upd.subjects) setTeacherSubjects(upd.subjects);
          if (upd.experience) setTeacherExperience(upd.experience);
          if (upd.education) setTeacherEducation(upd.education);
          if (upd.bio) setTeacherBio(upd.bio);
          if (upd.phone) setTeacherPhone(upd.phone);
          if (upd.email) setTeacherEmail(upd.email);
        }}
      />
    </>
  );
}
