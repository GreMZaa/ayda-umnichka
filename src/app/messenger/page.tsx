'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Search,
  Phone,
  Video,
  MoreVertical,
  Paperclip,
  Smile,
  Mic,
  Send,
  X,
  ChevronLeft,
  Check,
  CheckCheck,
  Play,
  Pause,
  Volume2,
  VolumeX,
  FileText,
  Image as ImageIcon,
  Download,
  PhoneIncoming,
  PhoneOutgoing,
  Settings,
  Sparkles,
  Menu,
  Edit3,
  Loader2,
  ArrowRight,
  LogOut,
  User,
  ShieldCheck,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Contact {
  id: string;
  publicId: string;
  role: 'teacher' | 'student' | 'support' | 'admin';
  fullName: string;
  subtitle: string;
  avatarText: string;
  online: boolean;
  roomToken?: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  text: string | null;
  file_url: string | null;
  file_type: string | null;
  is_read: boolean;
  created_at: string;
  is_call_log?: boolean;
  call_duration?: string;
  voice_duration_sec?: number;
}

interface Conversation {
  id: string;
  contact: Contact;
  messages: Message[];
  lastMessage: Message | null;
  unreadCount: number;
}

export default function MessengerPage() {
  const router = useRouter();

  // Current session states
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    publicId: string;
    role: string;
    fullName: string;
  } | null>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'contacts' | 'support'>('all');
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // Audio player bar states (matching the screenshot header banner)
  const [playingAudio, setPlayingAudio] = useState<{
    id: string;
    title: string;
    duration: string;
    speed: number;
    isPlaying: boolean;
  } | null>(null);

  // Emoji picker toggle
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);

  // File upload
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [attachedFile, setAttachedFile] = useState<{
    file: File;
    name: string;
    url?: string;
    isImage?: boolean;
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Voice recording state
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // 1. Initial Load & Polling from Supabase API
  const fetchMessengerData = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const res = await fetch('/api/messenger');
      const data = await res.json();

      if (data.success) {
        setCurrentUser(data.currentUser);
        setConversations(data.conversations || []);

        // Default to first conversation if none selected
        if (!activeConvId && data.conversations?.length > 0) {
          setActiveConvId(data.conversations[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load messenger data:', err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMessengerData();

    // Poll every 4 seconds for fresh messages and unread counts
    const interval = setInterval(() => {
      fetchMessengerData(true);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // 2. Realtime listener via Supabase Broadcast
  useEffect(() => {
    const channel = supabase.channel('platform_messenger_global', {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'new-message' }, ({ payload }) => {
        if (!payload || !payload.conversation_id) return;
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id === payload.conversation_id) {
              const exists = c.messages.some((m) => m.id === payload.id);
              if (exists) return c;
              const newMsgs = [...c.messages, payload];
              return {
                ...c,
                messages: newMsgs,
                lastMessage: payload,
                unreadCount: c.unreadCount + 1,
              };
            }
            return c;
          })
        );
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Auto-scroll to bottom on active conversation change or new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConvId, conversations]);

  // Active conversation object
  const activeConversation = conversations.find((c) => c.id === activeConvId);

  // 3. Filtered conversations
  const filteredConversations = conversations.filter((c) => {
    // Search query filter
    const matchesSearch =
      c.contact.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.lastMessage?.text || '').toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    // Unread only toggle
    if (onlyUnread && c.unreadCount === 0) return false;

    // Tab filter
    if (activeTab === 'support') return c.contact.role === 'support';
    if (activeTab === 'contacts') return c.contact.role !== 'support';
    return true;
  });

  // 4. Send Message Handler
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputText.trim() && !attachedFile) || isSending || !activeConvId) return;

    const trimmed = inputText.trim();
    setIsSending(true);

    let fileUrl: string | null = null;
    let fileType: string | null = null;

    // Handle file upload if attached
    if (attachedFile) {
      try {
        setIsUploading(true);
        const fd = new FormData();
        fd.append('file', attachedFile.file);
        const upRes = await fetch('/api/room/upload', {
          method: 'POST',
          body: fd,
        });
        const upData = await upRes.json();
        if (upData.success) {
          fileUrl = upData.url;
          fileType = upData.type;
        }
      } catch (err) {
        console.error('File upload failed:', err);
      } finally {
        setIsUploading(false);
      }
    }

    const tempId = `msg_temp_${Date.now()}`;
    const newMsg: Message = {
      id: tempId,
      conversation_id: activeConvId,
      sender_id: currentUser?.id || 'c51ef5b0-3bc0-456f-bd31-7dbba439846c',
      text: trimmed || null,
      file_url: fileUrl,
      file_type: fileType,
      is_read: false,
      created_at: new Date().toISOString(),
    };

    // Optimistic UI update
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === activeConvId) {
          return {
            ...c,
            messages: [...c.messages, newMsg],
            lastMessage: newMsg,
          };
        }
        return c;
      })
    );

    setInputText('');
    setAttachedFile(null);
    setShowEmojiPicker(false);

    try {
      const res = await fetch('/api/messenger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: activeConvId,
          text: trimmed,
          fileUrl,
          fileType,
          senderId: currentUser?.id,
          senderRole: currentUser?.role,
        }),
      });

      const result = await res.json();
      if (result.success && result.message) {
        // Broadcast to realtime channel
        const channel = supabase.channel('platform_messenger_global');
        channel.send({
          type: 'broadcast',
          event: 'new-message',
          payload: result.message,
        });
      }
    } catch (err) {
      console.error('Failed to post message:', err);
    } finally {
      setIsSending(false);
    }
  };

  // 5. Voice Recording Simulator / Handler
  const toggleRecordVoice = () => {
    if (isRecordingVoice) {
      // Finish recording and send
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      setIsRecordingVoice(false);

      if (recordSeconds > 0 && activeConvId) {
        const voiceMsg: Message = {
          id: `voice_${Date.now()}`,
          conversation_id: activeConvId,
          sender_id: currentUser?.id || 'c51ef5b0-3bc0-456f-bd31-7dbba439846c',
          text: null,
          file_url: null,
          file_type: 'audio/webm',
          voice_duration_sec: recordSeconds,
          is_read: false,
          created_at: new Date().toISOString(),
        };

        setConversations((prev) =>
          prev.map((c) => {
            if (c.id === activeConvId) {
              return {
                ...c,
                messages: [...c.messages, voiceMsg],
                lastMessage: voiceMsg,
              };
            }
            return c;
          })
        );

        fetch('/api/messenger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId: activeConvId,
            text: `Голосовое сообщение (${recordSeconds} сек.)`,
            fileType: 'audio/webm',
            senderId: currentUser?.id,
            senderRole: currentUser?.role,
          }),
        }).catch(() => {});
      }
      setRecordSeconds(0);
    } else {
      // Start recording
      setIsRecordingVoice(true);
      setRecordSeconds(0);
      recordTimerRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    }
  };

  const cancelRecordVoice = () => {
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    setIsRecordingVoice(false);
    setRecordSeconds(0);
  };

  // 6. Handle File Attachment Selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachedFile({
      file,
      name: file.name,
      isImage: file.type.startsWith('image/'),
    });
  };

  // Format Helpers
  const formatMsgTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } catch {
      return '';
    }
  };

  const formatListDate = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      const now = new Date();
      const diffHours = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60));
      if (diffHours < 24 && d.getDate() === now.getDate()) {
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      }
      if (diffHours < 48) return 'вчера';
      return `${d.getDate()} ${['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'][d.getMonth()]}`;
    } catch {
      return '';
    }
  };

  // Launch direct lesson room with contact
  const handleLaunchCall = (roomToken = 'room-4599') => {
    const roleParam = currentUser?.role === 'teacher' ? 'teacher' : 'student';
    router.push(`/room/${roomToken}?role=${roleParam}`);
  };

  return (
    <div className="flex-1 w-full h-[calc(100dvh-5rem)] min-h-[560px] bg-[#FFF7EE] flex flex-col overflow-hidden select-none">
      {/* Telegram-style 2-Column Messenger Layout with warm Ayda-Umnichka brand colors */}
      <div className="flex-1 w-full max-w-7xl mx-auto my-0 sm:my-3 lg:my-4 bg-white sm:rounded-[32px] sm:border border-[#F2DECE] shadow-lg flex overflow-hidden">
        
        {/* ================= LEFT SIDEBAR (Chats List) ================= */}
        <aside
          className={`w-full sm:w-80 md:w-96 lg:w-[400px] border-r border-[#F2DECE] bg-[#FFFBF7] flex flex-col shrink-0 ${
            activeConvId ? 'hidden sm:flex' : 'flex'
          }`}
        >
          {/* 1. Sidebar Header */}
          <div className="p-3.5 sm:p-4 bg-white border-b border-[#F2DECE] flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowMenuDropdown(!showMenuDropdown)}
                  className="p-2 text-[#161F38] hover:bg-[#FFF7EE] rounded-xl transition-colors cursor-pointer"
                  title="Меню"
                >
                  <Menu className="w-5 h-5 text-[#161F38]" />
                </button>

                {/* Dropdown Menu */}
                {showMenuDropdown && (
                  <div className="absolute left-0 top-12 w-56 bg-white rounded-2xl border border-[#F2DECE] shadow-xl py-2 z-50 text-xs font-bold text-[#161F38] animate-in fade-in duration-150">
                    <Link
                      href={currentUser?.role === 'teacher' ? `/teacher?id=${currentUser.publicId}` : `/${currentUser?.publicId || 'student'}`}
                      className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-[#FFF7EE] transition-colors"
                      onClick={() => setShowMenuDropdown(false)}
                    >
                      <User className="w-4 h-4 text-[#FF6B4A]" />
                      <span>Личный кабинет</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenuDropdown(false);
                        handleLaunchCall();
                      }}
                      className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 hover:bg-[#FFF7EE] transition-colors cursor-pointer"
                    >
                      <Video className="w-4 h-4 text-[#5C8519]" />
                      <span>Открыть видеоурок</span>
                    </button>
                    <div className="h-[1px] bg-[#F2DECE] my-1" />
                    <Link
                      href="/login"
                      className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-rose-50 text-rose-600 transition-colors"
                      onClick={() => setShowMenuDropdown(false)}
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Выйти из аккаунта</span>
                    </Link>
                  </div>
                )}
              </div>

              <h1 className="font-black text-lg text-[#161F38] tracking-tight">
                Мессенджер
              </h1>
            </div>

            {/* Quick Actions (Call room & New chat) */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleLaunchCall()}
                className="p-2 text-[#5C8519] hover:bg-[#EAF7CF] rounded-full transition-colors cursor-pointer"
                title="Начать видеозвонок"
              >
                <Phone className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => fetchMessengerData()}
                className="p-2 text-[#6B758E] hover:text-[#161F38] hover:bg-[#FFF7EE] rounded-full transition-colors cursor-pointer"
                title="Обновить диалоги"
              >
                <Sparkles className="w-4 h-4 text-[#FF6B4A]" />
              </button>
            </div>
          </div>

          {/* 2. Search Input (Telegram Style) */}
          <div className="p-3 bg-white border-b border-[#F2DECE] shrink-0">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-[#8E99AF] absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск собеседника или сообщения..."
                className="w-full bg-[#FFF7EE] border border-[#F2DECE] focus:border-[#FF6B4A] rounded-full pl-9 pr-8 py-2 text-xs font-semibold text-[#161F38] placeholder-[#8E99AF] outline-none transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 text-[#8E99AF] hover:text-[#161F38] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 3. Filter Folder Tabs (Matching Telegram tabs in screenshot: Все / Ученики / Поддержка) */}
          <div className="px-3 pt-2 pb-1 bg-white border-b border-[#F2DECE] flex items-center justify-between gap-1 shrink-0 text-xs font-black">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-[#161F38] text-white shadow-xs'
                    : 'text-[#6B758E] hover:bg-[#FFF7EE] hover:text-[#161F38]'
                }`}
              >
                Все
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('contacts')}
                className={`px-3 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1 ${
                  activeTab === 'contacts'
                    ? 'bg-[#161F38] text-white shadow-xs'
                    : 'text-[#6B758E] hover:bg-[#FFF7EE] hover:text-[#161F38]'
                }`}
              >
                <span>{currentUser?.role === 'teacher' ? 'Ученики' : 'Преподаватели'}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('support')}
                className={`px-3 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1 ${
                  activeTab === 'support'
                    ? 'bg-[#161F38] text-white shadow-xs'
                    : 'text-[#6B758E] hover:bg-[#FFF7EE] hover:text-[#161F38]'
                }`}
              >
                <span>Поддержка</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setOnlyUnread(!onlyUnread)}
              className={`p-1.5 rounded-full transition-colors cursor-pointer shrink-0 ${
                onlyUnread ? 'bg-[#FFF0E6] text-[#FF6B4A]' : 'text-[#8E99AF] hover:bg-[#FFF7EE]'
              }`}
              title="Фильтр непрочитанных"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

          {/* 4. Conversations List (Clean, Supabase backed, no spam!) */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#F7EBE0] p-1.5 space-y-1">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-xs text-[#8E99AF]">
                <Loader2 className="w-6 h-6 animate-spin text-[#FF6B4A] mb-2" />
                <span>Загрузка диалогов...</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#8E99AF]">
                <p className="font-bold text-[#161F38] mb-1">Диалогов не найдено</p>
                <p>Все сообщения сохраняются в единой базе центра «АйДаУмничка»</p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = conv.id === activeConvId;
                const last = conv.lastMessage;
                const isMe = last?.sender_id === currentUser?.id;

                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => setActiveConvId(conv.id)}
                    className={`w-full p-2.5 sm:p-3 rounded-2xl text-left transition-all flex items-start gap-3 cursor-pointer group ${
                      isSelected
                        ? 'bg-[#FFF0E6] border border-[#F2DECE] shadow-xs'
                        : 'hover:bg-white border border-transparent'
                    }`}
                  >
                    {/* Avatar with Online Green Dot */}
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#FF6B4A] to-[#FFA259] text-white flex items-center justify-center font-black text-base shadow-xs border border-white">
                        <span>{conv.contact.avatarText}</span>
                      </div>
                      {conv.contact.online && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#5C8519] border-2 border-white" />
                      )}
                    </div>

                    {/* Chat Text Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h3
                            className={`font-black text-xs sm:text-sm truncate ${
                              isSelected ? 'text-[#FF6B4A]' : 'text-[#161F38]'
                            }`}
                          >
                            {conv.contact.fullName}
                          </h3>
                          {conv.contact.role === 'support' && (
                            <ShieldCheck className="w-3.5 h-3.5 text-[#5C8519] shrink-0" />
                          )}
                        </div>

                        {/* Last Message Time */}
                        <span className="text-[10px] font-bold text-[#8E99AF] shrink-0">
                          {formatListDate(last?.created_at)}
                        </span>
                      </div>

                      {/* Last Message Snippet */}
                      <div className="flex items-center justify-between gap-1 text-xs">
                        <p className="text-[#6B758E] truncate text-[11px] sm:text-xs">
                          {isMe && <span className="text-[#FF6B4A] font-bold mr-1">Вы:</span>}
                          {last?.text ? (
                            last.text
                          ) : last?.file_url ? (
                            '📎 Файл прикреплен'
                          ) : last?.voice_duration_sec ? (
                            '🎙 Голосовое сообщение'
                          ) : (
                            conv.contact.subtitle
                          )}
                        </p>

                        {/* Status Checkmarks or Unread Badge */}
                        {conv.unreadCount > 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-[#FF6B4A] text-white text-[10px] font-black shrink-0">
                            {conv.unreadCount}
                          </span>
                        ) : isMe && last ? (
                          <CheckCheck className="w-3.5 h-3.5 text-[#5C8519] shrink-0" />
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* 5. Bottom Toggle Bar: "Только непрочитанные" (Matching screenshot footer) */}
          <div className="p-3 bg-white border-t border-[#F2DECE] flex items-center justify-between text-xs font-bold text-[#6B758E] shrink-0">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#FF6B4A]" />
              <span>Только непрочитанные</span>
            </span>
            <button
              type="button"
              onClick={() => setOnlyUnread(!onlyUnread)}
              className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                onlyUnread ? 'bg-[#FF6B4A]' : 'bg-[#E0E5EC]'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full bg-white shadow-xs absolute top-0.5 transition-transform ${
                  onlyUnread ? 'left-4.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>
        </aside>

        {/* ================= RIGHT MAIN CHAT AREA ================= */}
        <main
          className={`flex-1 flex flex-col bg-[#FFF7EE] relative overflow-hidden ${
            !activeConvId ? 'hidden sm:flex' : 'flex'
          }`}
        >
          {activeConversation ? (
            <>
              {/* 1. Chat Header */}
              <div className="h-16 px-4 bg-white/95 backdrop-blur-md border-b border-[#F2DECE] flex items-center justify-between shrink-0 sticky top-0 z-20 shadow-2xs">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Back button on Mobile */}
                  <button
                    type="button"
                    onClick={() => setActiveConvId(null)}
                    className="p-1.5 -ml-1 text-[#161F38] hover:bg-[#FFF7EE] rounded-full sm:hidden cursor-pointer"
                    title="Назад к списку"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>

                  {/* Header Avatar */}
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FF6B4A] to-[#FFA259] text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs border border-white">
                    <span>{activeConversation.contact.avatarText}</span>
                  </div>

                  <div className="min-w-0">
                    <h2 className="font-extrabold text-sm sm:text-base text-[#161F38] truncate">
                      {activeConversation.contact.fullName}
                    </h2>
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#5C8519]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#5C8519] animate-pulse" />
                      <span>{activeConversation.contact.online ? 'в сети (online)' : 'был(а) недавно'}</span>
                    </div>
                  </div>
                </div>

                {/* Right Action Icons (Direct Call button, Search, More) */}
                <div className="flex items-center gap-1 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => handleLaunchCall(activeConversation.contact.roomToken)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#EAF7CF] hover:bg-[#DCF2B3] text-[#5C8519] border border-[#CCE8A2] rounded-full text-xs font-black shadow-2xs transition-all active:scale-95 cursor-pointer"
                    title="Запустить видеоурок в реальном времени"
                  >
                    <Video className="w-4 h-4 text-[#5C8519]" />
                    <span className="hidden xs:inline">Видеоурок</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="p-2 text-[#6B758E] hover:text-[#161F38] hover:bg-[#FFF7EE] rounded-full transition-colors cursor-pointer"
                    title="Поиск по диалогу"
                  >
                    <Search className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => fetchMessengerData()}
                    className="p-2 text-[#6B758E] hover:text-[#161F38] hover:bg-[#FFF7EE] rounded-full transition-colors cursor-pointer"
                    title="Обновить историю"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 2. Top Audio Player Bar (Matching screenshot when voice note is played) */}
              {playingAudio && (
                <div className="bg-white/95 border-b border-[#F2DECE] px-4 py-2 flex items-center justify-between gap-3 text-xs z-10 shrink-0 shadow-2xs animate-in slide-in-from-top-2 duration-150">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() =>
                        setPlayingAudio((prev) => (prev ? { ...prev, isPlaying: !prev.isPlaying } : null))
                      }
                      className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#FF6B4A] to-[#FFA259] text-white flex items-center justify-center shrink-0 cursor-pointer shadow-xs"
                    >
                      {playingAudio.isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                    </button>
                    <div className="truncate">
                      <p className="font-extrabold text-[#161F38] truncate">{playingAudio.title}</p>
                      <p className="text-[10px] text-[#6B758E]">{playingAudio.duration}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setPlayingAudio((prev) =>
                          prev ? { ...prev, speed: prev.speed === 1 ? 1.5 : prev.speed === 1.5 ? 2 : 1 } : null
                        )
                      }
                      className="px-2 py-0.5 bg-[#FFF7EE] border border-[#F2DECE] rounded-md font-bold text-[10px] text-[#FF6B4A] cursor-pointer"
                    >
                      {playingAudio.speed}x
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlayingAudio(null)}
                      className="p-1 text-[#8E99AF] hover:text-[#161F38] cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* 3. Messages Feed with Educational Doodle Wallpaper */}
              <div
                className="flex-1 p-3 sm:p-5 overflow-y-auto space-y-3.5 touch-pan-y"
                style={{
                  backgroundImage: `radial-gradient(#F2DECE 1px, transparent 1px)`,
                  backgroundSize: '24px 24px',
                }}
              >
                {/* Date Divider (Matching Telegram "16 сентября", "сегодня") */}
                <div className="flex justify-center my-3">
                  <span className="px-3 py-1 bg-white/90 backdrop-blur-xs border border-[#F2DECE] rounded-full text-[11px] font-black text-[#6B758E] shadow-2xs">
                    Сегодня
                  </span>
                </div>

                {/* System Call Log Cards (Exactly matching screenshot: "📞 Входящий звонок. Завершён • 0:40") */}
                <div className="flex justify-start">
                  <div className="bg-white/95 border border-[#F2DECE] rounded-2xl p-3 shadow-xs max-w-sm flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#EAF7CF] border border-[#CCE8A2] text-[#5C8519] flex items-center justify-center shrink-0">
                      <PhoneIncoming className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs text-[#161F38] flex items-center gap-1">
                        <span>Входящий видеоурок</span>
                      </h4>
                      <p className="text-[11px] text-[#6B758E]">Завершён • 45 мин • 12:00</p>
                    </div>
                  </div>
                </div>

                {/* Messages from Supabase */}
                {activeConversation.messages.map((msg) => {
                  const isMe = msg.sender_id === currentUser?.id;

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1 text-[10px] text-[#8E99AF] mb-0.5 px-1 font-semibold">
                        <span>{isMe ? 'Вы' : activeConversation.contact.fullName}</span>
                        <span>• {formatMsgTime(msg.created_at)}</span>
                      </div>

                      <div
                        className={`px-4 py-2.5 rounded-2xl max-w-[85%] sm:max-w-[70%] break-words text-sm shadow-xs transition-all ${
                          isMe
                            ? 'bg-gradient-to-tr from-[#FF6B4A] to-[#FFA259] text-white rounded-br-xs shadow-orange-500/10'
                            : 'bg-white text-[#161F38] rounded-bl-xs border border-[#F2DECE]'
                        }`}
                      >
                        {/* Voice message rendering if audio (Matching screenshot audio waveform card!) */}
                        {msg.file_type?.startsWith('audio/') || msg.voice_duration_sec ? (
                          <div className="flex items-center gap-3 py-1 min-w-[220px]">
                            <button
                              type="button"
                              onClick={() =>
                                setPlayingAudio({
                                  id: msg.id,
                                  title: isMe ? 'Ваше голосовое' : activeConversation.contact.fullName,
                                  duration: `0:${String(msg.voice_duration_sec || 30).padStart(2, '0')}`,
                                  speed: 1,
                                  isPlaying: true,
                                })
                              }
                              className={`w-9 h-9 rounded-full flex items-center justify-center cursor-pointer shadow-xs shrink-0 ${
                                isMe ? 'bg-white text-[#FF6B4A]' : 'bg-[#FF6B4A] text-white'
                              }`}
                            >
                              <Play className="w-4 h-4 ml-0.5" />
                            </button>

                            {/* Simulated Telegram Audio Waveform */}
                            <div className="flex-1 flex items-center gap-0.5">
                              {[6, 12, 18, 24, 15, 8, 20, 26, 14, 18, 10, 16, 22, 12, 18, 8, 14].map((h, i) => (
                                <span
                                  key={i}
                                  style={{ height: `${h}px` }}
                                  className={`w-1 rounded-full ${isMe ? 'bg-white/70' : 'bg-[#FF6B4A]/60'}`}
                                />
                              ))}
                            </div>

                            <span className="text-[10px] font-black shrink-0">
                              0:{String(msg.voice_duration_sec || 30).padStart(2, '0')}
                            </span>
                          </div>
                        ) : null}

                        {/* Image Attachment */}
                        {msg.file_url && msg.file_type?.startsWith('image/') && (
                          <div className="mb-2 overflow-hidden rounded-xl border border-white/20">
                            <a href={msg.file_url} target="_blank" rel="noreferrer">
                              <img
                                src={msg.file_url}
                                alt="Прикрепленное фото"
                                className="max-h-60 w-auto object-cover rounded-xl hover:opacity-95 transition-opacity"
                              />
                            </a>
                          </div>
                        )}

                        {/* File Attachment */}
                        {msg.file_url && !msg.file_type?.startsWith('image/') && (
                          <div className="mb-1.5">
                            <a
                              href={msg.file_url}
                              target="_blank"
                              rel="noreferrer"
                              download
                              className={`flex items-center gap-2 p-2 rounded-xl text-xs font-bold transition-colors ${
                                isMe ? 'bg-white/20 text-white' : 'bg-[#FFF7EE] hover:bg-[#FDEEDC] text-[#161F38] border border-[#F2DECE]'
                              }`}
                            >
                              <FileText className="w-4 h-4 shrink-0" />
                              <span className="truncate max-w-[150px]">Файл занятия</span>
                              <Download className="w-3.5 h-3.5 ml-auto opacity-70" />
                            </a>
                          </div>
                        )}

                        {/* Text */}
                        {msg.text && <div className="leading-relaxed">{msg.text}</div>}

                        {/* Time & Double Checks */}
                        <div
                          className={`text-[10px] mt-1 flex items-center justify-end gap-1 ${
                            isMe ? 'text-white/80' : 'text-[#8E99AF]'
                          }`}
                        >
                          <span>{formatMsgTime(msg.created_at)}</span>
                          {isMe && <CheckCheck className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div ref={messagesEndRef} />
              </div>

              {/* 4. Attached File Preview Chip */}
              {attachedFile && (
                <div className="px-4 py-2 bg-[#FFF0E6] border-t border-[#F2DECE] flex items-center justify-between gap-2 text-xs shrink-0">
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-4 h-4 text-[#FF6B4A] shrink-0" />
                    <span className="font-bold text-[#161F38] truncate">{attachedFile.name}</span>
                    <span className="text-[10px] text-[#6B758E]">
                      ({Math.round(attachedFile.file.size / 1024)} КБ)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttachedFile(null)}
                    className="p-1 text-[#6B758E] hover:text-rose-500 rounded-lg cursor-pointer transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* 5. Bottom Input Bar (Telegram style matching screenshot) */}
              <div className="p-2.5 sm:p-3 bg-white/95 backdrop-blur-md border-t border-[#F2DECE] shrink-0">
                {/* Emoji Picker Popover */}
                {showEmojiPicker && (
                  <div className="mb-2 p-2.5 bg-white border border-[#F2DECE] rounded-2xl shadow-xl flex items-center gap-2 text-xl overflow-x-auto no-scrollbar animate-in slide-in-from-bottom-2">
                    {['😊', '🧡', '👍', '👏', '⭐', '📚', '✍️', '🎉', '🧠', '🎈', '❤️', '🔥'].map((em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => setInputText((prev) => prev + em)}
                        className="p-1 hover:scale-125 transition-transform cursor-pointer"
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                )}

                {/* Voice Recording Mode */}
                {isRecordingVoice ? (
                  <div className="flex items-center justify-between gap-3 bg-[#FFF0E6] border border-[#F2DECE] p-2.5 rounded-full animate-pulse">
                    <div className="flex items-center gap-2 text-[#FF6B4A] font-extrabold text-xs pl-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                      <span>Идет запись голоса: 0:{String(recordSeconds).padStart(2, '0')}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={cancelRecordVoice}
                        className="px-3 py-1.5 rounded-full text-xs font-bold text-[#6B758E] hover:bg-white cursor-pointer"
                      >
                        Отмена
                      </button>
                      <button
                        type="button"
                        onClick={toggleRecordVoice}
                        className="px-4 py-1.5 rounded-full bg-gradient-to-tr from-[#FF6B4A] to-[#FFA259] text-white font-black text-xs shadow-xs cursor-pointer"
                      >
                        Отправить
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSendMessage} className="flex items-center gap-1.5 sm:gap-2">
                    {/* Hidden file input */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept="image/*,.pdf,.doc,.docx,.txt"
                      className="hidden"
                    />

                    {/* Attachment button (+) */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="w-10 h-10 rounded-full bg-[#FFF0E6] hover:bg-[#FDEEDC] text-[#FF6B4A] border border-[#F2DECE] flex items-center justify-center transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                      title="Прикрепить файл или фото"
                    >
                      {isUploading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-[#FF6B4A]" />
                      ) : (
                        <span className="text-xl font-bold leading-none mb-0.5">+</span>
                      )}
                    </button>

                    {/* Input field */}
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Сообщение..."
                      className="flex-1 bg-[#FFF7EE] focus:bg-white border border-[#F2DECE] focus:border-[#FF6B4A] rounded-full px-4 py-2.5 text-xs sm:text-sm text-[#161F38] placeholder-[#8E99AF] outline-none transition-all"
                    />

                    {/* Emoji toggle */}
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="p-2 text-[#8E99AF] hover:text-[#161F38] hover:bg-[#FFF7EE] rounded-full cursor-pointer transition-colors"
                      title="Смайлики"
                    >
                      <Smile className="w-5 h-5" />
                    </button>

                    {/* Voice recorder button or Send button */}
                    {!inputText.trim() && !attachedFile ? (
                      <button
                        type="button"
                        onClick={toggleRecordVoice}
                        className="w-10 h-10 rounded-full bg-[#FFF0E6] hover:bg-[#FDEEDC] text-[#FF6B4A] border border-[#F2DECE] flex items-center justify-center transition-colors cursor-pointer shrink-0"
                        title="Записать голосовое сообщение"
                      >
                        <Mic className="w-4 h-4 text-[#FF6B4A]" />
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={isSending || isUploading}
                        className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#FF6B4A] to-[#FFA259] hover:opacity-95 disabled:opacity-50 text-white flex items-center justify-center shadow-md shadow-orange-500/20 transition-transform active:scale-95 cursor-pointer shrink-0"
                        title="Отправить сообщение"
                      >
                        {isSending ? (
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                        ) : (
                          <Send className="w-4 h-4 ml-0.5" />
                        )}
                      </button>
                    )}
                  </form>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#8E99AF]">
              <div className="w-16 h-16 rounded-3xl bg-[#FFF0E6] border border-[#F2DECE] flex items-center justify-center text-[#FF6B4A] mb-3 shadow-xs">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="font-black text-base text-[#161F38] mb-1">
                Выберите диалог слева
              </h3>
              <p className="text-xs text-[#8E99AF] max-w-sm">
                Мессенджер центра «АйДаУмничка» позволяет обмениваться сообщениями, учебными материалами и мгновенно подключаться к видеоурокам.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
