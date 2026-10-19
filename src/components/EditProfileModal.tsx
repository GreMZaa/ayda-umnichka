"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Upload,
  Camera,
  Check,
  User,
  GraduationCap,
  Sparkles,
  Phone,
  Mail,
  BookOpen,
  School,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Link as LinkIcon,
  Image as ImageIcon,
} from "lucide-react";
import { getSupabase } from "@/lib/supabase";

export interface ProfileData {
  id?: string;
  name: string;
  role: "STUDENT" | "TEACHER" | "PARENT" | "ADMIN" | string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  grade?: string;
  school?: string;
  subjects?: string;
  experience?: string;
  education?: string;
  bio?: string;
  preferredContact?: string;
}

export const AVATAR_PRESETS = [
  {
    id: "boy-1",
    label: "Ученик",
    url: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=240&h=240&fit=crop&crop=faces",
  },
  {
    id: "girl-1",
    label: "Ученица",
    url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=240&h=240&fit=crop&crop=faces",
  },
  {
    id: "teacher-f",
    label: "Учительница",
    url: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=240&h=240&fit=crop&crop=faces",
  },
  {
    id: "teacher-m",
    label: "Преподаватель",
    url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&h=240&fit=crop&crop=faces",
  },
  {
    id: "parent-f",
    label: "Мама",
    url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=240&h=240&fit=crop&crop=faces",
  },
  {
    id: "parent-m",
    label: "Папа",
    url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=240&h=240&fit=crop&crop=faces",
  },
  {
    id: "owl",
    label: "Сова-умничка",
    url: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=240&h=240&fit=crop",
  },
  {
    id: "cat",
    label: "Кот-учёный",
    url: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=240&h=240&fit=crop",
  },
];

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated?: (updated: ProfileData) => void;
  initialProfile?: Partial<ProfileData>;
  initialData?: Partial<ProfileData>;
  defaultRole?: "STUDENT" | "TEACHER" | "PARENT" | "ADMIN" | string;
}

// Сжатие пользовательского фото на клиенте в компактный WebP / JPEG для быстрой загрузки
function compressImage(file: File, maxSize = 240, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

export default function EditProfileModal({
  isOpen,
  onClose,
  onProfileUpdated,
  initialProfile,
  initialData,
  defaultRole = "STUDENT",
}: EditProfileModalProps) {
  const init = initialProfile || initialData;
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const backdropMouseDownRef = useRef<EventTarget | null>(null);

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Основные данные формы
  const [profileId, setProfileId] = useState(init?.id || "");
  const [name, setName] = useState(init?.name || "");
  const [role, setRole] = useState(init?.role || defaultRole);
  const [email, setEmail] = useState(init?.email || "");
  const [phone, setPhone] = useState(init?.phone || "");
  const [avatarUrl, setAvatarUrl] = useState(init?.avatarUrl || "");

  // Дополнительные поля по ролям
  const [grade, setGrade] = useState(init?.grade || "3 класс");
  const [school, setSchool] = useState(init?.school || "Онлайн-школа «АйДаУмничка»");
  const [subjects, setSubjects] = useState(init?.subjects || "Математика и логика");
  const [experience, setExperience] = useState(init?.experience || "12 лет");
  const [education, setEducation] = useState(init?.education || "Высшее педагогическое");
  const [bio, setBio] = useState(init?.bio || "");
  const [preferredContact, setPreferredContact] = useState(
    init?.preferredContact || "Telegram"
  );

  // Таб выбора аватара: "upload" | "presets" | "url"
  const [avatarTab, setAvatarTab] = useState<"presets" | "url">("presets");
  const [customUrlInput, setCustomUrlInput] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Блокировка скролла фона
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Загрузка актуального профиля из Supabase при открытии
  useEffect(() => {
    if (!isOpen) return;

    setErrorMsg(null);
    setSuccess(false);

    // Сначала наполняем из переданных пропсов или localStorage
    let hasLoadedData = false;
    if (init) {
      if (init.id) setProfileId(init.id);
      if (init.name) setName(init.name);
      if (init.role) setRole(init.role);
      if (init.email) setEmail(init.email);
      if (init.phone) setPhone(init.phone);
      if (init.avatarUrl) setAvatarUrl(init.avatarUrl);
      if (init.grade) setGrade(init.grade);
      if (init.school) setSchool(init.school);
      if (init.subjects) setSubjects(init.subjects);
      if (init.experience) setExperience(init.experience);
      if (init.education) setEducation(init.education);
      if (init.bio) setBio(init.bio);
      if (init.preferredContact) setPreferredContact(init.preferredContact);
      if (init.name) hasLoadedData = true;
    }

    // Если пропсы не переданы, пробуем прочитать из localStorage
    if (!hasLoadedData) {
      try {
        const curRole = (init?.role || defaultRole).toLowerCase();
        const saved =
          localStorage.getItem(`ayda_profile_${curRole}`) ||
          localStorage.getItem("ayda_current_user_profile");
        if (saved) {
          const p = JSON.parse(saved);
          if (p.id) setProfileId(p.id);
          if (p.name) setName(p.name);
          if (p.avatarUrl) setAvatarUrl(p.avatarUrl);
          if (p.phone) setPhone(p.phone);
          if (p.email) setEmail(p.email);
          if (p.grade) setGrade(p.grade);
          if (p.school) setSchool(p.school);
          if (p.subjects) setSubjects(p.subjects);
          if (p.experience) setExperience(p.experience);
          if (p.education) setEducation(p.education);
          if (p.bio) setBio(p.bio);
          if (p.name) hasLoadedData = true;
        }
      } catch (e) {}
    }

    // Загрузка профиля из Supabase по ID текущего пользователя
    const client = getSupabase();
    if (client && !hasLoadedData) {
      client.auth.getUser().then(({ data }) => {
        const authUser = data?.user;
        const targetId = init?.id || authUser?.id;
        if (targetId) {
          setProfileId(targetId);
          client
            .from("profiles")
            .select("*")
            .eq("id", targetId)
            .maybeSingle()
            .then(({ data: p }) => {
              if (p) {
                if (!name) setName(p.name || authUser?.user_metadata?.full_name || "");
                if (!email) setEmail(p.email || authUser?.email || "");
                if (!phone) setPhone(p.phone || "");
                if (!avatarUrl && p.avatar_url) setAvatarUrl(p.avatar_url);

                let parsed: any = {};
                try {
                  if (p.bio && p.bio.startsWith("{")) parsed = JSON.parse(p.bio);
                  else if (p.bio) parsed.bio = p.bio;
                } catch (e) {}

                if (parsed.grade && !grade) setGrade(parsed.grade);
                if (parsed.school && !school) setSchool(parsed.school);
                if (parsed.subjects && !subjects) setSubjects(parsed.subjects);
                if (parsed.experience && !experience) setExperience(parsed.experience);
                if (parsed.education && !education) setEducation(parsed.education);
                if (parsed.bio && !bio) setBio(parsed.bio);
                if (parsed.preferredContact && !preferredContact)
                  setPreferredContact(parsed.preferredContact);
              } else if (authUser) {
                if (!name) setName(authUser.user_metadata?.full_name || authUser.email?.split("@")[0] || "");
                if (!email) setEmail(authUser.email || "");
              }
            });
        }
      });
    }
  }, [isOpen, initialProfile, defaultRole]);

  // Обработка загрузки файла с компьютера / телефона
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMsg("Пожалуйста, выберите файл изображения (JPEG, PNG, WebP).");
      return;
    }

    try {
      const compressedDataUrl = await compressImage(file, 240, 0.85);
      setAvatarUrl(compressedDataUrl);
      setErrorMsg(null);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Не удалось обработать изображение. Попробуйте другой файл.");
    }
  };

  // Сохранение отредактированного профиля
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Пожалуйста, укажите имя пользователя.");
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    const roleNormalized = role.toUpperCase();

    // Собираем расширенные параметры в JSON объект био
    const bioObject = {
      grade: grade.trim(),
      school: school.trim(),
      subjects: subjects.trim(),
      experience: experience.trim(),
      education: education.trim(),
      bio: bio.trim(),
      preferredContact,
    };

    const finalProfileData: ProfileData = {
      id: profileId,
      name: name.trim(),
      role: roleNormalized,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      avatarUrl: avatarUrl.trim() || undefined,
      ...bioObject,
    };

    const client = getSupabase();
    let savedInSupabase = false;

    if (client) {
      try {
        // 1. Поиск или создание профиля в таблице public.profiles
        const payload: any = {
          name: name.trim(),
          phone: phone.trim() || null,
          avatar_url: avatarUrl.trim() || null,
          bio: JSON.stringify(bioObject),
          updated_at: new Date().toISOString(),
        };

        let targetId = profileId;
        if (!targetId) {
          const { data: aData } = await client.auth.getUser();
          if (aData?.user?.id) targetId = aData.user.id;
        }

        if (targetId) {
          finalProfileData.id = targetId;
          const { error: upsertErr } = await client
            .from("profiles")
            .upsert({
              id: targetId,
              role: roleNormalized,
              email: email.trim() || undefined,
              ...payload,
            });

          if (!upsertErr) savedInSupabase = true;
        }

        // 2. Обновление метаданных авторизованного пользователя Supabase Auth
        try {
          await client.auth.updateUser({
            data: {
              full_name: name.trim(),
              avatar_url: avatarUrl.trim() || null,
              phone: phone.trim() || null,
              grade: grade.trim(),
              school: school.trim(),
            },
          });
        } catch (authErr) {
          // Игнорируем ошибку auth если пользователь не авторизован через Supabase session
        }
      } catch (err: any) {
        console.warn("Supabase profile save warning:", err);
      }
    }

    // 3. Сохраняем в localStorage для мгновенной синхронизации во всех вкладках и компонентах
    try {
      localStorage.setItem(`ayda_profile_${roleNormalized.toLowerCase()}`, JSON.stringify(finalProfileData));
      localStorage.setItem("ayda_current_user_profile", JSON.stringify(finalProfileData));

      // Отправляем глобальное событие
      window.dispatchEvent(
        new CustomEvent("ayda:profile-updated", {
          detail: finalProfileData,
        })
      );
    } catch (e) {}

    setSaving(false);
    setSuccess(true);

    if (onProfileUpdated) {
      onProfileUpdated(finalProfileData);
    }

    setTimeout(() => {
      onClose();
      setSuccess(false);
    }, 1200);
  };

  if (!isOpen || !mounted) return null;

  const roleName =
    role.toUpperCase() === "TEACHER"
      ? "Преподаватель"
      : role.toUpperCase() === "PARENT"
      ? "Родитель"
      : role.toUpperCase() === "ADMIN"
      ? "Администратор"
      : "Ученик";

  return createPortal(
    <div
      onMouseDown={(e) => {
        backdropMouseDownRef.current = e.target;
      }}
      onMouseUp={(e) => {
        if (backdropMouseDownRef.current === e.currentTarget && e.target === e.currentTarget) {
          onClose();
        }
        backdropMouseDownRef.current = null;
      }}
      className="fixed inset-0 z-[110] w-screen h-screen min-h-screen bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-7 space-y-5 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto relative animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Заголовок модального окна */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <User className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">
                Редактировать профиль
              </h3>
              <p className="text-xs text-slate-500">
                Роль: <strong className="text-blue-700">{roleName}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {success && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Профиль успешно сохранён и синхронизирован!</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          {/* 1. БЛОК АВАТАРА И ФОТО */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">
                Фотография профиля / Аватар:
              </label>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => setAvatarUrl("")}
                  className="text-[11px] text-rose-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Удалить фото</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-4">
              {/* Превью текущего аватара */}
              <div className="relative group shrink-0">
                <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-white shadow-md ring-2 ring-blue-500/20 bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-2xl">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={name || "Аватар"}
                      className="w-full h-full object-cover"
                      onError={() => setAvatarUrl("")}
                    />
                  ) : (
                    name.charAt(0).toUpperCase() || <User className="w-8 h-8" />
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-slate-900/40 rounded-2xl opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white cursor-pointer"
                  title="Выбрать другое фото"
                >
                  <Camera className="w-5 h-5" />
                </button>
              </div>

              {/* Кнопка загрузки файла с устройства */}
              <div className="space-y-2 flex-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold transition border border-slate-200 shadow-2xs flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Upload className="w-3.5 h-3.5 text-blue-600" />
                  <span>Загрузить фото с устройства</span>
                </button>

                <div className="flex items-center gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setAvatarTab("presets")}
                    className={`px-2.5 py-1 rounded-lg font-bold transition ${
                      avatarTab === "presets"
                        ? "bg-blue-600 text-white"
                        : "text-slate-600 hover:bg-slate-200/70"
                    }`}
                  >
                    Готовые аватарки
                  </button>
                  <button
                    type="button"
                    onClick={() => setAvatarTab("url")}
                    className={`px-2.5 py-1 rounded-lg font-bold transition ${
                      avatarTab === "url"
                        ? "bg-blue-600 text-white"
                        : "text-slate-600 hover:bg-slate-200/70"
                    }`}
                  >
                    Ссылка URL
                  </button>
                </div>
              </div>
            </div>

            {/* Выбор из готовых аватарок */}
            {avatarTab === "presets" && (
              <div className="pt-2 border-t border-slate-200/80">
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {AVATAR_PRESETS.map((preset) => {
                    const isSelected = avatarUrl === preset.url;
                    return (
                      <button
                        type="button"
                        key={preset.id}
                        onClick={() => setAvatarUrl(preset.url)}
                        className={`relative rounded-xl overflow-hidden aspect-square border-2 transition cursor-pointer ${
                          isSelected
                            ? "border-blue-600 ring-2 ring-blue-500/30 scale-105"
                            : "border-slate-200 hover:border-slate-300 hover:scale-102"
                        }`}
                        title={preset.label}
                      >
                        <img
                          src={preset.url}
                          alt={preset.label}
                          className="w-full h-full object-cover"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-blue-600/30 flex items-center justify-center text-white">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Прямая ссылка URL */}
            {avatarTab === "url" && (
              <div className="pt-2 border-t border-slate-200/80 space-y-1.5">
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={customUrlInput}
                    onChange={(e) => setCustomUrlInput(e.target.value)}
                    placeholder="https://example.com/avatar.jpg"
                    className="flex-1 p-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none focus:border-blue-600"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customUrlInput.trim()) {
                        setAvatarUrl(customUrlInput.trim());
                        setCustomUrlInput("");
                      }
                    }}
                    className="px-3 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition"
                  >
                    Применить
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 2. ИМЯ И КОНТАКТЫ */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ФИО / Имя пользователя: <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Например: Анна Сергеевна Иванова или Артём Смирнов"
                  className="w-full pl-9 pr-3 py-2.5 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Номер телефона:
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+7 (999) 000-00-00"
                    className="w-full pl-9 pr-3 py-2.5 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-600 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Электронная почта:
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full pl-9 pr-3 py-2.5 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-600 transition"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 3. СПЕЦИФИЧЕСКИЕ ПОЛЯ ПО РОЛЯМ */}
          {/* А. Для Ученика */}
          {role.toUpperCase() === "STUDENT" && (
            <div className="space-y-3 pt-1 border-t border-slate-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Класс обучения:
                  </label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full p-2.5 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-600 bg-white"
                  >
                    {[
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
                    ].map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Школа / Город:
                  </label>
                  <div className="relative">
                    <School className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={school}
                      onChange={(e) => setSchool(e.target.value)}
                      placeholder="Школа №125 или Лицей"
                      className="w-full pl-9 pr-3 py-2.5 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  О себе и цели обучения:
                </label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Любимые предметы, подготовка к олимпиаде или ОГЭ/ЕГЭ..."
                  className="w-full p-2.5 rounded-2xl border border-slate-200 text-xs text-slate-900 font-medium focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>
          )}

          {/* Б. Для Преподавателя */}
          {role.toUpperCase() === "TEACHER" && (
            <div className="space-y-3 pt-1 border-t border-slate-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Преподаваемые предметы:
                  </label>
                  <input
                    type="text"
                    value={subjects}
                    onChange={(e) => setSubjects(e.target.value)}
                    placeholder="Математика, олимпиадная логика"
                    className="w-full p-2.5 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Педагогический стаж:
                  </label>
                  <input
                    type="text"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    placeholder="Стаж 12 лет, высшая категория"
                    className="w-full p-2.5 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Образование и квалификация:
                </label>
                <input
                  type="text"
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                  placeholder="МГПУ, физико-математический факультет"
                  className="w-full p-2.5 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  О преподавателе и методике обучения:
                </label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Краткое описание методики работы, подход к ученикам..."
                  className="w-full p-2.5 rounded-2xl border border-slate-200 text-xs text-slate-900 font-medium focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>
          )}

          {/* В. Для Родителя */}
          {role.toUpperCase() === "PARENT" && (
            <div className="space-y-3 pt-1 border-t border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Удобный способ связи для куратора:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["Telegram", "WhatsApp", "Телефонный звонок"].map((contact) => (
                    <button
                      type="button"
                      key={contact}
                      onClick={() => setPreferredContact(contact)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold transition border cursor-pointer ${
                        preferredContact === contact
                          ? "bg-blue-50 border-blue-600 text-blue-700 shadow-2xs"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {contact}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Пожелания к занятиям и центру:
                </label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Пожелания куратору, особенности графика ребёнка..."
                  className="w-full p-2.5 rounded-2xl border border-slate-200 text-xs text-slate-900 font-medium focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>
          )}

          {/* Г. Для Администратора */}
          {role.toUpperCase() === "ADMIN" && (
            <div className="space-y-3 pt-1 border-t border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Должность в онлайн-центре:
                </label>
                <input
                  type="text"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  placeholder="Руководитель центра / Старший куратор"
                  className="w-full p-2.5 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>
          )}

          {/* Кнопки сохранения */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Сохранение...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>Сохранить профиль</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
