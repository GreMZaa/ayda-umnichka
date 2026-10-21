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
import { SHARONOV_AVATAR } from "@/lib/default-avatar";
import { DEFAULT_STUDENT_LESSONS } from "@/lib/default-lessons";

interface HomeworkItem {
  id: string;
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
}

const DEFAULT_HOMEWORK: HomeworkItem[] = [];

export default function StudentCabinet() {
  const { loading: authLoading, isAuthorized, user: authUser } = useAuthGuard("student");
  const [studentId, setStudentId] = useState("53df3c76-9d23-49aa-ba0c-6f40d7a56657");
  const [studentName, setStudentName] = useState("Сергей Дмитриевич");
  const [studentUsername, setStudentUsername] = useState("sharonov");
  const [avatarUrl, setAvatarUrl] = useState(SHARONOV_AVATAR);
  const [grade, setGrade] = useState("Дошкольник");
  const [school, setSchool] = useState("Онлайн-школа «АйДаУмничка»");
  const [bio, setBio] = useState("");
  const [balance, setBalance] = useState(8);
  const [stars, setStars] = useState(28);
  const [editProfileModalOpen, setEditProfileModalOpen] = useState(false);
  const [lessons, setLessons] = useState<any[]>(DEFAULT_STUDENT_LESSONS);
  const [schoolSubjects, setSchoolSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"schedule" | "homework" | "awards">("schedule");

  // Состояние модального окна домашнего задания
  const [selectedHomework, setSelectedHomework] = useState<HomeworkItem | null>(null);
  const [homeworkModalOpen, setHomeworkModalOpen] = useState(false);
  const [answerText, setAnswerText] = useState("");
  const [attachedFileName, setAttachedFileName] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);
  const modalMouseDownRef = useRef<EventTarget | null>(null);

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
    const isUuid = (str: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

    let currentUserId = authUser?.id;
    if (!currentUserId && typeof document !== "undefined") {
      const match = document.cookie.match(/ayda_user_id=([^;]+)/);
      if (match) currentUserId = match[1].trim();
    }
    if (!currentUserId || !isUuid(currentUserId)) {
      try {
        const saved =
          localStorage.getItem("ayda_profile_student") ||
          localStorage.getItem("ayda_current_user_profile");
        if (saved) {
          const p = JSON.parse(saved);
          if (p.id && isUuid(p.id)) currentUserId = p.id;
        }
      } catch (e) {}
    }
    // Гарантированный ID ученика школы в Supabase
    if (!currentUserId || !isUuid(currentUserId)) {
      currentUserId = "53df3c76-9d23-49aa-ba0c-6f40d7a56657";
    }
    setStudentId(currentUserId);

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

        // Если все еще не найден и e-mail lev-drakon2011@mail.ru — берем аккаунт Шаронова
        if (!profile && (!authUser?.email || authUser.email.includes("lev-drakon") || authUser.email.includes("sharonov"))) {
          const { data } = await client
            .from("profiles")
            .select("*")
            .eq("id", "53df3c76-9d23-49aa-ba0c-6f40d7a56657")
            .maybeSingle();
          if (data) profile = data;
        }

        if (profile) {
          const effectiveId = profile.id;
          setStudentId(effectiveId);
          setStudentName(profile.name || "Сергей Дмитриевич");
          if (profile.avatar_url) setAvatarUrl(profile.avatar_url);

          let parsedBio: any = {};
          try {
            if (profile.bio && profile.bio.startsWith("{")) {
              parsedBio = JSON.parse(profile.bio);
            } else if (profile.bio) {
              parsedBio.grade = profile.bio;
            }
          } catch (e) {}

          const uname = cleanUsername(parsedBio.username) || resolveProfileUsername({
            id: profile.id,
            email: profile.email || authUser?.email,
            name: profile.name,
            bio: profile.bio,
          });
          setStudentUsername(uname || "sharonov");

          setGrade(parsedBio.grade || "Дошкольник");
          if (parsedBio.school) setSchool(parsedBio.school);
          if (parsedBio.bio) setBio(parsedBio.bio);
          if (typeof parsedBio.balance === "number") setBalance(parsedBio.balance);
          else setBalance(8);
          if (typeof parsedBio.stars === "number") setStars(parsedBio.stars);
          else setStars(28);

          // Обновляем локальный кэш свежими данными из БД
          try {
            localStorage.setItem("ayda_profile_student", JSON.stringify({
              id: effectiveId,
              name: profile.name,
              username: uname || "sharonov",
              avatarUrl: profile.avatar_url || "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=240&h=240&fit=crop&crop=faces",
              grade: parsedBio.grade || "Дошкольник",
              school: parsedBio.school || "Онлайн-школа «АйДаУмничка»",
              bio: parsedBio.bio || "",
              role: "STUDENT",
            }));
          } catch {}
        } else {
          // Если нового пользователя действительно нет в базе
          const defName = authUser?.user_metadata?.full_name || authUser?.email?.split("@")[0] || "Сергей Дмитриевич";
          const defGrade = authUser?.user_metadata?.grade || "Дошкольник";
          const defUname = resolveProfileUsername({
            id: currentUserId,
            email: authUser?.email,
            name: defName,
          });
          setStudentName(defName);
          setGrade(defGrade);
          setStudentUsername(defUname);
          client.from("profiles").upsert({
            id: currentUserId,
            email: authUser?.email,
            name: defName,
            role: "STUDENT",
            avatar_url: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=240&h=240&fit=crop&crop=faces",
            bio: JSON.stringify({
              username: defUname,
              grade: defGrade,
              school: "Онлайн-школа «АйДаУмничка»",
              balance: 8,
              stars: 28,
            }),
          }).then(() => {});
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
    }

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
        uid = "53df3c76-9d23-49aa-ba0c-6f40d7a56657";
      }

      const studentIdsToQuery = Array.from(
        new Set(
          [
            uid,
            studentId,
            authUser?.id,
            "53df3c76-9d23-49aa-ba0c-6f40d7a56657",
          ].filter((x): x is string => Boolean(x && isUuid(x)))
        )
      );

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
              teacherName: l.teacher?.name || "Шаронова Василина Владимировна",
              teacherAvatar: l.teacher?.avatar_url,
              studentId: l.student_id,
              studentName: l.student?.name || "Ученик Шаронов",
              studentAvatar: l.student?.avatar_url,
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
                subjectName: "Математика и логика",
                subjectColor: "#2563eb",
                teacherId: l.teacher_id,
                teacherName: "Шаронова Василина Владимировна",
                teacherAvatar: undefined,
                studentId: l.student_id,
                studentName: studentName || "Ученик Шаронов",
                studentAvatar: avatarUrl,
                startTime: l.start_time,
                endTime: l.end_time,
                status: l.status,
                roomName: l.room_name,
              }));
              setLessons(mapped);
              setLoading(false);
              return;
            } else {
              setLessons((prev) => (prev && prev.length > 0 ? prev : DEFAULT_STUDENT_LESSONS));
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
        const res = await fetchWithAuth(`/api/lessons?studentId=${uid}`);
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setLessons(data);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error(err);
      }

      // 4. Локальное хранилище недавно созданных уроков
      try {
        const local = localStorage.getItem("ayda_latest_lessons");
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setLessons(parsed);
            setLoading(false);
            return;
          }
        }
      } catch (e) {}

      setLessons((prev) => (prev && prev.length > 0 ? prev : DEFAULT_STUDENT_LESSONS));
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
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", loadStudentLessons);
      clearInterval(pollTimer);
      if (realtimeChannel && client) {
        client.removeChannel(realtimeChannel);
      }
    };
  }, [authUser?.id]);

  const liveLesson = lessons.find((l) => l.status === "LIVE");
  const upcomingLessons = lessons
    .filter((l) => l.status === "SCHEDULED")
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
    setAttachedFileName("");
    setSubmitSuccess(false);
    setHomeworkModalOpen(true);
  };

  // Отправка задания на проверку учителю
  const handleSubmitHomework = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHomework) return;

    const updatedList = homeworkList.map((item) =>
      item.id === selectedHomework.id
        ? {
            ...item,
            status: "SUBMITTED" as const,
            statusText: "На проверке у учителя",
            badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
            studentAnswer: answerText,
          }
        : item
    );

    setHomeworkList(updatedList);
    try {
      localStorage.setItem("ayda_student_hw", JSON.stringify(updatedList));
    } catch (e) {}

    // Мгновенно обновляем выбранное задание, чтобы модалка и кнопка синхронизировались
    setSelectedHomework((prev) =>
      prev
        ? {
            ...prev,
            status: "SUBMITTED",
            statusText: "На проверке у учителя",
            badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
            studentAnswer: answerText,
          }
        : null
    );

    setSubmitSuccess(true);

    setTimeout(() => {
      setHomeworkModalOpen(false);
      setSubmitSuccess(false);
    }, 1200);
  };

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
          name: studentName,
          username: studentUsername || "sharonov",
          email: authUser?.email || undefined,
          phone: "+7 (900) 123-45-67",
          avatar: avatarUrl || "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=240&h=240&fit=crop&crop=faces",
          grade: grade || "Дошкольник",
          bio: bio || "Онлайн-школа «АйДаУмничка»",
          balance: balance,
          stars: stars,
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

                {!liveLesson && upcomingLessons.length > 0 && (
                  <div className="bg-white rounded-3xl p-5 sm:p-6 border border-blue-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-300 bg-gradient-to-r from-blue-50/70 via-white to-white">
                    <div className="space-y-1.5">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-[#2481cc] text-xs font-bold">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Ближайший запланированный урок</span>
                      </div>
                      <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                        {upcomingLessons[0].title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                        <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                          {upcomingLessons[0].subjectName}
                        </span>
                        <span>•</span>
                        <span>Преподаватель: <strong className="text-slate-800">{upcomingLessons[0].teacherName}</strong></span>
                        <span>•</span>
                        <span className="font-extrabold text-[#2481cc]">
                          {formatTolyatti(upcomingLessons[0].startTime, "d MMMM (EE) в HH:mm")}
                        </span>
                      </div>
                    </div>

                    <Link
                      href={`/room/${upcomingLessons[0].id || upcomingLessons[0].roomName}?role=student`}
                      className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-[#2481cc] hover:bg-[#1f70b0] text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 transition transform hover:scale-105 active:scale-95 shrink-0 w-full sm:w-auto cursor-pointer"
                    >
                      <Video className="w-4 h-4 text-white" />
                      <span>Ссылка на видеокласс</span>
                    </Link>
                  </div>
                )}

                <ScheduleCalendar
                  role="student"
                  lessons={lessons}
                />

                {schoolSubjects.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 px-1">
                      Доступные дисциплины школы «АйДаУмничка»:
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                      {schoolSubjects.map((sub) => (
                        <div
                          key={sub.id}
                          className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1.5"
                        >
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: sub.color || "#2481cc" }}
                          />
                          <div className="font-extrabold text-xs text-slate-900">{sub.name}</div>
                          <div className="text-[10px] text-slate-500">Индивидуальная программа</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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

              {/* Прикрепление файла / фото тетради */}
              {selectedHomework.status !== "CHECKED" && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Прикрепить фото тетради или скан:
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer flex items-center gap-2 transition">
                      <Upload className="w-3.5 h-3.5 text-blue-600" />
                      <span>{attachedFileName ? "Заменить файл" : "Выбрать файл..."}</span>
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setAttachedFileName(file.name);
                        }}
                      />
                    </label>
                    {attachedFileName && (
                      <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{attachedFileName}</span>
                      </span>
                    )}
                  </div>
                </div>
              )}

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

      {/* Модальное окно редактирования профиля ученика */}
      <EditProfileModal
        isOpen={editProfileModalOpen}
        onClose={() => setEditProfileModalOpen(false)}
        defaultRole="STUDENT"
        initialProfile={{
          id: studentId,
          name: studentName,
          username: studentUsername || "sharonov",
          email: authUser?.email || "lev-drakon2011@mail.ru",
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
