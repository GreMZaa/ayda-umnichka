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
  type?: "text" | "voice" | "file" | "lesson_invite" | "homework_card";
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
  // "chat" (Conceptzilla hub) или ключ из extraCabinetSections (e.g. "schedule", "students", "children", "homework")
  const [activeScreen, setActiveScreen] = useState<string>("chat");
  const [editProfileOpen, setEditProfileOpen] = useState<boolean>(false);

  // Inspector / Right contextual sidebar
  const [inspectorOpen, setInspectorOpen] = useState<boolean>(true);
  const [inspectorTab, setInspectorTab] = useState<"info" | "pins" | "files" | "links">("info");

  // Умный поиск по каналам, чатам и темам
  const [searchQuery, setSearchQuery] = useState("");
  const [activeChatId, setActiveChatId] = useState<string>("channel-math");

  // Мобильное меню
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Меню упоминаний (@) и эмодзи
  const [showMentions, setShowMentions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Сообщения
  const [messages, setMessages] = useState<TelegramMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Реакции на сообщения (messageId -> { emoji: count })
  const [messageReactions, setMessageReactions] = useState<{ [msgId: string]: { [emoji: string]: number } }>({
    "msg-welcome": { "👍": 2, "❤️": 1 },
    "msg-lesson-invite": { "🚀": 3, "👍": 2 },
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Построение каналов и чатов (в концепции Conceptzilla)
  const buildChats = useCallback((): TelegramChat[] => {
    const list: TelegramChat[] = [];

    // Ассистент Умничка AI
    list.push({
      id: "chat-ai-assistant",
      name: "Ассистент «Умничка AI»",
      role: "assistant",
      roleLabel: "Умный помощник по урокам",
      avatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&h=150&fit=crop",
      online: true,
      statusText: "онлайн 24/7",
      lastMessage: "Привет! Я могу разобрать задачу по математике, проверить правило или объяснить тему.",
      lastMessageTime: "Сейчас",
      unreadCount: 0,
    });

    // Основной учебный канал по предмету (Conceptzilla Channel)
    list.push({
      id: "channel-math",
      name: "Математика и логика • 3 класс",
      role: "teacher",
      roleLabel: "Основной канал • v3.0",
      avatar: TEACHER_VASILINA_AVATAR,
      online: true,
      statusText: "в сети",
      lastMessage: "Готовимся к разбору темы «Обыкновенные дроби и доли». Прикрепила материалы.",
      lastMessageTime: "12:40",
      unreadCount: 4,
      lessonId: "c9a16950-2e61-4c9a-9dca-493c8b5ccb2f",
      lessonTitle: "Математика: Обыкновенные дроби и доли",
      lessonTime: "Сегодня в 16:00 (Тольятти)",
      lessonSubject: "Математика",
    });

    // Диалоги на основе уроков
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
            lastMessage: l.title ? `Запланирован урок: «${l.title}»` : "Здравствуйте! Жду вас на уроке.",
            lastMessageTime: l.startTime ? formatTolyatti(l.startTime, "d MMM, HH:mm") : "Недавно",
            unreadCount: 1,
            lessonId: l.id,
            lessonTitle: l.title,
            lessonTime: l.startTime ? formatTolyatti(l.startTime, "d MMMM (EE) в HH:mm") : undefined,
            lessonSubject: l.subjectName || "Занятие",
          });
        }
      });
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
              lastMessage: l.title ? `Заказ на урок: «${l.title}»` : "Диалог открыт",
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
              lastMessage: "Ученик добавлен в друзья.",
              lastMessageTime: "Сегодня",
              unreadCount: 0,
            });
          }
        });
      }
    }

    // Служба заботы и поддержки
    list.push({
      id: "chat-support",
      name: "Служба заботы «АйДаУмничка»",
      role: "support",
      roleLabel: "Поддержка 24/7",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=faces",
      online: true,
      statusText: "онлайн",
      lastMessage: "Здравствуйте! Мы на связи, если у вас возникнут любые вопросы по урокам или платформе.",
      lastMessageTime: "Сегодня",
      unreadCount: 0,
    });

    return list;
  }, [lessons, currentRole, friendTeachers, friendStudents, currentUser]);

  const [chats, setChats] = useState<TelegramChat[]>(() => buildChats());

  useEffect(() => {
    setChats(buildChats());
  }, [buildChats]);

  // Нормализованный ключ комнаты Realtime
  const getNormalizedRoomId = useCallback(
    (chatId: string) => {
      if (chatId === "chat-support") return `tg_support_${currentUser.id || "guest"}`;
      if (chatId === "chat-ai-assistant") return `tg_ai_${currentUser.id || "guest"}`;
      if (chatId.startsWith("channel-")) return `tg_${chatId}`;
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
            text: `Привет, ${currentUser?.name?.split(" ")[0] || "друг"}! 👋 Я твой умный помощник по учебе. Спроси меня о чем угодно: помогу решить сложную задачу, объясню правило русского языка или составлю план подготовки к уроку.`,
            time: "10:00",
            date: "Сегодня",
            read: true,
          },
        ]);
      } else if (activeChatId === "channel-math") {
        setMessages([
          {
            id: "msg-channel-1",
            senderId: "vasilina-sharonova",
            senderName: "Василина Владимировна",
            senderAvatar: TEACHER_VASILINA_AVATAR,
            isMe: false,
            text: "Всем привет! Мы начинаем новый модуль «Обыкновенные дроби и логика». Обязательно посмотрите интерактивный урок и подготовьте тетради к 16:00. @Ученик @Родитель",
            time: "10:15",
            date: "Сегодня",
            read: true,
          },
          {
            id: "msg-channel-lesson",
            senderId: "vasilina-sharonova",
            senderName: "Василина Владимировна",
            senderAvatar: TEACHER_VASILINA_AVATAR,
            isMe: false,
            text: "Интерактивная комната урока готова. Подключайтесь по кнопке ниже:",
            time: "10:16",
            date: "Сегодня",
            type: "lesson_invite",
            lessonData: {
              id: "c9a16950-2e61-4c9a-9dca-493c8b5ccb2f",
              title: "Математика: Обыкновенные дроби и доли (v3.0)",
              time: "Сегодня в 16:00 (Тольятти)",
              subject: "Математика и логика",
              roomName: "room-math-fractions",
            },
            read: true,
          },
          {
            id: "msg-channel-2",
            senderId: "student-sharonov",
            senderName: "Сергей Шаронов",
            senderAvatar: SHARONOV_AVATAR,
            isMe: currentRole === "STUDENT",
            text: "Здравствуйте! Домашнюю работу №3 уже решил, прикрепил фото решения в тетради.",
            time: "11:30",
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
            text: `Здравствуйте! Вам назначен онлайн-урок в «АйДаУмничка»:`,
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
  }, [activeChatId, getNormalizedRoomId, currentUser.id, currentRole]);

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

    // Обновляем превью в чатах
    setChats((prev) =>
      prev.map((c) =>
        c.id === activeChatId
          ? { ...c, lastMessage: clean, lastMessageTime: timeStr, unreadCount: 0 }
          : c
      )
    );

    // AI Ассистент авто-ответ
    if (activeChatId === "chat-ai-assistant") {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        const aiReplies = [
          "Отличный вопрос! Чтобы сложить две дроби с одинаковыми знаменателями, складываем их числители, а знаменатель оставляем прежним. Например: 1/4 + 2/4 = 3/4.",
          "Замечательно сформулировано! В русском языке в приставках на -з / -с перед звонкими согласными пишется 'з', а перед глухими — 'с'. Например: разбег, но распил.",
          "Принято! Я добавил эту тему в список повторения перед следующим уроком с преподавателем.",
        ];
        const randomReply = aiReplies[Math.floor(Math.random() * aiReplies.length)];
        const replyTime = formatTolyatti(nowInTolyatti(), "HH:mm");

        const aiMsg: TelegramMessage = {
          id: `ai-reply-${Date.now()}`,
          senderId: "chat-ai-assistant",
          senderName: "Ассистент «Умничка AI»",
          senderAvatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&h=150&fit=crop",
          isMe: false,
          text: randomReply,
          time: replyTime,
          date: "Сегодня",
          read: true,
        };
        const withAi = [...updated, aiMsg];
        saveMessages(withAi);
      }, 1100);
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

  // Переключение реакции
  const toggleReaction = (msgId: string, emoji: string) => {
    setMessageReactions((prev) => {
      const msgReactions = { ...(prev[msgId] || {}) };
      const current = msgReactions[emoji] || 0;
      if (current > 0) {
        msgReactions[emoji] = current + 1;
      } else {
        msgReactions[emoji] = 1;
      }
      return { ...prev, [msgId]: msgReactions };
    });
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
        text: `Прикреплён учебный файл: ${data.fileName || file.name}`,
        time: timeStr,
        date: "Сегодня",
        type: "file",
        fileName: data.fileName || file.name,
        fileSize: data.fileSize || "1.2 MB",
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

  // Список участников для автокомплита (@)
  const mentionCandidates = [
    { name: "Василина Владимировна", role: "Преподаватель", avatar: TEACHER_VASILINA_AVATAR },
    { name: "Сергей Шаронов", role: "Ученик", avatar: SHARONOV_AVATAR },
    { name: "Анна Николаевна", role: "Родитель", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop" },
    { name: "Умничка AI", role: "Ассистент", avatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&h=100&fit=crop" },
  ];

  return (
    <div className="flex h-[100dvh] w-full bg-[#eef1f5] p-0 md:p-3 select-none relative font-sans text-slate-800 antialiased overflow-hidden">
      {/* Главный контейнер приложения в стиле Conceptzilla / Mac OS window */}
      <div className="flex flex-1 w-full h-full bg-white md:rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden relative">

        {/* =========================================================================
            КОЛОНКА 0: УЗКИЙ ЛЕГКИЙ ДОК (APP DOCK BAR - 68px)
           ========================================================================= */}
        <aside className="w-[68px] bg-[#111317] flex flex-col items-center py-4 justify-between shrink-0 z-30 border-r border-[#1e222b]">
          <div className="flex flex-col items-center gap-5 w-full">
            {/* Логотип школы / Monogram */}
            <Link
              href="/"
              className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center font-black text-lg shadow-lg shadow-blue-500/30 hover:scale-105 transition"
              title="На главную страницу школы"
            >
              У
            </Link>

            <div className="w-8 h-[1px] bg-white/10" />

            {/* Иконки переключения основных приложений рабочей среды */}
            <div className="flex flex-col items-center gap-2.5 w-full px-2">
              {/* Чат / Хаб */}
              <button
                type="button"
                onClick={() => {
                  setActiveScreen("chat");
                  setMobileSidebarOpen(false);
                }}
                className={`w-11 h-11 rounded-2xl flex items-center justify-center transition relative group ${
                  activeScreen === "chat"
                    ? "bg-white text-slate-900 shadow-md font-bold"
                    : "text-slate-400 hover:text-white hover:bg-white/10"
                }`}
                title="Учебный чат и хаб (Conceptzilla Workspace)"
              >
                <MessageSquare className="w-5 h-5" />
                {activeScreen === "chat" && (
                  <span className="absolute -left-2 top-3 bottom-3 w-1 bg-blue-500 rounded-r-full" />
                )}
                {/* Тултип */}
                <span className="absolute left-14 bg-slate-900 text-white text-xs px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition whitespace-nowrap z-50 shadow-lg border border-slate-700">
                  Учебный хаб
                </span>
              </button>

              {/* Расписание / Календарь */}
              <button
                type="button"
                onClick={() => {
                  setActiveScreen("schedule");
                  setMobileSidebarOpen(false);
                }}
                className={`w-11 h-11 rounded-2xl flex items-center justify-center transition relative group ${
                  activeScreen === "schedule"
                    ? "bg-white text-slate-900 shadow-md font-bold"
                    : "text-slate-400 hover:text-white hover:bg-white/10"
                }`}
                title="Расписание занятий"
              >
                <Calendar className="w-5 h-5" />
                {activeScreen === "schedule" && (
                  <span className="absolute -left-2 top-3 bottom-3 w-1 bg-blue-500 rounded-r-full" />
                )}
                <span className="absolute left-14 bg-slate-900 text-white text-xs px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition whitespace-nowrap z-50 shadow-lg border border-slate-700">
                  Расписание
                </span>
              </button>

              {/* Ученики / CRM (Alloy view) */}
              {(currentRole === "TEACHER" || currentRole === "ADMIN" || currentRole === "PARENT") && (
                <button
                  type="button"
                  onClick={() => {
                    const target = currentRole === "PARENT" ? "children" : "students";
                    setActiveScreen(target);
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center transition relative group ${
                    activeScreen === "students" || activeScreen === "children"
                      ? "bg-white text-slate-900 shadow-md font-bold"
                      : "text-slate-400 hover:text-white hover:bg-white/10"
                  }`}
                  title={currentRole === "PARENT" ? "Мои дети" : "Ученики и CRM (Alloy dossier)"}
                >
                  <Users className="w-5 h-5" />
                  {(activeScreen === "students" || activeScreen === "children") && (
                    <span className="absolute -left-2 top-3 bottom-3 w-1 bg-blue-500 rounded-r-full" />
                  )}
                  <span className="absolute left-14 bg-slate-900 text-white text-xs px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition whitespace-nowrap z-50 shadow-lg border border-slate-700">
                    {currentRole === "PARENT" ? "Дети" : "Досье учеников"}
                  </span>
                </button>
              )}

              {/* Домашние задания */}
              <button
                type="button"
                onClick={() => {
                  setActiveScreen("homework");
                  setMobileSidebarOpen(false);
                }}
                className={`w-11 h-11 rounded-2xl flex items-center justify-center transition relative group ${
                  activeScreen === "homework"
                    ? "bg-white text-slate-900 shadow-md font-bold"
                    : "text-slate-400 hover:text-white hover:bg-white/10"
                }`}
                title="Домашние задания"
              >
                <CheckSquare className="w-5 h-5" />
                {activeScreen === "homework" && (
                  <span className="absolute -left-2 top-3 bottom-3 w-1 bg-blue-500 rounded-r-full" />
                )}
                <span className="absolute left-14 bg-slate-900 text-white text-xs px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition whitespace-nowrap z-50 shadow-lg border border-slate-700">
                  Домашние задания
                </span>
              </button>

              {/* Быстрое действие (+) */}
              <button
                type="button"
                onClick={() => {
                  const ev = new CustomEvent("ayda:open-create-lesson");
                  window.dispatchEvent(ev);
                }}
                className="w-11 h-11 rounded-2xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer mt-2"
                title="Назначить новый урок"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Низ левого дока: Профиль и Выход */}
          <div className="flex flex-col items-center gap-3 w-full">
            <button
              type="button"
              onClick={() => setEditProfileOpen(true)}
              className="relative group cursor-pointer"
              title="Настройки профиля"
            >
              <div className="w-10 h-10 rounded-full border-2 border-slate-700 overflow-hidden group-hover:border-blue-400 transition">
                <img
                  src={
                    currentUser.avatar ||
                    (currentRole === "STUDENT" ? SHARONOV_AVATAR : TEACHER_VASILINA_AVATAR)
                  }
                  alt={currentUser.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#111317] rounded-full" />
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="p-2.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-white/5 transition cursor-pointer"
              title="Выйти из аккаунта"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </aside>

        {/* =========================================================================
            КОЛОНКА 1: ДЕРЕВО ПРЕДМЕТОВ, КАНАЛОВ И НАВИГАЦИИ (SIDEBAR - 270px)
           ========================================================================= */}
        <aside
          className={`w-72 bg-[#fafbfc] border-r border-slate-200/80 flex flex-col shrink-0 h-full select-none z-20 ${
            mobileSidebarOpen ? "fixed inset-0 z-40 bg-white" : "hidden lg:flex"
          }`}
        >
          {/* Шапка рабочего пространства (Conceptzilla header) */}
          <div className="p-4 border-b border-slate-200/70 flex items-center justify-between gap-2 bg-white/50">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-extrabold text-sm text-slate-900 tracking-tight truncate">
                АйДаУмничка
              </span>
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 cursor-pointer" />
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => chatInputRef.current?.focus()}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                title="Поиск"
              >
                <Search className="w-4 h-4" />
              </button>
              {mobileSidebarOpen && (
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition lg:hidden"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Быстрая строка поиска */}
          <div className="px-3 py-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по урокам..."
                className="w-full bg-slate-100/80 border border-transparent focus:border-slate-300 focus:bg-white rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 outline-none transition"
              />
            </div>
          </div>

          {/* Основные разделы навигации */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
            {/* Ассистент Умничка AI (NEW badge) */}
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  setActiveScreen("chat");
                  setActiveChatId("chat-ai-assistant");
                  setMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeChatId === "chat-ai-assistant" && activeScreen === "chat"
                    ? "bg-purple-100 text-purple-900 font-bold"
                    : "text-purple-700 hover:bg-purple-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span>Ассистент Умничка</span>
                </div>
                <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-purple-200/80 text-purple-800">
                  NEW
                </span>
              </button>

              {/* Разделы рабочего стола */}
              <button
                type="button"
                onClick={() => {
                  setActiveScreen("chat");
                  setActiveChatId("channel-math");
                  setMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                  activeChatId === "channel-math" && activeScreen === "chat"
                    ? "bg-slate-200/80 text-slate-900 font-bold"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Folder className="w-3.5 h-3.5 text-slate-400" />
                <span>Черновики и заметки</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveScreen("chat");
                  setActiveChatId("channel-math");
                  setMobileSidebarOpen(false);
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Inbox className="w-3.5 h-3.5 text-slate-400" />
                  <span>Входящие</span>
                </div>
                <span className="text-[11px] font-bold text-slate-500 bg-slate-200 px-1.5 rounded-full">
                  8
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveScreen("chat");
                  setActiveChatId("chat-support");
                  setMobileSidebarOpen(false);
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                  <span>Личные сообщения</span>
                </div>
                <span className="text-[11px] font-bold text-blue-600 bg-blue-100 px-1.5 rounded-full">
                  1
                </span>
              </button>
            </div>

            {/* Секция: Избранное (Favorites) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between px-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Избранное</span>
                <ChevronDown className="w-3 h-3" />
              </div>

              <button
                type="button"
                onClick={() => {
                  setActiveScreen("chat");
                  setActiveChatId(chats.find((c) => c.role === "teacher")?.id || "channel-math");
                  setMobileSidebarOpen(false);
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <img
                    src={TEACHER_VASILINA_AVATAR}
                    alt="Василина Владимировна"
                    className="w-4 h-4 rounded-full object-cover"
                  />
                  <span className="truncate">Василина Владимировна</span>
                </div>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">
                  2
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveScreen("chat");
                  setActiveChatId("channel-math");
                  setMobileSidebarOpen(false);
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Hash className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate">Математика 3 класс</span>
                </div>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">
                  4
                </span>
              </button>
            </div>

            {/* Секция: Каналы предметов (Channels) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between px-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Каналы предметов</span>
                <Plus className="w-3.5 h-3.5 cursor-pointer hover:text-slate-600" />
              </div>

              <div className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setActiveScreen("chat");
                    setActiveChatId("channel-math");
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs transition cursor-pointer ${
                    activeChatId === "channel-math" && activeScreen === "chat"
                      ? "bg-slate-200/80 text-slate-900 font-bold"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Hash className="w-3.5 h-3.5 text-slate-400" />
                  <span>Общий чат класса</span>
                </button>

                {/* Вложенная структура по предмету (как в Conceptzilla) */}
                <div className="pl-3 border-l border-slate-200 space-y-1 ml-3 mt-1">
                  <div className="text-[11px] font-bold text-slate-500 py-0.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <span>Математика • v3.0</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveScreen("chat");
                      setActiveChatId("channel-math");
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-2 py-1 rounded-lg text-xs transition cursor-pointer ${
                      activeChatId === "channel-math" && activeScreen === "chat"
                        ? "bg-slate-200 font-bold text-slate-900"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <span className="text-slate-400">↳</span>
                    <span className="truncate">Урок: Обыкновенные дроби</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveScreen("homework");
                      setMobileSidebarOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1 rounded-lg text-xs text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  >
                    <span className="text-slate-400">↳</span>
                    <span>Домашние задания</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setActiveScreen("chat");
                    setActiveChatId("channel-math");
                    setMobileSidebarOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  <Hash className="w-3.5 h-3.5 text-slate-400" />
                  <span>Русский язык и каллиграфия</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveScreen("chat");
                    setActiveChatId("channel-math");
                    setMobileSidebarOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  <Hash className="w-3.5 h-3.5 text-slate-400" />
                  <span>Английский язык</span>
                </button>
              </div>
            </div>

            {/* Секция: Дополнительные разделы кабинета */}
            {extraCabinetSections.length > 0 && (
              <div className="space-y-1 pt-2 border-t border-slate-200/80">
                <div className="px-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Разделы кабинета
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
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                        isSel
                          ? "bg-blue-50 text-blue-700 font-bold"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5" />
                        <span>{sec.title}</span>
                      </div>
                      {sec.badge !== undefined && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
                          {sec.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        {/* =========================================================================
            КОЛОНКА 2: ЦЕНТРАЛЬНАЯ РАБОЧАЯ ОБЛАСТЬ (CONCEPTZILLA CHAT / WORKSPACE)
           ========================================================================= */}
        <main className="flex-1 flex flex-col h-full bg-white overflow-hidden min-w-0 relative">
          {/* Верхняя панель в стиле Mac OS Window / Conceptzilla */}
          <header className="h-14 border-b border-slate-200/80 px-4 flex items-center justify-between shrink-0 bg-white">
            <div className="flex items-center gap-3 min-w-0">
              {/* Мобильная кнопка меню */}
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Хлебные крошки Conceptzilla */}
              <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium truncate">
                <Hash className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-slate-900 font-bold">
                  {activeScreen === "chat" ? activeChat?.name : extraCabinetSections.find((s) => s.key === activeScreen)?.title || "Раздел"}
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-400 hidden sm:inline">v3.0 / Онлайн-урок</span>
                <Bookmark className="w-3.5 h-3.5 text-slate-400 hover:text-blue-500 cursor-pointer hidden sm:inline" />
              </div>
            </div>

            {/* Правые действия шапки */}
            <div className="flex items-center gap-2">
              {/* Кнопка быстрого входа на видеоурок */}
              <Link
                href={`/room/${activeChat?.lessonId || "room-fractions-3"}`}
                target="_blank"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
              >
                <Video className="w-3.5 h-3.5" />
                <span>Войти на урок</span>
              </Link>

              {/* Кнопка Ассистента */}
              <button
                type="button"
                onClick={() => {
                  setActiveScreen("chat");
                  setActiveChatId("chat-ai-assistant");
                }}
                className="p-2 rounded-xl text-purple-600 hover:bg-purple-50 transition cursor-pointer"
                title="Спросить Умничку AI"
              >
                <Sparkles className="w-4 h-4" />
              </button>

              {/* Переключатель правой контекстной панели (i) */}
              <button
                type="button"
                onClick={() => setInspectorOpen(!inspectorOpen)}
                className={`p-2 rounded-xl transition cursor-pointer ${
                  inspectorOpen
                    ? "bg-slate-100 text-slate-900 font-bold"
                    : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                }`}
                title="Информация об уроке и участниках"
              >
                <InfoIcon className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Контент: если выбран режим чата */}
          {activeScreen === "chat" ? (
            <div className="flex-1 flex flex-col h-[calc(100%-56px)] overflow-hidden">
              {/* Лента сообщений (Conceptzilla Feed) */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6">
                {messages.map((msg) => {
                  const reactions = messageReactions[msg.id] || {};
                  return (
                    <div key={msg.id} className="flex items-start gap-3.5 group max-w-4xl">
                      {/* Аватар автора */}
                      <img
                        src={
                          msg.senderAvatar ||
                          (msg.isMe
                            ? currentUser.avatar || SHARONOV_AVATAR
                            : TEACHER_VASILINA_AVATAR)
                        }
                        alt={msg.senderName}
                        className="w-10 h-10 rounded-2xl object-cover shrink-0 border border-slate-100 shadow-2xs mt-0.5"
                      />

                      <div className="flex-1 space-y-1.5 min-w-0">
                        {/* Имя и время */}
                        <div className="flex items-baseline gap-2">
                          <span className="font-extrabold text-sm text-slate-900">
                            {msg.senderName}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium">
                            {msg.time}
                          </span>
                        </div>

                        {/* Текст сообщения */}
                        <div className="text-sm text-slate-800 leading-relaxed break-words">
                          {msg.text}
                        </div>

                        {/* Интерактивная карточка урока (Conceptzilla Figma-style Card) */}
                        {msg.type === "lesson_invite" && msg.lessonData && (
                          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:border-blue-400 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-2">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
                                <Video className="w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-bold text-sm text-slate-900 truncate">
                                  {msg.lessonData.title}
                                </h4>
                                <div className="text-xs text-slate-500 flex items-center gap-2">
                                  <span>meet.jit.si</span>
                                  <span>•</span>
                                  <span>{msg.lessonData.time}</span>
                                </div>
                              </div>
                            </div>

                            <Link
                              href={`/room/${msg.lessonData.roomName || msg.lessonData.id}`}
                              target="_blank"
                              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                            >
                              <span>Подключиться (Quick view)</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        )}

                        {/* Прикрепленный файл */}
                        {msg.type === "file" && msg.fileUrl && (
                          <div className="inline-flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs mt-2">
                            <FileText className="w-6 h-6 text-blue-600 shrink-0" />
                            <div className="min-w-0">
                              <div className="font-bold text-slate-800 truncate">
                                {msg.fileName || "Учебный файл"}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {msg.fileSize || "1.2 MB"}
                              </div>
                            </div>
                            <a
                              href={msg.fileUrl}
                              download
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 transition"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        )}

                        {/* Эмодзи реакции под сообщением (как в Conceptzilla) */}
                        <div className="flex items-center gap-1.5 pt-1">
                          {Object.entries(reactions).map(([emoji, count]) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => toggleReaction(msg.id, emoji)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-700 transition cursor-pointer border border-slate-200/60"
                            >
                              <span>{emoji}</span>
                              <span className="text-[10px] font-bold text-slate-500">{count}</span>
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => toggleReaction(msg.id, "👍")}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                            title="Поставить реакцию"
                          >
                            <Smile className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Индикатор набора текста */}
                {isTyping && (
                  <div className="flex items-center gap-2 text-xs text-slate-400 italic">
                    <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" />
                    <span>Умничка печатает ответ...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Поле ввода сообщения в стиле Conceptzilla (Floating rounded card) */}
              <div className="p-4 bg-white border-t border-slate-100">
                <form
                  onSubmit={handleSendMessage}
                  className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xs focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition space-y-2 relative"
                >
                  {/* Автокомплит упоминаний @ */}
                  {showMentions && (
                    <div className="absolute -top-36 left-4 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 w-64 z-50 animate-in fade-in slide-in-from-bottom-2">
                      <div className="text-[11px] font-bold text-slate-400 uppercase px-2 py-1">
                        Участники
                      </div>
                      {mentionCandidates.map((c) => (
                        <div
                          key={c.name}
                          onClick={() => {
                            setInputText((prev) => prev + c.name + " ");
                            setShowMentions(false);
                            chatInputRef.current?.focus();
                          }}
                          className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer transition"
                        >
                          <img src={c.avatar} alt={c.name} className="w-6 h-6 rounded-full object-cover" />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-800 truncate">{c.name}</div>
                            <div className="text-[10px] text-slate-400">{c.role}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Текстовая область */}
                  <textarea
                    ref={chatInputRef}
                    rows={2}
                    value={inputText}
                    onChange={(e) => {
                      setInputText(e.target.value);
                      if (e.target.value.endsWith("@")) {
                        setShowMentions(true);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Напишите сообщение, вопрос или упомяните через @..."
                    className="w-full text-sm text-slate-800 placeholder-slate-400 outline-none resize-none bg-transparent"
                  />

                  {/* Нижняя полоса действий ввода */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100/80">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setInputText((prev) => prev + "✨ ");
                          chatInputRef.current?.focus();
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition cursor-pointer"
                        title="AI ассистент"
                      >
                        <Sparkles className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowMentions(!showMentions)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                        title="Упомянуть @..."
                      >
                        <AtSign className="w-4 h-4" />
                      </button>

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

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setInputText("")}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 transition cursor-pointer"
                      >
                        Отмена
                      </button>
                      <button
                        type="submit"
                        disabled={!inputText.trim() || isUploading}
                        className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-bold text-xs transition cursor-pointer shadow-xs flex items-center gap-1.5"
                      >
                        <span>Отправить</span>
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            /* Контент выбранного раздела кабинета (Расписание, Ученики, Домашка) */
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#f8fafc]">
              <div className="max-w-6xl mx-auto space-y-6">
                {extraCabinetSections.find((s) => s.key === activeScreen)?.render()}
              </div>
            </div>
          )}
        </main>

        {/* =========================================================================
            КОЛОНКА 3: ПРАВАЯ ПАНЕЛЬ КОНТЕКСТА УРОКА (INSPECTOR - 310px)
           ========================================================================= */}
        {inspectorOpen && (
          <aside className="w-80 bg-white border-l border-slate-200/80 flex flex-col shrink-0 h-full select-none z-20">
            {/* Вкладки: Инфо | Закрепы | Файлы | Ссылки */}
            <div className="p-3 border-b border-slate-100 flex items-center gap-1 bg-slate-50/60 text-xs font-bold text-slate-600">
              <button
                type="button"
                onClick={() => setInspectorTab("info")}
                className={`flex-1 py-1.5 rounded-lg transition text-center cursor-pointer ${
                  inspectorTab === "info"
                    ? "bg-white text-slate-900 shadow-2xs font-extrabold"
                    : "hover:bg-slate-100"
                }`}
              >
                Инфо
              </button>
              <button
                type="button"
                onClick={() => setInspectorTab("pins")}
                className={`flex-1 py-1.5 rounded-lg transition text-center cursor-pointer ${
                  inspectorTab === "pins"
                    ? "bg-white text-slate-900 shadow-2xs font-extrabold"
                    : "hover:bg-slate-100"
                }`}
              >
                Закрепы
              </button>
              <button
                type="button"
                onClick={() => setInspectorTab("files")}
                className={`flex-1 py-1.5 rounded-lg transition text-center cursor-pointer ${
                  inspectorTab === "files"
                    ? "bg-white text-slate-900 shadow-2xs font-extrabold"
                    : "hover:bg-slate-100"
                }`}
              >
                Файлы
              </button>
              <button
                type="button"
                onClick={() => setInspectorTab("links")}
                className={`flex-1 py-1.5 rounded-lg transition text-center cursor-pointer ${
                  inspectorTab === "links"
                    ? "bg-white text-slate-900 shadow-2xs font-extrabold"
                    : "hover:bg-slate-100"
                }`}
              >
                Ссылки
              </button>
            </div>

            {/* Контент инспектора */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 text-xs">
              {inspectorTab === "info" && (
                <>
                  {/* Основная информация (Main info) */}
                  <div className="space-y-3">
                    <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider text-slate-400">
                      Основная информация
                    </h4>
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Преподаватель</span>
                        <div className="flex items-center gap-1.5 font-bold text-slate-800">
                          <img
                            src={TEACHER_VASILINA_AVATAR}
                            alt="Василина"
                            className="w-4 h-4 rounded-full object-cover"
                          />
                          <span>Василина Ш.</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Дата урока</span>
                        <span className="font-bold text-slate-800">Сегодня, 16:00</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Статус</span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>Активен</span>
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Теги</span>
                        <span className="font-bold text-slate-800 hover:text-blue-600 cursor-pointer">
                          Математика 3 класс &gt;
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Домашнее задание</span>
                        <span className="font-bold text-slate-800 hover:text-blue-600 cursor-pointer">
                          4 задачи &gt;
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Связанные уроки (Linked threads) */}
                  <div className="space-y-2 pt-3 border-t border-slate-100">
                    <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-400">
                      Связанные темы
                    </h4>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer transition">
                        <div className="flex items-center gap-1.5">
                          <Hash className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-semibold text-slate-700">Дроби и доли</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">4</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer transition">
                        <div className="flex items-center gap-1.5">
                          <Hash className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-semibold text-slate-700">Подготовка к ВПР</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Активность ученика (Conceptzilla Activity Heatmap) */}
                  <div className="space-y-2 pt-3 border-t border-slate-100">
                    <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-400">
                      Посещаемость и активность
                    </h4>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 20 }).map((_, i) => (
                        <span
                          key={i}
                          className={`w-2.5 h-2.5 rounded-xs ${
                            i % 5 === 0
                              ? "bg-slate-200"
                              : i % 3 === 0
                              ? "bg-emerald-300"
                              : "bg-emerald-500"
                          }`}
                          title={`Неделя ${i + 1}`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Участники урока (Members с бейджами ролей) */}
                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-400">
                        Участники (3)
                      </h4>
                      <Plus className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 cursor-pointer" />
                    </div>

                    <div className="space-y-2">
                      {/* Преподаватель */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={TEACHER_VASILINA_AVATAR}
                            alt="Василина"
                            className="w-7 h-7 rounded-full object-cover"
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate">Василина Владимировна</div>
                            <div className="text-[10px] text-slate-400">Стаж 12 лет</div>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          Учитель
                        </span>
                      </div>

                      {/* Ученик */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={SHARONOV_AVATAR}
                            alt="Сергей"
                            className="w-7 h-7 rounded-full object-cover"
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate">Сергей Шаронов</div>
                            <div className="text-[10px] text-slate-400">3 класс</div>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Ученик
                        </span>
                      </div>

                      {/* Родитель */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                            А
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate">Анна (Мама)</div>
                            <div className="text-[10px] text-slate-400">+7 (900) 123-45-67</div>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                          Родитель
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {inspectorTab === "pins" && (
                <div className="space-y-3">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-400">
                    Закрепленные материалы
                  </h4>
                  <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50 space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800">
                      <Pin className="w-3.5 h-3.5 text-blue-600" />
                      <span>Правило сложения дробей</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed text-[11px]">
                      При сложении дробей с одинаковыми знаменателями числители складывают, а знаменатель оставляют тот же.
                    </p>
                  </div>
                </div>
              )}

              {inspectorTab === "files" && (
                <div className="space-y-3">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-400">
                    Файлы и рабочие тетради
                  </h4>
                  <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span className="font-bold text-slate-800 truncate">Учебник_Математика_3кл.pdf</span>
                    </div>
                    <Download className="w-3.5 h-3.5 text-slate-400 hover:text-slate-700 cursor-pointer" />
                  </div>
                </div>
              )}

              {inspectorTab === "links" && (
                <div className="space-y-3">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-400">
                    Полезные ссылки
                  </h4>
                  <a
                    href="https://meet.jit.si"
                    target="_blank"
                    rel="noreferrer"
                    className="block p-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition"
                  >
                    <div className="flex items-center gap-1.5 font-bold text-blue-600">
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Видеокомната Jitsi Meet</span>
                    </div>
                    <div className="text-[11px] text-slate-400">meet.jit.si</div>
                  </a>
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
