"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Users,
  GraduationCap,
  Calendar,
  Clock,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Search,
  Phone,
  Mail,
  Video,
  RefreshCw,
  LogOut,
  ArrowRight,
  BookOpen,
  UserCheck,
  Sparkles,
  ExternalLink,
  Lock,
  Eye,
  EyeOff,
  UserPlus,
  Inbox,
  Check,
  X,
  Edit3,
} from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { getSupabase } from "@/lib/supabase";
import { setAuthCookies, clearAuthCookies } from "@/lib/auth-session";
import EditProfileModal from "@/components/EditProfileModal";

export default function AdminPage() {
  // Авторизация администратора через Supabase
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [adminEmail, setAdminEmail] = useState("admin@umnichka.ru");
  const [adminPassword, setAdminPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authChecking, setAuthChecking] = useState(true);

  // Профиль администратора
  const [adminId, setAdminId] = useState("");
  const [adminName, setAdminName] = useState("Администратор");
  const [adminAvatar, setAdminAvatar] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [adminBio, setAdminBio] = useState("");
  const [editProfileModalOpen, setEditProfileModalOpen] = useState(false);

  // Навигация по вкладкам
  const [activeTab, setActiveTab] = useState<
    "overview" | "students" | "parents" | "teachers" | "lessons" | "leads" | "subjects"
  >("overview");

  // Данные из базы
  const [profiles, setProfiles] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [parentStudents, setParentStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Поисковые строки
  const [searchQuery, setSearchQuery] = useState("");

  // Модальные окна добавления и редактирования
  const [showAddLessonModal, setShowAddLessonModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showAddTeacherModal, setShowAddTeacherModal] = useState(false);
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [showEditParentModal, setShowEditParentModal] = useState(false);

  // ID редактируемых сущностей (если null - создание новой)
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [editingParentId, setEditingParentId] = useState<string | null>(null);

  // Форма урока
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonSubjectId, setLessonSubjectId] = useState("");
  const [lessonTeacherId, setLessonTeacherId] = useState("");
  const [lessonStudentId, setLessonStudentId] = useState("");
  const [lessonDateTime, setLessonDateTime] = useState("");

  // Форма ученика
  const [studentName, setStudentName] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentGrade, setStudentGrade] = useState("3 класс");
  const [studentParentId, setStudentParentId] = useState("");

  // Форма учителя
  const [teacherName, setTeacherName] = useState("");
  const [teacherPhone, setTeacherPhone] = useState("");
  const [teacherEmail, setTeacherEmail] = useState("");
  const [teacherBio, setTeacherBio] = useState("");

  // Форма родителя
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentBio, setParentBio] = useState("");

  // Форма предмета
  const [subjectName, setSubjectName] = useState("");
  const [subjectColor, setSubjectColor] = useState("#2563eb");

  // Форма новой заявки
  const [leadParentName, setLeadParentName] = useState("");
  const [leadChildName, setLeadChildName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadGrade, setLeadGrade] = useState("1–4 класс");
  const [leadSubject, setLeadSubject] = useState("Математика и логика");
  const [leadNotes, setLeadNotes] = useState("");

  // Проверка сессии в Supabase Auth и строгая проверка роли ADMIN
  useEffect(() => {
    const checkAdminSession = async () => {
      setAuthChecking(true);
      const client = getSupabase();
      if (!client) {
        setIsAuthenticated(false);
        setAuthChecking(false);
        return;
      }

      try {
        const { data } = await client.auth.getSession();
        const user = data?.session?.user;

        if (!user) {
          setIsAuthenticated(false);
          setAuthChecking(false);
          return;
        }

        // 1. Проверяем роль в user_metadata
        const metaRole = (user.user_metadata?.role || "").toUpperCase();

        // 2. Проверяем роль в таблице profiles
        let dbRole = "";
        let profileData: any = null;
        try {
          const { data: prof } = await client
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .maybeSingle();

          if (prof) {
            profileData = prof;
            dbRole = (prof.role || "").toUpperCase();
          }
        } catch (err) {
          console.error("Supabase load admin profile error:", err);
        }

        const isAdmin = metaRole === "ADMIN" || dbRole === "ADMIN";

        if (isAdmin) {
          setIsAuthenticated(true);
          setAdminId(user.id);
          if (user.email) setAdminEmail(user.email);
          const name = profileData?.name || user.user_metadata?.full_name || "Администратор центра";
          setAdminName(name);
          if (profileData?.avatar_url || user.user_metadata?.avatar_url) {
            setAdminAvatar(profileData?.avatar_url || user.user_metadata?.avatar_url);
          }
          if (profileData?.phone) setAdminPhone(profileData.phone);
          if (profileData?.bio) setAdminBio(profileData.bio);
          document.cookie = "admin_session=true; path=/; max-age=604800";
          setAuthCookies("admin", user.id, data?.session?.access_token);
        } else {
          // Пользователь залогинен, но НЕ является администратором
          setIsAuthenticated(false);
          const currentRoleName =
            metaRole === "TEACHER" || dbRole === "TEACHER"
              ? "преподаватель"
              : metaRole === "PARENT" || dbRole === "PARENT"
              ? "родитель"
              : "ученик";
          setAuthError(
            `Вы авторизованы как «${currentRoleName}». Для доступа в панель управления необходима учетная запись администратора Supabase (роль ADMIN).`
          );
        }
      } catch (err) {
        console.error("Session check error:", err);
        setIsAuthenticated(false);
      } finally {
        setAuthChecking(false);
      }
    };

    checkAdminSession();

    const handleProfileUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      if (detail.name) setAdminName(detail.name);
      if (detail.avatarUrl !== undefined) setAdminAvatar(detail.avatarUrl);
      if (detail.phone !== undefined) setAdminPhone(detail.phone);
      if (detail.bio !== undefined) setAdminBio(detail.bio);
    };

    window.addEventListener("ayda:profile-updated", handleProfileUpdated);
    return () => window.removeEventListener("ayda:profile-updated", handleProfileUpdated);
  }, []);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");

    if (!adminEmail.trim() || !adminPassword) {
      setAuthError("Пожалуйста, введите email и пароль администратора.");
      return;
    }

    const client = getSupabase();
    if (!client) {
      setAuthError("Не удалось подключиться к сервису авторизации.");
      return;
    }

    try {
      const { data, error } = await client.auth.signInWithPassword({
        email: adminEmail.trim(),
        password: adminPassword,
      });

      if (error) {
        if (error.message.includes("Invalid login")) {
          setAuthError("Неверный email или пароль администратора в Supabase.");
        } else {
          setAuthError(error.message);
        }
        return;
      }

      if (!data?.user) {
        setAuthError("Не удалось получить данные пользователя из Supabase.");
        return;
      }

      const user = data.user;
      const metaRole = (user.user_metadata?.role || "").toUpperCase();

      let dbRole = "";
      let profileData: any = null;
      try {
        const { data: prof } = await client
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (prof) {
          profileData = prof;
          dbRole = (prof.role || "").toUpperCase();
        }
      } catch (err) {
        console.error("Supabase load admin profile error:", err);
      }

      const isAdmin = metaRole === "ADMIN" || dbRole === "ADMIN";

      if (!isAdmin) {
        await client.auth.signOut();
        setAuthError("Доступ запрещен: данный аккаунт Supabase не имеет роли администратора (ADMIN).");
        return;
      }

      setIsAuthenticated(true);
      setAdminId(user.id);
      if (user.email) setAdminEmail(user.email);
      const name = profileData?.name || user.user_metadata?.full_name || "Администратор центра";
      setAdminName(name);
      if (profileData?.avatar_url || user.user_metadata?.avatar_url) {
        setAdminAvatar(profileData?.avatar_url || user.user_metadata?.avatar_url);
      }
      if (profileData?.phone) setAdminPhone(profileData.phone);
      if (profileData?.bio) setAdminBio(profileData.bio);

      document.cookie = "admin_session=true; path=/; max-age=604800";
      setAuthCookies("admin", user.id, data?.session?.access_token);
      showToast("Вход в панель управления через Supabase выполнен успешно!");
    } catch (err: any) {
      setAuthError(err?.message || "Ошибка подключения к серверу авторизации Supabase.");
    }
  };

  const handleAdminLogout = async () => {
    clearAuthCookies();
    const client = getSupabase();
    if (client) {
      try {
        await client.auth.signOut();
      } catch (e) {
        console.error(e);
      }
    }
    setIsAuthenticated(false);
    localStorage.removeItem("umnichka_admin_auth");
    document.cookie = "admin_session=; path=/; max-age=0";
    setAdminPassword("");
    setAuthError("");
  };

  // Загрузка всех данных из Supabase
  const loadAllData = async () => {
    setLoading(true);
    const client = getSupabase();
    if (!client) {
      setLoading(false);
      return;
    }

    try {
      const [
        { data: profData },
        { data: lesData },
        { data: subData },
        { data: leadData },
        { data: psData },
      ] = await Promise.all([
        client.from("profiles").select("*").order("name"),
        client.from("lessons").select("*").order("start_time", { ascending: false }),
        client.from("subjects").select("*").order("name"),
        client.from("leads").select("*").order("created_at", { ascending: false }),
        client.from("parent_students").select("*"),
      ]);

      if (profData) setProfiles(profData);
      if (lesData) setLessons(lesData);
      if (subData) {
        setSubjects(subData);
        if (subData.length > 0 && !lessonSubjectId) {
          setLessonSubjectId(subData[0].id);
        }
      }
      if (leadData) setLeads(leadData);
      if (psData) setParentStudents(psData);

      // Инициализация значений для выбора в форме урока
      const teachersList = profData?.filter((p: any) => p.role === "TEACHER") || [];
      const studentsList = profData?.filter((p: any) => p.role === "STUDENT") || [];
      if (teachersList.length > 0 && !lessonTeacherId) setLessonTeacherId(teachersList[0].id);
      if (studentsList.length > 0 && !lessonStudentId) setLessonStudentId(studentsList[0].id);
    } catch (err: any) {
      console.error("Ошибка загрузки данных:", err);
      showToast("Ошибка подключения к базе данных", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadAllData();
    }
  }, [isAuthenticated]);

  // Разделение профилей по ролям
  const teachers = profiles.filter((p) => p.role === "TEACHER");
  const students = profiles.filter((p) => p.role === "STUDENT");
  const parents = profiles.filter((p) => p.role === "PARENT");

  // 1. УРОК: ОТКРЫТИЕ И СОХРАНЕНИЕ
  const handleOpenCreateLesson = () => {
    setEditingLessonId(null);
    setLessonTitle("");
    if (subjects.length > 0) setLessonSubjectId(subjects[0].id);
    if (teachers.length > 0) setLessonTeacherId(teachers[0].id);
    if (students.length > 0) setLessonStudentId(students[0].id);
    setLessonDateTime("");
    setShowAddLessonModal(true);
  };

  const handleOpenEditLesson = (les: any) => {
    setEditingLessonId(les.id);
    setLessonTitle(les.title || "");
    setLessonSubjectId(les.subject_id || (subjects[0]?.id || ""));
    setLessonTeacherId(les.teacher_id || (teachers[0]?.id || ""));
    setLessonStudentId(les.student_id || (students[0]?.id || ""));
    if (les.start_time) {
      const d = new Date(les.start_time);
      const pad = (n: number) => String(n).padStart(2, "0");
      setLessonDateTime(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
    } else {
      setLessonDateTime("");
    }
    setShowAddLessonModal(true);
  };

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonTitle || !lessonSubjectId || !lessonTeacherId || !lessonStudentId) {
      showToast("Заполните обязательные поля урока", "error");
      return;
    }

    const client = getSupabase();
    if (!client) return;

    const start = lessonDateTime ? new Date(lessonDateTime) : new Date(Date.now() + 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 50 * 60 * 1000);

    try {
      if (editingLessonId) {
        const { error } = await client
          .from("lessons")
          .update({
            title: lessonTitle.trim(),
            subject_id: lessonSubjectId,
            teacher_id: lessonTeacherId,
            student_id: lessonStudentId,
            start_time: start.toISOString(),
            end_time: end.toISOString(),
          })
          .eq("id", editingLessonId);

        if (error) throw error;
        showToast("Урок успешно обновлён!");
      } else {
        const roomName = "umnichka-" + Math.random().toString(36).substring(2, 9);
        const newLesson = {
          title: lessonTitle.trim(),
          subject_id: lessonSubjectId,
          teacher_id: lessonTeacherId,
          student_id: lessonStudentId,
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          status: "SCHEDULED",
          room_name: roomName,
        };

        const { error } = await client.from("lessons").insert([newLesson]);
        if (error) throw error;
        showToast("Урок успешно запланирован!");
      }

      setShowAddLessonModal(false);
      setEditingLessonId(null);
      setLessonTitle("");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("ayda:lessons-updated"));
      }
      loadAllData();
    } catch (err: any) {
      console.error(err);
      showToast("Ошибка сохранения урока: " + (err.message || ""), "error");
    }
  };

  // ИЗМЕНЕНИЕ СТАТУСА УРОКА
  const handleUpdateLessonStatus = async (lessonId: string, newStatus: string) => {
    const client = getSupabase();
    try {
      const { error } = await client.from("lessons").update({ status: newStatus }).eq("id", lessonId);
      if (error) throw error;
      showToast(`Статус урока изменен на: ${newStatus === "LIVE" ? "В эфире" : newStatus === "COMPLETED" ? "Завершен" : "Запланирован"}`);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("ayda:lessons-updated"));
      }
      loadAllData();
    } catch (err: any) {
      showToast("Ошибка обновления урока", "error");
    }
  };

  // УДАЛЕНИЕ УРОКА
  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm("Вы уверены, что хотите удалить этот урок?")) return;
    const client = getSupabase();
    try {
      const { error } = await client.from("lessons").delete().eq("id", lessonId);
      if (error) throw error;
      showToast("Урок удален");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("ayda:lessons-updated"));
      }
      loadAllData();
    } catch (err: any) {
      showToast("Ошибка удаления урока", "error");
    }
  };

  // 2. УЧЕНИК: ОТКРЫТИЕ И СОХРАНЕНИЕ
  const handleOpenCreateStudent = () => {
    setEditingStudentId(null);
    setStudentName("");
    setStudentPhone("");
    setStudentEmail("");
    setStudentGrade("3 класс");
    setStudentParentId(parents[0]?.id || "");
    setShowAddStudentModal(true);
  };

  const handleOpenEditStudent = (stud: any, currentParentId?: string) => {
    setEditingStudentId(stud.id);
    setStudentName(stud.name || "");
    setStudentPhone(stud.phone || "");
    setStudentEmail(stud.email || "");
    setStudentGrade(stud.bio || "3 класс");
    setStudentParentId(currentParentId || "");
    setShowAddStudentModal(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) return;

    const client = getSupabase();
    if (!client) return;

    try {
      if (editingStudentId) {
        const { error } = await client
          .from("profiles")
          .update({
            name: studentName.trim(),
            phone: studentPhone.trim() || null,
            email: studentEmail.trim() || null,
            bio: studentGrade || "3 класс",
          })
          .eq("id", editingStudentId);

        if (error) throw error;

        // Обновляем связь с родителем
        await client.from("parent_students").delete().eq("student_id", editingStudentId);
        if (studentParentId) {
          await client.from("parent_students").insert([
            {
              parent_id: studentParentId,
              student_id: editingStudentId,
            },
          ]);
        }

        showToast(`Ученик «${studentName}» успешно обновлен!`);
      } else {
        const email = studentEmail.trim() || `student_${Date.now()}@umnichka.ru`;
        const { data: newProfile, error } = await client
          .from("profiles")
          .insert([
            {
              name: studentName.trim(),
              role: "STUDENT",
              email: email,
              phone: studentPhone.trim() || null,
              bio: studentGrade || "3 класс",
              avatar_url: `https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop&crop=faces`,
            },
          ])
          .select()
          .single();

        if (error) throw error;

        if (studentParentId && newProfile?.id) {
          await client.from("parent_students").insert([
            {
              parent_id: studentParentId,
              student_id: newProfile.id,
            },
          ]);
        }

        showToast(`Ученик «${studentName}» успешно добавлен!`);
      }

      setShowAddStudentModal(false);
      setEditingStudentId(null);
      setStudentName("");
      setStudentPhone("");
      setStudentEmail("");
      loadAllData();
    } catch (err: any) {
      showToast("Ошибка сохранения ученика: " + (err.message || ""), "error");
    }
  };

  // 3. ПРЕПОДАВАТЕЛЬ: ОТКРЫТИЕ И СОХРАНЕНИЕ
  const handleOpenCreateTeacher = () => {
    setEditingTeacherId(null);
    setTeacherName("");
    setTeacherPhone("");
    setTeacherEmail("");
    setTeacherBio("");
    setShowAddTeacherModal(true);
  };

  const handleOpenEditTeacher = (teacher: any) => {
    setEditingTeacherId(teacher.id);
    setTeacherName(teacher.name || "");
    setTeacherPhone(teacher.phone || "");
    setTeacherEmail(teacher.email || "");
    setTeacherBio(teacher.bio || "");
    setShowAddTeacherModal(true);
  };

  const handleSaveTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherName.trim()) return;

    const client = getSupabase();
    if (!client) return;

    try {
      if (editingTeacherId) {
        const { error } = await client
          .from("profiles")
          .update({
            name: teacherName.trim(),
            phone: teacherPhone.trim() || null,
            email: teacherEmail.trim() || null,
            bio: teacherBio.trim() || null,
          })
          .eq("id", editingTeacherId);

        if (error) throw error;
        showToast(`Преподаватель «${teacherName}» обновлен!`);
      } else {
        const email = teacherEmail.trim() || `teacher_${Date.now()}@umnichka.ru`;
        const { error } = await client.from("profiles").insert([
          {
            name: teacherName.trim(),
            role: "TEACHER",
            email: email,
            phone: teacherPhone.trim() || null,
            bio: teacherBio.trim() || "Преподаватель центра «АйДаУмничка»",
            avatar_url: `https://images.unsplash.com/photo-1544717305-2782549b5136?w=200&h=200&fit=crop&crop=faces`,
          },
        ]);

        if (error) throw error;
        showToast(`Преподаватель «${teacherName}» успешно добавлен!`);
      }

      setShowAddTeacherModal(false);
      setEditingTeacherId(null);
      setTeacherName("");
      setTeacherPhone("");
      setTeacherEmail("");
      setTeacherBio("");
      loadAllData();
    } catch (err: any) {
      showToast("Ошибка сохранения преподавателя: " + (err.message || ""), "error");
    }
  };

  // 4. РОДИТЕЛЬ: ОТКРЫТИЕ И СОХРАНЕНИЕ
  const handleOpenEditParent = (parent: any) => {
    setEditingParentId(parent.id);
    setParentName(parent.name || "");
    setParentPhone(parent.phone || "");
    setParentEmail(parent.email || "");
    setParentBio(parent.bio || "");
    setShowEditParentModal(true);
  };

  const handleSaveParent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentName.trim()) return;

    const client = getSupabase();
    if (!client || !editingParentId) return;

    try {
      const { error } = await client
        .from("profiles")
        .update({
          name: parentName.trim(),
          phone: parentPhone.trim() || null,
          email: parentEmail.trim() || null,
          bio: parentBio.trim() || null,
        })
        .eq("id", editingParentId);

      if (error) throw error;
      showToast(`Профиль родителя «${parentName}» обновлен!`);
      setShowEditParentModal(false);
      setEditingParentId(null);
      loadAllData();
    } catch (err: any) {
      showToast("Ошибка обновления родителя: " + (err.message || ""), "error");
    }
  };

  // УДАЛЕНИЕ ПОЛЬЗОВАТЕЛЯ (Ученика, Родителя или Преподавателя)
  const handleDeleteProfile = async (id: string, name: string) => {
    if (!confirm(`Удалить пользователя «${name}»? Это действие нельзя отменить.`)) return;
    const client = getSupabase();
    try {
      const { error } = await client.from("profiles").delete().eq("id", id);
      if (error) throw error;
      showToast(`Пользователь «${name}» удален`);
      loadAllData();
    } catch (err: any) {
      showToast("Ошибка удаления: " + (err.message || ""), "error");
    }
  };

  // 5. ПРЕДМЕТ: ОТКРЫТИЕ И СОХРАНЕНИЕ
  const handleOpenCreateSubject = () => {
    setEditingSubjectId(null);
    setSubjectName("");
    setSubjectColor("#2563eb");
    setShowAddSubjectModal(true);
  };

  const handleOpenEditSubject = (sub: any) => {
    setEditingSubjectId(sub.id);
    setSubjectName(sub.name || "");
    setSubjectColor(sub.color || "#2563eb");
    setShowAddSubjectModal(true);
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName.trim()) return;

    const client = getSupabase();
    if (!client) return;

    try {
      if (editingSubjectId) {
        const { error } = await client
          .from("subjects")
          .update({
            name: subjectName.trim(),
            color: subjectColor || "#2563eb",
          })
          .eq("id", editingSubjectId);

        if (error) throw error;
        showToast(`Предмет «${subjectName}» обновлен!`);
      } else {
        const { error } = await client.from("subjects").insert([
          {
            name: subjectName.trim(),
            color: subjectColor || "#2563eb",
          },
        ]);
        if (error) throw error;
        showToast(`Предмет «${subjectName}» добавлен!`);
      }

      setShowAddSubjectModal(false);
      setEditingSubjectId(null);
      setSubjectName("");
      loadAllData();
    } catch (err: any) {
      showToast("Ошибка сохранения предмета: " + (err.message || ""), "error");
    }
  };

  // УДАЛЕНИЕ ПРЕДМЕТА
  const handleDeleteSubject = async (id: string, name: string) => {
    if (!confirm(`Удалить предмет «${name}»?`)) return;
    const client = getSupabase();
    try {
      const { error } = await client.from("subjects").delete().eq("id", id);
      if (error) throw error;
      showToast(`Предмет «${name}» удален`);
      loadAllData();
    } catch (err: any) {
      showToast("Ошибка удаления предмета", "error");
    }
  };

  // ОБНОВЛЕНИЕ СТАТУСА ЗАЯВКИ
  const handleUpdateLeadStatus = async (leadId: string, status: string) => {
    const client = getSupabase();
    try {
      const { error } = await client.from("leads").update({ status }).eq("id", leadId);
      if (error) throw error;
      showToast("Статус заявки обновлен");
      loadAllData();
    } catch (err: any) {
      showToast("Ошибка обновления заявки", "error");
    }
  };

  // СОЗДАНИЕ ЗАЯВКИ ВРУЧНУЮ
  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadParentName.trim() || !leadPhone.trim()) return;

    const client = getSupabase();
    try {
      const { error } = await client.from("leads").insert([
        {
          parent_name: leadParentName.trim(),
          child_name: leadChildName.trim() || null,
          phone: leadPhone.trim(),
          grade: leadGrade,
          subject: leadSubject,
          status: "NEW",
          notes: leadNotes.trim() || null,
        },
      ]);
      if (error) throw error;

      showToast("Заявка добавлена в систему");
      setShowAddLeadModal(false);
      setLeadParentName("");
      setLeadChildName("");
      setLeadPhone("");
      setLeadNotes("");
      loadAllData();
    } catch (err: any) {
      showToast("Ошибка создания заявки", "error");
    }
  };

  // УДАЛЕНИЕ ЗАЯВКИ
  const handleDeleteLead = async (id: string) => {
    if (!confirm("Удалить эту заявку?")) return;
    const client = getSupabase();
    try {
      const { error } = await client.from("leads").delete().eq("id", id);
      if (error) throw error;
      showToast("Заявка удалена");
      loadAllData();
    } catch (err: any) {
      showToast("Ошибка удаления заявки", "error");
    }
  };

  // Вспомогательные данные для отображения урока
  const getSubject = (subId: string) => subjects.find((s) => s.id === subId) || { name: "Предмет", color: "#2563eb" };
  const getTeacher = (tId: string) => teachers.find((t) => t.id === tId) || { name: "Преподаватель" };
  const getStudent = (sId: string) => students.find((s) => s.id === sId) || { name: "Ученик" };

  // Фильтрация данных по поисковому запросу
  const filteredStudents = students.filter(
    (s) =>
      s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTeachers = teachers.filter(
    (t) =>
      t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.bio?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredLessons = lessons.filter((l) => {
    const sub = getSubject(l.subject_id);
    const teach = getTeacher(l.teacher_id);
    const stud = getStudent(l.student_id);
    const q = searchQuery.toLowerCase();
    return (
      l.title?.toLowerCase().includes(q) ||
      sub.name?.toLowerCase().includes(q) ||
      teach.name?.toLowerCase().includes(q) ||
      stud.name?.toLowerCase().includes(q)
    );
  });

  const filteredLeads = leads.filter(
    (l) =>
      l.parent_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.child_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.phone?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ЕСЛИ АДМИНИСТРАТОР НЕ АВТОРИЗОВАН: ЭКРАН ВХОДА
  if (authChecking) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
          <span>Проверка доступа к панели управления...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-[calc(100vh-14rem)] flex items-center justify-center py-8 px-4">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20 mb-1">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Панель управления центром
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              «АйДаУмничка» — онлайн-школа и занятия с репетиторами
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-5">
            {authError && (
              <div className="p-3.5 rounded-xl text-xs space-y-2 bg-rose-50 text-rose-800 border border-rose-200">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span className="font-medium">{authError}</span>
                </div>
                <button
                  type="button"
                  onClick={handleAdminLogout}
                  className="w-full py-2 px-3 rounded-lg text-xs font-bold bg-white text-rose-700 border border-rose-300 hover:bg-rose-100 transition cursor-pointer shadow-2xs"
                >
                  Выйти из текущего аккаунта и войти как администратор
                </button>
              </div>
            )}

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Email администратора (Supabase):
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@umnichka.ru"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-none focus:border-blue-600 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Пароль администратора:
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Введите пароль"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-none focus:border-blue-600 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Войти в управление центром</span>
                <ArrowRight className="w-4 h-4 ml-0.5" />
              </button>
            </form>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span>Данные администратора в Supabase:</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setAdminEmail("admin@umnichka.ru");
                    setAdminPassword("admin123456");
                  }}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-700 underline cursor-pointer"
                >
                  Заполнить форму
                </button>
              </div>
              <div className="text-[11px] space-y-1 text-slate-600 pt-1.5 border-t border-slate-200/60 font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-sans">Логин:</span>
                  <span className="font-bold text-slate-800">admin@umnichka.ru</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-sans">Пароль:</span>
                  <span className="font-bold text-slate-800">admin123456</span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center">
            <Link
              href="/"
              className="text-xs text-slate-500 hover:text-slate-800 transition font-medium underline underline-offset-4"
            >
              ← Вернуться на главную страницу сайта
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ГЛАВНЫЙ ИНТЕРФЕЙС АДМИНИСТРАТОРА
  return (
    <div className="space-y-6 pb-16">
      {/* Toast-уведомление */}
      {toastMsg && (
        <div
          className={`fixed top-20 right-5 z-50 p-4 rounded-xl shadow-lg border text-xs sm:text-sm font-semibold flex items-center gap-2.5 transition animate-in slide-in-from-top-2 ${
            toastMsg.type === "success"
              ? "bg-emerald-500 text-white border-emerald-600"
              : "bg-rose-500 text-white border-rose-600"
          }`}
        >
          {toastMsg.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Верхняя шапка админ-панели */}
      <div className="clean-card p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {adminAvatar ? (
            <img
              src={adminAvatar}
              alt={adminName}
              className="w-12 h-12 rounded-xl object-cover ring-2 ring-blue-500/30 border border-slate-200 shadow-sm"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-600/30 font-black text-lg">
              {adminName.slice(0, 1).toUpperCase() || <ShieldCheck className="w-6 h-6" />}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                {adminName}
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                Администратор
              </span>
            </div>
            <p className="text-xs text-slate-500">
              «АйДаУмничка» • {adminEmail} • Синхронизация в реальном времени
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={() => setEditProfileModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition cursor-pointer shadow-2xs active:scale-95"
            title="Редактировать профиль и заменить фото"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Редактировать профиль</span>
          </button>

          <button
            onClick={loadAllData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            title="Обновить данные из базы"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
            <span className="hidden sm:inline">Обновить</span>
          </button>

          <button
            onClick={handleAdminLogout}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition cursor-pointer"
            title="Выйти из сессии администратора"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Выйти</span>
          </button>
        </div>
      </div>

      {/* Вкладки разделов админки */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 text-xs font-bold">
        {[
          { id: "overview" as const, label: "Сводка", icon: Sparkles, count: null },
          { id: "students" as const, label: "Ученики", icon: Users, count: students.length },
          { id: "teachers" as const, label: "Преподаватели", icon: GraduationCap, count: teachers.length },
          { id: "parents" as const, label: "Родители", icon: UserCheck, count: parents.length },
          { id: "lessons" as const, label: "Уроки и расписание", icon: Calendar, count: lessons.length },
          { id: "leads" as const, label: "Заявки с сайта", icon: Inbox, count: leads.length },
          { id: "subjects" as const, label: "Предметы", icon: BookOpen, count: subjects.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSearchQuery("");
              }}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-t-xl transition whitespace-nowrap cursor-pointer border-b-2 ${
                isActive
                  ? "border-blue-600 text-blue-600 bg-white shadow-2xs font-extrabold"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    isActive ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 1. ВКЛАДКА: СВОДКА И БЫСТРЫЕ ДЕЙСТВИЯ */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Сетка статистических карточек */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            <div className="clean-card p-4 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Учеников</span>
              <div className="text-2xl font-extrabold text-slate-900">{students.length}</div>
              <span className="text-[11px] text-emerald-600 font-semibold">Активны</span>
            </div>
            <div className="clean-card p-4 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Педагогов</span>
              <div className="text-2xl font-extrabold text-slate-900">{teachers.length}</div>
              <span className="text-[11px] text-blue-600 font-semibold">В штате</span>
            </div>
            <div className="clean-card p-4 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Родителей</span>
              <div className="text-2xl font-extrabold text-slate-900">{parents.length}</div>
              <span className="text-[11px] text-slate-500 font-semibold">Кабинетов</span>
            </div>
            <div className="clean-card p-4 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Всего уроков</span>
              <div className="text-2xl font-extrabold text-slate-900">{lessons.length}</div>
              <span className="text-[11px] text-indigo-600 font-semibold">В системе</span>
            </div>
            <div className="clean-card p-4 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">В эфире сейчас</span>
              <div className="text-2xl font-extrabold text-emerald-600">
                {lessons.filter((l) => l.status === "LIVE").length}
              </div>
              <span className="text-[11px] text-emerald-700 font-semibold">Видеоклассы</span>
            </div>
            <div className="clean-card p-4 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Новых заявок</span>
              <div className="text-2xl font-extrabold text-amber-600">
                {leads.filter((l) => l.status === "NEW").length}
              </div>
              <span className="text-[11px] text-amber-700 font-semibold">Ждут звонка</span>
            </div>
          </div>

          {/* Быстрые действия */}
          <div className="clean-card p-5 space-y-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Быстрые действия администратора</span>
            </h2>
            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={handleOpenCreateLesson}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Назначить урок</span>
              </button>
              <button
                onClick={handleOpenCreateStudent}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Добавить ученика</span>
              </button>
              <button
                onClick={handleOpenCreateTeacher}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition cursor-pointer"
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Добавить преподавателя</span>
              </button>
              <button
                onClick={handleOpenCreateSubject}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Добавить предмет</span>
              </button>
              <button
                onClick={() => setShowAddLeadModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition cursor-pointer"
              >
                <Inbox className="w-3.5 h-3.5" />
                <span>Создать заявку</span>
              </button>
            </div>
          </div>

          {/* Ближайшие уроки и активные занятия */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Уроки */}
            <div className="clean-card p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span>Ближайшие уроки</span>
                </h3>
                <button
                  onClick={() => setActiveTab("lessons")}
                  className="text-xs font-bold text-blue-600 hover:underline"
                >
                  Все уроки ({lessons.length}) →
                </button>
              </div>

              {lessons.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">Нет запланированных уроков</div>
              ) : (
                <div className="space-y-2.5">
                  {lessons.slice(0, 4).map((les) => {
                    const sub = getSubject(les.subject_id);
                    const teach = getTeacher(les.teacher_id);
                    const stud = getStudent(les.student_id);
                    const isLive = les.status === "LIVE";
                    return (
                      <div
                        key={les.id}
                        className="p-3 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="font-bold text-slate-900 truncate">{les.title}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2">
                            <span className="font-semibold" style={{ color: sub.color }}>
                              {sub.name}
                            </span>
                            <span>•</span>
                            <span>Учитель: {teach.name}</span>
                            <span>•</span>
                            <span>Ученик: {stud.name}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isLive
                                ? "bg-emerald-100 text-emerald-800 animate-pulse"
                                : les.status === "COMPLETED"
                                ? "bg-slate-200 text-slate-700"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {isLive ? "В эфире" : les.status === "COMPLETED" ? "Завершен" : "Запланирован"}
                          </span>

                          <Link
                            href={`/room/${les.id || les.room_name}?role=teacher`}
                            target="_blank"
                            className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition"
                            title="Войти в видеокомнату урока"
                          >
                            <Video className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Входящие заявки */}
            <div className="clean-card p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Inbox className="w-4 h-4 text-amber-600" />
                  <span>Свежие заявки с сайта</span>
                </h3>
                <button
                  onClick={() => setActiveTab("leads")}
                  className="text-xs font-bold text-blue-600 hover:underline"
                >
                  Все заявки ({leads.length}) →
                </button>
              </div>

              {leads.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">Заявок пока нет</div>
              ) : (
                <div className="space-y-2.5">
                  {leads.slice(0, 4).map((lead) => (
                    <div
                      key={lead.id}
                      className="p-3 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          <span>{lead.parent_name}</span>
                          {lead.child_name && (
                            <span className="text-[11px] font-normal text-slate-500">
                              (ребенок: {lead.child_name}, {lead.grade})
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-600 flex items-center gap-3">
                          <span className="flex items-center gap-1 font-mono">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {lead.phone}
                          </span>
                          <span>•</span>
                          <span className="text-blue-600 font-medium">{lead.subject}</span>
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          lead.status === "NEW"
                            ? "bg-amber-100 text-amber-900"
                            : lead.status === "CONTACTED"
                            ? "bg-blue-100 text-blue-800"
                            : lead.status === "TRIAL_BOOKED"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {lead.status === "NEW"
                          ? "Новая"
                          : lead.status === "CONTACTED"
                          ? "Связались"
                          : lead.status === "TRIAL_BOOKED"
                          ? "Записан"
                          : "Закрыта"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. ВКЛАДКА: УЧЕНИКИ */}
      {activeTab === "students" && (
        <div className="clean-card p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Ученики центра ({students.length})</h2>
              <p className="text-xs text-slate-500">Список учеников, контактные данные и класс</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск по имени или телефону..."
                  className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs w-48 sm:w-64 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={handleOpenCreateStudent}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Добавить ученика</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase font-semibold text-[11px]">
                  <th className="py-2.5 px-3">Ученик</th>
                  <th className="py-2.5 px-3">Класс / Описание</th>
                  <th className="py-2.5 px-3">Контакты</th>
                  <th className="py-2.5 px-3">Привязанный родитель</th>
                  <th className="py-2.5 px-3 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((stud) => {
                  const psLink = parentStudents.find((ps) => ps.student_id === stud.id);
                  const parent = parents.find((p) => p.id === psLink?.parent_id);
                  return (
                    <tr key={stud.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={stud.avatar_url || "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop&crop=faces"}
                            alt={stud.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                          <div>
                            <div className="font-bold text-slate-900">{stud.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{stud.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-600">{stud.bio || "Не указан"}</td>
                      <td className="py-3 px-3 text-slate-700 font-mono">{stud.phone || "—"}</td>
                      <td className="py-3 px-3">
                        {parent ? (
                          <span className="font-semibold text-blue-600">{parent.name}</span>
                        ) : (
                          <span className="text-slate-400 italic">Не привязан</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEditStudent(stud, psLink?.parent_id)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                            title="Редактировать данные ученика"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProfile(stud.id, stud.name)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Удалить ученика"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. ВКЛАДКА: ПРЕПОДАВАТЕЛИ */}
      {activeTab === "teachers" && (
        <div className="clean-card p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Преподаватели центра ({teachers.length})</h2>
              <p className="text-xs text-slate-500">Штат педагогов, специализация и контактные данные</p>
            </div>

            <button
              onClick={handleOpenCreateTeacher}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Добавить преподавателя</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTeachers.map((teacher) => (
              <div
                key={teacher.id}
                className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 hover:border-slate-300 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={teacher.avatar_url || "https://images.unsplash.com/photo-1544717305-2782549b5136?w=200&h=200&fit=crop&crop=faces"}
                      alt={teacher.name}
                      className="w-12 h-12 rounded-xl object-cover"
                    />
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">{teacher.name}</h3>
                      <p className="text-[11px] text-blue-600 font-semibold">Преподаватель центра</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditTeacher(teacher)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                      title="Редактировать преподавателя"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteProfile(teacher.id, teacher.name)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      title="Удалить педагога"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{teacher.bio || "Преподаватель центра"}</p>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    {teacher.phone || "—"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3 text-slate-400" />
                    {teacher.email}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. ВКЛАДКА: РОДИТЕЛИ */}
      {activeTab === "parents" && (
        <div className="clean-card p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Родители ({parents.length})</h2>
              <p className="text-xs text-slate-500">Зарегистрированные аккаунты родителей и привязанные дети</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase font-semibold text-[11px]">
                  <th className="py-2.5 px-3">Родитель</th>
                  <th className="py-2.5 px-3">Телефон</th>
                  <th className="py-2.5 px-3">Дети (ученики)</th>
                  <th className="py-2.5 px-3">Баланс / Заметка</th>
                  <th className="py-2.5 px-3 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parents.map((par) => {
                  const links = parentStudents.filter((ps) => ps.parent_id === par.id);
                  const children = students.filter((s) => links.some((l) => l.student_id === s.id));
                  return (
                    <tr key={par.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{par.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{par.email}</div>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700">{par.phone || "—"}</td>
                      <td className="py-3 px-3">
                        {children.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {children.map((c) => (
                              <span
                                key={c.id}
                                className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold text-[11px]"
                              >
                                {c.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Нет привязанных детей</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-600">{par.bio || "—"}</td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEditParent(par)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                            title="Редактировать данные родителя"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProfile(par.id, par.name)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Удалить профиль"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. ВКЛАДКА: УРОКИ И РАСПИСАНИЕ */}
      {activeTab === "lessons" && (
        <div className="clean-card p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Расписание и уроки ({lessons.length})</h2>
              <p className="text-xs text-slate-500">Управление расписанием и видеокомнатами</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск по уроку, учителю..."
                  className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs w-48 sm:w-60 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={handleOpenCreateLesson}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Назначить урок</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase font-semibold text-[11px]">
                  <th className="py-2.5 px-3">Тема и предмет</th>
                  <th className="py-2.5 px-3">Педагог</th>
                  <th className="py-2.5 px-3">Ученик</th>
                  <th className="py-2.5 px-3">Дата и время</th>
                  <th className="py-2.5 px-3">Статус</th>
                  <th className="py-2.5 px-3 text-right">Видеосвязь / Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLessons.map((les) => {
                  const sub = getSubject(les.subject_id);
                  const teach = getTeacher(les.teacher_id);
                  const stud = getStudent(les.student_id);
                  return (
                    <tr key={les.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{les.title}</div>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: sub.color + "18", color: sub.color }}>
                          {sub.name}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-700 font-medium">{teach.name}</td>
                      <td className="py-3 px-3 text-slate-700 font-medium">{stud.name}</td>
                      <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                        {les.start_time ? format(new Date(les.start_time), "d MMM, HH:mm", { locale: ru }) : "—"}
                      </td>
                      <td className="py-3 px-3">
                        <select
                          value={les.status}
                          onChange={(e) => handleUpdateLessonStatus(les.id, e.target.value)}
                          className="text-[11px] font-bold p-1 rounded border border-slate-200 bg-white cursor-pointer focus:outline-none"
                        >
                          <option value="SCHEDULED">Запланирован</option>
                          <option value="LIVE">В эфире (LIVE)</option>
                          <option value="COMPLETED">Завершен</option>
                          <option value="CANCELLED">Отменен</option>
                        </select>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/room/${les.id || les.room_name}?role=teacher`}
                            target="_blank"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold text-[11px] transition"
                            title="Открыть видеокомнату"
                          >
                            <Video className="w-3.5 h-3.5" />
                            <span>Войти</span>
                          </Link>

                          <button
                            onClick={() => handleOpenEditLesson(les)}
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition cursor-pointer"
                            title="Редактировать занятие"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteLesson(les.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                            title="Удалить занятие"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. ВКЛАДКА: ЗАЯВКИ С САЙТА */}
      {activeTab === "leads" && (
        <div className="clean-card p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Заявки от родителей ({leads.length})</h2>
              <p className="text-xs text-slate-500">Потенциальные клиенты, оставившие заявку на вводный урок</p>
            </div>

            <button
              onClick={() => setShowAddLeadModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Создать заявку</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase font-semibold text-[11px]">
                  <th className="py-2.5 px-3">Родитель / Ребенок</th>
                  <th className="py-2.5 px-3">Телефон</th>
                  <th className="py-2.5 px-3">Класс и предмет</th>
                  <th className="py-2.5 px-3">Заметка</th>
                  <th className="py-2.5 px-3">Статус</th>
                  <th className="py-2.5 px-3 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{lead.parent_name}</div>
                      {lead.child_name && (
                        <div className="text-[11px] text-slate-500">Ребенок: {lead.child_name}</div>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono font-semibold text-slate-800">
                      <a href={`tel:${lead.phone}`} className="hover:text-blue-600">
                        {lead.phone}
                      </a>
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-slate-800 font-semibold">{lead.subject}</div>
                      <div className="text-[10px] text-slate-500">{lead.grade}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-600 max-w-xs">{lead.notes || "—"}</td>
                    <td className="py-3 px-3">
                      <select
                        value={lead.status}
                        onChange={(e) => handleUpdateLeadStatus(lead.id, e.target.value)}
                        className={`text-[11px] font-bold p-1 rounded border cursor-pointer ${
                          lead.status === "NEW"
                            ? "bg-amber-50 text-amber-900 border-amber-200"
                            : lead.status === "CONTACTED"
                            ? "bg-blue-50 text-blue-800 border-blue-200"
                            : lead.status === "TRIAL_BOOKED"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-slate-50 text-slate-600 border-slate-200"
                        }`}
                      >
                        <option value="NEW">🟡 Новая</option>
                        <option value="CONTACTED">🔵 Связались</option>
                        <option value="TRIAL_BOOKED">🟢 Записан на пробный</option>
                        <option value="REJECTED">⚪ Отказ / Закрыта</option>
                      </select>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleDeleteLead(lead.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                        title="Удалить заявку"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. ВКЛАДКА: ПРЕДМЕТЫ */}
      {activeTab === "subjects" && (
        <div className="clean-card p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Предметы и программы ({subjects.length})</h2>
              <p className="text-xs text-slate-500">Направления подготовки, доступные в онлайн-центре</p>
            </div>

            <button
              onClick={handleOpenCreateSubject}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Добавить предмет</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {subjects.map((sub) => (
              <div
                key={sub.id}
                className="p-4 rounded-xl border border-slate-200 bg-white space-y-2 hover:border-blue-300 transition"
              >
                <div className="flex items-center justify-between">
                  <span
                    className="w-3.5 h-3.5 rounded-full"
                    style={{ backgroundColor: sub.color || "#2563eb" }}
                  />
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditSubject(sub)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                      title="Редактировать предмет"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteSubject(sub.id, sub.name)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      title="Удалить предмет"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="font-bold text-sm text-slate-900">{sub.name}</div>
                <div className="text-[10px] text-slate-400 font-mono">Цвет: {sub.color}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* МОДАЛЬНОЕ ОКНО: НАЗНАЧИТЬ / РЕДАКТИРОВАТЬ УРОК */}
      {showAddLessonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>{editingLessonId ? "Редактировать занятие" : "Назначить новое занятие"}</span>
              </h3>
              <button
                onClick={() => setShowAddLessonModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLesson} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Тема занятия:</label>
                <input
                  type="text"
                  required
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  placeholder="Математика: решение олимпиадных задач"
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Предмет:</label>
                  <select
                    value={lessonSubjectId}
                    onChange={(e) => setLessonSubjectId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Преподаватель:</label>
                  <select
                    value={lessonTeacherId}
                    onChange={(e) => setLessonTeacherId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ученик:</label>
                  <select
                    value={lessonStudentId}
                    onChange={(e) => setLessonStudentId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {students.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Дата и время:</label>
                  <input
                    type="datetime-local"
                    value={lessonDateTime}
                    onChange={(e) => setLessonDateTime(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddLessonModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-sm cursor-pointer"
                >
                  {editingLessonId ? "Сохранить изменения" : "Создать урок"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* МОДАЛЬНОЕ ОКНО: ДОБАВИТЬ / РЕДАКТИРОВАТЬ УЧЕНИКА */}
      {showAddStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-600" />
                <span>{editingStudentId ? "Редактировать ученика" : "Добавить нового ученика"}</span>
              </h3>
              <button
                onClick={() => setShowAddStudentModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Имя и фамилия ученика:</label>
                <input
                  type="text"
                  required
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Артём Смирнов"
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Класс / Возраст:</label>
                  <select
                    value={studentGrade}
                    onChange={(e) => setStudentGrade(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((g) => (
                      <option key={g} value={`${g} класс`}>
                        {g} класс
                      </option>
                    ))}
                    <option value="Дошкольник (5-7 лет)">Дошкольник (5-7 лет)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Телефон:</label>
                  <input
                    type="tel"
                    value={studentPhone}
                    onChange={(e) => setStudentPhone(e.target.value)}
                    placeholder="+7 (999) 000-00-00"
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email ученика:</label>
                <input
                  type="email"
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  placeholder="student@umnichka.ru"
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Привязать к родителю:</label>
                <select
                  value={studentParentId}
                  onChange={(e) => setStudentParentId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Без привязки (самостоятельный)</option>
                  {parents.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.phone || p.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-sm cursor-pointer"
                >
                  {editingStudentId ? "Сохранить изменения" : "Добавить ученика"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* МОДАЛЬНОЕ ОКНО: ДОБАВИТЬ / РЕДАКТИРОВАТЬ ПРЕПОДАВАТЕЛЯ */}
      {showAddTeacherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-blue-600" />
                <span>{editingTeacherId ? "Редактировать преподавателя" : "Добавить преподавателя"}</span>
              </h3>
              <button
                onClick={() => setShowAddTeacherModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTeacher} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">ФИО преподавателя:</label>
                <input
                  type="text"
                  required
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  placeholder="Анна Сергеевна Иванова"
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Телефон:</label>
                  <input
                    type="tel"
                    value={teacherPhone}
                    onChange={(e) => setTeacherPhone(e.target.value)}
                    placeholder="+7 (999) 111-22-33"
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email:</label>
                  <input
                    type="email"
                    value={teacherEmail}
                    onChange={(e) => setTeacherEmail(e.target.value)}
                    placeholder="teacher@umnichka.ru"
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Опыт и предметы (био):</label>
                <textarea
                  rows={2}
                  value={teacherBio}
                  onChange={(e) => setTeacherBio(e.target.value)}
                  placeholder="Преподаватель высшей категории, стаж 10 лет. Математика и олимпиадные задачи."
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddTeacherModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-sm cursor-pointer"
                >
                  {editingTeacherId ? "Сохранить изменения" : "Добавить преподавателя"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* МОДАЛЬНОЕ ОКНО: РЕДАКТИРОВАТЬ РОДИТЕЛЯ */}
      {showEditParentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-600" />
                <span>Редактировать данные родителя</span>
              </h3>
              <button
                onClick={() => setShowEditParentModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveParent} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">ФИО родителя:</label>
                <input
                  type="text"
                  required
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  placeholder="Елена Смирнова"
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Телефон:</label>
                  <input
                    type="tel"
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
                    placeholder="+7 (999) 000-00-00"
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email:</label>
                  <input
                    type="email"
                    value={parentEmail}
                    onChange={(e) => setParentEmail(e.target.value)}
                    placeholder="parent@mail.ru"
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Заметка / Баланс:</label>
                <input
                  type="text"
                  value={parentBio}
                  onChange={(e) => setParentBio(e.target.value)}
                  placeholder="Баланс: 8 занятий"
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditParentModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-sm cursor-pointer"
                >
                  Сохранить изменения
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* МОДАЛЬНОЕ ОКНО: ДОБАВИТЬ / РЕДАКТИРОВАТЬ ПРЕДМЕТ */}
      {showAddSubjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span>{editingSubjectId ? "Редактировать предмет" : "Новый предмет"}</span>
              </h3>
              <button
                onClick={() => setShowAddSubjectModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSubject} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Название предмета:</label>
                <input
                  type="text"
                  required
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  placeholder="Робототехника и IT"
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Цвет метки:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={subjectColor}
                    onChange={(e) => setSubjectColor(e.target.value)}
                    className="w-10 h-10 rounded border border-slate-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={subjectColor}
                    onChange={(e) => setSubjectColor(e.target.value)}
                    className="flex-1 p-2 rounded-xl border border-slate-200 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddSubjectModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-sm cursor-pointer"
                >
                  {editingSubjectId ? "Сохранить изменения" : "Добавить предмет"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* МОДАЛЬНОЕ ОКНО: СОЗДАТЬ ЗАЯВКУ */}
      {showAddLeadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Inbox className="w-4 h-4 text-blue-600" />
                <span>Новая заявка на урок</span>
              </h3>
              <button
                onClick={() => setShowAddLeadModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Имя родителя:</label>
                  <input
                    type="text"
                    required
                    value={leadParentName}
                    onChange={(e) => setLeadParentName(e.target.value)}
                    placeholder="Екатерина"
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Имя ребенка:</label>
                  <input
                    type="text"
                    value={leadChildName}
                    onChange={(e) => setLeadChildName(e.target.value)}
                    placeholder="Даниил"
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Телефон:</label>
                  <input
                    type="tel"
                    required
                    value={leadPhone}
                    onChange={(e) => setLeadPhone(e.target.value)}
                    placeholder="+7 (999) 000-00-00"
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Класс:</label>
                  <input
                    type="text"
                    value={leadGrade}
                    onChange={(e) => setLeadGrade(e.target.value)}
                    placeholder="3 класс"
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Интересующий предмет:</label>
                <select
                  value={leadSubject}
                  onChange={(e) => setLeadSubject(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Комментарий / Пожелания:</label>
                <textarea
                  rows={2}
                  value={leadNotes}
                  onChange={(e) => setLeadNotes(e.target.value)}
                  placeholder="Удобно заниматься по вечерам в будни"
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddLeadModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-sm"
                >
                  Сохранить заявку
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно редактирования профиля администратора */}
      <EditProfileModal
        isOpen={editProfileModalOpen}
        onClose={() => setEditProfileModalOpen(false)}
        defaultRole="ADMIN"
        initialData={{
          id: adminId,
          name: adminName,
          email: adminEmail,
          phone: adminPhone,
          avatarUrl: adminAvatar,
          bio: adminBio,
        }}
      />
    </div>
  );
}
