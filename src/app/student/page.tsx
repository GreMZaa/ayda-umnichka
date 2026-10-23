"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Video,
  Clock,
  Calendar,
  BookOpen,
  ArrowRight,
  GraduationCap,
  Star,
  Award,
  User,
  Sparkles,
  Flame,
  CheckCircle2,
  FileText,
  CreditCard,
  Send,
  Upload,
  Check,
  X,
  ChevronRight,
  AlertCircle,
  Edit3,
  UserPlus,
  UserMinus,
  Users,
  Search,
  MessageCircle,
  PhoneCall,
  PhoneIncoming,
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
import { formatTolyatti } from "@/lib/tolyatti-time";
import { SHARONOV_AVATAR, TEACHER_VASILINA_AVATAR } from "@/lib/default-avatar";
import { DEFAULT_STUDENT_LESSONS } from "@/lib/default-lessons";

export interface TeacherProfile {
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

interface HomeworkItem {
  id: string;
  lessonId?: string;
  subject: string;
  title: string;
  teacher: string;
  deadline: string;
  status: "NEW" | "SUBMITTED" | "CHECKED";
  statusText: string;
  badgeColor: string;
  description: string;
  tasks: string[];
  studentAnswer?: string;
  teacherFeedback?: string;
  grade?: number;
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
}

const DEFAULT_HOMEWORK: HomeworkItem[] = [];

const isSharonovUser = (id?: string | null, email?: string | null) => {
  if (id === "53df3c76-9d23-49aa-ba0c-6f40d7a56657") return true;
  if (email) {
    const em = email.toLowerCase();
    if (em.includes("lev-drakon") || em.includes("sharonov")) return true;
  }
  return false;
};

const isUuid = (str: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

export default function StudentCabinet() {
  const { loading: authLoading, isAuthorized, user: authUser } = useAuthGuard("student");
  const isSharonov = isSharonovUser(authUser?.id, authUser?.email);

  const [studentId, setStudentId] = useState(authUser?.id || (isSharonov ? "53df3c76-9d23-49aa-ba0c-6f40d7a56657" : ""));
  const [studentName, setStudentName] = useState(
    authUser?.user_metadata?.full_name || (isSharonov ? "Сергей Дмитриевич" : "")
  );
  const [studentUsername, setStudentUsername] = useState(isSharonov ? "sharonov" : "");
  const [avatarUrl, setAvatarUrl] = useState(isSharonov ? SHARONOV_AVATAR : (authUser?.user_metadata?.avatar_url || ""));
  const [grade, setGrade] = useState(authUser?.user_metadata?.grade || (isSharonov ? "Дошкольник" : ""));
  const [school, setSchool] = useState("Онлайн-школа «АйДаУмничка»");
  const [bio, setBio] = useState("");
  const [balance, setBalance] = useState(8);
  const [stars, setStars] = useState(isSharonov ? 28 : 0);
  const [editProfileModalOpen, setEditProfileModalOpen] = useState(false);
  const [lessons, setLessons] = useState<any[]>([]);
  const [schoolSubjects, setSchoolSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [friendTeacherIds, setFriendTeacherIds] = useState<string[]>([]);
  const [searchTeacherQuery, setSearchTeacherQuery] = useState("");
  const [addTeacherModalOpen, setAddTeacherModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"schedule" | "homework" | "awards">("schedule");

  // Состояние модального окна домашнего задания
  const [selectedHomework, setSelectedHomework] = useState<HomeworkItem | null>(null);
  const [homeworkModalOpen, setHomeworkModalOpen] = useState(false);
  const [answerText, setAnswerText] = useState("");
  const [attachedFileUrl, setAttachedFileUrl] = useState("");
  const [attachedFileName, setAttachedFileName] = useState("");
  const [attachedFileSize, setAttachedFileSize] = useState("");
  const [isUploadingHwFile, setIsUploadingHwFile] = useState(false);
  const hwFileInputRef = useRef<HTMLInputElement>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);
  const modalMouseDownRef = useRef<EventTarget | null>(null);

  // Состояние входящего звонка на урок («Входящий звонок» P2.1)
  const [incomingCallLesson, setIncomingCallLesson] = useState<any | null>(null);
  const [dismissedCallLessonId, setDismissedCallLessonId] = useState<string | null>(null);

  // Список домашних заданий школьного формата с начальными интерактивными заданиями
  const [homeworkList, setHomeworkList] = useState<HomeworkItem[]>(DEFAULT_HOMEWORK);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem("ayda_student_hw");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const clean = parsed.filter((item: any) => !item.id?.startsWith("hw-"));
          if (clean.length > 0) {
            setHomeworkList(clean);
            return;
          }
        }
      }
      setHomeworkList([]);
      localStorage.removeItem("ayda_student_hw");
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (homeworkModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [homeworkModalOpen]);

  // Загрузка данных ученика, предметов школы и уроков из Supabase
  useEffect(() => {
    const isSharonov = isSharonovUser(authUser?.id, authUser?.email);

    let currentUserId = authUser?.id;
    if (!currentUserId && typeof document !== "undefined") {
      const match = document.cookie.match(/ayda_user_id=([^;]+)/);
      if (match && isUuid(match[1].trim())) currentUserId = match[1].trim();
    }
    if (!currentUserId || !isUuid(currentUserId)) {
      try {
        const saved =
          localStorage.getItem("ayda_profile_student") ||
          localStorage.getItem("ayda_current_user_profile");
        if (saved) {
          const p = JSON.parse(saved);
          if (p.id && isUuid(p.id) && (!authUser?.id || p.id === authUser.id)) {
            currentUserId = p.id;
          }
        }
      } catch (e) {}
    }
    // Если пользователь Шаронов или demo без сессии
    if ((!currentUserId || !isUuid(currentUserId)) && isSharonov) {
      currentUserId = "53df3c76-9d23-49aa-ba0c-6f40d7a56657";
    }
    if (currentUserId) {
      setStudentId(currentUserId);
    }

    const client = getSupabase();
    if (client) {
      // 1. Профиль конкретно текущего вошедшего ученика из Supabase profiles (ИСТОЧНИК ИСТИНЫ)
      (async () => {
        let profile = null;

        // Поиск по ID
        if (currentUserId && isUuid(currentUserId)) {
          const { data } = await client
            .from("profiles")
            .select("*")
            .eq("id", currentUserId)
            .maybeSingle();
          if (data) profile = data;
        }

        // Если не найден по ID, ищем по e-mail
        if (!profile && authUser?.email) {
          const { data } = await client
            .from("profiles")
            .select("*")
            .eq("email", authUser.email.trim())
            .maybeSingle();
          if (data) profile = data;
        }

        // Если все еще не найден и это Шаронов
        if (!profile && isSharonov) {
          const { data } = await client
            .from("profiles")
            .select("*")
            .eq("id", "53df3c76-9d23-49aa-ba0c-6f40d7a56657")
            .maybeSingle();
          if (data) profile = data;
        }

        if (profile) {
          const effectiveId = profile.id;
          const userIsSharonov = isSharonovUser(effectiveId, profile.email || authUser?.email);
          setStudentId(effectiveId);
          setStudentName(profile.name || authUser?.user_metadata?.full_name || (userIsSharonov ? "Сергей Дмитриевич" : "Ученик"));
          if (profile.avatar_url) {
            setAvatarUrl(profile.avatar_url);
          } else if (userIsSharonov) {
            setAvatarUrl(SHARONOV_AVATAR);
          } else {
            setAvatarUrl(authUser?.user_metadata?.avatar_url || "");
          }

          let parsedBio: any = {};
          try {
            if (profile.bio && profile.bio.startsWith("{")) {
              parsedBio = JSON.parse(profile.bio);
            } else if (profile.bio) {
              parsedBio.grade = profile.bio;
            }
          } catch (e) {}

          if (Array.isArray(parsedBio.friendTeacherIds) && parsedBio.friendTeacherIds.length > 0) {
            setFriendTeacherIds(parsedBio.friendTeacherIds);
          }

          const uname = cleanUsername(parsedBio.username) || resolveProfileUsername({
            id: profile.id,
            email: profile.email || authUser?.email,
            name: profile.name,
            bio: profile.bio,
          });
          setStudentUsername(uname || (userIsSharonov ? "sharonov" : ""));

          setGrade(parsedBio.grade || authUser?.user_metadata?.grade || (userIsSharonov ? "Дошкольник" : "1 класс"));
          if (parsedBio.school) setSchool(parsedBio.school);
          if (parsedBio.bio) setBio(parsedBio.bio);
          if (typeof parsedBio.balance === "number") setBalance(parsedBio.balance);
          else setBalance(8);
          if (typeof parsedBio.stars === "number") setStars(parsedBio.stars);
          else setStars(userIsSharonov ? 28 : 0);

          // Обновляем локальный кэш свежими данными из БД
          try {
            localStorage.setItem("ayda_profile_student", JSON.stringify({
              id: effectiveId,
              name: profile.name || authUser?.user_metadata?.full_name || (userIsSharonov ? "Сергей Дмитриевич" : "Ученик"),
              username: uname || (userIsSharonov ? "sharonov" : ""),
              avatarUrl: profile.avatar_url || (userIsSharonov ? SHARONOV_AVATAR : ""),
              grade: parsedBio.grade || authUser?.user_metadata?.grade || (userIsSharonov ? "Дошкольник" : "1 класс"),
              school: parsedBio.school || "Онлайн-школа «АйДаУмничка»",
              bio: parsedBio.bio || "",
              role: "STUDENT",
            }));
          } catch {}
        } else {
          // Если нового пользователя действительно нет в базе
          const userIsSharonov = isSharonov;
          const defName = authUser?.user_metadata?.full_name || authUser?.email?.split("@")[0] || (userIsSharonov ? "Сергей Дмитриевич" : "Ученик");
          const defGrade = authUser?.user_metadata?.grade || (userIsSharonov ? "Дошкольник" : "1 класс");
          const defUname = resolveProfileUsername({
            id: currentUserId,
            email: authUser?.email,
            name: defName,
          });
          setStudentName(defName);
          setGrade(defGrade);
          setStudentUsername(defUname);
          if (userIsSharonov) {
            setAvatarUrl(SHARONOV_AVATAR);
            setStars(28);
          } else {
            setStars(0);
          }
          if (currentUserId && isUuid(currentUserId)) {
            client.from("profiles").upsert({
              id: currentUserId,
              email: authUser?.email,
              name: defName,
              role: "STUDENT",
              avatar_url: userIsSharonov ? SHARONOV_AVATAR : (authUser?.user_metadata?.avatar_url || null),
              bio: JSON.stringify({
                username: defUname,
                grade: defGrade,
                school: "Онлайн-школа «АйДаУмничка»",
                balance: 8,
                stars: userIsSharonov ? 28 : 0,
              }),
            }).then(() => {});
          }
        }
      })();

      // 2. Официальные предметы школы из Supabase
      client
        .from("subjects")
        .select("*")
        .order("name", { ascending: true })
        .then(({ data }) => {
          if (data && data.length > 0) {
            setSchoolSubjects(data);
          }
        });

      // 3. Список преподавателей школы из API и Supabase
      fetch("/api/users/search?role=TEACHER")
        .then((r) => r.json())
        .then((resData) => {
          if (resData?.success && Array.isArray(resData.users) && resData.users.length > 0) {
            const mappedTeachers: TeacherProfile[] = resData.users.map((t: any) => ({
              id: t.id,
              name: t.name || "Преподаватель школы",
              username: t.username,
              avatarUrl: t.avatarUrl || (t.id === "882042e2-d020-426c-9826-9fba5b23ad2e" ? TEACHER_VASILINA_AVATAR : undefined),
              email: t.email,
              subjects: t.subjects || "Все дисциплины школы",
              experience: t.experience || "Стаж более 5 лет",
              education: t.education || "Высшее образование",
              bio: t.bio || "",
            }));
            setTeachers(mappedTeachers);
          }
        })
        .catch(() => {});

      client
        .from("profiles")
        .select("id, name, email, bio, avatar_url")
        .eq("role", "TEACHER")
        .order("name", { ascending: true })
        .then(({ data }) => {
          if (data && data.length > 0) {
            const mappedTeachers: TeacherProfile[] = data.map((t: any) => {
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
                avatarUrl: t.avatar_url || (t.id === "882042e2-d020-426c-9826-9fba5b23ad2e" ? TEACHER_VASILINA_AVATAR : undefined),
                email: t.email,
                subjects: parsedBio.subjects || "Все дисциплины школы",
                experience: parsedBio.experience || "Стаж более 5 лет",
                education: parsedBio.education || "Высшее образование",
                bio: parsedBio.bio || "",
              };
            });
            setTeachers(mappedTeachers);

            // Инициализация преподавателей в друзьях
            setFriendTeacherIds((prev) => {
              if (prev.length > 0) return prev;
              let fromLocal: string[] = [];
              try {
                const raw = localStorage.getItem(`ayda_student_friends_${currentUserId}`);
                if (raw) fromLocal = JSON.parse(raw);
              } catch {}
              if (fromLocal.length > 0) return fromLocal;

              if (isSharonov) {
                return ["882042e2-d020-426c-9826-9fba5b23ad2e"];
              }
              return [];
            });
          }
        });
    }

    // Слушатель обновления друзей ученика
    const handleFriendsUpdate = (e: any) => {
      if (e.detail?.friends && Array.isArray(e.detail.friends)) {
        setFriendTeacherIds(e.detail.friends);
      }
    };
    window.addEventListener("ayda:student-friends-updated", handleFriendsUpdate);

    // Слушатель глобального обновления профиля
    const handleProfileUpdate = (e: any) => {
      const p = e.detail;
      if (p) {
        const r = (p.role || "").toUpperCase();
        if (!r || r === "STUDENT") {
          if (p.name) setStudentName(p.name);
          if (p.username) setStudentUsername(p.username);
          if (p.avatarUrl !== undefined) setAvatarUrl(p.avatarUrl);
          if (p.grade) setGrade(p.grade);
          if (p.school) setSchool(p.school);
          if (p.bio) setBio(p.bio);
        }
      }
    };
    window.addEventListener("ayda:profile-updated", handleProfileUpdate);

    // 3. Загрузка уроков ТОЛЬКО текущего ученика с надежными фоллбеками
    const loadStudentLessons = async () => {
      let uid = currentUserId;
      if (!uid || !isUuid(uid)) {
        if (typeof document !== "undefined") {
          const match = document.cookie.match(/ayda_user_id=([^;]+)/);
          if (match && isUuid(match[1].trim())) uid = match[1].trim();
        }
      }
      if (!uid || !isUuid(uid)) {
        if (authUser?.id && isUuid(authUser.id)) uid = authUser.id;
      }

      const userIsSharonov =
        isSharonovUser(uid, authUser?.email) ||
        isSharonov ||
        studentUsername === "sharonov" ||
        studentId === "53df3c76-9d23-49aa-ba0c-6f40d7a56657" ||
        Boolean(authUser?.email && authUser.email.toLowerCase().includes("lev-drakon"));

      // Запрашиваем уроки текущего ученика
      const studentIdsToQuery = Array.from(
        new Set(
          [
            uid,
            studentId,
            authUser?.id,
            ...(userIsSharonov ? ["53df3c76-9d23-49aa-ba0c-6f40d7a56657"] : []),
          ].filter((x): x is string => Boolean(x && isUuid(x)))
        )
      );

      if (studentIdsToQuery.length === 0) {
        setLessons([]);
        setLoading(false);
        return;
      }

      const client = getSupabase();
      if (client) {
        try {
          // 1. Поиск уроков по student_id текущего ученика
          const { data: sbLessons, error: sbErr } = await client
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
            .in("student_id", studentIdsToQuery)
            .order("start_time", { ascending: false });

          if (!sbErr && sbLessons && sbLessons.length > 0) {
            const mapped = sbLessons.map((l: any) => ({
              id: l.id,
              title: l.title,
              subjectId: l.subject_id,
              subjectName: l.subjects?.name || "Предмет",
              subjectColor: l.subjects?.color || "#2563eb",
              teacherId: l.teacher_id,
              teacherName: l.teacher?.name || "Преподаватель",
              teacherAvatar: l.teacher?.avatar_url || TEACHER_VASILINA_AVATAR,
              studentId: l.student_id,
              studentName: l.student?.name || studentName || "Ученик",
              studentAvatar: l.student?.avatar_url || avatarUrl || (userIsSharonov ? SHARONOV_AVATAR : ""),
              startTime: l.start_time,
              endTime: l.end_time,
              status: l.status,
              roomName: l.room_name,
            }));
            setLessons(mapped);
            setLoading(false);
            return;
          }

          // 2. Если запрос с joins не вернул результатов, запрашиваем сырые уроки без join
          const { data: rawLessons, error: rawErr } = await client
            .from("lessons")
            .select("*")
            .in("student_id", studentIdsToQuery)
            .order("start_time", { ascending: false });

          if (!rawErr && rawLessons) {
            if (rawLessons.length > 0) {
              const mapped = rawLessons.map((l: any) => ({
                id: l.id,
                title: l.title,
                subjectId: l.subject_id,
                subjectName: "Предмет",
                subjectColor: "#2563eb",
                teacherId: l.teacher_id,
                teacherName: "Преподаватель",
                teacherAvatar: TEACHER_VASILINA_AVATAR,
                studentId: l.student_id,
                studentName: studentName || "Ученик",
                studentAvatar: avatarUrl || (userIsSharonov ? SHARONOV_AVATAR : ""),
                startTime: l.start_time,
                endTime: l.end_time,
                status: l.status,
                roomName: l.room_name,
              }));
              setLessons(mapped);
              setLoading(false);
              return;
            } else {
              setLessons([]);
              setLoading(false);
              return;
            }
          }
        } catch (e) {
          console.error("Student supabase lessons load error:", e);
        }
      }

      // 3. API fallback
      try {
        const queryId = studentIdsToQuery[0];
        const res = await fetchWithAuth(`/api/lessons?studentId=${queryId}`);
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setLessons(data);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error(err);
      }

      // 4. Локальное хранилище недавно созданных уроков (только если принадлежат текущему ученику)
      try {
        const local = localStorage.getItem("ayda_latest_lessons");
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const filtered = parsed.filter((l: any) => studentIdsToQuery.includes(l.studentId || l.student_id));
            if (filtered.length > 0) {
              setLessons(filtered);
              setLoading(false);
              return;
            }
          }
        }
      } catch (e) {}

      setLessons([]);
      setLoading(false);
    };

    loadStudentLessons();

    const handleLessonsUpdate = () => {
      loadStudentLessons();
    };
    window.addEventListener("ayda:lessons-updated", handleLessonsUpdate);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        loadStudentLessons();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", loadStudentLessons);

    const pollTimer = setInterval(loadStudentLessons, 10000);

    let realtimeChannel = null;
    try {
      if (client) {
        realtimeChannel = client
          .channel("student-lessons-feed")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "lessons" },
            () => {
              loadStudentLessons();
            }
          )
          .subscribe();
      }
    } catch (e) {}

    return () => {
      window.removeEventListener("ayda:profile-updated", handleProfileUpdate);
      window.removeEventListener("ayda:lessons-updated", handleLessonsUpdate);
      window.removeEventListener("ayda:student-friends-updated", handleFriendsUpdate);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", loadStudentLessons);
      clearInterval(pollTimer);
      if (realtimeChannel && client) {
        client.removeChannel(realtimeChannel);
      }
    };
  }, [authUser?.id, studentId]);

  // Загрузка и синхронизация домашних заданий из БД /api/homework (P0.2)
  useEffect(() => {
    if (!studentId) return;

    let isCancelled = false;
    const loadHomework = async () => {
      try {
        const res = await fetchWithAuth(`/api/homework?studentId=${studentId}`);
        if (!res.ok) return;
        const data = await res.json();
        const subs: any[] = data?.submissions || [];

        const currentLessons = lessons.length > 0 ? lessons : (isSharonov ? DEFAULT_STUDENT_LESSONS : []);
        if (currentLessons.length === 0 && subs.length === 0) {
          if (!isCancelled) setHomeworkList([]);
          return;
        }

        const mapped: HomeworkItem[] = currentLessons.map((l, idx) => {
          const sub = subs.find((s) => s.lessonId === l.id || s.title === `ДЗ: ${l.title}`);
          const isChecked = sub?.status === "CHECKED";
          const isSubmitted = sub?.status === "SUBMITTED" || isChecked;

          return {
            id: sub?.id || `hw-les-${l.id || idx}`,
            lessonId: l.id,
            subject: l.subjectName || "Предмет",
            title: `ДЗ: ${l.title}`,
            teacher: l.teacherName || "Шаронова Василина Владимировна",
            deadline: "До следующего урока",
            status: isChecked ? "CHECKED" : isSubmitted ? "SUBMITTED" : "NEW",
            statusText: isChecked
              ? "Проверено преподавателем"
              : isSubmitted
              ? "На проверке у учителя"
              : "Новое задание",
            badgeColor: isChecked
              ? "bg-emerald-100 text-emerald-800 border-emerald-200"
              : isSubmitted
              ? "bg-blue-100 text-blue-800 border-blue-200"
              : "bg-amber-100 text-amber-800 border-amber-200",
            description: `Домашняя работа по теме «${l.title}». Решите задачи и прикрепите фото или файл решения для проверки репетитором.`,
            tasks: [
              `Повторить тему «${l.title}»`,
              "Выполнить практические упражнения в тетради",
              "Прикрепить фото тетради или документ для проверки репетитором",
            ],
            studentAnswer: sub?.studentAnswer,
            teacherFeedback: sub?.teacherFeedback,
            grade: sub?.grade,
            fileUrl: sub?.fileUrl,
            fileName: sub?.fileName,
            fileSize: sub?.fileSize,
          };
        });

        if (!isCancelled) setHomeworkList(mapped);
      } catch (err) {
        console.warn("Could not load homework:", err);
      }
    };

    loadHomework();
    const timer = setInterval(loadHomework, 15000);
    return () => {
      isCancelled = true;
      clearInterval(timer);
    };
  }, [studentId, lessons, isSharonov]);

  // Воспроизведение звука входящего вызова через Web Audio API
  const playIncomingCallChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Приятный двухтональный гармоничный аккорд вызова (C5 + E5)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "sine";
      osc2.type = "triangle";
      osc1.frequency.setValueAtTime(523.25, now);
      osc2.frequency.setValueAtTime(659.25, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.18, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.2);
      osc2.stop(now + 1.2);
    } catch (e) {}
  };

  // Отслеживание начала урока для показа модалки входящего звонка (P2.1)
  useEffect(() => {
    const liveLesson = lessons.find((l) => l.status === "LIVE");
    if (liveLesson && liveLesson.id !== dismissedCallLessonId) {
      setIncomingCallLesson(liveLesson);
      playIncomingCallChime();

      const chimeInterval = setInterval(() => {
        playIncomingCallChime();
      }, 4000);

      return () => clearInterval(chimeInterval);
    } else if (!liveLesson) {
      setIncomingCallLesson(null);
    }
  }, [lessons, dismissedCallLessonId]);

  const liveLesson = lessons.find((l) => l.status === "LIVE");
  const upcomingLessons = lessons
    .filter((l) => {
      if (l.status !== "SCHEDULED") return false;
      const endMs = new Date(l.endTime || l.startTime).getTime();
      return isNaN(endMs) || endMs > Date.now();
    })
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  const completedLessons = lessons.filter((l) => l.status === "COMPLETED");

  const initial = studentName.charAt(0).toUpperCase();

  // Настоящие школьные академические достижения
  const academicAwards = [
    {
      title: "Первая пятёрка",
      desc: "Получил высший балл «5» за активную работу на онлайн-уроке",
      icon: "⭐",
      unlocked: stars >= 5 || completedLessons.length > 0,
      criteria: "Оценка 5/5 от репетитора",
    },
    {
      title: "Отличник четверти",
      desc: "Выполнил 10 домашних заданий подряд на высший балл",
      icon: "📚",
      unlocked: stars >= 50,
      criteria: "10 проверенных ДЗ",
    },
    {
      title: "Знаток математики",
      desc: "Успешно решил блок олимпиадных логических задач и уравнений",
      icon: "📐",
      unlocked: stars >= 15,
      criteria: "Раздел логики освоен",
    },
    {
      title: "Грамотей",
      desc: "Безупречное знание правил правописания и словарных слов",
      icon: "✍️",
      unlocked: stars >= 20,
      criteria: "0 ошибок в диктанте",
    },
    {
      title: "English Speaker",
      desc: "Уверенно поддержал диалог на английском языке с преподавателем",
      icon: "🇬🇧",
      unlocked: stars >= 25,
      criteria: "Разговорный клуб 1-го уровня",
    },
    {
      title: "100% пунктуальность",
      desc: "5 уроков подряд вовремя без единого опоздания и пропусков",
      icon: "⏱️",
      unlocked: completedLessons.length >= 5,
      criteria: "Посещаемость 100%",
    },
    {
      title: "Пытливый ум",
      desc: "Задал преподавателю глубокий вопрос по теме урока",
      icon: "💡",
      unlocked: false,
      criteria: "3 из 5 вопросов задано",
    },
    {
      title: "Опережая программу",
      desc: "Самостоятельно изучил дополнительный материал урока",
      icon: "🚀",
      unlocked: false,
      criteria: "1 из 2 тем изучена",
    },
  ];

  const unlockedAwards = academicAwards.filter((ach) => ach.unlocked);

  // Открытие модального окна задания
  const handleOpenHomework = (hw: HomeworkItem) => {
    setSelectedHomework(hw);
    setAnswerText(hw.studentAnswer || "");
    setAttachedFileUrl(hw.fileUrl || "");
    setAttachedFileName(hw.fileName || "");
    setAttachedFileSize(hw.fileSize || "");
    setSubmitSuccess(false);
    setHomeworkModalOpen(true);
  };

  // Загрузка реального файла для ДЗ через /api/upload (P2.2)
  const handleUploadHwFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingHwFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setAttachedFileUrl(data.url);
        setAttachedFileName(data.fileName || file.name);
        setAttachedFileSize(data.fileSize || "");
      } else {
        alert(data.error || "Ошибка загрузки файла на сервер.");
      }
    } catch (err: any) {
      alert("Не удалось загрузить файл: " + (err?.message || "Ошибка соединения"));
    } finally {
      setIsUploadingHwFile(false);
    }
  };

  // Отправка задания на проверку учителю с сохранением в БД (P0.2)
  const handleSubmitHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHomework) return;

    const currentLesson = lessons.find((l) => l.id === selectedHomework.lessonId) || lessons[0];

    const payload = {
      lessonId: selectedHomework.lessonId || currentLesson?.id,
      studentId: studentId,
      studentName: studentName,
      teacherId: currentLesson?.teacherId || currentLesson?.teacher_id,
      title: selectedHomework.title,
      subject: selectedHomework.subject,
      studentAnswer: answerText,
      fileUrl: attachedFileUrl || selectedHomework.fileUrl,
      fileName: attachedFileName || selectedHomework.fileName,
      fileSize: attachedFileSize || selectedHomework.fileSize,
    };

    try {
      await fetchWithAuth("/api/homework", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.warn("API homework submit error:", err);
    }

    const updatedItem: HomeworkItem = {
      ...selectedHomework,
      status: "SUBMITTED",
      statusText: "На проверке у учителя",
      badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
      studentAnswer: answerText,
      fileUrl: attachedFileUrl || selectedHomework.fileUrl,
      fileName: attachedFileName || selectedHomework.fileName,
      fileSize: attachedFileSize || selectedHomework.fileSize,
    };

    const updatedList = homeworkList.map((item) =>
      item.id === selectedHomework.id ? updatedItem : item
    );

    setHomeworkList(updatedList);
    try {
      localStorage.setItem(`ayda_student_hw_${studentId}`, JSON.stringify(updatedList));
    } catch (e) {}

    // Мгновенно обновляем выбранное задание, чтобы модалка и кнопка синхронизировались
    setSelectedHomework(updatedItem);
    setSubmitSuccess(true);

    setTimeout(() => {
      setHomeworkModalOpen(false);
      setSubmitSuccess(false);
    }, 1200);
  };

  // Добавление преподавателя в друзья
  const handleAddTeacherFriend = async (teacherId: string) => {
    if (friendTeacherIds.includes(teacherId)) return;
    const updated = [...friendTeacherIds, teacherId];
    setFriendTeacherIds(updated);

    try {
      localStorage.setItem(`ayda_student_friends_${studentId}`, JSON.stringify(updated));
    } catch (e) {}

    const client = getSupabase();
    if (client && studentId && isUuid(studentId)) {
      try {
        const { data: current } = await client
          .from("profiles")
          .select("bio")
          .eq("id", studentId)
          .maybeSingle();
        let parsedBio: any = {};
        try {
          if (current?.bio && current.bio.startsWith("{")) parsedBio = JSON.parse(current.bio);
          else if (current?.bio) parsedBio.grade = current.bio;
        } catch (e) {}

        parsedBio.friendTeacherIds = updated;
        await client
          .from("profiles")
          .update({ bio: JSON.stringify(parsedBio) })
          .eq("id", studentId);
      } catch (err) {
        console.error("Error saving friend teacher to Supabase:", err);
      }

      // Взаимная привязка: учитель также сразу видит ученика в своих друзьях
      if (isUuid(teacherId)) {
        try {
          const { data: tProf } = await client
            .from("profiles")
            .select("bio")
            .eq("id", teacherId)
            .maybeSingle();
          if (tProf) {
            let tBio: any = {};
            try {
              if (tProf.bio && tProf.bio.startsWith("{")) tBio = JSON.parse(tProf.bio);
            } catch (e) {}
            const curFriends = Array.isArray(tBio.friendStudentIds) ? tBio.friendStudentIds : [];
            if (!curFriends.includes(studentId)) {
              tBio.friendStudentIds = [...curFriends, studentId];
              await client.from("profiles").update({ bio: JSON.stringify(tBio) }).eq("id", teacherId);
            }
          }
        } catch (e) {}
      }
    }

    try {
      window.dispatchEvent(
        new CustomEvent("ayda:student-friends-updated", { detail: { friends: updated } })
      );
    } catch (e) {}
  };

  // Удаление преподавателя из друзей
  const handleRemoveTeacherFriend = async (teacherId: string) => {
    const updated = friendTeacherIds.filter((id) => id !== teacherId);
    setFriendTeacherIds(updated);

    try {
      localStorage.setItem(`ayda_student_friends_${studentId}`, JSON.stringify(updated));
    } catch (e) {}

    const client = getSupabase();
    if (client && studentId && isUuid(studentId)) {
      try {
        const { data: current } = await client
          .from("profiles")
          .select("bio")
          .eq("id", studentId)
          .maybeSingle();
        let parsedBio: any = {};
        try {
          if (current?.bio && current.bio.startsWith("{")) parsedBio = JSON.parse(current.bio);
          else if (current?.bio) parsedBio.grade = current.bio;
        } catch (e) {}

        parsedBio.friendTeacherIds = updated;
        await client
          .from("profiles")
          .update({ bio: JSON.stringify(parsedBio) })
          .eq("id", studentId);
      } catch (err) {
        console.error("Error removing friend teacher in Supabase:", err);
      }
    }

    try {
      window.dispatchEvent(
        new CustomEvent("ayda:student-friends-updated", { detail: { friends: updated } })
      );
    } catch (e) {}
  };

  const friendTeachers = teachers.filter((t) => friendTeacherIds.includes(t.id));

  const filteredSearchTeachers = teachers.filter((t) => {
    if (!searchTeacherQuery.trim()) return true;
    const q = searchTeacherQuery.toLowerCase().trim().replace(/^@/, "");
    return (
      t.name.toLowerCase().includes(q) ||
      t.username.toLowerCase().includes(q) ||
      (t.subjects && t.subjects.toLowerCase().includes(q)) ||
      (t.bio && t.bio.toLowerCase().includes(q))
    );
  });

  if (authLoading || !isAuthorized) {
    return (
      <AuthLoadingScreen
        roleTitle="Личный кабинет ученика"
        onBypass={() => window.location.reload()}
      />
    );
  }

  return (
    <>
      <TelegramCabinet
        currentRole="STUDENT"
        currentUser={{
          id: studentId,
          name: studentName || (isSharonov ? "Сергей Дмитриевич" : "Ученик"),
          username: studentUsername || (authUser?.email ? authUser.email.split("@")[0] : (isSharonov ? "sharonov" : "student")),
          email: authUser?.email || undefined,
          phone: "+7 (900) 123-45-67",
          avatar: avatarUrl || (isSharonov ? SHARONOV_AVATAR : ""),
          grade: grade || (isSharonov ? "Дошкольник" : "1 класс"),
          bio: bio || "Онлайн-школа «АйДаУмничка»",
          balance: balance,
          stars: stars,
        }}
        lessons={lessons}
        friendTeachers={friendTeachers}
        onRefreshData={() => window.location.reload()}
        onProfileUpdated={(upd) => {
          if (upd.avatarUrl) setAvatarUrl(upd.avatarUrl);
          if (upd.name) setStudentName(upd.name);
          if (upd.username) setStudentUsername(upd.username);
        }}
        extraCabinetSections={[
          {
            key: "schedule",
            title: "Расписание и уроки",
            icon: Calendar,
            badge: upcomingLessons.length > 0 ? upcomingLessons.length : undefined,
            render: () => (
              <div className="space-y-6">
                {liveLesson && (
                  <div className="bg-white rounded-3xl p-6 sm:p-7 border-2 border-[#2481cc] shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 animate-in fade-in duration-300">
                    <div className="space-y-2">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-[#2481cc] text-xs font-black border border-blue-200">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#2481cc] animate-ping" />
                        <span>Урок идёт прямо сейчас!</span>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                        {liveLesson.title}
                      </h2>
                      <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-600">
                        <span>Преподаватель: <strong className="text-slate-800">{liveLesson.teacherName}</strong></span>
                        <span>•</span>
                        <span>До {formatTolyatti(liveLesson.endTime, "HH:mm")}</span>
                      </div>
                    </div>

                    <Link
                      href={`/room/${liveLesson.id || liveLesson.roomName}?role=student`}
                      className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl bg-[#2481cc] text-white font-black text-sm sm:text-base shadow-lg shadow-blue-500/25 hover:bg-[#1f70b0] transition transform hover:scale-105 active:scale-95 shrink-0 w-full sm:w-auto cursor-pointer"
                    >
                      <Video className="w-5 h-5 text-white" />
                      <span>Войти в видеокласс</span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                  </div>
                )}

                <ScheduleCalendar
                  role="student"
                  lessons={lessons}
                />
              </div>
            ),
          },
          {
            key: "homework",
            title: "Домашние задания",
            icon: FileText,
            badge: homeworkList.length > 0 ? homeworkList.filter((h) => h.status === "NEW").length : undefined,
            render: () => (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">
                      Домашние задания и практика
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Выполняйте задания вовремя для получения звёзд и рекомендаций преподавателя
                    </p>
                  </div>
                  <span className="text-xs text-amber-700 bg-amber-50 px-3 py-1 rounded-xl border border-amber-200 font-bold self-start sm:self-auto">
                    Нужно сдать: {homeworkList.filter((h) => h.status === "NEW").length}
                  </span>
                </div>

                {homeworkList.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-slate-200 p-10 sm:p-14 text-center shadow-xs">
                    <div className="w-14 h-14 mx-auto mb-3.5 rounded-2xl bg-blue-50/60 flex items-center justify-center border border-blue-100/80 text-[#2481cc]">
                      <FileText className="w-7 h-7" />
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900 mb-1">
                      Нет активных домашних заданий
                    </h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Когда преподаватель добавит практическое задание или тест к уроку, оно появится в этом разделе.
                    </p>
                  </div>
                ) : (
                  <div className="bg-white rounded-3xl divide-y divide-slate-100 border border-slate-200 overflow-hidden shadow-xs">
                    {homeworkList.map((hw) => (
                      <div
                        key={hw.id}
                        className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition"
                      >
                        <div className="space-y-1.5 max-w-2xl">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                              {hw.subject}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${hw.badgeColor}`}>
                              {hw.statusText}
                            </span>
                          </div>

                          <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                            {hw.title}
                          </h3>

                          <p className="text-xs text-slate-600 line-clamp-1">
                            {hw.description}
                          </p>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>Срок: {hw.deadline}</span>
                            </span>
                            <span>•</span>
                            <span>Преподаватель: <strong className="text-slate-700">{hw.teacher}</strong></span>
                          </div>
                        </div>

                        {hw.status === "CHECKED" ? (
                          <button
                            type="button"
                            onClick={() => handleOpenHomework(hw)}
                            className="px-4 py-2.5 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 font-bold text-xs transition cursor-pointer self-start sm:self-auto shrink-0 shadow-2xs active:scale-95 flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Проверено • {hw.grade}/5 ⭐</span>
                          </button>
                        ) : hw.status === "SUBMITTED" ? (
                          <button
                            type="button"
                            onClick={() => handleOpenHomework(hw)}
                            className="px-4 py-2.5 rounded-xl bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200 font-bold text-xs transition cursor-pointer self-start sm:self-auto shrink-0 shadow-2xs active:scale-95 flex items-center gap-1.5"
                          >
                            <Clock className="w-4 h-4 text-[#2481cc]" />
                            <span>Отправлено • Посмотреть</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenHomework(hw)}
                            className="px-5 py-2.5 rounded-xl bg-[#2481cc] hover:bg-[#1f70b0] text-white font-bold text-xs transition cursor-pointer self-start sm:self-auto shrink-0 shadow-md shadow-blue-500/20 active:scale-95 flex items-center gap-1.5"
                          >
                            <span>Сдать задание</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ),
          },
          {
            key: "awards",
            title: "Награды и звёзды",
            icon: Award,
            badge: stars > 0 ? `${stars} ⭐` : undefined,
            render: () => (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">
                      Школьные достижения и звёзды
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Награды начисляются преподавателями за успехи на уроках и выполнение заданий
                    </p>
                  </div>
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-xl border border-amber-200">
                    Баланс звёзд: {stars} ⭐
                  </span>
                </div>

                {unlockedAwards.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-slate-200 p-10 sm:p-14 text-center shadow-xs">
                    <div className="w-14 h-14 mx-auto mb-3.5 rounded-2xl bg-amber-50 flex items-center justify-center border border-amber-100 text-amber-600">
                      <Award className="w-7 h-7" />
                    </div>
                    <h3 className="text-base font-extrabold text-slate-800">Наград пока нет</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
                      Здесь будут появляться школьные награды и звёзды за проведённые онлайн-уроки и успехи в учёбе.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {unlockedAwards.map((ach, i) => (
                      <div
                        key={i}
                        className="rounded-3xl p-5 border text-center space-y-2.5 transition flex flex-col justify-between bg-white border-amber-200/90 shadow-xs ring-1 ring-amber-100"
                      >
                        <div>
                          <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center text-2xl bg-amber-50 border border-amber-100 shadow-2xs">
                            {ach.icon}
                          </div>
                          <h3 className="font-extrabold text-sm text-slate-900 mt-2.5">{ach.title}</h3>
                          <p className="text-xs text-slate-500 leading-tight mt-1">{ach.desc}</p>
                        </div>

                        <div className="pt-2 border-t border-slate-100">
                          <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Получено ✓
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ),
          },
          {
            key: "teachers",
            title: "Преподаватели",
            icon: Users,
            render: () => (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-extrabold text-slate-900">
                        Мои преподаватели (в друзьях)
                      </h2>
                      <span className="text-xs font-bold text-[#2481cc] bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">
                        {friendTeachers.length}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Добавляйте преподавателей в друзья для общения, консультаций и согласования уроков
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSearchTeacherQuery("");
                      setAddTeacherModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2481cc] text-white font-bold text-xs hover:bg-[#1f70b0] transition cursor-pointer shadow-xs self-start sm:self-auto active:scale-95"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Найти преподавателя</span>
                  </button>
                </div>

                {friendTeachers.length === 0 ? (
                  <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 text-center space-y-4 shadow-xs">
                    <div className="w-16 h-16 rounded-3xl bg-blue-50 text-[#2481cc] flex items-center justify-center mx-auto shadow-inner">
                      <Users className="w-8 h-8" />
                    </div>
                    <div className="max-w-md mx-auto space-y-1">
                      <h3 className="font-extrabold text-slate-900 text-base">
                        У вас пока нет преподавателей в друзьях
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Найдите преподавателя школы по имени или никнейму (например,{" "}
                        <span className="font-mono text-blue-600 font-semibold">@skokova_97</span>), чтобы задать вопрос или договориться об уроке.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTeacherQuery("");
                        setAddTeacherModalOpen(true);
                      }}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#2481cc] text-white font-bold text-xs hover:bg-[#1f70b0] transition shadow-md shadow-blue-500/20 cursor-pointer active:scale-95"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Найти преподавателя по никнейму</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {friendTeachers.map((t) => {
                      const teacherLessons = lessons.filter((l) => l.teacherId === t.id);
                      const nextLesson = teacherLessons.find((l) => l.status === "SCHEDULED");

                      return (
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
                                onClick={() => handleRemoveTeacherFriend(t.id)}
                                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer shrink-0"
                                title={`Удалить «${t.name}» из друзей`}
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
                              onClick={() => {
                                window.dispatchEvent(
                                  new CustomEvent("ayda:open-chat", { detail: { chatId: `teacher-${t.id}` } })
                                );
                              }}
                              className="flex-1 py-2.5 rounded-xl bg-[#2481cc] hover:bg-[#1f70b0] text-white font-bold text-xs transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>Написать</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveTeacherFriend(t.id)}
                              className="p-2.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition cursor-pointer active:scale-95"
                              title={`Удалить «${t.name}» из друзей`}
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
        ]}
      />

      {/* 8. ИНТЕРАКТИВНОЕ МОДАЛЬНОЕ ОКНО ДОМАШНЕГО ЗАДАНИЯ (Портал прямо в body, закрывает 100% экрана) */}
      {homeworkModalOpen && selectedHomework && mounted && createPortal(
        <div
          onMouseDown={(e) => {
            modalMouseDownRef.current = e.target;
          }}
          onMouseUp={(e) => {
            if (modalMouseDownRef.current === e.currentTarget && e.target === e.currentTarget) {
              setHomeworkModalOpen(false);
            }
            modalMouseDownRef.current = null;
          }}
          className="fixed inset-0 z-[100] w-screen h-screen min-h-screen bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 space-y-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto relative animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Заголовок модального окна */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                    {selectedHomework.subject}
                  </span>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${selectedHomework.badgeColor}`}>
                    {selectedHomework.statusText}
                  </span>
                </div>
                <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">
                  {selectedHomework.title}
                </h3>
                <p className="text-xs text-slate-500">
                  Преподаватель: <strong>{selectedHomework.teacher}</strong> • Срок: {selectedHomework.deadline}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setHomeworkModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Условия задания */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <span className="text-xs font-extrabold text-slate-800 block">
                Формулировка задания:
              </span>
              <p className="text-xs text-slate-600 leading-relaxed">
                {selectedHomework.description}
              </p>
              <div className="space-y-1.5 pt-1">
                {selectedHomework.tasks.map((task, idx) => (
                  <div key={idx} className="text-xs font-medium text-slate-700 flex items-start gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span>{task}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Если на проверке — показываем плашку */}
            {selectedHomework.status === "SUBMITTED" && !submitSuccess && (
              <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-900 font-medium flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Задание отправлено на проверку учителю. При необходимости вы можете обновить ответ или файл ниже.</span>
              </div>
            )}

            {/* Если проверено — показываем отзыв учителя */}
            {selectedHomework.status === "CHECKED" && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Проверено преподавателем:</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-200 text-emerald-950 font-black text-xs">
                    Оценка: {selectedHomework.grade} / 5 ⭐
                  </span>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  {selectedHomework.teacherFeedback}
                </p>
              </div>
            )}

            {/* Форма сдачи ответа */}
            <form onSubmit={handleSubmitHomework} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ваш ответ или решение:
                </label>
                <textarea
                  rows={4}
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  placeholder="Введите ваше решение или комментарий для преподавателя..."
                  disabled={selectedHomework.status === "CHECKED"}
                  className="w-full p-3.5 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-600"
                />
              </div>

              {/* Прикрепление реального файла / фото тетради (P2.2) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Прикрепленный файл с решением или скан:
                </label>
                {selectedHomework.fileUrl && (
                  <div className="mb-2 p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">
                          {selectedHomework.fileName || "Файл решения"}
                        </p>
                        <p className="text-[10px] text-slate-500 font-medium">
                          {selectedHomework.fileSize || "Загружен на сервер"}
                        </p>
                      </div>
                    </div>
                    <a
                      href={selectedHomework.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs flex items-center gap-1 transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Открыть</span>
                    </a>
                  </div>
                )}

                {selectedHomework.status !== "CHECKED" && (
                  <div className="flex items-center gap-3">
                    <label className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer flex items-center gap-2 transition">
                      {isUploadingHwFile ? (
                        <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5 text-blue-600" />
                      )}
                      <span>
                        {isUploadingHwFile
                          ? "Загрузка на сервер..."
                          : attachedFileName
                          ? "Заменить файл"
                          : "Загрузить фото или скан"}
                      </span>
                      <input
                        type="file"
                        ref={hwFileInputRef}
                        disabled={isUploadingHwFile}
                        className="hidden"
                        onChange={handleUploadHwFile}
                      />
                    </label>
                    {attachedFileName && (
                      <span className="text-xs text-emerald-700 font-bold flex items-center gap-1 truncate max-w-[200px]">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">{attachedFileName}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>

              {submitSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Задание успешно отправлено на проверку преподавателю!</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setHomeworkModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Закрыть
                </button>
                {selectedHomework.status !== "CHECKED" && (
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{selectedHomework.status === "SUBMITTED" ? "Обновить ответ" : "Отправить на проверку"}</span>
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* 9. МОДАЛЬНОЕ ОКНО ВХОДЯЩЕГО ЗВОНКА НА УРОК («ВХОДЯЩИЙ ЗВОНОК» P2.1) */}
      {mounted && incomingCallLesson && createPortal(
        <div className="fixed inset-0 z-[200] w-screen h-screen bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 text-center space-y-6 shadow-2xl border border-slate-100 relative overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Анимированный световой ореол */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />

            <div className="space-y-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-black tracking-wide uppercase">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>Входящий звонок на онлайн-урок</span>
              </span>

              {/* Аватарка репетитора с пульсацией */}
              <div className="relative mx-auto w-24 h-24 my-3">
                <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
                <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 opacity-75 blur-xs animate-pulse" />
                <img
                  src={
                    incomingCallLesson.teacherAvatar ||
                    incomingCallLesson.teacher?.avatar_url ||
                    "https://images.unsplash.com/photo-1544717305-2782549b5136?w=200&h=200&fit=crop&crop=faces"
                  }
                  alt={incomingCallLesson.teacherName || "Преподаватель"}
                  className="relative w-24 h-24 rounded-full object-cover border-4 border-white shadow-xl"
                />
              </div>

              <div>
                <h3 className="text-xl font-extrabold text-slate-900 leading-tight">
                  {incomingCallLesson.teacherName || "Шаронова Василина Владимировна"}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Предмет: <strong className="text-blue-600">{incomingCallLesson.subjectName || "Математика и логика"}</strong>
                </p>
                <p className="text-sm font-bold text-slate-800 mt-2 bg-slate-50 py-2 px-3 rounded-xl border border-slate-200/80">
                  «{incomingCallLesson.title || "Онлайн-занятие"}»
                </p>
              </div>
            </div>

            {/* Кнопки ответа и откладывания */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <Link
                href={`/room/${incomingCallLesson.id}?role=student`}
                onClick={() => setIncomingCallLesson(null)}
                className="w-full sm:flex-1 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition active:scale-95 cursor-pointer"
              >
                <PhoneCall className="w-5 h-5 animate-bounce" />
                <span>Войти в класс</span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  setDismissedCallLessonId(incomingCallLesson.id);
                  setIncomingCallLesson(null);
                  setTimeout(() => {
                    setDismissedCallLessonId(null);
                  }, 120000);
                }}
                className="w-full sm:w-auto py-3.5 px-4 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Отложить
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Модальное окно поиска и добавления преподавателей в друзья */}
      {mounted && addTeacherModalOpen && createPortal(
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setAddTeacherModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-lg p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Добавить преподавателя в друзья
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Поиск по имени или никнейму преподавателя
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddTeacherModalOpen(false)}
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
                value={searchTeacherQuery}
                onChange={(e) => setSearchTeacherQuery(e.target.value)}
                placeholder="Поиск по никнейму (@vasilina) или имени..."
                className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-[#2481cc] focus:bg-white transition"
                autoFocus
              />
              {searchTeacherQuery && (
                <button
                  type="button"
                  onClick={() => setSearchTeacherQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Список найденных учителей */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {filteredSearchTeachers.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs space-y-1">
                  <Users className="w-8 h-8 mx-auto text-slate-300 stroke-[1.5]" />
                  <p className="font-semibold text-slate-600">
                    {searchTeacherQuery ? "Никого не найдено по этому запросу" : "Преподаватели не найдены"}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Попробуйте ввести имя преподавателя или никнейм (@skokova_97)
                  </p>
                </div>
              ) : (
                filteredSearchTeachers.map((t) => {
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
                            onClick={() => handleRemoveTeacherFriend(t.id)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Удалить из друзей"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddTeacherFriend(t.id)}
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
                onClick={() => setAddTeacherModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Готово
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Модальное окно редактирования профиля ученика */}
      <EditProfileModal
        isOpen={editProfileModalOpen}
        onClose={() => setEditProfileModalOpen(false)}
        defaultRole="STUDENT"
        initialProfile={{
          id: studentId,
          name: studentName,
          username: studentUsername || (authUser?.email ? authUser.email.split("@")[0] : (isSharonov ? "sharonov" : "student")),
          email: authUser?.email || (isSharonov ? "lev-drakon2011@mail.ru" : ""),
          avatarUrl,
          grade,
          school,
          bio,
          role: "STUDENT",
        }}
        onProfileUpdated={(upd) => {
          if (upd.name) setStudentName(upd.name);
          if (upd.username) setStudentUsername(upd.username);
          if (upd.avatarUrl !== undefined) setAvatarUrl(upd.avatarUrl);
          if (upd.grade) setGrade(upd.grade);
          if (upd.school) setSchool(upd.school);
          if (upd.bio) setBio(upd.bio);
        }}
      />
    </>
  );
}
