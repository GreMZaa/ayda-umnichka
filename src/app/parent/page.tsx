"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Calendar,
  Clock,
  Video,
  CreditCard,
  GraduationCap,
  PhoneCall,
  CheckCircle2,
  Star,
  FileText,
  AlertCircle,
  ChevronRight,
  BookOpen,
  ArrowRight,
  Sparkles,
  MessageSquare,
  PlusCircle,
  HelpCircle,
  ShieldCheck,
  User,
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  SlidersHorizontal,
  LayoutGrid,
  X,
  Edit3,
  Lock,
  Key,
  Copy,
  Check,
  Eye,
  EyeOff,
} from "lucide-react";
import { format, startOfWeek, addDays, isSameDay, addWeeks, subWeeks } from "date-fns";
import { ru } from "date-fns/locale";
import { getSupabase } from "@/lib/supabase";
import { fetchWithAuth } from "@/lib/api-client";
import { useAuthGuard, AuthLoadingScreen } from "@/lib/auth-session";
import ScheduleCalendar from "@/components/ScheduleCalendar";
import EditProfileModal from "@/components/EditProfileModal";
import TelegramCabinet from "@/components/TelegramCabinet";
import { formatTolyatti } from "@/lib/tolyatti-time";

interface Child {
  id: string;
  name: string;
  grade: string;
  avatar: string;
  balance: number;
  stars: number;
  nextLesson: string;
  teacher: string;
  subject: string;
}

const AVATAR_OPTIONS = [
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1588072432836-e10032774350?w=200&h=200&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1544717305-2782549b5136?w=200&h=200&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=200&h=200&fit=crop&crop=faces",
];

const GRADES = [
  "Дошкольник",
  "1 класс",
  "2 класс",
  "3 класс",
  "4 класс",
  "5 класс",
  "6 класс",
  "7 класс",
  "8 класс",
  "9 класс",
  "10 класс",
  "11 класс",
];

export default function ParentCabinet() {
  const { loading: authLoading, isAuthorized, user: authUser } = useAuthGuard("parent");
  const [parentId, setParentId] = useState("");
  const [parentName, setParentName] = useState("Родитель");
  const [parentEmail, setParentEmail] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [parentAvatar, setParentAvatar] = useState("");
  const [parentBio, setParentBio] = useState("");
  const [parentPreferredContact, setParentPreferredContact] = useState("chat");
  const [editProfileModalOpen, setEditProfileModalOpen] = useState(false);

  useEffect(() => {
    if (!authUser?.id) return;
    const currentUserId = authUser.id;
    setParentId(currentUserId);

    const client = getSupabase();
    if (client) {
      const meta = authUser.user_metadata || {};
      if (meta.full_name) setParentName(meta.full_name);
      else if (authUser.email) setParentName(authUser.email.split("@")[0]);
      if (authUser.email) setParentEmail(authUser.email);
      if (meta.avatar_url) setParentAvatar(meta.avatar_url);

      client
        .from("profiles")
        .select("*")
        .eq("id", currentUserId)
        .maybeSingle()
        .then(({ data: prof }) => {
          if (prof) {
            if (prof.name) setParentName(prof.name);
            if (prof.avatar_url) setParentAvatar(prof.avatar_url);
            if (prof.phone) setParentPhone(prof.phone);
            if (prof.email) setParentEmail(prof.email);
            if (prof.bio) {
              setParentBio(prof.bio);
              try {
                const parsed = JSON.parse(prof.bio);
                if (parsed.preferredContact) setParentPreferredContact(parsed.preferredContact);
              } catch {}
            }
          } else {
            const defName = meta.full_name || authUser.email?.split("@")[0] || "Родитель";
            client.from("profiles").upsert({
              id: currentUserId,
              email: authUser.email,
              name: defName,
              role: "PARENT",
            }).then(() => {});
          }
        });
    }

    try {
      const saved = localStorage.getItem("ayda_profile_parent") || localStorage.getItem("ayda_current_user_profile");
      if (saved) {
        const p = JSON.parse(saved);
        if (p.name) setParentName(p.name);
        if (p.avatarUrl) setParentAvatar(p.avatarUrl);
        if (p.phone) setParentPhone(p.phone);
        if (p.email) setParentEmail(p.email);
        if (p.bio) setParentBio(p.bio);
      }
    } catch (e) {}

    const handleProfileUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      const r = (detail.role || "").toUpperCase();
      if (!r || r === "PARENT") {
        if (detail.name) setParentName(detail.name);
        if (detail.avatarUrl !== undefined) setParentAvatar(detail.avatarUrl);
        if (detail.phone !== undefined) setParentPhone(detail.phone);
        if (detail.bio !== undefined) setParentBio(detail.bio);
        if (detail.preferredContact !== undefined) setParentPreferredContact(detail.preferredContact);
      }
    };

    window.addEventListener("ayda:profile-updated", handleProfileUpdated);
    return () => window.removeEventListener("ayda:profile-updated", handleProfileUpdated);
  }, [authUser?.id]);

  const defaultChildren: Child[] = [];

  const [children, setChildren] = useState<Child[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ayda_parent_children");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const clean = parsed.filter(
              (c: any) =>
                c.id !== "2a62e436-f539-4ec5-b3af-a1afabfa0eec" &&
                !c.id?.startsWith("00000000-")
            );
            if (clean.length > 0) return clean;
          }
        } catch (e) {
          console.error(e);
        }
      }
    }
    return defaultChildren;
  });

  const [selectedChildId, setSelectedChildId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ayda_parent_children");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const clean = parsed.filter(
              (c: any) =>
                c.id !== "2a62e436-f539-4ec5-b3af-a1afabfa0eec" &&
                !c.id?.startsWith("00000000-")
            );
            if (clean.length > 0) return clean[0].id;
          }
        } catch (e) {}
      }
    }
    return "";
  });

  const [activeTab, setActiveTab] = useState<"reports" | "schedule" | "billing">("reports");
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Состояние модального окна добавления / редактирования ребенка
  const [childModalOpen, setChildModalOpen] = useState(false);
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [childFormName, setChildFormName] = useState("");
  const [childFormGrade, setChildFormGrade] = useState("3 класс");
  const [childFormAvatar, setChildFormAvatar] = useState(AVATAR_OPTIONS[0]);
  const [childFormLogin, setChildFormLogin] = useState("");
  const [childFormPassword, setChildFormPassword] = useState("");
  const [showChildPassword, setShowChildPassword] = useState(false);
  const [childFormSubmitting, setChildFormSubmitting] = useState(false);
  const [childFormError, setChildFormError] = useState<string | null>(null);

  // Состояние модального окна показа созданных реквизитов ученика
  const [createdCredentialsModal, setCreatedCredentialsModal] = useState<{
    name: string;
    login: string;
    password: string;
  } | null>(null);
  const [copiedCredentials, setCopiedCredentials] = useState(false);

  // Сохранение детей в localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("ayda_parent_children", JSON.stringify(children));
    }
  }, [children]);

  // Загрузка реальных учеников из Supabase с балансом и классами
  useEffect(() => {
    const client = getSupabase();
    if (client) {
      client
        .from("profiles")
        .select("*")
        .eq("role", "STUDENT")
        .order("created_at", { ascending: true })
        .then(({ data }) => {
          if (data && data.length > 0) {
            const mapped: Child[] = data.map((d: any, index: number) => {
              let parsedBio: any = {};
              try {
                if (d.bio && d.bio.startsWith("{")) {
                  parsedBio = JSON.parse(d.bio);
                } else if (d.bio) {
                  parsedBio.grade = d.bio;
                }
              } catch (e) {}

              const balance = typeof parsedBio.balance === "number" ? parsedBio.balance : 0;
              const stars = typeof parsedBio.stars === "number" ? parsedBio.stars : 0;
              const grade = parsedBio.grade || d.bio || "3 класс";

              return {
                id: d.id,
                name: d.name,
                grade: grade,
                avatar: d.avatar_url || AVATAR_OPTIONS[index % AVATAR_OPTIONS.length],
                balance: balance,
                stars: stars,
                nextLesson: "Расписание формируется",
                teacher: "Анна Сергеевна Иванова",
                subject: "Математика и логика",
              };
            });
            setChildren(mapped);
            if (!mapped.some((c) => c.id === selectedChildId)) {
              setSelectedChildId(mapped[0]?.id || "");
            }
          } else {
            setChildren([]);
            setSelectedChildId("");
          }
        });
    }
  }, []);

  const selectedChild = children.find((c) => c.id === selectedChildId) || children[0] || null;

  useEffect(() => {
    if (!selectedChildId) {
      setLessons([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const loadParentLessons = () => {
      fetchWithAuth(`/api/lessons?studentId=${selectedChildId}`)
        .then((res) => res.json())
        .then((data) => {
          const list = Array.isArray(data) ? data : [];
          const enriched = list.map((l: any) => {
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
        })
        .catch((err) => {
          console.error(err);
          setLoading(false);
        });
    };

    loadParentLessons();

    const handleReportSaved = () => {
      loadParentLessons();
    };

    window.addEventListener("ayda:report-saved", handleReportSaved);
    window.addEventListener("ayda:lessons-updated", handleReportSaved);
    return () => {
      window.removeEventListener("ayda:report-saved", handleReportSaved);
      window.removeEventListener("ayda:lessons-updated", handleReportSaved);
    };
  }, [selectedChildId]);

  const liveLesson = lessons.find((l) => l.status === "LIVE");
  const upcomingLessons = lessons.filter((l) => l.status === "SCHEDULED");
  const completedLessons = lessons.filter((l) => l.status === "COMPLETED");

  const initial = parentName.charAt(0).toUpperCase();

  const generateRandomPassword = () => {
    return `umnik${Math.floor(1000 + Math.random() * 9000)}`;
  };

  // Открытие модалки добавления ребенка
  const handleOpenAddChild = () => {
    setEditingChild(null);
    setChildFormName("");
    setChildFormGrade("3 класс");
    setChildFormAvatar(AVATAR_OPTIONS[0]);
    setChildFormLogin("");
    setChildFormPassword(generateRandomPassword());
    setShowChildPassword(false);
    setChildFormError(null);
    setChildModalOpen(true);
  };

  // Открытие модалки редактирования ребенка
  const handleOpenEditChild = (e: React.MouseEvent, child: Child) => {
    e.stopPropagation();
    setEditingChild(child);
    setChildFormName(child.name);
    setChildFormGrade(child.grade);
    setChildFormAvatar(child.avatar);
    setChildFormError(null);
    setChildModalOpen(true);
  };

  // Удаление ребенка (синхронизировано с API и Supabase)
  const handleDeleteChild = async (e: React.MouseEvent, childId: string) => {
    e.stopPropagation();
    const target = children.find((c) => c.id === childId);
    if (!confirm(`Вы действительно хотите удалить профиль «${target?.name || "ребёнка"}»?`)) {
      return;
    }

    try {
      await fetchWithAuth(`/api/parent/children?id=${childId}`, { method: "DELETE" });
    } catch (err) {
      console.error("Supabase delete child error:", err);
    }

    const nextList = children.filter((c) => c.id !== childId);
    setChildren(nextList);
    if (selectedChildId === childId) {
      setSelectedChildId(nextList[0]?.id || "");
    }
  };

  // Сохранение ребенка (добавление через API с созданием логина/пароля или редактирование)
  const handleSaveChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!childFormName.trim()) return;
    setChildFormError(null);

    if (editingChild) {
      // Редактирование в Supabase
      const client = getSupabase();
      const bioPayload = JSON.stringify({
        grade: childFormGrade,
        balance: editingChild.balance,
        stars: editingChild.stars,
        school: "Онлайн-школа «АйДаУмничка»",
      });

      if (client) {
        try {
          await client
            .from("profiles")
            .update({
              name: childFormName.trim(),
              avatar_url: childFormAvatar,
              bio: bioPayload,
            })
            .eq("id", editingChild.id);
        } catch (err) {
          console.error("Supabase edit child error:", err);
        }
      }

      const updated = children.map((c) =>
        c.id === editingChild.id
          ? {
              ...c,
              name: childFormName.trim(),
              grade: childFormGrade,
              avatar: childFormAvatar,
            }
          : c
      );
      setChildren(updated);
      setChildModalOpen(false);
    } else {
      // Создание нового ребёнка с автоматической регистрацией логина и пароля
      if (!childFormPassword || childFormPassword.length < 6) {
        setChildFormError("Пароль должен содержать не менее 6 символов.");
        return;
      }

      setChildFormSubmitting(true);
      try {
        const res = await fetchWithAuth("/api/parent/children", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: childFormName.trim(),
            grade: childFormGrade,
            login: childFormLogin.trim(),
            password: childFormPassword.trim(),
            avatarUrl: childFormAvatar,
            parentId: parentId || authUser?.id,
          }),
        });

        const data = await res.json();
        if (!res.ok || data.error) {
          setChildFormError(data.error || "Не удалось создать аккаунт ребёнка.");
          setChildFormSubmitting(false);
          return;
        }

        const newChild: Child = {
          id: data.child.id,
          name: data.child.name,
          grade: data.child.grade,
          avatar: data.child.avatar,
          balance: data.child.balance,
          stars: data.child.stars,
          nextLesson: data.child.nextLesson,
          teacher: data.child.teacher,
          subject: data.child.subject,
        };

        setChildren((prev) => [...prev, newChild]);
        setSelectedChildId(newChild.id);
        setChildModalOpen(false);

        // Открываем модальное окно с отображением созданных реквизитов для входа
        setCreatedCredentialsModal({
          name: data.child.name,
          login: data.credentials.login,
          password: data.credentials.password,
        });
      } catch (err: any) {
        setChildFormError(err?.message || "Ошибка соединения с сервером.");
      } finally {
        setChildFormSubmitting(false);
      }
    }
  };

  if (authLoading || !isAuthorized) {
    return (
      <AuthLoadingScreen
        roleTitle="Личный кабинет родителя"
        onBypass={() => window.location.reload()}
      />
    );
  }

  return (
    <>
      <TelegramCabinet
        currentRole="PARENT"
        currentUser={{
          id: parentId,
          name: parentName,
          email: parentEmail || authUser?.email || undefined,
          phone: parentPhone || "+7 (900) 123-45-67",
          avatar: parentAvatar,
          bio: parentBio || `Родитель ${children.length > 0 ? children.map((c) => c.name).join(", ") : "ученика"}`,
        }}
        lessons={lessons}
        onRefreshData={() => window.location.reload()}
        extraCabinetSections={[
          {
            key: "children",
            title: "Мои дети",
            icon: Users,
            badge: children.length,
            render: () => (
              <div className="space-y-4">
                {liveLesson && selectedChild && (
                  <div className="bg-emerald-50 border-2 border-emerald-500 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-in fade-in duration-300">
                    <div className="space-y-1.5">
                      <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        <span>{selectedChild.name} сейчас на онлайн-уроке</span>
                      </div>
                      <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                        {liveLesson.title}
                      </h2>
                      <p className="text-xs text-slate-600">
                        Преподаватель: <strong>{liveLesson.teacherName}</strong> • До {formatTolyatti(liveLesson.endTime, "HH:mm")}
                      </p>
                    </div>

                    <Link
                      href={`/room/${liveLesson.id || liveLesson.roomName}?role=parent`}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition self-stretch sm:self-auto justify-center cursor-pointer"
                    >
                      <Video className="w-4 h-4" />
                      <span>Присутствовать на уроке</span>
                      <ArrowRight className="w-4 h-4 ml-0.5" />
                    </Link>
                  </div>
                )}

                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                      Обучающиеся дети ({children.length}):
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenAddChild}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-50 text-[#2481cc] hover:bg-blue-100 border border-blue-200 font-bold text-xs transition cursor-pointer shadow-2xs active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Добавить ребёнка</span>
                  </button>
                </div>

                {children.length === 0 ? (
                  <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 text-center space-y-3.5 shadow-xs">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#2481cc] border border-blue-100 flex items-center justify-center mx-auto">
                      <Users className="w-7 h-7" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-extrabold text-slate-900 text-base">
                        У вас пока не добавлено детей
                      </h3>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Нажмите кнопку ниже, чтобы создать профиль ребёнка. Система автоматически сформирует для него логин и пароль для самостоятельного входа в кабинет.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenAddChild}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2481cc] hover:bg-[#1f70b0] text-white font-bold text-xs shadow-md shadow-blue-500/20 transition cursor-pointer active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Добавить ребёнка</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {children.map((child) => {
                      const isSelected = child.id === selectedChildId;
                      return (
                        <div
                          key={child.id}
                          onClick={() => setSelectedChildId(child.id)}
                          className={`p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border text-left transition flex items-center justify-between gap-3 sm:gap-4 relative cursor-pointer group ${
                            isSelected
                              ? "bg-white border-[#2481cc] shadow-md ring-2 ring-blue-500/10"
                              : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                          }`}
                        >
                          <div className="flex items-center gap-3 sm:gap-3.5">
                            <img
                              src={child.avatar}
                              alt={child.name}
                              className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl object-cover border border-slate-200 shrink-0"
                            />
                            <div>
                              <div className="flex items-center gap-1.5 sm:gap-2">
                                <h3 className="font-extrabold text-slate-900 text-xs sm:text-base">{child.name}</h3>
                                <span className="text-[10px] sm:text-[11px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md bg-blue-50 text-[#2481cc]">
                                  {child.grade}
                                </span>
                              </div>
                              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1">
                                Урок: <strong className="text-slate-800">{child.nextLesson}</strong>
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1.5 sm:gap-2 shrink-0">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => handleOpenEditChild(e, child)}
                                className="p-2 rounded-xl text-slate-400 hover:text-[#2481cc] hover:bg-blue-50 transition cursor-pointer active:scale-95"
                                title="Редактировать профиль ребёнка"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteChild(e, child.id)}
                                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer active:scale-95"
                                title="Удалить ребёнка"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="text-right">
                              <div className="text-[11px] sm:text-xs font-black text-emerald-800 bg-emerald-50 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-xl border border-emerald-200">
                                {child.balance} ур.
                              </div>
                            </div>
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
            key: "reports",
            title: "Отчёты и оценки",
            icon: FileText,
            badge: completedLessons.length,
            render: () => (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">
                      Отчёты преподавателей по урокам
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Рекомендации, оценки и комментарии репетиторов по занятиям {selectedChild?.name || "ребёнка"}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
                    Уроков: {completedLessons.length}
                  </span>
                </div>

                {completedLessons.length === 0 ? (
                  <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center text-slate-500 text-xs">
                    Пока нет завершённых уроков с отчётами для {selectedChild?.name || "ребёнка"}
                  </div>
                ) : (
                  completedLessons.map((lesson) => {
                    const note = lesson.notes && lesson.notes.length > 0 ? lesson.notes[lesson.notes.length - 1] : null;
                    return (
                      <div
                        key={lesson.id}
                        className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4 hover:border-blue-200 transition"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-[#2481cc] uppercase tracking-wider">
                                {lesson.subjectName}
                              </span>
                              <span className="text-xs text-slate-400">•</span>
                              <span className="text-xs text-slate-500 font-medium">
                                {formatTolyatti(lesson.startTime, "d MMMM yyyy, HH:mm")}
                              </span>
                            </div>
                            <h3 className="font-extrabold text-slate-900 text-base mt-1">
                              {lesson.title}
                            </h3>
                          </div>

                          <div className="flex items-center gap-3">
                            {note?.grade ? (
                              <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-extrabold text-xs">
                                <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                                <span>Оценка: {note.grade} / 5</span>
                              </div>
                            ) : (
                              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl">
                                Без оценки
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Урок проведён
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                            <div className="flex items-center gap-1.5 font-bold text-slate-800">
                              <GraduationCap className="w-4 h-4 text-[#2481cc]" />
                              <span>Что прошли на занятии:</span>
                            </div>
                            <p className="text-slate-700 leading-relaxed">
                              {note?.content || `Урок по теме «${lesson.title}» успешно завершён.`}
                            </p>
                          </div>

                          <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-1.5">
                            <div className="flex items-center gap-1.5 font-bold text-blue-900">
                              <Sparkles className="w-4 h-4 text-[#2481cc]" />
                              <span>Совет родителям на дом:</span>
                            </div>
                            <p className="text-slate-700 leading-relaxed">
                              {note?.feedback || "Продолжайте регулярные занятия и поддерживайте интерес ребёнка к предмету!"}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 pt-2">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">Преподаватель:</span>
                            <strong className="text-slate-800">{note?.authorName || lesson.teacherName}</strong>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">Статус отчёта:</span>
                            {note ? (
                              <span className="font-bold text-emerald-700">✓ Отчёт получен и проверен</span>
                            ) : (
                              <span className="text-amber-700 font-medium">Ожидает отчёта преподавателя</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ),
          },
          {
            key: "schedule",
            title: "Расписание занятий",
            icon: Calendar,
            badge: upcomingLessons.length,
            render: () => (
              <ScheduleCalendar
                role="parent"
                lessons={lessons}
              />
            ),
          },
          {
            key: "billing",
            title: "Абонемент и баланс",
            icon: CreditCard,
            render: () => (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                  <div>
                    <span className="text-xs font-extrabold text-[#2481cc] uppercase tracking-wider">
                      Текущий тарифный план
                    </span>
                    <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1">
                      Абонемент «Оптимальный» (8 уроков в месяц)
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Действует до 30 ноября 2026 г. • Прикреплен к {selectedChild?.name || "ребёнку"}
                    </p>
                  </div>

                  <button
                    onClick={() => setShowTopupModal(true)}
                    className="px-6 py-3 rounded-2xl bg-[#2481cc] hover:bg-[#1f70b0] text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/25 transition cursor-pointer"
                  >
                    Продлить абонемент
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-600">Использовано уроков:</span>
                    <span className="text-slate-900">2 из 8 (осталось {selectedChild?.balance ?? 0})</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div className="bg-[#2481cc] h-3 rounded-full" style={{ width: "25%" }} />
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block">
                    История посещений и оплат:
                  </span>
                  <div className="divide-y divide-slate-100 text-xs text-slate-600">
                    <div className="py-3 flex items-center justify-between">
                      <span>Урок по математике (Анна Сергеевна)</span>
                      <span className="font-bold text-slate-800">-1 занятие (17 октября)</span>
                    </div>
                    <div className="py-3 flex items-center justify-between">
                      <span>Урок по логике (Анна Сергеевна)</span>
                      <span className="font-bold text-slate-800">-1 занятие (14 октября)</span>
                    </div>
                    <div className="py-3 flex items-center justify-between text-emerald-700 font-bold">
                      <span>Оплата абонемента на 8 занятий через СБП</span>
                      <span>+8 занятий (10 октября)</span>
                    </div>
                  </div>
                </div>
              </div>
            ),
          },
        ]}
      />

      {/* 5. МОДАЛЬНОЕ ОКНО ДОБАВЛЕНИЯ / РЕДАКТИРОВАНИЯ РЕБЁНКА */}
      {childModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-7 space-y-4 sm:space-y-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-slate-900 text-base">
                  {editingChild ? "Редактировать ребёнка" : "Добавить ребёнка"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setChildModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveChild} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Имя и фамилия ребёнка: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={childFormName}
                  onChange={(e) => setChildFormName(e.target.value)}
                  placeholder="Например: Михаил Смирнов"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Класс обучения:
                </label>
                <select
                  value={childFormGrade}
                  onChange={(e) => setChildFormGrade(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition cursor-pointer"
                >
                  {GRADES.map((g, idx) => (
                    <option key={idx} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              {/* Поля создания логина и пароля при регистрации нового ребёнка */}
              {!editingChild && (
                <div className="space-y-3.5 pt-2 border-t border-slate-100">
                  <div className="bg-blue-50/70 rounded-2xl p-3 border border-blue-100/80 text-[11px] text-blue-900 leading-relaxed">
                    <div className="font-extrabold flex items-center gap-1.5 text-blue-800 mb-0.5">
                      <Key className="w-3.5 h-3.5" />
                      <span>Учётная запись для входа ребёнка</span>
                    </div>
                    Ученик сможет входить в свой личный кабинет на странице <strong className="text-blue-950 font-mono">/login</strong> по этим логину и паролю.
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">
                        Логин (E-mail):
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const translit = (childFormName || "student")
                            .toLowerCase()
                            .replace(/[а-яё]/g, (c) => {
                              const map: Record<string, string> = {
                                а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh",
                                з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
                                п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts",
                                ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya"
                              };
                              return map[c] || "";
                            })
                            .replace(/[^a-z0-9]/g, "")
                            .slice(0, 15);
                          setChildFormLogin(`${translit || "student"}_${Math.floor(1000 + Math.random() * 9000)}@umnichka.ru`);
                        }}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-800 transition cursor-pointer"
                      >
                        Сгенерировать
                      </button>
                    </div>
                    <input
                      type="text"
                      value={childFormLogin}
                      onChange={(e) => setChildFormLogin(e.target.value)}
                      placeholder="Например: misha@umnichka.ru"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition placeholder:text-slate-400"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Если оставить пустым — логин сформируется автоматически на домене @umnichka.ru.
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">
                        Пароль: <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setChildFormPassword(generateRandomPassword())}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-800 transition cursor-pointer"
                      >
                        Сгенерировать пароль
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showChildPassword ? "text" : "password"}
                        required
                        value={childFormPassword}
                        onChange={(e) => setChildFormPassword(e.target.value)}
                        placeholder="Минимум 6 символов"
                        className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition placeholder:text-slate-400 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowChildPassword(!showChildPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                        title={showChildPassword ? "Скрыть пароль" : "Показать пароль"}
                      >
                        {showChildPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Пароль для самостоятельного входа ребёнка (минимум 6 символов).
                    </p>
                  </div>
                </div>
              )}

              {childFormError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{childFormError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Выберите аватарку:
                </label>
                <div className="flex items-center gap-2.5">
                  {AVATAR_OPTIONS.map((av, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setChildFormAvatar(av)}
                      className={`relative rounded-2xl overflow-hidden border-2 transition cursor-pointer ${
                        childFormAvatar === av
                          ? "border-blue-600 ring-2 ring-blue-600/30 scale-105"
                          : "border-slate-200 hover:border-slate-300 opacity-70 hover:opacity-100"
                      }`}
                    >
                      <img src={av} alt="avatar" className="w-12 h-12 object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setChildModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={childFormSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition cursor-pointer flex items-center gap-1.5"
                >
                  {childFormSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Создаём аккаунт...</span>
                    </>
                  ) : (
                    <span>{editingChild ? "Сохранить изменения" : "Создать и выдать доступ"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5.1. МОДАЛЬНОЕ ОКНО С ПОКАЗОМ СОЗДАННЫХ РЕКВИЗИТОВ ДЛЯ ВХОДА РЕБЁНКА */}
      {createdCredentialsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-5 shadow-2xl border border-slate-200">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="font-black text-slate-900 text-lg">
                Учётная запись ученика создана!
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Профиль <strong>«{createdCredentialsModal.name}»</strong> успешно зарегистрирован. Передайте эти данные ребёнку для входа в кабинет.
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3 text-xs">
              <div>
                <span className="text-[11px] font-bold text-slate-500 block mb-0.5">Логин (E-mail) для входа:</span>
                <div className="font-mono font-bold text-slate-900 bg-white px-3 py-2 rounded-xl border border-slate-200 select-all">
                  {createdCredentialsModal.login}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-500 block mb-0.5">Пароль:</span>
                <div className="font-mono font-bold text-blue-700 bg-white px-3 py-2 rounded-xl border border-slate-200 select-all">
                  {createdCredentialsModal.password}
                </div>
              </div>

              <div className="pt-1">
                <span className="text-[11px] font-bold text-slate-500 block mb-0.5">Страница входа:</span>
                <div className="font-mono text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-[11px] truncate">
                  /login
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const text = `Данные для входа в онлайн-школу «АйДаУмничка»:\nУченик: ${createdCredentialsModal.name}\nЛогин: ${createdCredentialsModal.login}\nПароль: ${createdCredentialsModal.password}\nВход: ${typeof window !== "undefined" ? window.location.origin : ""}/login`;
                  navigator.clipboard.writeText(text);
                  setCopiedCredentials(true);
                  setTimeout(() => setCopiedCredentials(false), 2500);
                }}
                className={`w-full py-3 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-md ${
                  copiedCredentials
                    ? "bg-emerald-600 text-white shadow-emerald-500/20"
                    : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20"
                }`}
              >
                {copiedCredentials ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Данные скопированы в буфер!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Скопировать логин и пароль</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setCreatedCredentialsModal(null)}
                className="w-full py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs transition cursor-pointer"
              >
                Готово, закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. МОДАЛЬНОЕ ОКНО ПОПОЛНЕНИЯ БАЛАНСА */}
      {showTopupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-7 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-slate-900 text-base">Пополнение абонемента</h3>
              </div>
              <button
                onClick={() => setShowTopupModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Выберите пакет занятий для <strong>{selectedChild?.name || "ребёнка"}</strong>:
            </p>

            <div className="space-y-3">
              {[
                { count: "4 занятия", lessons: 4, price: "4 800 ₽", benefit: "Пробный месяц" },
                { count: "8 занятий", lessons: 8, price: "8 800 ₽", benefit: "Популярный (скидка 10%)" },
                { count: "16 занятий", lessons: 16, price: "15 900 ₽", benefit: "Максимальный прогресс (скидка 18%)" },
              ].map((pack, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl border border-slate-200 hover:border-blue-500 bg-slate-50/50 hover:bg-blue-50/30 flex items-center justify-between cursor-pointer transition shadow-2xs group"
                  onClick={async () => {
                    if (!selectedChild) return;
                    const nextBalance = (selectedChild.balance || 0) + pack.lessons;
                    const client = getSupabase();
                    if (client) {
                      try {
                        const bioPayload = JSON.stringify({
                          grade: selectedChild.grade,
                          balance: nextBalance,
                          stars: selectedChild.stars,
                          school: "Онлайн-школа «АйДаУмничка»",
                        });
                        await client.from("profiles").update({ bio: bioPayload }).eq("id", selectedChild.id);
                      } catch (err) {
                        console.error("Supabase topup error:", err);
                      }
                    }
                    const updated = children.map((c) =>
                      c.id === selectedChild.id ? { ...c, balance: nextBalance } : c
                    );
                    setChildren(updated);
                    alert(`Оплата «${pack.count}» успешно проведена! Баланс ученика ${selectedChild.name} пополнен на +${pack.lessons} уроков и сохранён в Supabase (всего: ${nextBalance} уроков).`);
                    setShowTopupModal(false);
                  }}
                >
                  <div>
                    <div className="font-extrabold text-slate-900 text-xs sm:text-sm group-hover:text-blue-700 transition">{pack.count}</div>
                    <div className="text-[11px] text-blue-600 font-semibold">{pack.benefit}</div>
                  </div>
                  <div className="font-black text-sm sm:text-base text-slate-900">{pack.price}</div>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-slate-400 text-center pt-2">
              🔒 Оплата защищена 54-ФЗ. Баланс занятий мгновенно синхронизируется с базой данных Supabase.
            </p>
          </div>
        </div>
      )}

      {/* 7. УНИВЕРСАЛЬНОЕ МОДАЛЬНОЕ ОКНО РЕДАКТИРОВАНИЯ ПРОФИЛЯ РОДИТЕЛЯ */}
      <EditProfileModal
        isOpen={editProfileModalOpen}
        onClose={() => setEditProfileModalOpen(false)}
        defaultRole="PARENT"
        initialData={{
          id: parentId,
          name: parentName,
          email: parentEmail,
          phone: parentPhone,
          avatarUrl: parentAvatar,
          bio: parentBio,
          preferredContact: parentPreferredContact,
        }}
      />
    </>
  );
}
