'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  PhoneOff,
  Layout,
  Maximize2,
  Minimize2,
  ExternalLink,
  Wifi,
  Users,
  MessageSquare,
  Send,
  X,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  Plus,
  Volume2,
  VolumeX,
  Paperclip,
  FileText,
  Download,
  Loader2,
  RefreshCw,
  Hand,
  LayoutGrid,
  LayoutDashboard,
  CheckCircle2,
  AlertCircle,
  Activity,
  Copy,
  Check,
  Wrench,
  HelpCircle,
  Info,
  ShieldAlert,
} from 'lucide-react';
import { broadcastPlatformEvent } from '@/lib/platformNotifications';
import { formatTime, formatTimeTolyatti } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { initLiveKitCall, LiveKitSession } from '@/lib/livekitClient';

export interface ChatAttachment {
  name: string;
  url: string;
  type: string;
  size: number;
  isImage?: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'teacher' | 'student';
  text: string;
  time: string;
  attachment?: ChatAttachment;
}

interface VideoCallProps {
  roomToken: string;
  isTeacher?: boolean;
  participantName?: string;
  topic?: string;
  onEndLesson?: (durationSec: number, deductBalance?: boolean) => void;
  onToggleWhiteboard?: () => void;
  isWhiteboardActive?: boolean;
  isPlatformMinimized?: boolean;
  onTogglePlatformMinimize?: (minimized: boolean) => void;
  onExitToCabinet?: () => void;
}

const rtcConfig: RTCConfiguration = {
  iceServers: [
    // 1. Global Google Anycast STUN (Fastest <20ms public IP resolution across Russian ISPs)
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    // 2. Cloudflare Anycast STUN
    { urls: 'stun:stun.cloudflare.com:3478' },
    // 3. OpenRelay / Metered STUN & TURN (Reliable NAT traversal + TCP 443 relay when direct UDP is blocked)
    { urls: 'stun:openrelay.metered.ca:80' },
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp',
        'turn:openrelay.metered.ca:80?transport=tcp',
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    // 4. Nextcloud STUN over 443 & 3478
    { urls: 'stun:stun.nextcloud.com:443' },
    { urls: 'stun:stun.nextcloud.com:3478' },
  ],
  iceCandidatePoolSize: 10,
  iceTransportPolicy: 'all',
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
};

const PiPIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <rect x="12" y="11" width="8" height="7" rx="1" fill="currentColor" fillOpacity="0.25" />
  </svg>
);

export default function VideoCall({
  roomToken,
  isTeacher = false,
  participantName,
  topic,
  onEndLesson,
  onToggleWhiteboard,
  isWhiteboardActive = false,
  isPlatformMinimized: propPlatformMinimized,
  onTogglePlatformMinimize,
  onExitToCabinet,
}: VideoCallProps) {
  const router = useRouter();

  // Helper to clean technical metadata from participant name
  const cleanDisplayName = (name: string): string => {
    if (!name) return '';
    return name.replace(/\s*\(.*?\)$/, '').trim();
  };

  // Resolve participant label based on role
  const [peerProvidedName, setPeerProvidedName] = useState<string>('');

  const isGeneric = (n?: string) =>
    !n ||
    n === 'Преподаватель' ||
    n === 'Ученик' ||
    n === 'Ученик центра';

  // Priority: 1. If lesson already specified exact teacher/student name (e.g. 'Юлия Павловна'), keep it!
  // 2. Otherwise use peerProvidedName
  // 3. Fallback to generic role title
  const rawParticipant =
    (!isGeneric(participantName) ? participantName : null) ||
    (!isGeneric(peerProvidedName) ? peerProvidedName : null) ||
    participantName ||
    (isTeacher ? 'Ученик центра' : 'Преподаватель');
  const resolvedParticipantName = cleanDisplayName(rawParticipant);

  const [micActive, setMicActive] = useState(true);
  const [remoteMicActive, setRemoteMicActive] = useState(true);
  const [camActive, setCamActive] = useState(true);
  const [remoteCamActive, setRemoteCamActive] = useState(true);
  const [isSwapped, setIsSwapped] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRemoteScreenSharing, setIsRemoteScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isPipActive, setIsPipActive] = useState(false);
  const [isPipMinimized, setIsPipMinimized] = useState(false);
  const [internalPlatformMinimized, setInternalPlatformMinimized] = useState(false);
  const isPlatformMinimized =
    propPlatformMinimized !== undefined ? propPlatformMinimized : internalPlatformMinimized;
  const [isIPhone, setIsIPhone] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  // Vertical / Portrait orientation for mobile phone video calls & screens
  const [isVerticalMode, setIsVerticalMode] = useState(true);

  // VK-Style Video Call States
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const facingModeRef = useRef<'user' | 'environment'>('user');
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [peerHandNotification, setPeerHandNotification] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [areControlsVisible, setAreControlsVisible] = useState(true);
  const [showTeacherEndModal, setShowTeacherEndModal] = useState(false);

  // LiveKit SFU Cloud states (Dual Account balancer & failover)
  const [activeEngine, setActiveEngine] = useState<'livekit' | 'p2p'>('p2p');
  const [livekitAccount, setLivekitAccount] = useState<'account1' | 'account2' | null>(null);
  const [livekitAccountName, setLivekitAccountName] = useState<string>('');
  const livekitSessionRef = useRef<LiveKitSession | null>(null);
  const isLiveKitActiveRef = useRef<boolean>(false);

  // Lesson In-Call Chat states
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [attachedFile, setAttachedFile] = useState<{
    name: string;
    url: string;
    type: string;
    size: number;
    isImage?: boolean;
  } | null>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const chatMessagesContainerRef = useRef<HTMLDivElement | null>(null);
  const chatInputRef = useRef<HTMLInputElement | null>(null);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const [viewportOffsetTop, setViewportOffsetTop] = useState<number>(0);

  const scrollChatToBottom = (smooth = true) => {
    if (chatMessagesContainerRef.current) {
      chatMessagesContainerRef.current.scrollTo({
        top: chatMessagesContainerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
  };

  // Pin chat to visual viewport when mobile keyboard is open, and restore 100% full height cleanly on dismiss
  useEffect(() => {
    if (!isChatOpen) return;

    const handleViewportChange = () => {
      if (typeof window === 'undefined') return;
      const vv = window.visualViewport;
      if (!vv) return;

      const keyboardOpen = window.innerHeight - vv.height > 120;
      setIsKeyboardOpen(keyboardOpen);

      if (keyboardOpen) {
        setViewportHeight(vv.height);
        setViewportOffsetTop(vv.offsetTop);
      } else {
        setViewportHeight(null);
        setViewportOffsetTop(0);
      }

      if (window.scrollY !== 0 || window.scrollX !== 0) {
        window.scrollTo(0, 0);
      }
    };

    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    if (vv) {
      vv.addEventListener('resize', handleViewportChange);
      vv.addEventListener('scroll', handleViewportChange);
    }
    window.addEventListener('scroll', handleViewportChange);
    window.addEventListener('resize', handleViewportChange);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      if (vv) {
        vv.removeEventListener('resize', handleViewportChange);
        vv.removeEventListener('scroll', handleViewportChange);
      }
      window.removeEventListener('scroll', handleViewportChange);
      window.removeEventListener('resize', handleViewportChange);
      document.body.style.overflow = prevOverflow;
      window.scrollTo(0, 0);
    };
  }, [isChatOpen]);

  // Detect iOS / iPhone for screen sharing capability & mobile default orientation
  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent || '';
      const isApple = /iPhone|iPod/.test(ua) || (/iPad/.test(ua) && navigator.maxTouchPoints > 1);
      setIsIPhone(isApple);
    }
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      setIsVerticalMode(true);
    }
  }, []);

  // WebRTC Audio element & playback unlock states
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isAudioAutoplayBlocked, setIsAudioAutoplayBlocked] = useState(false);

  // Diagnostic Logs & Real-time Breakdown Alerts
  const [diagnosticLogs, setDiagnosticLogs] = useState<
    Array<{ id: string; time: string; level: 'info' | 'warn' | 'error' | 'success'; message: string; detail?: string }>
  >([]);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [copiedLogSuccess, setCopiedLogSuccess] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [microphoneError, setMicrophoneError] = useState<string | null>(null);
  const [currentIceState, setCurrentIceState] = useState<string>('new');
  const [currentSignalingStatus, setCurrentSignalingStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [dismissedAlertKey, setDismissedAlertKey] = useState<string | null>(null);

  const addLog = (level: 'info' | 'warn' | 'error' | 'success', message: string, detail?: any) => {
    const timeStr =
      new Date().toLocaleTimeString('ru-RU', { hour12: false }) +
      '.' +
      String(new Date().getMilliseconds()).padStart(3, '0');
    const detailStr = detail ? (typeof detail === 'object' ? JSON.stringify(detail) : String(detail)) : undefined;
    setDiagnosticLogs((prev) => [
      { id: Math.random().toString(36).slice(2, 9), time: timeStr, level, message, detail: detailStr },
      ...prev.slice(0, 49),
    ]);
  };

  // Global error listener to capture any unhandled exceptions on device (ignoring 3rd party browser extensions)
  useEffect(() => {
    const isExtensionError = (src?: string, text?: string) => {
      const s = `${src || ''} ${text || ''}`;
      return (
        s.includes('chrome-extension://') ||
        s.includes('moz-extension://') ||
        s.includes('safari-extension://') ||
        s.includes('eppiocemhmnlbhjplcgkofciiegomcon') ||
        s.includes('M_ID')
      );
    };

    const handleGlobalError = (event: ErrorEvent) => {
      if (isExtensionError(event.filename, event.message)) return;
      addLog(
        'error',
        `Сбой в JS: ${event.message}`,
        event.filename ? `${event.filename}:${event.lineno}` : undefined
      );
    };
    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const stack = String(reason?.stack || '');
      const msg = reason?.message || String(reason);
      if (isExtensionError(stack, msg)) return;
      addLog('error', `Необработанная ошибка (Promise): ${msg}`, reason?.stack);
    };
    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  // Sync deafen state to remote audio & video tracks
  useEffect(() => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = isDeafened;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = true; // Video element is always muted; audio is handled by dedicated <audio>
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !isDeafened && remoteMicActive;
      });
    }
  }, [isDeafened, remoteMicActive]);

  const timerStartTimeRef = useRef<number | null>(null);

  // Synchronize start timestamp across peers and Supabase so both devices match down to the second
  const syncTimerWithTimestamp = (peerStartMs: number | null | undefined) => {
    if (!peerStartMs || isNaN(peerStartMs) || peerStartMs <= 0) return;

    // Use the earliest start timestamp so neither participant has a lagging timer
    const currentStart = timerStartTimeRef.current;
    const authoritativeStart =
      currentStart && currentStart > 0 ? Math.min(currentStart, peerStartMs) : peerStartMs;

    if (timerStartTimeRef.current !== authoritativeStart) {
      timerStartTimeRef.current = authoritativeStart;
      try {
        localStorage.setItem(`aida_lesson_started_${roomToken}`, String(authoritativeStart));
      } catch (_) {}
      const elapsed = Math.max(0, Math.floor((Date.now() - authoritativeStart) / 1000));
      setCallDuration(elapsed);
    }
  };

  // User gesture unlock for audio & iOS background keep-alive
  useEffect(() => {
    let audioCtx: AudioContext | null = null;
    let osc: OscillatorNode | null = null;

    const unlockAudio = () => {
      // 1. Play WebRTC remote audio element
      if (remoteAudioRef.current && remoteStreamRef.current) {
        const aTracks = remoteStreamRef.current.getAudioTracks();
        if (aTracks.length > 0 && !remoteAudioRef.current.srcObject) {
          remoteAudioRef.current.srcObject = new MediaStream(aTracks);
        }
        if (remoteAudioRef.current.paused) {
          remoteAudioRef.current
            .play()
            .then(() => setIsAudioAutoplayBlocked(false))
            .catch(() => {});
        }
      }

      // 2. Web Audio keep-alive oscillator (maintains iOS audio session in background)
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx && !audioCtx) {
          audioCtx = new AudioCtx();
          osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          gain.gain.value = 0.0001; // virtually silent
          osc.frequency.value = 440;
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start();
        }
      } catch (_) {}
    };

    window.addEventListener('click', unlockAudio, { passive: true });
    window.addEventListener('touchstart', unlockAudio, { passive: true });

    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      try {
        osc?.stop();
        audioCtx?.close();
      } catch (_) {}
    };
  }, []);

  // Initialize or restore timer from localStorage immediately upon mount
  useEffect(() => {
    if (!roomToken) return;
    try {
      const savedStart = localStorage.getItem(`aida_lesson_started_${roomToken}`);
      if (savedStart) {
        const ms = parseInt(savedStart, 10);
        if (!isNaN(ms) && ms > 0) {
          timerStartTimeRef.current = ms;
          const elapsed = Math.max(0, Math.floor((Date.now() - ms) / 1000));
          setCallDuration(elapsed);
        }
      }
    } catch (_) {}
  }, [roomToken]);

  // Load chat history & authoritative timer start from Supabase on mount/roomToken change
  useEffect(() => {
    if (!roomToken) return;
    let isCancelled = false;

    fetch(`/api/room/messages?roomToken=${encodeURIComponent(roomToken)}`)
      .then((res) => res.json())
      .then((data) => {
        if (isCancelled) return;
        if (Array.isArray(data?.messages)) {
          setChatMessages(data.messages);
        }

        // Restore start timestamp from Supabase if present and lesson is active
        if (data?.startedAt && data.status !== 'completed') {
          const serverStartMs = new Date(data.startedAt).getTime();
          if (!isNaN(serverStartMs) && serverStartMs > 0) {
            syncTimerWithTimestamp(serverStartMs);
          }
        }
      })
      .catch((err) => console.warn('Could not load room messages:', err));

    return () => {
      isCancelled = true;
    };
  }, [roomToken]);

  // WebRTC P2P states
  const [hasRemoteStream, setHasRemoteStream] = useState(false);
  const [isPeerInRoom, setIsPeerInRoom] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'waiting'>('waiting');

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const pipVideoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<any>(null);
  const candidateQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const myPeerIdRef = useRef<string>(
    typeof window !== 'undefined' && window.sessionStorage
      ? window.sessionStorage.getItem(`webrtc_peer_${roomToken}_${isTeacher ? 'teacher' : 'student'}`) ||
        (() => {
          const id = `peer_${isTeacher ? 'teacher' : 'student'}_${Math.random().toString(36).slice(2, 9)}`;
          try {
            window.sessionStorage.setItem(`webrtc_peer_${roomToken}_${isTeacher ? 'teacher' : 'student'}`, id);
          } catch (_) {}
          return id;
        })()
      : `peer_${isTeacher ? 'teacher' : 'student'}_${Math.random().toString(36).slice(2, 9)}`
  );

  // Duration clock — ONLY starts counting when both participants are connected in the room, and continues across reloads!
  useEffect(() => {
    // If both participants are in room and timer hasn't started yet: initialize it now!
    if (hasRemoteStream && !timerStartTimeRef.current) {
      const now = Date.now();
      timerStartTimeRef.current = now;
      try {
        localStorage.setItem(`aida_lesson_started_${roomToken}`, String(now));
      } catch (_) {}

      // Inform peer via realtime broadcast
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'timer-started',
          payload: { startedAt: now },
        });
      }

      const storedName =
        (typeof window !== 'undefined' &&
          (localStorage.getItem('aida_full_name') || localStorage.getItem('aida_user_name'))) ||
        '';
      const cleanStored = storedName.replace(/\s*\(.*?\)$/, '').trim();
      const currentTeacherName = isTeacher
        ? cleanStored || 'Василина Владимировна'
        : participantName && participantName !== 'Преподаватель'
        ? participantName
        : 'Василина Владимировна';
      const currentStudentName = isTeacher
        ? participantName && participantName !== 'Ученик центра'
          ? participantName
          : 'Ученик'
        : cleanStored || 'Ученик';

      // Broadcast platform-level lesson start notification
      broadcastPlatformEvent('lesson-started', {
        room_token: roomToken,
        topic: topic || 'Индивидуальное занятие: Логопедия',
        teacher_name: currentTeacherName,
        student_name: currentStudentName,
      });

      // Persist started_at in database
      fetch('/api/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start_room',
          room_token: roomToken,
          started_at: new Date(now).toISOString(),
          teacher_name: currentTeacherName,
          student_name: currentStudentName,
          topic: topic || 'Индивидуальное занятие: Логопедия',
        }),
      }).catch(() => {});
    }

    // Tick every second if timer is active
    const timer = setInterval(() => {
      if (timerStartTimeRef.current) {
        const elapsed = Math.max(0, Math.floor((Date.now() - timerStartTimeRef.current) / 1000));
        setCallDuration(elapsed);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [hasRemoteStream, roomToken]);

  // Keep remote audio & video elements updated with remoteStreamRef
  useEffect(() => {
    if (remoteStreamRef.current) {
      if (remoteAudioRef.current && remoteAudioRef.current.srcObject !== remoteStreamRef.current) {
        remoteAudioRef.current.srcObject = remoteStreamRef.current;
        remoteAudioRef.current.muted = isDeafened;
        remoteAudioRef.current
          .play()
          .then(() => setIsAudioAutoplayBlocked(false))
          .catch((err) => {
            console.warn('[WebRTC] Audio autoPlay blocked by policy:', err);
            setIsAudioAutoplayBlocked(true);
          });
      }

      if (remoteVideoRef.current && !isSwapped && remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
        remoteVideoRef.current.muted = true;
        remoteVideoRef.current.play().catch(() => {});
      }
    }

    // Re-verify local microphone tracks are enabled
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = micActive;
      });
    }
    if (pcRef.current) {
      pcRef.current.getSenders().forEach((sender) => {
        if (sender.track && sender.track.kind === 'audio') {
          sender.track.enabled = micActive;
        }
      });
    }
  }, [hasRemoteStream, isDeafened, remoteMicActive, isWhiteboardActive, isPipMinimized, isChatOpen, isPlatformMinimized]);

  // WebRTC PeerConnection management & stream helpers
  const cameraPromiseRef = useRef<Promise<MediaStream | null> | null>(null);
  const isNegotiatingRef = useRef(false);
  const lastOfferSentRef = useRef<number>(0);

  // Helper to create a dummy video track so WebRTC negotiation never fails if camera is unavailable
  const createDummyVideoTrack = (): MediaStreamTrack | null => {
    try {
      if (typeof document !== 'undefined') {
        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = 240;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#161F38';
          ctx.fillRect(0, 0, 320, 240);
        }
        if (typeof (canvas as any).captureStream === 'function') {
          const stream = (canvas as any).captureStream(1);
          if (stream && stream.getVideoTracks()[0]) return stream.getVideoTracks()[0];
        }
      }
    } catch (_) {}
    return null;
  };

  // Helper to create a silent audio track so WebRTC negotiation never fails if mic is unavailable
  const createSilentAudioTrack = (): MediaStreamTrack | null => {
    try {
      if (typeof window !== 'undefined') {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const osc = ctx.createOscillator();
          const dst = ctx.createMediaStreamDestination();
          osc.connect(dst);
          osc.start();
          const track = dst.stream.getAudioTracks()[0];
          if (track) {
            track.enabled = false;
            return track;
          }
        }
      }
    } catch (_) {}
    return null;
  };

  const resetPeerConnection = () => {
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch (_) {}
      pcRef.current = null;
    }
    candidateQueueRef.current = [];
    if (!isLiveKitActiveRef.current) {
      remoteStreamRef.current = null;
      setHasRemoteStream(false);
    }
    isNegotiatingRef.current = false;
    lastOfferSentRef.current = 0;
  };

  const ensureLocalStream = async (): Promise<MediaStream> => {
    if (streamRef.current && streamRef.current.getTracks().length > 0) {
      return streamRef.current;
    }
    if (cameraPromiseRef.current) {
      const existing = await cameraPromiseRef.current;
      if (existing && existing.getTracks().length > 0) return existing;
    }
    const p = startCamera();
    cameraPromiseRef.current = p;
    const res = await p;
    return res || streamRef.current || new MediaStream();
  };

  // Helper to wait for ICE gathering completion or timeout so candidates are embedded in SDP
  const waitForIceGathering = (pc: RTCPeerConnection): Promise<void> => {
    return new Promise((resolve) => {
      if (pc.iceGatheringState === 'complete') {
        resolve();
        return;
      }
      let timeoutId: NodeJS.Timeout;
      const checkState = () => {
        if (pc.iceGatheringState === 'complete') {
          pc.removeEventListener('icegatheringstatechange', checkState);
          clearTimeout(timeoutId);
          resolve();
        }
      };
      pc.addEventListener('icegatheringstatechange', checkState);
      timeoutId = setTimeout(() => {
        pc.removeEventListener('icegatheringstatechange', checkState);
        resolve();
      }, 800); // 800ms gives plenty of time for fast Anycast STUNs without delaying call setup
    });
  };

  // WebRTC PeerConnection factory
  const getOrCreatePeerConnection = (stream: MediaStream): RTCPeerConnection => {
    if (pcRef.current && pcRef.current.signalingState !== 'closed') {
      return pcRef.current;
    }

    const pc = new RTCPeerConnection(rtcConfig);
    pcRef.current = pc;

    // Attach local media tracks (video & audio)
    const attachedKinds = new Set<string>();
    stream.getTracks().forEach((track) => {
      try {
        pc.addTrack(track, stream);
        attachedKinds.add(track.kind);
      } catch (_) {}
    });

    // Ensure audio and video transceivers exist so remote media can always be negotiated & received
    if (!attachedKinds.has('audio')) {
      try {
        pc.addTransceiver('audio', { direction: 'sendrecv' });
      } catch (_) {}
    }
    if (!attachedKinds.has('video')) {
      try {
        pc.addTransceiver('video', { direction: 'sendrecv' });
      } catch (_) {}
    }

    // Handle remote tracks (audio & video from student or teacher)
    pc.ontrack = (event) => {
      console.log('[WebRTC] Received remote track:', event.track.kind, event.track.id);
      addLog('success', `Получен удаленный медиа-трек: ${event.track.kind}`);
      const incomingStream = event.streams && event.streams[0] ? event.streams[0] : (remoteStreamRef.current || new MediaStream());
      if (!incomingStream.getTracks().some((t) => t.id === event.track.id)) {
        incomingStream.addTrack(event.track);
      }
      remoteStreamRef.current = incomingStream;
      setHasRemoteStream(true);
      setConnectionStatus('connected');

      if (event.track.kind === 'audio') {
        event.track.enabled = !isDeafened && remoteMicActive;
      }

      // 1. Dedicated audio element
      if (remoteAudioRef.current) {
        if (remoteAudioRef.current.srcObject !== incomingStream) {
          remoteAudioRef.current.srcObject = incomingStream;
        }
        remoteAudioRef.current.muted = isDeafened;
        remoteAudioRef.current
          .play()
          .then(() => setIsAudioAutoplayBlocked(false))
          .catch((err) => {
            console.warn('[WebRTC] Remote audio autoPlay blocked:', err);
            setIsAudioAutoplayBlocked(true);
            addLog('warn', 'Звук собеседника заглушен браузером (требуется нажатие на экран)');
          });
      }

      // 2. Video element
      if (remoteVideoRef.current) {
        if (event.track.kind === 'video' || remoteVideoRef.current.srcObject !== incomingStream) {
          remoteVideoRef.current.srcObject = incomingStream;
        }
        remoteVideoRef.current.muted = true;
        remoteVideoRef.current.play().catch(() => {});
      }

      // 3. Listen to unmute (first actual data packets received over network)
      event.track.onunmute = () => {
        console.log('[WebRTC] Remote track unmuted (media flowing):', event.track.kind);
        addLog('success', `Медиа-поток ${event.track.kind} активен (данные идут)`);
        setHasRemoteStream(true);
        setConnectionStatus('connected');
        if (remoteVideoRef.current) {
          if (event.track.kind === 'video') {
            remoteVideoRef.current.srcObject = incomingStream;
          }
          remoteVideoRef.current.play().catch(() => {});
        }
        if (remoteAudioRef.current) remoteAudioRef.current.play().catch(() => {});
      };

      if (event.track.readyState === 'live' && !event.track.muted && pc.connectionState === 'connected') {
        setHasRemoteStream(true);
        setConnectionStatus('connected');
      }
    };

    // Send local ICE candidates to peer with explicit fields
    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        const c = event.candidate;
        const candObj = typeof c.toJSON === 'function' ? c.toJSON() : {
          candidate: c.candidate,
          sdpMid: c.sdpMid,
          sdpMLineIndex: c.sdpMLineIndex,
          usernameFragment: c.usernameFragment,
        };
        channelRef.current.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: {
            candidate: candObj,
            senderId: myPeerIdRef.current,
          },
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state change:', pc.connectionState);
      if (isLiveKitActiveRef.current) {
        console.log('[WebRTC] LiveKit SFU active, suppressing P2P connectionState change');
        return;
      }
      addLog(
        pc.connectionState === 'connected' ? 'success' : pc.connectionState === 'failed' ? 'error' : 'info',
        `WebRTC соединение: ${pc.connectionState}`
      );
      if (pc.connectionState === 'connected') {
        setConnectionStatus('connected');
        setHasRemoteStream(true);
      } else if (pc.connectionState === 'connecting') {
        setConnectionStatus('connecting');
      } else if (pc.connectionState === 'disconnected') {
        console.warn('[WebRTC] Connection disconnected, waiting for reconnection...');
        addLog('warn', 'WebRTC соединение отключилось, ожидание переподключения...');
      } else if (pc.connectionState === 'failed') {
        console.warn('[WebRTC] Connection failed');
        addLog('error', 'Сбой WebRTC соединения (failed)');
        setConnectionStatus('connecting');
        setHasRemoteStream(false);
        // Only teacher initiates automatic reconnection recovery after backoff to prevent collisions
        if (isTeacher) {
          setTimeout(async () => {
            if (pcRef.current && pcRef.current.connectionState === 'failed' && !isLiveKitActiveRef.current) {
              addLog('info', 'Попытка автоматического восстановления соединения учителем...');
              resetPeerConnection();
              try {
                const stream = await ensureLocalStream();
                if (stream && channelRef.current) {
                  const newPc = getOrCreatePeerConnection(stream);
                  await createAndSendOffer(newPc);
                }
              } catch (_) {}
            }
          }, 3500);
        }
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[WebRTC] ICE connection state:', pc.iceConnectionState);
      if (isLiveKitActiveRef.current) {
        return;
      }
      setCurrentIceState(pc.iceConnectionState);
      addLog(
        pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed'
          ? 'success'
          : pc.iceConnectionState === 'failed'
          ? 'error'
          : 'info',
        `ICE статус (P2P): ${pc.iceConnectionState}`
      );
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setConnectionStatus('connected');
        setHasRemoteStream(true);
      } else if (pc.iceConnectionState === 'failed') {
        console.warn('[WebRTC] ICE failed across direct route');
        addLog('error', 'Сбой ICE (P2P маршрут не найден)');
        setConnectionStatus('connecting');
        setHasRemoteStream(false);
      }
    };

    return pc;
  };

  // Create and send SDP Offer
  const createAndSendOffer = async (pc: RTCPeerConnection) => {
    try {
      if (isNegotiatingRef.current || pc.signalingState !== 'stable') {
        console.log('[WebRTC] Skipping offer creation: busy or signaling not stable', {
          isNegotiating: isNegotiatingRef.current,
          signalingState: pc.signalingState,
        });
        return;
      }
      const now = Date.now();
      if (now - lastOfferSentRef.current < 4500) {
        console.log('[WebRTC] Throttling offer: an offer was sent recently (<4.5s ago)');
        return;
      }
      lastOfferSentRef.current = now;
      isNegotiatingRef.current = true;
      console.log('[WebRTC] Creating SDP offer...');
      addLog('info', 'Формирование и отправка WebRTC Offer...');
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);
      await waitForIceGathering(pc);

      const finalOffer = pc.localDescription || offer;
      if (channelRef.current && finalOffer) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'offer',
          payload: {
            sdp: {
              type: finalOffer.type,
              sdp: finalOffer.sdp,
            },
            senderId: myPeerIdRef.current,
          },
        });
        console.log('[WebRTC] SDP offer sent with embedded candidates');
        addLog('success', 'WebRTC Offer успешно отправлен собеседнику');
      }
    } catch (err: any) {
      console.warn('[WebRTC] Error creating offer:', err);
      addLog('error', 'Сбой формирования WebRTC Offer', err?.message || String(err));
    } finally {
      isNegotiatingRef.current = false;
    }
  };

  // Handle incoming SDP Offer (Callee)
  const handleRemoteOffer = async (sdp: RTCSessionDescriptionInit, stream: MediaStream) => {
    try {
      console.log('[WebRTC] Handling remote offer...');
      addLog('info', 'Получен WebRTC Offer, формирование ответа (Answer)...');
      const pc = getOrCreatePeerConnection(stream);
      if (pc.signalingState !== 'stable') {
        console.log('[WebRTC] Handling offer collision in state:', pc.signalingState);
        if (pc.signalingState === 'have-local-offer') {
          if (!isTeacher) {
            await pc.setLocalDescription({ type: 'rollback' } as any).catch(() => {});
          } else {
            return;
          }
        }
      }
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));

      // Flush queued ICE candidates
      while (candidateQueueRef.current.length > 0) {
        const cand = candidateQueueRef.current.shift();
        if (cand && (cand.candidate || cand.candidate === '')) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(cand));
          } catch (_) {}
        }
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await waitForIceGathering(pc);

      const finalAnswer = pc.localDescription || answer;
      if (channelRef.current && finalAnswer) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'answer',
          payload: {
            sdp: {
              type: finalAnswer.type,
              sdp: finalAnswer.sdp,
            },
            senderId: myPeerIdRef.current,
          },
        });
        console.log('[WebRTC] SDP answer sent with embedded candidates');
        addLog('success', 'WebRTC Answer отправлен собеседнику');
      }
    } catch (err: any) {
      console.warn('[WebRTC] Error handling offer:', err);
      addLog('error', 'Сбой обработки WebRTC Offer', err?.message || String(err));
    }
  };

  // Handle incoming SDP Answer (Caller)
  const handleRemoteAnswer = async (sdp: RTCSessionDescriptionInit) => {
    try {
      console.log('[WebRTC] Handling remote answer...');
      if (!pcRef.current) return;
      if (pcRef.current.signalingState !== 'have-local-offer') {
        console.warn('[WebRTC] Ignoring remote answer in unexpected state:', pcRef.current.signalingState);
        return;
      }
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
      addLog('success', 'Получен и применён WebRTC Answer от собеседника');

      // Flush queued ICE candidates
      while (candidateQueueRef.current.length > 0) {
        const cand = candidateQueueRef.current.shift();
        if (cand && (cand.candidate || cand.candidate === '')) {
          try {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(cand));
          } catch (_) {}
        }
      }
    } catch (err: any) {
      console.warn('[WebRTC] Error handling answer:', err);
      addLog('error', 'Сбой обработки WebRTC Answer', err?.message || String(err));
    }
  };

  // Manual reset & re-negotiation of WebRTC connection
  const handleRestartCall = async () => {
    addLog('warn', 'Инициирован ручной перезапуск видеосвязи...');
    resetPeerConnection();
    setHasRemoteStream(false);
    setConnectionStatus('connecting');
    setCurrentIceState('new');
    try {
      const stream = await ensureLocalStream();
      if (stream && channelRef.current) {
        const pc = getOrCreatePeerConnection(stream);
        await createAndSendOffer(pc);
        addLog('info', 'Новый WebRTC Offer сформирован после перезапуска');
      }
    } catch (err: any) {
      addLog('error', 'Ошибка при перезапуске видеосвязи', err?.message || String(err));
    }
  };

  // Manual LiveKit account switch (Account 1 ↔ Account 2)
  const handleSwitchLiveKitAccount = async (targetAccount: 'account1' | 'account2' | 'auto') => {
    addLog('warn', `Ручное переключение пула LiveKit на: ${targetAccount}...`);
    if (livekitSessionRef.current?.room) {
      try {
        livekitSessionRef.current.room.disconnect();
      } catch (_) {}
      livekitSessionRef.current = null;
    }
    setConnectionStatus('connecting');

    const myLocalName =
      (typeof window !== 'undefined' &&
        (localStorage.getItem('aida_full_name') ||
          localStorage.getItem('aida_user_name'))) ||
      (isTeacher ? 'Преподаватель' : 'Ученик');
    const myCleanName = myLocalName.replace(/\s*\(.*?\)$/, '').trim();

    const session = await initLiveKitCall({
      roomToken,
      identity: myPeerIdRef.current,
      name: myCleanName,
      isTeacher: Boolean(isTeacher),
      accountOverride: targetAccount,
      localVideoEl: localVideoRef.current,
      remoteVideoEl: remoteVideoRef.current,
      remoteAudioEl: remoteAudioRef.current,
      onConnected: (acc, accName) => {
        isLiveKitActiveRef.current = true;
        setActiveEngine('livekit');
        setLivekitAccount(acc);
        setLivekitAccountName(accName);
        setConnectionStatus('connected');
        if (pcRef.current) {
          try { pcRef.current.close(); } catch (_) {}
          pcRef.current = null;
        }
      },
      onDisconnected: (reason) => {
        isLiveKitActiveRef.current = false;
        setActiveEngine('p2p');
        addLog('warn', `Отключено от LiveKit: ${reason || 'завершение сессии'}`);
      },
      onLocalTracks: (stream) => {
        streamRef.current = stream;
        if (localVideoRef.current && localVideoRef.current.srcObject !== stream) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(() => {});
        }
      },
      onRemoteTrackReceived: (kind, stream) => {
        isLiveKitActiveRef.current = true;
        setHasRemoteStream(true);
        setConnectionStatus('connected');
        if (!remoteStreamRef.current) {
          remoteStreamRef.current = stream;
        } else {
          stream.getTracks().forEach((t) => {
            if (!remoteStreamRef.current?.getTracks().some((et) => et.id === t.id)) {
              remoteStreamRef.current?.addTrack(t);
            }
          });
        }
        if (remoteVideoRef.current && kind === 'video') {
          remoteVideoRef.current.srcObject = remoteStreamRef.current;
          remoteVideoRef.current.muted = true;
          remoteVideoRef.current.play().catch(() => {});
        }
        if (remoteAudioRef.current && kind === 'audio') {
          remoteAudioRef.current.srcObject = remoteStreamRef.current;
          remoteAudioRef.current.muted = isDeafened;
          remoteAudioRef.current.play().catch(() => {});
        }
      },
      onPeerJoined: (name) => {
        setIsPeerInRoom(true);
        setPeerProvidedName(name);
      },
      onPeerLeft: () => {
        setIsPeerInRoom(false);
      },
      onLog: addLog,
    });

    if (session) {
      livekitSessionRef.current = session;
      setActiveEngine('livekit');
      addLog('success', `Успешно переключено на ${session.accountName}`);
    } else {
      addLog('warn', 'Не удалось переключить аккаунт LiveKit, возврат к резервному каналу');
    }
  };

  // Copy structured diagnostic report for technical support / developer
  const copyDiagnosticReport = () => {
    const report = [
      `=== ОТЧЕТ ДИАГНОСТИКИ СВЯЗИ АЙДАУМНИЧКА ===`,
      `Время отчета: ${new Date().toISOString()}`,
      `Комната: ${roomToken}`,
      `Роль: ${isTeacher ? 'Учитель' : 'Ученик'} (${resolvedParticipantName})`,
      `Устройство: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown'}`,
      `Экран: ${typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'N/A'}`,
      `--- СТАТУСЫ СЕТИ И МЕДИА ---`,
      `Сигналинг Supabase: ${currentSignalingStatus}`,
      `Собеседник в сети: ${isPeerInRoom ? 'ДА' : 'НЕТ'}`,
      `Удаленный стрим: ${hasRemoteStream ? 'ПОЛУЧЕН' : 'НЕТ'}`,
      `WebRTC Connection State: ${pcRef.current?.connectionState || 'null'}`,
      `WebRTC ICE State: ${pcRef.current?.iceConnectionState || currentIceState}`,
      `WebRTC Signaling State: ${pcRef.current?.signalingState || 'null'}`,
      `Локальная камера: ${camActive ? 'ВКЛ' : 'ВЫКЛ'} (ошибка: ${cameraError || 'нет'})`,
      `Локальный микрофон: ${micActive ? 'ВКЛ' : 'ВЫКЛ'} (ошибка: ${microphoneError || 'нет'})`,
      `Звук заблокирован iOS: ${isAudioAutoplayBlocked ? 'ДА (требуется нажатие)' : 'НЕТ'}`,
      `Локальные треки: ${
        streamRef.current
          ?.getTracks()
          .map((t) => `${t.kind}:${t.enabled ? 'live' : 'disabled'}`)
          .join(', ') || 'нет'
      }`,
      `Удаленные треки: ${
        remoteStreamRef.current
          ?.getTracks()
          .map((t) => `${t.kind}:${t.enabled ? 'live' : 'disabled'}`)
          .join(', ') || 'нет'
      }`,
      `--- ЖУРНАЛ СОБЫТИЙ (ПОСЛЕДНИЕ ${diagnosticLogs.length}) ---`,
      ...diagnosticLogs.map(
        (l) => `[${l.time}] [${l.level.toUpperCase()}] ${l.message}${l.detail ? ` (${l.detail})` : ''}`
      ),
    ].join('\n');

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(report);
        setCopiedLogSuccess(true);
        setTimeout(() => setCopiedLogSuccess(false), 3000);
      }
    } catch (_) {}
  };

  // Handle incoming ICE candidate
  const handleRemoteIceCandidate = async (candidate: any) => {
    try {
      if (!candidate || (!candidate.candidate && candidate.candidate !== '')) return;
      if (pcRef.current && pcRef.current.remoteDescription && pcRef.current.remoteDescription.type) {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        candidateQueueRef.current.push(candidate);
      }
    } catch (err) {
      console.warn('[WebRTC] Error adding ICE candidate:', err);
    }
  };

  // Start local camera & microphone with progressive fallback
  const startCamera = async (targetFacing?: 'user' | 'environment'): Promise<MediaStream | null> => {
    try {
      const mode = targetFacing || facingModeRef.current;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      let stream: MediaStream | null = null;
      let acquiredVideo = false;
      let acquiredAudio = false;

      const isMobile =
        typeof window !== 'undefined' &&
        (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768);

      addLog('info', `Запрос камеры и микрофона (${isMobile ? 'мобильный' : 'ПК'})...`);

      // 1. Try mobile-friendly or ideal constraints
      try {
        stream = await navigator.mediaDevices.getUserMedia(
          isMobile
            ? {
                video: { facingMode: { ideal: mode } },
                audio: { echoCancellation: true, noiseSuppression: true },
              }
            : {
                video: {
                  facingMode: mode,
                  width: { ideal: 1280 },
                  height: { ideal: 720 },
                },
                audio: {
                  echoCancellation: true,
                  noiseSuppression: true,
                },
              }
        );
        acquiredVideo = true;
        acquiredAudio = true;
      } catch (err1) {
        console.warn('[WebRTC] Preferred constraints failed, trying basic video + audio...', err1);
        // 2. Try basic video + audio
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: isMobile ? true : { facingMode: mode },
            audio: true,
          });
          acquiredVideo = true;
          acquiredAudio = true;
        } catch (err2) {
          console.warn('[WebRTC] Basic video+audio failed, trying audio-only...', err2);
          // 3. Try audio-only (e.g. camera is busy or unavailable)
          try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            acquiredAudio = true;
            setCamActive(false);
          } catch (err3) {
            console.warn('[WebRTC] Audio-only failed, trying video-only...', err3);
            // 4. Try video-only
            try {
              stream = await navigator.mediaDevices.getUserMedia({ video: true });
              acquiredVideo = true;
              setMicActive(false);
            } catch (err4) {
              console.warn('[WebRTC] Neither camera nor microphone accessible:', err4);
            }
          }
        }
      }

      if (!stream) {
        stream = new MediaStream();
      }
      if (!acquiredVideo || stream.getVideoTracks().length === 0) {
        const dummyV = createDummyVideoTrack();
        if (dummyV) stream.addTrack(dummyV);
        setCameraError('Видеопоток недоступен (камера выключена или заблокирована)');
        addLog('warn', 'Видеопоток недоступен, создана виртуальная видео-заглушка');
      } else {
        setCameraError(null);
        addLog('success', 'Локальная камера успешно активирована');
      }

      if (!acquiredAudio || stream.getAudioTracks().length === 0) {
        const silentA = createSilentAudioTrack();
        if (silentA) stream.addTrack(silentA);
        setMicrophoneError('Микрофон недоступен');
        addLog('warn', 'Микрофон недоступен, создан беззвучный аудио-трек');
      } else {
        setMicrophoneError(null);
        addLog('success', 'Локальный микрофон успешно активирован');
      }

      // Preserve current microphone and camera states
      stream.getAudioTracks().forEach((track) => {
        track.enabled = micActive;
      });
      stream.getVideoTracks().forEach((track) => {
        track.enabled = camActive;
      });

      streamRef.current = stream;

      // Update local preview depending on swapped state
      if (isSwapped) {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream;
      } else {
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      }
      if (pipVideoRef.current) {
        pipVideoRef.current.srcObject = stream;
      }

      // Update peer connection with local tracks
      if (pcRef.current && pcRef.current.signalingState !== 'closed') {
        const senders = pcRef.current.getSenders();
        stream.getTracks().forEach((newTrack) => {
          const sender = senders.find((s) => s.track?.kind === newTrack.kind || (s as any).kind === newTrack.kind);
          if (sender) {
            sender.replaceTrack(newTrack);
          } else {
            pcRef.current?.addTrack(newTrack, stream!);
          }
        });
      }

      // Announce ready in room if we haven't established remote stream yet
      if (channelRef.current && !hasRemoteStream && pcRef.current?.connectionState !== 'connected') {
        const myLocalName =
          (typeof window !== 'undefined' &&
            (localStorage.getItem('aida_full_name') ||
              localStorage.getItem('aida_user_name'))) ||
          '';
        const cleanLocalName = myLocalName.replace(/\s*\(.*?\)$/, '').trim();

        channelRef.current.send({
          type: 'broadcast',
          event: 'user-joined',
          payload: {
            senderId: myPeerIdRef.current,
            isTeacher,
            userName: cleanLocalName || (isTeacher ? 'Преподаватель' : 'Ученик'),
            startedAt: timerStartTimeRef.current,
          },
        });
      }

      return stream;
    } catch (err: any) {
      console.warn('WebRTC camera preview error:', err);
      let errMsg = 'Сбой доступа к камере или микрофону';
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        errMsg = 'Доступ к камере заблокирован в настройках браузера';
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        errMsg = 'Камера или микрофон не найдены на устройстве';
      } else if (err?.name === 'NotReadableError' || err?.name === 'TrackStartError') {
        errMsg = 'Камера занята другим приложением (Telegram/Zoom)';
      }
      setCameraError(errMsg);
      addLog('error', errMsg, err?.message || String(err));
      const fallbackStream = new MediaStream();
      const dummyV = createDummyVideoTrack();
      const silentA = createSilentAudioTrack();
      if (dummyV) fallbackStream.addTrack(dummyV);
      if (silentA) fallbackStream.addTrack(silentA);
      streamRef.current = fallbackStream;
      return fallbackStream;
    } finally {
      cameraPromiseRef.current = null;
    }
  };

  // Flip between front/selfie camera and back/rear camera (VK style)
  const handleFlipCamera = async () => {
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);
    facingModeRef.current = nextFacing;
    if (livekitSessionRef.current?.room) {
      try {
        const camPub = livekitSessionRef.current.room.localParticipant.getTrackPublication('camera');
        if (camPub?.videoTrack) {
          await camPub.videoTrack.restartTrack({ facingMode: nextFacing });
        }
      } catch (_) {}
    }
    await startCamera(nextFacing);
  };

  // Raise / lower hand in video call (VK style)
  const handleRaiseHand = () => {
    const next = !isHandRaised;
    setIsHandRaised(next);
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'peer-hand-raise',
        payload: {
          senderId: myPeerIdRef.current,
          senderName: isTeacher ? 'Преподаватель' : 'Ученик',
          isRaised: next,
        },
      });
    }
  };

  // Exit to personal cabinet WITHOUT ending/closing the lesson
  const handleExitToCabinet = () => {
    // 1. Ensure active lesson room state is saved in localStorage so the cabinet displays "Вернуться в урок"
    try {
      localStorage.setItem(
        'aida_active_lesson_room',
        JSON.stringify({
          roomId: roomToken,
          topic: topic || 'Индивидуальное занятие',
          role: isTeacher ? 'teacher' : 'student',
          timestamp: timerStartTimeRef.current || Date.now(),
        })
      );
    } catch (_) {}

    // 2. If parent container provided onExitToCabinet, trigger it
    if (onExitToCabinet) {
      onExitToCabinet();
      return;
    }

    // 3. Otherwise navigate directly to appropriate personal cabinet
    if (isTeacher) {
      const teacherId =
        (typeof window !== 'undefined' &&
          (localStorage.getItem('aida_auth_user_id') ||
            localStorage.getItem('aida_user_id') ||
            localStorage.getItem('aida_user_public_id'))) ||
        'id179017';
      router.push(`/teacher?id=${encodeURIComponent(teacherId)}`);
    } else {
      const studentId =
        (typeof window !== 'undefined' &&
          (localStorage.getItem('aida_auth_user_id') ||
            localStorage.getItem('aida_user_id') ||
            localStorage.getItem('aida_user_public_id'))) ||
        '';
      router.push(studentId ? `/${encodeURIComponent(studentId)}` : '/student');
    }
  };

  // Supabase Realtime Signaling & LiveKit SFU setup
  useEffect(() => {
    if (!roomToken) return;

    let isMounted = true;

    const myLocalName =
      (typeof window !== 'undefined' &&
        (localStorage.getItem('aida_full_name') ||
          localStorage.getItem('aida_user_name'))) ||
      (isTeacher ? 'Преподаватель' : 'Ученик');
    const myCleanName = myLocalName.replace(/\s*\(.*?\)$/, '').trim();

    // 1. Attempt connection via LiveKit Cloud SFU (Dual Account pool)
    initLiveKitCall({
      roomToken,
      identity: myPeerIdRef.current,
      name: myCleanName,
      isTeacher: Boolean(isTeacher),
      localVideoEl: localVideoRef.current,
      remoteVideoEl: remoteVideoRef.current,
      remoteAudioEl: remoteAudioRef.current,
      onConnected: (acc, accName) => {
        if (!isMounted) return;
        isLiveKitActiveRef.current = true;
        setActiveEngine('livekit');
        setLivekitAccount(acc);
        setLivekitAccountName(accName);
        setConnectionStatus('connected');
        if (pcRef.current) {
          try { pcRef.current.close(); } catch (_) {}
          pcRef.current = null;
        }
      },
      onDisconnected: (reason) => {
        if (!isMounted) return;
        isLiveKitActiveRef.current = false;
        setActiveEngine('p2p');
        addLog('warn', `LiveKit SFU отключен (${reason || 'сессия завершена'}). Резервный P2P канал готов.`);
      },
      onLocalTracks: (stream) => {
        if (!isMounted) return;
        streamRef.current = stream;
        if (localVideoRef.current && localVideoRef.current.srcObject !== stream) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(() => {});
        }
      },
      onRemoteTrackReceived: (kind, stream) => {
        if (!isMounted) return;
        isLiveKitActiveRef.current = true;
        setHasRemoteStream(true);
        setConnectionStatus('connected');
        if (!remoteStreamRef.current) {
          remoteStreamRef.current = stream;
        } else {
          stream.getTracks().forEach((t) => {
            if (!remoteStreamRef.current?.getTracks().some((et) => et.id === t.id)) {
              remoteStreamRef.current?.addTrack(t);
            }
          });
        }
        if (remoteVideoRef.current && kind === 'video') {
          remoteVideoRef.current.srcObject = remoteStreamRef.current;
          remoteVideoRef.current.muted = true;
          remoteVideoRef.current.play().catch(() => {});
        }
        if (remoteAudioRef.current && kind === 'audio') {
          remoteAudioRef.current.srcObject = remoteStreamRef.current;
          remoteAudioRef.current.muted = isDeafened;
          remoteAudioRef.current.play().catch(() => {});
        }
      },
      onPeerJoined: (name) => {
        if (!isMounted) return;
        setIsPeerInRoom(true);
        setPeerProvidedName(name);
      },
      onPeerLeft: () => {
        if (!isMounted) return;
        setIsPeerInRoom(false);
      },
      onLog: addLog,
    }).then((session) => {
      if (!isMounted) {
        session?.room?.disconnect();
        return;
      }
      if (session) {
        livekitSessionRef.current = session;
        setActiveEngine('livekit');
      } else {
        // Fallback to local camera and P2P connection
        startCamera();
      }
    });

    const cleanRoomId = roomToken.replace(/[^a-zA-Z0-9_-]/g, '_');
    const channel = supabase.channel(`webrtc_${cleanRoomId}`, {
      config: { broadcast: { self: false } },
    });
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'user-joined' }, async ({ payload }) => {
        if (payload?.senderId === myPeerIdRef.current) return;
        console.log('[WebRTC] Peer joined room:', payload);
        setIsPeerInRoom(true);
        addLog(
          'success',
          `Собеседник вошел в комнату: ${payload?.userName || 'Участник'} (${payload?.isTeacher ? 'Учитель' : 'Ученик'})`
        );

        // Sync timer start with peer if available
        syncTimerWithTimestamp(payload?.startedAt);

        if (payload?.userName) {
          setPeerProvidedName(payload.userName);
        }

        // 1. Immediately acknowledge presence so newcomer knows we are already in the room!
        if (channelRef.current) {
          const myLocalName =
            (typeof window !== 'undefined' &&
              (localStorage.getItem('aida_full_name') ||
                localStorage.getItem('aida_user_name'))) ||
            '';
          const cleanLocalName = myLocalName.replace(/\s*\(.*?\)$/, '').trim();

          channelRef.current.send({
            type: 'broadcast',
            event: 'user-here',
            payload: {
              senderId: myPeerIdRef.current,
              isTeacher,
              userName: cleanLocalName || (isTeacher ? 'Преподаватель' : 'Ученик'),
              startedAt: timerStartTimeRef.current,
            },
          });

          // Also explicitly share active timer timestamp if already running
          if (timerStartTimeRef.current) {
            channelRef.current.send({
              type: 'broadcast',
              event: 'timer-started',
              payload: { startedAt: timerStartTimeRef.current },
            });
          }
        }

        // 2. Only reset if connection was completely broken (and LiveKit is not active)
        if (pcRef.current && pcRef.current.connectionState === 'failed' && !isLiveKitActiveRef.current) {
          resetPeerConnection();
          setConnectionStatus('connecting');
        }

        // 3. Initiate offer: Teacher initiates if present, or deterministic tie-breaker by peerId
        // If LiveKit SFU is already active and routing media, bypass P2P offer initiation
        if (isLiveKitActiveRef.current) return;

        const shouldInitiate =
          (isTeacher && !payload?.isTeacher) ||
          (isTeacher === Boolean(payload?.isTeacher) && myPeerIdRef.current > (payload?.senderId || ''));
        const isConnectionBusyOrActive =
          pcRef.current &&
          (pcRef.current.connectionState === 'connected' ||
            (pcRef.current.connectionState === 'connecting' && Date.now() - lastOfferSentRef.current < 6000));

        if (shouldInitiate && !isConnectionBusyOrActive) {
          const stream = await ensureLocalStream();
          if (stream) {
            const pc = getOrCreatePeerConnection(stream);
            await createAndSendOffer(pc);
          }
        }
      })
      .on('broadcast', { event: 'user-here' }, async ({ payload }) => {
        if (payload?.senderId === myPeerIdRef.current) return;
        console.log('[WebRTC] Peer is already in room (user-here):', payload);
        setIsPeerInRoom(true);
        addLog('success', `Собеседник уже в комнате: ${payload?.userName || 'Участник'}`);

        // Sync timer start with peer if available
        syncTimerWithTimestamp(payload?.startedAt);

        if (payload?.userName) {
          setPeerProvidedName(payload.userName);
        }

        // Only reset if connection was completely broken (and LiveKit is not active)
        if (pcRef.current && pcRef.current.connectionState === 'failed' && !isLiveKitActiveRef.current) {
          resetPeerConnection();
          setConnectionStatus('connecting');
        }

        // If LiveKit SFU is already active and routing media, bypass P2P offer initiation
        if (isLiveKitActiveRef.current) return;

        // If I should initiate the offer (Teacher initiates or deterministic tie-breaker)
        const shouldInitiate =
          (isTeacher && !payload?.isTeacher) ||
          (isTeacher === Boolean(payload?.isTeacher) && myPeerIdRef.current > (payload?.senderId || ''));
        const isConnectionBusyOrActive =
          pcRef.current &&
          (pcRef.current.connectionState === 'connected' ||
            (pcRef.current.connectionState === 'connecting' && Date.now() - lastOfferSentRef.current < 6000));

        if (shouldInitiate && !isConnectionBusyOrActive) {
          const stream = await ensureLocalStream();
          if (stream) {
            const pc = getOrCreatePeerConnection(stream);
            await createAndSendOffer(pc);
          }
        }
      })
      .on('broadcast', { event: 'presence-ping' }, async ({ payload }) => {
        if (payload?.senderId === myPeerIdRef.current) return;
        setIsPeerInRoom(true);
        syncTimerWithTimestamp(payload?.startedAt);

        // If LiveKit SFU is already active and routing media, bypass P2P offer initiation
        if (isLiveKitActiveRef.current) return;

        const shouldInitiate =
          (isTeacher && !payload?.isTeacher) ||
          (isTeacher === Boolean(payload?.isTeacher) && myPeerIdRef.current > (payload?.senderId || ''));

        const isConnectionBusyOrActive =
          pcRef.current &&
          (pcRef.current.connectionState === 'connected' ||
            (pcRef.current.connectionState === 'connecting' && Date.now() - lastOfferSentRef.current < 7000));

        if (shouldInitiate && !isConnectionBusyOrActive) {
          const stream = await ensureLocalStream();
          if (stream) {
            const pc = getOrCreatePeerConnection(stream);
            await createAndSendOffer(pc);
          }
        }
      })
      .on('broadcast', { event: 'offer' }, async ({ payload }) => {
        if (payload?.senderId === myPeerIdRef.current) return;
        if (isLiveKitActiveRef.current) {
          console.log('[WebRTC] P2P offer received, but LiveKit SFU is active; ignoring P2P offer');
          return;
        }
        if (payload?.sdp) {
          console.log('[WebRTC] Received SDP offer, answering...');
          setConnectionStatus('connecting');
          const stream = await ensureLocalStream();
          if (stream) {
            await handleRemoteOffer(payload.sdp, stream);
          }
        }
      })
      .on('broadcast', { event: 'answer' }, async ({ payload }) => {
        if (payload?.senderId === myPeerIdRef.current) return;
        if (isLiveKitActiveRef.current) return;
        if (payload?.sdp) {
          await handleRemoteAnswer(payload.sdp);
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        if (payload?.senderId === myPeerIdRef.current) return;
        if (isLiveKitActiveRef.current) return;
        if (payload?.candidate) {
          await handleRemoteIceCandidate(payload.candidate);
        }
      })
      .on('broadcast', { event: 'peer-mic-change' }, ({ payload }) => {
        if (payload?.senderId === myPeerIdRef.current) return;
        if (typeof payload?.micActive === 'boolean') {
          console.log('[WebRTC] Remote peer mic status changed:', payload.micActive);
          setRemoteMicActive(payload.micActive);
          if (remoteStreamRef.current) {
            remoteStreamRef.current.getAudioTracks().forEach((track) => {
              track.enabled = payload.micActive;
            });
          }
        }
      })
      .on('broadcast', { event: 'peer-screen-share' }, ({ payload }) => {
        if (payload?.senderId === myPeerIdRef.current) return;
        if (typeof payload?.isSharing === 'boolean') {
          console.log('[WebRTC] Peer screen share status changed:', payload.isSharing);
          setIsRemoteScreenSharing(payload.isSharing);
        }
      })
      .on('broadcast', { event: 'peer-cam-change' }, ({ payload }) => {
        if (payload?.senderId === myPeerIdRef.current) return;
        if (typeof payload?.camActive === 'boolean') {
          console.log('[WebRTC] Remote peer camera status changed:', payload.camActive);
          setRemoteCamActive(payload.camActive);
        }
      })
      .on('broadcast', { event: 'peer-hand-raise' }, ({ payload }) => {
        if (payload?.senderId === myPeerIdRef.current) return;
        if (payload?.isRaised) {
          const name = payload?.senderName || 'Собеседник';
          setPeerHandNotification(`${name} поднял(а) руку ✋`);
          setTimeout(() => setPeerHandNotification(null), 6000);
        } else {
          setPeerHandNotification(null);
        }
      })
      .on('broadcast', { event: 'chat-message' }, ({ payload }) => {
        if (payload?.id && (payload?.text || payload?.attachment)) {
          setChatMessages((prev) => {
            if (prev.some((m) => m.id === payload.id)) return prev;
            return [...prev, payload];
          });
          setIsChatOpen((open) => {
            if (!open) {
              setUnreadChatCount((count) => count + 1);
            }
            return open;
          });
          setTimeout(() => {
            scrollChatToBottom(true);
          }, 50);
        }
      })
      .on('broadcast', { event: 'timer-started' }, ({ payload }) => {
        if (payload?.startedAt) {
          syncTimerWithTimestamp(Number(payload.startedAt));
        }
      })
      .on('broadcast', { event: 'lesson-ended' }, ({ payload }) => {
        if (!isTeacher) {
          const durationMin = Math.round((payload?.durationSec || 0) / 60) || 1;
          alert(`Преподаватель завершил урок! Длительность: ${durationMin} мин.`);
          if (onEndLesson) onEndLesson(payload?.durationSec || 0, payload?.deductBalance);
        }
      })
      .on('broadcast', { event: 'user-left' }, ({ payload }) => {
        if (payload?.senderId === myPeerIdRef.current) return;
        console.log('[WebRTC] Peer left room:', payload);
        addLog('warn', 'Собеседник покинул комнату');
        setIsPeerInRoom(false);
        resetPeerConnection();
        setHasRemoteStream(false);
        setConnectionStatus('waiting');
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[WebRTC] Connected to signaling channel');
          setCurrentSignalingStatus('connected');
          addLog('success', 'Подключено к серверу сигналинга Supabase');
          const myLocalName =
            (typeof window !== 'undefined' &&
              (localStorage.getItem('aida_full_name') ||
                localStorage.getItem('aida_user_name'))) ||
            '';
          const cleanLocalName = myLocalName.replace(/\s*\(.*?\)$/, '').trim();

          channel.send({
            type: 'broadcast',
            event: 'user-joined',
            payload: {
              senderId: myPeerIdRef.current,
              isTeacher,
              userName: cleanLocalName || (isTeacher ? 'Преподаватель' : 'Ученик'),
              startedAt: timerStartTimeRef.current,
            },
          });
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setCurrentSignalingStatus('error');
          addLog('error', `Сбой подключения к серверу сигналинга: ${status}`);
        }
      });

    return () => {
      isMounted = false;
      if (livekitSessionRef.current?.room) {
        try {
          livekitSessionRef.current.room.disconnect();
        } catch (_) {}
        livekitSessionRef.current = null;
      }
      try {
        channel.send({
          type: 'broadcast',
          event: 'user-left',
          payload: { senderId: myPeerIdRef.current },
        });
        supabase.removeChannel(channel);
      } catch (_) {}

      resetPeerConnection();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      remoteStreamRef.current = null;
    };
  }, [roomToken, isTeacher]);

  // Periodic presence ping while waiting for peer (auto-reconnects smoothly on page reload)
  useEffect(() => {
    if (!roomToken || hasRemoteStream) return;

    const interval = setInterval(() => {
      if (channelRef.current && !hasRemoteStream && pcRef.current?.connectionState !== 'connected') {
        channelRef.current.send({
          type: 'broadcast',
          event: 'presence-ping',
          payload: {
            senderId: myPeerIdRef.current,
            isTeacher,
            startedAt: timerStartTimeRef.current,
          },
        });
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [roomToken, hasRemoteStream, isTeacher]);

  // Re-bind video srcObject if ref attaches or mode switches
  useEffect(() => {
    if (streamRef.current) {
      if (localVideoRef.current && localVideoRef.current.srcObject !== streamRef.current) {
        localVideoRef.current.srcObject = streamRef.current;
      }
      if (pipVideoRef.current && pipVideoRef.current.srcObject !== streamRef.current) {
        pipVideoRef.current.srcObject = streamRef.current;
      }
    }
  }, [isWhiteboardActive, camActive, isSwapped]);

  // Resolve the active video element with valid video tracks for Picture-in-Picture
  const getActivePiPVideo = (): HTMLVideoElement | null => {
    // 1. Remote peer stream if active with live video track
    if (remoteVideoRef.current && hasRemoteStream && remoteCamActive) {
      const stream = (remoteVideoRef.current.srcObject as MediaStream | null) || remoteStreamRef.current;
      if (stream && stream.getVideoTracks().some((t) => t.readyState === 'live' && t.enabled)) {
        return remoteVideoRef.current;
      }
    }

    // 2. Local camera preview if user camera is active
    if (localVideoRef.current && camActive) {
      const stream = (localVideoRef.current.srcObject as MediaStream | null) || streamRef.current;
      if (stream && stream.getVideoTracks().some((t) => t.readyState === 'live' && t.enabled)) {
        return localVideoRef.current;
      }
    }

    // 3. Any available video element with live video track
    const candidates = [remoteVideoRef.current, localVideoRef.current, pipVideoRef.current].filter(Boolean) as HTMLVideoElement[];
    for (const v of candidates) {
      const st = v.srcObject as MediaStream | null;
      if (st && st.getVideoTracks().some((t) => t.readyState === 'live' && t.enabled)) {
        return v;
      }
    }

    return null;
  };

  // Picture-in-Picture toggle (Native OS PiP or In-App Floating PiP fallback)
  const togglePictureInPicture = async () => {
    try {
      // If already in in-app floating mode, restore full screen
      if (isPlatformMinimized) {
        onTogglePlatformMinimize?.(false);
        setInternalPlatformMinimized(false);
        setIsPipActive(false);
        return;
      }

      // If document PiP is active, exit it
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture().catch(() => {});
        setIsPipActive(false);
        return;
      }

      const activeVideo = getActivePiPVideo();

      // If native PiP video is ready, attempt native Picture-in-Picture first
      if (activeVideo && typeof activeVideo.requestPictureInPicture === 'function') {
        (activeVideo as any).autoPictureInPicture = true;
        (activeVideo as any).disablePictureInPicture = false;
        activeVideo.setAttribute('autopictureinpicture', 'true');

        // iOS Safari WebKit presentation mode
        if (
          typeof (activeVideo as any).webkitSetPresentationMode === 'function' &&
          (activeVideo as any).webkitSupportsPresentationMode?.('picture-in-picture')
        ) {
          const isPiP = (activeVideo as any).webkitPresentationMode === 'picture-in-picture';
          const nextMode = isPiP ? 'inline' : 'picture-in-picture';
          (activeVideo as any).webkitSetPresentationMode(nextMode);
          setIsPipActive(nextMode === 'picture-in-picture');
          return;
        }

        if (activeVideo.paused) {
          await activeVideo.play().catch(() => {});
        }

        await activeVideo.requestPictureInPicture();
        setIsPipActive(true);
        return;
      }

      // Fallback: If native PiP is not permitted or no live video element ready,
      // toggle into the in-app floating Picture-in-Picture card over the platform
      if (onTogglePlatformMinimize) {
        onTogglePlatformMinimize(true);
      }
      setInternalPlatformMinimized(true);
      setIsPipActive(true);
    } catch (err: any) {
      console.warn('Native PiP could not start, activating in-app floating mode fallback:', err);
      // Seamlessly activate in-app floating PiP card so user experience never breaks
      if (onTogglePlatformMinimize) {
        onTogglePlatformMinimize(true);
      }
      setInternalPlatformMinimized(true);
      setIsPipActive(true);
    }
  };

  // Register MediaSession for system-level controls & automatic Picture-in-Picture on exit to home/desktop
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: topic ? `Урок: ${topic}` : 'Онлайн-урок',
        artist: resolvedParticipantName || 'Преподаватель центра',
        album: 'АйДаУмничка • Видеосвязь',
        artwork: [
          { src: '/icon.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon.png', sizes: '512x512', type: 'image/png' },
        ],
      });
      navigator.mediaSession.playbackState = 'playing';

      // Chrome invokes enterpictureinpicture action handler when user minimizes or exits to home screen
      try {
        (navigator.mediaSession as any).setActionHandler('enterpictureinpicture', async () => {
          try {
            const video = getActivePiPVideo();
            if (video && typeof video.requestPictureInPicture === 'function') {
              (video as any).autoPictureInPicture = true;
              (video as any).disablePictureInPicture = false;
              await video.requestPictureInPicture();
              setIsPipActive(true);
            }
          } catch (e) {
            console.warn('Auto PiP on enterpictureinpicture action error:', e);
          }
        });
      } catch (_) {}

      try {
        (navigator.mediaSession as any).setActionHandler('hangup', () => {
          onEndLesson?.(callDuration);
        });
      } catch (_) {}

      try {
        (navigator.mediaSession as any).setActionHandler('togglemicrophone', () => {
          toggleMic();
        });
      } catch (_) {}

      try {
        (navigator.mediaSession as any).setActionHandler('togglecamera', () => {
          toggleCam();
        });
      } catch (_) {}
    } catch (e) {
      console.warn('Failed to register MediaSession:', e);
    }

    return () => {
      if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
        try {
          (navigator.mediaSession as any).setActionHandler('enterpictureinpicture', null);
          (navigator.mediaSession as any).setActionHandler('hangup', null);
          (navigator.mediaSession as any).setActionHandler('togglemicrophone', null);
          (navigator.mediaSession as any).setActionHandler('togglecamera', null);
        } catch (_) {}
      }
    };
  }, [hasRemoteStream, remoteCamActive, camActive, resolvedParticipantName, topic]);

  // Auto Picture-in-Picture when user minimizes tab, presses home or switches to another app
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden') {
        const video = getActivePiPVideo();
        if (!video) return;

        (video as any).autoPictureInPicture = true;
        (video as any).disablePictureInPicture = false;

        // 1. iOS Safari WebKit presentation mode
        if (
          typeof (video as any).webkitSetPresentationMode === 'function' &&
          (video as any).webkitSupportsPresentationMode?.('picture-in-picture')
        ) {
          try {
            if ((video as any).webkitPresentationMode !== 'picture-in-picture') {
              (video as any).webkitSetPresentationMode('picture-in-picture');
              setIsPipActive(true);
            }
          } catch (_) {}
          return;
        }

        // 2. Standard W3C requestPictureInPicture
        if (!document.pictureInPictureElement && typeof video.requestPictureInPicture === 'function') {
          try {
            await video.requestPictureInPicture();
            setIsPipActive(true);
          } catch (_) {
            // Handled gracefully; MediaSession action handler triggers PiP with user activation token
          }
        }
      }
    };

    const handleEnterPiP = () => setIsPipActive(true);
    const handleLeavePiP = () => setIsPipActive(false);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('enterpictureinpicture', handleEnterPiP);
    document.addEventListener('leavepictureinpicture', handleLeavePiP);
    window.addEventListener('pagehide', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('enterpictureinpicture', handleEnterPiP);
      document.removeEventListener('leavepictureinpicture', handleLeavePiP);
      window.removeEventListener('pagehide', handleVisibilityChange);
    };
  }, [hasRemoteStream, remoteCamActive, camActive]);

  // Screen sharing toggle with capability check and track replacement
  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        // 0. LiveKit SFU screen share
        if (livekitSessionRef.current?.room) {
          try {
            await livekitSessionRef.current.room.localParticipant.setScreenShareEnabled(true);
            setIsScreenSharing(true);
            return;
          } catch (lkErr: any) {
            if (lkErr?.name === 'NotAllowedError') return;
            console.warn('LiveKit screenshare fallback:', lkErr);
          }
        }

        // 1. Check if browser supports getDisplayMedia
        if (
          typeof navigator !== 'undefined' &&
          navigator.mediaDevices &&
          typeof navigator.mediaDevices.getDisplayMedia === 'function'
        ) {
          try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
              video: {
                cursor: 'always',
                displaySurface: 'monitor',
              } as any,
              audio: false,
            });

            screenStreamRef.current = screenStream;
            const screenTrack = screenStream.getVideoTracks()[0];
            if (!screenTrack) return;

            // Replace track in peer connection
            if (pcRef.current && pcRef.current.signalingState !== 'closed') {
              const videoSender = pcRef.current.getSenders().find((s) => s.track?.kind === 'video');
              if (videoSender) {
                await videoSender.replaceTrack(screenTrack);
              } else {
                pcRef.current.addTrack(screenTrack, screenStream);
              }
            }

            if (localVideoRef.current) {
              localVideoRef.current.srcObject = screenStream;
            }

            // Notify peer via signaling channel
            if (channelRef.current) {
              channelRef.current.send({
                type: 'broadcast',
                event: 'peer-screen-share',
                payload: { senderId: myPeerIdRef.current, isSharing: true },
              });
            }

            screenTrack.onended = () => {
              stopScreenSharing();
            };

            setIsScreenSharing(true);
            return;
          } catch (captureErr: any) {
            // User cancelled browser capture dialog
            if (captureErr?.name === 'NotAllowedError') {
              return;
            }
            console.warn('getDisplayMedia attempt error:', captureErr);
          }
        }

        // 2. If getDisplayMedia is not available (e.g. iOS Safari on iPhone where Apple restricts system screen recording):
        // Offer interactive whiteboard mode for visual collaboration
        if (onToggleWhiteboard) {
          const switchMode = confirm(
            'На iPhone в браузере Safari компания Apple блокирует запись экрана веб-сайтами.\n\nВключить интерактивную доску для показа учебных материалов и совместной работы?'
          );
          if (switchMode) {
            onToggleWhiteboard();
          }
        } else {
          alert(
            'На мобильных устройствах iOS Safari демонстрация всего экрана ограничена Apple. Для показа учебных материалов используйте интерактивную доску или компьютер.'
          );
        }
      } else {
        stopScreenSharing();
      }
    } catch (err: any) {
      console.warn('Screen share error:', err);
      setIsScreenSharing(false);
    }
  };

  const stopScreenSharing = async () => {
    // 0. LiveKit screen share stop
    if (livekitSessionRef.current?.room) {
      try {
        await livekitSessionRef.current.room.localParticipant.setScreenShareEnabled(false);
      } catch (_) {}
    }

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

    if (streamRef.current) {
      const cameraTrack = streamRef.current.getVideoTracks()[0];
      if (pcRef.current && cameraTrack) {
        const videoSender = pcRef.current.getSenders().find((s) => s.track?.kind === 'video');
        if (videoSender) {
          await videoSender.replaceTrack(cameraTrack);
        }
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = streamRef.current;
      }
    }

    // Notify peer that screen share ended
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'peer-screen-share',
        payload: { senderId: myPeerIdRef.current, isSharing: false },
      });
    }

    setIsScreenSharing(false);
  };

  const toggleMic = () => {
    const nextMicActive = !micActive;
    setMicActive(nextMicActive);

    // 0. LiveKit SFU mic toggle
    if (livekitSessionRef.current?.room) {
      try {
        livekitSessionRef.current.room.localParticipant.setMicrophoneEnabled(nextMicActive);
      } catch (_) {}
    }

    // 1. Mute local media stream audio tracks
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = nextMicActive;
      });
    }

    // 2. Mute RTCPeerConnection audio senders directly
    if (pcRef.current && pcRef.current.signalingState !== 'closed') {
      pcRef.current.getSenders().forEach((sender) => {
        if (sender.track && sender.track.kind === 'audio') {
          sender.track.enabled = nextMicActive;
        }
      });
    }

    // 3. Broadcast status change to peer via signaling channel
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'peer-mic-change',
        payload: {
          senderId: myPeerIdRef.current,
          micActive: nextMicActive,
        },
      });
    }
  };

  const toggleCam = async () => {
    // 0. LiveKit SFU camera toggle
    if (livekitSessionRef.current?.room) {
      try {
        await livekitSessionRef.current.room.localParticipant.setCameraEnabled(!camActive);
      } catch (_) {}
    }

    if (camActive) {
      // 1. Fully stop camera tracks so hardware sensor and LED indicator shut off
      if (streamRef.current) {
        streamRef.current.getVideoTracks().forEach((track) => {
          track.stop();
        });
      }
      setCamActive(false);

      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'peer-cam-change',
          payload: { senderId: myPeerIdRef.current, camActive: false },
        });
      }
    } else {
      // 2. Re-acquire camera stream
      try {
        const isMobile =
          typeof window !== 'undefined' &&
          (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768);

        let newStream: MediaStream;
        try {
          newStream = await navigator.mediaDevices.getUserMedia(
            isMobile
              ? { video: { facingMode: { ideal: 'user' } } }
              : { video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } }
          );
        } catch (_) {
          newStream = await navigator.mediaDevices.getUserMedia({ video: true });
        }

        const newVideoTrack = newStream.getVideoTracks()[0];
        if (newVideoTrack && streamRef.current) {
          // Remove old stopped tracks
          streamRef.current.getVideoTracks().forEach((t) => streamRef.current?.removeTrack(t));
          streamRef.current.addTrack(newVideoTrack);

          if (localVideoRef.current) {
            localVideoRef.current.srcObject = streamRef.current;
          }

          if (pcRef.current && pcRef.current.signalingState !== 'closed') {
            const transceivers = pcRef.current.getTransceivers ? pcRef.current.getTransceivers() : [];
            const videoTransceiver = transceivers.find(
              (t) => t.receiver?.track?.kind === 'video' || t.sender?.track?.kind === 'video'
            );
            if (videoTransceiver && videoTransceiver.sender) {
              await videoTransceiver.sender.replaceTrack(newVideoTrack);
            } else {
              const videoSender = pcRef.current
                .getSenders()
                .find((s) => s.track?.kind === 'video' || (s as any).kind === 'video');
              if (videoSender) {
                await videoSender.replaceTrack(newVideoTrack);
              } else {
                pcRef.current.addTrack(newVideoTrack, streamRef.current);
              }
            }
          }
        }
        setCamActive(true);

        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'peer-cam-change',
            payload: { senderId: myPeerIdRef.current, camActive: true },
          });
        }
      } catch (err) {
        console.warn('Failed to restart camera:', err);
      }
    }
  };

  // Toggle deafen (Заглушить динамики как в ВК)
  const toggleDeafen = () => {
    setIsDeafened((prev) => !prev);
  };

  // Client-side image compression: downscales max 1280px and converts to 72% JPEG
  const compressImage = async (file: File): Promise<File> => {
    if (!file.type.startsWith('image/')) return file;
    if (file.type === 'image/svg+xml' || file.type === 'image/gif') return file;

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          const maxDim = 1280;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(file);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (!blob || blob.size >= file.size) {
                resolve(file);
              } else {
                const compressed = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressed);
              }
            },
            'image/jpeg',
            0.72
          );
        };
        img.onerror = () => resolve(file);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const originalFile = files[0];
    e.target.value = '';

    try {
      setIsUploadingAttachment(true);
      const processedFile = await compressImage(originalFile);

      const formData = new FormData();
      formData.append('file', processedFile);

      const res = await fetch('/api/room/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Ошибка при загрузке файла');
      }

      setAttachedFile({
        name: data.name || originalFile.name,
        url: data.url,
        type: data.type || originalFile.type,
        size: data.size || processedFile.size,
        isImage: Boolean(data.isImage),
      });
    } catch (err: any) {
      console.error('File upload error:', err);
      alert(err.message || 'Не удалось прикрепить файл');
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = chatInput.trim();
    if (!trimmed && !attachedFile) return;

    const now = new Date();
    const timeStr = formatTimeTolyatti(now);
    const msg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      senderId: myPeerIdRef.current,
      senderName: isTeacher ? 'Преподаватель' : 'Ученик',
      senderRole: isTeacher ? 'teacher' : 'student',
      text: trimmed,
      time: timeStr,
      attachment: attachedFile ? { ...attachedFile } : undefined,
    };

    setChatMessages((prev) => [...prev, msg]);
    setChatInput('');
    setAttachedFile(null);

    // 1. Broadcast to peer via Supabase Realtime
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'chat-message',
        payload: msg,
      });
    }

    // 2. Persist in Supabase DB
    try {
      await fetch('/api/room/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomToken, message: msg }),
      });
    } catch (err) {
      console.warn('Failed to persist message in Supabase:', err);
    }

    setTimeout(() => {
      scrollChatToBottom(true);
    }, 50);
  };

  const handleChatButtonClick = () => {
    setIsChatOpen(true);
    setUnreadChatCount(0);
    setTimeout(() => {
      scrollChatToBottom(false);
    }, 60);
  };

  const handleStudentLeave = () => {
    if (confirm('Покинуть комнату? Преподаватель продолжит урок.')) {
      try {
        localStorage.removeItem(`aida_lesson_started_${roomToken}`);
      } catch (_) {}
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'user-left',
          payload: { senderId: myPeerIdRef.current, name: resolvedParticipantName },
        });
      }
      const savedUserId =
        localStorage.getItem('aida_user_public_id') ||
        localStorage.getItem('aida_auth_user_id') ||
        localStorage.getItem('aida_user_id') ||
        'id571210';
      router.push(`/${savedUserId}`);
    }
  };

  const handleEndClick = () => {
    // Only teachers are allowed to terminate lessons
    if (!isTeacher) {
      handleStudentLeave();
      return;
    }
    setShowTeacherEndModal(true);
  };

  const confirmEndLesson = (deductBalance: boolean) => {
    setShowTeacherEndModal(false);
    const finalDuration = timerStartTimeRef.current
      ? Math.max(callDuration, Math.floor((Date.now() - timerStartTimeRef.current) / 1000))
      : callDuration;

    try {
      localStorage.removeItem(`aida_lesson_started_${roomToken}`);
    } catch (_) {}

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'lesson-ended',
        payload: { durationSec: finalDuration, deductBalance },
      });
    }
    if (onEndLesson) onEndLesson(finalDuration, deductBalance);
  };

  const renderTeacherEndModal = () => {
    if (!showTeacherEndModal) return null;

    return (
      <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-[#F2DECE] space-y-5 animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-coralAccent to-[#FF453A] text-white flex items-center justify-center shadow-md shadow-coralAccent/20 shrink-0">
                <PhoneOff className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-[#161F38]">Завершение урока</h3>
                <p className="text-xs text-[#6B758E]">
                  Ученик: <strong className="text-[#161F38]">{resolvedParticipantName || 'Ученик'}</strong>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowTeacherEndModal(false)}
              className="text-[#8A95A8] hover:text-[#161F38] p-1.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-[#FFF9F2] border border-[#FEE6D1] space-y-1.5">
            <div className="flex items-center gap-2 text-coralAccent font-bold text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Списание занятия с баланса</span>
            </div>
            <p className="text-xs text-[#4A5568] leading-relaxed">
              Списать 1 занятие с баланса ученика <strong>{resolvedParticipantName || 'Ученик'}</strong> за проведённый урок?
            </p>
          </div>

          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={() => confirmEndLesson(true)}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-coralAccent to-[#FF453A] hover:opacity-95 text-white font-black text-xs shadow-md shadow-coralAccent/20 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Да, списать урок (-1) и завершить</span>
            </button>

            <button
              type="button"
              onClick={() => confirmEndLesson(false)}
              className="w-full py-2.5 px-4 rounded-2xl bg-[#F4F6F8] hover:bg-[#E5E9EE] text-[#475467] font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
            >
              <span>Завершить урок без списания</span>
            </button>

            <button
              type="button"
              onClick={() => setShowTeacherEndModal(false)}
              className="w-full py-2 text-xs font-semibold text-[#8A95A8] hover:text-[#161F38] transition-colors cursor-pointer"
            >
              Отмена (продолжить урок)
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Real-time System Breakdown Alert Banner
  const renderBreakdownAlertBanner = () => {
    // 1. Camera Error Banner
    if (cameraError && dismissedAlertKey !== 'camera_err') {
      return (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-lg bg-rose-950/90 border border-rose-500/50 backdrop-blur-md text-white rounded-2xl p-3 shadow-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 select-auto">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-rose-200">Камера недоступна</p>
              <p className="text-[11px] text-white/80 truncate">{cameraError}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsDiagnosticsOpen(true)}
              className="px-2.5 py-1.5 bg-rose-500 hover:bg-rose-600 text-white font-bold text-[11px] rounded-xl transition-all cursor-pointer shadow-sm"
            >
              Как починить
            </button>
            <button
              type="button"
              onClick={() => setDismissedAlertKey('camera_err')}
              className="p-1 text-white/50 hover:text-white rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      );
    }

    // 2. ICE / P2P Connection Failed
    if (
      (currentIceState === 'failed' || currentIceState === 'disconnected') &&
      dismissedAlertKey !== 'ice_err'
    ) {
      return (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-lg bg-rose-950/90 border border-rose-500/50 backdrop-blur-md text-white rounded-2xl p-3 shadow-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 select-auto">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 shrink-0">
              <Wifi className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-rose-200">Сбой видеосвязи (P2P сеть)</p>
              <p className="text-[11px] text-white/80 truncate">
                Маршрут между устройствами заблокирован сетью или NAT
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleRestartCall}
              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-xl transition-all cursor-pointer shadow-sm flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Переподключить</span>
            </button>
            <button
              type="button"
              onClick={() => setIsDiagnosticsOpen(true)}
              className="px-2 py-1.5 bg-white/20 hover:bg-white/30 text-white font-bold text-[11px] rounded-xl transition-all cursor-pointer"
            >
              Логи
            </button>
            <button
              type="button"
              onClick={() => setDismissedAlertKey('ice_err')}
              className="p-1 text-white/50 hover:text-white rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      );
    }

    // 3. Audio Autoplay Blocked on iOS
    if (isAudioAutoplayBlocked && hasRemoteStream && !isDeafened) {
      return (
        <div
          onClick={() => {
            if (remoteAudioRef.current) {
              remoteAudioRef.current
                .play()
                .then(() => setIsAudioAutoplayBlocked(false))
                .catch(() => {});
            }
          }}
          className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-lg bg-gradient-to-r from-amber-600/95 to-orange-600/95 border border-amber-400/50 backdrop-blur-md text-white rounded-2xl p-3 shadow-2xl flex items-center justify-between gap-3 animate-pulse cursor-pointer select-auto"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-white/20 text-white shrink-0">
              <Volume2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-amber-100">Звук собеседника заглушен iOS</p>
              <p className="text-[11px] text-white/90 truncate">
                Нажмите в любое место экрана, чтобы включить звук собеседника
              </p>
            </div>
          </div>
          <button
            type="button"
            className="px-3 py-1.5 bg-white text-orange-700 font-extrabold text-[11px] rounded-xl shadow-md shrink-0 cursor-pointer"
          >
            Включить звук 🔊
          </button>
        </div>
      );
    }

    // 4. Signaling Channel Error
    if (currentSignalingStatus === 'error' && dismissedAlertKey !== 'sig_err') {
      return (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-lg bg-rose-950/90 border border-rose-500/50 backdrop-blur-md text-white rounded-2xl p-3 shadow-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 select-auto">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-rose-200">Ошибка сервера сигналинга</p>
              <p className="text-[11px] text-white/80 truncate">Нет связи с сервером Supabase Realtime</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-2.5 py-1.5 bg-rose-500 hover:bg-rose-600 text-white font-bold text-[11px] rounded-xl transition-all cursor-pointer shadow-sm"
            >
              Обновить
            </button>
            <button
              type="button"
              onClick={() => setDismissedAlertKey('sig_err')}
              className="p-1 text-white/50 hover:text-white rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  // Full Diagnostics & Log Breakdown Modal
  const renderDiagnosticsModal = () => {
    if (!isDiagnosticsOpen) return null;

    let issueSummary = 'Все системы работают штатно';
    let issueType: 'good' | 'warn' | 'error' = 'good';
    let fixStep1 = 'Связь активна, критических ошибок не обнаружено.';
    let fixStep2 = '';

    if (cameraError) {
      issueType = 'error';
      issueSummary = 'Камера заблокирована или недоступна';
      fixStep1 = isIPhone
        ? 'На iPhone в Safari: нажмите значок «aA» слева в строке адреса сайта -> «Настройки веб-сайта» -> «Камера» поставьте в «Разрешить», затем обновите страницу.'
        : 'В браузере на ПК: нажмите значок настроек/замка слева от адреса сайта и переключите камеру в положение «Разрешить».';
      fixStep2 = 'Убедитесь, что камера не используется другим приложением (Telegram, Zoom, Skype).';
    } else if (currentIceState === 'failed' || currentIceState === 'disconnected') {
      issueType = 'error';
      issueSummary = 'Сбой прямого соединения WebRTC (P2P)';
      fixStep1 = 'Нажмите кнопку «Переподключить связь» ниже для перезапуска соединения.';
      fixStep2 =
        'Если связь между странами (РФ — Вьетнам) глушится мобильной сетью: попробуйте переключить Wi-Fi на 4G (или наоборот), либо отключите VPN.';
    } else if (isAudioAutoplayBlocked) {
      issueType = 'warn';
      issueSummary = 'Звук собеседника заблокирован политикой браузера';
      fixStep1 = 'Политика iOS Safari запрещает воспроизводить звук до первого нажатия на экран.';
      fixStep2 = 'Нажмите кнопку «Включить звук» или коснитесь экрана.';
    } else if (!isPeerInRoom) {
      issueType = 'warn';
      issueSummary = 'Ожидание входа собеседника в комнату';
      fixStep1 = `Собеседник (${resolvedParticipantName}) ещё не открыл ссылку на урок.`;
      fixStep2 = 'Убедитесь, что собеседник зашёл именно в эту комнату.';
    } else if (isPeerInRoom && !hasRemoteStream) {
      issueType = 'warn';
      issueSummary = 'Собеседник в сети, идёт согласование видеосвязи';
      fixStep1 = 'Оба участника в комнате. Идёт обмен сетевыми кандидатами (ICE).';
      fixStep2 = 'Если видео не появится в течение 10 секунд — нажмите «Переподключить связь».';
    }

    return (
      <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200 select-auto">
        <div className="w-full max-w-xl max-h-[92vh] bg-[#161F38] border border-white/20 rounded-3xl flex flex-col overflow-hidden shadow-2xl text-white">
          {/* Header */}
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-white/5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base">Диагностика связи и логи</h3>
                <p className="text-[11px] text-white/60">Отслеживание ошибок и инструкция по устранению</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsDiagnosticsOpen(false)}
              className="p-2 text-white/60 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
            {/* System Status Indicators (Traffic lights) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* 1. Signaling */}
              <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
                <span className="text-[10px] text-white/50">Сигналинг</span>
                <div className="flex items-center gap-1.5 mt-1">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      currentSignalingStatus === 'connected' ? 'bg-emerald-400' : 'bg-rose-400 animate-ping'
                    }`}
                  />
                  <span className="font-bold text-[11px] truncate">
                    {currentSignalingStatus === 'connected' ? 'Подключен' : 'Ошибка'}
                  </span>
                </div>
              </div>

              {/* 2. Peer presence */}
              <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
                <span className="text-[10px] text-white/50">Собеседник</span>
                <div className="flex items-center gap-1.5 mt-1">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      hasRemoteStream
                        ? 'bg-emerald-400'
                        : isPeerInRoom
                        ? 'bg-amber-400 animate-pulse'
                        : 'bg-white/30'
                    }`}
                  />
                  <span className="font-bold text-[11px] truncate">
                    {hasRemoteStream ? 'В звонке' : isPeerInRoom ? 'В сети' : 'Ждем'}
                  </span>
                </div>
              </div>

              {/* 3. ICE P2P */}
              <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
                <span className="text-[10px] text-white/50">P2P Связь (ICE)</span>
                <div className="flex items-center gap-1.5 mt-1">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      currentIceState === 'connected' || currentIceState === 'completed'
                        ? 'bg-emerald-400'
                        : currentIceState === 'failed'
                        ? 'bg-rose-500 animate-ping'
                        : 'bg-amber-400'
                    }`}
                  />
                  <span className="font-bold text-[11px] truncate">
                    {currentIceState || 'new'}
                  </span>
                </div>
              </div>

              {/* 4. Local Cam */}
              <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
                <span className="text-[10px] text-white/50">Ваша камера</span>
                <div className="flex items-center gap-1.5 mt-1">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      camActive && !cameraError ? 'bg-emerald-400' : cameraError ? 'bg-rose-500' : 'bg-white/30'
                    }`}
                  />
                  <span className="font-bold text-[11px] truncate">
                    {cameraError ? 'Ошибка' : camActive ? 'Вкл' : 'Выкл'}
                  </span>
                </div>
              </div>
            </div>

            {/* LiveKit SFU Cloud & Dual Account Switcher Card */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-sky-950/60 to-indigo-950/60 border border-sky-400/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse" />
                  <div>
                    <span className="font-extrabold text-xs text-white">Медиа-сервер: LiveKit Cloud SFU</span>
                    <span className="text-[10px] text-sky-200/80 block">Пул 20 000 бесплатных минут (2 аккаунта)</span>
                  </div>
                </div>
                <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30">
                  {livekitAccount === 'account2' ? 'Аккаунт №2' : 'Аккаунт №1'}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1.5 border-t border-white/10 text-[11px]">
                <span className="text-white/70">Переключить аккаунт:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSwitchLiveKitAccount('account1')}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition-all cursor-pointer ${
                      livekitAccount === 'account1'
                        ? 'bg-sky-500 text-white shadow-xs'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    Аккаунт 1
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchLiveKitAccount('account2')}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition-all cursor-pointer ${
                      livekitAccount === 'account2'
                        ? 'bg-sky-500 text-white shadow-xs'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    Аккаунт 2
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchLiveKitAccount('auto')}
                    className="px-2 py-1 rounded-lg font-bold text-[10px] bg-white/10 text-white/70 hover:bg-white/20 transition-all cursor-pointer"
                    title="Автоматическая ротация 50/50 по номеру комнаты"
                  >
                    Авто (50/50)
                  </button>
                </div>
              </div>
            </div>

            {/* Diagnosis & How to Fix Card */}
            <div
              className={`p-4 rounded-2xl border ${
                issueType === 'error'
                  ? 'bg-rose-950/40 border-rose-500/40'
                  : issueType === 'warn'
                  ? 'bg-amber-950/40 border-amber-500/40'
                  : 'bg-emerald-950/40 border-emerald-500/40'
              }`}
            >
              <div className="flex items-center gap-2 mb-2 font-bold text-sm">
                <Wrench className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Что случилось и как починить:</span>
              </div>
              <p className="font-semibold text-white/95 text-xs mb-1.5">{issueSummary}</p>
              <div className="space-y-1 text-white/80 text-[11px] leading-relaxed">
                <p>1. {fixStep1}</p>
                {fixStep2 && <p>2. {fixStep2}</p>}
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleRestartCall}
                className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-transform active:scale-95 cursor-pointer shadow-md"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Переподключить связь</span>
              </button>

              <button
                type="button"
                onClick={copyDiagnosticReport}
                className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-transform active:scale-95 cursor-pointer border border-white/15"
              >
                {copiedLogSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-300">Отчет скопирован!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Скопировать отчет для разработчика</span>
                  </>
                )}
              </button>
            </div>

            {/* Live Logs Terminal */}
            <div className="rounded-2xl bg-black/60 border border-white/10 overflow-hidden">
              <div className="px-3 py-2 bg-white/5 border-b border-white/10 flex items-center justify-between">
                <span className="text-[10px] font-mono text-white/60 uppercase tracking-wider">
                  Журнал событий в реальном времени ({diagnosticLogs.length})
                </span>
                <span className="text-[9px] text-white/40">Автообновление</span>
              </div>
              <div className="p-3 max-h-48 overflow-y-auto font-mono text-[11px] space-y-1 select-text">
                {diagnosticLogs.length === 0 ? (
                  <p className="text-white/40 text-center py-2">Событий пока нет...</p>
                ) : (
                  diagnosticLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-2 leading-tight">
                      <span className="text-white/40 shrink-0 text-[10px]">{log.time}</span>
                      <span
                        className={`font-semibold shrink-0 ${
                          log.level === 'error'
                            ? 'text-rose-400'
                            : log.level === 'warn'
                            ? 'text-amber-400'
                            : log.level === 'success'
                            ? 'text-emerald-400'
                            : 'text-blue-300'
                        }`}
                      >
                        [{log.level.toUpperCase()}]
                      </span>
                      <span className="text-white/90 break-words flex-1">
                        {log.message}
                        {log.detail && (
                          <span className="text-white/50 block text-[10px] mt-0.5">{log.detail}</span>
                        )}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // PiP (Picture in Picture) mode when Whiteboard is open — strictly displays the REMOTE participant (student or teacher)
  if (isWhiteboardActive) {
    if (isPipMinimized) {
      return (
        <>
          <audio
            ref={remoteAudioRef}
            autoPlay
            playsInline
            controls={false}
            style={{
              position: 'fixed',
              top: -9999,
              left: -9999,
              width: 1,
              height: 1,
              opacity: 0,
              pointerEvents: 'none',
            }}
          />
          <div
            onClick={() => setIsPipMinimized(false)}
            className="fixed bottom-3 right-3 sm:bottom-6 sm:right-6 z-40 bg-white/95 backdrop-blur-md rounded-full shadow-2xl border-2 border-coralAccent p-1.5 flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95 transition-transform"
            title="Нажмите, чтобы развернуть видео собеседника"
          >
            <div className="w-9 h-9 rounded-full bg-[#161F38] text-white flex items-center justify-center font-black text-xs shrink-0 overflow-hidden relative border border-coralAccent/40">
              {hasRemoteStream && remoteCamActive ? (
                <video
                  ref={(el) => {
                    if (el) {
                      if (remoteStreamRef.current && el.srcObject !== remoteStreamRef.current) {
                        el.srcObject = remoteStreamRef.current;
                      }
                      el.play().catch(() => {});
                    }
                  }}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{resolvedParticipantName[0] || 'П'}</span>
              )}
            </div>
            <div className="pr-2 flex items-center gap-1.5">
              <span className="text-xs font-black text-[#161F38] truncate max-w-[90px] sm:max-w-none">
                {resolvedParticipantName}
              </span>
              <span
                className={`w-2 h-2 rounded-full ${hasRemoteStream ? 'bg-[#5C8519] animate-pulse' : 'bg-amber-400'}`}
              />
            </div>
          </div>
        </>
      );
    }

    return (
      <>
        <audio
          ref={remoteAudioRef}
          autoPlay
          playsInline
          controls={false}
          style={{
            position: 'fixed',
            top: -9999,
            left: -9999,
            width: 1,
            height: 1,
            opacity: 0,
            pointerEvents: 'none',
          }}
        />
        <div className="fixed bottom-3 right-3 sm:bottom-6 sm:right-6 z-40 w-44 xs:w-52 sm:w-80 bg-white rounded-2xl sm:rounded-3xl shadow-2xl border-2 border-coralAccent overflow-hidden text-ink-900 animate-in slide-in-from-bottom-2">
          <div className="p-1.5 sm:p-2.5 bg-[#FFF7EE] flex items-center justify-between text-xs border-b border-[#F4E3D2] font-black">
            <div className="flex items-center gap-1 sm:gap-1.5 truncate">
              <span
                className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                  hasRemoteStream ? 'bg-[#5C8519] animate-pulse' : 'bg-amber-400'
                } shrink-0`}
              />
              <span className="truncate text-[#161F38] text-[10px] sm:text-[11px] font-black">{resolvedParticipantName}</span>
            </div>
            <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
              {/* Minimize to small pill */}
              <button
                type="button"
                onClick={() => setIsPipMinimized(true)}
                className="p-1 hover:bg-[#FDEEDC] rounded-md text-[#161F38] cursor-pointer"
                title="Свернуть видео, чтобы освободить доску"
              >
                <Minimize2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </button>
              <button
                type="button"
                onClick={togglePictureInPicture}
                className="p-1 hover:bg-[#FDEEDC] rounded-md text-[#161F38] hidden sm:block cursor-pointer"
                title="Поверх всех окон (как в Telegram/VK)"
              >
                <ExternalLink className="w-3.5 h-3.5 text-coralAccent" />
              </button>
              <button
                type="button"
                onClick={onToggleWhiteboard}
                className="p-1 hover:bg-[#FDEEDC] rounded-md text-[#161F38] cursor-pointer"
                title="Развернуть видео на весь экран"
              >
                <Maximize2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </button>
            </div>
          </div>

          {/* Real Live Video of Remote Peer ( собеседник: ученик или учитель ) */}
          <div className="relative aspect-video bg-[#161F38] flex items-center justify-center overflow-hidden">
            {/* Live Video element for remote stream */}
            <video
              ref={(el) => {
                if (el) {
                  if (remoteStreamRef.current && el.srcObject !== remoteStreamRef.current) {
                    el.srcObject = remoteStreamRef.current;
                  } else if (remoteVideoRef.current?.srcObject && el.srcObject !== remoteVideoRef.current.srcObject) {
                    el.srcObject = remoteVideoRef.current.srcObject;
                  }
                  el.play().catch(() => {});
                }
              }}
              autoPlay
              playsInline
              muted
              controls={false}
              className={`w-full h-full ${isRemoteScreenSharing ? 'object-contain bg-black' : 'object-cover'} ${
                hasRemoteStream && remoteCamActive ? 'block' : 'hidden'
              }`}
            />

            {/* Remote peer camera turned off or waiting placeholder — clean without text clutter */}
            {(!hasRemoteStream || !remoteCamActive) && (
              <div className="absolute inset-0 bg-[#161F38] flex items-center justify-center p-2 select-none z-10">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-coralAccent text-lg sm:text-xl font-black shadow-inner">
                  {resolvedParticipantName[0] || 'П'}
                </div>
              </div>
            )}

            {/* Time Pill */}
            <div className="absolute bottom-1.5 left-1.5 sm:bottom-2 sm:left-2 flex items-center gap-1 bg-black/60 backdrop-blur-md text-white px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-bold shadow-xs z-20">
              <span className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${hasRemoteStream ? 'bg-[#5C8519] animate-pulse' : 'bg-amber-400'}`} />
              <span>{formatTime(callDuration)}</span>
            </div>

            {/* Remote Peer name badge in PiP — strictly the other person */}
            <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 bg-black/60 backdrop-blur-md text-white px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold flex items-center gap-1 shadow-xs z-20">
              <span className={`w-1.5 h-1.5 rounded-full ${hasRemoteStream ? 'bg-[#5C8519] animate-pulse' : 'bg-amber-400'}`} />
              <span className="truncate max-w-[100px] sm:max-w-[140px]">{resolvedParticipantName}</span>
              {!remoteMicActive && hasRemoteStream && (
                <MicOff className="w-2.5 h-2.5 text-rose-300 ml-0.5" />
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  // Floating Camera Mode when Platform / Cabinet is open ("справа сверху")
  if (isPlatformMinimized) {
    return (
      <>
        <audio
          ref={remoteAudioRef}
          autoPlay
          playsInline
          controls={false}
          style={{
            position: 'fixed',
            bottom: 4,
            left: 4,
            width: 1,
            height: 1,
            opacity: 0.01,
            pointerEvents: 'none',
            zIndex: 9999,
          }}
        />
        {/* Floating Camera in Top Right ("картинка в картинке") over Personal Cabinet */}
        <div
          onClick={(e) => {
            // Clicking the card area (except action buttons) maximizes back into full room
            if ((e.target as HTMLElement).closest('button')) return;
            setInternalPlatformMinimized(false);
            onTogglePlatformMinimize?.(false);
          }}
          className="fixed top-[max(1rem,env(safe-area-inset-top,1rem))] right-3 sm:top-5 sm:right-6 z-50 w-44 xs:w-52 sm:w-64 aspect-[3/4] rounded-3xl overflow-hidden border-2 border-white shadow-2xl bg-black/95 backdrop-blur-md animate-in slide-in-from-top-4 duration-200 select-none cursor-pointer group"
          title="Нажмите, чтобы развернуть урок на весь экран"
        >
          {/* Main stream inside floating PiP card:
              Shows remote participant if active, or local camera preview with status if waiting for peer */}
          <video
            ref={(el) => {
              if (el) {
                (el as any).autoPictureInPicture = true;
                const targetStream = (hasRemoteStream && remoteCamActive && remoteStreamRef.current)
                  ? remoteStreamRef.current
                  : (camActive && streamRef.current)
                  ? streamRef.current
                  : null;
                if (targetStream) {
                  const vTracks = targetStream.getVideoTracks();
                  if (vTracks.length > 0 && (!el.srcObject || (el.srcObject as MediaStream).getVideoTracks()[0]?.id !== vTracks[0].id)) {
                    el.srcObject = new MediaStream(vTracks);
                  }
                }
                el.muted = true;
                el.play().catch(() => {});
              }
            }}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${
              (hasRemoteStream && remoteCamActive) || (!hasRemoteStream && camActive) ? 'block' : 'hidden'
            } ${!hasRemoteStream && facingMode === 'user' ? '-scale-x-100' : ''}`}
          />

          {/* If waiting for peer but user camera is on: show subtle status banner */}
          {!hasRemoteStream && camActive && (
            <div className="absolute inset-0 pointer-events-none flex flex-col justify-end p-2 pb-14 bg-gradient-to-t from-black/80 via-transparent to-transparent">
              <span className="text-[10px] text-amber-300 font-bold bg-black/60 px-2 py-0.5 rounded-full mx-auto backdrop-blur-xs flex items-center gap-1.5 border border-amber-400/30">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                Ожидание собеседника...
              </span>
            </div>
          )}

          {/* Placeholder if neither camera is active */}
          {((hasRemoteStream && !remoteCamActive) || (!hasRemoteStream && !camActive)) && (
            <div className="w-full h-full flex flex-col items-center justify-center bg-[#161F38] text-white p-3 text-center">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#FF6B4A] to-[#FFA259] text-white flex items-center justify-center font-black text-lg mb-2 shadow-md">
                <span>{resolvedParticipantName[0] || 'П'}</span>
              </div>
              <span className="text-xs font-bold text-white truncate max-w-[120px]">
                {resolvedParticipantName}
              </span>
              <span className="text-[10px] text-white/60 mt-0.5">
                {hasRemoteStream ? 'Камера выкл.' : 'Ожидание...'}
              </span>
            </div>
          )}

          {/* Top Info Bar inside PiP: Participant Name & Timer */}
          <div className="absolute top-2 left-2 right-2 flex items-center justify-between text-white text-[10px] font-bold bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 pointer-events-none">
            <span className="truncate max-w-[70px] sm:max-w-[100px]">{resolvedParticipantName}</span>
            <div className="flex items-center gap-1 font-mono text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{formatTime(callDuration)}</span>
            </div>
          </div>

          {/* Bottom Floating Controls: Expand button + Mic toggle + End call */}
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-1.5 z-20">
            <button
              type="button"
              onClick={() => {
                setInternalPlatformMinimized(false);
                onTogglePlatformMinimize?.(false);
              }}
              className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-full backdrop-blur-md border border-white/20 transition-transform active:scale-90 cursor-pointer shadow-md"
              title="Развернуть звонок на весь экран"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={toggleMic}
              className={`p-2 rounded-full backdrop-blur-md border transition-transform active:scale-90 cursor-pointer shadow-md ${
                !micActive
                  ? 'bg-rose-600 border-rose-400 text-white'
                  : 'bg-white/20 hover:bg-white/30 border-white/20 text-white'
              }`}
              title={!micActive ? 'Включить микрофон' : 'Выключить микрофон'}
            >
              {!micActive ? <MicOff className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4 text-white" />}
            </button>
            <button
              type="button"
              onClick={handleEndClick}
              className="p-2 bg-[#FF334B] hover:bg-[#E0243C] text-white rounded-full transition-transform active:scale-90 cursor-pointer shadow-md border border-red-400/30"
              title={isTeacher ? 'Завершить урок' : 'Покинуть комнату'}
            >
              <PhoneOff className="w-4 h-4" />
            </button>
          </div>
        </div>
        {renderTeacherEndModal()}
        {renderDiagnosticsModal()}
      </>
    );
  }

  // Full Video Workspace (100% spacious, responsive on mobile & desktop)
  return (
    <>
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        controls={false}
        style={{
          position: 'fixed',
          bottom: 4,
          left: 4,
          width: 1,
          height: 1,
          opacity: 0.01,
          pointerEvents: 'none',
          zIndex: 9999,
        }}
      />
      {/* VK Calls Layout */}
      <div className="relative w-full h-full min-h-[100dvh] bg-[#FFF7EE] overflow-hidden select-none">
        {/* Real-time System Breakdown Alert Banner */}
        {renderBreakdownAlertBanner()}

        {/* Hand Raise Notification Toast */}
        {peerHandNotification && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-black/75 backdrop-blur-md border border-amber-400/40 text-amber-300 font-bold text-xs sm:text-sm rounded-full flex items-center gap-2 shadow-2xl animate-bounce">
            <Hand className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{peerHandNotification}</span>
          </div>
        )}

        {/* Screen share banner */}
        {isScreenSharing && (
          <div className="fixed top-16 left-4 z-40 px-3 py-1 bg-indigo-600/80 backdrop-blur-md text-white text-xs font-bold rounded-full flex items-center gap-1.5 shadow-lg">
            <Monitor className="w-3.5 h-3.5 animate-pulse" />
            <span>Вы делитесь экраном</span>
          </div>
        )}

        {/* 1. Main Fullscreen Video (Remote by default, or Local if isSwapped) */}
        <div className="absolute inset-0 w-full h-full overflow-hidden bg-[#FFF7EE]">
          {!isSwapped ? (
            /* Main View: Remote stream */
            <>
              <video
                ref={(el) => {
                  remoteVideoRef.current = el;
                  if (el) {
                    (el as any).autoPictureInPicture = true;
                    (el as any).disablePictureInPicture = false;
                    el.setAttribute('autopictureinpicture', 'true');
                    if (remoteStreamRef.current && el.srcObject !== remoteStreamRef.current) {
                      el.srcObject = remoteStreamRef.current;
                    }
                    el.muted = true;
                    el.play().catch(() => {});
                  }
                }}
                autoPlay
                playsInline
                muted
                onLoadedMetadata={(e) => {
                  (e.target as HTMLVideoElement).play().catch(() => {});
                }}
                onCanPlay={(e) => {
                  (e.target as HTMLVideoElement).play().catch(() => {});
                }}
                className={`w-full h-full ${
                  isScreenSharing || isVerticalMode ? 'object-contain bg-black' : 'object-cover'
                } ${hasRemoteStream && remoteCamActive ? 'block' : 'hidden'}`}
              />

              {(!hasRemoteStream || !remoteCamActive) && (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-[#FFFDFB] via-[#FFF7EE] to-[#FFEFE0]">
                  <div className="relative mb-4">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-tr from-[#FF6B4A] to-[#FFA259] text-white flex items-center justify-center text-3xl sm:text-4xl font-black shadow-xl shadow-orange-500/15 border-4 border-white">
                      <span>{resolvedParticipantName[0] || 'П'}</span>
                    </div>
                    {(hasRemoteStream || isPeerInRoom) && (
                      <div className="absolute bottom-1 right-1 w-7 h-7 rounded-full bg-white border border-[#F2DECE] shadow-sm flex items-center justify-center">
                        {!remoteMicActive && hasRemoteStream ? (
                          <MicOff className="w-4 h-4 text-rose-500" />
                        ) : (
                          <span className="w-2.5 h-2.5 rounded-full bg-[#5C8519] animate-pulse" />
                        )}
                      </div>
                    )}
                  </div>
                  <h3 className="text-[#161F38] font-black text-xl sm:text-2xl tracking-tight">
                    {resolvedParticipantName}
                  </h3>
                  <p className="text-[#6B758E] font-medium text-xs sm:text-sm mt-1">
                    {hasRemoteStream
                      ? 'Камера выключена'
                      : isPeerInRoom
                      ? 'Собеседник в сети • Установка видеосвязи...'
                      : 'Ожидание подключения собеседника...'}
                  </p>
                </div>
              )}
            </>
          ) : (
            /* Main View: Local stream (Swapped) */
            <>
              <video
                ref={(el) => {
                  localVideoRef.current = el;
                  if (el) {
                    (el as any).autoPictureInPicture = true;
                    (el as any).disablePictureInPicture = false;
                    el.setAttribute('autopictureinpicture', 'true');
                    if (streamRef.current && el.srcObject !== streamRef.current) {
                      el.srcObject = streamRef.current;
                    }
                    el.play().catch(() => {});
                  }
                }}
                autoPlay
                playsInline
                muted
                onLoadedMetadata={(e) => {
                  (e.target as HTMLVideoElement).play().catch(() => {});
                }}
                onCanPlay={(e) => {
                  (e.target as HTMLVideoElement).play().catch(() => {});
                }}
                className={`w-full h-full ${
                  isScreenSharing || isVerticalMode ? 'object-contain bg-[#FFF7EE]' : 'object-cover'
                } ${facingMode === 'user' ? '-scale-x-100' : ''} ${!camActive ? 'hidden' : 'block'}`}
              />
              {!camActive && (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-[#FFFDFB] via-[#FFF7EE] to-[#FFEFE0]">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-tr from-[#FF6B4A] to-[#FFA259] text-white flex items-center justify-center text-3xl sm:text-4xl font-black shadow-xl shadow-orange-500/15 border-4 border-white mb-4">
                    <span>Вы</span>
                  </div>
                  <h3 className="text-[#161F38] font-black text-xl sm:text-2xl">Ваша камера выключена</h3>
                </div>
              )}
            </>
          )}
        </div>

        {/* 2. Floating PiP Card (Selfie / Remote) in Top-Right */}
        <div
          onClick={() => setIsSwapped(!isSwapped)}
          className="absolute top-[max(4.25rem,calc(env(safe-area-inset-top,0px)+3.75rem))] right-3 sm:top-20 sm:right-6 z-30 w-28 xs:w-32 sm:w-44 aspect-[3/4] rounded-2xl sm:rounded-3xl overflow-hidden border-2 border-white/30 shadow-2xl bg-black/60 backdrop-blur-md cursor-pointer transition-transform duration-200 hover:scale-105 active:scale-95 group"
          title="Нажмите, чтобы переключить отображение видео"
        >
          {!isSwapped ? (
            /* PiP shows Local stream */
            <>
              <video
                ref={(el) => {
                  localVideoRef.current = el;
                  if (el) {
                    (el as any).autoPictureInPicture = true;
                    (el as any).disablePictureInPicture = false;
                    el.setAttribute('autopictureinpicture', 'true');
                    if (streamRef.current && el.srcObject !== streamRef.current) {
                      el.srcObject = streamRef.current;
                    }
                    el.play().catch(() => {});
                  }
                }}
                autoPlay
                playsInline
                muted
                onLoadedMetadata={(e) => {
                  (e.target as HTMLVideoElement).play().catch(() => {});
                }}
                onCanPlay={(e) => {
                  (e.target as HTMLVideoElement).play().catch(() => {});
                }}
                className={`w-full h-full object-cover ${
                  facingMode === 'user' ? '-scale-x-100' : ''
                } ${!camActive ? 'hidden' : 'block'}`}
              />
              {!camActive && (
                <div className="w-full h-full flex flex-col items-center justify-center bg-[#161F38] text-white p-2 text-center">
                  <div className="w-9 h-9 rounded-full bg-coralAccent/20 text-coralAccent flex items-center justify-center mb-1">
                    <VideoOff className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] text-white/70 font-semibold">Камера выкл.</span>
                </div>
              )}
              {/* Bottom label */}
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-white text-[10px] font-bold bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10">
                <span className="truncate">Вы</span>
                {!micActive && <MicOff className="w-3 h-3 text-rose-400 shrink-0" />}
              </div>
            </>
          ) : (
            /* PiP shows Remote stream */
            <>
              <video
                ref={(el) => {
                  remoteVideoRef.current = el;
                  if (el) {
                    (el as any).autoPictureInPicture = true;
                    (el as any).disablePictureInPicture = false;
                    el.setAttribute('autopictureinpicture', 'true');
                    if (remoteStreamRef.current && el.srcObject !== remoteStreamRef.current) {
                      el.srcObject = remoteStreamRef.current;
                    }
                    el.muted = true;
                    el.play().catch(() => {});
                  }
                }}
                autoPlay
                playsInline
                muted
                onLoadedMetadata={(e) => {
                  (e.target as HTMLVideoElement).play().catch(() => {});
                }}
                onCanPlay={(e) => {
                  (e.target as HTMLVideoElement).play().catch(() => {});
                }}
                className={`w-full h-full object-cover ${
                  hasRemoteStream && remoteCamActive ? 'block' : 'hidden'
                }`}
              />
              {(!hasRemoteStream || !remoteCamActive) && (
                <div className="w-full h-full flex flex-col items-center justify-center bg-[#161F38] text-white p-2 text-center">
                  <div className="w-9 h-9 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center mb-1">
                    <span className="text-xs font-black">{resolvedParticipantName[0] || 'П'}</span>
                  </div>
                  <span className="text-[10px] text-white/70 font-semibold truncate max-w-[80px]">
                    {resolvedParticipantName}
                  </span>
                </div>
              )}
              {/* Bottom label */}
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-white text-[10px] font-bold bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10">
                <span className="truncate">{resolvedParticipantName}</span>
                {!remoteMicActive && hasRemoteStream && (
                  <MicOff className="w-3 h-3 text-rose-400 shrink-0" />
                )}
              </div>
            </>
          )}

          {/* Hover Swap Indicator Overlay */}
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
            <RefreshCw className="w-5 h-5 text-white/90" />
          </div>
        </div>

        {/* 3. Floating Top Bar */}
        <div className="absolute top-0 left-0 right-0 z-40 pt-[max(0.75rem,env(safe-area-inset-top,0.75rem))] px-3 sm:px-5 pb-3 flex items-center justify-between pointer-events-none">
          {/* Top Left: Chat, Participants, Whiteboard, and Timer Counter (all grouped together on the left) */}
          <div className="pointer-events-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsChatOpen(true)}
              className="relative p-2.5 sm:p-3 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md border border-white/15 transition-all active:scale-95 cursor-pointer shadow-lg"
              title="Чат урока"
            >
              <MessageSquare className="w-5 h-5" />
              {chatMessages.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-black shadow-xs">
                  {chatMessages.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsParticipantsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 sm:py-2.5 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md border border-white/15 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-lg"
              title="Участники"
            >
              <Users className="w-4 h-4" />
              <span>{(hasRemoteStream || isPeerInRoom) ? 2 : 1}</span>
            </button>

            {onToggleWhiteboard && (
              <button
                type="button"
                onClick={onToggleWhiteboard}
                className="p-2.5 sm:p-3 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md border border-white/15 transition-all active:scale-95 cursor-pointer shadow-lg"
                title="Интерактивная доска"
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
            )}

            {/* Timer Counter placed right next to the left buttons */}
            <div className="flex items-center gap-2 px-3.5 py-2 sm:py-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/15 text-white text-xs font-mono font-bold shadow-lg">
              <span
                className={`w-2 h-2 rounded-full ${
                  hasRemoteStream ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span>{formatTime(callDuration)}</span>
            </div>

            {/* LiveKit Cloud SFU / P2P Badge with Dual Account Indicator */}
            <div
              onClick={() => setIsDiagnosticsOpen(true)}
              className="hidden xs:flex items-center gap-1.5 px-3 py-2 sm:py-2.5 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/15 text-white text-xs font-bold shadow-lg cursor-pointer transition-all active:scale-95"
              title="Нажмите, чтобы открыть статус медиа-сервера и переключить аккаунты"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  activeEngine === 'livekit' ? 'bg-sky-400 animate-pulse' : 'bg-emerald-400'
                }`}
              />
              <span className="text-[11px] font-semibold">
                {activeEngine === 'livekit'
                  ? `LiveKit • ${livekitAccount === 'account2' ? 'Аккаунт 2' : 'Аккаунт 1'}`
                  : 'WebRTC P2P'}
              </span>
            </div>
          </div>

          {/* Top Right: Picture-in-Picture & Minimize to Cabinet */}
          <div className="pointer-events-auto flex items-center gap-2">
            <button
              type="button"
              onClick={togglePictureInPicture}
              className={`p-2.5 sm:p-3 rounded-full backdrop-blur-md border transition-all active:scale-95 cursor-pointer shadow-lg flex items-center justify-center ${
                isPipActive
                  ? 'bg-coralAccent text-white border-coralAccent shadow-coralAccent/30 ring-2 ring-coralAccent/50'
                  : 'bg-black/40 hover:bg-black/60 text-white border-white/15'
              }`}
              title={isPipActive ? 'Вернуть видео в урок' : 'Картинка в картинке'}
            >
              <PiPIcon className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={handleExitToCabinet}
              className="p-2.5 sm:p-3 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md border border-white/15 transition-all active:scale-95 cursor-pointer shadow-lg flex items-center gap-1.5"
              title="Выйти в личный кабинет без закрытия урока"
            >
              <LayoutDashboard className="w-5 h-5" />
              <span className="hidden sm:inline text-xs font-bold pr-1">В кабинет</span>
            </button>
          </div>
        </div>

        {/* 4. Floating Bottom Bar (VK Video Calls Style) */}
        <div className="absolute bottom-0 left-0 right-0 z-40 pb-[max(1.5rem,env(safe-area-inset-bottom,1.5rem))] pt-10 px-4 flex flex-col items-center gap-3 bg-gradient-to-t from-black/95 via-black/55 to-transparent pointer-events-none">
          {/* "Ещё" Upward Pill */}
          <button
            type="button"
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white/90 hover:text-white backdrop-blur-md border border-white/15 text-xs font-medium transition-all active:scale-95 cursor-pointer pointer-events-auto mb-1 shadow-md"
            title="Дополнительные функции"
          >
            <ChevronUp
              className={`w-3.5 h-3.5 transition-transform duration-300 ${
                isDrawerOpen ? 'rotate-180' : ''
              }`}
            />
            <span>{isDrawerOpen ? 'Скрыть меню' : 'Ещё'}</span>
          </button>

          {/* 5 Main Action Circles */}
          <div className="flex items-center justify-center gap-3.5 sm:gap-6 w-full max-w-md pointer-events-auto">
            {/* 1. Speakers / Deafen Toggle (Выключить / включить динамики) */}
            <button
              type="button"
              onClick={toggleDeafen}
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full backdrop-blur-md border flex items-center justify-center transition-all active:scale-90 shadow-xl cursor-pointer ${
                isDeafened
                  ? 'bg-rose-600 hover:bg-rose-700 border-rose-400 text-white'
                  : 'bg-white/20 hover:bg-white/30 border-white/20 text-white'
              }`}
              title={isDeafened ? 'Включить звук собеседника' : 'Выключить динамики (заглушить звук)'}
            >
              {isDeafened ? (
                <VolumeX className="w-5 h-5 sm:w-6 sm:h-6" />
              ) : (
                <Volume2 className="w-5 h-5 sm:w-6 sm:h-6" />
              )}
            </button>

            {/* 2. Video Toggle */}
            <button
              type="button"
              onClick={toggleCam}
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full backdrop-blur-md border flex items-center justify-center transition-all active:scale-90 shadow-xl cursor-pointer ${
                !camActive
                  ? 'bg-rose-600/90 hover:bg-rose-700 border-rose-400 text-white'
                  : 'bg-white/20 hover:bg-white/30 border-white/20 text-white'
              }`}
              title={!camActive ? 'Включить камеру' : 'Выключить камеру'}
            >
              {!camActive ? (
                <VideoOff className="w-5 h-5 sm:w-6 sm:h-6" />
              ) : (
                <Video className="w-5 h-5 sm:w-6 sm:h-6" />
              )}
            </button>

            {/* 3. Hero Mic Button (Центральная кнопка VK - белый круг) */}
            <button
              type="button"
              onClick={toggleMic}
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-2xl cursor-pointer relative ${
                !micActive
                  ? 'bg-rose-600 hover:bg-rose-700 text-white border-2 border-rose-400 shadow-rose-600/40'
                  : 'bg-white hover:bg-white/95 text-[#161F38] shadow-white/30 border-2 border-white'
              }`}
              title={!micActive ? 'Включить микрофон' : 'Выключить микрофон'}
            >
              {!micActive ? (
                <MicOff className="w-6 h-6 sm:w-7 sm:h-7" />
              ) : (
                <Mic className="w-6 h-6 sm:w-7 sm:h-7" />
              )}
            </button>

            {/* 4. Raise Hand (Поднять руку) */}
            <button
              type="button"
              onClick={handleRaiseHand}
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full backdrop-blur-md border flex items-center justify-center transition-all active:scale-90 shadow-xl cursor-pointer ${
                isHandRaised
                  ? 'bg-amber-500 border-amber-300 text-white ring-4 ring-amber-400/30'
                  : 'bg-white/20 hover:bg-white/30 border-white/20 text-white'
              }`}
              title={isHandRaised ? 'Опустить руку' : 'Поднять руку'}
            >
              <Hand className={`w-5 h-5 sm:w-6 sm:h-6 ${isHandRaised ? 'animate-bounce' : ''}`} />
            </button>

            {/* 5. End Call (Завершить звонок - красный круг) */}
            <button
              type="button"
              onClick={handleEndClick}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#FF334B] hover:bg-[#E0243C] text-white flex items-center justify-center transition-all active:scale-90 shadow-2xl shadow-red-500/40 cursor-pointer border border-red-400/40"
              title={isTeacher ? 'Завершить урок' : 'Покинуть комнату'}
            >
              <PhoneOff className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        {/* 5. "Ещё" (More Options Drawer) */}
        {isDrawerOpen && (
          <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm bg-black/85 backdrop-blur-xl border border-white/20 rounded-3xl p-4 shadow-2xl text-white animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
              <span className="font-bold text-sm">Дополнительные функции</span>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="p-1 text-white/60 hover:text-white rounded-full cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  toggleScreenShare();
                  setIsDrawerOpen(false);
                }}
                className={`flex items-center justify-center gap-2 p-3 rounded-2xl border text-xs font-bold transition-all text-center ${
                  isScreenSharing
                    ? 'bg-indigo-600/40 border-indigo-400 text-indigo-200'
                    : 'bg-white/10 hover:bg-white/20 border-white/10 text-white'
                }`}
              >
                <Monitor className="w-4 h-4 shrink-0" />
                <span>{isScreenSharing ? 'Стоп экран' : 'Экран'}</span>
              </button>

              {onToggleWhiteboard && (
                <button
                  type="button"
                  onClick={() => {
                    onToggleWhiteboard();
                    setIsDrawerOpen(false);
                  }}
                  className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-bold text-white transition-all text-center cursor-pointer"
                >
                  <LayoutGrid className="w-4 h-4 shrink-0" />
                  <span>Доска урока</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  togglePictureInPicture();
                  setIsDrawerOpen(false);
                }}
                className={`flex items-center justify-center gap-2 p-3 rounded-2xl border text-xs font-bold transition-all text-center col-span-2 cursor-pointer ${
                  isPipActive
                    ? 'bg-coralAccent text-white border-coralAccent'
                    : 'bg-white/10 hover:bg-white/20 border-white/10 text-white'
                }`}
              >
                <PiPIcon className="w-4 h-4 shrink-0 text-coralAccent" />
                <span>{isPipActive ? 'Вернуть видео в урок' : 'Картинка в картинке (поверх всех окон)'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsDiagnosticsOpen(true);
                  setIsDrawerOpen(false);
                }}
                className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-bold text-white transition-all text-center col-span-2 cursor-pointer"
              >
                <Activity className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Диагностика связи и логи</span>
              </button>
            </div>
          </div>
        )}

        {/* 6. Participants Modal / Sheet */}
        {isParticipantsOpen && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
            <div className="w-full sm:max-w-md bg-[#161F38] border border-white/20 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl text-white">
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-coralAccent" />
                  <span className="font-extrabold text-base">
                    Участники ({(hasRemoteStream || isPeerInRoom) ? 2 : 1})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsParticipantsOpen(false)}
                  className="p-1.5 text-white/60 hover:text-white rounded-full bg-white/10 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3">
                {/* You */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-coralAccent text-white flex items-center justify-center font-bold text-sm">
                      Вы
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">
                        Вы ({isTeacher ? 'Учитель' : 'Ученик'})
                      </p>
                      <p className="text-[11px] text-white/60">В сети</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!micActive ? (
                      <MicOff className="w-4 h-4 text-rose-400" />
                    ) : (
                      <Mic className="w-4 h-4 text-emerald-400" />
                    )}
                    {!camActive ? (
                      <VideoOff className="w-4 h-4 text-rose-400" />
                    ) : (
                      <Video className="w-4 h-4 text-emerald-400" />
                    )}
                  </div>
                </div>

                {/* Remote Participant */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                      {resolvedParticipantName.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{resolvedParticipantName}</p>
                      <p className="text-[11px] text-white/60">
                        {hasRemoteStream
                          ? 'Подключен к уроку'
                          : isPeerInRoom
                          ? 'В комнате • Установка видеосвязи...'
                          : 'Ожидание подключения...'}
                      </p>
                    </div>
                  </div>
                  {hasRemoteStream && (
                    <div className="flex items-center gap-2">
                      {!remoteMicActive ? (
                        <MicOff className="w-4 h-4 text-rose-400" />
                      ) : (
                        <Mic className="w-4 h-4 text-emerald-400" />
                      )}
                      {!remoteCamActive ? (
                        <VideoOff className="w-4 h-4 text-rose-400" />
                      ) : (
                        <Video className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 7. Full-Screen VK Chat with Floating Video Call PiP (Styled to match website #FFF7EE theme) */}
        {isChatOpen && (
          <div
            style={
              isKeyboardOpen && viewportHeight
                ? {
                    height: `${viewportHeight}px`,
                    top: `${viewportOffsetTop}px`,
                  }
                : undefined
            }
            className="fixed inset-x-0 top-0 z-50 bg-[#FFF7EE] flex flex-col h-[100dvh] max-h-[100dvh] overflow-hidden overscroll-none animate-in fade-in duration-200 select-auto"
          >
            {/* Chat Header (Warm cream & crisp white matching platform brand) */}
            <div className="h-14 sm:h-16 px-3 sm:px-4 bg-white/95 backdrop-blur-md border-b border-[#F2DECE] flex items-center justify-between z-30 shrink-0 sticky top-0 shadow-2xs">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setIsChatOpen(false)}
                  className="p-1.5 -ml-1 text-[#161F38] hover:bg-[#FFF7EE] rounded-full transition-colors cursor-pointer flex items-center"
                  title="Вернуться к звонку"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-[#FF6B4A] to-[#FFA259] text-white flex items-center justify-center font-bold text-sm shrink-0 border border-white shadow-sm">
                  <span>{resolvedParticipantName[0] || 'П'}</span>
                </div>

                <div className="min-w-0 flex flex-col justify-center">
                  <h3 className="font-extrabold text-sm sm:text-base text-[#161F38] truncate max-w-[180px] sm:max-w-xs">
                    {resolvedParticipantName}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[11px] text-[#5C8519] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5C8519] animate-pulse" />
                    <span>В звонке • {formatTime(callDuration)}</span>
                  </div>
                </div>
              </div>

              {/* Close / Return button on header */}
              <button
                type="button"
                onClick={() => setIsChatOpen(false)}
                className="p-2 text-[#6B758E] hover:text-[#161F38] hover:bg-[#FFF7EE] rounded-full cursor-pointer transition-colors"
                title="Свернуть чат"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Floating Video Call Mini-Window (PiP) in Top Right — Exactly like VK! */}
            <div
              onClick={() => setIsChatOpen(false)}
              className={`absolute top-16 right-3 sm:top-20 sm:right-6 z-40 ${
                isKeyboardOpen ? 'w-20 xs:w-24 sm:w-36' : 'w-28 xs:w-32 sm:w-44'
              } aspect-[3/4] rounded-2xl sm:rounded-3xl overflow-hidden border-2 border-white shadow-2xl bg-black/90 backdrop-blur-md cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 group shrink-0`}
              title="Нажмите, чтобы вернуться к видеозвонку"
            >
              {/* Remote Video Stream (strictly video tracks so iOS never mutes audio session) */}
              <video
                ref={(el) => {
                  if (el) {
                    (el as any).autoPictureInPicture = true;
                    if (remoteStreamRef.current) {
                      const vTracks = remoteStreamRef.current.getVideoTracks();
                      if (vTracks.length > 0 && (!el.srcObject || (el.srcObject as MediaStream).getVideoTracks()[0]?.id !== vTracks[0].id)) {
                        el.srcObject = new MediaStream(vTracks);
                      }
                    }
                    el.play().catch(() => {});
                  }
                }}
                autoPlay
                playsInline
                muted
                onLoadedMetadata={(e) => {
                  (e.target as HTMLVideoElement).play().catch(() => {});
                }}
                onCanPlay={(e) => {
                  (e.target as HTMLVideoElement).play().catch(() => {});
                }}
                className={`w-full h-full object-cover ${
                  hasRemoteStream && remoteCamActive ? 'block' : 'hidden'
                }`}
              />

              {/* Avatar placeholder if camera is off or connecting */}
              {(!hasRemoteStream || !remoteCamActive) && (
                <div className="w-full h-full flex flex-col items-center justify-center bg-[#161F38] text-white p-2 text-center">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center mb-1 font-black text-sm">
                    <span>{resolvedParticipantName[0] || 'П'}</span>
                  </div>
                  <span className="text-[10px] text-white/80 font-semibold truncate max-w-[90px]">
                    {resolvedParticipantName}
                  </span>
                  <span className="text-[9px] text-white/50">
                    {hasRemoteStream ? 'Камера выкл.' : isPeerInRoom ? 'В сети...' : 'Ожидание...'}
                  </span>
                </div>
              )}

              {/* Bottom controls on the mini-card (Expand icon on left, Mute on right) */}
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                <div className="p-1 bg-black/60 backdrop-blur-md rounded-lg text-white">
                  <Maximize2 className="w-3.5 h-3.5 drop-shadow" />
                </div>
                <div className="p-1 bg-black/60 backdrop-blur-md rounded-lg text-white">
                  {!remoteMicActive ? (
                    <MicOff className="w-3.5 h-3.5 text-rose-400 drop-shadow" />
                  ) : (
                    <Mic className="w-3.5 h-3.5 text-emerald-400 drop-shadow" />
                  )}
                </div>
              </div>

              {/* Hover overlay hint */}
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                <span className="bg-black/70 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-full">
                  Развернуть звонок
                </span>
              </div>
            </div>

            {/* Chat Messages Body (Warm cream #FFF7EE background like the website) */}
            <div
              ref={chatMessagesContainerRef}
              className="flex-1 p-3 sm:p-5 overflow-y-auto overscroll-contain space-y-3 bg-[#FFF7EE] touch-pan-y"
            >
              {chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6">
                  <div className="w-14 h-14 rounded-2xl bg-white border border-[#F2DECE] flex items-center justify-center text-[#FF6B4A] shadow-xs mb-3">
                    <MessageSquare className="w-7 h-7" />
                  </div>
                  <p className="text-sm font-extrabold text-[#161F38]">Сообщений пока нет</p>
                  <p className="text-xs text-[#6B758E] max-w-xs mt-1">
                    Здесь можно обмениваться быстрыми сообщениями, фото и учебными материалами
                  </p>
                </div>
              ) : (
                chatMessages.map((msg) => {
                  const myRole = isTeacher ? 'teacher' : 'student';
                  const isMe =
                    msg.senderId === myPeerIdRef.current ||
                    msg.senderRole === myRole ||
                    (typeof msg.senderId === 'string' && msg.senderId.startsWith(`peer_${myRole}_`)) ||
                    (msg.senderRole === undefined && msg.senderName === (isTeacher ? 'Преподаватель' : 'Ученик'));

                  const senderDisplayName = isMe
                    ? 'Вы'
                    : msg.senderRole === 'teacher'
                    ? 'Преподаватель'
                    : msg.senderRole === 'student'
                    ? 'Ученик'
                    : msg.senderName || (isTeacher ? 'Ученик' : 'Преподаватель');

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1 text-[10px] text-[#6B758E] mb-0.5 px-1">
                        <span className="font-semibold">{senderDisplayName}</span>
                        <span>• {msg.time}</span>
                      </div>
                      <div
                        className={`px-4 py-2.5 rounded-2xl max-w-[85%] sm:max-w-[70%] break-words text-sm shadow-xs ${
                          isMe
                            ? 'bg-gradient-to-tr from-[#FF6B4A] to-[#FFA259] text-white rounded-br-xs shadow-orange-500/10'
                            : 'bg-white text-[#161F38] rounded-bl-xs border border-[#F2DECE]'
                        }`}
                      >
                        {msg.attachment && (
                          <div className="mb-2">
                            {msg.attachment.isImage ? (
                              <a
                                href={msg.attachment.url}
                                target="_blank"
                                rel="noreferrer"
                                className="block overflow-hidden rounded-xl border border-white/20 hover:opacity-95 transition-opacity"
                              >
                                <img
                                  src={msg.attachment.url}
                                  alt={msg.attachment.name}
                                  className="max-h-56 w-auto object-cover rounded-xl"
                                  loading="lazy"
                                />
                              </a>
                            ) : (
                              <a
                                href={msg.attachment.url}
                                target="_blank"
                                rel="noreferrer"
                                download={msg.attachment.name}
                                className={`flex items-center gap-2 p-2 rounded-xl text-xs font-bold transition-colors ${
                                  isMe ? 'bg-white/20 text-white' : 'bg-[#FFF7EE] hover:bg-[#FDEEDC] text-[#161F38] border border-[#F2DECE]'
                                }`}
                              >
                                <FileText className={`w-4 h-4 shrink-0 ${isMe ? 'text-white' : 'text-[#FF6B4A]'}`} />
                                <span className="truncate max-w-[160px]">
                                  {msg.attachment.name}
                                </span>
                                <Download className="w-3.5 h-3.5 ml-auto shrink-0 opacity-70" />
                              </a>
                            )}
                          </div>
                        )}
                        {msg.text && <div>{msg.text}</div>}
                        <div
                          className={`text-[10px] mt-1 flex items-center justify-end gap-1 ${
                            isMe ? 'text-white/80' : 'text-[#8E99AF]'
                          }`}
                        >
                          <span>{msg.time}</span>
                          {isMe && <span>✓✓</span>}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Attached file preview chip prior to sending */}
            {attachedFile && (
              <div className="px-4 py-2 bg-[#FFF0E6] border-t border-[#F2DECE] flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 truncate">
                  {attachedFile.isImage ? (
                    <img
                      src={attachedFile.url}
                      alt=""
                      className="w-8 h-8 object-cover rounded-md border border-[#F2DECE]"
                    />
                  ) : (
                    <FileText className="w-4 h-4 text-[#FF6B4A] shrink-0" />
                  )}
                  <span className="font-bold text-[#161F38] truncate">{attachedFile.name}</span>
                  <span className="text-[10px] text-[#6B758E]">
                    ({Math.round(attachedFile.size / 1024)} КБ)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachedFile(null)}
                  className="p-1 text-[#6B758E] hover:text-rose-500 rounded-lg cursor-pointer transition-colors"
                  title="Удалить прикрепленный файл"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Chat Input Bar (Light website theme with safe-area support) */}
            <form
              onSubmit={handleSendMessage}
              className="p-2.5 sm:p-3 bg-white/95 backdrop-blur-md border-t border-[#F2DECE] flex items-center gap-2 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom,0.75rem))]"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*,.pdf,.doc,.docx,.txt"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAttachment}
                className="w-10 h-10 rounded-full bg-[#FFF0E6] hover:bg-[#FDEEDC] text-[#FF6B4A] border border-[#F2DECE] flex items-center justify-center transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                title="Прикрепить фото или файл"
              >
                {isUploadingAttachment ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#FF6B4A]" />
                ) : (
                  <Plus className="w-5 h-5" />
                )}
              </button>
              <input
                ref={chatInputRef}
                type="text"
                value={chatInput}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                onChange={(e) => setChatInput(e.target.value)}
                onFocus={() => {
                  setIsKeyboardOpen(true);
                  if (typeof window !== 'undefined' && window.visualViewport) {
                    const vv = window.visualViewport;
                    if (window.innerHeight - vv.height > 120) {
                      setViewportHeight(vv.height);
                      setViewportOffsetTop(vv.offsetTop);
                    }
                  }
                  // Ensure remote audio playback and local mic remain active when input is focused
                  if (remoteAudioRef.current && remoteStreamRef.current) {
                    remoteAudioRef.current.play().catch(() => {});
                  }
                  if (streamRef.current) {
                    streamRef.current.getAudioTracks().forEach((t) => {
                      t.enabled = micActive;
                    });
                  }
                  if (typeof window !== 'undefined') {
                    window.scrollTo(0, 0);
                    document.body.scrollTop = 0;
                    document.documentElement.scrollTop = 0;
                    setTimeout(() => {
                      window.scrollTo(0, 0);
                      scrollChatToBottom(false);
                    }, 50);
                    setTimeout(() => {
                      window.scrollTo(0, 0);
                    }, 250);
                  }
                }}
                onBlur={() => {
                  setIsKeyboardOpen(false);
                  setViewportHeight(null);
                  setViewportOffsetTop(0);
                  if (typeof window !== 'undefined') {
                    window.scrollTo(0, 0);
                    document.body.scrollTop = 0;
                    document.documentElement.scrollTop = 0;
                    setTimeout(() => {
                      window.scrollTo(0, 0);
                      document.body.scrollTop = 0;
                      document.documentElement.scrollTop = 0;
                      scrollChatToBottom(false);
                    }, 80);
                    setTimeout(() => {
                      window.scrollTo(0, 0);
                      document.body.scrollTop = 0;
                      document.documentElement.scrollTop = 0;
                    }, 250);
                  }
                }}
                placeholder="Сообщение..."
                className="flex-1 bg-[#FFF7EE] focus:bg-white border border-[#F2DECE] focus:border-[#FF6B4A] rounded-full px-4 py-2.5 text-base sm:text-sm text-[#161F38] placeholder-[#9AA3B8] outline-none transition-all"
              />
              <button
                type="submit"
                disabled={(!chatInput.trim() && !attachedFile) || isUploadingAttachment}
                className="bg-gradient-to-tr from-[#FF6B4A] to-[#FFA259] hover:opacity-95 disabled:opacity-40 text-white w-10 h-10 rounded-full flex items-center justify-center transition-transform active:scale-95 cursor-pointer shadow-md shadow-orange-500/20 shrink-0"
                title="Отправить"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </div>

      {renderTeacherEndModal()}
      {renderDiagnosticsModal()}
    </>
  );
}
