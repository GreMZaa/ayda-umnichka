"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  Download,
  Loader2,
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
  getTolyattiTodayDateStr,
  getTolyattiTomorrowDateStr,
  tolyattiToIso,
  formatTolyatti,
} from "@/lib/tolyatti-time";
import { DEFAULT_STUDENT_LESSONS } from "@/lib/default-lessons";
import { TEACHER_VASILINA_AVATAR } from "@/lib/default-avatar";

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

export interface ColleagueProfile {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
  email?: string;
  subjects?: string;
  experience?: string;
  education?: string;
  bio?: string;
}

const isUuid = (str: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

const AVAILABLE_TEACHER_AWARDS = [
  { id: "five", title: "Первая пятёрка", icon: "⭐", desc: "Высший балл и отличная работа на уроке" },
  { id: "math", title: "Знаток математики", icon: "📐", desc: "Успешно решил блок сложных задач и уравнений" },
  { id: "lang", title: "Грамотей", icon: "✍️", desc: "Безупречная грамотность и аккуратность" },
  { id: "eng", title: "English Speaker", icon: "🇬🇧", desc: "Уверенный диалог на английском языке" },
  { id: "effort", title: "Супер-старание", icon: "🚀", desc: "Высокая активность и настойчивость в учёбе" },
  { id: "curious", title: "Пытливый ум", icon: "💡", desc: "Интересные вопросы и глубокое понимание темы" },
  { id: "punctual", title: "100% пунктуальность", icon: "⏱️", desc: "Вовремя на уроке и полная собранность" },
];

export default function TeacherCabinet() {
  const { loading: authLoading, isAuthorized, user: authUser } = useAuthGuard("teacher");
  const [teacherId, setTeacherId] = useState("882042e2-d020-426c-9826-9fba5b23ad2e");
  const [teacherName, setTeacherName] = useState("Шаронова Василина Владимировна");
  const [teacherAvatar, setTeacherAvatar] = useState(TEACHER_VASILINA_AVATAR);
  const [teacherSubjects, setTeacherSubjects] = useState("Математика и логика");
  const [teacherExperience, setTeacherExperience] = useState("Стаж 12 лет");
  const [teacherEducation, setTeacherEducation] = useState("МГПУ, физ-мат факультет");
  const [teacherBio, setTeacherBio] = useState("");
  const [teacherPhone, setTeacherPhone] = useState("");
  const [teacherEmail, setTeacherEmail] = useState("");
  const [teacherUsername, setTeacherUsername] = useState("");
  const [editProfileModalOpen, setEditProfileModalOpen] = useState(false);

  const [lessons, setLessons] = useState<any[]>(DEFAULT_STUDENT_LESSONS);
  const [subjects, setSubjects] = useState<SubjectItem[]>(DEFAULT_SUBJECTS);
  const [students, setStudents] = useState<StudentProfile[]>(DEFAULT_STUDENTS);
  const [friendStudentIds, setFriendStudentIds] = useState<string[]>([]);
  const [addFriendModalOpen, setAddFriendModalOpen] = useState(false);
  const [searchFriendQuery, setSearchFriendQuery] = useState("");
  const [addStudentTab, setAddStudentTab] = useState<"create" | "search">("create");
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentGrade, setNewStudentGrade] = useState("1 класс");
  const [newStudentPhone, setNewStudentPhone] = useState("");
  const [newStudentUsername, setNewStudentUsername] = useState("");
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [creatingStudent, setCreatingStudent] = useState(false);
  const [createStudentError, setCreateStudentError] = useState<string | null>(null);
  const [studentCreatedToast, setStudentCreatedToast] = useState<string | null>(null);
  const [colleagues, setColleagues] = useState<ColleagueProfile[]>([]);
  const [friendTeacherIds, setFriendTeacherIds] = useState<string[]>([]);
  const [addColleagueModalOpen, setAddColleagueModalOpen] = useState(false);
  const [searchColleagueQuery, setSearchColleagueQuery] = useState("");
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
  const [lessonCreatedModal, setLessonCreatedModal] = useState<{
    title: string;
    studentName: string;
    subjectName: string;
    timeFormatted: string;
    roomName: string;
  } | null>(null);

  // Поля формы создания урока (выбор или ручной ввод)
  const [newTitle, setNewTitle] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState(DEFAULT_SUBJECTS[0]?.id || "");
  const [isCustomSubject, setIsCustomSubject] = useState(false);
  const [customSubjectName, setCustomSubjectName] = useState("");

  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [isCustomStudent, setIsCustomStudent] = useState(false);
  const [customStudentName, setCustomStudentName] = useState("");

  const [lessonDate, setLessonDate] = useState(() => getTolyattiTodayDateStr());
  const [lessonTime, setLessonTime] = useState("16:00");
  const [lessonDurationMinutes, setLessonDurationMinutes] = useState(45);
  const [lessonRoomName, setLessonRoomName] = useState(() => `room-${Math.random().toString(36).substring(2, 8)}`);

  // Состояние отчёта по уроку
  const [selectedLessonForNote, setSelectedLessonForNote] = useState<any | null>(null);
  const [noteContent, setNoteContent] = useState("");
  const [grade, setGrade] = useState<number>(5);
  const [selectedAward, setSelectedAward] = useState<string>("");
  const [feedback, setFeedback] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [reportSuccessToast, setReportSuccessToast] = useState(false);

  // Состояние проверки домашних заданий учеников (P0.2)
  const [homeworkSubmissions, setHomeworkSubmissions] = useState<any[]>([]);
  const [selectedHwForReview, setSelectedHwForReview] = useState<any | null>(null);
  const [hwReviewModalOpen, setHwReviewModalOpen] = useState(false);
  const [hwGrade, setHwGrade] = useState<number>(5);
  const [hwFeedback, setHwFeedback] = useState<string>("");
  const [savingHwReview, setSavingHwReview] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Блокировка скролла страницы при открытых модалках
  useEffect(() => {
    if (createModalOpen || !!selectedLessonForNote || addFriendModalOpen || !!lessonCreatedModal) {
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
            const isPast = l.endTime ? new Date(l.endTime).getTime() <= Date.now() : false;
            return {
              ...l,
              status: l.status === "COMPLETED" ? "COMPLETED" : (notes && notes.length > 0 && isPast ? "COMPLETED" : l.status),
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

        if (!sbError && sbLessons) {
          if (sbLessons.length > 0) {
            const mapped = sbLessons.map((l: any) => {
              let notes: any[] = [];
              try {
                const raw = localStorage.getItem(`ayda_lesson_notes_${l.id}`);
                if (raw) notes = JSON.parse(raw);
              } catch (e) {}
              const isPast = l.end_time ? new Date(l.end_time).getTime() <= Date.now() : false;
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
                status: l.status === "COMPLETED" ? "COMPLETED" : (notes && notes.length > 0 && isPast ? "COMPLETED" : l.status),
                roomName: l.room_name,
                notes,
              };
            });
            setLessons(mapped);
            setLoading(false);
            return;
          } else {
            try {
              localStorage.removeItem("ayda_latest_lessons");
            } catch (e) {}
            setLessons((prev) => (prev && prev.length > 0 ? prev : DEFAULT_STUDENT_LESSONS));
            setLoading(false);
            return;
          }
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
        const savedAvatar = localStorage.getItem("ayda_avatar_teacher");
        if (savedAvatar) {
          setTeacherAvatar(savedAvatar);
        }

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
            const savedAvatar = localStorage.getItem("ayda_avatar_teacher");
            if (savedAvatar) {
              setTeacherAvatar(savedAvatar);
            } else if (p.avatar_url) {
              setTeacherAvatar(p.avatar_url);
            }
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

            let friendTeachersFromBio: string[] = [];
            if (Array.isArray(parsed.friendTeacherIds)) {
              friendTeachersFromBio = parsed.friendTeacherIds;
            } else {
              try {
                const local = localStorage.getItem(`ayda_teacher_colleagues_${p.id}`);
                if (local) friendTeachersFromBio = JSON.parse(local);
              } catch (e) {}
            }
            if (friendTeachersFromBio.length > 0) {
              setFriendTeacherIds(friendTeachersFromBio);
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

      // 3. Список учеников напрямую из API и Supabase
      fetch("/api/users/search?role=STUDENT")
        .then((r) => r.json())
        .then((resData) => {
          if (resData?.success && Array.isArray(resData.users) && resData.users.length > 0) {
            const mappedStudents: StudentProfile[] = resData.users.map((s: any) => ({
              id: s.id,
              name: s.name || "Ученик",
              username: s.username,
              grade: s.grade || "Начальная школа",
              school: s.school || "АйДаУмничка",
              avatarUrl: s.avatarUrl,
              email: s.email,
            }));
            setStudents(mappedStudents);
          }
        })
        .catch(() => {});

      fetch("/api/users/search?role=TEACHER")
        .then((r) => r.json())
        .then((resData) => {
          if (resData?.success && Array.isArray(resData.users) && resData.users.length > 0) {
            const mappedColleagues: ColleagueProfile[] = resData.users
              .filter((t: any) => t.id !== currentUserId)
              .map((t: any) => ({
                id: t.id,
                name: t.name || "Преподаватель школы",
                username: t.username,
                avatarUrl: t.avatarUrl,
                email: t.email,
                subjects: t.subjects || "Все дисциплины школы",
                experience: t.experience || "Стаж более 5 лет",
                education: t.education || "Высшее образование",
                bio: t.bio || "",
              }));
            setColleagues(mappedColleagues);
          }
        })
        .catch(() => {});

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

      // 4. Список других преподавателей (коллег) из Supabase
      client
        .from("profiles")
        .select("id, name, email, bio, avatar_url")
        .eq("role", "TEACHER")
        .order("name", { ascending: true })
        .then(({ data }) => {
          if (data && data.length > 0) {
            const mappedColleagues: ColleagueProfile[] = data
              .filter((t: any) => t.id !== currentUserId)
              .map((t: any) => {
                let parsedBio: any = {};
                try {
                  if (t.bio && t.bio.startsWith("{")) parsedBio = JSON.parse(t.bio);
                  else if (t.bio) parsedBio.bio = t.bio;
                } catch (e) {}

                const uname = resolveProfileUsername({
                  id: t.id,
                  name: t.name,
                  email: t.email,
                  bio: t.bio,
                });

                return {
                  id: t.id,
                  name: t.name || "Преподаватель школы",
                  username: uname,
                  avatarUrl: t.avatar_url,
                  email: t.email,
                  subjects: parsedBio.subjects || "Все дисциплины школы",
                  experience: parsedBio.experience || "Стаж более 5 лет",
                  education: parsedBio.education || "Высшее образование",
                  bio: parsedBio.bio || "",
                };
              });
            setColleagues(mappedColleagues);
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

    // Слушатель событий обновления друзей-учеников
    const handleFriendsUpdate = (e: any) => {
      if (e.detail?.friends && Array.isArray(e.detail.friends)) {
        setFriendStudentIds(e.detail.friends);
      }
    };
    window.addEventListener("ayda:teacher-friends-updated", handleFriendsUpdate);

    // Слушатель событий обновления друзей-коллег
    const handleColleaguesUpdate = (e: any) => {
      if (e.detail?.friends && Array.isArray(e.detail.friends)) {
        setFriendTeacherIds(e.detail.friends);
      }
    };
    window.addEventListener("ayda:teacher-colleagues-updated", handleColleaguesUpdate);

    // Слушатель событий обновления уроков
    const handleLessonsUpdate = () => {
      fetchLessons();
    };
    window.addEventListener("ayda:lessons-updated", handleLessonsUpdate);

    fetchLessons();

    return () => {
      window.removeEventListener("ayda:profile-updated", handleProfileUpdate);
      window.removeEventListener("ayda:teacher-friends-updated", handleFriendsUpdate);
      window.removeEventListener("ayda:teacher-colleagues-updated", handleColleaguesUpdate);
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

  // Создание нового ученика и прикрепление к учителю
  const handleCreateStudent = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedName = newStudentName.trim();
    if (!trimmedName) {
      setCreateStudentError("Пожалуйста, введите имя и фамилию ученика");
      return;
    }

    setCreatingStudent(true);
    setCreateStudentError(null);

    try {
      const studentId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `st-${Date.now()}`;

      const generatedUsername =
        cleanUsername(newStudentUsername) ||
        resolveProfileUsername({ id: studentId, name: trimmedName });

      const bioData = {
        grade: newStudentGrade || "1 класс",
        school: "АйДаУмничка",
        username: generatedUsername,
        parentPhone: newStudentPhone.trim() || undefined,
        teacherId: teacherId || authUser?.id,
      };

      const newStudentProfile: StudentProfile = {
        id: studentId,
        name: trimmedName,
        username: generatedUsername,
        grade: newStudentGrade || "1 класс",
        school: "АйДаУмничка",
      };

      const client = getSupabase();
      if (client) {
        try {
          const { error } = await client.from("profiles").insert({
            id: studentId,
            name: trimmedName,
            role: "STUDENT",
            bio: JSON.stringify(bioData),
          });
          if (error) {
            console.warn("Supabase insert student warning:", error);
          }
        } catch (dbErr) {
          console.warn("DB insert exception:", dbErr);
        }
      }

      // Добавляем в локальный список учеников
      setStudents((prev) => {
        if (prev.some((s) => s.id === studentId)) return prev;
        return [newStudentProfile, ...prev];
      });

      // Прикрепляем к учителю
      const currentTeacherId = teacherId || authUser?.id;
      const updatedFriends = friendStudentIds.includes(studentId)
        ? friendStudentIds
        : [...friendStudentIds, studentId];

      setFriendStudentIds(updatedFriends);

      if (currentTeacherId) {
        try {
          localStorage.setItem(
            `ayda_teacher_friends_${currentTeacherId}`,
            JSON.stringify(updatedFriends)
          );
        } catch (e) {}

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

            parsedBio.friendStudentIds = updatedFriends;
            if (teacherUsername) parsedBio.username = teacherUsername;

            await client
              .from("profiles")
              .update({ bio: JSON.stringify(parsedBio) })
              .eq("id", currentTeacherId);
          } catch (err) {
            console.error("Error updating teacher friends in Supabase:", err);
          }
        }
      }

      // Сразу выбираем нового ученика для формы создания урока
      setSelectedStudentId(studentId);

      // Сбрасываем поля формы создания
      setNewStudentName("");
      setNewStudentPhone("");
      setNewStudentUsername("");
      setUsernameTouched(false);
      setNewStudentGrade("1 класс");
      setAddFriendModalOpen(false);

      // Оповещаем другие компоненты
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("ayda:teacher-friends-updated", { detail: { friends: updatedFriends } })
        );
        window.dispatchEvent(new CustomEvent("ayda:students-updated"));
      }

      setStudentCreatedToast(`Ученик «${trimmedName}» успешно добавлен и прикреплён!`);
      setTimeout(() => setStudentCreatedToast(null), 4000);
    } catch (err: any) {
      console.error("Failed to create student:", err);
      setCreateStudentError(err?.message || "Не удалось создать ученика. Попробуйте еще раз.");
    } finally {
      setCreatingStudent(false);
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

  // Добавление коллеги-преподавателя в друзья
  const handleAddColleagueFriend = async (colleagueId: string) => {
    if (friendTeacherIds.includes(colleagueId)) return;
    const updated = [...friendTeacherIds, colleagueId];
    setFriendTeacherIds(updated);

    try {
      localStorage.setItem(`ayda_teacher_colleagues_${teacherId}`, JSON.stringify(updated));
    } catch (e) {}

    const client = getSupabase();
    if (client && teacherId && isUuid(teacherId)) {
      try {
        const { data: current } = await client
          .from("profiles")
          .select("bio")
          .eq("id", teacherId)
          .maybeSingle();
        let parsedBio: any = {};
        try {
          if (current?.bio && current.bio.startsWith("{")) parsedBio = JSON.parse(current.bio);
          else if (current?.bio) parsedBio.bio = current.bio;
        } catch (e) {}

        parsedBio.friendTeacherIds = updated;
        await client
          .from("profiles")
          .update({ bio: JSON.stringify(parsedBio) })
          .eq("id", teacherId);
      } catch (err) {
        console.error("Error saving colleague friend to Supabase:", err);
      }

      // Взаимная привязка для коллеги:
      if (isUuid(colleagueId)) {
        try {
          const { data: cProf } = await client
            .from("profiles")
            .select("bio")
            .eq("id", colleagueId)
            .maybeSingle();
          if (cProf) {
            let cBio: any = {};
            try {
              if (cProf.bio && cProf.bio.startsWith("{")) cBio = JSON.parse(cProf.bio);
            } catch (e) {}
            const curFriends = Array.isArray(cBio.friendTeacherIds) ? cBio.friendTeacherIds : [];
            if (!curFriends.includes(teacherId)) {
              cBio.friendTeacherIds = [...curFriends, teacherId];
              await client.from("profiles").update({ bio: JSON.stringify(cBio) }).eq("id", colleagueId);
            }
          }
        } catch (e) {}
      }
    }

    try {
      window.dispatchEvent(
        new CustomEvent("ayda:teacher-colleagues-updated", { detail: { friends: updated } })
      );
    } catch (e) {}
  };

  // Удаление коллеги из друзей
  const handleRemoveColleagueFriend = async (colleagueId: string) => {
    const updated = friendTeacherIds.filter((id) => id !== colleagueId);
    setFriendTeacherIds(updated);

    try {
      localStorage.setItem(`ayda_teacher_colleagues_${teacherId}`, JSON.stringify(updated));
    } catch (e) {}

    const client = getSupabase();
    if (client && teacherId && isUuid(teacherId)) {
      try {
        const { data: current } = await client
          .from("profiles")
          .select("bio")
          .eq("id", teacherId)
          .maybeSingle();
        let parsedBio: any = {};
        try {
          if (current?.bio && current.bio.startsWith("{")) parsedBio = JSON.parse(current.bio);
          else if (current?.bio) parsedBio.bio = current.bio;
        } catch (e) {}

        parsedBio.friendTeacherIds = updated;
        await client
          .from("profiles")
          .update({ bio: JSON.stringify(parsedBio) })
          .eq("id", teacherId);
      } catch (err) {
        console.error("Error removing colleague friend in Supabase:", err);
      }
    }

    try {
      window.dispatchEvent(
        new CustomEvent("ayda:teacher-colleagues-updated", { detail: { friends: updated } })
      );
    } catch (e) {}
  };

  const friendColleagues = colleagues.filter((t) => friendTeacherIds.includes(t.id));

  const filteredSearchColleagues = colleagues.filter((t) => {
    if (!searchColleagueQuery.trim()) return true;
    const q = searchColleagueQuery.toLowerCase().trim().replace(/^@/, "");
    return (
      t.name.toLowerCase().includes(q) ||
      t.username.toLowerCase().includes(q) ||
      (t.subjects && t.subjects.toLowerCase().includes(q)) ||
      (t.bio && t.bio.toLowerCase().includes(q))
    );
  });

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
    setLessonDate(getTolyattiTodayDateStr());
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
          currentTeacherId = tProf?.id || "882042e2-d020-426c-9826-9fba5b23ad2e";
        } catch {
          currentTeacherId = "882042e2-d020-426c-9826-9fba5b23ad2e";
        }
      } else {
        currentTeacherId = "882042e2-d020-426c-9826-9fba5b23ad2e";
      }
    }

    // Рассчитываем время начала и окончания в ISO с фиксированным часовым поясом Тольятти (UTC+4)
    const startIso = tolyattiToIso(lessonDate, lessonTime);
    const endDate = new Date(new Date(startIso).getTime() + lessonDurationMinutes * 60 * 1000);
    const endIso = endDate.toISOString();
    const roomName = lessonRoomName.trim() || `room-${Date.now()}`;

    // 3. ПРОВЕРКА КОЛЛИЗИЙ РАСПИСАНИЯ ПЕРЕД СОЗДАНИЕМ (P1.3)
    const newStartMs = new Date(startIso).getTime();
    const newEndMs = new Date(endIso).getTime();

    // Проверяем локальные уроки в стейте учителя
    const existingConflict = lessons.find((l) => {
      if (l.status === "CANCELLED") return false;
      const lStart = new Date(l.startTime).getTime();
      const lEnd = new Date(l.endTime).getTime();
      return lStart < newEndMs && lEnd > newStartMs;
    });

    if (existingConflict) {
      setCreateError(
        `Коллизия расписания: на это время уже запланирован урок «${existingConflict.title}». Пожалуйста, выберите другое время.`
      );
      setCreatingLesson(false);
      return;
    }

    // 4. ПРЯМАЯ ЗАПИСЬ УРОКА В SUPABASE
    let savedInSupabase = false;
    if (client) {
      try {
        // Проверяем коллизии в Supabase
        const { data: sbConflicts } = await client
          .from("lessons")
          .select("id, title, start_time, end_time, teacher_id, student_id")
          .neq("status", "CANCELLED")
          .or(`teacher_id.eq.${currentTeacherId},student_id.eq.${finalStudentId}`);

        const sbConflict = sbConflicts?.find((ex: any) => {
          const exStart = new Date(ex.start_time).getTime();
          const exEnd = new Date(ex.end_time).getTime();
          return exStart < newEndMs && exEnd > newStartMs;
        });

        if (sbConflict) {
          setCreateError(
            `Коллизия в базе данных: уже запланирован урок «${sbConflict.title}». Пожалуйста, выберите другое время.`
          );
          setCreatingLesson(false);
          return;
        }

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

    // Сохраняем в локальное хранилище для мгновенной синхронизации с кабинетом ученика
    try {
      const localLessons = localStorage.getItem("ayda_latest_lessons");
      const list = localLessons ? JSON.parse(localLessons) : [];
      const newL = {
        id: `loc-${Date.now()}`,
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
      };
      localStorage.setItem(
        "ayda_latest_lessons",
        JSON.stringify([newL, ...list.filter((x: any) => x.id !== newL.id)])
      );
    } catch (e) {}

    // Оповещаем все кабинеты (ученик, родитель) о появлении нового урока
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("ayda:lessons-updated"));
    }

    await fetchLessons();

    // Сразу закрываем форму создания и показываем окно подтверждения
    setCreateModalOpen(false);
    setCreatingLesson(false);

    let formattedTime = "";
    try {
      formattedTime = formatTolyatti(startIso, "d MMMM (EEEE) в HH:mm");
    } catch {
      formattedTime = `${lessonDate} в ${lessonTime}`;
    }

    setLessonCreatedModal({
      title: newTitle.trim(),
      studentName: finalStudentName,
      subjectName: finalSubjectName,
      timeFormatted: formattedTime,
      roomName: roomName,
    });
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

  // Продление урока на 30 минут (для учителя)
  const handleExtendLesson = async (lessonId: string, minutes: number = 30) => {
    try {
      await fetchWithAuth(`/api/lessons/${lessonId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extendMinutes: minutes }),
      });
      await fetchLessons();
    } catch (err) {
      console.error("Ошибка продления урока:", err);
      alert("Не удалось продлить урок. Попробуйте еще раз.");
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
      setSelectedAward(lastNote.award || "");
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
        setSelectedAward(savedLocal.award || "");
      } else {
        setNoteContent("");
        setGrade(5);
        setFeedback("");
        setSelectedAward("");
      }
    }
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLessonForNote || !noteContent.trim()) return;
    setSavingNote(true);

    const targetLessonId = selectedLessonForNote.id;
    const foundAward = AVAILABLE_TEACHER_AWARDS.find((a) => a.title === selectedAward);
    const newNote = {
      id: "note-" + Date.now(),
      lessonId: targetLessonId,
      authorId: teacherId || "882042e2-d020-426c-9826-9fba5b23ad2e",
      authorName: teacherName,
      content: noteContent.trim(),
      grade,
      feedback: feedback.trim(),
      award: foundAward?.title || undefined,
      awardIcon: foundAward?.icon || undefined,
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
          award: foundAward?.title || undefined,
          awardIcon: foundAward?.icon || undefined,
        }),
      });

      setSelectedLessonForNote(null);
      setNoteContent("");
      setFeedback("");
      setSelectedAward("");
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

  // Загрузка домашних заданий учеников из /api/homework (P0.2)
  const loadHomeworkSubmissions = useCallback(async () => {
    try {
      const res = await fetchWithAuth("/api/homework");
      if (res.ok) {
        const data = await res.json();
        if (data?.submissions && Array.isArray(data.submissions)) {
          setHomeworkSubmissions(data.submissions);
        }
      }
    } catch (e) {
      console.warn("Could not load homework submissions:", e);
    }
  }, []);

  useEffect(() => {
    loadHomeworkSubmissions();
    const interval = setInterval(loadHomeworkSubmissions, 15000);
    return () => clearInterval(interval);
  }, [loadHomeworkSubmissions]);

  const handleOpenHwReview = (sub: any) => {
    setSelectedHwForReview(sub);
    setHwGrade(sub.grade || 5);
    setHwFeedback(sub.teacherFeedback || "");
    setHwReviewModalOpen(true);
  };

  const handleSaveHwReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHwForReview) return;
    setSavingHwReview(true);
    try {
      const res = await fetchWithAuth("/api/homework", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: selectedHwForReview.id,
          grade: hwGrade,
          teacherFeedback: hwFeedback.trim(),
        }),
      });
      if (res.ok) {
        setHomeworkSubmissions((prev) =>
          prev.map((h) =>
            h.id === selectedHwForReview.id
              ? { ...h, grade: hwGrade, teacherFeedback: hwFeedback.trim(), status: "CHECKED" }
              : h
          )
        );
        setHwReviewModalOpen(false);
      } else {
        const data = await res.json();
        alert(data.error || "Ошибка сохранения оценки.");
      }
    } catch (err: any) {
      alert("Ошибка: " + err?.message);
    } finally {
      setSavingHwReview(false);
    }
  };

  const liveLessons = lessons.filter((l) => l.status === "LIVE");
  const upcomingLessons = lessons.filter((l) => l.status === "SCHEDULED");
  const completedLessons = lessons.filter((l) => l.status === "COMPLETED");
  const pendingHwCount = homeworkSubmissions.filter((h) => h.status !== "CHECKED").length;

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
        friendStudents={friends}
        friendTeachers={friendColleagues}
        onRefreshData={() => window.location.reload()}
        onProfileUpdated={(upd) => {
          if (upd.avatarUrl) setTeacherAvatar(upd.avatarUrl);
          if (upd.name) setTeacherName(upd.name);
          if (upd.username) setTeacherUsername(upd.username);
        }}
        extraCabinetSections={[
          {
            key: "schedule",
            title: "Расписание и уроки",
            icon: Calendar,
            badge: upcomingLessons.length > 0 ? upcomingLessons.length : undefined,
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
                      <button
                        type="button"
                        onClick={() => handleExtendLesson(liveLessons[0].id, 30)}
                        className="px-4 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-sm shadow-amber-500/20"
                        title="Продлить урок на 30 минут"
                      >
                        <Clock className="w-4 h-4" />
                        <span>+30 мин</span>
                      </button>
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

                <ScheduleCalendar
                  role="teacher"
                  lessons={lessons}
                  onUpdateStatus={handleUpdateStatus}
                  onOpenReportModal={handleOpenReportModal}
                  onCreateLesson={() => handleOpenCreateModal()}
                  onExtendLesson={handleExtendLesson}
                />
              </div>
            ),
          },
          {
            key: "students",
            title: "Мои ученики",
            icon: Users,
            render: () => (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-extrabold text-slate-900">
                        Мои ученики
                      </h2>
                      <span className="text-xs font-bold text-[#2481cc] bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">
                        {friends.length}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Список прикреплённых учеников для проведения онлайн-уроков
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setAddStudentTab("create");
                      setSearchFriendQuery("");
                      setAddFriendModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2481cc] text-white font-bold text-xs hover:bg-[#1f70b0] transition cursor-pointer shadow-xs self-start sm:self-auto"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>+ Добавить ученика</span>
                  </button>
                </div>

                {friends.length === 0 ? (
                  <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 text-center space-y-4 shadow-xs">
                    <div className="w-16 h-16 rounded-3xl bg-blue-50 text-[#2481cc] flex items-center justify-center mx-auto shadow-inner">
                      <Users className="w-8 h-8" />
                    </div>
                    <div className="max-w-md mx-auto space-y-1">
                      <h3 className="font-extrabold text-slate-900 text-base">
                        У вас пока нет прикреплённых учеников
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Чтобы назначать уроки и вести занятия, создайте нового ученика или найдите его по имени/никнейму.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAddStudentTab("create");
                        setSearchFriendQuery("");
                        setAddFriendModalOpen(true);
                      }}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#2481cc] text-white font-bold text-xs hover:bg-[#1f70b0] transition shadow-md shadow-blue-500/20 cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>+ Добавить ученика</span>
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
            badge: (() => {
              const pendingReportCount = completedLessons.filter((l) => !l.notes || l.notes.length === 0).length;
              return pendingReportCount > 0 ? pendingReportCount : undefined;
            })(),
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
                                  <div className="flex items-center gap-2">
                                    {note.award && (
                                      <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md text-[11px]">
                                        <span>{note.awardIcon || "⭐"}</span>
                                        <span>{note.award}</span>
                                      </span>
                                    )}
                                    {note.grade && (
                                      <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                                        <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                                        Оценка: {note.grade} / 5
                                      </span>
                                    )}
                                  </div>
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
          {
            key: "homework",
            title: "Проверка ДЗ",
            icon: BookOpen,
            badge: pendingHwCount > 0 ? pendingHwCount : undefined,
            render: () => (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">
                      Сданные домашние работы учеников
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Проверяйте решения, прикреплённые сканы и фото тетрадей, выставляйте оценки и пишите отзывы
                    </p>
                  </div>
                  {pendingHwCount > 0 ? (
                    <span className="text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-xl border border-amber-200">
                      Требуют проверки: {pendingHwCount}
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
                      Все ДЗ проверены ✨
                    </span>
                  )}
                </div>

                {homeworkSubmissions.length === 0 ? (
                  <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center space-y-2 shadow-xs">
                    <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
                    <p className="text-xs font-bold text-slate-600">Пока нет сданных домашних заданий</p>
                    <p className="text-[11px] text-slate-400">
                      Когда ученики отправят решения к урокам, они сразу появятся здесь
                    </p>
                  </div>
                ) : (
                  <div className="bg-white rounded-3xl divide-y divide-slate-100 border border-slate-200 shadow-xs overflow-hidden">
                    {homeworkSubmissions.map((sub) => {
                      const isChecked = sub.status === "CHECKED";
                      return (
                        <div key={sub.id} className="p-5 sm:p-6 space-y-3 hover:bg-slate-50/60 transition">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">
                                  {sub.subject}
                                </span>
                                <span className="text-xs text-slate-400">•</span>
                                <span className="text-xs text-slate-500 font-medium">
                                  {sub.submittedAt ? formatTolyatti(sub.submittedAt, "d MMMM, HH:mm") : "Недавно"}
                                </span>
                              </div>
                              <h4 className="font-extrabold text-slate-900 text-base mt-1">{sub.title}</h4>
                              <p className="text-xs text-slate-600 mt-0.5">
                                Ученик: <strong>{sub.studentName}</strong>
                              </p>
                            </div>

                            <div className="flex items-center gap-2 self-start sm:self-auto">
                              {isChecked ? (
                                <span className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5">
                                  <Star className="w-3.5 h-3.5 fill-emerald-500 text-emerald-500" />
                                  <span>Проверено: {sub.grade} / 5</span>
                                </span>
                              ) : (
                                <span className="px-3 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Ожидает проверки</span>
                                </span>
                              )}

                              <button
                                onClick={() => handleOpenHwReview(sub)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs ${
                                  isChecked
                                    ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                                    : "bg-[#2481cc] hover:bg-[#1f70b0] text-white shadow-md shadow-blue-500/20"
                                }`}
                              >
                                {isChecked ? "Изменить оценку" : "Проверить работу"}
                              </button>
                            </div>
                          </div>

                          {/* Ответ ученика */}
                          {sub.studentAnswer && (
                            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-800 space-y-1">
                              <span className="font-bold text-slate-600 block">Ответ ученика:</span>
                              <p className="whitespace-pre-wrap leading-relaxed">{sub.studentAnswer}</p>
                            </div>
                          )}

                          {/* Прикрепленный файл */}
                          {sub.fileUrl && (
                            <div className="flex items-center justify-between p-3 rounded-2xl bg-blue-50/60 border border-blue-100 max-w-md">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-800 truncate">{sub.fileName || "Файл решения"}</p>
                                  <p className="text-[10px] text-slate-500">{sub.fileSize || "Документ"}</p>
                                </div>
                              </div>
                              <a
                                href={sub.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 rounded-xl bg-white hover:bg-blue-100 text-[#2481cc] font-bold text-xs border border-blue-200 shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Открыть</span>
                              </a>
                            </div>
                          )}

                          {/* Отзыв учителя если проверено */}
                          {isChecked && sub.teacherFeedback && (
                            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100 text-xs text-emerald-900 space-y-1">
                              <span className="font-bold flex items-center gap-1 text-emerald-800">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Ваш отзыв ученику:</span>
                              </span>
                              <p className="leading-relaxed">{sub.teacherFeedback}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ),
          },
          {
            key: "colleagues",
            title: "Коллеги",
            icon: GraduationCap,
            render: () => (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-extrabold text-slate-900">
                        Коллеги (преподаватели в друзьях)
                      </h2>
                      <span className="text-xs font-bold text-[#2481cc] bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">
                        {friendColleagues.length}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Общайтесь с коллегами школы, обменивайтесь методическими материалами и опытом
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSearchColleagueQuery("");
                      setAddColleagueModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2481cc] text-white font-bold text-xs hover:bg-[#1f70b0] transition cursor-pointer shadow-xs self-start sm:self-auto active:scale-95"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Добавить коллегу</span>
                  </button>
                </div>

                {friendColleagues.length === 0 ? (
                  <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 text-center space-y-4 shadow-xs">
                    <div className="w-16 h-16 rounded-3xl bg-blue-50 text-[#2481cc] flex items-center justify-center mx-auto shadow-inner">
                      <GraduationCap className="w-8 h-8" />
                    </div>
                    <div className="max-w-md mx-auto space-y-1">
                      <h3 className="font-extrabold text-slate-900 text-base">
                        У вас пока нет коллег в друзьях
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Найдите других преподавателей школы по имени или никнейму, чтобы вести переписку и совместно планировать работу.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchColleagueQuery("");
                        setAddColleagueModalOpen(true);
                      }}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#2481cc] text-white font-bold text-xs hover:bg-[#1f70b0] transition shadow-md shadow-blue-500/20 cursor-pointer active:scale-95"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Найти преподавателя по никнейму</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {friendColleagues.map((t) => (
                      <div
                        key={t.id}
                        className="bg-white rounded-3xl p-5 border border-slate-200 hover:border-blue-200 transition shadow-xs flex flex-col justify-between gap-4"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              {t.avatarUrl ? (
                                <img
                                  src={t.avatarUrl}
                                  alt={t.name}
                                  className="w-12 h-12 rounded-2xl object-cover border border-slate-100 shadow-xs shrink-0"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#2481cc] to-indigo-600 text-white font-extrabold text-lg flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                                  {t.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0">
                                <h3 className="font-extrabold text-slate-900 text-sm sm:text-base leading-tight truncate">
                                  {t.name}
                                </h3>
                                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-sky-50 text-sky-700 border border-sky-200">
                                    {formatUsername(t.username)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveColleagueFriend(t.id)}
                              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer shrink-0"
                              title={`Удалить «${t.name}» из коллег`}
                            >
                              <UserMinus className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="bg-slate-50 rounded-2xl p-3 space-y-1.5 text-xs">
                            <div className="flex items-center justify-between text-slate-600">
                              <span>Предметы:</span>
                              <strong className="text-slate-800 truncate max-w-[160px]">{t.subjects || "Все дисциплины"}</strong>
                            </div>
                            <div className="flex items-center justify-between text-slate-600">
                              <span>Опыт:</span>
                              <strong className="text-slate-800 truncate max-w-[160px]">{t.experience || "Преподаватель школы"}</strong>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => {
                              window.dispatchEvent(
                                new CustomEvent("ayda:open-chat", { detail: { chatId: `teacher-${t.id}` } })
                              );
                            }}
                            className="flex-1 py-2.5 rounded-xl bg-[#2481cc] hover:bg-[#1f70b0] text-white font-bold text-xs transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Написать</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveColleagueFriend(t.id)}
                            className="p-2.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition cursor-pointer active:scale-95"
                            title={`Удалить «${t.name}» из коллег`}
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                        </div>
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
          className="fixed inset-0 z-[100] w-screen h-screen min-h-screen bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
        >
          <div
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-5 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto relative animate-in zoom-in-95 duration-150"
          >
            {/* Заголовок модального окна */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                  <Calendar className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-lg leading-tight">
                    Новое занятие
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Урок появится в расписании ученика и родителя
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition cursor-pointer"
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
                <span>Урок успешно запланирован!</span>
              </div>
            )}

            <form onSubmit={handleCreateLessonSubmit} className="space-y-4">
              {/* 1. Выбор предмета */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
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
                    className="text-[11px] text-blue-600 font-semibold hover:underline cursor-pointer"
                  >
                    {isCustomSubject ? "Выбрать из списка" : "+ Свой предмет"}
                  </button>
                </div>

                {isCustomSubject ? (
                  <input
                    type="text"
                    required
                    value={customSubjectName}
                    onChange={(e) => setCustomSubjectName(e.target.value)}
                    placeholder="Например: Ментальная арифметика, Шахматы"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-blue-400 text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-blue-50/20"
                    autoFocus
                  />
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {subjects.map((sub) => {
                      const isSelected = selectedSubjectId === sub.id;
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => setSelectedSubjectId(sub.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? "bg-blue-600 text-white shadow-xs"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: isSelected ? "#ffffff" : sub.color || "#2563eb" }}
                          />
                          <span>{sub.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 2. Название / тема урока */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Тема урока: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Например: Разбор олимпиадных задач и дробей"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 transition"
                />
              </div>

              {/* 3. Ученик */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Ученик: <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setAddStudentTab("create");
                      setSearchFriendQuery("");
                      setAddFriendModalOpen(true);
                    }}
                    className="text-[11px] text-blue-600 font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ Новый ученик</span>
                  </button>
                </div>

                {friends.length === 0 ? (
                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-3">
                    <p className="font-medium leading-snug">
                      У вас пока нет добавленных учеников. Добавьте ученика для назначения.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setAddStudentTab("create");
                        setSearchFriendQuery("");
                        setAddFriendModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shrink-0"
                    >
                      Добавить
                    </button>
                  </div>
                ) : (
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-600 bg-white"
                  >
                    {friends.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} ({formatUsername(st.username)}) — {st.grade || "Ученик"}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* 4. Дата и время */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Дата занятия:
                  </label>
                  <input
                    type="date"
                    required
                    value={lessonDate}
                    onChange={(e) => setLessonDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-600 bg-white"
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
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-600 bg-white"
                  />
                </div>
              </div>

              {/* 5. Длительность занятия */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Длительность:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "45 мин", val: 45 },
                    { label: "60 мин", val: 60 },
                    { label: "90 мин", val: 90 },
                  ].map((dur) => (
                    <button
                      type="button"
                      key={dur.val}
                      onClick={() => setLessonDurationMinutes(dur.val)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition border cursor-pointer text-center ${
                        lessonDurationMinutes === dur.val
                          ? "bg-blue-600 border-blue-600 text-white shadow-xs"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {dur.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 6. Видеокомната (создаётся автоматически) */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="font-medium">Видеокласс с доской и чатом</span>
                </div>
                <span className="text-[11px] text-slate-400 font-semibold">Автоматически</span>
              </div>

              {/* Кнопки действий */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
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
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creatingLesson ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Создание...</span>
                    </>
                  ) : (
                    <span>Запланировать урок</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* МОДАЛЬНОЕ ОКНО ПОДТВЕРЖДЕНИЯ СОЗДАНИЯ УРОКА */}
      {lessonCreatedModal && mounted && createPortal(
        <div
          onMouseDown={(e) => {
            modalMouseDownRef.current = e.target;
          }}
          onMouseUp={(e) => {
            if (modalMouseDownRef.current === e.currentTarget && e.target === e.currentTarget) {
              setLessonCreatedModal(null);
            }
            modalMouseDownRef.current = null;
          }}
          className="fixed inset-0 z-[110] w-screen h-screen min-h-screen bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-5 shadow-2xl border border-slate-100 relative animate-in fade-in zoom-in-95 duration-200"
          >
            <button
              type="button"
              onClick={() => setLessonCreatedModal(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center text-center pt-2">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-4 shadow-sm shadow-emerald-500/10">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Урок успешно создан!</h3>
              <p className="text-xs text-slate-500 mt-1">
                Урок сохранён в расписании и сразу доступен ученику
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2.5 text-xs">
              <div className="flex items-start justify-between gap-2">
                <span className="text-slate-500 flex items-center gap-1.5 shrink-0">
                  <BookOpen className="w-3.5 h-3.5 text-blue-500" /> Тема:
                </span>
                <span className="font-bold text-slate-800 text-right">{lessonCreatedModal.title}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 flex items-center gap-1.5 shrink-0">
                  <User className="w-3.5 h-3.5 text-indigo-500" /> Ученик:
                </span>
                <span className="font-semibold text-slate-800 text-right">{lessonCreatedModal.studentName}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 flex items-center gap-1.5 shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Предмет:
                </span>
                <span className="font-semibold text-slate-800 text-right">{lessonCreatedModal.subjectName}</span>
              </div>
              <div className="flex items-start justify-between gap-2 pt-1 border-t border-slate-200/60">
                <span className="text-slate-500 flex items-center gap-1.5 shrink-0">
                  <Clock className="w-3.5 h-3.5 text-emerald-500" /> Время:
                </span>
                <div className="text-right">
                  <span className="font-bold text-slate-800 block">{lessonCreatedModal.timeFormatted}</span>
                  <span className="text-[10px] text-slate-400 font-medium">время по Тольятти (UTC+4)</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
              <Link
                href={`/room/${lessonCreatedModal.roomName}`}
                target="_blank"
                className="w-full sm:flex-1 py-3 px-4 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs text-center flex items-center justify-center gap-1.5 transition"
              >
                <Video className="w-4 h-4 text-blue-600" />
                Войти в комнату
              </Link>
              <button
                type="button"
                onClick={() => setLessonCreatedModal(null)}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs text-center shadow-md shadow-blue-500/20 transition cursor-pointer"
              >
                Отлично
              </button>
            </div>
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
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Награда ученику за урок (необязательно):
                  </label>
                  {selectedAward && (
                    <button
                      type="button"
                      onClick={() => setSelectedAward("")}
                      className="text-[11px] text-slate-400 hover:text-rose-600 font-semibold cursor-pointer transition"
                    >
                      Снять награду ✕
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {AVAILABLE_TEACHER_AWARDS.map((aw) => {
                    const isSelected = selectedAward === aw.title;
                    return (
                      <button
                        type="button"
                        key={aw.id}
                        onClick={() => setSelectedAward(isSelected ? "" : aw.title)}
                        className={`p-2.5 rounded-2xl border text-left transition cursor-pointer flex items-center gap-2.5 ${
                          isSelected
                            ? "bg-amber-50 border-amber-300 ring-2 ring-amber-400/40 shadow-xs"
                            : "bg-slate-50/70 border-slate-200 hover:bg-slate-100 text-slate-700"
                        }`}
                      >
                        <span className="text-xl shrink-0">{aw.icon}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{aw.title}</p>
                          <p className="text-[10px] text-slate-500 line-clamp-1">{aw.desc}</p>
                        </div>
                      </button>
                    );
                  })}
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

      {/* Тост подтверждения добавления ученика */}
      {studentCreatedToast && mounted && createPortal(
        <div className="fixed bottom-6 right-6 z-[120] bg-emerald-600 text-white px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
          <div className="text-xs">
            <p className="font-bold text-sm">{studentCreatedToast}</p>
            <p className="text-emerald-100 mt-0.5">Ученик теперь доступен в списке и для назначения уроков</p>
          </div>
        </div>,
        document.body
      )}

      {/* 10. МОДАЛЬНОЕ ОКНО «ДОБАВИТЬ УЧЕНИКА» */}
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
            className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-5 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto relative animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Заголовок */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#2481cc] flex items-center justify-center">
                  <UserPlus className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">
                    Добавить ученика
                  </h3>
                  <p className="text-xs text-slate-500">
                    {addStudentTab === "create"
                      ? "Заполните данные для создания карточки нового ученика"
                      : "Найдите зарегистрированного ученика по никнейму или имени"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setAddFriendModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Вкладки: Создать нового / Найти в базе */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl">
              <button
                type="button"
                onClick={() => setAddStudentTab("create")}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  addStudentTab === "create"
                    ? "bg-white text-[#2481cc] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>+ Создать нового</span>
              </button>
              <button
                type="button"
                onClick={() => setAddStudentTab("search")}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  addStudentTab === "search"
                    ? "bg-white text-[#2481cc] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Search className="w-4 h-4" />
                <span>Найти в базе</span>
              </button>
            </div>

            {/* Вкладка 1: Создание нового ученика */}
            {addStudentTab === "create" ? (
              <form onSubmit={handleCreateStudent} className="space-y-4">
                {createStudentError && (
                  <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{createStudentError}</span>
                  </div>
                )}

                {/* Имя и фамилия */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Имя и фамилия ученика <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    autoFocus
                    required
                    placeholder="Например: Артём Смирнов"
                    value={newStudentName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewStudentName(val);
                      if (!usernameTouched) {
                        setNewStudentUsername(resolveProfileUsername({ name: val }));
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-slate-200 focus:border-[#2481cc] text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none transition bg-[#f8fafc]"
                  />
                </div>

                {/* Класс / возраст */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Класс / возраст:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "Дошкольник",
                      "1 класс",
                      "2 класс",
                      "3 класс",
                      "4 класс",
                      "5 класс",
                      "6-9 класс",
                      "10-11 класс",
                    ].map((gr) => (
                      <button
                        key={gr}
                        type="button"
                        onClick={() => setNewStudentGrade(gr)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                          newStudentGrade === gr
                            ? "bg-[#2481cc] text-white shadow-xs"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {gr}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Никнейм / логин (@username) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700">
                      Никнейм ученика:
                    </label>
                    <span className="text-[10px] text-slate-400">для входа в платформу</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-sm text-[#2481cc] pointer-events-none">
                      @
                    </span>
                    <input
                      type="text"
                      placeholder="artem_smirnov"
                      value={newStudentUsername}
                      onChange={(e) => {
                        setUsernameTouched(true);
                        setNewStudentUsername(cleanUsername(e.target.value));
                      }}
                      className="w-full pl-8 pr-3.5 py-2.5 rounded-2xl border-2 border-slate-200 focus:border-[#2481cc] text-xs sm:text-sm font-mono font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none transition bg-[#f8fafc]"
                    />
                  </div>
                </div>

                {/* Телефон / контакт родителя */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Телефон или контакт родителя <span className="text-slate-400 font-normal">(необязательно)</span>:
                  </label>
                  <input
                    type="tel"
                    placeholder="+7 (999) 000-00-00"
                    value={newStudentPhone}
                    onChange={(e) => setNewStudentPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-slate-200 focus:border-[#2481cc] text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none transition bg-[#f8fafc]"
                  />
                </div>

                {/* Кнопка сохранения */}
                <button
                  type="submit"
                  disabled={creatingStudent || !newStudentName.trim()}
                  className="w-full py-3.5 px-4 rounded-2xl bg-[#2481cc] hover:bg-[#1f70b0] disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed transform active:scale-[0.99]"
                >
                  {creatingStudent ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Создание ученика...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Добавить ученика</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* Вкладка 2: Поиск существующего ученика */
              <div className="space-y-4">
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
                    <div className="py-6 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3">
                      <Users className="w-8 h-8 mx-auto text-slate-400 stroke-[1.5]" />
                      <div className="space-y-1">
                        <p className="font-bold text-slate-700 text-xs sm:text-sm">
                          {searchFriendQuery
                            ? `Ученик «${searchFriendQuery}» не найден`
                            : "Начните вводить никнейм или имя"}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Вы можете создать профиль ученика прямо сейчас
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (searchFriendQuery) {
                            setNewStudentName(searchFriendQuery);
                            setNewStudentUsername(cleanUsername(searchFriendQuery));
                          }
                          setAddStudentTab("create");
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2481cc] hover:bg-[#1f70b0] text-white font-bold text-xs shadow-xs transition cursor-pointer"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>+ Создать ученика {searchFriendQuery ? `«${searchFriendQuery}»` : ""}</span>
                      </button>
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
                              <span>Прикреплён</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAddFriend(st.id)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#2481cc] hover:bg-[#1f70b0] text-white font-bold text-xs shadow-xs transition transform active:scale-95 cursor-pointer shrink-0"
                            >
                              <Plus className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Прикрепить</span>
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Подсказка в футере модалки */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>💡 Добавленные ученики сразу появляются в расписании</span>
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

      {/* Модальное окно поиска и добавления коллег-преподавателей */}
      {addColleagueModalOpen && mounted && createPortal(
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setAddColleagueModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-lg p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Добавить коллегу в друзья
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Поиск среди других преподавателей платформы «АйДаУмничка»
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddColleagueModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Поисковая строка */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchColleagueQuery}
                onChange={(e) => setSearchColleagueQuery(e.target.value)}
                placeholder="Поиск по имени или никнейму преподавателя..."
                className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-[#2481cc] focus:bg-white transition"
                autoFocus
              />
              {searchColleagueQuery && (
                <button
                  type="button"
                  onClick={() => setSearchColleagueQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Список найденных коллег */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {filteredSearchColleagues.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs space-y-1">
                  <Users className="w-8 h-8 mx-auto text-slate-300 stroke-[1.5]" />
                  <p className="font-semibold text-slate-600">
                    {searchColleagueQuery ? "Никого не найдено по этому запросу" : "Другие преподаватели не найдены"}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Попробуйте изменить поисковый запрос
                  </p>
                </div>
              ) : (
                filteredSearchColleagues.map((t) => {
                  const isFriend = friendTeacherIds.includes(t.id);
                  return (
                    <div
                      key={t.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {t.avatarUrl ? (
                          <img
                            src={t.avatarUrl}
                            alt={t.name}
                            className="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-100"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#2481cc] to-indigo-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
                            {t.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                            {t.name}
                          </h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-[11px] font-bold text-blue-600">
                              {formatUsername(t.username)}
                            </span>
                            {t.subjects && (
                              <span className="text-[10px] text-slate-400 truncate max-w-[120px] sm:max-w-[160px]">• {t.subjects}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {isFriend ? (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                            <Check className="w-3.5 h-3.5" />
                            <span>В друзьях</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveColleagueFriend(t.id)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Удалить из друзей"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddColleagueFriend(t.id)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#2481cc] hover:bg-[#1f70b0] text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-95 shrink-0"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Добавить</span>
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setAddColleagueModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Готово
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* МОДАЛЬНОЕ ОКНО ПРОВЕРКИ И ОЦЕНИВАНИЯ ДОМАШНЕГО ЗАДАНИЯ (P0.2) */}
      {mounted && hwReviewModalOpen && selectedHwForReview && createPortal(
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setHwReviewModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-lg p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">
                  {selectedHwForReview.subject}
                </span>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 mt-1">
                  Проверка: «{selectedHwForReview.title}»
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ученик: <strong className="text-slate-800">{selectedHwForReview.studentName}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHwReviewModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Ответ ученика */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Ответ и решение ученика:</label>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-900 font-medium whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                {selectedHwForReview.studentAnswer || "Ученик не указал текстовый комментарий"}
              </div>
            </div>

            {/* Прикрепленный файл */}
            {selectedHwForReview.fileUrl && (
              <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">
                      {selectedHwForReview.fileName || "Файл решения"}
                    </p>
                    <p className="text-[10px] text-slate-500">{selectedHwForReview.fileSize || "Документ"}</p>
                  </div>
                </div>
                <a
                  href={selectedHwForReview.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Открыть</span>
                </a>
              </div>
            )}

            {/* Форма оценивания */}
            <form onSubmit={handleSaveHwReview} className="space-y-4 pt-1">
              {/* Выбор оценки (1-5) */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2">Оценка за работу:</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setHwGrade(num)}
                      className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1 transition cursor-pointer border ${
                        hwGrade === num
                          ? "bg-amber-400 text-amber-950 border-amber-500 shadow-sm scale-105"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <Star className={`w-3.5 h-3.5 ${hwGrade >= num ? "fill-current" : "opacity-40"}`} />
                      <span>{num}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Отзыв преподавателя */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Отзыв и рекомендации для ученика:
                </label>
                <textarea
                  rows={3}
                  value={hwFeedback}
                  onChange={(e) => setHwFeedback(e.target.value)}
                  placeholder="Отличная работа! Все примеры решены правильно, в 3-м номере обрати внимание на знак..."
                  className="w-full p-3 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-[#2481cc] transition"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setHwReviewModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={savingHwReview}
                  className="px-5 py-2.5 rounded-xl bg-[#2481cc] hover:bg-[#1f70b0] text-white font-bold text-xs shadow-md shadow-blue-500/20 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
                >
                  {savingHwReview ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Сохранить оценку</span>
                </button>
              </div>
            </form>
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
