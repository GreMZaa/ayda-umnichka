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
} from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { getSupabase } from "@/lib/supabase";
import { clearAuthCookies } from "@/lib/auth-session";
import EditProfileModal from "@/components/EditProfileModal";
import ScheduleCalendar from "@/components/ScheduleCalendar";

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

// Двойная галочка Telegram
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
  currentUser,
  lessons = [],
  onRefreshData,
  extraCabinetSections = [],
}: TelegramCabinetProps) {
  const router = useRouter();

  // 1. Навигация и активный экран
  // activeScreen: "chat" (мессенджер) или ключ дополнительного раздела (например: "schedule", "homework", "children", "students")
  const [activeScreen, setActiveScreen] = useState<string>("chat");
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [editProfileOpen, setEditProfileOpen] = useState<boolean>(false);

  // 2. Чаты
  const [chatFilter, setChatFilter] = useState<"all" | "lessons" | "teachers" | "students" | "support">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeChatId, setActiveChatId] = useState<string>("");
  const [mobileShowChat, setMobileShowChat] = useState<boolean>(false); // на мобильном открыта переписка

  // 3. Сообщения
  const [messages, setMessages] = useState<TelegramMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  // Формирование списка чатов в зависимости от роли
  const [chats, setChats] = useState<TelegramChat[]>(() => {
    if (currentRole === "TEACHER") {
      return [
        {
          id: "chat-student-1",
          name: "Артём Смирнов",
          role: "student",
          roleLabel: "Ученик (3 класс)",
          avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&h=150&fit=crop&crop=faces",
          online: true,
          statusText: "в сети",
          lastMessage: "Здравствуйте! Домашнее задание по дробям загрузил в кабинет 📚",
          lastMessageTime: "11:42",
          unreadCount: 1,
          lessonId: "lesson-1",
          lessonTitle: "Математика и логика",
          lessonTime: "Сегодня в 15:00",
        },
        {
          id: "chat-parent-1",
          name: "Елена Викторовна",
          role: "parent",
          roleLabel: "Родитель Артёма",
          avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=faces",
          online: false,
          statusText: "была 15 минут назад",
          lastMessage: "Спасибо большое за подробный отчёт по уроку!",
          lastMessageTime: "09:15",
          unreadCount: 0,
        },
        {
          id: "chat-student-2",
          name: "София Васильева",
          role: "student",
          roleLabel: "Ученица (4 класс)",
          avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=faces",
          online: true,
          statusText: "в сети",
          lastMessage: "А мы сегодня будем разбирать олимпиадные задачи?",
          lastMessageTime: "Вчера",
          unreadCount: 0,
          lessonId: "lesson-2",
          lessonTitle: "Олимпиадная математика",
          lessonTime: "Завтра в 16:30",
        },
        {
          id: "chat-support",
          name: "Поддержка «АйДаУмничка»",
          role: "support",
          roleLabel: "Служба заботы 24/7",
          avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=faces",
          online: true,
          statusText: "онлайн",
          lastMessage: "Здравствуйте! Ваше расписание на неделю успешно синхронизировано.",
          lastMessageTime: "18 окт",
          unreadCount: 0,
        },
      ];
    } else if (currentRole === "STUDENT") {
      return [
        {
          id: "chat-teacher-1",
          name: "Анна Сергеевна Иванова",
          role: "teacher",
          roleLabel: "Преподаватель математики",
          avatar: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&h=150&fit=crop&crop=faces",
          online: true,
          statusText: "в сети",
          lastMessage: "Привет! Молодец, отлично справился с примерами на доске!",
          lastMessageTime: "12:10",
          unreadCount: 1,
          lessonId: "lesson-1",
          lessonTitle: "Математика и логика",
          lessonTime: "Сегодня в 15:00",
        },
        {
          id: "chat-parent-me",
          name: "Мама (Родитель)",
          role: "parent",
          roleLabel: "Семья",
          avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=faces",
          online: true,
          statusText: "в сети",
          lastMessage: "Не забудь подключиться к уроку в 15:00 ⭐",
          lastMessageTime: "10:05",
          unreadCount: 0,
        },
        {
          id: "chat-teacher-2",
          name: "Мария Павловна",
          role: "teacher",
          roleLabel: "Русский язык и чтение",
          avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop&crop=faces",
          online: false,
          statusText: "была недавно",
          lastMessage: "Новое домашнее задание добавлено в твой личный кабинет.",
          lastMessageTime: "Вчера",
          unreadCount: 0,
        },
        {
          id: "chat-support",
          name: "Помощник «АйДаУмничка»",
          role: "support",
          roleLabel: "Бот-помощник",
          avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=faces",
          online: true,
          statusText: "онлайн",
          lastMessage: "Ты заработал 5 звёзд за выполненные задания! Так держать! 🚀",
          lastMessageTime: "18 окт",
          unreadCount: 0,
        },
      ];
    } else {
      // PARENT / ADMIN
      return [
        {
          id: "chat-teacher-1",
          name: "Анна Сергеевна Иванова",
          role: "teacher",
          roleLabel: "Учитель математики",
          avatar: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&h=150&fit=crop&crop=faces",
          online: true,
          statusText: "в сети",
          lastMessage: "Здравствуйте! У Артёма отличные успехи с устным счётом.",
          lastMessageTime: "11:50",
          unreadCount: 1,
          lessonId: "lesson-1",
          lessonTitle: "Математика и логика",
          lessonTime: "Сегодня в 15:00",
        },
        {
          id: "chat-child-1",
          name: "Артём (Ребёнок)",
          role: "student",
          roleLabel: "Ученик 3 класса",
          avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&h=150&fit=crop&crop=faces",
          online: true,
          statusText: "в сети",
          lastMessage: "Мам, я решил все примеры на звёздочки!",
          lastMessageTime: "10:12",
          unreadCount: 0,
        },
        {
          id: "chat-billing",
          name: "Отдел заботы и оплаты",
          role: "support",
          roleLabel: "Куратор школы",
          avatar: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=150&h=150&fit=crop&crop=faces",
          online: true,
          statusText: "онлайн",
          lastMessage: "Ваш пакет из 8 уроков успешно активирован. Приятных занятий!",
          lastMessageTime: "Вчера",
          unreadCount: 0,
        },
        {
          id: "chat-support",
          name: "Техподдержка АйДаУмничка",
          role: "support",
          roleLabel: "Поддержка платформы",
          avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=faces",
          online: true,
          statusText: "онлайн",
          lastMessage: "Если возникнут вопросы по видеосвязи или доске, мы на связи 24/7.",
          lastMessageTime: "17 окт",
          unreadCount: 0,
        },
      ];
    }
  });

  // Установка первого чата по умолчанию
  useEffect(() => {
    if (!activeChatId && chats.length > 0) {
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

    // Дефолтные реалистичные сообщения диалога
    const activeChat = chats.find((c) => c.id === activeChatId);
    const partnerName = activeChat?.name || "Собеседник";
    const partnerAvatar = activeChat?.avatar;

    const defaultMsgs: TelegramMessage[] = [
      {
        id: "msg-1",
        senderId: activeChatId,
        senderName: partnerName,
        senderAvatar: partnerAvatar,
        isMe: false,
        text: `Здравствуйте! Рады видеть вас на платформе «АйДаУмничка».`,
        time: "10:15",
        date: "Сегодня",
        read: true,
      },
      {
        id: "msg-2",
        senderId: currentUser.id || "me",
        senderName: currentUser.name || "Я",
        isMe: true,
        text: `Добрый день! Подскажите, всё ли готово к сегодняшнему уроку?`,
        time: "10:18",
        date: "Сегодня",
        read: true,
      },
    ];

    if (activeChat?.lessonId) {
      defaultMsgs.push({
        id: "msg-3",
        senderId: activeChatId,
        senderName: partnerName,
        senderAvatar: partnerAvatar,
        isMe: false,
        text: `Да, интерактивная доска и материалы к уроку подготовлены! Жду вас в виртуальном классе.`,
        time: "10:20",
        date: "Сегодня",
        type: "lesson_invite",
        lessonData: {
          id: activeChat.lessonId,
          title: activeChat.lessonTitle || "Индивидуальный онлайн-урок",
          time: activeChat.lessonTime || "Сегодня в 15:00",
          subject: "Математика и логика",
        },
        read: true,
      });
    }

    setMessages(defaultMsgs);
  }, [activeChatId, chats, currentUser.id, currentUser.name]);

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

    const now = new Date();
    const timeStr = format(now, "HH:mm");

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

      const replyMsg: TelegramMessage = {
        id: `reply-${Date.now()}`,
        senderId: activeChatId,
        senderName: partnerName,
        senderAvatar: partnerAvatar,
        isMe: false,
        text: replyText,
        time: format(new Date(), "HH:mm"),
        date: "Сегодня",
        read: true,
      };

      const withReply = [...updated, replyMsg];
      saveMessages(withReply);

      setChats((prev) =>
        prev.map((c) =>
          c.id === activeChatId
            ? { ...c, lastMessage: replyText, lastMessageTime: format(new Date(), "HH:mm") }
            : c
        )
      );
    }, 1500);
  };

  // Отправка голосового сообщения (симуляция Telegram Voice Note)
  const handleSendVoiceMessage = () => {
    const timeStr = format(new Date(), "HH:mm");
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

  // Выход из аккаунта
  const handleLogout = async () => {
    const supabase = getSupabase();
    if (supabase) {
      await supabase.auth.signOut();
    }
    clearAuthCookies();
    router.push("/login");
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
    <div className="flex h-[calc(100dvh-4rem)] bg-[#eef3f7] overflow-hidden select-none relative font-sans text-slate-800">
      {/* =========================================================================
          1. БОКОВОЕ МЕНЮ TELEGRAM (SLIDE-OVER DRAWER)
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
              {/* Шапка профиля в Telegram-стиле (фирменный синий градиент) */}
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

              {/* Пункты меню Telegram */}
              <div className="p-2 space-y-1">
                <button
                  onClick={() => {
                    setActiveScreen("chat");
                    setDrawerOpen(false);
                  }}
                  className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl font-medium text-sm transition cursor-pointer ${
                    activeScreen === "chat"
                      ? "bg-[#2481cc]/10 text-[#2481cc] font-bold"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <Users className="w-5 h-5 text-[#2481cc]" />
                  <span>Чаты и сообщения</span>
                </button>

                {/* Дополнительные разделы кабинета */}
                {extraCabinetSections.map((sec) => {
                  const Icon = sec.icon;
                  return (
                    <button
                      key={sec.key}
                      onClick={() => {
                        setActiveScreen(sec.key);
                        setDrawerOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition cursor-pointer ${
                        activeScreen === sec.key
                          ? "bg-[#2481cc]/10 text-[#2481cc] font-bold"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <Icon className="w-5 h-5 text-slate-500" />
                        <span>{sec.title}</span>
                      </div>
                      {sec.badge && (
                        <span className="px-2 py-0.5 rounded-full bg-[#2481cc] text-white text-[11px] font-bold">
                          {sec.badge}
                        </span>
                      )}
                    </button>
                  );
                })}

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
                onClick={handleLogout}
                className="w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl font-bold text-sm text-rose-600 hover:bg-rose-50 transition cursor-pointer"
              >
                <LogOut className="w-5 h-5" />
                <span>Выйти из аккаунта</span>
              </button>
              <div className="text-[11px] text-center text-slate-400 pt-2 font-mono">
                АйДаУмничка • Telegram Web
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          2. ЛЕВАЯ КОЛОНКА (СПИСОК ЧАТОВ TELEGRAM)
         ========================================================================= */}
      <aside
        className={`w-full md:w-80 lg:w-96 bg-white border-r border-slate-200 flex flex-col shrink-0 h-full ${
          mobileShowChat ? "hidden md:flex" : "flex"
        }`}
      >
        {/* Шапка левой колонки с гамбургером и поиском */}
        <div className="p-3 bg-white border-b border-slate-100 space-y-2.5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDrawerOpen(true)}
              className="p-2 rounded-xl text-slate-600 hover:text-[#2481cc] hover:bg-slate-100 transition cursor-pointer"
              title="Открыть меню кабинета"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Строка поиска в стиле Telegram */}
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Поиск чатов и уроков..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-[#f1f5f9] rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2481cc]/30 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Папки / Вкладки чатов в стиле Telegram */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-xs">
            <button
              onClick={() => setChatFilter("all")}
              className={`px-3 py-1 rounded-full font-bold whitespace-nowrap transition cursor-pointer ${
                chatFilter === "all"
                  ? "bg-[#2481cc] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Все чаты
            </button>
            <button
              onClick={() => setChatFilter("lessons")}
              className={`px-3 py-1 rounded-full font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1 ${
                chatFilter === "lessons"
                  ? "bg-[#2481cc] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Video className="w-3 h-3" />
              <span>Уроки</span>
            </button>
            {currentRole === "STUDENT" || currentRole === "PARENT" ? (
              <button
                onClick={() => setChatFilter("teachers")}
                className={`px-3 py-1 rounded-full font-bold whitespace-nowrap transition cursor-pointer ${
                  chatFilter === "teachers"
                    ? "bg-[#2481cc] text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Учителя
              </button>
            ) : (
              <button
                onClick={() => setChatFilter("students")}
                className={`px-3 py-1 rounded-full font-bold whitespace-nowrap transition cursor-pointer ${
                  chatFilter === "students"
                    ? "bg-[#2481cc] text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Ученики
              </button>
            )}
            <button
              onClick={() => setChatFilter("support")}
              className={`px-3 py-1 rounded-full font-bold whitespace-nowrap transition cursor-pointer ${
                chatFilter === "support"
                  ? "bg-[#2481cc] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Поддержка
            </button>
          </div>
        </div>

        {/* Список диалогов */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
          {filteredChats.length === 0 ? (
            <div className="p-8 text-center text-slate-400 space-y-2">
              <Users className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-xs font-medium">Чатов по вашему запросу не найдено</p>
            </div>
          ) : (
            filteredChats.map((chat) => {
              const isSelected = activeChatId === chat.id && activeScreen === "chat";
              return (
                <div
                  key={chat.id}
                  onClick={() => {
                    setActiveChatId(chat.id);
                    setActiveScreen("chat");
                    setMobileShowChat(true);
                  }}
                  className={`p-3 flex items-start gap-3 cursor-pointer transition select-none ${
                    isSelected
                      ? "bg-[#2481cc] text-white"
                      : "hover:bg-[#f1f5f9] text-slate-800"
                  }`}
                >
                  {/* Аватарка с индикатором онлайн */}
                  <div className="relative shrink-0">
                    <img
                      src={chat.avatar}
                      alt={chat.name}
                      className="w-12 h-12 rounded-full object-cover shadow-xs"
                    />
                    {chat.online && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full shadow-xs" />
                    )}
                  </div>

                  {/* Текстовая информация чата */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <h4 className="font-bold text-sm truncate">{chat.name}</h4>
                      <span
                        className={`text-[11px] shrink-0 ${
                          isSelected ? "text-blue-100" : "text-slate-400"
                        }`}
                      >
                        {chat.lastMessageTime}
                      </span>
                    </div>

                    <p
                      className={`text-xs truncate ${
                        isSelected ? "text-blue-50" : "text-slate-500"
                      }`}
                    >
                      {chat.lastMessage}
                    </p>

                    {/* Дополнительный бейдж урока, если есть привязка */}
                    {chat.lessonId && (
                      <div className="mt-1 flex items-center justify-between">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                            isSelected
                              ? "bg-white/20 text-white"
                              : "bg-blue-50 text-[#2481cc]"
                          }`}
                        >
                          {chat.lessonTime}
                        </span>
                        {chat.unreadCount > 0 && (
                          <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center">
                            {chat.unreadCount}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* =========================================================================
          3. ПРАВАЯ ОБЛАСТЬ (АКТИВНЫЙ ЧАТ ИЛИ РАЗДЕЛ КАБИНЕТА)
         ========================================================================= */}
      <main
        className={`flex-1 flex flex-col h-full overflow-hidden bg-[#eef3f7] ${
          !mobileShowChat && activeScreen === "chat" ? "hidden md:flex" : "flex"
        }`}
      >
        {activeScreen === "chat" ? (
          /* =====================================================================
             РЕЖИМ А: TELEGRAM ЧАТ (ПЕРЕПИСКА)
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
                {/* Кнопка "Войти в онлайн-урок" в стиле видеозвонка Telegram */}
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

            {/* Область сообщений (с фирменным Telegram фоном) */}
            <div
              className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 relative"
              style={{
                backgroundColor: "#8bb1cc",
                backgroundImage:
                  "radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.08) 2px, transparent 2px), radial-gradient(circle at 0 0, rgba(255, 255, 255, 0.05) 1px, transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            >
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
                        /* Голосовое сообщение Telegram */
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

            {/* Нижняя панель ввода сообщения в стиле Telegram */}
            <footer className="p-2.5 sm:p-3 bg-white border-t border-slate-200 shrink-0">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2 max-w-4xl mx-auto">
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
                  onClick={() => setActiveScreen("chat")}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>К чатам</span>
                </button>
                <h2 className="font-extrabold text-base sm:text-lg text-slate-900">
                  {extraCabinetSections.find((s) => s.key === activeScreen)?.title || "Раздел кабинета"}
                </h2>
              </div>

              <div className="flex items-center gap-2">
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
            name: currentUser.name,
            phone: currentUser.phone,
            email: currentUser.email,
            avatarUrl: currentUser.avatar,
            grade: currentUser.grade,
            bio: currentUser.bio,
          }}
          onSave={() => {
            setEditProfileOpen(false);
            if (onRefreshData) onRefreshData();
          }}
        />
      )}
    </div>
  );
}
