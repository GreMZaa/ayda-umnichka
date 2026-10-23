"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Send,
  Paperclip,
  Mic,
  Video,
  Phone,
  Search,
  Menu,
  X,
  UserPlus,
  Loader2,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
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
  Sparkles,
  ArrowRight,
  Bookmark,
  Pin,
  Link as LinkIcon,
  Hash,
  ExternalLink,
  Inbox,
  MessageSquare,
  Settings,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Folder,
  AtSign,
  Share2,
  SlidersHorizontal,
  Layers,
  Activity,
  Info as InfoIcon,
  Heart,
  ThumbsUp,
  Download,
  Mail,
  MapPin,
  CalendarCheck,
  CheckSquare,
} from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { getSupabase } from "@/lib/supabase";
import { clearAuthCookies, performLogout } from "@/lib/auth-session";
import EditProfileModal from "@/components/EditProfileModal";
import ScheduleCalendar from "@/components/ScheduleCalendar";
import { formatUsername } from "@/lib/nickname";
import { formatTolyatti, nowInTolyatti } from "@/lib/tolyatti-time";
import { SHARONOV_AVATAR, TEACHER_VASILINA_AVATAR } from "@/lib/default-avatar";
import { fetchWithAuth } from "@/lib/api-client";

export interface TelegramChat {
  id: string;
  name: string;
  role: "teacher" | "student" | "parent" | "support" | "admin" | "assistant";
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
  lessonSubject?: string;
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
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  lessonData?: {
    id: string;
    title: string;
    time: string;
    subject: string;
    roomName?: string;
  };
  reactions?: { [emoji: string]: number };
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
  friendTeachers?: {
    id: string;
    name: string;
    username?: string;
    avatarUrl?: string;
    subjects?: string;
  }[];
  friendStudents?: {
    id: string;
    name: string;
    username?: string;
    avatarUrl?: string;
    grade?: string;
  }[];
  onRefreshData?: () => void;
  onProfileUpdated?: (profile: any) => void;
  // Role-specific slots
  extraCabinetSections?: {
    key: string;
    title: string;
    icon: React.ElementType;
    badge?: number | string;
    render: () => React.ReactNode;
  }[];
}

export default function TelegramCabinet({
  currentRole,
  currentUser: initialCurrentUser,
  lessons = [],
  friendTeachers = [],
  friendStudents = [],
  onRefreshData,
  onProfileUpdated,
  extraCabinetSections = [],
}: TelegramCabinetProps) {
  const router = useRouter();

  // Реактивное состояние текущего пользователя
  const [currentUser, setCurrentUser] = useState(() => initialCurrentUser);

  useEffect(() => {
    setCurrentUser(initialCurrentUser);
  }, [initialCurrentUser]);

  // Слушатель событий обновления профиля
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

  // Слушатель открытия конкретного диалога
  useEffect(() => {
    const handleOpenChat = (e: any) => {
      const chatId = e.detail?.chatId;
      if (chatId) {
        setActiveScreen("chat");
        setActiveChatId(chatId);
        setMobileSidebarOpen(false);
      }
    };
    window.addEventListener("ayda:open-chat", handleOpenChat);
    return () => window.removeEventListener("ayda:open-chat", handleOpenChat);
  }, []);

  // Навигация и активный экран:
  // По умолчанию открываем реальный раздел кабинета (например, расписание "schedule" или детей "children"), а не заглушку чата
  const [activeScreen, setActiveScreen] = useState<string>(
    extraCabinetSections[0]?.key || "schedule"
  );
  const [editProfileOpen, setEditProfileOpen] = useState<boolean>(false);

  // Inspector / Правая контекстная панель (закрыта по умолчанию, чтобы не загромождать рабочее место)
  const [inspectorOpen, setInspectorOpen] = useState<boolean>(false);
  const [inspectorTab, setInspectorTab] = useState<"info" | "files" | "links">("info");

  // Поиск по разделам и чатам
  const [searchQuery, setSearchQuery] = useState("");
  const [activeChatId, setActiveChatId] = useState<string>("");

  // Мобильное меню
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Меню упоминаний (@) и эмодзи
  const [showMentions, setShowMentions] = useState(false);

  // Сообщения
  const [messages, setMessages] = useState<TelegramMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [messageReactions, setMessageReactions] = useState<{ [msgId: string]: { [emoji: string]: number } }>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Построение реальных чатов из базы данных
  const buildChats = useCallback((): TelegramChat[] => {
    const list: TelegramChat[] = [];

    // Диалоги на основе реальных уроков
    if (currentRole === "STUDENT") {
      const studentLessons = Array.isArray(lessons) ? lessons : [];
      studentLessons.forEach((l) => {
        const tId = l.teacherId || l.teacher_id || l.teacher?.id || "vasilina";
        const tName = l.teacherName || l.teacher?.name || "Шаронова Василина Владимировна";
        const chatId = `teacher-${tId}`;
        if (!list.some((c) => c.id === chatId)) {
          list.push({
            id: chatId,
            name: tName,
            role: "teacher",
            roleLabel: l.subjectName ? `Преподаватель • ${l.subjectName}` : "Преподаватель",
            avatar: l.teacherAvatar || l.teacher?.avatar_url || TEACHER_VASILINA_AVATAR,
            online: true,
            statusText: "в сети",
            lastMessage: l.title ? `Урок: «${l.title}»` : "Диалог с преподавателем",
            lastMessageTime: l.startTime ? formatTolyatti(l.startTime, "d MMM, HH:mm") : "Недавно",
            unreadCount: 0,
            lessonId: l.id,
            lessonTitle: l.title,
            lessonTime: l.startTime ? formatTolyatti(l.startTime, "d MMMM (EE) в HH:mm") : undefined,
            lessonSubject: l.subjectName || "Занятие",
          });
        }
      });

      // Добавленные преподаватели
      if (Array.isArray(friendTeachers)) {
        friendTeachers.forEach((t) => {
          const chatId = `teacher-${t.id}`;
          if (!list.some((c) => c.id === chatId)) {
            list.push({
              id: chatId,
              name: t.name,
              role: "teacher",
              roleLabel: t.subjects ? `Преподаватель • ${t.subjects}` : "Преподаватель",
              avatar: t.avatarUrl || TEACHER_VASILINA_AVATAR,
              online: true,
              statusText: "в сети",
              lastMessage: "Преподаватель добавлен в контакты.",
              lastMessageTime: "Сегодня",
              unreadCount: 0,
            });
          }
        });
      }
    } else if (currentRole === "TEACHER") {
      if (Array.isArray(lessons) && lessons.length > 0) {
        lessons.forEach((l) => {
          const sId = l.studentId || l.student_id || l.student?.id;
          const sName = l.studentName || l.student?.name || "Ученик";
          const chatId = `student-${sId || "unknown"}`;
          if (!list.some((c) => c.id === chatId)) {
            list.push({
              id: chatId,
              name: sName,
              role: "student",
              roleLabel: l.subjectName ? `Ученик • ${l.subjectName}` : "Ученик",
              avatar:
                l.studentAvatar ||
                l.student?.avatar_url ||
                "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&h=150&fit=crop&crop=faces",
              online: true,
              statusText: "в сети",
              lastMessage: l.title ? `Урок: «${l.title}»` : "Диалог открыт",
              lastMessageTime: l.startTime ? formatTolyatti(l.startTime, "d MMM, HH:mm") : "Недавно",
              unreadCount: 0,
              lessonId: l.id,
              lessonTitle: l.title,
              lessonTime: l.startTime ? formatTolyatti(l.startTime, "d MMMM (EE) в HH:mm") : undefined,
              lessonSubject: l.subjectName || "Занятие",
            });
          }
        });
      }

      // Добавленные ученики
      if (Array.isArray(friendStudents)) {
        friendStudents.forEach((st) => {
          const chatId = `student-${st.id}`;
          if (!list.some((c) => c.id === chatId)) {
            list.push({
              id: chatId,
              name: st.name,
              role: "student",
              roleLabel: st.grade ? `Ученик • ${st.grade}` : "Ученик",
              avatar:
                st.avatarUrl ||
                "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&h=150&fit=crop&crop=faces",
              online: true,
              statusText: "в сети",
              lastMessage: "Ученик в списке контактов.",
              lastMessageTime: "Сегодня",
              unreadCount: 0,
            });
          }
        });
      }
      // Добавленные коллеги-преподаватели
      if (Array.isArray(friendTeachers)) {
        friendTeachers.forEach((t) => {
          const chatId = `teacher-${t.id}`;
          if (!list.some((c) => c.id === chatId)) {
            list.push({
              id: chatId,
              name: t.name,
              role: "teacher",
              roleLabel: t.subjects ? `Коллега • ${t.subjects}` : "Коллега",
              avatar: t.avatarUrl || TEACHER_VASILINA_AVATAR,
              online: true,
              statusText: "в сети",
              lastMessage: "Коллега добавлен в контакты.",
              lastMessageTime: "Сегодня",
              unreadCount: 0,
            });
          }
        });
      }
    } else if (currentRole === "PARENT") {
      const parentLessons = Array.isArray(lessons) ? lessons : [];
      parentLessons.forEach((l) => {
        const tId = l.teacherId || l.teacher_id || l.teacher?.id || "vasilina";
        const tName = l.teacherName || l.teacher?.name || "Шаронова Василина Владимировна";
        const chatId = `teacher-${tId}`;
        if (!list.some((c) => c.id === chatId)) {
          list.push({
            id: chatId,
            name: tName,
            role: "teacher",
            roleLabel: l.subjectName ? `Преподаватель • ${l.subjectName}` : "Преподаватель",
            avatar: l.teacherAvatar || l.teacher?.avatar_url || TEACHER_VASILINA_AVATAR,
            online: true,
            statusText: "в сети",
            lastMessage: l.title ? `Урок ребёнка: «${l.title}»` : "Диалог с преподавателем",
            lastMessageTime: l.startTime ? formatTolyatti(l.startTime, "d MMM, HH:mm") : "Недавно",
            unreadCount: 0,
            lessonId: l.id,
            lessonTitle: l.title,
            lessonTime: l.startTime ? formatTolyatti(l.startTime, "d MMMM (EE) в HH:mm") : undefined,
            lessonSubject: l.subjectName || "Занятие",
          });
        }
      });

      if (Array.isArray(friendTeachers)) {
        friendTeachers.forEach((t) => {
          const chatId = `teacher-${t.id}`;
          if (!list.some((c) => c.id === chatId)) {
            list.push({
              id: chatId,
              name: t.name,
              role: "teacher",
              roleLabel: t.subjects ? `Преподаватель • ${t.subjects}` : "Преподаватель",
              avatar: t.avatarUrl || TEACHER_VASILINA_AVATAR,
              online: true,
              statusText: "в сети",
              lastMessage: "Преподаватель в списке контактов.",
              lastMessageTime: "Сегодня",
              unreadCount: 0,
            });
          }
        });
      }

      if (Array.isArray(friendStudents)) {
        friendStudents.forEach((st) => {
          const chatId = `student-${st.id}`;
          if (!list.some((c) => c.id === chatId)) {
            list.push({
              id: chatId,
              name: st.name,
              role: "student",
              roleLabel: st.grade ? `Ученик • ${st.grade}` : "Ученик",
              avatar: st.avatarUrl || SHARONOV_AVATAR,
              online: true,
              statusText: "в сети",
              lastMessage: "Ученик в списке контактов.",
              lastMessageTime: "Сегодня",
              unreadCount: 0,
            });
          }
        });
      }
    }

    return list;
  }, [lessons, currentRole, friendTeachers, friendStudents]);

  const [chats, setChats] = useState<TelegramChat[]>(() => buildChats());

  useEffect(() => {
    const newChats = buildChats();
    setChats(newChats);
    if ((!activeChatId || !newChats.some((c) => c.id === activeChatId)) && newChats.length > 0) {
      setActiveChatId(newChats[0].id);
    }
  }, [buildChats, activeChatId]);

  // Глобальный поиск пользователей платформы по всей школе
  const [globalSearchResults, setGlobalSearchResults] = useState<any[]>([]);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);
  const [addedFriendIds, setAddedFriendIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(`ayda_friends_${currentUser.id}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Запрос поиска пользователей с дебаунсом 200мс
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setGlobalSearchResults([]);
      setIsSearchingGlobal(false);
      return;
    }

    setIsSearchingGlobal(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.users)) {
            // Исключаем самого себя из результатов глобального поиска
            const filtered = data.users.filter((u: any) => u.id !== currentUser.id);
            setGlobalSearchResults(filtered);
          }
        }
      } catch (err) {
        console.warn("Global user search error:", err);
      } finally {
        setIsSearchingGlobal(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery, currentUser.id]);

  // Открытие или создание диалога с найденным пользователем
  const handleOpenChatWithUser = useCallback((user: any) => {
    const rolePrefix = (user.role || "student").toLowerCase();
    const chatId = `${rolePrefix}-${user.id}`;

    setChats((prev) => {
      if (prev.some((c) => c.id === chatId)) return prev;

      let roleLabel = "Пользователь";
      if (user.role === "TEACHER") {
        roleLabel = user.subjects ? `Преподаватель • ${user.subjects}` : "Преподаватель";
      } else if (user.role === "STUDENT") {
        roleLabel = user.grade ? `Ученик • ${user.grade}` : "Ученик";
      } else if (user.role === "PARENT") {
        roleLabel = "Родитель";
      } else if (user.role === "ADMIN") {
        roleLabel = "Администратор";
      }

      const newChat: TelegramChat = {
        id: chatId,
        name: user.name || "Пользователь",
        role: rolePrefix as any,
        roleLabel,
        avatar: user.avatarUrl || TEACHER_VASILINA_AVATAR,
        online: true,
        statusText: "в сети",
        lastMessage: "Диалог открыт",
        lastMessageTime: "Сейчас",
        unreadCount: 0,
      };
      return [newChat, ...prev];
    });

    setActiveChatId(chatId);
    setActiveScreen("chat");
    setMobileSidebarOpen(false);
  }, []);

  // Добавление в контакты / друзья
  const handleToggleFriend = useCallback((user: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setAddedFriendIds((prev) => {
      const isFriend = prev.includes(user.id);
      const next = isFriend ? prev.filter((id) => id !== user.id) : [...prev, user.id];
      try {
        localStorage.setItem(`ayda_friends_${currentUser.id}`, JSON.stringify(next));
        if (currentRole === "STUDENT") {
          localStorage.setItem(`ayda_student_friends_${currentUser.id}`, JSON.stringify(next));
          window.dispatchEvent(new CustomEvent("ayda:student-friends-updated", { detail: { friends: next } }));
        } else if (currentRole === "TEACHER") {
          if (user.role === "STUDENT") {
            localStorage.setItem(`ayda_teacher_friends_${currentUser.id}`, JSON.stringify(next));
            window.dispatchEvent(new CustomEvent("ayda:teacher-friends-updated", { detail: { friends: next } }));
          } else {
            localStorage.setItem(`ayda_teacher_colleagues_${currentUser.id}`, JSON.stringify(next));
            window.dispatchEvent(new CustomEvent("ayda:teacher-colleagues-updated", { detail: { friends: next } }));
          }
        }
      } catch {}
      return next;
    });

    handleOpenChatWithUser(user);
  }, [currentUser.id, currentRole, handleOpenChatWithUser]);

  // Нормализованный ключ комнаты Realtime
  const getNormalizedRoomId = useCallback(
    (chatId: string) => {
      if (chatId === "chat-support") return `tg_support_${currentUser.id || "guest"}`;
      if (chatId === "chat-ai-assistant") return `tg_ai_${currentUser.id || "guest"}`;
      const myId = currentUser.id || "guest";
      const partnerId = chatId.replace(/^(student|teacher)-/, "");
      const sorted = [myId, partnerId].sort();
      return `tg_chat_${sorted[0]}_${sorted[1]}`;
    },
    [currentUser.id]
  );

  const activeChat = useMemo(() => {
    return chats.find((c) => c.id === activeChatId) || chats[0];
  }, [chats, activeChatId]);

  // Загрузка сообщений
  useEffect(() => {
    if (!activeChatId) return;

    const channelName = getNormalizedRoomId(activeChatId);

    // Сначала пробуем восстановить из локального кэша
    let hasLoadedLocal = false;
    try {
      const saved = localStorage.getItem(`ayda_tg_msgs_${channelName}`) || localStorage.getItem(`ayda_tg_msgs_${activeChatId}`);
      if (saved) {
        setMessages(JSON.parse(saved));
        hasLoadedLocal = true;
      }
    } catch (e) {}

    const partnerName = activeChat?.name || "Собеседник";
    const partnerAvatar = activeChat?.avatar;

    if (!hasLoadedLocal) {
      if (activeChatId === "chat-ai-assistant") {
        setMessages([
          {
            id: "msg-ai-welcome",
            senderId: "chat-ai-assistant",
            senderName: "Ассистент «Умничка AI»",
            senderAvatar: partnerAvatar,
            isMe: false,
            text: `Здравствуйте, ${currentUser?.name?.split(" ")[0] || "друг"}! Я ваш персональный помощник по учебе. Могу помочь с решением примеров, разбором правил или ответом на вопросы.`,
            time: "10:00",
            date: "Сегодня",
            read: true,
          },
        ]);
      } else if (activeChat?.lessonId) {
        setMessages([
          {
            id: "msg-lesson-invite",
            senderId: activeChatId,
            senderName: partnerName,
            senderAvatar: partnerAvatar,
            isMe: false,
            text: `Здравствуйте! Запланирован онлайн-урок:`,
            time: "10:00",
            date: "Сегодня",
            type: "lesson_invite",
            lessonData: {
              id: activeChat.lessonId,
              title: activeChat.lessonTitle || "Онлайн-урок",
              time: activeChat.lessonTime || "По расписанию",
              subject: activeChat.lessonSubject || activeChat.roleLabel || "Занятие",
              roomName: `room-${activeChat.lessonId.slice(0, 8)}`,
            },
            read: true,
          },
        ]);
      } else {
        setMessages([]);
      }
    }

    // Загрузка сообщений из серверной БД
    fetchWithAuth(`/api/messages?chatId=${channelName}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.messages && Array.isArray(data.messages) && data.messages.length > 0) {
          const mapped: TelegramMessage[] = data.messages.map((m: any) => ({
            id: m.id,
            senderId: m.senderId,
            senderName: m.senderName,
            senderAvatar: m.senderAvatar,
            isMe: m.senderId === currentUser.id,
            text: m.text,
            time: m.time || "Недавно",
            date: m.date || "Сегодня",
            type: m.type || "text",
            fileUrl: m.fileUrl,
            fileName: m.fileName,
            fileSize: m.fileSize,
            read: true,
          }));
          setMessages(mapped);
        }
      })
      .catch(() => {});
  }, [activeChatId, getNormalizedRoomId, currentUser.id, activeChat]);

  // Автопрокрутка
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Сохранение сообщений
  const saveMessages = useCallback(
    (newMsgs: TelegramMessage[]) => {
      setMessages(newMsgs);
      if (activeChatId) {
        const channelName = getNormalizedRoomId(activeChatId);
        try {
          localStorage.setItem(`ayda_tg_msgs_${channelName}`, JSON.stringify(newMsgs));
        } catch (e) {}
      }
    },
    [activeChatId, getNormalizedRoomId]
  );

  // Отправка текстового сообщения
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = inputText.trim();
    if (!clean || !activeChatId) return;

    const timeStr = formatTolyatti(nowInTolyatti(), "HH:mm");
    const channelName = getNormalizedRoomId(activeChatId);

    const newMsg: TelegramMessage = {
      id: `msg-${Date.now()}`,
      senderId: currentUser.id || "me",
      senderName: currentUser.name || "Я",
      senderAvatar: currentUser.avatar || (currentRole === "STUDENT" ? SHARONOV_AVATAR : TEACHER_VASILINA_AVATAR),
      isMe: true,
      text: clean,
      time: timeStr,
      date: "Сегодня",
      read: true,
    };

    const updated = [...messages, newMsg];
    saveMessages(updated);
    setInputText("");
    setShowMentions(false);

    // AI Ассистент авто-ответ
    if (activeChatId === "chat-ai-assistant") {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        const replyTime = formatTolyatti(nowInTolyatti(), "HH:mm");
        const aiMsg: TelegramMessage = {
          id: `ai-reply-${Date.now()}`,
          senderId: "chat-ai-assistant",
          senderName: "Ассистент «Умничка AI»",
          senderAvatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&h=150&fit=crop",
          isMe: false,
          text: "Спасибо за вопрос! Запрос принят. Могу подсказать пошаговый алгоритм решения или пояснить нужное правило.",
          time: replyTime,
          date: "Сегодня",
          read: true,
        };
        const withAi = [...updated, aiMsg];
        saveMessages(withAi);
      }, 1000);
    }

    // Сохранение в API
    try {
      await fetchWithAuth("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: channelName,
          senderId: currentUser.id,
          senderName: currentUser.name,
          senderAvatar: currentUser.avatar,
          text: clean,
          type: "text",
        }),
      });
    } catch (e) {}
  };

  // Загрузка файла
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChatId) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.url) {
        alert(data.error || "Ошибка загрузки файла.");
        return;
      }

      const timeStr = formatTolyatti(nowInTolyatti(), "HH:mm");
      const fileMsg: TelegramMessage = {
        id: `msg-${Date.now()}`,
        senderId: currentUser.id || "me",
        senderName: currentUser.name || "Я",
        senderAvatar: currentUser.avatar,
        isMe: true,
        text: `Прикреплён файл: ${data.fileName || file.name}`,
        time: timeStr,
        date: "Сегодня",
        type: "file",
        fileName: data.fileName || file.name,
        fileSize: data.fileSize || "Документ",
        fileUrl: data.url,
        read: true,
      };

      const updated = [...messages, fileMsg];
      saveMessages(updated);
    } catch (err: any) {
      alert("Не удалось прикрепить файл: " + (err?.message || "Ошибка сети"));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Выход
  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    await performLogout();
  };

  // Фильтрация чатов по строке поиска
  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return chats;
    const q = searchQuery.toLowerCase();
    return chats.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.roleLabel.toLowerCase().includes(q) ||
        c.lastMessage.toLowerCase().includes(q)
    );
  }, [chats, searchQuery]);

  const activeSectionObj = extraCabinetSections.find((s) => s.key === activeScreen);

  return (
    <div className="flex h-[100dvh] w-full bg-[#eef1f5] p-0 md:p-3 select-none relative font-sans text-slate-800 antialiased overflow-hidden">
      {/* Главный контейнер приложения */}
      <div className="flex flex-1 w-full h-full bg-white md:rounded-3xl border border-slate-200 shadow-xl overflow-hidden relative">

        {/* =========================================================================
            БОКОВАЯ ПАНЕЛЬ РАЗДЕЛОВ И ЧАТОВ (260px)
           ========================================================================= */}
        <aside
          className={`w-64 bg-[#fafbfc] border-r border-slate-200 flex flex-col shrink-0 h-full select-none z-20 ${
            mobileSidebarOpen ? "fixed inset-0 z-40 bg-white" : "hidden lg:flex"
          }`}
        >
          {/* Шапка рабочего пространства */}
          <div className="p-3.5 border-b border-slate-200/80 flex items-center justify-between gap-2 bg-white/70">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center font-black text-sm shadow-xs shrink-0">
                У
              </div>
              <div className="min-w-0">
                <span className="font-extrabold text-xs text-slate-900 tracking-tight block truncate">
                  АйДаУмничка
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {currentRole === "TEACHER"
                    ? "Кабинет учителя"
                    : currentRole === "STUDENT"
                    ? "Кабинет ученика"
                    : currentRole === "PARENT"
                    ? "Кабинет родителя"
                    : "Администратор"}
                </span>
              </div>
            </div>

            {mobileSidebarOpen && (
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition lg:hidden"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Поисковая строка платформы: поиск учителей, учеников и диалогов */}
          <div className="px-2.5 py-2 border-b border-slate-200/80 bg-slate-50/70">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск учителей, учеников (@ник)..."
                className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-white hover:bg-white focus:bg-white border border-slate-200 focus:border-[#2481cc] text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Основные рабочие разделы кабинета */}
          <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
            {searchQuery.trim() ? (
              /* РЕЖИМ ПОИСКА: ДИАЛОГИ И ПОЛЬЗОВАТЕЛИ ПЛАТФОРМЫ */
              <div className="space-y-4">
                {/* 1. Найденные существующие диалоги */}
                {filteredChats.length > 0 && (
                  <div className="space-y-0.5">
                    <div className="px-2 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                      <span>Диалоги</span>
                      <span className="text-slate-500">{filteredChats.length}</span>
                    </div>
                    {filteredChats.map((chat) => {
                      const isChatActive = activeScreen === "chat" && activeChatId === chat.id;
                      return (
                        <button
                          key={chat.id}
                          type="button"
                          onClick={() => {
                            setActiveScreen("chat");
                            setActiveChatId(chat.id);
                            setMobileSidebarOpen(false);
                          }}
                          className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-xs transition cursor-pointer text-left ${
                            isChatActive
                              ? "bg-slate-200/90 text-slate-900 font-bold"
                              : "text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <div className="relative shrink-0">
                            <img
                              src={chat.avatar}
                              alt={chat.name}
                              className="w-8 h-8 rounded-full object-cover border border-slate-200"
                            />
                            {chat.online && (
                              <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 rounded-full border border-white" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold truncate text-slate-900 text-xs">
                                {chat.name}
                              </span>
                              <span className="text-[10px] text-slate-400 shrink-0">
                                {chat.lastMessageTime}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
                              {chat.lastMessage}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* 2. Глобальный поиск учителей и учеников по всей школе */}
                <div className="space-y-1 pt-1">
                  <div className="px-2 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>Пользователи платформы</span>
                    {isSearchingGlobal ? (
                      <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                    ) : (
                      <span className="text-slate-500">{globalSearchResults.length}</span>
                    )}
                  </div>

                  {isSearchingGlobal ? (
                    <div className="p-3 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                      <span>Поиск в базе АйДаУмничка...</span>
                    </div>
                  ) : globalSearchResults.length === 0 && filteredChats.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 text-xs space-y-1">
                      <Users className="w-6 h-6 mx-auto text-slate-300 stroke-[1.5]" />
                      <p className="font-semibold text-slate-600">Никого не найдено</p>
                      <p className="text-[10px] text-slate-400">
                        Попробуйте ввести имя (@ник) или предмет
                      </p>
                    </div>
                  ) : (
                    globalSearchResults.map((user) => {
                      const isFriend = addedFriendIds.includes(user.id);
                      return (
                        <div
                          key={user.id}
                          onClick={() => handleOpenChatWithUser(user)}
                          className="w-full flex items-center justify-between gap-2 p-2 rounded-xl text-xs hover:bg-blue-50/50 transition cursor-pointer group border border-transparent hover:border-blue-100"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="relative shrink-0">
                              <img
                                src={user.avatarUrl}
                                alt={user.name}
                                className="w-8 h-8 rounded-full object-cover border border-slate-200"
                              />
                              <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 rounded-full border border-white" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900 text-xs truncate">
                                  {user.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px]">
                                <span
                                  className={`px-1.5 py-0.2 rounded font-bold ${
                                    user.role === "TEACHER"
                                      ? "bg-amber-100 text-amber-800"
                                      : user.role === "STUDENT"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-slate-100 text-slate-700"
                                  }`}
                                >
                                  {user.role === "TEACHER"
                                    ? "Учитель"
                                    : user.role === "STUDENT"
                                    ? "Ученик"
                                    : user.role === "PARENT"
                                    ? "Родитель"
                                    : "Админ"}
                                </span>
                                {user.username && (
                                  <span className="font-mono text-slate-400 truncate">
                                    @{user.username}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Кнопка добавить в друзья / написать */}
                          <button
                            type="button"
                            title={isFriend ? "Уже в контактах" : "Добавить в контакты"}
                            onClick={(e) => handleToggleFriend(user, e)}
                            className={`p-1.5 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer ${
                              isFriend
                                ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                                : "bg-blue-50 text-[#2481cc] hover:bg-[#2481cc] hover:text-white"
                            }`}
                          >
                            {isFriend ? (
                              <Check className="w-3.5 h-3.5" />
                            ) : (
                              <UserPlus className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              /* ОБЫЧНЫЙ РЕЖИМ: РАЗДЕЛЫ И СООБЩЕНИЯ */
              <>
                <div className="space-y-0.5">
                  <div className="px-2 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Разделы
                  </div>
                  {extraCabinetSections.map((sec) => {
                    const Icon = sec.icon;
                    const isSel = activeScreen === sec.key;
                    return (
                      <button
                        key={sec.key}
                        type="button"
                        onClick={() => {
                          setActiveScreen(sec.key);
                          setMobileSidebarOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                          isSel
                            ? "bg-blue-50 text-blue-700 font-bold shadow-2xs"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon className="w-4 h-4 shrink-0" />
                          <span className="truncate">{sec.title}</span>
                        </div>
                        {sec.badge !== undefined && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 shrink-0">
                            {sec.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Сообщения и диалоги */}
                <div className="space-y-0.5 pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between px-2 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    <span>Сообщения</span>
                    <span className="text-slate-500">{filteredChats.length}</span>
                  </div>

                  {filteredChats.map((chat) => {
                    const isChatActive = activeScreen === "chat" && activeChatId === chat.id;
                    return (
                      <button
                        key={chat.id}
                        type="button"
                        onClick={() => {
                          setActiveScreen("chat");
                          setActiveChatId(chat.id);
                          setMobileSidebarOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-xs transition cursor-pointer text-left ${
                          isChatActive
                            ? "bg-slate-200/90 text-slate-900 font-bold"
                            : "text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <div className="relative shrink-0">
                          <img
                            src={chat.avatar}
                            alt={chat.name}
                            className="w-8 h-8 rounded-full object-cover border border-slate-200"
                          />
                          {chat.online && (
                            <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 rounded-full border border-white" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold truncate text-slate-900 text-xs">
                              {chat.name}
                            </span>
                            <span className="text-[10px] text-slate-400 shrink-0">
                              {chat.lastMessageTime}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {chat.lastMessage}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </aside>

        {/* =========================================================================
            ГЛАВНЫЙ ЭКРАН (РАСПИСАНИЕ / УЧЕНИКИ / ДОМАШКА / ЧАТ)
           ========================================================================= */}
        <main className="flex-1 flex flex-col h-full bg-white overflow-hidden min-w-0 relative">
          {/* Верхняя шапка */}
          <header className="h-14 border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shrink-0 bg-white">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 text-xs text-slate-600 font-semibold truncate">
                <span className="text-slate-900 font-extrabold text-sm sm:text-base">
                  {activeScreen === "chat" ? activeChat?.name : activeSectionObj?.title || "Раздел"}
                </span>
                {activeScreen === "chat" && activeChat?.roleLabel && (
                  <span className="hidden sm:inline px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600">
                    {activeChat.roleLabel}
                  </span>
                )}
              </div>
            </div>

            {/* Действия в шапке (включая аккаунт и выход правее) */}
            <div className="flex items-center gap-2 sm:gap-3">
              {activeScreen === "chat" && activeChat?.lessonId && (
                <Link
                  href={`/room/${activeChat.lessonId}`}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Войти на урок</span>
                </Link>
              )}

              {activeScreen === "chat" && (
                <button
                  type="button"
                  onClick={() => setInspectorOpen(!inspectorOpen)}
                  className={`p-2 rounded-xl transition cursor-pointer ${
                    inspectorOpen
                      ? "bg-slate-100 text-slate-900 font-bold"
                      : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                  }`}
                  title="Информация о собеседнике"
                >
                  <InfoIcon className="w-4 h-4" />
                </button>
              )}

              {/* Разделитель */}
              <div className="h-6 w-[1px] bg-slate-200 hidden sm:block" />

              {/* Аккаунт пользователя (клик открывает редактирование профиля) */}
              <button
                type="button"
                onClick={() => setEditProfileOpen(true)}
                className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-xl hover:bg-slate-100 transition cursor-pointer border border-transparent hover:border-slate-200"
                title="Настройки профиля"
              >
                <div className="relative shrink-0">
                  <img
                    src={currentUser.avatar || (currentRole === "STUDENT" ? SHARONOV_AVATAR : TEACHER_VASILINA_AVATAR)}
                    alt={currentUser.name}
                    className="w-8 h-8 rounded-full object-cover border border-slate-200"
                  />
                  <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 rounded-full border border-white" />
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[140px]">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium leading-none">
                    {currentRole === "TEACHER" ? "Преподаватель" : currentRole === "STUDENT" ? "Ученик" : "Родитель"}
                  </div>
                </div>
              </button>

              {/* Кнопка выхода */}
              <button
                type="button"
                onClick={handleLogout}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                title="Выйти из системы"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* КОНТЕНТ: если выбран ЧАТ */}
          {activeScreen === "chat" ? (
            <div className="flex-1 flex flex-col h-[calc(100%-56px)] overflow-hidden">
              {/* Лента реальных сообщений */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 space-y-2">
                    <MessageSquare className="w-8 h-8 text-slate-300" />
                    <p className="text-xs">В этом диалоге пока нет сообщений. Напишите первое!</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex items-start gap-3 max-w-2xl ${
                        msg.isMe ? "ml-auto flex-row-reverse" : ""
                      }`}
                    >
                      <img
                        src={
                          msg.senderAvatar ||
                          (msg.isMe
                            ? currentUser.avatar || SHARONOV_AVATAR
                            : activeChat?.avatar || TEACHER_VASILINA_AVATAR)
                        }
                        alt={msg.senderName}
                        className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-100 shadow-2xs mt-1"
                      />

                      <div className={`space-y-1 ${msg.isMe ? "items-end text-right" : ""}`}>
                        <div className="flex items-baseline gap-2">
                          <span className="font-bold text-xs text-slate-900">
                            {msg.senderName}
                          </span>
                          <span className="text-[10px] text-slate-400">{msg.time}</span>
                        </div>

                        {/* Текст реплики */}
                        <div
                          className={`text-xs sm:text-sm p-3 rounded-2xl break-words leading-relaxed ${
                            msg.isMe
                              ? "bg-blue-600 text-white rounded-tr-xs shadow-xs"
                              : "bg-slate-100 text-slate-800 rounded-tl-xs"
                          }`}
                        >
                          {msg.text}
                        </div>

                        {/* Карточка онлайн-урока */}
                        {msg.type === "lesson_invite" && msg.lessonData && (
                          <div className="bg-white rounded-2xl border border-blue-200 p-3 shadow-xs flex items-center justify-between gap-3 text-left mt-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                                <Video className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <h5 className="font-bold text-xs text-slate-900 truncate">
                                  {msg.lessonData.title}
                                </h5>
                                <div className="text-[11px] text-slate-500">
                                  {msg.lessonData.time}
                                </div>
                              </div>
                            </div>

                            <Link
                              href={`/room/${msg.lessonData.roomName || msg.lessonData.id}`}
                              target="_blank"
                              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition shrink-0"
                            >
                              Войти
                            </Link>
                          </div>
                        )}

                        {/* Прикрепленный файл */}
                        {msg.type === "file" && msg.fileUrl && (
                          <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-left mt-1">
                            <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                            <div className="min-w-0">
                              <div className="font-bold text-slate-800 truncate">
                                {msg.fileName || "Файл"}
                              </div>
                              <div className="text-[10px] text-slate-400">{msg.fileSize}</div>
                            </div>
                            <a
                              href={msg.fileUrl}
                              download
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded-lg hover:bg-slate-200 text-slate-600"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                {isTyping && (
                  <div className="flex items-center gap-2 text-xs text-slate-400 italic">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                    <span>Собеседник печатает...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Поле ввода */}
              <div className="p-3 bg-white border-t border-slate-200">
                <form
                  onSubmit={handleSendMessage}
                  className="rounded-2xl border border-slate-200 bg-white p-2.5 shadow-2xs focus-within:border-blue-500 transition space-y-2 relative"
                >
                  <textarea
                    ref={chatInputRef}
                    rows={2}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Напишите сообщение..."
                    className="w-full text-xs sm:text-sm text-slate-800 placeholder-slate-400 outline-none resize-none bg-transparent"
                  />

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                        title="Прикрепить файл"
                      >
                        <Paperclip className="w-4 h-4" />
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileUpload}
                        className="hidden"
                      />

                      <button
                        type="button"
                        onClick={() => {
                          setInputText((prev) => prev + "👍 ");
                          chatInputRef.current?.focus();
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-50 transition cursor-pointer"
                        title="Эмодзи"
                      >
                        <Smile className="w-4 h-4" />
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={!inputText.trim() || isUploading}
                      className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
                    >
                      <span>Отправить</span>
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            /* КОНТЕНТ: Выбранный раздел кабинета (Расписание, Ученики, Домашка) */
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#f8fafc]">
              <div className="max-w-6xl mx-auto">
                {activeSectionObj?.render()}
              </div>
            </div>
          )}
        </main>

        {/* =========================================================================
            КОЛОНКА 3: ИНСПЕКТОР (ПОКАЗЫВАЕТСЯ ТОЛЬКО ПО КЛИКУ НА (i) В ЧАТЕ)
           ========================================================================= */}
        {inspectorOpen && activeScreen === "chat" && (
          <aside className="w-72 bg-white border-l border-slate-200 flex flex-col shrink-0 h-full select-none z-20">
            <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <span className="font-extrabold text-xs text-slate-800">Информация</span>
              <button
                type="button"
                onClick={() => setInspectorOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="text-center space-y-2">
                <img
                  src={activeChat?.avatar}
                  alt={activeChat?.name}
                  className="w-16 h-16 rounded-full object-cover mx-auto border-2 border-slate-100 shadow-sm"
                />
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{activeChat?.name}</h4>
                  <p className="text-slate-500 text-xs">{activeChat?.roleLabel}</p>
                </div>
              </div>

              {activeChat?.lessonId && (
                <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 space-y-1.5">
                  <span className="font-bold text-blue-900 block">Назначенный урок:</span>
                  <p className="text-slate-700 font-medium">{activeChat.lessonTitle}</p>
                  <p className="text-slate-500">{activeChat.lessonTime}</p>
                  <Link
                    href={`/room/${activeChat.lessonId}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 font-bold text-blue-600 hover:underline pt-1"
                  >
                    <span>Перейти в видеокомнату</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

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
            avatarUrl: currentUser.avatar || (currentRole === "STUDENT" ? SHARONOV_AVATAR : undefined),
            grade: currentUser.grade || (currentRole === "STUDENT" ? "Дошкольник" : undefined),
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
            if (onProfileUpdated) onProfileUpdated(upd);
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
              if (onProfileUpdated) onProfileUpdated(upd);
            }
            setEditProfileOpen(false);
          }}
        />
      )}
    </div>
  );
}
