"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Send,
  Paperclip,
  Mic,
  MicOff,
  Video,
  Phone,
  Search,
  Menu,
  X,
  ChevronLeft,
  Check,
  Clock,
  Calendar,
  BookOpen,
  GraduationCap,
  User,
  Users,
  Award,
  Star,
  Smile,
  MoreVertical,
  Plus,
  Trash2,
  Edit3,
  FileText,
  Play,
  Pause,
  ShieldCheck,
  LogOut,
  CreditCard,
  Download,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Eye,
  EyeOff,
  Copy,
  MessageSquare,
} from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { getSupabase } from "@/lib/supabase";
import { clearAuthCookies, performLogout } from "@/lib/auth-session";
import EditProfileModal from "@/components/EditProfileModal";
import ScheduleCalendar from "@/components/ScheduleCalendar";
import { formatUsername } from "@/lib/nickname";
import { formatTolyatti, nowInTolyatti } from "@/lib/tolyatti-time";

export interface TelegramChat {
  id: string;
  name: string;
  role: "teacher" | "student" | "parent" | "support" | "admin";
  roleLabel: string;
  avatar: string;
  online: boolean;
  statusText: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  lessonId?: string;
  lessonTitle?: string;
  lessonTime?: string;
}

export interface TelegramMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  isMe: boolean;
  text: string;
  time: string;
  date: string;
  type?: "text" | "voice" | "file" | "lesson_invite";
  voiceDuration?: string;
  fileName?: string;
  fileSize?: string;
  lessonData?: {
    id: string;
    title: string;
    time: string;
    subject: string;
  };
  read?: boolean;
}

interface TelegramCabinetProps {
  currentRole: "TEACHER" | "STUDENT" | "PARENT" | "ADMIN";
  currentUser: {
    id: string;
    name: string;
    username?: string;
    email?: string;
    phone?: string;
    avatar?: string;
    grade?: string;
    bio?: string;
    balance?: number;
    stars?: number;
  };
  lessons?: any[];
  onRefreshData?: () => void;
  // Role-specific slots
  extraCabinetSections?: {
    key: string;
    title: string;
    icon: React.ElementType;
    badge?: number | string;
    render: () => React.ReactNode;
  }[];
}

// Двойная галочка прочтения
function TgCheckmarks({ read }: { read?: boolean }) {
  return (
    <span className="inline-flex items-center text-[#4fae4e] ml-1 shrink-0 select-none" title={read ? "Прочитано" : "Отправлено"}>
      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 16 16">
        <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" />
        {read && (
          <path d="M10.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-.5-.5a.5.5 0 1 1 .708-.708l.146.147 6.646-6.647a.5.5 0 0 1 .708 0z" />
        )}
      </svg>
    </span>
  );
}

export default function TelegramCabinet({
  currentRole,
  currentUser: initialCurrentUser,
  lessons = [],
  onRefreshData,
  extraCabinetSections = [],
}: TelegramCabinetProps) {
  const router = useRouter();

  // Реактивное состояние текущего пользователя (мгновенно обновляется без перезагрузки страницы)
  const [currentUser, setCurrentUser] = useState(initialCurrentUser);

  useEffect(() => {
    setCurrentUser(initialCurrentUser);
  }, [initialCurrentUser]);

  // Слушатель событий обновления профиля для мгновенной синхронизации во всех шапках и меню
  useEffect(() => {
    const handleProfileUpdated = (e: any) => {
      const p = e.detail;
      if (p) {
        setCurrentUser((prev) => ({
          ...prev,
          id: p.id || prev.id,
          name: p.name || prev.name,
          username: p.username !== undefined ? p.username : prev.username,
          avatar: p.avatarUrl !== undefined ? p.avatarUrl : prev.avatar,
          phone: p.phone || prev.phone,
          email: p.email || prev.email,
          grade: p.grade || prev.grade,
          bio: p.bio || prev.bio,
        }));
      }
    };
    window.addEventListener("ayda:profile-updated", handleProfileUpdated);
    return () => window.removeEventListener("ayda:profile-updated", handleProfileUpdated);
  }, []);

  // 1. Навигация и активный экран
  // По умолчанию открываем первый раздел кабинета (например "schedule" или "children"), а не чат
  const [activeScreen, setActiveScreen] = useState<string>(
    extraCabinetSections[0]?.key || "schedule"
  );
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [editProfileOpen, setEditProfileOpen] = useState<boolean>(false);

  // 2. Чаты
  const [chatFilter, setChatFilter] = useState<"all" | "lessons" | "teachers" | "students" | "support">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeChatId, setActiveChatId] = useState<string>("chat-support");
  const [mobileShowChat, setMobileShowChat] = useState<boolean>(false); // на мобильном открыта переписка
  const [mobileShowSection, setMobileShowSection] = useState<boolean>(true); // на мобильном открыт раздел

  // 3. Сообщения
  const [messages, setMessages] = useState<TelegramMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  // Официальный чат со службой заботы и поддержки 24/7 (чат доступен только в поддержке)
  const buildChats = useCallback((): TelegramChat[] => {
    return [
      {
        id: "chat-support",
        name: "Поддержка «АйДаУмничка»",
        role: "support",
        roleLabel: "Служба заботы 24/7",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=faces",
        online: true,
        statusText: "онлайн",
        lastMessage: "Здравствуйте! Мы на связи, если у вас возникнут любые вопросы по урокам или платформе.",
        lastMessageTime: "Сегодня",
        unreadCount: 0,
      },
    ];
  }, []);

  const [chats, setChats] = useState<TelegramChat[]>(() => buildChats());

  // Обновляем чаты при изменении уроков или роли
  useEffect(() => {
    setChats(buildChats());
  }, [buildChats]);

  // Установка первого чата по умолчанию
  useEffect(() => {
    if (!activeChatId && chats.length > 0) {
      setActiveChatId(chats[0].id);
    } else if (activeChatId && !chats.some((c) => c.id === activeChatId) && chats.length > 0) {
      setActiveChatId(chats[0].id);
    }
  }, [chats, activeChatId]);

  // Загрузка сообщений для выбранного чата
  useEffect(() => {
    if (!activeChatId) return;

    try {
      const saved = localStorage.getItem(`ayda_tg_msgs_${activeChatId}`);
      if (saved) {
        setMessages(JSON.parse(saved));
        return;
      }
    } catch (e) {}

    const activeChat = chats.find((c) => c.id === activeChatId);
    const partnerName = activeChat?.name || "Собеседник";
    const partnerAvatar = activeChat?.avatar;

    if (activeChatId === "chat-support") {
      setMessages([
        {
          id: "msg-support-welcome",
          senderId: "chat-support",
          senderName: "Поддержка «АйДаУмничка»",
          senderAvatar: partnerAvatar,
          isMe: false,
          text: `Здравствуйте! Рады приветствовать вас на платформе «АйДаУмничка». Если у вас возникнут вопросы по расписанию, оплате или проведению занятий — напишите нам здесь.`,
          time: "10:00",
          date: "Сегодня",
          read: true,
        },
      ]);
      return;
    }

    if (activeChat?.lessonId) {
      setMessages([
        {
          id: "msg-lesson-invite",
          senderId: activeChatId,
          senderName: partnerName,
          senderAvatar: partnerAvatar,
          isMe: false,
          text: `Здравствуйте! Ссылка на подключение к уроку:`,
          time: "10:00",
          date: "Сегодня",
          type: "lesson_invite",
          lessonData: {
            id: activeChat.lessonId,
            title: activeChat.lessonTitle || "Онлайн-урок",
            time: activeChat.lessonTime || "По расписанию",
            subject: activeChat.roleLabel || "Занятие",
          },
          read: true,
        },
      ]);
      return;
    }

    setMessages([]);
  }, [activeChatId, chats]);

  // Автопрокрутка вниз при новом сообщении
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Сохранение сообщений в localStorage
  const saveMessages = useCallback(
    (newMsgs: TelegramMessage[]) => {
      setMessages(newMsgs);
      if (activeChatId) {
        try {
          localStorage.setItem(`ayda_tg_msgs_${activeChatId}`, JSON.stringify(newMsgs));
        } catch (e) {}
      }
    },
    [activeChatId]
  );

  // Отправка текстового сообщения
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = inputText.trim();
    if (!clean || !activeChatId) return;

    const timeStr = formatTolyatti(nowInTolyatti(), "HH:mm");

    const newMsg: TelegramMessage = {
      id: `msg-${Date.now()}`,
      senderId: currentUser.id || "me",
      senderName: currentUser.name || "Я",
      isMe: true,
      text: clean,
      time: timeStr,
      date: "Сегодня",
      read: true,
    };

    const updated = [...messages, newMsg];
    saveMessages(updated);
    setInputText("");

    // Обновляем превью в списке чатов
    setChats((prev) =>
      prev.map((c) =>
        c.id === activeChatId
          ? { ...c, lastMessage: clean, lastMessageTime: timeStr, unreadCount: 0 }
          : c
      )
    );

    // Авто-ответ собеседника через 1.5 секунды
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const activeChat = chats.find((c) => c.id === activeChatId);
      const partnerName = activeChat?.name || "Собеседник";
      const partnerAvatar = activeChat?.avatar;

      let replyText = "Принято! Спасибо за сообщение. Встретимся на уроке!";
      if (activeChat?.role === "support") {
        replyText = "Спасибо за обращение! Наш куратор уже на связи и готов помочь.";
      } else if (activeChat?.role === "student") {
        replyText = "Хорошо, я всё понял! Готовлюсь к занятию 🌟";
      } else if (activeChat?.role === "parent") {
        replyText = "Большое спасибо за информацию!";
      }

      const replyTimeStr = formatTolyatti(nowInTolyatti(), "HH:mm");

      const replyMsg: TelegramMessage = {
        id: `reply-${Date.now()}`,
        senderId: activeChatId,
        senderName: partnerName,
        senderAvatar: partnerAvatar,
        isMe: false,
        text: replyText,
        time: replyTimeStr,
        date: "Сегодня",
        read: true,
      };

      const withReply = [...updated, replyMsg];
      saveMessages(withReply);

      setChats((prev) =>
        prev.map((c) =>
          c.id === activeChatId
            ? { ...c, lastMessage: replyText, lastMessageTime: replyTimeStr }
            : c
        )
      );
    }, 1500);
  };

  // Отправка голосового сообщения
  const handleSendVoiceMessage = () => {
    const timeStr = formatTolyatti(nowInTolyatti(), "HH:mm");
    const voiceMsg: TelegramMessage = {
      id: `voice-${Date.now()}`,
      senderId: currentUser.id || "me",
      senderName: currentUser.name || "Я",
      isMe: true,
      text: "Голосовое сообщение",
      time: timeStr,
      date: "Сегодня",
      type: "voice",
      voiceDuration: "0:14",
      read: true,
    };

    const updated = [...messages, voiceMsg];
    saveMessages(updated);

    setChats((prev) =>
      prev.map((c) =>
        c.id === activeChatId
          ? { ...c, lastMessage: "🎤 Голосовое сообщение (0:14)", lastMessageTime: timeStr }
          : c
      )
    );
  };

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Выход из аккаунта (гарантированно работает на смартфонах)
  const handleLogout = async (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    await performLogout();
  };

  // Фильтрация списка чатов
  const filteredChats = chats.filter((c) => {
    if (chatFilter === "lessons" && !c.lessonId) return false;
    if (chatFilter === "teachers" && c.role !== "teacher") return false;
    if (chatFilter === "students" && c.role !== "student") return false;
    if (chatFilter === "support" && c.role !== "support") return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.roleLabel.toLowerCase().includes(q) ||
        c.lastMessage.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const activeChat = chats.find((c) => c.id === activeChatId) || chats[0];

  return (
    <div className="flex h-[100dvh] w-full bg-[#eef3f7] overflow-hidden select-none relative font-sans text-slate-800">
      {/* =========================================================================
          1. БОКОВОЕ МЕНЮ (SLIDE-OVER DRAWER)
         ========================================================================= */}
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs transition-opacity animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-72 sm:w-80 h-full bg-white shadow-2xl flex flex-col justify-between overflow-y-auto animate-slide-right"
          >
            <div>
              {/* Шапка профиля (фирменный синий градиент) */}
              <div className="p-4 bg-gradient-to-b from-[#2481cc] to-[#1f70b0] text-white">
                <div className="flex items-center justify-between mb-3">
                  <div className="relative">
                    <img
                      src={
                        currentUser.avatar ||
                        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=faces"
                      }
                      alt={currentUser.name}
                      className="w-14 h-14 rounded-full object-cover border-2 border-white/80 shadow-md"
                    />
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-400 border-2 border-white rounded-full" />
                  </div>
                  <button
                    onClick={() => {
                      setDrawerOpen(false);
                      setEditProfileOpen(true);
                    }}
                    className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition cursor-pointer"
                    title="Редактировать профиль"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>

                <h3 className="font-bold text-base tracking-tight truncate">{currentUser.name}</h3>
                {currentUser.username && (
                  <div className="text-xs text-blue-100 font-mono mt-0.5 flex items-center gap-1">
                    <span>{formatUsername(currentUser.username)}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-blue-100 font-medium">
                    {currentRole === "TEACHER"
                      ? "Преподаватель"
                      : currentRole === "STUDENT"
                      ? "Ученик"
                      : currentRole === "PARENT"
                      ? "Родитель"
                      : "Администратор"}
                  </span>
                  {currentUser.grade && (
                    <span className="px-1.5 py-0.2 rounded bg-white/20 text-[11px] font-semibold">
                      {currentUser.grade}
                    </span>
                  )}
                </div>

                {currentUser.balance !== undefined && (
                  <div className="mt-3 pt-2.5 border-t border-white/20 flex items-center justify-between text-xs">
                    <span className="text-blue-100">Баланс занятий:</span>
                    <span className="font-extrabold bg-white/20 px-2 py-0.5 rounded-lg text-white">
                      {currentUser.balance} уроков
                    </span>
                  </div>
                )}
              </div>

              {/* Пункты меню */}
              <div className="p-2 space-y-1">
                {/* Дополнительные разделы кабинета */}
                {extraCabinetSections.map((sec) => {
                  const Icon = sec.icon;
                  const isSelected = activeScreen === sec.key;
                  return (
                    <button
                      key={sec.key}
                      onClick={() => {
                        setActiveScreen(sec.key);
                        setMobileShowChat(false);
                        setMobileShowSection(true);
                        setDrawerOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition cursor-pointer ${
                        isSelected
                          ? "bg-[#2481cc]/10 text-[#2481cc] font-bold"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <Icon className={`w-5 h-5 ${isSelected ? "text-[#2481cc]" : "text-slate-500"}`} />
                        <span>{sec.title}</span>
                      </div>
                      {Boolean(sec.badge) && String(sec.badge) !== "0" && Number(sec.badge) !== 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-[#2481cc] text-white text-[11px] font-bold">
                          {sec.badge}
                        </span>
                      ) : null}
                    </button>
                  );
                })}

                <button
                  onClick={() => {
                    setActiveScreen("chat");
                    setActiveChatId("chat-support");
                    setMobileShowChat(true);
                    setDrawerOpen(false);
                  }}
                  className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl font-medium text-sm transition cursor-pointer ${
                    activeScreen === "chat"
                      ? "bg-[#2481cc]/10 text-[#2481cc] font-bold"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <MessageSquare className="w-5 h-5 text-[#2481cc]" />
                  <span>Служба поддержки 24/7</span>
                </button>

                <button
                  onClick={() => {
                    setDrawerOpen(false);
                    setEditProfileOpen(true);
                  }}
                  className="w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl font-medium text-sm text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                >
                  <User className="w-5 h-5 text-slate-500" />
                  <span>Мой профиль и данные</span>
                </button>
              </div>
            </div>

            {/* Подвал бокового меню */}
            <div className="p-3 border-t border-slate-100 space-y-1">
              <button
                type="button"
                disabled={isLoggingOut}
                onClick={handleLogout}
                onTouchEnd={handleLogout}
                className="w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl font-bold text-sm text-rose-600 hover:bg-rose-50 active:bg-rose-100 transition cursor-pointer select-none touch-manipulation disabled:opacity-50"
              >
                <LogOut className="w-5 h-5 shrink-0" />
                <span>{isLoggingOut ? "Выходим..." : "Выйти из аккаунта"}</span>
              </button>
              <div className="text-[11px] text-center text-slate-400 pt-2 font-mono">
                АйДаУмничка • Личный кабинет
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          2. ЛЕВАЯ КОЛОНКА (РАЗДЕЛЫ КАБИНЕТА И СЛУЖБА ПОДДЕРЖКИ)
         ========================================================================= */}
      <aside
        className={`w-full md:w-80 lg:w-96 bg-white border-r border-slate-200 flex flex-col shrink-0 h-full ${
          mobileShowChat || mobileShowSection ? "hidden md:flex" : "flex"
        }`}
      >
        {/* Шапка левой колонки с гамбургером и брендом */}
        <div className="p-3 bg-white border-b border-slate-100 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setDrawerOpen(true)}
              className="p-2 rounded-xl text-slate-600 hover:text-[#2481cc] hover:bg-slate-100 transition cursor-pointer"
              title="Открыть меню кабинета"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#2481cc] text-white flex items-center justify-center font-black text-xs shadow-xs">
                У
              </div>
              <span className="font-extrabold text-sm text-slate-900 tracking-tight">
                АйДаУмничка
              </span>
            </div>
          </div>

          <button
            onClick={() => setEditProfileOpen(true)}
            className="p-1.5 rounded-xl text-slate-500 hover:text-[#2481cc] hover:bg-slate-100 transition cursor-pointer"
            title="Профиль и данные"
          >
            <User className="w-4 h-4" />
          </button>
        </div>

        {/* Список разделов кабинета */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <div className="px-2 py-1 text-[11px] font-black uppercase tracking-wider text-slate-400">
            Разделы кабинета
          </div>
          {extraCabinetSections.map((sec) => {
            const Icon = sec.icon;
            const isSelected = activeScreen === sec.key;
            return (
              <button
                key={sec.key}
                type="button"
                onClick={() => {
                  setActiveScreen(sec.key);
                  setMobileShowChat(false);
                  setMobileShowSection(true);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl font-bold text-xs sm:text-sm transition cursor-pointer select-none text-left ${
                  isSelected
                    ? "bg-[#2481cc] text-white shadow-md shadow-blue-500/20"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isSelected ? "text-white" : "text-[#2481cc]"}`} />
                  <span>{sec.title}</span>
                </div>
                {Boolean(sec.badge) && String(sec.badge) !== "0" && Number(sec.badge) !== 0 ? (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                      isSelected
                        ? "bg-white text-[#2481cc]"
                        : "bg-[#2481cc] text-white"
                    }`}
                  >
                    {sec.badge}
                  </span>
                ) : null}
              </button>
            );
          })}

          <div className="pt-3 border-t border-slate-100 mt-2 space-y-1">
            <div className="px-2 py-1 text-[11px] font-black uppercase tracking-wider text-slate-400">
              Служба поддержки
            </div>

            {/* Официальный чат поддержки */}
            <div
              onClick={() => {
                setActiveChatId("chat-support");
                setActiveScreen("chat");
                setMobileShowChat(true);
              }}
              className={`p-3 rounded-2xl flex items-center gap-3 cursor-pointer transition select-none ${
                activeScreen === "chat"
                  ? "bg-[#2481cc] text-white shadow-md shadow-blue-500/20"
                  : "hover:bg-slate-100 text-slate-800"
              }`}
            >
              <div className="relative shrink-0">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=faces"
                  alt="Поддержка"
                  className="w-10 h-10 rounded-full object-cover shadow-xs"
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border border-white rounded-full shadow-xs" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <h4 className="font-bold text-xs sm:text-sm truncate">Поддержка «АйДаУмничка»</h4>
                  <span className={`text-[10px] font-bold shrink-0 ${activeScreen === "chat" ? "text-blue-100" : "text-emerald-600"}`}>
                    онлайн
                  </span>
                </div>
                <p className={`text-[11px] truncate ${activeScreen === "chat" ? "text-blue-50" : "text-slate-500"}`}>
                  Служба заботы 24/7
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* =========================================================================
          3. ПРАВАЯ ОБЛАСТЬ (АКТИВНЫЙ ЧАТ ИЛИ РАЗДЕЛ КАБИНЕТА)
         ========================================================================= */}
      <main
        className={`flex-1 flex flex-col h-full overflow-hidden bg-[#eef3f7] ${
          !mobileShowChat && !mobileShowSection ? "hidden md:flex" : "flex"
        }`}
      >
        {activeScreen === "chat" ? (
          /* =====================================================================
             РЕЖИМ А: ЧАТ (ПЕРЕПИСКА)
             ===================================================================== */
          <>
            {/* Шапка активного диалога */}
            <header className="h-16 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0 z-10 shadow-xs">
              <div className="flex items-center gap-3 min-w-0">
                {/* Кнопка "Назад" для мобильных */}
                <button
                  onClick={() => setMobileShowChat(false)}
                  className="md:hidden p-1.5 -ml-1 rounded-lg text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                <div className="relative shrink-0">
                  <img
                    src={activeChat.avatar}
                    alt={activeChat.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  {activeChat.online && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border border-white rounded-full" />
                  )}
                </div>

                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-slate-900 truncate flex items-center gap-1.5">
                    <span>{activeChat.name}</span>
                    <span className="text-[11px] font-normal text-slate-400">
                      ({activeChat.roleLabel})
                    </span>
                  </h3>
                  <p className="text-xs text-emerald-600 font-medium truncate">
                    {isTyping ? "печатает..." : activeChat.statusText}
                  </p>
                </div>
              </div>

              {/* Действия в шапке чата */}
              <div className="flex items-center gap-2">
                {/* Кнопка "Войти в онлайн-урок" */}
                {activeChat.lessonId && (
                  <Link
                    href={`/room/${activeChat.lessonId}`}
                    className="px-3.5 py-1.5 rounded-xl bg-[#2481cc] hover:bg-[#1f70b0] text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition cursor-pointer"
                  >
                    <Video className="w-4 h-4" />
                    <span className="hidden sm:inline">Войти в урок</span>
                  </Link>
                )}

                <button
                  onClick={() => setDrawerOpen(true)}
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                  title="Меню кабинета"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </header>

            {/* Область сообщений (с фирменным фоном) */}
            <div
              className="flex-1 overflow-y-auto p-3 sm:p-5 relative"
              style={{
                backgroundColor: "#8bb1cc",
                backgroundImage:
                  "radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.08) 2px, transparent 2px), radial-gradient(circle at 0 0, rgba(255, 255, 255, 0.05) 1px, transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            >
              <div className="max-w-3xl mx-auto w-full space-y-3 pb-2">
                {/* Дата "Сегодня" */}
                <div className="flex justify-center my-2">
                  <span className="bg-black/25 backdrop-blur-xs text-white text-[11px] font-bold px-3 py-0.5 rounded-full shadow-xs">
                    Сегодня
                  </span>
                </div>

              {/* Список сообщений */}
              {messages.map((msg) => {
                const isMe = msg.isMe;
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? "items-end" : "items-start"} animate-fade-in`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-md px-3.5 py-2 shadow-sm relative ${
                        isMe
                          ? "bg-[#effdde] text-slate-900 rounded-2xl rounded-tr-xs"
                          : "bg-white text-slate-900 rounded-2xl rounded-tl-xs"
                      }`}
                    >
                      {/* Если это приглашение на онлайн-урок */}
                      {msg.type === "lesson_invite" && msg.lessonData ? (
                        <div className="space-y-2.5 pb-1">
                          <p className="text-xs sm:text-sm font-medium">{msg.text}</p>
                          <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-200 text-xs space-y-2">
                            <div className="flex items-center gap-2 text-[#2481cc] font-bold">
                              <Video className="w-4 h-4" />
                              <span>{msg.lessonData.title}</span>
                            </div>
                            <div className="text-slate-600 space-y-0.5">
                              <div>Предмет: <strong>{msg.lessonData.subject}</strong></div>
                              <div>Время: <strong>{msg.lessonData.time}</strong></div>
                            </div>
                            <Link
                              href={`/room/${msg.lessonData.id}`}
                              className="w-full mt-2 py-2 px-3 rounded-lg bg-[#2481cc] hover:bg-[#1f70b0] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
                            >
                              <span>🚀 Подключиться к классу</span>
                            </Link>
                          </div>
                        </div>
                      ) : msg.type === "voice" ? (
                        /* Голосовое сообщение */
                        <div className="flex items-center gap-3 py-1 min-w-[200px]">
                          <button
                            onClick={() =>
                              setPlayingVoiceId(playingVoiceId === msg.id ? null : msg.id)
                            }
                            className="w-9 h-9 rounded-full bg-[#2481cc] text-white flex items-center justify-center shadow-xs hover:scale-105 transition cursor-pointer shrink-0"
                          >
                            {playingVoiceId === msg.id ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4 ml-0.5" />
                            )}
                          </button>
                          <div className="flex-1 space-y-1">
                            {/* Аудио-дорожка */}
                            <div className="flex items-center gap-0.5 h-4">
                              {[40, 70, 90, 60, 30, 80, 100, 60, 45, 95, 75, 40, 85, 50].map(
                                (h, i) => (
                                  <div
                                    key={i}
                                    style={{ height: `${h}%` }}
                                    className={`w-1 rounded-full ${
                                      playingVoiceId === msg.id ? "bg-[#2481cc]" : "bg-slate-400"
                                    }`}
                                  />
                                )
                              )}
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                              <span>{playingVoiceId === msg.id ? "0:07" : msg.voiceDuration}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Обычный текст сообщения */
                        <p className="text-xs sm:text-sm font-medium leading-relaxed whitespace-pre-wrap break-words">
                          {msg.text}
                        </p>
                      )}

                      {/* Время и статус доставки */}
                      <div className="flex items-center justify-end gap-1 mt-1 -mb-1 text-[10px] text-slate-400 font-mono select-none">
                        <span>{msg.time}</span>
                        {isMe && <TgCheckmarks read={msg.read} />}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Индикатор набора текста собеседником */}
              {isTyping && (
                <div className="flex items-center gap-2 bg-white/90 backdrop-blur-xs px-3.5 py-2 rounded-2xl rounded-tl-xs w-fit shadow-xs">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2481cc] animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2481cc] animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2481cc] animate-bounce [animation-delay:0.4s]" />
                  </div>
                  <span className="text-xs text-slate-500 font-medium">Собеседник печатает...</span>
                </div>
              )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Нижняя панель ввода сообщения */}
            <footer className="p-2.5 sm:p-3 bg-white border-t border-slate-200 shrink-0">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2 max-w-3xl mx-auto">
                {/* Скрепка прикрепления файлов */}
                <button
                  type="button"
                  onClick={() => setShowAttachMenu(!showAttachMenu)}
                  className="p-2.5 text-slate-400 hover:text-[#2481cc] hover:bg-slate-100 rounded-full transition cursor-pointer"
                  title="Прикрепить файл или домашку"
                >
                  <Paperclip className="w-5 h-5" />
                </button>

                {/* Поле ввода сообщения */}
                <input
                  ref={chatInputRef}
                  type="text"
                  placeholder="Написать сообщение..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-[#f1f5f9] rounded-2xl text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#2481cc]/30 transition"
                />

                {/* Кнопка отправки или записи голоса */}
                {inputText.trim() ? (
                  <button
                    type="submit"
                    className="p-2.5 rounded-full bg-[#2481cc] hover:bg-[#1f70b0] text-white shadow-md shadow-blue-500/25 transition cursor-pointer shrink-0"
                    title="Отправить сообщение"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendVoiceMessage}
                    className="p-2.5 rounded-full text-slate-400 hover:text-[#2481cc] hover:bg-slate-100 transition cursor-pointer shrink-0"
                    title="Записать голосовое сообщение"
                  >
                    <Mic className="w-5 h-5" />
                  </button>
                )}
              </form>
            </footer>
          </>
        ) : (
          /* =====================================================================
             РЕЖИМ Б: РАЗДЕЛ КАБИНЕТА (РАСПИСАНИЕ, ДЕТИ, УЧЕНИКИ, ДОМАШКА)
             ===================================================================== */
          <div className="flex-1 flex flex-col h-full bg-[#f8fafc] overflow-y-auto">
            {/* Верхняя навигационная плашка раздела */}
            <div className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMobileShowSection(false)}
                  className="md:hidden px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Меню</span>
                </button>
                <h2 className="font-extrabold text-base sm:text-lg text-slate-900 flex items-center gap-2">
                  <span>{extraCabinetSections.find((s) => s.key === activeScreen)?.title || "Раздел кабинета"}</span>
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveScreen("chat");
                    setActiveChatId("chat-support");
                    setMobileShowChat(true);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#2481cc] font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-[#2481cc]" />
                  <span>Поддержка 24/7</span>
                </button>
                <button
                  onClick={() => setDrawerOpen(true)}
                  className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition cursor-pointer"
                  title="Меню"
                >
                  <Menu className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Контент выбранного раздела */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto max-w-6xl w-full mx-auto">
              {extraCabinetSections.find((s) => s.key === activeScreen)?.render()}
            </div>
          </div>
        )}
      </main>

      {/* Модальное окно редактирования профиля */}
      {editProfileOpen && (
        <EditProfileModal
          isOpen={editProfileOpen}
          onClose={() => setEditProfileOpen(false)}
          role={
            currentRole === "TEACHER"
              ? "teacher"
              : currentRole === "STUDENT"
              ? "student"
              : currentRole === "PARENT"
              ? "parent"
              : "admin"
          }
          currentProfile={{
            id: currentUser.id,
            name: currentUser.name,
            username: currentUser.username,
            phone: currentUser.phone,
            email: currentUser.email,
            avatarUrl: currentUser.avatar,
            grade: currentUser.grade,
            bio: (currentUser as any).bio,
          }}
          onProfileUpdated={(upd) => {
            setCurrentUser((prev) => ({
              ...prev,
              id: upd.id || prev.id,
              name: upd.name || prev.name,
              username: upd.username !== undefined ? upd.username : prev.username,
              avatar: upd.avatarUrl !== undefined ? upd.avatarUrl : prev.avatar,
              phone: upd.phone || prev.phone,
              email: upd.email || prev.email,
              grade: upd.grade || prev.grade,
              bio: upd.bio || prev.bio,
            }));
          }}
          onSave={(upd) => {
            if (upd) {
              setCurrentUser((prev) => ({
                ...prev,
                id: upd.id || prev.id,
                name: upd.name || prev.name,
                username: upd.username !== undefined ? upd.username : prev.username,
                avatar: upd.avatarUrl !== undefined ? upd.avatarUrl : prev.avatar,
                phone: upd.phone || prev.phone,
                email: upd.email || prev.email,
                grade: upd.grade || prev.grade,
                bio: upd.bio || prev.bio,
              }));
            }
            setEditProfileOpen(false);
          }}
        />
      )}
    </div>
  );
}
